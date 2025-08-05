import { type Express } from "express";
import { storage } from "../core/storage";
import { validateBody, sanitizeInput, schemas } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { generalApiRateLimit } from '../middleware/rateLimiting';

// Enhanced authentication middleware
const isAuthenticated = async (req: any, res: any, next: any) => {
  const sessionUserId = req.session?.userId;
  if (!sessionUserId || (typeof sessionUserId === 'string' && sessionUserId.trim() === '')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const userId = typeof sessionUserId === 'string' ? parseInt(sessionUserId) : sessionUserId;
    const user = await storage.getUserById(userId);
    
    if (!user) {
      req.session.destroy((err: any) => {
        if (err) console.error('Session destroy error:', err);
      });
      return res.status(401).json({ error: 'User account no longer exists' });
    }

    req.user = user;
    next();
    
  } catch (error: any) {
    console.error('❌ Authentication validation error:', error);
    return res.status(500).json({ error: 'Authentication validation failed' });
  }
};

export function registerSettingsRoutes(app: Express) {
  console.log('⚙️ Setting up settings routes...');

  // Get user settings
  app.get('/api/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      const settings = await storage.getUserSettings(userId);
      
      if (!settings) {
        // Create default settings if none exist
        const defaultSettings = {
          userId,
          businessName: '',
          defaultTheme: 'purple',
          nextInvoiceNumber: 1,
          defaultInvoiceDueDays: 30,
          emailSignature: '',
          paymentInstructions: '',
          // Add other default settings as needed
        };
        
        const newSettings = await storage.createUserSettings(defaultSettings);
        return res.json(newSettings);
      }
      
      res.json(settings);
      
    } catch (error) {
      console.error('❌ Failed to fetch settings:', error);
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  });

  // Update user settings
  app.patch('/api/settings', 
    isAuthenticated,
    generalApiRateLimit,
    sanitizeInput,
    asyncHandler(async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      
      console.log(`⚙️ Updating settings for user ${userId}:`, req.body);
      
      const updatedSettings = await storage.updateSettings(userId, req.body);
      console.log(`✅ Updated settings for user ${userId}`);
      
      res.json(updatedSettings);
      
    } catch (error: any) {
      console.error('❌ Failed to update settings:', error);
      res.status(500).json({ 
        error: 'Failed to update settings',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }));

  // Add instrument to settings
  app.post('/api/settings/instrument', 
    isAuthenticated,
    generalApiRateLimit,
    sanitizeInput,
    asyncHandler(async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      const { instrument } = req.body;
      
      if (!instrument || typeof instrument !== 'string') {
        return res.status(400).json({ error: 'Instrument name is required' });
      }
      
      const settings = await storage.getUserSettings(userId);
      const currentInstruments = settings?.instruments || [];
      
      if (!currentInstruments.includes(instrument)) {
        const updatedInstruments = [...currentInstruments, instrument];
        const updatedSettings = await storage.updateSettings(userId, {
          instruments: updatedInstruments
        });
        
        console.log(`✅ Added instrument "${instrument}" for user ${userId}`);
        res.json(updatedSettings);
      } else {
        res.json(settings); // Instrument already exists
      }
      
    } catch (error: any) {
      console.error('❌ Failed to add instrument:', error);
      res.status(500).json({ 
        error: 'Failed to add instrument',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }));

  // Global gig types endpoint
  app.get('/api/global-gig-types', async (req: any, res) => {
    try {
      // Return predefined gig types
      const globalGigTypes = [
        'Wedding',
        'Corporate Event',
        'Private Party',
        'Concert',
        'Festival',
        'Bar/Restaurant',
        'Club Performance',
        'Session Work',
        'Teaching',
        'Recording',
        'Other'
      ];
      
      res.json(globalGigTypes);
      
    } catch (error) {
      console.error('❌ Failed to fetch global gig types:', error);
      res.status(500).json({ error: 'Failed to fetch gig types' });
    }
  });

  // User-specific gig types aggregated from bookings
  app.get('/api/user-gig-types', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      
      // Get all unique gig types from user's bookings
      const bookings = await storage.getBookings(userId);
      const userGigTypes = [...new Set(
        bookings
          .map(booking => booking.gigType)
          .filter(type => type && type.trim() !== '')
      )].sort();
      
      res.json(userGigTypes);
      
    } catch (error) {
      console.error('❌ Failed to fetch user gig types:', error);
      res.status(500).json({ error: 'Failed to fetch user gig types' });
    }
  });

  console.log('✅ Settings routes configured');
}