import { type Express } from "express";
import { storage } from "../core/storage";
import { requireAuth } from '../middleware/auth';
import GoogleCalendarService from '../services/google-calendar';

export function registerGoogleCalendarRoutes(app: Express) {
  console.log('📅 Setting up Google Calendar routes...');

  const googleCalendarService = new GoogleCalendarService();

  // Start Google OAuth flow
  app.get('/api/google-calendar/auth', requireAuth, async (req: any, res) => {
    try {
      const authUrl = googleCalendarService.getAuthUrl();
      res.json({ authUrl });
    } catch (error) {
      console.error('❌ Failed to generate auth URL:', error);
      res.status(500).json({ error: 'Failed to generate authentication URL' });
    }
  });

  // Handle OAuth callback and store tokens
  app.post('/api/google-calendar/callback', requireAuth, async (req: any, res) => {
    try {
      const { code } = req.body;
      const userId = req.user?.userId;

      if (!code || !userId) {
        return res.status(400).json({ error: 'Missing authorization code or user ID' });
      }

      // Exchange code for tokens
      const tokens = await googleCalendarService.getTokens(code);
      
      if (!tokens.refresh_token) {
        return res.status(400).json({ 
          error: 'No refresh token received. Please ensure you granted offline access.' 
        });
      }

      // Store integration in database
      await storage.saveGoogleCalendarIntegration(userId, {
        googleRefreshToken: tokens.refresh_token,
        googleCalendarId: 'primary',
        syncEnabled: true,
        autoSyncBookings: true,
        autoImportEvents: false,
        syncDirection: 'bidirectional'
      });

      console.log('✅ Google Calendar integration saved for user:', userId);

      // Perform initial sync
      await performInitialSync(userId, tokens.refresh_token);

      res.json({ 
        success: true, 
        message: 'Google Calendar connected successfully' 
      });

    } catch (error) {
      console.error('❌ OAuth callback failed:', error);
      res.status(500).json({ error: 'Failed to connect Google Calendar' });
    }
  });

  // Get Google Calendar integration status
  app.get('/api/google-calendar/status', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.userId;
      
      const integration = await storage.getGoogleCalendarIntegration(userId);
      
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
      res.status(500).json({ error: 'Failed to get integration status' });
    }
  });

  // Update Google Calendar sync settings
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

  // Manual sync trigger
  app.post('/api/google-calendar/sync', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.userId;
      const { direction = 'bidirectional' } = req.body; // 'export', 'import', 'bidirectional'

      const integration = await storage.getGoogleCalendarIntegration(userId);
      if (!integration) {
        return res.status(400).json({ error: 'Google Calendar not connected' });
      }

      // Initialize service with user's tokens
      await googleCalendarService.initializeForUser(integration.googleRefreshToken);

      let syncResult = { exported: 0, imported: 0, errors: [] };

      if (direction === 'export' || direction === 'bidirectional') {
        // Export MusoBuddy bookings to Google Calendar
        syncResult.exported = await exportBookingsToGoogle(userId, googleCalendarService);
      }

      if (direction === 'import' || direction === 'bidirectional') {
        // Import Google Calendar events to MusoBuddy
        syncResult.imported = await importEventsFromGoogle(userId, googleCalendarService, integration);
      }

      // Update last sync time
      await storage.updateGoogleCalendarIntegration(userId, {
        lastSyncAt: new Date()
      });

      res.json({
        success: true,
        ...syncResult
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
      await storage.deleteEventSyncMappings(userId);

      console.log('✅ Disconnected Google Calendar for user:', userId);

      res.json({ success: true });

    } catch (error) {
      console.error('❌ Failed to disconnect:', error);
      res.status(500).json({ error: 'Failed to disconnect Google Calendar' });
    }
  });

  // Webhook endpoint for Google Calendar changes
  app.post('/api/google-calendar/webhook', async (req, res) => {
    try {
      const headers = req.headers;
      const resourceState = headers['x-goog-resource-state'];
      const channelId = headers['x-goog-channel-id'];
      const channelToken = headers['x-goog-channel-token'];

      // Verify webhook token
      if (channelToken !== process.env.GOOGLE_WEBHOOK_TOKEN) {
        return res.status(401).send('Unauthorized');
      }

      console.log('📨 Google Calendar webhook received:', resourceState, channelId);

      if (resourceState === 'exists') {
        // Calendar changed, trigger sync for affected user
        await handleCalendarWebhook(channelId);
      }

      res.status(200).send('OK');

    } catch (error) {
      console.error('❌ Webhook processing failed:', error);
      res.status(500).send('Error processing webhook');
    }
  });

  console.log('✅ Google Calendar routes configured');
}

// Helper functions

