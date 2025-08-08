import { type Express } from "express";
import { storage } from "../core/storage";
import { validateBody, sanitizeInput, schemas } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { generalApiRateLimit } from '../middleware/rateLimiting';
import { requireAuth } from '../middleware/auth';

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
      
      // Transform snake_case database fields to camelCase for frontend
      const transformedSettings = {
        // Basic business info
        businessName: settings.business_name || "",
        businessEmail: settings.business_email || "",
        businessAddress: settings.business_address || "",
        addressLine1: settings.address_line1 || "",
        addressLine2: settings.address_line2 || "",
        city: settings.city || "",
        county: settings.county || "",
        postcode: settings.postcode || "",
        phone: settings.phone || "",
        website: settings.website || "",
        taxNumber: settings.tax_number || "",
        emailFromName: settings.email_from_name || "",
        nextInvoiceNumber: settings.next_invoice_number || 1,
        defaultTerms: settings.default_terms || "",
        bankDetails: settings.bank_details || "",
        
        // AI pricing settings
        aiPricingEnabled: settings.ai_pricing_enabled ?? true,
        baseHourlyRate: settings.base_hourly_rate || 130,
        minimumBookingHours: settings.minimum_booking_hours || 2,
        additionalHourRate: settings.additional_hour_rate || 60,
        djServiceRate: settings.dj_service_rate || 300,
        pricingNotes: settings.pricing_notes || "",
        specialOffers: settings.special_offers || "",
        
        // Instruments and gig types
        primaryInstrument: settings.primary_instrument || "",
        secondaryInstruments: settings.secondary_instruments || [],
        customGigTypes: settings.custom_gig_types || [],
        
        // Theme settings
        themeTemplate: settings.theme_template || "classic",
        themeTone: settings.theme_tone || "formal", 
        themeFont: settings.theme_font || "roboto",
        themeAccentColor: settings.theme_accent_color || "#673ab7",
        themeLogoUrl: settings.theme_logo_url || "",
        themeSignatureUrl: settings.theme_signature_url || "",
        themeBanner: settings.theme_banner || "",
        themeShowSetlist: settings.theme_show_setlist || false,
        themeShowRiderNotes: settings.theme_show_rider_notes || false,
        themeShowQrCode: settings.theme_show_qr_code || false,
        themeShowTerms: settings.theme_show_terms !== false,
        themeCustomTitle: settings.theme_custom_title || "",
        
        // Performance settings
        bookingDisplayLimit: settings.booking_display_limit || "50",
        
        // Email management
        emailPrefix: user?.emailPrefix || null
      };
      
      res.json(transformedSettings);
      
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
      
      // Generate and store token in user record using the existing quickAddToken field
      const token = await storage.generateQuickAddToken(userId);
      
      if (!token) {
        console.error('❌ Failed to generate token for user', userId);
        return res.status(500).json({ error: 'Failed to generate widget token' });
      }
      
      // Generate R2-hosted widget (always accessible)
      const { uploadWidgetToR2 } = await import('../widget-system/widget-storage');
      const uploadResult = await uploadWidgetToR2(userId.toString(), token);
      
      if (!uploadResult.success) {
        console.error('❌ Failed to upload widget to R2:', uploadResult.error);
        return res.status(500).json({ error: 'Failed to generate widget' });
      }
      
      const widgetUrl = uploadResult.url!;
      
      // Generate QR code for the widget URL
      const qrcode = await import('qrcode');
      const qrCodeDataURL = await qrcode.toDataURL(widgetUrl, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 256
      });
      
      // Store permanent widget URL and QR code
      await storage.updateUserWidgetInfo(userId, widgetUrl, qrCodeDataURL);
      
      console.log(`✅ Widget token and QR code generated for user ${userId}: ${widgetUrl}`);
      res.json({ 
        url: widgetUrl, 
        token, 
        qrCode: qrCodeDataURL 
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
          // Generate QR code for the widget URL
          const qrcode = await import('qrcode');
          const qrCodeDataURL = await qrcode.toDataURL(uploadResult.url!, {
            errorCorrectionLevel: 'M',
            type: 'image/png',
            quality: 0.92,
            margin: 1,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            },
            width: 256
          });
          
          res.json({ 
            url: uploadResult.url, 
            token: widgetToken, 
            qrCode: qrCodeDataURL 
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

  console.log('✅ Settings routes configured');
}