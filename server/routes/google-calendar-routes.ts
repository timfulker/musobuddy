import type { Express, Response } from "express";
import { GoogleCalendarService } from "../services/google-calendar";
import { AIEventMatcher } from "../services/ai-event-matcher";
import { authenticateWithFirebase, type AuthenticatedRequest } from '../middleware/firebase-auth';
import { storage } from "../core/storage";

export function registerGoogleCalendarRoutes(app: Express) {
  
  // Start OAuth flow
  app.get('/api/google-calendar/auth', authenticateWithFirebase, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      console.log('🔗 Starting OAuth flow for user:', userId);

      const googleCalendarService = new GoogleCalendarService();
      const authUrl = await googleCalendarService.getAuthUrl(userId);

      console.log('✅ OAuth URL generated');
      res.json({ authUrl });

    } catch (error) {
      console.error('❌ OAuth init failed:', error);
      res.status(500).json({ error: 'Failed to start OAuth flow' });
    }
  });

  // Handle OAuth callback
  app.get('/api/google-calendar/callback', async (req, res) => {
    try {
      const { code, state: userId } = req.query;
      console.log('📨 OAuth callback received for user:', userId);

      if (!code || !userId) {
        throw new Error('Missing authorization code or user ID');
      }

      const googleCalendarService = new GoogleCalendarService();
      const tokens = await googleCalendarService.exchangeCodeForTokens(code as string);

      if (!tokens.refresh_token) {
        throw new Error('No refresh token received - user may need to reauthorize');
      }

      // Save integration to database
      await storage.saveGoogleCalendarIntegration(userId as string, {
        googleRefreshToken: tokens.refresh_token,
        googleCalendarId: 'primary',
        syncEnabled: true,
        autoSyncBookings: true,
        autoImportEvents: false,
        syncDirection: 'bidirectional'
      });

      console.log('✅ Google Calendar integration saved for user:', userId);

      // Return success page instead of JSON to avoid popup issues
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Google Calendar Connected</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f8fafc; }
              .success { color: #059669; font-size: 24px; margin-bottom: 20px; }
              .message { color: #64748b; font-size: 16px; margin-bottom: 30px; }
              .close-btn { background: #059669; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-size: 16px; }
            </style>
          </head>
          <body>
            <div class="success">✅ Google Calendar Connected!</div>
            <div class="message">Your calendar is now synced with MusoBuddy</div>
            <button class="close-btn" onclick="window.close()">Close Window</button>
            <script>
              // Try to notify parent window and close
              setTimeout(() => {
                try {
                  if (window.opener) {
                    window.opener.postMessage({ type: 'GOOGLE_CALENDAR_SUCCESS' }, '*');
                  }
                } catch (e) {
                  console.log('Could not notify parent window');
                }
                window.close();
              }, 2000);
            </script>
          </body>
        </html>
      `);

    } catch (error) {
      console.error('❌ OAuth callback failed:', error);
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Connection Failed</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f8fafc; }
              .error { color: #dc2626; font-size: 24px; margin-bottom: 20px; }
              .message { color: #64748b; font-size: 16px; margin-bottom: 30px; }
              .close-btn { background: #dc2626; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-size: 16px; }
            </style>
          </head>
          <body>
            <div class="error">❌ Connection Failed</div>
            <div class="message">${error.message}</div>
            <button class="close-btn" onclick="window.close()">Close Window</button>
            <script>
              setTimeout(() => {
                try {
                  if (window.opener) {
                    window.opener.postMessage({ type: 'GOOGLE_CALENDAR_ERROR', message: '${error.message}' }, '*');
                  }
                } catch (e) {
                  console.log('Could not notify parent window');
                }
                window.close();
              }, 3000);
            </script>
          </body>
        </html>
      `);
    }
  });

  // Get integration status
  app.get('/api/google-calendar/status', authenticateWithFirebase, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      console.log('🔍 Checking Google Calendar status for user:', userId);
      
      if (!userId) {
        console.error('❌ No userId found in request');
        return res.status(400).json({ error: 'User ID required' });
      }

      let integration;
      try {
        integration = await storage.getGoogleCalendarIntegration(userId);
        console.log('📊 Integration found:', integration ? 'yes' : 'no');
      } catch (dbError) {
        console.error('❌ Database error getting integration:', dbError);
        // Return as not connected rather than error if DB query fails
        return res.json({ connected: false });
      }
      
      if (!integration) {
        return res.json({ connected: false });
      }

      res.json({
        connected: true,
        syncEnabled: integration.syncEnabled,
        lastSyncAt: integration.lastSyncAt,
        autoSyncBookings: integration.autoSyncBookings,
        autoImportEvents: integration.autoImportEvents,
        syncDirection: integration.syncDirection
      });

    } catch (error) {
      console.error('❌ Failed to get integration status:', error);
      console.error('❌ Error details:', error.message, error.stack);
      res.status(500).json({ error: 'Failed to get integration status', details: error.message });
    }
  });

  // Update sync settings  
  app.post('/api/google-calendar/settings', authenticateWithFirebase, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      const { syncEnabled, autoSyncBookings, autoImportEvents, syncDirection } = req.body;

      await storage.updateGoogleCalendarIntegration(userId, {
        syncEnabled,
        autoSyncBookings,
        autoImportEvents,
        syncDirection
      });

      console.log('✅ Updated Google Calendar settings for user:', userId);
      res.json({ success: true });

    } catch (error) {
      console.error('❌ Failed to update settings:', error);
      res.status(500).json({ error: 'Failed to update settings' });
    }
  });

  // Manual sync trigger (ID-based with minimal AI)
  app.post('/api/google-calendar/sync', authenticateWithFirebase, async (req: AuthenticatedRequest, res: Response) => {
    console.log('🚀 Google Calendar sync endpoint hit!');
    console.log('📋 Request body:', req.body);
    try {
      const userId = req.user?.id;
      console.log('👤 User ID:', userId);
      const { direction = 'export', linkUnknownEvents = false } = req.body;
      let integration;
      try {
        console.log('🔍 Fetching Google Calendar integration for user:', userId);
        integration = await storage.getGoogleCalendarIntegration(userId);
        console.log('✅ Integration found:', integration ? 'yes' : 'no');
      } catch (dbError) {
        console.error('❌ [SYNC] Database error fetching integration:', dbError);
        return res.status(500).json({ 
          error: 'Database error', 
          details: 'Failed to check Google Calendar connection. Please try again.' 
        });
      }
      
      if (!integration) {
        return res.status(404).json({ 
          error: 'Google Calendar not connected',
          details: 'Please connect your Google Calendar first.'
        });
      }
      
      if (!integration.googleRefreshToken) {
        return res.status(400).json({ 
          error: 'Google Calendar integration incomplete', 
          details: 'Please reconnect your Google Calendar.' 
        });
      }
      const googleCalendarService = new GoogleCalendarService();
      
      try {
        await googleCalendarService.initializeForUser(integration.googleRefreshToken);
      } catch (initError) {
        console.error('Failed to initialize Google Calendar service:', initError);
        throw new Error(`Google Calendar authentication failed: ${initError.message}`);
      }
      
      let exported = 0;
      let updated = 0;
      let imported = 0;
      let unlinkedGoogleEvents = 0;
      let aiUsed = 0;
      
      // Get all current data
      let bookings;
      try {
        bookings = await storage.getBookings(userId);
      } catch (bookingError) {
        console.error('Failed to fetch bookings:', bookingError);
        return res.status(500).json({ 
          error: 'Failed to fetch bookings', 
          details: 'Could not retrieve your bookings for sync. Please try again.' 
        });
      }
      
      const eligibleBookings = bookings.filter(booking => 
        booking.eventDate && 
        booking.status !== 'cancelled' && 
        booking.status !== 'rejected'
      );
      
      let googleEvents = [];
      let newSyncToken = null;
      
      try {
        // Force full sync to pick up the expanded date range for this fix
        const shouldForceFullSync = true; // Temporarily force full sync to ensure we get the Test Gig event
        
        if (integration.syncToken && !shouldForceFullSync) {
          console.log('🔄 Performing incremental sync...');
          const incrementalSync = await googleCalendarService.performIncrementalSync(integration.syncToken, 'primary');
          googleEvents = incrementalSync.events || [];
          newSyncToken = incrementalSync.syncToken;
          console.log(`📅 Incremental sync found ${googleEvents.length} changed events`);
        } else {
          if (shouldForceFullSync) {
            console.log('🔄 Performing full sync (periodic refresh)...');
          } else {
            console.log('🔄 Performing initial full sync...');
          }
          const fullSync = await googleCalendarService.performFullSync('primary');
          googleEvents = fullSync.events || [];
          newSyncToken = fullSync.syncToken;
          console.log(`📅 Full sync found ${googleEvents.length} total events`);
          
          // Debug: Log some event summaries to see what we're getting
          console.log('🔍 Events found:');
          googleEvents.slice(0, 10).forEach(event => {
            const eventDate = event.start?.dateTime || event.start?.date;
            console.log(`  - "${event.summary}" on ${eventDate} (status: ${event.status})`);
          });
        }
      } catch (googleError) {
        console.error('Google Calendar API error:', googleError);
        
        // If incremental sync fails, fall back to full sync
        if (integration.syncToken && googleError.message?.includes('sync')) {
          console.log('⚠️ Incremental sync failed, falling back to full sync');
          try {
            const fullSync = await googleCalendarService.performFullSync('primary');
            googleEvents = fullSync.events || [];
            newSyncToken = fullSync.syncToken;
          } catch (fallbackError) {
            return res.status(500).json({ 
              error: 'Google Calendar API error', 
              details: 'Failed to fetch Google Calendar events. Your connection may have expired - please reconnect your Google Calendar.' 
            });
          }
        } else {
          return res.status(500).json({ 
            error: 'Google Calendar API error', 
            details: 'Failed to fetch Google Calendar events. Your connection may have expired - please reconnect your Google Calendar.' 
          });
        }
      }
      
      console.log(`🔄 Processing ${eligibleBookings.length} MusoBuddy bookings and ${googleEvents.length} Google events`);
      
      // Export MusoBuddy bookings to Google Calendar (incremental approach)
      if (direction === 'export' || direction === 'bidirectional') {
        let processed = 0;
        const batchSize = 50;
        
        // If this is an incremental sync, only process bookings modified since last sync
        let bookingsToProcess = eligibleBookings;
        if (integration.syncToken && integration.lastSyncAt) {
          const lastSync = new Date(integration.lastSyncAt);
          bookingsToProcess = eligibleBookings.filter(booking => {
            const bookingUpdated = new Date(booking.updatedAt || booking.createdAt);
            return bookingUpdated > lastSync;
          });
          console.log(`📋 Incremental export: processing ${bookingsToProcess.length} of ${eligibleBookings.length} recently modified bookings`);
        } else {
          console.log(`📋 Full export: processing all ${bookingsToProcess.length} bookings`);
        }
        
        for (const booking of bookingsToProcess) {
          try {
            // Look for existing Google event with this booking's ID
            const linkedEvent = googleEvents.find(event => 
              event.extendedProperties?.private?.musobuddyId === booking.id.toString()
            );
            
            if (linkedEvent && linkedEvent.status !== 'cancelled') {
              // Update existing linked event
              await googleCalendarService.updateEventFromBooking(
                linkedEvent.id, 
                booking, 
                'primary'
              );
              updated++;
              console.log(`🔄 Updated linked Google event for booking ${booking.id}`);
            } else {
              // Check for possible duplicates only in full sync mode
              let isDuplicate = false;
              if (!integration.syncToken) {
                const bookingDate = new Date(booking.eventDate);
                const bookingDateStr = bookingDate.toISOString().split('T')[0];
                
                const possibleDuplicate = googleEvents.find(event => {
                  if (event.status === 'cancelled') return false;
                  
                  const eventDate = new Date(event.start?.dateTime || event.start?.date);
                  const eventDateStr = eventDate.toISOString().split('T')[0];
                  
                  // Check if same date
                  if (bookingDateStr !== eventDateStr) return false;
                  
                  // Check if similar summary or location
                  const eventSummary = (event.summary || '').toLowerCase();
                  const eventLocation = (event.location || '').toLowerCase();
                  const bookingVenue = (booking.venue || '').toLowerCase();
                  const bookingClient = (booking.clientName || '').toLowerCase();
                  
                  return (eventSummary.includes(bookingClient) || eventSummary.includes(bookingVenue) ||
                         eventLocation.includes(bookingVenue));
                });
                
                if (possibleDuplicate) {
                  console.log(`⚠️ Skipping booking ${booking.id} - possible duplicate found in calendar`);
                  isDuplicate = true;
                }
              }
              
              if (!isDuplicate) {
                // Create new event with embedded MusoBuddy ID
                await googleCalendarService.createEventFromBooking(booking, 'primary');
                exported++;
                console.log(`➕ Created new Google event for booking ${booking.id}`);
              }
            }
            
            processed++;
            // Add small delay every batch to prevent overwhelming the API
            if (processed % batchSize === 0) {
              console.log(`⏸ Processed ${processed}/${bookingsToProcess.length} bookings, pausing briefly...`);
              await new Promise(resolve => setTimeout(resolve, 500)); // Reduced to 500ms
            }
          } catch (eventError) {
            console.error(`❌ Failed to sync booking ${booking.id}:`, eventError.message);
          }
        }
      }
      
      // Handle unlinked Google Calendar events (optional AI matching)
      if (direction === 'import' || direction === 'bidirectional') {
        const unlinkedEvents = googleEvents.filter(event => 
          !event.extendedProperties?.private?.musobuddyId &&
          event.status !== 'cancelled' &&
          event.start?.dateTime || event.start?.date // Has a valid date
        );
        
        unlinkedGoogleEvents = unlinkedEvents.length;
        
        if (linkUnknownEvents && unlinkedEvents.length > 0) {
          // Only import new events in incremental mode, or limit to recent events in full mode
          let eventsToImport = unlinkedEvents;
          if (integration.syncToken && integration.lastSyncAt) {
            // In incremental mode, only process events created/modified since last sync
            const lastSync = new Date(integration.lastSyncAt);
            eventsToImport = unlinkedEvents.filter(event => {
              const eventUpdated = new Date(event.updated);
              return eventUpdated > lastSync;
            });
            console.log(`📥 Incremental import: processing ${eventsToImport.length} of ${unlinkedEvents.length} recently changed events`);
          } else {
            // In full mode, limit to reasonable number to avoid overwhelming
            eventsToImport = unlinkedEvents.slice(0, 20);
            console.log(`📥 Full import: processing ${eventsToImport.length} of ${unlinkedEvents.length} unlinked events`);
          }
          
          for (const googleEvent of eventsToImport) {
            try {
              // Create new MusoBuddy booking from Google Calendar event
              const eventDate = new Date(googleEvent.start?.dateTime || googleEvent.start?.date);
              const endDate = googleEvent.end?.dateTime ? new Date(googleEvent.end?.dateTime) : null;
              
              // Extract time from datetime if available
              let eventTime = null;
              if (googleEvent.start?.dateTime) {
                const startDate = new Date(googleEvent.start.dateTime);
                eventTime = `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}`;
              }
              
              // Calculate duration in hours if end time is available
              let duration = null;
              if (endDate && googleEvent.start?.dateTime) {
                const durationMs = endDate.getTime() - eventDate.getTime();
                duration = Math.round(durationMs / (1000 * 60 * 60 * 100)) / 100; // Round to 2 decimal places
              }
              
              // Extract client name from event title
              let clientName = 'Unknown Client';
              if (googleEvent.summary) {
                // Try to extract client name from summary
                const patterns = [
                  /^([^-]+)\s*-\s*/, // "John Smith - Wedding"
                  /for\s+([^,\n]+)/i, // "Event for Jane Doe"
                  /with\s+([^,\n]+)/i, // "Meeting with John"
                ];
                
                for (const pattern of patterns) {
                  const match = googleEvent.summary.match(pattern);
                  if (match) {
                    clientName = match[1].trim();
                    break;
                  }
                }
                
                // If no pattern matches, use the full summary as client name
                if (clientName === 'Unknown Client') {
                  clientName = googleEvent.summary.trim();
                }
              }
              
              // Create the booking
              const newBooking = {
                clientName: clientName,
                clientEmail: '', // Not available from Google Calendar
                clientPhone: '', // Not available from Google Calendar
                eventDate: eventDate.toISOString().split('T')[0], // YYYY-MM-DD format
                eventTime: eventTime,
                duration: duration,
                venue: googleEvent.location || '',
                venueAddress: googleEvent.location || '',
                eventType: 'Imported from Google Calendar',
                fee: null, // Not available from Google Calendar
                deposit: null,
                notes: `Imported from Google Calendar\nOriginal event: ${googleEvent.summary || 'Untitled Event'}`,
                status: 'confirmed' as const,
                source: 'google_calendar',
                googleCalendarEventId: googleEvent.id
              };
              
              // Create the booking in storage
              const createdBooking = await storage.createBooking(userId, newBooking);
              
              // Update the Google Calendar event to link it with the new MusoBuddy booking
              try {
                const updatedEvent = {
                  ...googleEvent,
                  extendedProperties: {
                    ...googleEvent.extendedProperties,
                    private: {
                      ...googleEvent.extendedProperties?.private,
                      musobuddyId: createdBooking.id.toString(),
                      musobuddyType: 'booking'
                    }
                  }
                };
                
                await googleCalendarService.updateEvent(googleEvent.id, updatedEvent, 'primary');
              } catch (updateError) {
                console.log(`⚠️ Could not update Google event ${googleEvent.id} with MusoBuddy ID: ${updateError.message}`);
              }
              
              imported++;
              console.log(`📥 Imported Google event "${googleEvent.summary}" as MusoBuddy booking ${createdBooking.id}`);
              
            } catch (importError) {
              console.error(`❌ Failed to import Google event ${googleEvent.id}:`, importError.message);
            }
          }
        }
      }
      
      // Update last sync time and sync token
      await storage.updateGoogleCalendarIntegration(userId, {
        lastSyncAt: new Date(),
        syncToken: newSyncToken
      });
      
      let message = `Exported ${exported} new, updated ${updated} existing`;
      if (unlinkedGoogleEvents > 0) {
        message += `, found ${unlinkedGoogleEvents} unlinked Google events`;
        if (aiUsed > 0) {
          message += ` (linked ${aiUsed} using AI)`;
        }
      }
      
      console.log(`✅ Sync completed: ${message}`);
      
      res.json({
        success: true,
        exported,
        updated,
        imported,
        unlinkedGoogleEvents,
        aiLinksCreated: aiUsed,
        message,
        estimatedCost: aiUsed * 0.033
      });

    } catch (error: any) {
      console.error('Manual sync failed:', error);
      
      // More specific error handling
      let errorMessage = 'Sync failed';
      let errorDetails = error.message || 'Unknown error';
      
      if (error.message?.includes('refresh_token') || error.code === 'auth/invalid-credential') {
        errorMessage = 'Google Calendar authentication failed';
        errorDetails = 'Your Google Calendar connection has expired. Please reconnect your Google Calendar.';
      } else if (error.message?.includes('calendar')) {
        errorMessage = 'Google Calendar API error';
        errorDetails = 'Failed to communicate with Google Calendar. Please try again later.';
      }
      
      res.status(500).json({ 
        error: errorMessage, 
        details: errorDetails
      });
    }
  });

  // Disconnect Google Calendar
  app.delete('/api/google-calendar/disconnect', authenticateWithFirebase, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;

      await storage.deleteGoogleCalendarIntegration(userId);

      console.log('✅ Disconnected Google Calendar for user:', userId);
      res.json({ success: true });

    } catch (error) {
      console.error('❌ Failed to disconnect:', error);
      res.status(500).json({ error: 'Failed to disconnect Google Calendar' });
    }
  });

  console.log('✅ Google Calendar routes configured');
}

export default registerGoogleCalendarRoutes;