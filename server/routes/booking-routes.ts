import { type Express } from "express";
import { storage } from "../core/storage";
import { validateBody, validateQuery, schemas, sanitizeInput } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { generalApiRateLimit } from '../middleware/rateLimiting';
import { requireAuth } from '../middleware/auth';
import { requireSubscriptionOrAdmin } from '../core/subscription-middleware';
import { cleanEncoreTitle } from '../core/booking-formatter';

export function registerBookingRoutes(app: Express) {
  console.log('📅 Setting up booking routes...');

  // Get all bookings for authenticated user (requires subscription)
  app.get('/api/bookings', requireAuth, requireSubscriptionOrAdmin, async (req: any, res) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      const bookings = await storage.getBookings(userId);
      console.log(`✅ Retrieved ${bookings.length} bookings for user ${userId}`);
      
      // Debug: Check uploadedDocuments for booking #7264
      const booking7264 = bookings.find(b => b.id === 7264);
      if (booking7264) {
        console.log(`📄 Booking #7264 uploadedDocuments:`, booking7264.uploadedDocuments);
        console.log(`📄 Booking #7264 uploadedDocuments type:`, typeof booking7264.uploadedDocuments);
      }
      
      res.json(bookings);
    } catch (error) {
      console.error('❌ Failed to fetch bookings:', error);
      res.status(500).json({ error: 'Failed to fetch bookings' });
    }
  });

  // Create new booking (requires subscription)
  app.post('/api/bookings', 
    requireAuth,
    requireSubscriptionOrAdmin,
    generalApiRateLimit,
    sanitizeInput,
    validateBody(schemas.createBooking),
    asyncHandler(async (req: any, res: any) => {
    try {
      const userId = req.user?.userId;
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
  app.patch('/api/bookings/:id', requireAuth, async (req: any, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      const userId = req.user?.userId;
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
      
      const updatedBooking = await storage.updateBooking(bookingId, req.body, userId);
      console.log(`✅ Updated booking #${bookingId} for user ${userId}`);
      res.json(updatedBooking);
      
    } catch (error) {
      console.error('❌ Failed to update booking:', error);
      res.status(500).json({ error: 'Failed to update booking' });
    }
  });

  // Delete booking
  app.delete('/api/bookings/:id', requireAuth, async (req: any, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      const userId = req.user?.userId;
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
  app.get('/api/bookings/:id', requireAuth, async (req: any, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const booking = await storage.getBooking(bookingId);
      if (!booking || booking.userId !== userId) {
        return res.status(404).json({ error: 'Booking not found' });
      }
      
      console.log(`📋 Fetching booking ${bookingId} for user ${userId}`);
      console.log(`📄 Booking uploadedDocuments field:`, booking.uploadedDocuments);
      
      res.json(booking);
      
    } catch (error) {
      console.error('❌ Failed to fetch booking:', error);
      res.status(500).json({ error: 'Failed to fetch booking' });
    }
  });

  // Bulk delete bookings
  app.post('/api/bookings/bulk-delete', requireAuth, async (req: any, res) => {
    try {
      const { bookingIds } = req.body;
      const userId = req.user?.userId;
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
      const parsedData = await parseBookingMessage(messageText, clientContact, venue, user.id);
      
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
  app.post('/api/generate-qr-code', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.userId;
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

  // Upload document for booking (contract or invoice)
  app.post('/api/bookings/:id/upload-document',
    requireAuth,
    requireSubscriptionOrAdmin,
    asyncHandler(async (req: any, res: any) => {
      try {
        const userId = req.user?.userId;
        const bookingId = parseInt(req.params.id);
        
        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }
        
        // Check if booking exists and belongs to user
        const booking = await storage.getBookingByIdAndUser(bookingId, userId);
        if (!booking) {
          return res.status(404).json({ error: 'Booking not found' });
        }
        
        // Import multer and cloud storage dynamically
        const multer = await import('multer');
        const { uploadToCloudflareR2 } = await import('../core/cloud-storage');
        
        // Configure multer for memory storage
        const upload = multer.default({
          storage: multer.default.memoryStorage(),
          limits: {
            fileSize: 10 * 1024 * 1024 // 10MB limit
          },
          fileFilter: (req: any, file: any, cb: any) => {
            // Only allow PDF files
            if (file.mimetype === 'application/pdf') {
              cb(null, true);
            } else {
              cb(new Error('Only PDF files are allowed'));
            }
          }
        }).single('document');
        
        // Process the upload
        upload(req, res, async (err: any) => {
          if (err) {
            console.error('❌ Multer error:', err);
            return res.status(400).json({ error: err.message });
          }
          
          if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
          }
          
          const file = req.file;
          const documentType = req.body.type || 'general'; // 'contract', 'invoice', or 'general'
          
          console.log(`📎 Uploading ${documentType} document for booking #${bookingId}`);
          
          // Upload to R2
          const filename = `booking-${bookingId}-${documentType}-${Date.now()}.pdf`;
          const uploadResult = await uploadToCloudflareR2(
            file.buffer,
            filename,
            'application/pdf'
          );
          
          if (!uploadResult.success) {
            console.error('❌ Failed to upload to R2:', uploadResult.error);
            return res.status(500).json({ error: 'Failed to upload document' });
          }
          
          // Update booking with document URL based on type
          const updateData: any = {};
          
          if (documentType === 'contract') {
            updateData.uploadedContractUrl = uploadResult.url;
            updateData.uploadedContractKey = uploadResult.key;
            updateData.uploadedContractFilename = file.originalname;
          } else if (documentType === 'invoice') {
            updateData.uploadedInvoiceUrl = uploadResult.url;
            updateData.uploadedInvoiceKey = uploadResult.key;
            updateData.uploadedInvoiceFilename = file.originalname;
          } else {
            // For general documents, append to uploadedDocuments array
            let currentDocs = [];
            try {
              // Parse existing uploadedDocuments if it exists and is a string
              if (booking.uploadedDocuments) {
                if (typeof booking.uploadedDocuments === 'string') {
                  currentDocs = JSON.parse(booking.uploadedDocuments);
                } else if (Array.isArray(booking.uploadedDocuments)) {
                  currentDocs = booking.uploadedDocuments;
                }
              }
            } catch (error) {
              console.warn('Failed to parse existing uploadedDocuments, starting fresh:', error);
              currentDocs = [];
            }
            
            currentDocs.push({
              url: uploadResult.url,
              key: uploadResult.key,
              filename: file.originalname,
              type: documentType,
              uploadedAt: new Date().toISOString()
            });
            updateData.uploadedDocuments = JSON.stringify(currentDocs);
          }
          
          // Update the booking
          await storage.updateBooking(bookingId, updateData, userId);
          
          console.log(`✅ ${documentType} document uploaded successfully for booking #${bookingId}`);
          console.log('📄 Updated booking data:', updateData);
          
          res.json({
            success: true,
            url: uploadResult.url,
            filename: file.originalname,
            type: documentType
          });
        });
        
      } catch (error: any) {
        console.error('❌ Document upload failed:', error);
        res.status(500).json({ 
          error: 'Failed to upload document',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    })
  );
  
  // Get uploaded documents for a booking
  app.get('/api/bookings/:id/documents',
    requireAuth,
    requireSubscriptionOrAdmin,
    asyncHandler(async (req: any, res: any) => {
      try {
        const userId = req.user?.userId;
        const bookingId = parseInt(req.params.id);
        
        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }
        
        // Check if booking exists and belongs to user
        const booking = await storage.getBookingByIdAndUser(bookingId, userId);
        if (!booking) {
          return res.status(404).json({ error: 'Booking not found' });
        }
        
        // Gather all documents
        const documents = [];
        
        if (booking.uploadedContractUrl) {
          documents.push({
            type: 'contract',
            url: booking.uploadedContractUrl,
            filename: booking.uploadedContractFilename || 'Contract.pdf'
          });
        }
        
        if (booking.uploadedInvoiceUrl) {
          documents.push({
            type: 'invoice',
            url: booking.uploadedInvoiceUrl,
            filename: booking.uploadedInvoiceFilename || 'Invoice.pdf'
          });
        }
        
        // Add any general documents
        if (booking.uploadedDocuments) {
          const generalDocs = typeof booking.uploadedDocuments === 'string' 
            ? JSON.parse(booking.uploadedDocuments) 
            : booking.uploadedDocuments;
          documents.push(...generalDocs);
        }
        
        res.json({ documents });
        
      } catch (error: any) {
        console.error('❌ Failed to fetch documents:', error);
        res.status(500).json({ 
          error: 'Failed to fetch documents',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    })
  );

  console.log('✅ Booking routes configured');
}