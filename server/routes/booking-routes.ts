import { type Express } from "express";
import { storage } from "../core/storage";
import { validateBody, validateQuery, schemas, sanitizeInput } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { generalApiRateLimit } from '../middleware/rateLimiting';
import { authenticate, type AuthenticatedRequest } from '../middleware/simple-auth';
import { requireSubscriptionOrAdmin } from '../core/subscription-middleware';
import { cleanEncoreTitle } from '../core/booking-formatter';
import OpenAI from 'openai';

// Helper function for time comparison in duplicate detection
function getMinutesDifference(time1: string, time2: string): number {
  const [h1, m1] = time1.split(':').map(Number);
  const [h2, m2] = time2.split(':').map(Number);
  
  const minutes1 = h1 * 60 + m1;
  const minutes2 = h2 * 60 + m2;
  
  return minutes1 - minutes2;
}

export function registerBookingRoutes(app: Express) {
  console.log('📅 Setting up booking routes...');
  

  // Get bookings for authenticated user with display settings applied
  app.get('/api/bookings', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Get user settings to apply display filters
      const settings = await storage.getSettings(userId);
      const allBookings = await storage.getBookings(userId);
      
      // Apply display settings filter
      let filteredBookings = allBookings;
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Start of today
      
      if (settings && settings.bookingDisplayLimit !== 'all') {
        // Only apply filtering if not set to 'all'
        const showFuture = settings.displayFutureBookings !== false; // Default true
        const pastLimit = settings.bookingDisplayLimit === '50' ? 50 : 50; // Use bookingDisplayLimit setting
        
        // Separate past and future bookings
        const pastBookings = allBookings.filter(b => 
          b.eventDate && new Date(b.eventDate) < now
        ).sort((a, b) => 
          new Date(b.eventDate!).getTime() - new Date(a.eventDate!).getTime()
        );
        
        const futureBookings = allBookings.filter(b => 
          !b.eventDate || new Date(b.eventDate) >= now
        ).sort((a, b) => {
          if (!a.eventDate) return 1;
          if (!b.eventDate) return -1;
          return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
        });
        
        // Apply settings
        filteredBookings = [];
        
        // Add future bookings if enabled
        if (showFuture) {
          filteredBookings.push(...futureBookings);
        }
        
        // Add limited past bookings
        if (pastLimit > 0) {
          filteredBookings.push(...pastBookings.slice(0, pastLimit));
        }
        
        // Sort combined list by date (future first, then recent past)
        filteredBookings.sort((a, b) => {
          if (!a.eventDate && !b.eventDate) return 0;
          if (!a.eventDate) return 1;
          if (!b.eventDate) return -1;
          
          const dateA = new Date(a.eventDate);
          const dateB = new Date(b.eventDate);
          const isAFuture = dateA >= now;
          const isBFuture = dateB >= now;
          
          // Future bookings come first, sorted ascending
          if (isAFuture && isBFuture) {
            return dateA.getTime() - dateB.getTime();
          }
          // Past bookings come after, sorted descending (most recent first)
          if (!isAFuture && !isBFuture) {
            return dateB.getTime() - dateA.getTime();
          }
          // Future before past
          return isAFuture ? -1 : 1;
        });
        
        console.log(`✅ Applied display settings: ${filteredBookings.length} of ${allBookings.length} bookings shown (limit: ${pastLimit})`);
      } else if (settings?.bookingDisplayLimit === 'all') {
        console.log(`✅ Showing all ${allBookings.length} bookings (display limit: all)`);
      }
      
      console.log(`✅ Retrieved ${filteredBookings.length} bookings for user ${userId}`);
      res.json(filteredBookings);
    } catch (error) {
      console.error('❌ Failed to fetch bookings:', error);
      res.status(500).json({ error: 'Failed to fetch bookings' });
    }
  });

  // Batch fetch multiple bookings by IDs - optimized single database query
  app.post('/api/bookings/batch', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { bookingIds } = req.body;
      if (!bookingIds || !Array.isArray(bookingIds)) {
        return res.status(400).json({ error: 'bookingIds array is required' });
      }

      // Limit to prevent abuse
      const limitedIds = bookingIds.slice(0, 100);
      
      // Fetch all bookings in ONE optimized database query
      const validBookings = await storage.getBookingsByIds(limitedIds, userId);
      
      console.log(`✅ Batch fetched ${validBookings.length} bookings in single query for user ${userId}`);
      res.json(validBookings);
    } catch (error) {
      console.error('❌ Failed to batch fetch bookings:', error);
      res.status(500).json({ error: 'Failed to batch fetch bookings' });
    }
  });

  // Create new booking (requires subscription)
  app.post('/api/bookings', 
    authenticate,
    requireSubscriptionOrAdmin,
    generalApiRateLimit,
    sanitizeInput,
    validateBody(schemas.createBooking),
    asyncHandler(async (req: any, res: any) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Generate a meaningful title if none provided
      let title = req.body.title || 
        (req.body.clientName ? `Booking for ${req.body.clientName}` : 
         req.body.venue ? `Event at ${req.body.venue}` :
         req.body.eventDate ? `Event on ${req.body.eventDate}` :
         'New Booking');
         
      // Clean up Encore titles by removing forwarding prefixes
      title = cleanEncoreTitle(title);

      const bookingData = {
        userId,
        title,
        clientName: req.body.clientName || null,
        clientEmail: req.body.clientEmail || null,
        clientPhone: req.body.clientPhone || null,
        clientAddress: req.body.clientAddress || null,
        venue: req.body.venue || null,
        venueAddress: req.body.venueAddress || null,
        eventDate: req.body.eventDate || null,
        eventTime: req.body.eventTime || null,
        eventEndTime: req.body.eventEndTime || null,
        fee: req.body.fee ? String(req.body.fee) : null,
        finalAmount: req.body.finalAmount ? String(req.body.finalAmount) : null,
        deposit: req.body.deposit ? String(req.body.deposit) : "0.00",
        status: req.body.status || 'new',
        notes: req.body.notes || null,
        gigType: req.body.gigType || null,
        eventType: req.body.eventType || null,
        equipmentRequirements: req.body.equipmentRequirements || null,
        specialRequirements: req.body.specialRequirements || null,
        performanceDuration: req.body.performanceDuration || null,
        styles: req.body.styles || null,
        equipmentProvided: req.body.equipmentProvided || null,
        whatsIncluded: req.body.whatsIncluded || null,
        dressCode: req.body.dressCode || null,
        contactPerson: req.body.contactPerson || null,
        contactPhone: req.body.contactPhone || null,
        parkingInfo: req.body.parkingInfo || null,
        venueContactInfo: req.body.venueContactInfo || null,
        travelExpense: req.body.travelExpense ? String(req.body.travelExpense) : null,
        what3words: req.body.what3words || null,
        // Collaborative fields
        venueContact: req.body.venueContact || null,
        soundTechContact: req.body.soundTechContact || null,
        stageSize: req.body.stageSize || null,
        powerEquipment: req.body.powerEquipment || null,
        styleMood: req.body.styleMood || null,
        mustPlaySongs: req.body.mustPlaySongs || null,
        avoidSongs: req.body.avoidSongs || null,
        setOrder: req.body.setOrder || null,
        firstDanceSong: req.body.firstDanceSong || null,
        processionalSong: req.body.processionalSong || null,
        signingRegisterSong: req.body.signingRegisterSong || null,
        recessionalSong: req.body.recessionalSong || null,
        specialDedications: req.body.specialDedications || null,
        guestAnnouncements: req.body.guestAnnouncements || null,
        loadInInfo: req.body.loadInInfo || null,
        soundCheckTime: req.body.soundCheckTime || null,
        weatherContingency: req.body.weatherContingency || null,
        parkingPermitRequired: req.body.parkingPermitRequired || false,
        mealProvided: req.body.mealProvided || false,
        dietaryRequirements: req.body.dietaryRequirements || null,
        sharedNotes: req.body.sharedNotes || null,
        referenceTracks: req.body.referenceTracks || null,
        photoPermission: req.body.photoPermission !== undefined ? req.body.photoPermission : true,
        encoreAllowed: req.body.encoreAllowed !== undefined ? req.body.encoreAllowed : true,
        encoreSuggestions: req.body.encoreSuggestions || null
      };
      
      // ENHANCED DUPLICATE DETECTION for manual entry
      // Prevent users from accidentally creating duplicate bookings when manually entering data
      if (bookingData.eventDate && bookingData.clientName) {
        const existingBookings = await storage.getBookings(userId);
        const isDuplicate = existingBookings.some(booking => {
          const sameDate = booking.eventDate === bookingData.eventDate;
          const sameTime = booking.eventTime === bookingData.eventTime;
          const sameName = booking.clientName?.toLowerCase().trim() === bookingData.clientName?.toLowerCase().trim();
          
          // LAYER 1: Exact match (date + time + name)
          if (sameDate && sameTime && sameName) {
            return true;
          }
          
          // LAYER 2: All-day event match (same date + name, no specific time)
          if (sameDate && !bookingData.eventTime && !booking.eventTime && sameName) {
            return true;
          }
          
          // LAYER 3: Close time match (within 30 minutes) for same date/name
          if (sameDate && sameName && bookingData.eventTime && booking.eventTime) {
            const timeDiff = getMinutesDifference(bookingData.eventTime, booking.eventTime);
            if (Math.abs(timeDiff) <= 30) { // Within 30 minutes
              return true;
            }
          }
          
          return false;
        });

        if (isDuplicate) {
          console.log(`⚠️ Duplicate booking detected for user ${userId}: ${bookingData.clientName} on ${bookingData.eventDate} at ${bookingData.eventTime || 'all day'}`);
          return res.status(409).json({ 
            error: 'Duplicate booking detected',
            message: `A booking for ${bookingData.clientName} on ${bookingData.eventDate} ${bookingData.eventTime ? 'at ' + bookingData.eventTime : ''} already exists.`
          });
        }
      }
      
      const newBooking = await storage.createBooking(bookingData);
      console.log(`✅ Created booking #${newBooking.id} for user ${userId}`);
      res.json(newBooking);
      
    } catch (error: any) {
      console.error('❌ Failed to create booking:', error);
      res.status(500).json({ 
        error: 'Failed to create booking',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }));

  // Update booking
  app.patch('/api/bookings/:id', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Debug log the incoming data to track currency symbols
      console.log(`🔍 Update booking ${bookingId} - Raw request body:`, JSON.stringify(req.body, null, 2));
      
      // Verify ownership
      const existingBooking = await storage.getBooking(bookingId);
      if (!existingBooking || existingBooking.userId !== userId) {
        return res.status(404).json({ error: 'Booking not found' });
      }
      
      // PREVENT INVALID STATUS TRANSITIONS: Check if trying to mark future booking as completed
      if (req.body.status === 'completed' && existingBooking.eventDate) {
        const eventDate = new Date(existingBooking.eventDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today
        
        if (eventDate > today) {
          console.warn(`❌ Blocked attempt to mark future booking ${bookingId} (${eventDate.toDateString()}) as completed`);
          return res.status(400).json({ 
            error: 'Cannot mark future bookings as completed',
            details: `Booking is scheduled for ${eventDate.toDateString()}, which is in the future`
          });
        }
      }
      
      // Debug logging for finalAmount field
      console.log(`🔍 [BOOKING-UPDATE] Booking #${bookingId} update data:`, {
        finalAmount: req.body.finalAmount,
        fee: req.body.fee,
        travelExpense: req.body.travelExpense,
        clientName: req.body.clientName,
        hasKeys: Object.keys(req.body).length
      });
      
      const updatedBooking = await storage.updateBooking(bookingId, req.body, userId);
      
      console.log(`🔍 [BOOKING-UPDATE] After database update:`, {
        finalAmount: updatedBooking?.finalAmount,
        fee: updatedBooking?.fee,
        travelExpense: updatedBooking?.travelExpense,
        id: updatedBooking?.id
      });
      
      console.log(`✅ Updated booking #${bookingId} for user ${userId}`);
      res.json(updatedBooking);
      
    } catch (error) {
      console.error('❌ Failed to update booking:', error);
      res.status(500).json({ error: 'Failed to update booking' });
    }
  });

  // Delete booking
  // Advanced search/filter endpoint - MUST come before :id routes
  app.get('/api/bookings/all', 
    authenticate,
    requireSubscriptionOrAdmin,
    asyncHandler(async (req: SupabaseAuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Get query parameters
      const search = (req.query.search as string || '').toLowerCase();
      const status = req.query.status as string;
      const dateFilter = req.query.dateFilter as string;
      const hasConflict = req.query.hasConflict === 'true';
      const applyLimit = req.query.applyLimit !== 'false'; // Default true for performance

      console.log(`🔍 Search endpoint called - search: "${search}", status: ${status}, date: ${dateFilter}`);

      // Get ALL bookings for comprehensive search/filter
      const allBookings = await storage.getBookings(userId);
      
      // Apply filters
      let filteredBookings = allBookings;

      // Search filter - searches all fields
      if (search.length >= 2) {
        filteredBookings = filteredBookings.filter(booking => {
          // Search in client name
          if (booking.clientName?.toLowerCase().includes(search)) return true;
          // Search in venue
          if (booking.venue?.toLowerCase().includes(search)) return true;
          // Search in venue address
          if (booking.venueAddress?.toLowerCase().includes(search)) return true;
          // Search in title
          if (booking.title?.toLowerCase().includes(search)) return true;
          // Search in notes
          if (booking.notes?.toLowerCase().includes(search)) return true;
          // Search in event type
          if (booking.eventType?.toLowerCase().includes(search)) return true;
          // Search in gig type
          if (booking.gigType?.toLowerCase().includes(search)) return true;
          // Search by fee amount (handle both string and number types)
          if (booking.fee && String(booking.fee).includes(search)) return true;
          // Search by client phone
          if (booking.clientPhone?.includes(search)) return true;
          // Search by client email
          if (booking.clientEmail?.toLowerCase().includes(search)) return true;
          return false;
        });
      }

      // Status filter
      if (status && status !== 'all') {
        filteredBookings = filteredBookings.filter(booking => booking.status === status);
      }

      // Date filter
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      
      if (dateFilter === 'future') {
        filteredBookings = filteredBookings.filter(booking => 
          !booking.eventDate || new Date(booking.eventDate) >= now
        );
      } else if (dateFilter === 'past') {
        filteredBookings = filteredBookings.filter(booking => 
          booking.eventDate && new Date(booking.eventDate) < now
        );
      } else if (dateFilter === 'this-week') {
        const weekEnd = new Date(now);
        weekEnd.setDate(weekEnd.getDate() + 7);
        filteredBookings = filteredBookings.filter(booking => {
          if (!booking.eventDate) return false;
          const eventDate = new Date(booking.eventDate);
          return eventDate >= now && eventDate <= weekEnd;
        });
      } else if (dateFilter === 'this-month') {
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        filteredBookings = filteredBookings.filter(booking => {
          if (!booking.eventDate) return false;
          const eventDate = new Date(booking.eventDate);
          return eventDate >= now && eventDate <= monthEnd;
        });
      }

      // Conflict filter - would need to check against conflicts data
      // This is a placeholder - actual implementation would need conflict data
      if (hasConflict) {
        // Filter for bookings that have conflicts
        // Implementation would check against conflict data
      }

      // Sort results: future first (ascending), then past (descending)
      filteredBookings.sort((a, b) => {
        if (!a.eventDate && !b.eventDate) return 0;
        if (!a.eventDate) return 1;
        if (!b.eventDate) return -1;
        
        const dateA = new Date(a.eventDate);
        const dateB = new Date(b.eventDate);
        const isAFuture = dateA >= now;
        const isBFuture = dateB >= now;
        
        if (isAFuture && isBFuture) return dateA.getTime() - dateB.getTime();
        if (!isAFuture && !isBFuture) return dateB.getTime() - dateA.getTime();
        return isAFuture ? -1 : 1;
      });

      // Apply display limit if requested (for performance)
      let finalBookings = filteredBookings;
      if (applyLimit && !search && !status && dateFilter !== 'past') {
        // Get user settings
        const settings = await storage.getSettings(userId);
        if (settings?.bookingDisplayLimit !== 'all') {
          // Apply the same limiting logic as main endpoint
          const futureBookings = filteredBookings.filter(b => 
            !b.eventDate || new Date(b.eventDate) >= now
          );
          const pastBookings = filteredBookings.filter(b => 
            b.eventDate && new Date(b.eventDate) < now
          );
          
          finalBookings = [
            ...futureBookings,
            ...pastBookings.slice(0, 50)
          ];
        }
      }

      console.log(`🔍 Advanced filter result: ${finalBookings.length} of ${allBookings.length} bookings (search: "${search}", status: ${status}, date: ${dateFilter})`);
      res.json(finalBookings);
    } catch (error) {
      console.error('❌ Failed to filter bookings:', error);
      res.status(500).json({ error: 'Failed to filter bookings' });
    }
  }));

  app.delete('/api/bookings/:id', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Verify ownership
      const existingBooking = await storage.getBooking(bookingId);
      if (!existingBooking || existingBooking.userId !== userId) {
        return res.status(404).json({ error: 'Booking not found' });
      }
      
      await storage.deleteBooking(bookingId, userId);
      console.log(`✅ Deleted booking #${bookingId} for user ${userId}`);
      res.json({ success: true });
      
    } catch (error) {
      console.error('❌ Failed to delete booking:', error);
      res.status(500).json({ error: 'Failed to delete booking' });
    }
  });

  // Get individual booking
  app.get('/api/bookings/:id', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const booking = await storage.getBooking(bookingId);
      if (!booking || booking.userId !== userId) {
        return res.status(404).json({ error: 'Booking not found' });
      }
      
      res.json(booking);
      
    } catch (error) {
      console.error('❌ Failed to fetch booking:', error);
      res.status(500).json({ error: 'Failed to fetch booking' });
    }
  });

  // Extract details from message content using AI
  app.post('/api/bookings/:id/extract-details', authenticate, async (req: AuthenticatedRequest, res) => {
    const bookingId = parseInt(req.params.id);
    console.log(`📝 [EXTRACT-DETAILS] Starting for booking ${bookingId}`);
    console.log(`📝 [EXTRACT-DETAILS] Request received at ${new Date().toISOString()}`);
    try {
      const userId = req.user?.id;
      const { messageContent } = req.body;
      
      console.log(`📝 [EXTRACT-DETAILS] User ID: ${userId}, Has messageContent: ${!!messageContent}`);
      
      if (!userId) {
        console.log(`❌ [EXTRACT-DETAILS] No user ID found`);
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Verify ownership
      const booking = await storage.getBooking(bookingId);
      if (!booking || booking.userId !== userId) {
        return res.status(404).json({ error: 'Booking not found' });
      }
      
      if (!messageContent) {
        return res.status(400).json({ error: 'Message content is required' });
      }
      
      // Fetch conversation history to get previous message as context
      console.log(`📜 [EXTRACT-DETAILS] Fetching conversation history for booking ${bookingId}...`);
      console.log(`📜 [EXTRACT-DETAILS] Current message content: ${messageContent.substring(0, 200)}...`);
      
      try {
        // Import storage and cloud storage
        const { storage } = await import('../core/storage');
        const { downloadFile } = await import('../core/cloud-storage');
        
        // Get ALL message notifications for this booking
        const bookingMessages = await storage.getAllMessageNotificationsForBooking(userId, bookingId);
        
        // Communications will be handled separately if needed
        

        const allMessages: any[] = [];
        
        // Process incoming messages
        for (const msg of bookingMessages) {
          try {
            const downloadResult = await downloadFile(msg.messageUrl);
            let content = 'Message content unavailable';
            
            if (downloadResult.success && downloadResult.content) {
              // Extract text content from HTML (simplified version)
              let rawText = downloadResult.content
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<\/p>/gi, '\n\n')
                .replace(/<[^>]*>/g, '')
                .replace(/&nbsp;/g, ' ')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/\s+/g, ' ')
                .trim();
              
              // Basic content extraction - just get first meaningful paragraph
              const lines = rawText.split(/\n+/);
              const meaningfulLines = [];
              
              for (const line of lines) {
                const cleanLine = line.trim();
                if (cleanLine && 
                    !cleanLine.startsWith('>') && 
                    !cleanLine.startsWith('From:') &&
                    !cleanLine.startsWith('Subject:') &&
                    !cleanLine.startsWith('Date:') &&
                    !cleanLine.startsWith('On ') &&
                    !cleanLine.match(/^\d{1,2}\/\d{1,2}\/\d{4}/) &&
                    cleanLine.length > 3) {
                  meaningfulLines.push(cleanLine);
                }
                if (cleanLine.startsWith('>') || cleanLine.includes('wrote:')) {
                  break;
                }
              }
              
              content = meaningfulLines.length > 0 ? meaningfulLines.join('\n\n') : rawText.substring(0, 500);
            }
            
            allMessages.push({
              content,
              timestamp: new Date(msg.receivedAt),
              type: 'incoming',
              fromEmail: msg.senderEmail
            });
          } catch (error) {
            console.error(`❌ Error processing message ${msg.id}:`, error);
          }
        }
        
        // Process outbound messages
        for (const comm of communications) {
          let content = comm.messageContent || 'Message content unavailable';
          
          // If content is stored in R2, download it
          if (comm.messageContentUrl) {
            try {
              const downloadResult = await downloadFile(comm.messageContentUrl);
              if (downloadResult.success && downloadResult.content) {
                content = downloadResult.content;
              }
            } catch (error) {
              console.error(`❌ Error downloading communication content:`, error);
            }
          }
          
          allMessages.push({
            content,
            timestamp: new Date(comm.sentAt),
            type: 'outgoing',
            fromEmail: 'performer'
          });
        }
        
        // Sort all messages by timestamp
        allMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        
        // Find the previous message by looking for the message before the current one
        let previousMessageContent = null;
        const currentMessageIndex = allMessages.findIndex(msg => 
          msg.content.includes(messageContent.substring(0, Math.min(50, messageContent.length)))
        );
        
        if (currentMessageIndex > 0) {
          previousMessageContent = allMessages[currentMessageIndex - 1].content;
          console.log(`📜 [EXTRACT-DETAILS] Found previous message: ${previousMessageContent.substring(0, 100)}...`);
        } else {
          console.log(`📜 [EXTRACT-DETAILS] No previous message found in conversation`);
        }
        
        // Prepare enhanced context for AI
        let enhancedMessageContent = messageContent;
        if (previousMessageContent) {
          enhancedMessageContent = `PREVIOUS MESSAGE:\n${previousMessageContent}\n\nCURRENT MESSAGE:\n${messageContent}`;
          console.log(`🔗 [EXTRACT-DETAILS] Using enhanced context with previous message`);
          console.log(`🔗 [EXTRACT-DETAILS] Enhanced content (first 300 chars): ${enhancedMessageContent.substring(0, 300)}...`);
        } else {
          console.log(`📜 [EXTRACT-DETAILS] No previous message found, using current message only`);
        }
        
        // Use Claude Haiku to extract booking details from the message with context
        console.log('🤖 Using Claude Haiku for detail extraction with conversation context...');
        console.log(`🔗 [EXTRACT-DETAILS] Final content length: ${enhancedMessageContent.length} characters`);
        
        // Use specialized confirmation parser instead of full booking parser
        const { parseBookingConfirmation } = await import('../services/booking-confirmation-parser');
        var parsedData = await parseBookingConfirmation(
          enhancedMessageContent,
          booking // Pass existing booking context
        );
        
        console.log(`🔍 [EXTRACT-DETAILS] Parsed data fee: ${parsedData.fee}, totalFee: ${parsedData.totalFee}`);
        
      } catch (contextError) {
        console.error(`⚠️ [EXTRACT-DETAILS] Error fetching conversation context:`, contextError);
        console.log(`🤖 [EXTRACT-DETAILS] Falling back to single message parsing...`);
        
        // Fallback to single-message confirmation parsing
        const { parseBookingConfirmation } = await import('../services/booking-confirmation-parser');
        var parsedData = await parseBookingConfirmation(
          messageContent,
          booking // Pass existing booking context
        );
        
        console.log(`🔍 [EXTRACT-DETAILS] Fallback parsed data fee: ${parsedData.fee}, totalFee: ${parsedData.totalFee}`);
      }
      
      console.log('✅ Claude Haiku extraction complete:', {
        hasEventDate: !!parsedData.eventDate,
        hasClientName: !!parsedData.clientName,
        hasVenue: !!parsedData.venue,
        confidence: parsedData.confidence
      });
      
      // Convert parsed data to the format expected by the frontend
      let extractedDetails = {
        clientName: parsedData.clientName,
        clientEmail: parsedData.clientEmail,
        clientPhone: parsedData.clientPhone,
        clientAddress: parsedData.clientAddress,
        venue: parsedData.venue,
        venueAddress: parsedData.venueAddress,
        eventDate: parsedData.eventDate,
        eventTime: parsedData.eventTime,
        eventEndTime: parsedData.eventEndTime,
        eventType: parsedData.eventType,
        totalFee: parsedData.fee, // Map 'fee' to 'totalFee'
        deposit: parsedData.deposit,
        notes: parsedData.specialRequirements,
        performanceDuration: parsedData.performanceDuration,
        guestCount: parsedData.guestCount,
        // Add clientConfirmsBooking logic
        clientConfirmsBooking: messageContent && (
          messageContent.toLowerCase().includes("we'd like to confirm") ||
          messageContent.toLowerCase().includes("we confirm") ||
          messageContent.toLowerCase().includes("we accept") ||
          messageContent.toLowerCase().includes("we'd like to book") ||
          messageContent.toLowerCase().includes("please go ahead") ||
          messageContent.toLowerCase().includes("sounds perfect") ||
          messageContent.toLowerCase().includes("that works for us") ||
          messageContent.toLowerCase().includes("we're happy to proceed") ||
          messageContent.toLowerCase().includes("we agree") ||
          messageContent.toLowerCase().includes("let's proceed") ||
          messageContent.toLowerCase().includes("we'd like to move forward")
        )
      };
      
      // Clean up the extracted data
      const cleanedDetails: any = {};
      
      // Helper function to standardize performance duration
      const standardizePerformanceDuration = (duration: string): string => {
        if (!duration || typeof duration !== 'string') return duration;
        
        const cleaned = duration.toLowerCase().trim();
        
        // Duration mapping to match dropdown options exactly
        const durationMap: { [key: string]: string } = {
          // Standard durations
          '30 minutes': '30 minutes',
          '30 mins': '30 minutes',
          '30min': '30 minutes',
          '45 minutes': '45 minutes', 
          '45 mins': '45 minutes',
          '45min': '45 minutes',
          '1 hour': '1 hour',
          '1hr': '1 hour',
          '1-hour': '1 hour',
          '75 minutes': '75 minutes',
          '75 mins': '75 minutes',
          '90 minutes': '90 minutes',
          '90 mins': '90 minutes',
          '1.5 hours': '90 minutes',
          '1.5hrs': '90 minutes',
          '2 hours': '2 hours',
          '2hrs': '2 hours', 
          '2-hour': '2 hours',
          '2.5 hours': '2.5 hours',
          '2.5hrs': '2.5 hours',
          '3 hours': '3 hours',
          '3hrs': '3 hours',
          '3.5 hours': '3.5 hours',
          '3.5hrs': '3.5 hours', 
          '4 hours': '4 hours',
          '4hrs': '4 hours',
          // Set formats
          '2 x 45 min sets': '2 x 45 min sets',
          '2x45 min sets': '2 x 45 min sets',
          '2 x 1 hour sets': '2 x 1 hour sets', 
          '2x1 hour sets': '2 x 1 hour sets',
          '3 x 45 min sets': '3 x 45 min sets',
          '3x45 min sets': '3 x 45 min sets'
        };
        
        return durationMap[cleaned] || duration; // Return original if no match
      };

      // Helper function to extract clean email address from "Name <email@domain.com>" format
      const cleanEmailAddress = (email: string): string => {
        if (!email || typeof email !== 'string') return email;
        
        // Check if email is in "Name <email@domain.com>" format
        const emailMatch = email.match(/<([^>]+@[^>]+)>/);
        if (emailMatch) {
          return emailMatch[1].trim();
        }
        
        // Return original if no angle brackets found
        return email.trim();
      };
      
      for (const [key, value] of Object.entries(extractedDetails)) {
        if (value !== null && value !== '' && value !== undefined) {
          // Special handling for dates
          if (key === 'eventDate' && typeof value === 'string') {
            // Try to parse and format the date
            try {
              const date = new Date(value);
              if (!isNaN(date.getTime())) {
                cleanedDetails[key] = date.toISOString().split('T')[0];
              }
            } catch {
              cleanedDetails[key] = value;
            }
          }
          // Special handling for performance duration
          else if (key === 'performanceDuration' && typeof value === 'string') {
            cleanedDetails[key] = standardizePerformanceDuration(value);
          }
          // Special handling for email addresses
          else if (key === 'clientEmail' && typeof value === 'string') {
            cleanedDetails[key] = cleanEmailAddress(value);
          } else {
            cleanedDetails[key] = value;
          }
        }
      }
      
      console.log('📝 Extracted details from message:', cleanedDetails);
      res.json(cleanedDetails);
      
    } catch (error: any) {
      console.error('❌ Failed to extract details:', {
        error: error.message,
        stack: error.stack,
        response: error.response?.data,
        status: error.response?.status,
        bookingId: bookingId
      });
      
      // More specific error messages
      if (error.response?.status === 401) {
        res.status(500).json({ error: 'Claude Haiku authentication failed - API key may be invalid' });
      } else if (error.response?.status === 429) {
        res.status(500).json({ error: 'Claude Haiku rate limit exceeded - please try again later' });
      } else if (error.message?.includes('API key')) {
        res.status(500).json({ error: 'Claude Haiku API key issue - please check configuration' });
      } else {
        res.status(500).json({ 
          error: 'Failed to extract details from message',
          details: error.message 
        });
      }
    }
  });

  // Bulk delete bookings
  app.post('/api/bookings/bulk-delete', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { bookingIds } = req.body;
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      if (!bookingIds || !Array.isArray(bookingIds) || bookingIds.length === 0) {
        return res.status(400).json({ error: 'Booking IDs array is required' });
      }
      
      // Verify all bookings belong to the authenticated user
      const verificationPromises = bookingIds.map(async (bookingId: number) => {
        const booking = await storage.getBooking(bookingId);
        if (!booking) {
          throw new Error(`Booking #${bookingId} not found`);
        }
        if (booking.userId !== userId) {
          throw new Error(`Access denied to booking #${bookingId}`);
        }
        return booking;
      });
      
      try {
        await Promise.all(verificationPromises);
      } catch (verificationError: any) {
        return res.status(403).json({ error: verificationError.message });
      }
      
      const deletePromises = bookingIds.map((bookingId: number) => 
        storage.deleteBooking(bookingId, userId)
      );
      
      await Promise.all(deletePromises);
      
      res.json({ 
        success: true, 
        deletedCount: bookingIds.length,
        message: `Successfully deleted ${bookingIds.length} booking${bookingIds.length !== 1 ? 's' : ''}` 
      });
      
    } catch (error: any) {
      console.error('❌ Bulk delete failed:', error);
      res.status(500).json({ 
        error: 'Failed to delete bookings', 
        details: error.message 
      });
    }
  });

  // Widget endpoints for external booking forms
  console.log('🔧 Setting up widget endpoints...');

  // CORS middleware for widget endpoints (allow Cloudflare R2 and other origins)
  const widgetCorsHandler = (req: any, res: any, next: any) => {
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow all origins for widgets
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  };

  // Verify widget token
  app.get('/api/widget/verify/:token', widgetCorsHandler, async (req, res) => {
    try {
      const { token } = req.params;
      const user = await storage.getUserByQuickAddToken(token);
      
      if (!user) {
        return res.json({ valid: false });
      }
      
      res.json({ 
        valid: true, 
        userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'User'
      });
    } catch (error) {
      console.error('❌ Widget token verification failed:', error);
      res.json({ valid: false });
    }
  });

  // Handle OPTIONS preflight for widget endpoints
  app.options('/api/widget/verify/:token', widgetCorsHandler);
  app.options('/api/widget/hybrid-submit', widgetCorsHandler);

  // Hybrid widget form submission (combines natural language + structured data)
  app.post('/api/widget/hybrid-submit', widgetCorsHandler, async (req, res) => {
    try {
      const { messageText, clientName, clientContact, eventDate, venue, token } = req.body;
      
      // Debug logging to trace the issue
      console.log('📝 Widget submission received:', {
        messageText: messageText?.substring(0, 100) + '...',
        clientName,
        clientContact,
        eventDate,
        venue,
        hasToken: !!token
      });
      
      if (!messageText || !clientName || !clientContact || !token) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      // Verify widget token and get user
      const user = await storage.getUserByQuickAddToken(token);
      if (!user) {
        return res.status(401).json({ error: 'Invalid widget token' });
      }
      
      // Parse the message using AI to extract additional details
      const { parseBookingMessage } = await import('../ai/booking-message-parser');
      // Fix parameter order: messageText, clientContact, clientAddress (venue), userId, subject
      const parsedData = await parseBookingMessage(messageText, clientContact, venue, user.id, undefined);
      
      // Determine contact details (email vs phone) - FIXED: Ensure widget form data is captured
      let clientEmail = parsedData.clientEmail;
      let clientPhone = parsedData.clientPhone;
      
      // CRITICAL FIX: Always capture email from widget form if not parsed
      if (!clientEmail && !clientPhone) {
        if (clientContact.includes('@')) {
          clientEmail = clientContact;
        } else if (/\d{10,}/.test(clientContact)) {
          clientPhone = clientContact;
        }
      }

      // FIXED: If AI didn't extract email but widget form provided it, use widget form email
      if (!clientEmail && clientContact.includes('@')) {
        clientEmail = clientContact;
      }
      
      // ENCORE SPECIAL HANDLING: Recognize Encore booking platform messages
      const isEncoreMessage = messageText.toLowerCase().includes('encore') || 
                              clientName?.toLowerCase().includes('encore') ||
                              messageText.includes('apply now') ||
                              messageText.includes('we don\'t have the date yet') ||
                              messageText.includes('prizes from you');
      
      // PRIMARY CHECK: No valid event date = review messages (simplified rule)
      // Exception: Encore messages with clear venue/event type can become bookings despite vague dates
      if (!parsedData.eventDate || parsedData.eventDate === null) {
        // ENCORE EXCEPTION: Allow Encore messages to become bookings if they have venue + event type
        if (isEncoreMessage && parsedData.venue && parsedData.eventType) {
          console.log(`🎵 Encore message detected with venue (${parsedData.venue}) and event type (${parsedData.eventType}) - creating booking despite vague date`);
          // Set a placeholder date for Encore bookings without specific dates
          parsedData.eventDate = new Date(new Date().getFullYear() + 1, 0, 1).toISOString().split('T')[0]; // January 1st next year
          parsedData.confidence = Math.max(0.6, parsedData.confidence); // Boost confidence for Encore messages
        } else {
          console.log(`📅 No event date found - routing to review messages`);
        
          // Determine message type for better categorization
        const isPriceEnquiry = parsedData.isPriceEnquiry === true || 
                               parsedData.messageType === 'price_enquiry' ||
                               messageText.toLowerCase().includes('price') ||
                               messageText.toLowerCase().includes('pricing') ||
                               messageText.toLowerCase().includes('quote') ||
                               messageText.toLowerCase().includes('cost') ||
                               messageText.toLowerCase().includes('how much') ||
                               messageText.toLowerCase().includes('rate');
        
        const messageType = isPriceEnquiry ? 'price_enquiry' : 'incomplete_booking';
        const reasonText = isPriceEnquiry ? 'Price enquiry detected' : 'No valid event date found';
        
        // Send to unparseable messages for manual review
        const { storage: miscStorage } = await import('../storage/misc-storage');
        await miscStorage.createUnparseableMessage({
          userId: user.id,
          messageType: messageType,
          content: messageText,
          senderName: clientName,
          senderEmail: clientEmail,
          senderPhone: clientPhone,
          parsedVenue: parsedData.venue,
          parsedDate: parsedData.eventDate,
          parsedEventType: parsedData.eventType,
          aiConfidence: parsedData.confidence,
          parsingErrorDetails: `${reasonText} - requires manual review`
        });
        
          return res.json({ 
            success: true, 
            requiresReview: true,
            reason: 'no_date',
            isPriceEnquiry: isPriceEnquiry,
            message: 'Message received and will be reviewed manually'
          });
        }
      }
      
      // THIRD CHECK: Determine if parsing was successful enough to create booking
      const hasMinimumData = parsedData.eventDate || parsedData.venue || parsedData.eventType || 
                             (parsedData.confidence && parsedData.confidence >= 0.5);
      
      if (!hasMinimumData || parsedData.confidence < 0.4) {
        console.log(`📧 Low confidence booking (${Math.round(parsedData.confidence * 100)}%) - routing to unparseable messages`);
        
        // Send to unparseable messages for manual review
        const { storage: miscStorage } = await import('../storage/misc-storage');
        await miscStorage.createUnparseableMessage({
          userId: user.id,
          messageType: 'booking_widget',
          content: messageText,
          senderName: clientName,
          senderEmail: clientEmail,
          senderPhone: clientPhone,
          parsedVenue: parsedData.venue,
          parsedDate: parsedData.eventDate,
          parsedEventType: parsedData.eventType,
          aiConfidence: parsedData.confidence,
          parsingErrorDetails: `Low confidence AI parsing (${Math.round(parsedData.confidence * 100)}%) - requires manual review`
        });
        
        return res.json({ 
          success: true, 
          requiresReview: true,
          confidence: parsedData.confidence,
          message: 'Booking request received and will be reviewed manually'
        });
      }
      
      // Create booking with combined data
      // Priority: 1) Form fields (if filled), 2) AI-parsed from message text, 3) Defaults
      const bookingData = {
        userId: user.id,
        title: cleanEncoreTitle(clientName ? `Widget Booking - ${clientName}` : 'Widget Booking Request'),
        clientName: clientName || parsedData.clientName || 'Unknown Client',
        clientEmail: clientEmail || null, // Ensure widget email is captured
        clientPhone: clientPhone || null,
        // Use form venue if provided, otherwise use AI-extracted venue from message
        venue: venue || parsedData.venue || null,
        venueAddress: parsedData.venueAddress || null,
        venueContact: parsedData.venueContactInfo || null,
        // Use form date if provided, otherwise use AI-extracted date from message
        eventDate: eventDate || parsedData.eventDate || null,
        eventTime: parsedData.eventTime || null,
        eventEndTime: parsedData.eventEndTime || null,
        fee: parsedData.fee || null,
        deposit: parsedData.deposit || null,
        status: 'new',
        notes: messageText, // Store original message text in notes
        gigType: parsedData.eventType || null,
        equipmentRequirements: null,
        specialRequirements: parsedData.specialRequirements || null
      };
      
      // Debug log the final booking data
      console.log('📊 Creating booking with data:', {
        clientName: bookingData.clientName,
        clientEmail: bookingData.clientEmail,
        clientPhone: bookingData.clientPhone,
        venue: bookingData.venue,
        eventDate: bookingData.eventDate,
        eventType: bookingData.gigType,
        aiConfidence: parsedData.confidence
      });
      
      const newBooking = await storage.createBooking(bookingData);
      console.log(`✅ Widget created booking #${newBooking.id} for user ${user.id} (AI confidence: ${Math.round(parsedData.confidence * 100)}%)`);
      
      // Send notification email to the musician if they have settings
      try {
        const userSettings = await storage.getSettings(user.id);
        if (userSettings?.businessEmail || user.email) {
          const { EmailService } = await import('../core/services');
          const emailService = new EmailService();
          
          const businessName = userSettings?.businessName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'MusoBuddy User';
          const subject = `New Booking Request - ${businessName}`;
          const emailBody = `
<h2>New Booking Request</h2>
<p><strong>From:</strong> ${clientName}</p>
<p><strong>Contact:</strong> ${clientEmail || clientPhone || 'Not provided'}</p>
<p><strong>Event Date:</strong> ${eventDate || parsedData.eventDate || 'Not specified'}</p>
<p><strong>Venue:</strong> ${venue || parsedData.venue || 'Not specified'}</p>
<p><strong>Event Type:</strong> ${parsedData.eventType || 'Not specified'}</p>

<h3>Original Message:</h3>
<blockquote style="border-left: 4px solid #667eea; padding-left: 16px; margin: 16px 0;">
${messageText.replace(/\n/g, '<br>')}
</blockquote>

<p><strong>AI Confidence:</strong> ${Math.round(parsedData.confidence * 100)}%</p>
<p><em>This booking request was submitted via your MusoBuddy booking widget.</em></p>
          `;
          
          await emailService.sendEmail({
            to: userSettings?.businessEmail || user.email!,
            subject: subject,
            html: emailBody
          });
          
          console.log(`✅ Notification email sent for booking #${newBooking.id}`);
        }
      } catch (emailError) {
        console.error('⚠️ Failed to send notification email:', emailError);
        // Don't fail the request if email fails
      }
      
      res.json({ 
        success: true, 
        bookingId: newBooking.id,
        confidence: parsedData.confidence,
        message: 'Booking request received successfully'
      });
      
    } catch (error: any) {
      console.error('❌ Widget booking creation failed:', error);
      res.status(500).json({ 
        error: 'Failed to process booking request',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Add missing QR code generation endpoint for production compatibility
  app.post('/api/generate-qr-code', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Generate widget token for the user
      const jwt = await import('jsonwebtoken');
      const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
      if (!secret) {
        console.error('🚨 CRITICAL: No JWT_SECRET environment variable set');
        return res.status(500).json({ error: 'Server configuration error' });
      }
      
      const token = jwt.default.sign(
        { userId, type: 'widget' },
        secret,
        { expiresIn: '30d' }
      );
      
      // Use R2-hosted widget system
      const { uploadWidgetToR2 } = await import('../widget-system/widget-storage');
      const uploadResult = await uploadWidgetToR2(userId.toString(), token);
      
      if (!uploadResult.success) {
        console.error('❌ Failed to upload widget to R2:', uploadResult.error);
        return res.status(500).json({ error: 'Failed to generate widget' });
      }
      
      const widgetUrl = uploadResult.url!;
      const qrCode = uploadResult.qrCodeUrl!;
      
      // Save the widget URL and QR code to the user's record for persistence
      await storage.updateUserWidgetInfo(userId, widgetUrl, qrCode);
      
      console.log(`✅ Permanent widget created and saved for user ${userId}`);
      
      res.json({ qrCode, url: widgetUrl });
    } catch (error) {
      console.error('QR code generation error:', error);
      res.status(500).json({ error: 'Failed to generate QR code' });
    }
  });

  // Send compliance documents for a booking
  app.post('/api/bookings/:id/send-compliance', 
    authenticate,
    requireSubscriptionOrAdmin,
    generalApiRateLimit,
    asyncHandler(async (req: any, res: any) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const bookingId = parseInt(req.params.id);
        const { documentIds, recipientEmail, customMessage } = req.body;

        if (!bookingId || !documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
          return res.status(400).json({ error: 'Booking ID and document IDs are required' });
        }

        if (!recipientEmail) {
          return res.status(400).json({ error: 'Recipient email is required' });
        }

        console.log(`📧 Sending compliance documents for booking ${bookingId} to ${recipientEmail}`);

        // Verify booking ownership
        const booking = await storage.getBooking(bookingId, userId);
        if (!booking) {
          return res.status(404).json({ error: 'Booking not found' });
        }

        // Get compliance documents and verify ownership
        const complianceDocuments = await storage.getComplianceDocuments(userId);
        const documentsToSend = complianceDocuments.filter((doc: any) => 
          documentIds.includes(doc.id) && doc.status === 'valid'
        );

        if (documentsToSend.length === 0) {
          return res.status(400).json({ error: 'No valid documents found to send' });
        }

        // Send email with compliance documents
        const { EmailService } = await import('../core/services');
        const emailService = new EmailService();
        
        // Get user settings for business info
        const userSettings = await storage.getSettings(userId);
        const businessName = userSettings?.businessName || 'MusoBuddy User';
        
        // Create email content
        const subject = `Compliance Documents - ${booking.eventType || 'Event'} at ${booking.venue || 'Your Venue'}`;
        
        let emailBody = `
<h2>Compliance Documents</h2>
<p>Dear ${booking.clientName || 'Client'},</p>

<p>Please find attached the compliance documents for your upcoming event:</p>

<div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
  <strong>Event Details:</strong><br>
  ${booking.eventType || 'Event'}<br>
  ${booking.venue ? `Venue: ${booking.venue}<br>` : ''}
  ${booking.eventDate ? `Date: ${new Date(booking.eventDate).toLocaleDateString()}<br>` : ''}
  ${booking.eventTime ? `Time: ${booking.eventTime}` : ''}
</div>

<p><strong>Attached Documents:</strong></p>
<ul>
`;

        documentsToSend.forEach((doc: any) => {
          const typeLabel = doc.type === 'public_liability' ? 'Public Liability Insurance' :
                           doc.type === 'pat_testing' ? 'PAT Testing Certificate' :
                           doc.type === 'music_license' ? 'Music License' : doc.type;
          emailBody += `<li>${typeLabel} - ${doc.name}</li>`;
        });

        emailBody += `</ul>`;

        // Add document download links
        emailBody += `
<div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
  <p><strong>Download Documents:</strong></p>
`;

        documentsToSend.forEach((doc: any) => {
          const typeLabel = doc.type === 'public_liability' ? 'Public Liability Insurance' :
                           doc.type === 'pat_testing' ? 'PAT Testing Certificate' :
                           doc.type === 'music_license' ? 'Music License' : doc.type;
          emailBody += `  <p>• <a href="${doc.documentUrl}" style="color: #667eea; text-decoration: none;">${typeLabel} - ${doc.name}</a></p>`;
        });

        emailBody += `</div>`;

        if (customMessage && customMessage.trim()) {
          emailBody += `
<div style="border-left: 4px solid #667eea; padding-left: 16px; margin: 20px 0;">
  <p><strong>Additional Message:</strong></p>
  <p>${customMessage.replace(/\n/g, '<br>')}</p>
</div>`;
        }

        emailBody += `
<p>If you have any questions about these documents, please don't hesitate to contact me.</p>

<p>Best regards,<br>
${businessName}</p>
`;

        // Send email without attachments - documents are linked from R2
        await emailService.sendEmail({
          to: recipientEmail,
          subject: subject,
          html: emailBody
        });

        // Log that compliance documents were sent for this booking
        const { db } = await import('../core/database');
        await db.execute(`
          INSERT INTO compliance_sent_log (booking_id, user_id, recipient_email, document_ids, sent_at) 
          VALUES (${bookingId}, '${userId}', '${recipientEmail.replace(/'/g, "''")}', '${JSON.stringify(documentIds).replace(/'/g, "''")}', NOW())
        `);

        console.log(`✅ Compliance documents sent for booking ${bookingId} to ${recipientEmail}`);
        
        res.json({ 
          success: true, 
          message: `Compliance documents sent to ${recipientEmail}`,
          documentCount: documentsToSend.length
        });

      } catch (error: any) {
        console.error('❌ Failed to send compliance documents:', error);
        res.status(500).json({ 
          error: 'Failed to send compliance documents',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    })
  );


  // Check if compliance documents have been sent for a specific booking
  app.get('/api/bookings/:id/compliance-sent', 
    authenticate,
    requireSubscriptionOrAdmin,
    asyncHandler(async (req: any, res: any) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const bookingId = parseInt(req.params.id);
        
        // Verify booking ownership
        const booking = await storage.getBooking(bookingId, userId);
        if (!booking) {
          return res.status(404).json({ error: 'Booking not found' });
        }

        // Return simple response - compliance indicator will be hidden when sent=false
        res.json({ 
          sent: false,
          documents: []
        });

      } catch (error: any) {
        console.error('❌ Failed to check compliance sent status:', error);
        res.status(500).json({ 
          error: 'Failed to check compliance status',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    })
  );

  // Find duplicate bookings
  app.get('/api/bookings/duplicates', 
    authenticate,
    asyncHandler(async (req: SupabaseAuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        // Get ALL bookings (not limited by display settings)
        const allBookings = await storage.getBookings(userId);
        
        // Group bookings by date, time, and client name to find duplicates
        const groups: { [key: string]: any[] } = {};
        
        allBookings.forEach(booking => {
          const key = `${booking.eventDate}-${booking.eventTime || 'no-time'}-${(booking.clientName || '').toLowerCase().trim()}`;
          if (!groups[key]) {
            groups[key] = [];
          }
          groups[key].push(booking);
        });
        
        // Find groups with more than one booking (duplicates)
        const duplicateGroups = Object.values(groups).filter(group => group.length > 1);
        
        // Sort each group by creation date (oldest first)
        duplicateGroups.forEach(group => {
          group.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        });
        
        // Sort groups by event date
        duplicateGroups.sort((a, b) => {
          const dateA = new Date(a[0].eventDate || 0);
          const dateB = new Date(b[0].eventDate || 0);
          return dateA.getTime() - dateB.getTime();
        });

        
        res.json({
          success: true,
          duplicateGroups,
          totalGroups: duplicateGroups.length,
          totalDuplicates: duplicateGroups.reduce((sum, group) => sum + group.length - 1, 0) // Exclude original from count
        });

      } catch (error: any) {
        console.error('❌ Failed to find duplicates:', error);
        res.status(500).json({ 
          error: 'Failed to find duplicates',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    })
  );

  // Remove duplicate bookings
  app.post('/api/bookings/remove-duplicates', 
    authenticate,
    asyncHandler(async (req: SupabaseAuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const { bookingIds } = req.body;
        
        if (!Array.isArray(bookingIds) || bookingIds.length === 0) {
          return res.status(400).json({ error: 'bookingIds array required' });
        }

        let removedCount = 0;
        const errors: string[] = [];

        // Remove each specified booking
        for (const bookingId of bookingIds) {
          try {
            // Verify ownership before deletion
            const booking = await storage.getBooking(bookingId, userId);
            if (!booking) {
              errors.push(`Booking ${bookingId} not found or not owned by user`);
              continue;
            }

            await storage.deleteBooking(bookingId, userId);
            removedCount++;
            console.log(`✅ Removed duplicate booking ${bookingId}: ${booking.clientName} on ${booking.eventDate}`);
          } catch (error: any) {
            console.error(`❌ Failed to remove booking ${bookingId}:`, error);
            errors.push(`Failed to remove booking ${bookingId}: ${error.message}`);
          }
        }

        console.log(`🧹 Removed ${removedCount} duplicate bookings for user ${userId}`);
        
        res.json({
          success: true,
          removedCount,
          errors: errors.length > 0 ? errors : undefined,
          message: `Successfully removed ${removedCount} duplicate bookings${errors.length > 0 ? ` (${errors.length} errors)` : ''}`
        });

      } catch (error: any) {
        console.error('❌ Failed to remove duplicates:', error);
        res.status(500).json({ 
          error: 'Failed to remove duplicates',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    })
  );


  console.log('✅ Booking routes configured');
}