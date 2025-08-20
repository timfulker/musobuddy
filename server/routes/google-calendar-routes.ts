import type { Express } from "express";
import { GoogleCalendarService } from "../services/google-calendar";
import { AIEventMatcher } from "../services/ai-event-matcher";
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

  // Manual sync trigger (AI-powered with cost control)
  app.post('/api/google-calendar/sync', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.userId;
      const { direction = 'export', useAI = false } = req.body;

      const integration = await storage.getGoogleCalendarIntegration(userId);
      
      if (!integration) {
        return res.status(404).json({ error: 'Google Calendar not connected' });
      }

      console.log('🔄 Manual sync triggered for user:', userId, 'direction:', direction, 'AI:', useAI);
      
      const googleCalendarService = new GoogleCalendarService();
      await googleCalendarService.initializeForUser(integration.googleRefreshToken);
      const aiMatcher = new AIEventMatcher();
      
      let exported = 0;
      let updated = 0;
      let imported = 0;
      let matchingStats = { totalComparisons: 0, ruleBasedMatches: 0, aiComparisons: 0, estimatedCost: 0 };
      
      // Export MusoBuddy bookings to Google Calendar
      if (direction === 'export' || direction === 'bidirectional') {
        try {
          const bookings = await storage.getBookings(userId);
          const eligibleBookings = bookings.filter(booking => 
            booking.eventDate && 
            booking.status !== 'cancelled' && 
            booking.status !== 'rejected'
          );
          
          console.log(`🔄 Found ${eligibleBookings.length} eligible bookings to sync out of ${bookings.length} total`);
          
          // Get existing Google Calendar events
          const googleSync = await googleCalendarService.performFullSync('primary');
          const existingEvents = googleSync.events || [];
          
          // Use AI-powered matching to find existing events
          const matchingResult = await aiMatcher.findBestMatches(
            eligibleBookings, 
            existingEvents, 
            useAI
          );
          
          const matches = matchingResult.matches;
          matchingStats = matchingResult.stats;
          
          for (const booking of eligibleBookings) {
            try {
              const matchedGoogleEventId = matches.get(booking.id.toString());
              
              if (matchedGoogleEventId) {
                // Update existing event
                await googleCalendarService.updateEventFromBooking(
                  matchedGoogleEventId, 
                  booking, 
                  'primary'
                );
                updated++;
                console.log(`🔄 Updated Google Calendar event for booking ${booking.id}`);
              } else {
                // Create new event
                await googleCalendarService.createEventFromBooking(booking, 'primary');
                exported++;
                console.log(`➕ Created new Google Calendar event for booking ${booking.id}`);
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
      
      // Update last sync time
      await storage.updateGoogleCalendarIntegration(userId, {
        lastSyncAt: new Date()
      });
      
      const message = `Synced ${exported} new bookings, updated ${updated} existing events`;
      const aiMessage = useAI ? ` (used AI for ${matchingStats.aiComparisons} uncertain matches, cost: $${matchingStats.estimatedCost.toFixed(3)})` : '';
      
      console.log(`✅ Sync completed: ${message}${aiMessage}`);
      
      res.json({
        success: true,
        exported,
        updated,
        imported,
        message: message + aiMessage,
        stats: {
          ...matchingStats,
          eligibleBookings: exported + updated
        }
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