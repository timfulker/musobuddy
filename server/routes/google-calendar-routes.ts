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
    try {
      const userId = req.user?.id;
      const { direction = 'export', linkUnknownEvents = false } = req.body;
      let integration;
      try {
        integration = await storage.getGoogleCalendarIntegration(userId);
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
      try {
        const googleSync = await googleCalendarService.performFullSync('primary');
        googleEvents = googleSync.events || [];
      } catch (googleError) {
        console.error('Google Calendar API error:', googleError);
        return res.status(500).json({ 
          error: 'Google Calendar API error', 
          details: 'Failed to fetch Google Calendar events. Your connection may have expired - please reconnect your Google Calendar.' 
        });
      }
      
      console.log(`🔄 Processing ${eligibleBookings.length} MusoBuddy bookings and ${googleEvents.length} Google events`);
      
      // Export MusoBuddy bookings to Google Calendar (ID-first approach with duplicate prevention)
      if (direction === 'export' || direction === 'bidirectional') {
        let processed = 0;
        const batchSize = 50; // Process in batches to avoid timeout
        
        for (const booking of eligibleBookings) {
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
              // Check for potential duplicate by date/time/venue before creating
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
                
                // If summary contains client name or venue, it's likely the same event
                return (eventSummary.includes(bookingClient) || eventSummary.includes(bookingVenue) ||
                       eventLocation.includes(bookingVenue));
              });
              
              if (possibleDuplicate) {
                console.log(`⚠️ Skipping booking ${booking.id} - possible duplicate found in calendar`);
                console.log(`   Existing event: ${possibleDuplicate.summary} on ${possibleDuplicate.start?.dateTime}`);
              } else {
                // Create new event with embedded MusoBuddy ID
                await googleCalendarService.createEventFromBooking(booking, 'primary');
                exported++;
                console.log(`➕ Created new Google event for booking ${booking.id}`);
              }
            }
            
            processed++;
            // Add small delay every batch to prevent overwhelming the API
            if (processed % batchSize === 0) {
              console.log(`⏸ Processed ${processed}/${eligibleBookings.length} bookings, pausing briefly...`);
              await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second pause
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
          console.log(`🤖 Using AI to link ${unlinkedEvents.length} unlinked Google events`);
          const aiMatcher = new AIEventMatcher();
          
          for (const googleEvent of unlinkedEvents.slice(0, 10)) { // Limit to 10 for cost control
            try {
              // Find unlinked MusoBuddy bookings
              const unlinkedBookings = eligibleBookings.filter(booking => 
                !googleEvents.some(ge => ge.extendedProperties?.private?.musobuddyId === booking.id.toString())
              );
              
              if (unlinkedBookings.length > 0) {
                // Try to match this Google event to a MusoBuddy booking
                let bestMatch = null;
                let bestScore = 0;
                
                for (const booking of unlinkedBookings) {
                  const matchResult = await aiMatcher.compareEvents(booking, googleEvent, true);
                  if (matchResult.isMatch && matchResult.matchScore > bestScore && matchResult.matchScore > 0.8) {
                    bestMatch = booking;
                    bestScore = matchResult.matchScore;
                  }
                }
                
                if (bestMatch) {
                  // Link them by updating the Google event with MusoBuddy ID
                  await googleCalendarService.updateEventFromBooking(
                    googleEvent.id,
                    bestMatch,
                    'primary'
                  );
                  console.log(`🔗 Linked Google event ${googleEvent.id} to MusoBuddy booking ${bestMatch.id}`);
                  aiUsed++;
                }
              }
            } catch (aiError) {
              console.error(`❌ AI linking failed for event ${googleEvent.id}:`, aiError.message);
            }
          }
        }
      }
      
      // Update last sync time
      await storage.updateGoogleCalendarIntegration(userId, {
        lastSyncAt: new Date()
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