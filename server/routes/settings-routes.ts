import { type Express } from "express";
import { storage } from "../core/storage";
import { services } from "../core/services";
import { validateBody, sanitizeInput, schemas } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { generalApiRateLimit } from '../middleware/rateLimiting';
import { requireAuth } from '../middleware/auth';
import { db } from '../core/database';
import { clientCommunications } from '@shared/schema';
import { getGigTypeNamesForInstrument } from '@shared/instrument-gig-presets';

export async function registerSettingsRoutes(app: Express) {
  console.log('⚙️ Setting up settings routes...');
  
  // Import Mailgun route manager for lead email setup
  const { mailgunRoutes } = await import('../core/mailgun-routes');

  // Lead Email Setup Endpoints
  
  // Get user's lead email address
  app.get('/api/email/my-address', requireAuth, async (req: any, res) => {
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
  app.post('/api/email/check-availability', requireAuth, async (req: any, res) => {
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
  
  // Assign email prefix to user
  app.post('/api/email/assign-prefix', requireAuth, async (req: any, res) => {
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
        return res.status(400).json({ error: validation.error });
      }
      
      // Check if user already has a prefix
      const user = await storage.getUserById(userId);
      if (user?.emailPrefix) {
        return res.status(400).json({ 
          error: 'You already have a lead email address. Contact support to change it.' 
        });
      }
      
      // Check if prefix is already taken
      const existingUser = await storage.getUserByEmailPrefix(prefix);
      if (existingUser) {
        return res.status(400).json({ 
          error: 'This prefix is no longer available' 
        });
      }
      
      // Create Mailgun route for this email
      const routeResult = await mailgunRoutes.createUserEmailRoute(prefix, userId);
      if (!routeResult.success) {
        console.error('❌ Failed to create Mailgun route:', routeResult.error);
        return res.status(500).json({ 
          error: 'Failed to set up email forwarding. Please try again.' 
        });
      }
      
      // Update user with email prefix
      await storage.updateUser(userId, { emailPrefix: prefix });
      
      const fullEmail = `${prefix}@enquiries.musobuddy.com`;
      console.log(`✅ Enquiry email ${fullEmail} assigned to user ${userId}`);
      
      res.json({ 
        success: true,
        email: fullEmail 
      });
      
    } catch (error) {
      console.error('❌ Failed to assign email prefix:', error);
      res.status(500).json({ error: 'Failed to assign email prefix' });
    }
  });
  
  // Get user settings
  app.get('/api/settings', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Get both settings and user info (for email prefix)
      const [settings, user] = await Promise.all([
        storage.getSettings(userId),
        storage.getUserById(userId)
      ]);
      
      
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
        
        // Transform default settings to camelCase for frontend
        const transformedDefaults = {
          businessName: "",
          businessEmail: "",
          businessAddress: "",
          addressLine1: "",
          addressLine2: "",
          city: "",
          county: "",
          postcode: "",
          phone: "",
          website: "",
          taxNumber: "",
          emailFromName: "",
          nextInvoiceNumber: 1,
          defaultTerms: "",
          bankDetails: "",
          aiPricingEnabled: true,
          baseHourlyRate: 130,
          minimumBookingHours: 2,
          additionalHourRate: 60,
          djServiceRate: 300,
          pricingNotes: "",
          specialOffers: "",
          primaryInstrument: "",
          secondaryInstruments: [],
          customGigTypes: [],
          themeTemplate: "classic",
          themeTone: "formal",
          themeFont: "roboto",
          themeAccentColor: "#673ab7",
          themeLogoUrl: "",
          themeSignatureUrl: "",
          themeBanner: "",
          themeShowSetlist: false,
          themeShowRiderNotes: false,
          themeShowQrCode: false,
          themeShowTerms: true,
          themeCustomTitle: "",
          bookingDisplayLimit: "50",
          emailPrefix: user?.emailPrefix || null
        };
        
        return res.json(transformedDefaults);
      }
      
      // Include email prefix in response - Drizzle ORM already provides camelCase
      const responseSettings = {
        ...settings,
        emailPrefix: user?.emailPrefix || null
      };
      
      // Parse JSON strings that may be corrupted from earlier storage
      if (responseSettings.customGigTypes) {
        try {
          if (typeof responseSettings.customGigTypes === 'string') {
            // Try to parse as JSON, but handle corrupted format
            let gigTypesString = responseSettings.customGigTypes;
            // Fix corrupted JSON format: {"item1","item2"} -> ["item1","item2"]
            if (gigTypesString.startsWith('{') && gigTypesString.includes('","')) {
              gigTypesString = '[' + gigTypesString.slice(1, -1) + ']';
            }
            responseSettings.customGigTypes = JSON.parse(gigTypesString);
          }
        } catch (error) {
          console.error('❌ Failed to parse customGigTypes, defaulting to empty array:', error);
          responseSettings.customGigTypes = [];
        }
      }
      
      if (responseSettings.secondaryInstruments) {
        try {
          if (typeof responseSettings.secondaryInstruments === 'string') {
            // Try to parse as JSON, but handle corrupted format
            let instrumentsString = responseSettings.secondaryInstruments;
            // Fix corrupted JSON format: {"item1","item2"} -> ["item1","item2"]
            if (instrumentsString.startsWith('{') && instrumentsString.includes('","')) {
              instrumentsString = '[' + instrumentsString.slice(1, -1) + ']';
            }
            responseSettings.secondaryInstruments = JSON.parse(instrumentsString);
          }
        } catch (error) {
          console.error('❌ Failed to parse secondaryInstruments, defaulting to empty array:', error);
          responseSettings.secondaryInstruments = [];
        }
      }
      
      if (responseSettings.customClauses) {
        try {
          if (typeof responseSettings.customClauses === 'string') {
            // Try to parse as JSON, but handle corrupted format
            let clausesString = responseSettings.customClauses;
            // Fix corrupted JSON format: {"item1","item2"} -> ["item1","item2"]
            if (clausesString.startsWith('{') && clausesString.includes('","')) {
              clausesString = '[' + clausesString.slice(1, -1) + ']';
            }
            responseSettings.customClauses = JSON.parse(clausesString);
          }
        } catch (error) {
          console.error('❌ Failed to parse customClauses, defaulting to empty array:', error);
          responseSettings.customClauses = [];
        }
      }
      
      res.json(responseSettings);
      
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
    asyncHandler(async (req: any, res: any) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      console.log(`⚙️ Updating settings for user ${userId}:`, req.body);
      
      // Process the request body to combine instrument-based gig types
      const processedBody = { ...req.body };
      
      // If instruments are being updated, automatically generate combined gig types
      if (processedBody.primaryInstrument || processedBody.secondaryInstruments) {
        const allInstruments = [
          processedBody.primaryInstrument, 
          ...(Array.isArray(processedBody.secondaryInstruments) ? processedBody.secondaryInstruments : [])
        ].filter(Boolean);
        
        // Get gig types for all instruments
        const instrumentGigTypes = allInstruments.reduce((acc, instrument) => {
          const gigTypes = getGigTypeNamesForInstrument(instrument);
          return [...acc, ...gigTypes];
        }, [] as string[]);
        
        // Get existing custom gig types (manually added ones)
        const existingCustomTypes = Array.isArray(processedBody.customGigTypes) ? processedBody.customGigTypes : [];
        
        // Combine instrument-based and custom gig types, remove duplicates
        const combinedGigTypes = [...new Set([...instrumentGigTypes, ...existingCustomTypes])];
        
        // Update the processed body with combined gig types
        processedBody.customGigTypes = combinedGigTypes;
        
        console.log(`🎵 Combined ${allInstruments.length} instruments into ${combinedGigTypes.length} gig types for user ${userId}`);
        console.log(`🎵 Instruments:`, allInstruments);
        console.log(`🎵 Combined gig types:`, combinedGigTypes.slice(0, 10), combinedGigTypes.length > 10 ? `...and ${combinedGigTypes.length - 10} more` : '');
      }
      
      const updatedSettings = await storage.updateSettings(userId, processedBody);
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
    requireAuth,
    generalApiRateLimit,
    sanitizeInput,
    asyncHandler(async (req: any, res: any) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      const { instrument } = req.body;
      
      if (!instrument || typeof instrument !== 'string') {
        return res.status(400).json({ error: 'Instrument name is required' });
      }
      
      const settings = await storage.getSettings(userId);
      const currentInstruments = (settings as any)?.instruments || [];
      
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
  // Legacy endpoint for backward compatibility
  app.get('/api/gig-types', async (req: any, res) => {
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
  app.get('/api/user-gig-types', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Get all unique gig types from user's bookings
      const bookings = await storage.getBookings(userId);
      const userGigTypes = Array.from(new Set(
        bookings
          .map(booking => booking.gigType)
          .filter((type): type is string => typeof type === 'string' && type.trim() !== '')
      )).sort();
      
      res.json(userGigTypes);
      
    } catch (error) {
      console.error('❌ Failed to fetch user gig types:', error);
      res.status(500).json({ error: 'Failed to fetch user gig types' });
    }
  });

  // Generate widget token
  app.post('/api/generate-widget-token', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      console.log(`🎲 Generating widget token for user ${userId}`);
      
      // First check R2 environment variables
      const requiredEnvVars = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME'];
      const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
      
      if (missingVars.length > 0) {
        const error = `Missing R2 environment variables: ${missingVars.join(', ')}`;
        console.error('❌', error);
        return res.status(500).json({ error });
      }
      
      // Generate and store token in user record using the existing quickAddToken field
      const token = await storage.generateQuickAddToken(userId);
      
      if (!token) {
        console.error('❌ Failed to generate token for user', userId);
        return res.status(500).json({ error: 'Failed to generate widget token' });
      }
      
      // Generate R2-hosted widget (always accessible)
      console.log(`🔧 Starting R2 upload for user ${userId} with token ${token}`);
      const { uploadWidgetToR2 } = await import('../widget-system/widget-storage');
      
      console.log(`🔧 Calling uploadWidgetToR2...`);
      const uploadResult = await uploadWidgetToR2(userId.toString(), token);
      console.log(`🔧 Upload result:`, uploadResult);
      
      if (!uploadResult.success) {
        console.error('❌ Failed to upload widget to R2:', uploadResult.error);
        return res.status(500).json({ error: `Failed to generate QR code - ${uploadResult.error || 'please try again'}` });
      }
      
      const widgetUrl = uploadResult.url!;
      
      // Store permanent widget URL and QR code (both now R2 URLs)
      await storage.updateUserWidgetInfo(userId, uploadResult.url!, uploadResult.qrCodeUrl!);
      
      console.log(`✅ Widget token and QR code generated for user ${userId}: ${uploadResult.url}`);
      res.json({ 
        url: uploadResult.url, 
        token, 
        qrCode: uploadResult.qrCodeUrl 
      });
      
    } catch (error) {
      console.error('❌ Failed to generate widget token:', error);
      res.status(500).json({ error: 'Failed to generate widget token' });
    }
  });

  // Get existing widget token
  app.get('/api/get-widget-token', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const user = await storage.getUserById(userId);
      const widgetToken = user?.quickAddToken;
      
      if (widgetToken) {
        // Generate R2-hosted widget (always accessible)
        const { uploadWidgetToR2 } = await import('../widget-system/widget-storage');
        const uploadResult = await uploadWidgetToR2(userId.toString(), widgetToken);
        
        if (uploadResult.success) {
          res.json({ 
            url: uploadResult.url, 
            token: widgetToken, 
            qrCode: uploadResult.qrCodeUrl 
          });
        } else {
          res.json({ url: null, token: null, qrCode: null });
        }
      } else {
        res.json({ url: null, token: null });
      }
    } catch (error) {
      console.error('❌ Failed to get widget token:', error);
      res.status(500).json({ error: 'Failed to get widget token' });
    }
  });

  // Get widget info (permanent widget URL and QR code)
  app.get('/api/get-widget-info', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Return existing widget URL and QR code if available
      if (user.widgetUrl && user.widgetQrCode) {
        res.json({ 
          url: user.widgetUrl, 
          qrCode: user.widgetQrCode 
        });
      } else {
        // No widget exists yet
        res.json({ url: null, qrCode: null });
      }
    } catch (error) {
      console.error('❌ Failed to get widget info:', error);
      res.status(500).json({ error: 'Failed to get widget info' });
    }
  });

  // Templates endpoint - fetch user's email templates
  app.get('/api/templates', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const templates = await storage.getEmailTemplates(userId);
      res.json(templates);
    } catch (error) {
      console.error('❌ Failed to fetch templates:', error);
      res.status(500).json({ error: 'Failed to fetch templates' });
    }
  });

  // Create new email template
  app.post('/api/templates', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { name, category, subject, emailBody, smsBody, isAutoRespond } = req.body;
      
      if (!name || !subject || !emailBody) {
        return res.status(400).json({ error: 'Name, subject, and email body are required' });
      }

      const template = await storage.createEmailTemplate({
        userId,
        name,
        category: category || 'general',
        subject,
        emailBody,
        smsBody: smsBody || '',
        isAutoRespond: Boolean(isAutoRespond)
      });

      res.status(201).json(template);
    } catch (error) {
      console.error('❌ Failed to create template:', error);
      res.status(500).json({ error: 'Failed to create template' });
    }
  });

  // Update email template
  app.patch('/api/templates/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.userId;
      const templateId = parseInt(req.params.id);
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (isNaN(templateId)) {
        return res.status(400).json({ error: 'Invalid template ID' });
      }

      const { name, subject, emailBody, smsBody, isAutoRespond } = req.body;
      
      const template = await storage.updateEmailTemplate(templateId, {
        name,
        subject,
        emailBody,
        smsBody,
        isAutoRespond: Boolean(isAutoRespond)
      }, userId);

      if (!template) {
        return res.status(404).json({ error: 'Template not found or access denied' });
      }

      res.json(template);
    } catch (error) {
      console.error('❌ Failed to update template:', error);
      res.status(500).json({ error: 'Failed to update template' });
    }
  });

  // Delete email template
  app.delete('/api/templates/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.userId;
      const templateId = parseInt(req.params.id);
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (isNaN(templateId)) {
        return res.status(400).json({ error: 'Invalid template ID' });
      }

      const success = await storage.deleteEmailTemplate(templateId, userId);
      
      if (!success) {
        return res.status(404).json({ error: 'Template not found or access denied' });
      }

      res.json({ success: true, message: 'Template deleted successfully' });
    } catch (error) {
      console.error('❌ Failed to delete template:', error);
      res.status(500).json({ error: 'Failed to delete template' });
    }
  });

  // Set template as default
  app.post('/api/templates/:id/set-default', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.userId;
      const templateId = parseInt(req.params.id);
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (isNaN(templateId)) {
        return res.status(400).json({ error: 'Invalid template ID' });
      }

      const success = await storage.setDefaultEmailTemplate(templateId, userId);
      
      if (!success) {
        return res.status(404).json({ error: 'Template not found or access denied' });
      }

      res.json({ success: true, message: 'Template set as default successfully' });
    } catch (error) {
      console.error('❌ Failed to set default template:', error);
      res.status(500).json({ error: 'Failed to set default template' });
    }
  });

  // Seed default templates for existing users
  app.post('/api/templates/seed-defaults', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Check if user already has templates
      const existingTemplates = await storage.getEmailTemplates(userId);
      
      if (existingTemplates && existingTemplates.length > 0) {
        return res.json({ 
          success: false, 
          message: `You already have ${existingTemplates.length} templates`,
          templates: existingTemplates 
        });
      }

      // Seed the default templates
      await storage.seedDefaultEmailTemplates(userId);
      
      // Get the newly created templates
      const templates = await storage.getEmailTemplates(userId);
      
      res.json({ 
        success: true, 
        message: `Created ${templates.length} default templates`,
        templates 
      });
    } catch (error) {
      console.error('❌ Failed to seed default templates:', error);
      res.status(500).json({ error: 'Failed to seed default templates' });
    }
  });

  // Send email using template
  app.post('/api/templates/send-email', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { template, bookingId, messageId, clientEmail, clientName, testCc } = req.body;
      
      
      if (!template || !template.subject || !template.emailBody) {
        return res.status(400).json({ error: 'Invalid template data' });
      }

      // Get booking if bookingId provided
      let booking: any = null;
      let recipientEmail: string | null = null;
      let recipientName: string | null = null;
      
      if (bookingId) {
        // Ensure bookingId is a number (it might come as a string from the request)
        const bookingIdNum = typeof bookingId === 'string' ? parseInt(bookingId, 10) : bookingId;
        
        if (isNaN(bookingIdNum)) {
          console.log('❌ Invalid booking ID provided:', bookingId);
          return res.status(400).json({ error: 'Invalid booking ID' });
        }
        
        const retrievedBooking = await storage.getBooking(bookingIdNum);
        
        
        if (retrievedBooking && retrievedBooking.userId === userId) {
          booking = retrievedBooking; // Only set booking if user has access
          recipientEmail = booking.clientEmail;
          recipientName = booking.clientName;
        } else {
        }
      } else if (messageId && clientEmail) {
        // Handle message reply - use provided client info
        recipientEmail = clientEmail;
        recipientName = clientName || clientEmail;
      }

      if (!recipientEmail) {
        return res.status(400).json({ error: 'No recipient email found' });
      }

      // Get user settings for sender info and theme
      const userSettings = await storage.getSettings(userId);
      const user = await storage.getUserById(userId);
      
      const senderName = userSettings?.businessName || 
                        `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 
                        user?.email;
      const senderEmail = userSettings?.businessEmail || user?.email;
      
      // Get theme color from settings (same logic as invoices/contracts)
      const themeColor = userSettings?.themeAccentColor || userSettings?.theme_accent_color || '#667eea';
      
      // Calculate contrast for header text
      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
      };

      const getLuminance = (r: number, g: number, b: number) => {
        const rsRGB = r / 255;
        const gsRGB = g / 255;
        const bsRGB = b / 255;
        
        const rLinear = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
        const gLinear = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
        const bLinear = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);
        
        return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
      };

      const rgb = hexToRgb(themeColor);
      const luminance = getLuminance(rgb.r, rgb.g, rgb.b);
      const textColor = luminance > 0.5 ? '#000000' : '#ffffff';

      // Create reply-to address with user ID and booking ID for email routing
      const replyToAddress = bookingId 
        ? `User${userId}-Booking${bookingId} <user${userId}-booking${bookingId}@mg.musobuddy.com>`
        : `User${userId} <user${userId}@mg.musobuddy.com>`;

      // Function to replace template variables with actual booking data
      const replaceTemplateVariables = (text: string, bookingData: any = null, userSettings: any = null, userName: string = '') => {
        if (!text) return '';
        
        
        let replacedText = text;
        
        // Complete mapping of all possible template variables
        const variableMap: { [key: string]: string } = {};
        
        // Booking data variables
        if (bookingData) {
          variableMap['Venue'] = bookingData.venue || bookingData.venueName || '';
          variableMap['Venue Name'] = bookingData.venue || bookingData.venueName || '';
          variableMap['Client Name'] = bookingData.clientName || '';
          variableMap['Client'] = bookingData.clientName || '';
          variableMap['Client Email'] = bookingData.clientEmail || '';
          variableMap['Client Phone'] = bookingData.clientPhone || '';
          variableMap['Venue Address'] = bookingData.venueAddress || '';
          variableMap['Event Type'] = bookingData.eventType || '';
          variableMap['Performance Type'] = bookingData.performanceType || '';
          variableMap['Styles'] = bookingData.styles || '';
          variableMap['Equipment'] = bookingData.equipment || '';
          variableMap['Special Requirements'] = bookingData.specialRequirements || '';
          variableMap['Notes'] = bookingData.notes || '';
          variableMap['Fee'] = bookingData.fee ? `£${bookingData.fee}` : '';
          variableMap['Deposit'] = bookingData.deposit ? `£${bookingData.deposit}` : '';
          variableMap['Duration'] = bookingData.duration || '';
          variableMap['Guest Count'] = bookingData.guestCount || '';
          variableMap['Setup Time'] = bookingData.setupTime || '';
          variableMap['Sound Check'] = bookingData.soundCheck || '';
          variableMap['Performance Time'] = bookingData.performanceTime || '';
          variableMap['Actual Performance Time'] = bookingData.actualPerformanceTime || '';
          variableMap['Finish Time'] = bookingData.finishTime || '';
          variableMap['Travel Distance'] = bookingData.travelDistance || '';
          variableMap['Mileage'] = bookingData.mileage || '';
          
          // Date and time formatting
          if (bookingData.eventDate) {
            const eventDate = new Date(bookingData.eventDate);
            variableMap['Event Date'] = eventDate.toLocaleDateString('en-GB');
            variableMap['Date'] = eventDate.toLocaleDateString('en-GB');
            variableMap['Event Day'] = eventDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
          }
          if (bookingData.eventTime) {
            variableMap['Event Time'] = bookingData.eventTime;
            variableMap['Time'] = bookingData.eventTime;
            variableMap['Start Time'] = bookingData.eventTime;
          }
          if (bookingData.endTime) {
            variableMap['End Time'] = bookingData.endTime;
          }
        }
        
        // User and business variables
        if (userSettings) {
          variableMap['Your Name'] = userName || '';
          variableMap['Artist Name'] = userName || '';
          variableMap['Business Name'] = userSettings.businessName || '';
          variableMap['Your Business Name'] = userSettings.businessName || '';
          variableMap['Contact Details'] = userSettings.businessEmail || '';
          variableMap['Your Email'] = userSettings.businessEmail || '';
          variableMap['Your Phone'] = userSettings.businessPhone || '';
        }
        
        // Replace all variables found in the text
        let replacementCount = 0;
        Object.entries(variableMap).forEach(([variable, value]) => {
          if (value) {
            const regex = new RegExp(`\\[${variable}\\]`, 'gi');
            const before = replacedText;
            replacedText = replacedText.replace(regex, value);
            if (before !== replacedText) {
              replacementCount++;
            }
          }
        });
        
        return replacedText;
      };

      // Function to convert text to properly formatted HTML paragraphs  
      const formatEmailContent = (text: string) => {
        return text
          .split(/\n\s*\n/) // Split on double line breaks for paragraphs
          .map(paragraph => paragraph.trim())
          .filter(paragraph => paragraph.length > 0)
          .map(paragraph => {
            // Convert single line breaks within paragraphs to <br> tags to preserve formatting
            const cleanParagraph = paragraph.replace(/\n/g, '<br>').trim();
            return `<p style="margin: 0 0 16px 0; line-height: 1.6;">${cleanParagraph}</p>`;
          })
          .join('');
      };

      // Replace template variables with actual booking data
      const userName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'MusoBuddy User';
      
      // Check if template has any placeholders that need replacement
      const hasPlaceholders = (text: string) => {
        return /\[[\w\s]+\]/g.test(text);
      };
      
      // Only attempt replacement if there are placeholders
      // The frontend may have already replaced them
      let processedSubject = template.subject;
      let processedEmailBody = template.emailBody;
      
      if (hasPlaceholders(template.subject) || hasPlaceholders(template.emailBody)) {
        processedSubject = replaceTemplateVariables(template.subject, booking, userSettings, userName);
        processedEmailBody = replaceTemplateVariables(template.emailBody, booking, userSettings, userName);
      } else {
      }
      
      // Validate that no template variables remain unreplaced
      const findUnreplacedVariables = (text: string) => {
        const matches = text.match(/\[[\w\s]+\]/g);
        return matches || [];
      };
      
      const unreplacedInSubject = findUnreplacedVariables(processedSubject);
      const unreplacedInBody = findUnreplacedVariables(processedEmailBody);
      const allUnreplaced = [...new Set([...unreplacedInSubject, ...unreplacedInBody])];
      
      if (allUnreplaced.length > 0) {
        console.log('❌ Template contains unreplaced variables:', allUnreplaced);
        const fieldNames = allUnreplaced.map(v => v.replace(/[\[\]]/g, '')).join(', ');
        return res.status(400).json({ 
          error: 'Missing Information',
          message: `Please complete these fields in the booking form before sending: ${fieldNames}`
        });
      }

      // Create professional HTML email content with enhanced styling
      const professionalEmailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="x-apple-disable-message-reformatting">
    <title>${processedSubject}</title>
    <!--[if mso]><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
</head>
<body style="margin: 0; padding: 20px; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); line-height: 1.6;">
    <div style="max-width: 650px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.12); border: 1px solid rgba(0,0,0,0.08);">
        
        <!-- Header with music note accent -->
        <div style="background: linear-gradient(135deg, ${themeColor} 0%, ${themeColor}dd 100%); color: ${textColor}; padding: 32px 28px; text-align: center; position: relative;">
            <div style="position: absolute; top: 16px; right: 24px; font-size: 20px; opacity: 0.7;">♪</div>
            <div style="background: rgba(255,255,255,0.15); color: ${textColor}; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 500; display: inline-block; margin-bottom: 12px; letter-spacing: 0.5px;">MusoBuddy</div>
            <h1 style="margin: 0; font-size: 26px; font-weight: 400; line-height: 1.3; font-family: Georgia, 'Times New Roman', serif;">${processedSubject}</h1>
        </div>
        
        <!-- Main content -->
        <div style="padding: 40px 36px;">
            <div style="font-size: 16px; color: #2c3e50; line-height: 1.7;">
                ${formatEmailContent(processedEmailBody)}
            </div>
            
            <!-- Professional signature card -->
            <div style="margin-top: 40px; padding: 28px; background: linear-gradient(135deg, #fafbfc 0%, #f1f3f4 100%); border-radius: 12px; text-align: center; border: 1px solid #e8eaed;">
                <div style="width: 60px; height: 3px; background: ${themeColor}; margin: 0 auto 20px auto; border-radius: 2px;"></div>
                <div style="font-size: 20px; font-weight: 500; color: #1a1a1a; margin-bottom: 8px; font-family: Georgia, serif;">${senderName || 'MusoBuddy'}</div>
                <div style="color: #5f6368; font-size: 14px; margin-bottom: 16px; font-style: italic;">Professional Music Services</div>
                <div style="color: ${themeColor}; font-weight: 500; font-size: 15px; text-decoration: none;">${senderEmail}</div>
            </div>
        </div>
        
        <!-- Clean footer -->
        <div style="background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%); color: #95a5a6; padding: 20px; text-align: center;">
            <div style="font-size: 12px; opacity: 0.8;">Sent with ♪ via <span style="color: ${themeColor}; font-weight: 500;">MusoBuddy</span></div>
        </div>
    </div>
</body>
</html>`;

      // Create a clean text version for email clients that prefer text
      const textVersion = `
${processedSubject}

Dear ${recipientName || 'Client'},

${processedEmailBody}

Best regards,
${senderName || 'MusoBuddy'}
Professional Music Services
${senderEmail}

---
This email was sent via MusoBuddy Professional Music Management Platform
      `.trim();

      // Send HTML-only email with explicit headers to force HTML rendering
      const emailData: any = {
        to: recipientEmail,
        subject: processedSubject,
        html: professionalEmailHtml,
        replyTo: replyToAddress,
        headers: {
          'Content-Type': 'text/html; charset=UTF-8',
          'X-Content-Type-Options': 'nosniff'
        }
      };

      // Add BCC for testing purposes (temporary feature)
      if (testCc && typeof testCc === 'string' && testCc.includes('@')) {
        emailData.bcc = testCc;
        console.log(`📧 Test BCC added to booking response email: ${testCc}`);
      }

      const emailSent = await services.sendEmail(emailData);

      if (!emailSent) {
        throw new Error('Failed to send email');
      }

      // If this is a thank you template and we have a booking, mark it as completed
      const isThankYouTemplate = template.subject?.toLowerCase().includes('thank you') || 
                                template.emailBody?.toLowerCase().includes('thank you for');
      
      if (isThankYouTemplate && booking) {
        await storage.updateBooking(bookingId, { status: 'Completed' }, userId);
        console.log(`✅ Booking ${bookingId} marked as completed after thank you email`);
      }

      // Save communication history to cloud storage
      try {
        // Create professional HTML content for storage (same as sent email)
        const emailHtml = professionalEmailHtml;

        // Upload to R2 storage
        const { uploadToCloudflareR2 } = await import('../core/cloud-storage.js');
        const emailDate = new Date();
        const dateFolder = emailDate.toISOString().split('T')[0];
        const emailId = `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const filename = `${emailId}.html`;
        const storageKey = `communications/${userId}/${dateFolder}/${filename}`;
        
        const uploadResult = await uploadToCloudflareR2(
          Buffer.from(emailHtml, 'utf8'),
          storageKey,
          'text/html',
          {
            'email-subject': template.subject,
            'recipient-email': recipientEmail,
            'booking-id': bookingId?.toString() || 'none'
          }
        );

        if (uploadResult.success) {
          // Save metadata to database
          const communicationData = {
            userId,
            bookingId: bookingId || null,
            clientName: recipientName || recipientEmail,
            clientEmail: recipientEmail,
            communicationType: 'email',
            direction: 'outbound',
            templateId: null,
            templateName: null,
            templateCategory: isThankYouTemplate ? 'thank_you' : 'general',
            subject: template.subject,
            messageBody: uploadResult.url, // Store R2 URL instead of content
            attachments: JSON.stringify([]),
            deliveryStatus: 'sent'
          };

          await db.insert(clientCommunications).values(communicationData);
          console.log(`✅ Communication saved to cloud storage: ${uploadResult.url}`);
        } else {
          console.error('⚠️ Failed to upload communication to cloud storage:', uploadResult.error);
        }
      } catch (commError) {
        console.error('⚠️ Failed to save communication history:', commError);
        // Don't fail the email sending if communication logging fails
      }

      res.json({ 
        success: true, 
        message: `Email sent to ${recipientName || recipientEmail}`,
        bookingCompleted: isThankYouTemplate 
      });
      
    } catch (error: any) {
      console.error('❌ Failed to send template email:', error);
      res.status(500).json({ 
        error: 'Failed to send email',
        details: error.message 
      });
    }
  });

  // AI Response Generation endpoint
  app.post('/api/ai/generate-response', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Import token management utilities
      // AI token management removed - unlimited AI usage for all users

      const { action, bookingId, customPrompt, tone, travelExpense, contextualInfo, clientHistory } = req.body;

      console.log(`🔍 AI response request by user ${userId}`);

      // AI usage limits removed - unlimited AI usage for all users

      // No need to limit context since we track responses, not tokens

      console.log('🤖 AI generation request:', {
        action,
        bookingId,
        hasCustomPrompt: !!customPrompt,
        hasContextualInfo: !!contextualInfo,
        tone,
        travelExpense
      });

      // Import the AI response generator
      const { AIResponseGenerator } = await import('../core/ai-response-generator');
      const generator = new AIResponseGenerator();

      // Get booking context if bookingId is provided
      let bookingContext: any = null;
      if (bookingId && bookingId !== 'none' && bookingId !== '') {
        try {
          const booking = await storage.getBooking(bookingId);
          if (booking && booking.userId === userId) {
            // SIMPLIFIED: Always combine travel expense with performance fee
            const performanceFee = Number(booking.fee) || 0;
            const travelExpenseAmount = Number(travelExpense || booking.travelExpense) || 0;
            const totalFee = performanceFee + travelExpenseAmount;
            
            bookingContext = {
              clientName: booking.clientName,
              eventDate: booking.eventDate,
              eventTime: booking.eventTime,
              eventEndTime: booking.eventEndTime,
              venue: booking.venue,
              eventType: booking.eventType,
              gigType: booking.gigType,
              fee: totalFee, // Always pass combined total to AI
              travelExpense: 0, // No separate travel expense - included in fee
              performanceDuration: booking.performanceDuration,
              styles: booking.styles,
              equipment: (booking as any).equipment || '',
              additionalInfo: (booking as any).additionalInfo || ''
            };
            console.log('🤖 Using booking context for AI generation:', bookingContext);
          } else {
            console.log('🤖 Booking not found or access denied for booking:', bookingId);
          }
        } catch (error: any) {
          console.log('🤖 Error fetching booking, proceeding without booking context:', error.message || error);
        }
      } else {
        console.log('🤖 No booking ID provided, generating generic response');
      }

      // Get user settings for personalization
      const userSettings = await storage.getSettings(userId);
      const user = await storage.getUserById(userId);

      // Merge user data with settings - Convert null to undefined for UserSettings compatibility
      const fullSettings = {
        ...userSettings,
        businessName: userSettings?.businessName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || undefined,
        businessEmail: userSettings?.businessEmail || user?.email || undefined,
        phone: userSettings?.phone || undefined,
        businessAddress: userSettings?.businessAddress || undefined,
        addressLine1: userSettings?.addressLine1 || undefined,
        addressLine2: userSettings?.addressLine2 || undefined,
        city: userSettings?.city || undefined,
        postcode: userSettings?.postcode || undefined,
        county: userSettings?.county || undefined,
        website: userSettings?.website || undefined
      } as any; // Use type assertion to resolve the complex type mismatch

      // Generate the AI response
      const response = await generator.generateEmailResponse({
        action: action || 'respond',
        bookingContext,
        userSettings: fullSettings,
        customPrompt,
        tone: tone || 'professional',
        contextualInfo: contextualInfo || null,
        clientHistory: clientHistory || null,
        travelExpense: Number(travelExpense) || 0
      });

      // AI usage tracking removed - unlimited AI usage for all users

      console.log('✅ AI response generated successfully');
      res.json(response);
      
    } catch (error: any) {
      console.error('❌ AI generation failed:', error);
      
      // Send appropriate error message
      if (error.message.includes('OpenAI API key')) {
        return res.status(500).json({ 
          error: 'AI service not configured. Please contact support.',
          details: error.message 
        });
      } else if (error.message.includes('rate limit')) {
        return res.status(429).json({ 
          error: 'AI service temporarily unavailable. Please try again in a moment.',
          details: error.message 
        });
      } else {
        return res.status(500).json({ 
          error: 'Failed to generate AI response',
          details: error.message 
        });
      }
    }
  });

  // Glockapps deliverability test endpoint
  app.post('/api/test/glockapp-delivery', requireAuth, async (req: any, res) => {
    try {
      const { testId, templateId, seedEmails } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!testId || !templateId || !seedEmails || !Array.isArray(seedEmails)) {
        return res.status(400).json({ 
          error: 'Missing required fields: testId, templateId, and seedEmails array' 
        });
      }

      console.log(`🧪 Starting Glockapps test with ID: ${testId}`);
      console.log(`📧 Sending to ${seedEmails.length} seed addresses`);

      // Get the template
      const templates = await storage.getEmailTemplates(userId);
      const template = templates.find((t: any) => t.id === parseInt(templateId));

      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      // Get user settings for personalization
      const settings = await storage.getSettings(userId);
      const user = await storage.getUserById(userId);

      let totalSent = 0;
      let totalFailed = 0;
      const results: any[] = [];

      // Send to each seed email with test ID in headers
      for (const seedEmail of seedEmails) {
        try {
          // Personalize the template
          const userName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'MusoBuddy User';
          let subject = template.subject
            .replace(/\[Your Name\]/g, userName)
            .replace(/\[Your Business Name\]/g, settings?.businessName || 'MusoBuddy');

          let emailBody = template.emailBody
            .replace(/\[Your Name\]/g, userName)
            .replace(/\[Your Business Name\]/g, settings?.businessName || 'MusoBuddy')
            .replace(/\[Contact Details\]/g, settings?.businessEmail || user?.email || 'contact@musobuddy.com');

          // CRITICAL: Add the Glockapps test ID to the email body
          // This ensures Glockapps can match the email to the test
          emailBody += `\n\n<!-- Glockapps Test ID: ${testId} -->`;

          const emailData = {
            to: seedEmail,
            subject: subject,
            html: `
              <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6;">
                  ${emailBody.replace(/\n/g, '<br>')}
                </body>
              </html>
            `,
            // Add custom headers for Glockapps
            headers: {
              'X-Glockapps-Test-ID': testId,
              'X-Campaign-ID': testId,
              'X-Test-ID': testId
            }
          };

          // Send via the email service
          const result = await services.sendEmail(emailData);

          if (result.success) {
            totalSent++;
            results.push({ email: seedEmail, status: 'sent', messageId: result.messageId });
          } else {
            totalFailed++;
            results.push({ email: seedEmail, status: 'failed', error: result.error });
          }

          // Small delay between emails to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error: any) {
          totalFailed++;
          results.push({ email: seedEmail, status: 'error', error: error.message });
          console.error(`❌ Failed to send to ${seedEmail}:`, error);
        }
      }

      console.log(`✅ Glockapps test completed: ${totalSent} sent, ${totalFailed} failed`);

      res.json({
        success: true,
        testId,
        totalSent,
        totalFailed,
        results
      });

    } catch (error: any) {
      console.error('❌ Glockapps test error:', error);
      res.status(500).json({ 
        error: 'Failed to run Glockapps test',
        details: error.message 
      });
    }
  });

  console.log('✅ Settings routes configured');
}