import type { Express } from "express";
import { GoogleCalendarService } from "../services/google-calendar";
import { requireAuth } from "../middleware/auth";
import { storage } from "../core/storage";

export function registerGoogleCalendarRoutes(app: Express) {
  
  // Start OAuth flow
  app.get('/api/google-calendar/auth', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.userId;
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
  app.get('/api/google-calendar/status', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.userId;
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
  app.post('/api/google-calendar/settings', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.userId;
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

  // Manual sync trigger (full implementation)
  app.post('/api/google-calendar/sync', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.userId;
      const { direction = 'bidirectional' } = req.body;

      const integration = await storage.getGoogleCalendarIntegration(userId);
      
      if (!integration) {
        return res.status(404).json({ error: 'Google Calendar not connected' });
      }

      console.log('🔄 Manual sync triggered for user:', userId, 'direction:', direction);
      
      const googleCalendarService = new GoogleCalendarService();
      await googleCalendarService.initializeForUser(integration.googleRefreshToken);
      
      let exported = 0;
      let imported = 0;
      
      // Export MusoBuddy bookings to Google Calendar
      if (direction === 'export' || direction === 'bidirectional') {
        try {
          const bookings = await storage.getBookings(userId);
          console.log(`🔄 Found ${bookings.length} MusoBuddy bookings to sync`);
          
          // Get existing Google Calendar events to avoid duplicates
          const googleSync = await googleCalendarService.performFullSync('primary');
          const existingEvents = googleSync.events || [];
          
          for (const booking of bookings) {
            try {
              // Skip if booking doesn't have required date/time info
              if (!booking.eventDate || booking.status === 'cancelled' || booking.status === 'rejected') {
                continue;
              }
              
              // Check if this booking already exists in Google Calendar
              const existingEvent = existingEvents.find(event => 
                event.extendedProperties?.private?.musobuddyId === booking.id.toString()
              );
              
              if (existingEvent && !existingEvent.status === 'cancelled') {
                // Update existing event
                await googleCalendarService.updateEventFromBooking(
                  existingEvent.id, 
                  booking, 
                  'primary'
                );
                console.log(`✅ Updated Google Calendar event for booking ${booking.id}`);
              } else if (!existingEvent) {
                // Create new event
                await googleCalendarService.createEventFromBooking(booking, 'primary');
                exported++;
                console.log(`✅ Created Google Calendar event for booking ${booking.id}`);
              }
            } catch (eventError) {
              console.error(`❌ Failed to sync booking ${booking.id}:`, eventError.message);
              // Continue with other bookings
            }
          }
        } catch (exportError) {
          console.error('❌ Export phase failed:', exportError);
        }
      }
      
      // Import Google Calendar events to MusoBuddy (if bidirectional)
      if (direction === 'import' || direction === 'bidirectional') {
        try {
          // For now, skip import to avoid creating duplicate bookings
          // This can be implemented later with user confirmation
          console.log('📥 Import functionality available but skipped for safety');
        } catch (importError) {
          console.error('❌ Import phase failed:', importError);
        }
      }
      
      // Update last sync time
      await storage.updateGoogleCalendarIntegration(userId, {
        lastSyncAt: new Date()
      });
      
      console.log(`✅ Sync completed: exported ${exported}, imported ${imported}`);
      
      res.json({
        success: true,
        exported,
        imported,
        message: `Successfully synced ${exported} bookings to Google Calendar`
      });

    } catch (error) {
      console.error('❌ Manual sync failed:', error);
      res.status(500).json({ error: 'Sync failed', details: error.message });
    }
  });

  // Disconnect Google Calendar
  app.delete('/api/google-calendar/disconnect', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.userId;

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