async function performInitialSync(userId: string, refreshToken: string) {
  try {
    const googleCalendarService = new GoogleCalendarService();
    await googleCalendarService.initializeForUser(refreshToken);

    // Setup webhook for real-time updates
    const webhookUrl = `${process.env.BASE_URL}/api/google-calendar/webhook`;
    const webhookChannel = await googleCalendarService.setupWebhook('primary', webhookUrl);

    // Store webhook info
    await storage.updateGoogleCalendarIntegration(userId, {
      webhookChannelId: webhookChannel.id,
      webhookExpiration: new Date(parseInt(webhookChannel.expiration)),
    });

    console.log('✅ Initial sync and webhook setup complete');

  } catch (error) {
    console.error('❌ Initial sync failed:', error);
  }
}

async function exportBookingsToGoogle(userId: string, googleCalendarService: GoogleCalendarService): Promise<number> {
  const bookings = await storage.getBookings(userId);
  let exportedCount = 0;

  for (const booking of bookings) {
    if (!booking.eventDate) continue;

    try {
      // Check if already synced
      const existingMapping = await storage.getEventSyncMapping(userId, booking.id, 'booking');
      
      if (existingMapping) {
        // Update existing event
        await googleCalendarService.updateEventFromBooking(existingMapping.googleEventId, booking);
      } else {
        // Create new event
        const googleEvent = await googleCalendarService.createEventFromBooking(booking);
        
        // Store mapping
        await storage.saveEventSyncMapping(userId, {
          musobuddyId: booking.id,
          musobuddyType: 'booking',
          googleEventId: googleEvent.id,
          googleCalendarId: 'primary',
          syncDirection: 'musoBuddy_to_google'
        });
      }

      exportedCount++;
    } catch (error) {
      console.error(`❌ Failed to export booking ${booking.id}:`, error);
    }
  }

  return exportedCount;
}

async function importEventsFromGoogle(userId: string, googleCalendarService: GoogleCalendarService, integration: any): Promise<number> {
  let importedCount = 0;

  try {
    let syncResult;
    
    if (integration.syncToken) {
      // Incremental sync
      syncResult = await googleCalendarService.performIncrementalSync(integration.syncToken);
    } else {
      // Full sync
      syncResult = await googleCalendarService.performFullSync();
    }

    // Update sync token
    await storage.updateGoogleCalendarIntegration(userId, {
      syncToken: syncResult.syncToken
    });

    for (const googleEvent of syncResult.events) {
      if (googleEvent.status === 'cancelled') {
        // Handle deleted events
        await handleDeletedGoogleEvent(userId, googleEvent.id);
        continue;
      }

      // Skip events we created
      if (googleEvent.extendedProperties?.private?.musobuddyId) {
        continue;
      }

      try {
        // Check if already imported
        const existingMapping = await storage.getEventSyncMappingByGoogleId(userId, googleEvent.id);
        
        if (!existingMapping) {
          // Convert and create booking
          const bookingData = googleCalendarService.convertGoogleEventToBooking(googleEvent);
          const newBooking = await storage.createBooking(userId, bookingData);

          // Store mapping
          await storage.saveEventSyncMapping(userId, {
            musobuddyId: newBooking.id,
            musobuddyType: 'booking',
            googleEventId: googleEvent.id,
            googleCalendarId: 'primary',
            syncDirection: 'google_to_musoBuddy'
          });

          importedCount++;
        }
      } catch (error) {
        console.error(`❌ Failed to import event ${googleEvent.id}:`, error);
      }
    }

  } catch (error) {
    console.error('❌ Import from Google failed:', error);
  }

  return importedCount;
}

async function handleDeletedGoogleEvent(userId: string, googleEventId: string) {
  try {
    const mapping = await storage.getEventSyncMappingByGoogleId(userId, googleEventId);
    
    if (mapping && mapping.syncDirection !== 'musoBuddy_to_google') {
      // Delete corresponding MusoBuddy booking if it was imported from Google
      await storage.deleteBooking(mapping.musobuddyId);
      await storage.deleteEventSyncMapping(mapping.id);
      
      console.log('✅ Deleted imported booking due to Google Calendar deletion');
    }
  } catch (error) {
    console.error('❌ Failed to handle deleted Google event:', error);
  }
}

async function handleCalendarWebhook(channelId: string) {
  try {
    // Find user by webhook channel ID
    const integration = await storage.getGoogleCalendarIntegrationByChannelId(channelId);
    
    if (integration) {
      console.log('🔄 Triggering incremental sync for user:', integration.userId);
      
      // Trigger background sync (don't await to respond quickly to webhook)
      setImmediate(async () => {
        try {
          const googleCalendarService = new GoogleCalendarService();
          await googleCalendarService.initializeForUser(integration.googleRefreshToken);
          await importEventsFromGoogle(integration.userId, googleCalendarService, integration);
        } catch (error) {
          console.error('❌ Background sync failed:', error);
        }
      });
    }
  } catch (error) {
    console.error('❌ Webhook handling failed:', error);
  }
}

export default registerGoogleCalendarRoutes;