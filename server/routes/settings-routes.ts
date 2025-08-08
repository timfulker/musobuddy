import { type Express, type Request, type Response } from "express";
import { storage } from "../core/storage";
import { validateBody, sanitizeInput, schemas } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { generalApiRateLimit } from '../middleware/rateLimiting';
import { requireAuth } from '../middleware/auth';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    isVerified: boolean;
  };
}

export async function registerSettingsRoutes(app: Express) {
  console.log('⚙️ Setting up settings routes...');
  
  // Import Mailgun route manager for lead email setup
  const { mailgunRoutes } = await import('../core/mailgun-routes');

  // Get user's lead email address
  app.get('/api/email/my-address', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // If user has an email prefix, return the full email
      if (user.emailPrefix) {
        const fullEmail = `${user.emailPrefix}@enquiries.musobuddy.com`;
        res.json({ 
          email: fullEmail,
          needsSetup: false 
        });
      } else {
        res.json({ 
          email: null,
          needsSetup: true 
        });
      }
    } catch (error) {
      console.error('❌ Failed to get user email:', error);
      res.status(500).json({ error: 'Failed to get user email' });
    }
  });
  
  // Check if email prefix is available
  app.post('/api/email/check-availability', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const { prefix } = req.body;
      if (!prefix) {
        return res.status(400).json({ error: 'Prefix is required' });
      }
      
      // Validate the prefix format
      const validation = await mailgunRoutes.validateEmailPrefix(prefix);
      if (!validation.valid) {
        return res.json({ 
          available: false, 
          error: validation.error 
        });
      }
      
      // Check if prefix is already taken
      const existingUser = await storage.getUserByEmailPrefix(prefix);
      if (existingUser && existingUser.id !== userId) {
        return res.json({ 
          available: false, 
          error: 'This prefix is already taken',
          suggestion: `${prefix}-${Math.floor(Math.random() * 100)}`
        });
      }
      
      // Prefix is available
      const fullEmail = `${prefix}@enquiries.musobuddy.com`;
      res.json({ 
        available: true,
        fullEmail 
      });
      
    } catch (error) {
      console.error('❌ Failed to check email availability:', error);
      res.status(500).json({ error: 'Failed to check email availability' });
    }
  });
  
  // Get user settings
  app.get('/api/settings', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      const settings = await storage.getSettings(userId);
      
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
        
        const newSettings = await storage.createSettings(defaultSettings);
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
    requireAuth,
    generalApiRateLimit,
    sanitizeInput,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user?.userId;
        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }
        
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
    })
  );

  // Email templates endpoints
  app.get('/api/settings/email-templates', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      console.log(`📧 Fetching email templates for user ${userId}`);
      const templates = await storage.getEmailTemplates(userId);
      console.log(`📧 Found ${templates.length} email templates for user ${userId}`);
      res.json(templates);
      
    } catch (error) {
      console.error('❌ Failed to fetch email templates:', error);
      res.status(500).json({ error: 'Failed to fetch email templates' });
    }
  });

  app.post('/api/settings/email-templates', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const templateData = { ...req.body, userId };
      const template = await storage.createEmailTemplate(templateData);
      res.status(201).json(template);
      
    } catch (error) {
      console.error('❌ Failed to create email template:', error);
      res.status(500).json({ error: 'Failed to create email template' });
    }
  });

  app.put('/api/settings/email-templates/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      const templateId = parseInt(req.params.id);
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      if (isNaN(templateId)) {
        return res.status(400).json({ error: 'Invalid template ID' });
      }
      
      const template = await storage.updateEmailTemplate(templateId, req.body, userId);
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }
      
      res.json(template);
      
    } catch (error) {
      console.error('❌ Failed to update email template:', error);
      res.status(500).json({ error: 'Failed to update email template' });
    }
  });

  app.delete('/api/settings/email-templates/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      const templateId = parseInt(req.params.id);
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      if (isNaN(templateId)) {
        return res.status(400).json({ error: 'Invalid template ID' });
      }
      
      const template = await storage.deleteEmailTemplate(templateId, userId);
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }
      
      res.json({ message: 'Template deleted successfully' });
      
    } catch (error) {
      console.error('❌ Failed to delete email template:', error);
      res.status(500).json({ error: 'Failed to delete email template' });
    }
  });

  // Global gig types endpoint
  app.get('/api/gig-types', async (req: Request, res: Response) => {
    try {
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
      console.error('❌ Failed to fetch gig types:', error);
      res.status(500).json({ error: 'Failed to fetch gig types' });
    }
  });

  console.log('✅ Settings routes configured');
}