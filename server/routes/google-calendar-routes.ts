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

      res.json({ 
        success: true, 
        message: 'Google Calendar connected successfully' 
      });

    } catch (error) {
      console.error('❌ OAuth callback failed:', error);
      res.status(500).json({ error: 'Failed to connect Google Calendar' });
    }
  });

  // Get integration status
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

  // Manual sync trigger (simplified)
  app.post('/api/google-calendar/sync', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.userId;
      const { direction = 'bidirectional' } = req.body;

      const integration = await storage.getGoogleCalendarIntegration(userId);
      
      if (!integration) {
        return res.status(404).json({ error: 'Google Calendar not connected' });
      }

      console.log('🔄 Manual sync triggered for user:', userId, 'direction:', direction);
      
      // For MVP, just return success without actual syncing
      res.json({
        success: true,
        exported: 0,
        imported: 0,
        message: 'Sync functionality ready for implementation'
      });

    } catch (error) {
      console.error('❌ Manual sync failed:', error);
      res.status(500).json({ error: 'Sync failed' });
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