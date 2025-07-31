import { type Express } from "express";
import path from "path";
import { storage } from "./storage";
// Session middleware imported inline
// ProductionAuthSystem removed - using direct route registration
import { generalApiRateLimit, slowDownMiddleware } from './rate-limiting.js';
import { aiResponseGenerator } from './ai-response-generator.js';

// Removed AI gig generation function - feature moved to documentation

// ENHANCED AUTHENTICATION MIDDLEWARE - With debugging for development
const isAuthenticated = async (req: any, res: any, next: any) => {
  console.log(`🔐 Auth check for ${req.method} ${req.path}`);
  console.log(`🔐 Session exists: ${!!req.session}`);
  console.log(`🔐 Session userId: ${req.session?.userId}`);
  console.log(`🔐 Session email: ${req.session?.email}`);
  
  if (!req.session?.userId) {
    console.log('❌ Authentication failed - no userId in session');
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    // CRITICAL SECURITY FIX: Validate user still exists in database
    const user = await storage.getUserById(req.session.userId);
    
    if (!user) {
      console.log(`❌ Authentication failed - user ${req.session.userId} no longer exists in database`);
      // Clear the invalid session
      req.session.destroy((err: any) => {
        if (err) console.error('Session destroy error:', err);
      });
      return res.status(401).json({ error: 'User account no longer exists' });
    }

    // Store user object in request for other routes to use
    req.user = user;
    
    console.log(`✅ Authentication successful for user ${req.session.userId} (${user.email})`);
    next();
    
  } catch (error: any) {
    console.error('❌ Authentication validation error:', error);
    return res.status(500).json({ error: 'Authentication validation failed' });
  }
};

export async function registerRoutes(app: Express) {
  // HARDENING: Apply general rate limiting and slow down protection
  console.log('🛡️ Setting up rate limiting protection...');
  app.use(generalApiRateLimit);
  app.use(slowDownMiddleware);
  
  // CRITICAL: Set up session middleware AFTER rate limiting
  console.log('📦 Session middleware already configured in main server');
  
  // Authentication routes now handled by rebuilt system in server/index.ts
  console.log('🔐 Authentication routes handled by rebuilt system');

  // ===== SYSTEM HEALTH & MONITORING =====
  app.get('/api/health/auth', (req, res) => {
    res.json({ status: 'healthy', message: 'Auth system operational' });
  });

  app.get('/api/health/system', async (req, res) => {
    res.json({ status: 'healthy', message: 'System operational' });
  });

  // ===== TEST ROUTES =====
  app.get('/test-login', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'test-direct-login.html'));
  });

  app.get('/dev-login', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'dev-login.html'));
  });

  // ===== AUTHENTICATION ROUTES =====
  // Authentication routes registered directly above

  // ===== USER MANAGEMENT ROUTES =====

  // ===== STRIPE ROUTES =====
  
  // Start trial route moved to auth-rebuilt.ts to avoid duplication
  
  // Create Stripe checkout session (AUTHENTICATED)
  app.post('/api/create-checkout-session', async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { priceId } = req.body;
      if (!priceId) {
        return res.status(400).json({ error: 'Price ID required' });
      }

      console.log('🛒 Creating checkout session for user:', userId, 'priceId:', priceId);

      const { StripeService } = await import('./stripe-service');
      const stripeService = new StripeService();
      
      const session = await stripeService.createTrialCheckoutSession(userId, priceId);
      
      console.log('✅ Checkout session created:', session.sessionId);
      res.json(session);
      
    } catch (error: any) {
      console.error('❌ Checkout session error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get subscription status (AUTHENTICATED)
  app.get('/api/subscription/status', async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { StripeService } = await import('./stripe-service');
      const stripeService = new StripeService();
      
      const status = await stripeService.getSubscriptionStatus(userId);
      res.json(status);
      
    } catch (error: any) {
      console.error('❌ Subscription status error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ===== MISSING API ENDPOINTS =====
  
  // Global gig types endpoint
  app.get('/api/global-gig-types', async (req, res) => {
    try {
      // Return empty array for now - will implement caching later
      res.json({ gigTypes: [] });
    } catch (error: any) {
      console.error('❌ Global gig types error:', error);
      res.status(500).json({ error: 'Failed to fetch global gig types' });
    }
  });

  // Dashboard stats endpoint
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Return basic stats - will enhance later
      res.json({
        totalBookings: 0,
        completedBookings: 0,
        pendingContracts: 0,
        totalRevenue: 0
      });
    } catch (error: any) {
      console.error('❌ Dashboard stats error:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
  });

  // ===== SETTINGS API =====
  app.get('/api/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      console.log(`🔍 Fetching settings for user: ${userId}`);
      
      // Fetch actual user settings from database
      const userSettings = await storage.getUserSettings(userId);
      
      console.log(`✅ Settings retrieved for user ${userId}:`, {
        businessName: userSettings?.businessName,
        primaryInstrument: userSettings?.primaryInstrument,
        hasSettings: !!userSettings
      });
      
      res.json(userSettings || {});
    } catch (error: any) {
      console.error('❌ Settings fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  });

  app.post('/api/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      console.log(`💾 Saving settings for user: ${userId}`);
      console.log(`🎵 Instrument in request:`, req.body.primaryInstrument);
      
      const result = await storage.updateSettings(userId, req.body);
      
      console.log(`✅ Settings saved successfully for user ${userId}`, {
        primaryInstrument: result?.primaryInstrument,
        businessName: result?.businessName
      });
      
      res.json(result);
    } catch (error: any) {
      console.error('❌ Settings save error:', error);
      res.status(500).json({ error: 'Failed to save settings' });
    }
  });

  // ===== ADMIN TESTING LOGIN =====
  app.post('/api/test-login', async (req: any, res) => {
    try {
      // Simple test login for fixing instrument selection
      req.session.userId = 'test-user-id';
      req.session.email = 'test@example.com';
      res.json({ success: true, message: 'Test login successful' });
    } catch (error: any) {
      res.status(500).json({ error: 'Test login failed' });
    }
  });

  // ===== NOTIFICATIONS API =====
  app.get('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Return empty notifications array for now
      res.json([]);
    } catch (error: any) {
      console.error('❌ Notifications error:', error);
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  });

  // Session restoration route moved to auth-rebuilt.ts to avoid duplication

  app.patch('/api/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      console.log(`⚙️ Updating settings for user: ${userId}`, req.body);
      
      const updatedSettings = await storage.updateSettings(userId, req.body);
      
      console.log(`✅ Settings updated for user ${userId}`);
      res.json(updatedSettings);
      
    } catch (error: any) {
      console.error('❌ Failed to update user settings:', error);
      res.status(500).json({ 
        error: 'Failed to update user settings',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // ADD: POST /api/settings route (frontend expects POST, backend only had PATCH)
  app.post('/api/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      console.log(`⚙️ Creating/updating settings for user: ${userId}`, req.body);
      
      // Use the same logic as existing PATCH handler
      const updatedSettings = await storage.updateSettings(userId, req.body);
      
      console.log(`✅ Settings created/updated for user ${userId}`);
      res.json(updatedSettings);
      
    } catch (error: any) {
      console.error('❌ Failed to create/update user settings:', error);
      res.status(500).json({ 
        error: 'Failed to save user settings',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Instrument settings endpoint
  app.post('/api/settings/instrument', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const { primaryInstrument, availableGigTypes } = req.body;
      
      console.log(`🎵 Updating instrument settings for user: ${userId}`, { primaryInstrument, gigTypesCount: availableGigTypes?.length });
      
      // Update instrument settings
      const updatedSettings = await storage.updateSettings(userId, {
        primaryInstrument,
        availableGigTypes: JSON.stringify(availableGigTypes)
      });
      
      console.log(`✅ Instrument settings updated for user ${userId}`);
      res.json({ 
        success: true, 
        primaryInstrument,
        availableGigTypes,
        gigTypesCount: availableGigTypes?.length || 0
      });
      
    } catch (error: any) {
      console.error('❌ Failed to update instrument settings:', error);
      res.status(500).json({ 
        error: 'Failed to update instrument settings',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // ===== EMAIL TEMPLATES API =====
  app.get('/api/templates', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      console.log(`🔍 Templates fetch request for user: ${userId}`);
      
      const templates = await storage.getEmailTemplates(userId);
      console.log(`✅ Templates retrieved for user ${userId}`);
      res.json(templates);
    } catch (error: any) {
      console.error('❌ Templates fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch templates' });
    }
  });

  app.post('/api/templates', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      const templateDataWithUser = { 
        ...req.body, 
        userId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      console.log(`🔍 Template create request for user: ${userId}`);
      const newTemplate = await storage.createEmailTemplate(templateDataWithUser);
      console.log(`✅ Template created for user ${userId}`);
      res.json(newTemplate);
    } catch (error: any) {
      console.error('❌ Template create error:', error);
      res.status(500).json({ error: 'Failed to create template' });
    }
  });

  app.put('/api/templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      const templateId = parseInt(req.params.id);
      const templateData = req.body;
      
      if (isNaN(templateId)) {
        return res.status(400).json({ error: 'Invalid template ID' });
      }
      
      console.log(`🔍 Template update request for user: ${userId}, template: ${templateId}`);
      const updatedTemplate = await storage.updateEmailTemplate(templateId, templateData, userId);
      console.log(`✅ Template updated for user ${userId}`);
      res.json(updatedTemplate);
    } catch (error: any) {
      console.error('❌ Template update error:', error);
      res.status(500).json({ error: 'Failed to update template' });
    }
  });

  app.delete('/api/templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      const templateId = parseInt(req.params.id);
      
      if (isNaN(templateId)) {
        return res.status(400).json({ error: 'Invalid template ID' });
      }
      
      console.log(`🔍 Template delete request for user: ${userId}, template: ${templateId}`);
      await storage.deleteEmailTemplate(templateId, userId);
      console.log(`✅ Template deleted for user ${userId}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error('❌ Template delete error:', error);
      res.status(500).json({ error: 'Failed to delete template' });
    }
  });

  // ADD: PATCH /api/templates/:id route (frontend expects PATCH, backend only had PUT)
  app.patch('/api/templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      const templateId = parseInt(req.params.id);
      const templateData = req.body;
      
      if (isNaN(templateId)) {
        return res.status(400).json({ error: 'Invalid template ID' });
      }
      
      console.log(`🔍 Template PATCH request for user: ${userId}, template: ${templateId}`);
      
      // Use the same logic as existing PUT handler
      const updatedTemplate = await storage.updateEmailTemplate(templateId, templateData, userId);
      
      console.log(`✅ Template updated via PATCH for user ${userId}`);
      res.json(updatedTemplate);
    } catch (error: any) {
      console.error('❌ Template PATCH error:', error);
      res.status(500).json({ error: 'Failed to update template' });
    }
  });

  // GlockApps deliverability test endpoint
  app.post('/api/test/glockapp-delivery', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      const { testId, templateId, seedEmails } = req.body;

      console.log(`🔍 GlockApps test request - userId: ${userId}, testId: ${testId}, templateId: ${templateId}, seedEmails count: ${seedEmails?.length}`);

      if (!userId) {
        console.log('❌ Authentication failed - no userId');
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!testId || !templateId || !seedEmails || !Array.isArray(seedEmails)) {
        console.log('❌ Validation failed:', { testId, templateId, seedEmailsType: typeof seedEmails, isArray: Array.isArray(seedEmails) });
        return res.status(400).json({ error: 'testId, templateId, and seedEmails array required' });
      }

      console.log(`📧 Starting GlockApps test ${testId} for user ${userId} with ${seedEmails.length} addresses`);

      // Get user settings for professional signature
      console.log('🔍 Fetching user settings...');
      const userSettings = await storage.getUserSettings(userId);
      console.log('✅ User settings fetched:', { businessName: userSettings?.businessName, hasSettings: !!userSettings });

      console.log('🔍 Fetching templates...');
      const templates = await storage.getEmailTemplates(userId);
      console.log('✅ Templates fetched:', { count: templates?.length, templateIds: templates?.map(t => t.id) });

      const template = templates.find(t => t.id === parseInt(templateId));
      console.log('🔍 Template lookup:', { requestedId: parseInt(templateId), found: !!template, templateName: template?.name });
      
      if (!template) {
        console.log('❌ Template not found');
        return res.status(404).json({ error: 'Template not found' });
      }

      // Import email service
      console.log('🔍 Importing email service...');
      const { MailgunService } = await import('./services');
      const emailService = new MailgunService();
      console.log('✅ Email service imported');
      
      // Generate professional email signature
      console.log('🔍 Generating email signature...');
      const signature = emailService.generateEmailSignature(userSettings);
      const emailWithSignature = template.emailBody + signature;
      console.log('✅ Email with signature prepared');
      
      const results = [];
      console.log(`📧 Starting to send to ${seedEmails.length} addresses...`);
      
      // Send to each seed email with enhanced deliverability
      for (let i = 0; i < seedEmails.length; i++) {
        const seedEmail = seedEmails[i];
        try {
          console.log(`📧 Sending ${i + 1}/${seedEmails.length} to ${seedEmail}`);
          
          const emailData = {
            from: `${userSettings.businessName || 'MusoBuddy'} <noreply@mg.musobuddy.com>`,
            to: seedEmail.trim(),
            subject: `[GlockApps Test ${testId}] ${template.subject}`,
            html: emailWithSignature,
            text: emailService.htmlToPlainText(emailWithSignature),
            replyTo: userSettings.businessEmail || userSettings.email,
            headers: {
              'Return-Path': 'bounces@mg.musobuddy.com',
              'List-Unsubscribe': '<mailto:unsubscribe@mg.musobuddy.com>',
              'X-Priority': '3',
              'X-Mailer': 'MusoBuddy Email System v1.0',
              'X-GlockApps-Test': testId
            },
            tracking: {
              'test-id': testId,
              'test-type': 'glockapp-delivery',
              'user-id': userId,
              'template-id': templateId
            },
            emailType: 'glockapp-test',
            userId: userId
          };

          const result = await emailService.sendEmail(emailData);
          results.push({ email: seedEmail, status: 'sent', messageId: result.id });
          console.log(`✅ Sent ${i + 1}/${seedEmails.length} to ${seedEmail} - ID: ${result.id}`);
          
        } catch (error: any) {
          console.error(`❌ Failed to send ${i + 1}/${seedEmails.length} to ${seedEmail}:`, error.message);
          results.push({ email: seedEmail, status: 'failed', error: error.message });
        }
      }

      const totalSent = results.filter(r => r.status === 'sent').length;
      const totalFailed = results.filter(r => r.status === 'failed').length;
      console.log(`✅ GlockApps test ${testId} completed - sent: ${totalSent}, failed: ${totalFailed}`);
      
      res.json({ 
        success: true, 
        testId,
        totalSent,
        totalFailed,
        results 
      });

    } catch (error: any) {
      console.error('❌ GlockApps test error:', error);
      console.error('❌ Error stack:', error.stack);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  // Simple GET route to run full GlockApps test - just visit the URL
  app.get('/api/test/run-glockapp-full', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      
      if (!userId) {
        return res.status(401).send('<html><body><h1>❌ Not logged in</h1><p>Please log into MusoBuddy first</p></body></html>');
      }

      console.log(`🚀 Starting automated GlockApps test for user ${userId}`);

      // All 91 GlockApps seed emails
      const allSeedEmails = [
        "elizabeaver@auth.glockdb.com", "juliarspivey@aol.com", "davidvcampbell@aol.com", "lynettedweyand@protonmail.com",
        "bbarretthenryhe@gmail.com", "luisl417@yahoo.com", "jerrybrucedath@gmail.com", "verify79@web.de",
        "simonetgrimard@laposte.net", "irenem@userflowhq.com", "comwhitttakarticjt@gmx.de", "verifynewssl@zoho.com",
        "yadiraalfordbj@hotmail.com", "dannakbond@aol.com", "allanb@glockapps.awsapps.com", "eliza@spamcombat.com",
        "eugenedandy576@gmail.com", "pprestondasavis@gmx.com", "alisonnlawrence@gmail.com", "verifycom79@gmx.com",
        "b2bdeliver79@mail.com", "romanespor11@icloud.com", "joereddison@outlook.com", "martin@glockapps.tech",
        "verify79@buyemailsoftware.com", "gailllitle@att.net", "jeffsayerss@yahoo.com", "johnnyjonesjake@hotmail.com",
        "heavenpeck@freenet.de", "virginia@buyemailsoftware.com", "creissantdubois@laposte.net", "tristonreevestge@outlook.com.br",
        "irene@postmasterpro.email", "jessicalisa6054@gmail.com", "blaircourtneye@outlook.com", "lashawnrheidrick@yahoo.com",
        "loganalan654@gmail.com", "assa@auth.glockdb.com", "emilliesunnyk@gmail.com", "williamhensley54@yahoo.com",
        "debrajhammons@outlook.com", "racheljavierera@hotmail.com", "williamhbishopp@yahoo.com", "anmeiyudobaihq@gmx.de",
        "cierawilliamsonwq@gmail.com", "frankdesalvo@mailo.com", "jamesjng@outlook.com", "davidkdoyle@hotmail.com",
        "gd@desktopemail.com", "bookerttubbs@zohomail.eu", "lenorebayerd@gmail.com", "taverasbrianvg@gmail.com",
        "johntberman@yahoo.com", "raphaelewiley@aol.com", "keenanblooms@gmail.com", "carollpooool@outlook.com",
        "catherinedwilsonn@aol.com", "mbell@fastdirectorysubmitter.com", "martinawm@gemings.awsapps.com", "luanajortega@yahoo.com",
        "markjenningson@hotmail.com", "naomimartinsn@hotmail.com", "brittanyrocha@outlook.de", "larrycellis@aol.com",
        "madeleinecagleks@gmail.com", "geraldmbautista@outlook.com", "williamtkozlowsk@gmail.com", "aileenjamesua@outlook.com",
        "paul@userflowhq.com", "carlbilly605@gmail.com", "alfredohoffman@fastdirectorysubmitter.com", "tinamallahancr@gmail.com",
        "verifyde79@gmx.de", "andrewheggins@mailo.com", "johnsimonskh@gmail.com", "jurgeneberhartdd@web.de",
        "bobbybagdgddwins@mailo.com", "elizabethbetty6054@gmail.com", "deweymadddax@currently.com", "leoefraser@yahoo.com",
        "glencabrera@outlook.fr", "clyde@trustycheck.pro", "candacechall@aol.com", "augustinlidermann@t-online.de",
        "wilcoxginax@gmail.com", "daishacorwingx@gmail.com", "louiepettydr@gmail.com", "carloscohenm@freenet.de",
        "michaelrwoodd@yahoo.com", "fredmrivenburg@aol.com"
      ];

      // Get user settings and templates
      const userSettings = await storage.getUserSettings(userId);
      const templates = await storage.getEmailTemplates(userId);
      const template = templates[0]; // Use first template

      if (!template) {
        return res.status(400).send('<html><body><h1>❌ No templates found</h1><p>Create an email template first</p></body></html>');
      }

      // Import email service
      const { MailgunService } = await import('./services');
      const emailService = new MailgunService();
      
      // Generate email signature
      const signature = emailService.generateEmailSignature(userSettings);
      const emailWithSignature = template.emailBody + signature;
      
      let htmlResponse = `
        <html><head><title>GlockApps Test Results</title><style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          .success { color: green; } .error { color: red; } .info { color: blue; }
          .result { padding: 10px; margin: 5px 0; border-left: 4px solid #ddd; }
        </style></head><body>
        <h1>🚀 GlockApps Deliverability Test</h1>
        <p><strong>Test ID:</strong> 2025-07-31-12:25:46:357t</p>
        <p><strong>Template:</strong> ${template.name} - "${template.subject}"</p>
        <p><strong>Total Addresses:</strong> ${allSeedEmails.length}</p>
        <div class="info">📧 Sending emails in batches of 25...</div>
      `;

      // Split into batches of 25
      const batchSize = 25;
      const batches = [];
      for (let i = 0; i < allSeedEmails.length; i += batchSize) {
        batches.push(allSeedEmails.slice(i, i + batchSize));
      }

      let totalSent = 0;
      let totalFailed = 0;
      
      // Send each batch
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`📧 Processing batch ${i + 1}/${batches.length} (${batch.length} emails)`);
        
        htmlResponse += `<div class="info">📦 Processing batch ${i + 1}/${batches.length} (${batch.length} emails)...</div>`;
        
        try {
          // Send to each email in this batch
          for (const seedEmail of batch) {
            try {
              const emailData = {
                from: `${userSettings.businessName || 'MusoBuddy'} <noreply@mg.musobuddy.com>`,
                to: seedEmail.trim(),
                subject: `[GlockApps Test 2025-07-31-12:25:46:357t] ${template.subject}`,
                html: emailWithSignature,
                text: emailService.htmlToPlainText(emailWithSignature),
                replyTo: userSettings.businessEmail || userSettings.email,
                headers: {
                  'Return-Path': 'bounces@mg.musobuddy.com',
                  'List-Unsubscribe': '<mailto:unsubscribe@mg.musobuddy.com>',
                  'X-Priority': '3',
                  'X-Mailer': 'MusoBuddy Email System v1.0',
                  'X-GlockApps-Test': '2025-07-31-12:25:46:357t'
                },
                tracking: {
                  'test-id': '2025-07-31-12:25:46:357t',
                  'test-type': 'glockapp-delivery',
                  'user-id': userId,
                  'template-id': template.id
                },
                emailType: 'glockapp-test',
                userId: userId
              };

              await emailService.sendEmail(emailData);
              totalSent++;
              console.log(`✅ Sent to ${seedEmail}`);
              
            } catch (error: any) {
              totalFailed++;
              console.error(`❌ Failed to send to ${seedEmail}:`, error.message);
            }
          }

          htmlResponse += `<div class="success">✅ Batch ${i + 1} completed</div>`;
          
          // Small delay between batches
          if (i < batches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          
        } catch (error: any) {
          totalFailed += batch.length;
          htmlResponse += `<div class="error">❌ Batch ${i + 1} failed: ${error.message}</div>`;
          console.error(`❌ Batch ${i + 1} error:`, error);
        }
      }

      htmlResponse += `
        <h2>🎉 Test Completed!</h2>
        <div class="result">
          <strong>Final Results:</strong><br>
          ✅ Successfully sent: ${totalSent}<br>
          ❌ Failed: ${totalFailed}<br>
          📊 Total: ${allSeedEmails.length}
        </div>
        <div class="info">
          <p>📧 Check your GlockApps dashboard in 5-10 minutes for deliverability results.</p>
          <p><a href="/dashboard">← Back to MusoBuddy Dashboard</a></p>
        </div>
        </body></html>
      `;

      console.log(`🎉 GlockApps test completed - ${totalSent} sent, ${totalFailed} failed`);
      res.send(htmlResponse);

    } catch (error: any) {
      console.error('❌ Automated GlockApps test error:', error);
      res.status(500).send(`<html><body><h1>❌ Test Failed</h1><p>${error.message}</p></body></html>`);
    }
  });

  // Send template email with enhanced deliverability
  app.post('/api/templates/send-email', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      const { template, bookingId } = req.body;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      if (!template || !template.subject || !template.emailBody) {
        return res.status(400).json({ error: 'Template data required' });
      }
      
      console.log(`📧 Sending template email for user: ${userId}, booking: ${bookingId}`);
      
      // Get booking data to extract client email
      const booking = bookingId ? await storage.getBookingDetails(bookingId) : null;
      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }
      
      // Get user settings for business email
      const userSettings = await storage.getUserSettings(userId);
      if (!userSettings) {
        return res.status(404).json({ error: 'User settings not found' });
      }
      
      // Import email service
      const { MailgunService } = await import('./services');
      const emailService = new MailgunService();
      
      // Generate professional email signature
      const signature = emailService.generateEmailSignature(userSettings);
      const emailWithSignature = template.emailBody + signature;
      
      // Enhanced email data with deliverability improvements
      const emailData = {
        from: `${userSettings.businessName || 'MusoBuddy'} <noreply@mg.musobuddy.com>`,
        to: booking.clientEmail,
        subject: template.subject,
        html: emailWithSignature,
        text: emailService.htmlToPlainText(emailWithSignature), // Plain text version for better deliverability
        replyTo: userSettings.businessEmail || userSettings.email,
        headers: {
          'Return-Path': 'bounces@mg.musobuddy.com',
          'List-Unsubscribe': '<mailto:unsubscribe@mg.musobuddy.com>',
          'X-Priority': '3',
          'X-Mailer': 'MusoBuddy Email System v1.0'
        },
        tracking: {
          'v:email-type': 'template',
          'v:user-id': userId,
          'v:booking-id': bookingId
        },
        emailType: 'template',
        userId: userId
      };
      
      // Send email
      const result = await emailService.sendEmail(emailData);
      
      // Check if this was a thank you template and update booking status
      const isThankYouTemplate = template.subject?.toLowerCase().includes('thank you') || 
                               template.emailBody?.toLowerCase().includes('thank you for');
      
      if (isThankYouTemplate && bookingId) {
        // Only mark as completed for past events
        const eventDate = new Date(booking.eventDate);
        const today = new Date();
        if (eventDate < today) {
          await storage.updateBookingStatus(bookingId, 'completed');
          console.log(`✅ Thank you email sent - booking ${bookingId} marked as completed`);
        }
      } else if (bookingId) {
        // For other templates, update status from 'new' to 'in_progress'
        if (booking.status === 'new') {
          await storage.updateBookingStatus(bookingId, 'in_progress');
          console.log(`✅ Template email sent - booking ${bookingId} status updated to in_progress`);
        }
      }
      
      console.log(`✅ Template email sent successfully for user ${userId}`);
      res.json({ 
        success: true, 
        message: 'Email sent successfully',
        mailgunId: result.id 
      });
      
    } catch (error: any) {
      console.error('❌ Template email error:', error);
      res.status(500).json({ 
        error: 'Failed to send template email',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // ===== CONTRACT DOWNLOAD ROUTE =====
  app.get('/api/contracts/:id/download', isAuthenticated, async (req: any, res) => {
    try {
      const contractId = parseInt(req.params.id);
      const userId = req.session?.userId;
      
      if (isNaN(contractId)) {
        return res.status(400).json({ error: 'Invalid contract ID' });
      }
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      console.log(`📄 Download request for contract #${contractId} by user ${userId}`);
      
      // Get contract and verify ownership
      const contract = await storage.getContract(contractId);
      if (!contract) {
        console.log(`❌ Contract #${contractId} not found`);
        return res.status(404).json({ error: 'Contract not found' });
      }
      
      if (contract.userId !== userId) {
        console.log(`❌ User ${userId} denied access to contract #${contractId} (owned by ${contract.userId})`);
        return res.status(403).json({ error: 'Access denied - you do not own this contract' });
      }
      
      console.log(`✅ Contract #${contractId} access authorized for user ${userId}`);
      
      // FIXED: Generate PDF locally instead of redirecting to avoid CORS issues
      if (contract.cloudStorageUrl) {
        console.log('🌐 Cloud URL available, but generating PDF locally to avoid CORS issues');
        
        try {
          const userSettings = await storage.getUserSettings(userId);
          const { generateContractPDF } = await import('./pdf-generator');
          
          // Include signature details if contract is signed
          const signatureDetails = contract.status === 'signed' && contract.signedAt ? {
            signedAt: new Date(contract.signedAt),
            signatureName: contract.clientSignature || undefined,
            clientIpAddress: contract.clientIpAddress || undefined
          } : undefined;
          
          const pdfBuffer = await generateContractPDF(contract, userSettings, signatureDetails);
          
          // Set headers for direct PDF download
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="Contract-${contract.contractNumber.replace(/[^a-zA-Z0-9-_]/g, '-')}.pdf"`);
          res.setHeader('Content-Length', pdfBuffer.length.toString());
          
          console.log(`✅ PDF generated locally and served: ${pdfBuffer.length} bytes`);
          return res.send(pdfBuffer);
          
        } catch (pdfError: any) {
          console.error('❌ Local PDF generation failed, trying cloud redirect:', pdfError);
          // Fallback to cloud redirect if local generation fails
          return res.redirect(contract.cloudStorageUrl);
        }
      }
      
      // Fallback: Generate PDF on-demand
      console.log('🔄 Generating PDF on-demand (no cloud URL available)...');
      
      try {
        const userSettings = await storage.getUserSettings(userId);
        const { generateContractPDF } = await import('./pdf-generator');
        
        // Include signature details if contract is signed
        const signatureDetails = contract.status === 'signed' && contract.signedAt ? {
          signedAt: new Date(contract.signedAt),
          signatureName: contract.clientSignature || undefined,
          clientIpAddress: contract.clientIpAddress || undefined
        } : undefined;
        
        const pdfBuffer = await generateContractPDF(contract, userSettings, signatureDetails);
        
        // Set appropriate headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Contract-${contract.contractNumber.replace(/[^a-zA-Z0-9-_]/g, '-')}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length.toString());
        
        console.log(`✅ PDF generated and served: ${pdfBuffer.length} bytes`);
        res.send(pdfBuffer);
        
      } catch (pdfError: any) {
        console.error('❌ PDF generation failed:', pdfError);
        return res.status(500).json({ 
          error: 'Failed to generate contract PDF',
          details: process.env.NODE_ENV === 'development' ? pdfError.message : undefined
        });
      }
      
    } catch (error: any) {
      console.error('❌ Contract download error:', error);
      res.status(500).json({ 
        error: 'Failed to download contract',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // ===== EMAIL SETUP API =====
  app.get('/api/email/my-address', async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Check if user has email prefix set
      if (user.emailPrefix) {
        res.json({ 
          email: `leads+${user.emailPrefix}@mg.musobuddy.com`,
          needsSetup: false 
        });
      } else {
        res.json({ 
          email: null,
          needsSetup: true 
        });
      }
    } catch (error: any) {
      console.error('❌ Email address error:', error);
      res.status(500).json({ error: 'Failed to get email address' });
    }
  });

  app.post('/api/email/check-availability', async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const { prefix } = req.body;
      if (!prefix) {
        return res.status(400).json({ error: 'Prefix required' });
      }
      
      // Basic validation
      if (prefix.length < 2) {
        return res.json({ 
          available: false, 
          error: 'Prefix must be at least 2 characters' 
        });
      }
      
      if (!/^[a-z0-9]+$/.test(prefix)) {
        return res.json({ 
          available: false, 
          error: 'Prefix can only contain lowercase letters and numbers' 
        });
      }
      
      // Check if prefix is already taken
      const users = await storage.getAllUsers();
      const existingUser = users.find((u: any) => u.emailPrefix === prefix);
      
      if (existingUser) {
        // Suggest alternative
        const suggestion = `${prefix}${Math.floor(Math.random() * 99) + 1}`;
        return res.json({ 
          available: false, 
          error: 'This prefix is already taken',
          suggestion 
        });
      }
      
      res.json({ 
        available: true,
        fullEmail: `leads+${prefix}@mg.musobuddy.com`
      });
      
    } catch (error: any) {
      console.error('❌ Email availability error:', error);
      res.status(500).json({ error: 'Failed to check availability' });
    }
  });

  app.post('/api/email/assign-prefix', async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const { prefix } = req.body;
      if (!prefix) {
        return res.status(400).json({ error: 'Prefix required' });
      }
      
      // Double-check availability
      const users = await storage.getAllUsers();
      const existingUser = users.find((u: any) => u.emailPrefix === prefix);
      
      if (existingUser) {
        return res.status(409).json({ error: 'Prefix no longer available' });
      }
      
      // Assign prefix to user
      await storage.updateUser(userId, { emailPrefix: prefix });
      
      const fullEmail = `leads+${prefix}@mg.musobuddy.com`;
      
      res.json({ 
        success: true,
        email: fullEmail,
        prefix 
      });
      
    } catch (error: any) {
      console.error('❌ Email assignment error:', error);
      res.status(500).json({ error: 'Failed to assign email' });
    }
  });
  
  // ===== BOOKING ROUTES =====
  
  // Get all bookings for authenticated user - CLEAN IMPLEMENTATION
  app.get('/api/bookings', async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Import booking formatter
      const { formatBookings } = await import('./booking-formatter');
      
      // Get user settings to check display limit preference
      const userSettings = await storage.getUserSettings(userId);
      const displayLimit = userSettings?.bookingDisplayLimit || "50"; // Default to "50" if not set
      
      // Get all bookings for user
      const rawBookings = await storage.getBookings(userId);
      
      // Sort by date (most recent first) and apply user-defined limit
      let sortedBookings = rawBookings
        .sort((a: any, b: any) => new Date(b.eventDate || 0).getTime() - new Date(a.eventDate || 0).getTime());
      
      // Apply display limit based on user preference
      if (displayLimit === "50") {
        // Smart filtering: All future bookings + 50 past bookings
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today
        
        const futureBookings = sortedBookings.filter((booking: any) => {
          const eventDate = new Date(booking.eventDate || 0);
          return eventDate >= today;
        });
        
        const pastBookings = sortedBookings.filter((booking: any) => {
          const eventDate = new Date(booking.eventDate || 0);
          return eventDate < today;
        }).slice(0, 50); // Only take 50 most recent past bookings
        
        // Combine future + limited past bookings and re-sort
        sortedBookings = [...futureBookings, ...pastBookings]
          .sort((a: any, b: any) => new Date(b.eventDate || 0).getTime() - new Date(a.eventDate || 0).getTime());
      }
      // If displayLimit === "all", show all bookings (no filtering)
      
      // Format bookings consistently
      const formattedBookings = formatBookings(sortedBookings);
      
      res.json(formattedBookings);
    } catch (error) {
      console.error('❌ Failed to fetch bookings:', error);
      res.status(500).json({ error: 'Failed to fetch bookings' });
    }
  });

  // Get individual booking
  app.get('/api/bookings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      const rawBooking = await storage.getBooking(bookingId);
      if (!rawBooking) {
        return res.status(404).json({ error: 'Booking not found' });
      }
      
      // Import booking formatter
      const { formatBooking } = await import('./booking-formatter');
      
      // Format booking consistently
      const formattedBooking = formatBooking(rawBooking);
      
      res.json(formattedBooking);
    } catch (error) {
      console.error('❌ Failed to fetch booking:', error);
      res.status(500).json({ error: 'Failed to fetch booking' });
    }
  });

  // Create new booking
  app.post('/api/bookings', isAuthenticated, async (req: any, res) => {
    try {
      const bookingData = {
        ...req.body,
        userId: req.session.userId
      };
      const newBooking = await storage.createBooking(bookingData);
      console.log(`✅ Created booking #${newBooking.id} for user ${req.session.userId}`);
      res.json(newBooking);
    } catch (error) {
      console.error('❌ Failed to create booking:', error);
      res.status(500).json({ error: 'Failed to create booking' });
    }
  });

  // Update booking
  app.patch('/api/bookings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      const updatedBooking = await storage.updateBooking(bookingId, req.body);
      if (!updatedBooking) {
        return res.status(404).json({ error: 'Booking not found' });
      }
      console.log(`✅ Updated booking #${bookingId} for user ${req.session.userId}`);
      res.json(updatedBooking);
    } catch (error) {
      console.error('❌ Failed to update booking:', error);
      res.status(500).json({ error: 'Failed to update booking' });
    }
  });

  // Delete booking
  app.delete('/api/bookings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      await storage.deleteBooking(bookingId);
      console.log(`✅ Deleted booking #${bookingId} for user ${req.session.userId}`);
      res.json({ success: true });
    } catch (error) {
      console.error('❌ Failed to delete booking:', error);
      res.status(500).json({ error: 'Failed to delete booking' });
    }
  });

  // Parse text message to create booking (Quick Add functionality)
  app.post('/api/bookings/parse-text', isAuthenticated, async (req: any, res) => {
    try {
      const { emailContent, fromEmail, clientAddress } = req.body;
      const userId = req.session.userId;
      
      console.log(`🤖 Text parsing request from user ${userId}`);
      console.log(`📝 Message length: ${emailContent?.length || 0} characters`);
      console.log(`📧 From: ${fromEmail}`);
      
      if (!emailContent || !fromEmail) {
        return res.status(400).json({ error: 'Message content and sender information are required' });
      }

      // Use the existing AI parsing function from webhook handler
      const { parseEmailWithAI } = await import('../index');
      
      try {
        const parsedData = await parseEmailWithAI(emailContent, `Quick Add from ${fromEmail}`);
        
        // Create booking with parsed data
        const bookingData = {
          userId: userId,
          title: `Enquiry from ${parsedData.clientName || fromEmail}`,
          clientName: parsedData.clientName || fromEmail,
          clientEmail: parsedData.clientEmail || (fromEmail.includes('@') ? fromEmail : null),
          clientPhone: parsedData.clientPhone || null,
          clientAddress: clientAddress || parsedData.clientAddress || null,
          eventDate: parsedData.eventDate || new Date(),
          eventTime: parsedData.eventTime || null,
          eventEndTime: parsedData.eventEndTime || null,
          venue: parsedData.venue || null,
          venueAddress: parsedData.venueAddress || null,
          gigType: parsedData.gigType || parsedData.eventType || null,
          performanceFee: parsedData.fee || parsedData.estimatedValue || parsedData.budget || null,
          travelExpense: parsedData.travelExpense || null,
          notes: `Original message:\n\n${emailContent}`,
          status: 'new'
        };

        const newBooking = await storage.createBooking(bookingData);
        console.log(`✅ Created booking #${newBooking.id} from text parsing for user ${userId}`);
        
        res.json({ 
          success: true, 
          booking: newBooking,
          message: 'Booking created successfully from text parsing'
        });

      } catch (aiError: any) {
        console.error('❌ AI parsing failed, creating basic booking:', aiError);
        
        // Fallback: Create basic booking without AI parsing
        const basicBookingData = {
          userId: userId,
          title: `Message from ${fromEmail}`,
          clientName: fromEmail,
          clientEmail: fromEmail.includes('@') ? fromEmail : null,
          clientAddress: clientAddress || null,
          notes: `Original message:\n\n${emailContent}`,
          status: 'new'
        };

        const newBooking = await storage.createBooking(basicBookingData);
        console.log(`✅ Created basic booking #${newBooking.id} (AI parsing failed) for user ${userId}`);
        
        res.json({ 
          success: true, 
          booking: newBooking,
          message: 'Booking created successfully (manual review needed)'
        });
      }

    } catch (error: any) {
      console.error('❌ Text parsing error:', error);
      res.status(500).json({ 
        error: 'Failed to parse text and create booking',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // ===== CONTRACTS ROUTES =====
  
  // Get all contracts for authenticated user
  app.get('/api/contracts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const contracts = await storage.getContracts(userId);
      console.log(`✅ Retrieved ${contracts.length} contracts for user ${userId}`);
      res.json(contracts);
    } catch (error) {
      console.error('❌ Failed to fetch contracts:', error);
      res.status(500).json({ error: 'Failed to fetch contracts' });
    }
  });

  // Create new contract
  app.post('/api/contracts', isAuthenticated, async (req: any, res) => {
    try {
      console.log('📝 Contract creation request:', {
        body: req.body,
        userId: req.session.userId,
        hasContractNumber: !!req.body.contractNumber,
        environment: process.env.NODE_ENV,
        isProduction: !!process.env.REPLIT_DEPLOYMENT
      });
      
      // Generate contract number if not provided
      const contractNumber = req.body.contractNumber || 
        `(${new Date(req.body.eventDate).toLocaleDateString('en-GB', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric' 
        })} - ${req.body.clientName})`;
      
      // Validate required fields first
      if (!req.body.clientName || !req.body.eventDate || !req.body.fee) {
        return res.status(400).json({ 
          error: 'Missing required fields: clientName, eventDate, and fee are required' 
        });
      }

      const contractData = {
        userId: req.session.userId,
        contractNumber,
        clientName: req.body.clientName,
        clientEmail: req.body.clientEmail || null,
        clientAddress: req.body.clientAddress || null,
        clientPhone: req.body.clientPhone || null,
        venue: req.body.venue || null,
        venueAddress: req.body.venueAddress || null,
        eventDate: req.body.eventDate,
        eventTime: req.body.eventTime || "", // NOT NULL constraint requires empty string, not null
        eventEndTime: req.body.eventEndTime || "", // NOT NULL constraint requires empty string, not null
        fee: req.body.fee,
        deposit: req.body.deposit || "0.00",
        paymentInstructions: req.body.paymentInstructions || null,
        equipmentRequirements: req.body.equipmentRequirements || null,
        specialRequirements: req.body.specialRequirements || null,
        enquiryId: req.body.enquiryId || null
      };
      
      console.log('📝 Processed contract data:', {
        contractNumber,
        clientName: contractData.clientName,
        eventDate: contractData.eventDate,
        eventTime: contractData.eventTime,
        fee: contractData.fee
      });
      
      const newContract = await storage.createContract(contractData);
      console.log(`✅ Created contract #${newContract.id} for user ${req.session.userId}`);
      
      // CRITICAL FIX: Generate and store PDF immediately after contract creation
      try {
        console.log('🎨 Generating PDF for newly created contract...');
        
        // Get user settings for PDF generation
        const userSettings = await storage.getUserSettings(req.session.userId);
        
        // Generate PDF using our enhanced PDF generator
        const { generateContractPDF } = await import('./pdf-generator');
        const pdfBuffer = await generateContractPDF(newContract, userSettings);
        
        console.log('✅ PDF generated successfully, size:', pdfBuffer.length, 'bytes');
        
        // Upload PDF to cloud storage
        const { uploadContractToCloud, uploadContractSigningPage } = await import('./cloud-storage');
        const cloudResult = await uploadContractToCloud(newContract, userSettings);
        
        if (cloudResult.success) {
          console.log('✅ Contract PDF uploaded to cloud storage:', cloudResult.url);
          
          // CRITICAL FIX: Also create and upload signing page to R2
          console.log('📝 Creating contract signing page for R2 cloud storage...');
          const signingPageResult = await uploadContractSigningPage(newContract, userSettings);
          
          if (signingPageResult.success) {
            console.log('✅ Contract signing page uploaded to R2:', signingPageResult.url);
            
            // Update contract with both PDF and signing page URLs
            const updatedContract = await storage.updateContract(newContract.id, {
              cloudStorageUrl: cloudResult.url,
              cloudStorageKey: cloudResult.key,
              signingPageUrl: signingPageResult.url,
              signingPageKey: signingPageResult.storageKey
            });
            
            res.json(updatedContract);
          } else {
            console.log('⚠️ PDF uploaded but signing page upload failed');
            
            // Update contract with just PDF URL
            const updatedContract = await storage.updateContract(newContract.id, {
              cloudStorageUrl: cloudResult.url,
              cloudStorageKey: cloudResult.key
            });
            
            res.json(updatedContract);
          }
        } else {
          console.log('⚠️ PDF generated but cloud upload failed, returning contract without cloud URL');
          res.json(newContract);
        }
        
      } catch (pdfError: any) {
        console.error('⚠️ PDF generation failed, but contract was created:', pdfError.message);
        // Still return the contract even if PDF generation fails
        res.json(newContract);
      }
    } catch (error: any) {
      console.error('❌ Failed to create contract:', error);
      console.error('❌ Contract creation error details:', {
        message: error?.message,
        code: error?.code,
        detail: error?.detail,
        table: error?.table,
        column: error?.column,
        constraint: error?.constraint,
        severity: error?.severity,
        file: error?.file,
        line: error?.line,
        routine: error?.routine
      });
      
      // Provide more specific error messages
      if (error?.code === '23505') {
        res.status(400).json({ error: 'Duplicate contract number detected' });
      } else if (error?.code === '23502') {
        res.status(400).json({ error: 'Missing required field: ' + (error?.column || 'unknown') });
      } else if (error?.code === '22P02') {
        res.status(400).json({ error: 'Invalid data format in request' });
      } else {
        res.status(500).json({ 
          error: 'Failed to create contract',
          details: error?.message || 'Unknown database error'
        });
      }
    }
  });

  // Send contract via email - Frontend-compatible endpoint
  app.post('/api/contracts/send-email', isAuthenticated, async (req: any, res) => {
    try {
      const { contractId, customMessage } = req.body;
      const parsedContractId = parseInt(contractId);
      
      console.log(`📧 Sending contract #${parsedContractId} via send-email endpoint...`);
      
      // Get contract and user settings
      const contract = await storage.getContract(parsedContractId);
      if (!contract) {
        return res.status(404).json({ error: 'Contract not found' });
      }
      
      const userSettings = await storage.getUserSettings(req.session.userId);
      if (!userSettings) {
        return res.status(404).json({ error: 'User settings not found' });
      }
      
      // Import services
      const { MailgunService } = await import('./services');
      const emailService = new MailgunService();
      
      // Generate and upload contract PDF to cloud storage
      const { uploadContractToCloud } = await import('./cloud-storage');
      const { url: pdfUrl } = await uploadContractToCloud(contract, userSettings);
      
      // Update contract with cloud URLs and status
      await storage.updateContract(parsedContractId, {
        status: 'sent',
        cloudStorageUrl: pdfUrl,
        sentAt: new Date()
      });
      
      // Send email with contract
      const subject = `Contract ready for signing - ${contract.contractNumber}`;
      await emailService.sendContractEmail(contract, userSettings, subject, pdfUrl, customMessage);
      
      console.log(`✅ Contract #${parsedContractId} sent successfully via send-email endpoint`);
      res.json({ success: true, message: 'Contract sent successfully' });
      
    } catch (error) {
      console.error('❌ Failed to send contract:', error);
      res.status(500).json({ error: 'Failed to send contract' });
    }
  });

  // Resend contract
  app.post('/api/contracts/:id/resend', isAuthenticated, async (req: any, res) => {
    try {
      const contractId = parseInt(req.params.id);
      const { customMessage } = req.body;
      
      console.log(`📧 Resending contract #${contractId}...`);
      
      const contract = await storage.getContract(contractId);
      if (!contract) {
        return res.status(404).json({ error: 'Contract not found' });
      }
      
      const userSettings = await storage.getUserSettings(req.session.userId);
      
      const { MailgunService } = await import('./services');
      const emailService = new MailgunService();
      
      const subject = `Contract reminder - ${contract.contractNumber}`;
      await emailService.sendContractEmail(contract, userSettings, subject, undefined, customMessage);
      
      console.log(`✅ Contract #${contractId} resent successfully`);
      res.json({ success: true, message: 'Contract resent successfully' });
      
    } catch (error) {
      console.error('❌ Failed to resend contract:', error);
      res.status(500).json({ error: 'Failed to resend contract' });
    }
  });

  // FIXED: Get individual contract with better error handling
  app.get('/api/contracts/:id', isAuthenticated, async (req: any, res) => {
    try {
      console.log(`🔍 Contract fetch request for ID: ${req.params.id}`);
      console.log(`🔍 Session data: userId=${req.session?.userId}, email=${req.session?.email}`);
      
      // Validate contract ID
      const contractId = parseInt(req.params.id);
      if (isNaN(contractId)) {
        console.log(`❌ Invalid contract ID: ${req.params.id}`);
        return res.status(400).json({ error: 'Invalid contract ID' });
      }
      
      const userId = req.session?.userId;
      if (!userId) {
        console.log('❌ No userId in session for contract fetch');
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Get contract from database
      const contract = await storage.getContract(contractId);
      if (!contract) {
        console.log(`❌ Contract #${contractId} not found`);
        return res.status(404).json({ error: 'Contract not found' });
      }
      
      // CRITICAL: Verify user owns this contract
      if (contract.userId !== userId) {
        console.log(`❌ User ${userId} attempted to access contract owned by ${contract.userId}`);
        return res.status(403).json({ error: 'Access denied - you do not own this contract' });
      }
      
      console.log(`✅ Contract #${contractId} found and authorized for user ${userId}`);
      
      // FIXED: Ensure we return JSON with proper headers
      res.setHeader('Content-Type', 'application/json');
      res.status(200).json(contract);
      
    } catch (error: any) {
      console.error('❌ Failed to fetch contract:', error);
      
      // CRITICAL: Always return JSON, never HTML
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ 
        error: 'Internal server error while fetching contract',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Update contract
  app.patch('/api/contracts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const contractId = parseInt(req.params.id);
      const updatedContract = await storage.updateContract(contractId, req.body);
      if (!updatedContract) {
        return res.status(404).json({ error: 'Contract not found' });
      }
      console.log(`✅ Updated contract #${contractId} for user ${req.session.userId}`);
      res.json(updatedContract);
    } catch (error) {
      console.error('❌ Failed to update contract:', error);
      res.status(500).json({ error: 'Failed to update contract' });
    }
  });

  // Delete contract
  app.delete('/api/contracts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const contractId = parseInt(req.params.id);
      await storage.deleteContract(contractId);
      console.log(`✅ Deleted contract #${contractId} for user ${req.session.userId}`);
      res.json({ success: true });
    } catch (error) {
      console.error('❌ Failed to delete contract:', error);
      res.status(500).json({ error: 'Failed to delete contract' });
    }
  });

  // MISSING ENDPOINT: Bulk delete contracts
  app.post('/api/contracts/bulk-delete', isAuthenticated, async (req: any, res) => {
    try {
      const { contractIds } = req.body;
      const userId = req.session.userId;
      
      console.log(`🗑️ Bulk delete request for ${contractIds?.length} contracts by user ${userId}`);
      
      if (!contractIds || !Array.isArray(contractIds) || contractIds.length === 0) {
        return res.status(400).json({ error: 'Contract IDs array is required' });
      }
      
      // Verify all contracts belong to the authenticated user before deletion
      const verificationPromises = contractIds.map(async (contractId: number) => {
        const contract = await storage.getContract(contractId);
        if (!contract) {
          throw new Error(`Contract #${contractId} not found`);
        }
        if (contract.userId !== userId) {
          throw new Error(`Access denied to contract #${contractId}`);
        }
        return contract;
      });
      
      try {
        await Promise.all(verificationPromises);
      } catch (verificationError: any) {
        console.log(`❌ Bulk delete verification failed: ${verificationError.message}`);
        return res.status(403).json({ error: verificationError.message });
      }
      
      // Delete all contracts
      const deletePromises = contractIds.map((contractId: number) => 
        storage.deleteContract(contractId)
      );
      
      await Promise.all(deletePromises);
      
      console.log(`✅ Bulk deleted ${contractIds.length} contracts for user ${userId}`);
      res.json({ 
        success: true, 
        deletedCount: contractIds.length,
        message: `Successfully deleted ${contractIds.length} contract${contractIds.length !== 1 ? 's' : ''}` 
      });
      
    } catch (error: any) {
      console.error('❌ Bulk delete failed:', error);
      res.status(500).json({ 
        error: 'Failed to delete contracts', 
        details: error.message 
      });
    }
  });

  // CRITICAL MISSING ENDPOINT: Contract signing API (PUBLIC ACCESS - no authentication required)
  app.post('/api/contracts/sign/:id', async (req: any, res) => {
    try {
      const contractId = parseInt(req.params.id);
      const { clientSignature, clientIP, clientPhone, clientAddress, venueAddress } = req.body;
      
      console.log(`📝 Contract signing request for ID: ${contractId}`);
      console.log(`📝 Client signature: ${clientSignature}`);
      console.log(`📝 Client IP: ${clientIP}`);
      console.log(`📝 All form data:`, req.body);
      
      if (!clientSignature) {
        return res.status(400).json({ 
          success: false, 
          error: 'Signature is required' 
        });
      }
      
      // Get contract without authentication (public signing)
      const contract = await storage.getContract(contractId);
      if (!contract) {
        return res.status(404).json({ 
          success: false, 
          error: 'Contract not found' 
        });
      }
      
      // Check if already signed
      if (contract.status === 'signed') {
        return res.json({ 
          success: false, 
          alreadySigned: true,
          message: 'This contract has already been signed.' 
        });
      }
      
      // Update contract with additional information from form and sign it
      const updateData: any = {};
      if (clientPhone) updateData.clientPhone = clientPhone;
      if (clientAddress) updateData.clientAddress = clientAddress;
      if (venueAddress) updateData.venueAddress = venueAddress;
      
      // Update contract with additional info if provided
      if (Object.keys(updateData).length > 0) {
        await storage.updateContract(contractId, updateData);
        console.log(`📝 Updated contract with additional info:`, updateData);
      }
      
      // Sign the contract
      const signedContract = await storage.signContract(contractId, {
        clientSignature,
        clientIP: clientIP || 'Unknown',
        signedAt: new Date().toISOString()
      });
      
      // Update associated booking status if exists
      if (contract.enquiryId) {
        try {
          await storage.updateBooking(contract.enquiryId, { status: 'confirmed' });
          console.log(`✅ Updated booking #${contract.enquiryId} status to confirmed`);
        } catch (bookingError) {
          console.log('⚠️ Failed to update booking status:', bookingError);
        }
      }
      
      console.log(`✅ Contract #${contractId} signed successfully`);
      
      // Send confirmation emails
      try {
        const userSettings = await storage.getUserSettings(contract.userId);
        const { MailgunService } = await import('./services');
        const emailService = new MailgunService();
        
        // Upload signed contract to cloud storage with signature details
        const { uploadContractToCloud } = await import('./cloud-storage');
        const signatureDetails = {
          signedAt: signedContract.signedAt ? new Date(signedContract.signedAt) : new Date(),
          signatureName: signedContract.clientSignature || undefined,
          clientIpAddress: signedContract.clientIpAddress || undefined
        };
        const cloudResult = await uploadContractToCloud(signedContract, userSettings, signatureDetails);
        
        if (cloudResult.success) {
          await storage.updateContract(contractId, {
            cloudStorageUrl: cloudResult.url,
            cloudStorageKey: cloudResult.key
          });
        }
        
        // Send confirmation emails to both parties
        await emailService.sendContractConfirmationEmails(signedContract, userSettings, cloudResult.url);
        console.log('✅ Contract confirmation emails sent successfully');
        
      } catch (emailError) {
        console.error('⚠️ Contract signed but email sending failed:', emailError);
      }
      
      res.json({ 
        success: true, 
        message: 'Contract signed successfully! Both parties will receive confirmation emails.',
        contractId: contractId
      });
      
    } catch (error: any) {
      console.error('❌ Contract signing error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to sign contract. Please try again.' 
      });
    }
  });

  // CRITICAL FIX: View contract route for cloud PDF redirect (PUBLIC ACCESS)
  app.get('/view/contracts/:id', async (req: any, res) => {
    try {
      const contractId = parseInt(req.params.id);
      console.log(`🔍 View contract request for ID: ${contractId}`);
      
      // Get contract (no authentication required for viewing signed contracts)
      const contract = await storage.getContract(contractId);
      if (!contract) {
        return res.status(404).send('Contract not found');
      }
      
      // Redirect to cloud storage URL if available
      if (contract.cloudStorageUrl) {
        console.log(`📄 Redirecting to cloud storage: ${contract.cloudStorageUrl}`);
        return res.redirect(contract.cloudStorageUrl);
      }
      
      // Fallback: Generate and serve PDF directly if no cloud URL
      console.log('⚠️ No cloud storage URL, generating PDF on-demand...');
      const userSettings = await storage.getUserSettings(contract.userId);
      const { generateContractPDF } = await import('./pdf-generator');
      const pdfBuffer = await generateContractPDF(contract, userSettings);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="Contract-${contract.contractNumber}.pdf"`);
      res.send(pdfBuffer);
      
    } catch (error) {
      console.error('❌ Failed to view contract:', error);
      res.status(500).send('Contract viewing failed');
    }
  });

  // ===== INVOICES ROUTES =====
  
  // ===== HEALTH CHECK & DIAGNOSTIC ROUTES =====

  // Basic health check - no authentication required
  app.get('/api/health', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      server: 'running',
      environment: process.env.NODE_ENV || 'unknown'
    });
  });

  // Detailed health check with database connectivity
  app.get('/api/health/detailed', async (req, res) => {
    try {
      res.setHeader('Content-Type', 'application/json');
      
      const healthData: any = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        server: 'running',
        environment: process.env.NODE_ENV || 'unknown',
        checks: {}
      };

      // Test database connectivity
      try {
        const stats = await storage.getStats();
        healthData.checks.database = {
          status: 'healthy',
          stats: stats
        };
      } catch (dbError: any) {
        healthData.checks.database = {
          status: 'unhealthy',
          error: dbError.message
        };
        healthData.status = 'degraded';
      }

      // Test cloud storage configuration
      try {
        const { isCloudStorageConfigured } = await import('./cloud-storage');
        healthData.checks.cloudStorage = {
          status: isCloudStorageConfigured() ? 'configured' : 'not_configured'
        };
      } catch (cloudError: any) {
        healthData.checks.cloudStorage = {
          status: 'error',
          error: cloudError.message
        };
      }

      res.json(healthData);
    } catch (error: any) {
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      });
    }
  });

  // Session debugging route
  app.get('/api/debug/session', (req: any, res) => {
    try {
      res.setHeader('Content-Type', 'application/json');
      
      const debugInfo = {
        timestamp: new Date().toISOString(),
        sessionExists: !!req.session,
        userId: req.session?.userId || null,
        email: req.session?.email || null,
        sessionId: req.sessionID || null,
        headers: {
          'user-agent': req.headers['user-agent'],
          'cookie': req.headers.cookie ? '[PRESENT]' : '[MISSING]',
          'content-type': req.headers['content-type'],
          'accept': req.headers.accept
        }
      };

      // Only include full session data in development
      if (process.env.NODE_ENV === 'development') {
        (debugInfo as any).fullSession = req.session;
      }

      res.json(debugInfo);
    } catch (error: any) {
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({
        error: 'Failed to get session debug info',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Contract debugging route - test specific contract access
  app.get('/api/debug/contracts/:id', isAuthenticated, async (req: any, res) => {
    try {
      res.setHeader('Content-Type', 'application/json');
      
      const contractId = parseInt(req.params.id);
      const userId = req.session?.userId;
      
      const debugInfo: any = {
        timestamp: new Date().toISOString(),
        contractId: contractId,
        userId: userId,
        checks: {}
      };

      // Test contract existence
      try {
        const contract = await storage.getContract(contractId);
        
        if (contract) {
          debugInfo.checks.contractExists = {
            status: 'found',
            contractNumber: contract.contractNumber,
            ownerId: contract.userId,
            userOwnsContract: contract.userId === userId,
            contractStatus: contract.status
          };
        } else {
          debugInfo.checks.contractExists = {
            status: 'not_found'
          };
        }
      } catch (dbError: any) {
        debugInfo.checks.contractExists = {
          status: 'error',
          error: dbError.message
        };
      }

      // Test user settings access
      try {
        const userSettings = await storage.getUserSettings(userId);
        debugInfo.checks.userSettings = {
          status: userSettings ? 'found' : 'not_found',
          hasBusinessName: !!userSettings?.businessName
        };
      } catch (settingsError: any) {
        debugInfo.checks.userSettings = {
          status: 'error',
          error: settingsError.message
        };
      }

      res.json(debugInfo);
    } catch (error: any) {
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({
        error: 'Failed to debug contract access',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // ===== PUBLIC INVOICE VIEW ROUTES (NO AUTHENTICATION) =====
  
  // Public invoice viewing route (for clients)
  app.get('/view/invoices/:id', async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      
      if (isNaN(invoiceId)) {
        return res.status(400).json({ error: 'Invalid invoice ID' });
      }
      
      console.log(`👁️ Public invoice view request for ID: ${invoiceId}`);
      
      // Get invoice from database (no user authentication required for public view)
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice) {
        console.log(`❌ Invoice #${invoiceId} not found for public view`);
        return res.status(404).json({ error: 'Invoice not found' });
      }
      
      // If invoice has cloud storage URL, redirect to it directly
      if (invoice.cloudStorageUrl) {
        console.log(`✅ Redirecting to cloud storage for invoice #${invoiceId}: ${invoice.cloudStorageUrl}`);
        return res.redirect(invoice.cloudStorageUrl);
      }
      
      // Fallback: generate PDF on-demand if no cloud URL exists
      try {
        const userSettings = await storage.getUserSettings(invoice.userId);
        const { generateInvoicePDF } = await import('./pdf-generator');
        const pdfBuffer = await generateInvoicePDF(invoice, userSettings);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="invoice-${invoice.invoiceNumber}.pdf"`);
        res.send(pdfBuffer);
        
        console.log(`✅ Generated PDF on-demand for public invoice #${invoiceId}`);
      } catch (pdfError) {
        console.error(`❌ Failed to generate PDF for invoice #${invoiceId}:`, pdfError);
        res.status(500).json({ error: 'Failed to generate invoice PDF' });
      }
      
    } catch (error) {
      console.error('❌ Public invoice view error:', error);
      res.status(500).json({ error: 'Failed to display invoice' });
    }
  });

  // ===== AUTHENTICATED INVOICE ROUTES =====

  // Get all invoices for authenticated user
  app.get('/api/invoices', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const invoices = await storage.getInvoices(userId);
      console.log(`✅ Retrieved ${invoices.length} invoices for user ${userId}`);
      res.json(invoices);
    } catch (error) {
      console.error('❌ Failed to fetch invoices:', error);
      res.status(500).json({ error: 'Failed to fetch invoices' });
    }
  });

  // Create new invoice
  app.post('/api/invoices', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      console.log('📄 Invoice creation request:', {
        body: req.body,
        userId: userId
      });
      
      // Validate required fields
      if (!req.body.clientName || !req.body.issueDate || !req.body.dueDate) {
        return res.status(400).json({ 
          error: 'Missing required fields: clientName, issueDate, and dueDate are required' 
        });
      }

      // Generate invoice number if not provided
      const invoiceNumber = req.body.invoiceNumber || 
        `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

      const invoiceData = {
        userId: userId,
        invoiceNumber,
        clientName: req.body.clientName,
        clientEmail: req.body.clientEmail || null,
        clientAddress: req.body.clientAddress || null,
        clientPhone: req.body.clientPhone || null,
        issueDate: req.body.issueDate,
        dueDate: req.body.dueDate,
        items: req.body.items || [],
        subtotal: req.body.subtotal || "0.00",
        tax: req.body.tax || "0.00",
        total: req.body.total || "0.00",
        notes: req.body.notes || null,
        status: req.body.status || 'draft',
        enquiryId: req.body.enquiryId || null
      };
      
      const newInvoice = await storage.createInvoice(invoiceData);
      console.log(`✅ Created invoice #${newInvoice.id} for user ${userId}`);
      res.json(newInvoice);
      
    } catch (error: any) {
      console.error('❌ Failed to create invoice:', error);
      res.status(500).json({ 
        error: 'Failed to create invoice',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Delete invoice
  app.delete('/api/invoices/:id', isAuthenticated, async (req: any, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const userId = req.session?.userId;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      if (isNaN(invoiceId)) {
        return res.status(400).json({ error: 'Invalid invoice ID' });
      }
      
      // Verify invoice exists and belongs to user
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      
      if (invoice.userId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      await storage.deleteInvoice(invoiceId);
      console.log(`✅ Deleted invoice #${invoiceId} for user ${userId}`);
      res.json({ success: true });
      
    } catch (error: any) {
      console.error('❌ Failed to delete invoice:', error);
      res.status(500).json({ 
        error: 'Failed to delete invoice',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Get individual invoice for viewing
  app.get('/api/invoices/:id/view', isAuthenticated, async (req: any, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const userId = req.session?.userId;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      if (isNaN(invoiceId)) {
        return res.status(400).json({ error: 'Invalid invoice ID' });
      }
      
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      
      // Check if invoice belongs to the authenticated user
      if (invoice.userId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      console.log(`✅ Retrieved invoice #${invoiceId} for user ${userId}`);
      res.json(invoice);
    } catch (error) {
      console.error('❌ Failed to fetch invoice:', error);
      res.status(500).json({ error: 'Failed to fetch invoice' });
    }
  });

  // Get invoice PDF for viewing
  app.get('/api/invoices/:id/pdf', isAuthenticated, async (req: any, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const userId = req.session?.userId;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice || invoice.userId !== userId) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      
      // Generate PDF using the existing PDF generator
      const userSettings = await storage.getUserSettings(userId);
      const { generateInvoicePDF } = await import('./pdf-generator');
      const pdfBuffer = await generateInvoicePDF(invoice, userSettings);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="invoice-${invoice.invoiceNumber}.pdf"`);
      res.send(pdfBuffer);
      
      console.log(`✅ Generated PDF for invoice #${invoiceId}`);
    } catch (error) {
      console.error('❌ Failed to generate invoice PDF:', error);
      res.status(500).json({ error: 'Failed to generate invoice PDF' });
    }
  });

  // Download invoice PDF
  app.get('/api/invoices/:id/download', isAuthenticated, async (req: any, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const userId = req.session?.userId;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice || invoice.userId !== userId) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      
      // Generate PDF using the existing PDF generator
      const userSettings = await storage.getUserSettings(userId);
      const { generateInvoicePDF } = await import('./pdf-generator');
      const pdfBuffer = await generateInvoicePDF(invoice, userSettings);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`);
      res.send(pdfBuffer);
      
      console.log(`✅ Downloaded PDF for invoice #${invoiceId}`);
    } catch (error) {
      console.error('❌ Failed to download invoice PDF:', error);
      res.status(500).json({ error: 'Failed to download invoice PDF' });
    }
  });

  // Regenerate invoice with fresh cloud storage URL
  app.post('/api/invoices/:id/regenerate', isAuthenticated, async (req: any, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const userId = req.session?.userId;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      console.log(`🔄 Regenerating invoice #${invoiceId} with fresh cloud URL...`);
      
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice || invoice.userId !== userId) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      
      // Get user settings and regenerate invoice PDF
      const userSettings = await storage.getUserSettings(userId);
      const { uploadInvoiceToCloud } = await import('./cloud-storage');
      const { url: freshUrl, key } = await uploadInvoiceToCloud(invoice, userSettings);
      
      // Update invoice with fresh cloud URL
      const updatedInvoice = await storage.updateInvoice(invoiceId, {
        cloudStorageUrl: freshUrl,
        cloudStorageKey: key,
        updatedAt: new Date()
      });
      
      console.log(`✅ Invoice #${invoiceId} regenerated with fresh URL: ${freshUrl}`);
      res.json({ success: true, invoice: updatedInvoice, newUrl: freshUrl });
      
    } catch (error) {
      console.error('❌ Failed to regenerate invoice:', error);
      res.status(500).json({ error: 'Failed to regenerate invoice' });
    }
  });

  // Conflicts endpoint - UNIFIED with single data source
  app.get('/api/conflicts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Import booking formatter and conflict detection utilities
      const { formatBookings, hasTimeOverlap } = await import('./booking-formatter');
      
      // Get raw bookings and format them consistently
      const rawBookings = await storage.getBookings(userId);
      const formattedBookings = formatBookings(rawBookings);
      
      const recentBookings = formattedBookings
        .filter((b: any) => b.status !== 'cancelled' && b.status !== 'completed')
        .slice(0, 100); // Limit to 100 active bookings
      
      const conflicts: any[] = [];
      
      // Unified conflict detection using formatted data
      for (let i = 0; i < recentBookings.length; i++) {
        for (let j = i + 1; j < recentBookings.length; j++) {
          const booking1 = recentBookings[i];
          const booking2 = recentBookings[j];
          
          if (!booking1.eventDate || !booking2.eventDate) continue;
          
          const date1 = new Date(booking1.eventDate).toDateString();
          const date2 = new Date(booking2.eventDate).toDateString();
          
          // Check if same date
          if (date1 === date2) {
            // CRITICAL FIX: Missing times should create hard conflicts
            const time1 = booking1.eventTime && booking1.eventEndTime;
            const time2 = booking2.eventTime && booking2.eventEndTime;
            
            let severity = 'soft'; // Default to soft for same day
            let timeOverlap = false;
            
            if (!time1 || !time2) {
              // Missing times = Hard conflict (red)
              severity = 'hard';
              timeOverlap = false;
            } else {
              // Both have times - check for actual overlap
              timeOverlap = hasTimeOverlap(booking1, booking2);
              severity = timeOverlap ? 'hard' : 'soft';
            }
            
            const timeDisplay2 = booking2.eventTime && booking2.eventEndTime 
              ? `${booking2.eventTime} - ${booking2.eventEndTime}`
              : booking2.eventTime || 'Time not specified';
              
            const conflictMessage = timeOverlap 
              ? `Time overlap with ${booking2.clientName} (${timeDisplay2})`
              : `Same day booking with ${booking2.clientName} (${timeDisplay2})`;
            
            // Create conflict entry for booking1 about booking2
            conflicts.push({
              bookingId: booking1.id,
              withBookingId: booking2.id,
              severity,
              clientName: booking2.clientName || 'Unknown Client',
              status: booking2.status || 'new',
              time: timeDisplay2,
              canEdit: true,
              canReject: true,
              type: 'same_day',
              message: conflictMessage,
              date: date1,
              overlapMinutes: timeOverlap ? 60 : undefined
            });
            
            // Create conflict entry for booking2 about booking1
            const timeDisplay1 = booking1.eventTime && booking1.eventEndTime 
              ? `${booking1.eventTime} - ${booking1.eventEndTime}`
              : booking1.eventTime || 'Time not specified';
              
            const reverseMessage = timeOverlap 
              ? `Time overlap with ${booking1.clientName} (${timeDisplay1})`
              : `Same day booking with ${booking1.clientName} (${timeDisplay1})`;
              
            conflicts.push({
              bookingId: booking2.id,
              withBookingId: booking1.id,
              severity,
              clientName: booking1.clientName || 'Unknown Client', 
              status: booking1.status || 'new',
              time: timeDisplay1,
              canEdit: true,
              canReject: true,
              type: 'same_day',
              message: reverseMessage,
              date: date1,
              overlapMinutes: timeOverlap ? 60 : undefined
            });
          }
        }
      }
      
      res.json(conflicts);
    } catch (error) {
      console.error('❌ Conflicts error:', error);
      res.status(500).json({ error: 'Failed to detect conflicts' });
    }
  });

  // ===== CONFLICT RESOLUTION ROUTES =====
  
  // Mark soft conflicts as resolved
  app.post('/api/conflicts/resolve', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const { bookingIds, conflictDate, notes } = req.body;
      
      if (!bookingIds || !Array.isArray(bookingIds) || bookingIds.length < 2) {
        return res.status(400).json({ error: 'At least 2 booking IDs required' });
      }
      
      console.log(`🎯 Resolving conflict for bookings:`, bookingIds, `on date:`, conflictDate);
      
      const resolution = await storage.createConflictResolution(
        userId, 
        bookingIds, 
        new Date(conflictDate), 
        notes
      );
      
      console.log(`✅ Conflict resolved for bookings ${bookingIds.join(', ')}`);
      res.json({ success: true, resolution });
      
    } catch (error: any) {
      console.error('❌ Failed to resolve conflict:', error);
      res.status(500).json({ 
        error: 'Failed to resolve conflict',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });
  
  // Get conflict resolutions for user
  app.get('/api/conflicts/resolutions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const resolutions = await storage.getConflictResolutions(userId);
      res.json(resolutions);
      
    } catch (error: any) {
      console.error('❌ Failed to fetch conflict resolutions:', error);
      res.status(500).json({ 
        error: 'Failed to fetch conflict resolutions',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });
  
  // Delete conflict resolution (unresolve)
  app.delete('/api/conflicts/resolve', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const { bookingIds } = req.body;
      
      if (!bookingIds || !Array.isArray(bookingIds)) {
        return res.status(400).json({ error: 'Booking IDs required' });
      }
      
      console.log(`🎯 Unresolving conflict for bookings:`, bookingIds);
      
      await storage.deleteConflictResolution(userId, bookingIds);
      
      console.log(`✅ Conflict resolution removed for bookings ${bookingIds.join(', ')}`);
      res.json({ success: true });
      
    } catch (error: any) {
      console.error('❌ Failed to unresolve conflict:', error);
      res.status(500).json({ 
        error: 'Failed to unresolve conflict',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });
  
  // ===== ADMIN ROUTES =====
  
  // Admin Overview endpoint
  app.get('/api/admin/overview', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Check if user is admin
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }
      
      const stats = await storage.getStats();
      const overview = {
        totalUsers: stats.userCount || 0,
        totalBookings: stats.bookingCount || 0,
        totalContracts: stats.contractCount || 0,
        totalInvoices: stats.invoiceCount || 0,
        activeUsers: stats.activeUserCount || 0,
        timestamp: new Date().toISOString()
      };
      
      res.json(overview);
    } catch (error: any) {
      console.error('❌ Admin overview error:', error);
      res.status(500).json({ error: 'Failed to fetch admin overview' });
    }
  });

  // Admin Users List endpoint
  app.get('/api/admin/users', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Check if user is admin
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }
      
      const allUsers = await storage.getAllUsers();
      
      // Format users for admin panel
      const formattedUsers = allUsers.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName || user.first_name || '',
        lastName: user.lastName || user.last_name || '', 
        tier: user.tier || 'free',
        isAdmin: user.isAdmin || user.is_admin || false,
        isBetaTester: user.isBetaTester || user.is_beta_tester || false,
        betaStartDate: user.betaStartDate || user.beta_start_date || null,
        betaEndDate: user.betaEndDate || user.beta_end_date || null,
        betaFeedbackCount: user.betaFeedbackCount || user.beta_feedback_count || 0,
        createdAt: user.createdAt || user.created_at || new Date().toISOString()
      }));
      
      console.log(`✅ Retrieved ${formattedUsers.length} users for admin panel`);
      res.json(formattedUsers);
    } catch (error: any) {
      console.error('❌ Admin users error:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  // Admin Create User endpoint
  app.post('/api/admin/users', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Check if user is admin
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }
      
      const { email, firstName, lastName, password, tier, isAdmin, isBetaTester } = req.body;
      console.log('🔍 Admin create user request:', { email, firstName, lastName, tier, isAdmin, isBetaTester });
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }
      
      // Create new user with admin-specified settings - ensure all required fields
      const userData = {
        email: email.trim(),
        firstName: firstName || '',
        lastName: lastName || '',
        password, // This will be hashed by the storage layer
        tier: tier || 'free',
        plan: 'free', // Required field
        isAdmin: Boolean(isAdmin),
        isBetaTester: Boolean(isBetaTester),
        isActive: true, // Default active
        isSubscribed: false, // Default not subscribed
        isLifetime: false, // Default not lifetime
        phoneVerified: false, // Default not verified
        trialStatus: 'inactive', // Default trial status
        accountStatus: 'active', // Default account status
        fraudScore: 0, // Default fraud score
        onboardingCompleted: false, // Default onboarding
        loginAttempts: 0, // Default login attempts
        forcePasswordChange: false, // Default no force change
        betaFeedbackCount: 0, // Default feedback count
        notificationPreferences: { email: true, sms: false, push: true },
        betaStartDate: isBetaTester ? new Date() : null,
        betaEndDate: isBetaTester ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null
      };
      
      console.log('🔍 Creating user with data:', userData);
      const newUser = await storage.createUser(userData);
      
      console.log(`✅ Admin created new user: ${email} (Beta: ${isBetaTester}, Admin: ${isAdmin})`);
      res.json({ 
        success: true, 
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          tier: newUser.tier,
          isAdmin: newUser.isAdmin,
          isBetaTester: newUser.isBetaTester
        }
      });
    } catch (error: any) {
      console.error('❌ Admin create user error:', error.message);
      console.error('❌ Full error:', error);
      res.status(500).json({ error: `Failed to create user: ${error.message}` });
    }
  });

  // Admin Update User endpoint
  app.put('/api/admin/users/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.session?.userId;
      if (!adminUserId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Check if user is admin
      const adminUser = await storage.getUser(adminUserId);
      if (!adminUser?.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }
      
      const { userId } = req.params;
      const { email, firstName, lastName, password, tier, isAdmin, isBetaTester } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }
      
      // Get existing user
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Prepare update data
      const updateData: any = {
        email,
        firstName: firstName || '',
        lastName: lastName || '',
        tier: tier || 'free',
        isAdmin: isAdmin || false,
        isBetaTester: isBetaTester || false
      };
      
      // Only update password if provided
      if (password && password.trim()) {
        updateData.password = password;
      }
      
      // Set beta dates if becoming beta tester
      if (isBetaTester && !existingUser.isBetaTester) {
        updateData.betaStartDate = new Date().toISOString();
        updateData.betaEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      } else if (!isBetaTester && existingUser.isBetaTester) {
        updateData.betaStartDate = null;
        updateData.betaEndDate = null;
      }
      
      const updatedUser = await storage.updateUser(userId, updateData);
      
      console.log(`✅ Admin updated user: ${email} (Beta: ${isBetaTester}, Admin: ${isAdmin})`);
      res.json({ 
        success: true, 
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          tier: updatedUser.tier,
          isAdmin: updatedUser.isAdmin,
          isBetaTester: updatedUser.isBetaTester
        }
      });
    } catch (error: any) {
      console.error('❌ Admin update user error:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  });

  // Admin Delete User endpoint
  app.delete('/api/admin/users/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.session?.userId;
      if (!adminUserId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Check if user is admin
      const adminUser = await storage.getUser(adminUserId);
      if (!adminUser?.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }
      
      const { userId } = req.params;
      
      // Prevent admin from deleting themselves
      if (userId === adminUserId) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
      }
      
      // Get user before deletion for logging
      const userToDelete = await storage.getUser(userId);
      if (!userToDelete) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      await storage.deleteUser(userId);
      
      console.log(`✅ Admin deleted user: ${userToDelete.email}`);
      res.json({ success: true, message: 'User deleted successfully' });
    } catch (error: any) {
      console.error('❌ Admin delete user error:', error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  });

  // Admin Send User Invitation endpoint
  app.post('/api/admin/invite-user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Check if user is admin
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }
      
      const { email, firstName, lastName, tier, isAdmin, isBetaTester, personalMessage } = req.body;
      console.log('🔍 Admin invite user request:', { email, firstName, lastName, tier, isAdmin, isBetaTester });
      
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }
      
      // Generate invitation token
      const { nanoid } = await import('nanoid');
      const inviteToken = nanoid(32);
      const inviteExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      
      // Store invitation in database (we'll need to add an invitations table later)
      const invitationData = {
        token: inviteToken,
        email: email.trim(),
        firstName: firstName || '',
        lastName: lastName || '',
        tier: tier || 'free',
        isAdmin: Boolean(isAdmin),
        isBetaTester: Boolean(isBetaTester),
        personalMessage: personalMessage || '',
        invitedBy: userId,
        expiresAt: inviteExpiry,
        status: 'pending'
      };
      
      // Create invitation link
      const inviteLink = `${process.env.FRONTEND_URL || 'https://musobuddy.replit.app'}/signup?invite=${inviteToken}`;
      
      // Prepare email content
      const emailSubject = `You're invited to join MusoBuddy!`;
      const betaTesterTestCards = isBetaTester ? `
        <div style="background: #e8f4ff; border: 1px solid #0066cc; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #0066cc;">Beta Tester - Payment Testing Information</h3>
          <p style="margin-bottom: 15px;"><strong>Use these test credit cards for subscription testing:</strong></p>
          <div style="font-family: monospace; background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 10px 0;">
            <div style="margin-bottom: 8px;"><strong>Visa (Success):</strong> 4242 4242 4242 4242</div>
            <div style="margin-bottom: 8px;"><strong>Visa (Declined):</strong> 4000 0000 0000 0002</div>
            <div style="margin-bottom: 8px;"><strong>Mastercard:</strong> 5555 5555 5555 4444</div>
            <div style="margin-bottom: 8px;"><strong>American Express:</strong> 3782 8224 6310 005</div>
          </div>
          <p style="color: #666; font-size: 14px; margin-top: 15px;">
            <strong>CVC:</strong> Any 3 digits (4 for Amex)<br>
            <strong>Expiry:</strong> Any future date<br>
            <strong>ZIP:</strong> Any 5 digits
          </p>
        </div>
      ` : '';
      
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to MusoBuddy!</h2>
          
          <p>Hi ${firstName || 'there'},</p>
          
          <p>You've been invited by ${user.firstName || user.email} to join MusoBuddy, the comprehensive music business management platform.</p>
          
          ${personalMessage ? `<div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;"><strong>Personal message:</strong><br>${personalMessage}</div>` : ''}
          
          <div style="background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Your account details:</h3>
            <ul style="list-style: none; padding: 0;">
              <li><strong>Email:</strong> ${email}</li>
              <li><strong>Tier:</strong> ${tier.charAt(0).toUpperCase() + tier.slice(1)}</li>
              ${isBetaTester ? '<li><strong>Special Access:</strong> Beta Tester</li>' : ''}
              ${isAdmin ? '<li><strong>Role:</strong> Administrator</li>' : ''}
            </ul>
          </div>
          
          ${betaTesterTestCards}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteLink}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Accept Invitation</a>
          </div>
          
          <p style="color: #666; font-size: 14px;">This invitation expires in 7 days. If you didn't expect this invitation, you can safely ignore this email.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px;">MusoBuddy - Music Business Management Platform</p>
        </div>
      `;
      
      // Send invitation email
      try {
        await emailService.sendEmail({
          to: email,
          from: process.env.FROM_EMAIL || 'noreply@musobuddy.com',
          subject: emailSubject,
          html: emailHtml
        });
        
        console.log(`✅ Invitation email sent to: ${email}`);
      } catch (emailError) {
        console.error('❌ Failed to send invitation email:', emailError);
        // Continue anyway - we can still create the invitation record
      }
      
      // For now, we'll just log the invitation data since we don't have an invitations table yet
      console.log('📧 Invitation created:', invitationData);
      console.log('🔗 Invitation link:', inviteLink);
      
      console.log(`✅ Admin sent invitation to: ${email} (Beta: ${isBetaTester}, Admin: ${isAdmin})`);
      res.json({ 
        success: true, 
        message: 'Invitation sent successfully',
        inviteLink: inviteLink // Include for admin reference
      });
    } catch (error: any) {
      console.error('❌ Admin invite user error:', error.message);
      console.error('❌ Full error:', error);
      res.status(500).json({ error: `Failed to send invitation: ${error.message}` });
    }
  });

  // Enhanced error logging middleware
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('🔥 Server Error:', {
      error: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      headers: req.headers,
      body: req.body,
      session: req.session ? {
        userId: req.session.userId,
        email: req.session.email
      } : null,
      timestamp: new Date().toISOString()
    });

    // Always return JSON for API routes
    if (req.path.startsWith('/api/')) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
        path: req.path,
        timestamp: new Date().toISOString()
      });
    }

    // For non-API routes, use default error handling
    next(err);
  });

  // ===== COMPLIANCE ROUTES =====

  // Get all compliance documents for authenticated user
  app.get('/api/compliance', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      console.log(`📋 Fetching compliance documents for user: ${userId}`);
      
      const documents = await storage.getCompliance(userId);
      
      console.log(`✅ Retrieved ${documents.length} compliance documents for user ${userId}`);
      res.json(documents);
      
    } catch (error: any) {
      console.error('❌ Failed to fetch compliance documents:', error);
      res.status(500).json({ 
        error: 'Failed to fetch compliance documents',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Create new compliance document
  app.post('/api/compliance', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      console.log(`📋 Creating compliance document for user: ${userId}`, req.body);
      
      const documentData = {
        ...req.body,
        userId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const newDocument = await storage.createCompliance(documentData);
      
      console.log(`✅ Created compliance document for user ${userId}`);
      res.json(newDocument);
      
    } catch (error: any) {
      console.error('❌ Failed to create compliance document:', error);
      res.status(500).json({ 
        error: 'Failed to create compliance document',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Upload compliance document file
  app.post('/api/compliance/upload', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      console.log(`📋 Uploading compliance document for user: ${userId}`);
      
      // Handle file upload using multer or similar
      // This is a placeholder - you'll need to implement file upload logic
      
      if (!req.body || !req.body.documentFile) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      // TODO: Implement file upload to cloud storage
      // For now, return success with placeholder data
      
      const documentData = {
        userId,
        type: req.body.type,
        name: req.body.name,
        expiryDate: req.body.expiryDate ? new Date(req.body.expiryDate) : null,
        status: 'valid',
        documentUrl: 'placeholder-url', // Replace with actual uploaded file URL
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const newDocument = await storage.createCompliance(documentData);
      
      console.log(`✅ Uploaded compliance document for user ${userId}`);
      res.json(newDocument);
      
    } catch (error: any) {
      console.error('❌ Failed to upload compliance document:', error);
      res.status(500).json({ 
        error: 'Failed to upload compliance document',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Update compliance document
  app.patch('/api/compliance/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      const documentId = parseInt(req.params.id);
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      if (isNaN(documentId)) {
        return res.status(400).json({ error: 'Invalid document ID' });
      }
      
      console.log(`📋 Updating compliance document #${documentId} for user: ${userId}`);
      
      const updatedDocument = await storage.updateCompliance(documentId, {
        ...req.body,
        updatedAt: new Date()
      });
      
      if (!updatedDocument) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      console.log(`✅ Updated compliance document #${documentId} for user ${userId}`);
      res.json(updatedDocument);
      
    } catch (error: any) {
      console.error('❌ Failed to update compliance document:', error);
      res.status(500).json({ 
        error: 'Failed to update compliance document',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Delete compliance document
  app.delete('/api/compliance/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      const documentId = parseInt(req.params.id);
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      if (isNaN(documentId)) {
        return res.status(400).json({ error: 'Invalid document ID' });
      }
      
      console.log(`📋 Deleting compliance document #${documentId} for user: ${userId}`);
      
      await storage.deleteCompliance(documentId, userId);
      
      console.log(`✅ Deleted compliance document #${documentId} for user ${userId}`);
      res.json({ success: true });
      
    } catch (error: any) {
      console.error('❌ Failed to delete compliance document:', error);
      res.status(500).json({ 
        error: 'Failed to delete compliance document',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // ===== AI RESPONSE GENERATION ROUTES (MINIMAL WORKING VERSION) =====
  
  // Simple test to verify AI system is reachable
  app.get('/api/ai/status', (req, res) => {
    try {
      res.json({
        status: 'AI routes loaded',
        timestamp: new Date().toISOString(),
        openaiConfigured: !!process.env.OPENAI_API_KEY
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // AI diagnostic endpoint - simplified
  app.get('/api/ai/diagnostic', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const diagnostic = {
        timestamp: new Date().toISOString(),
        userId: userId,
        checks: {
          apiKey: {
            configured: !!process.env.OPENAI_API_KEY,
            status: process.env.OPENAI_API_KEY ? 'present' : 'missing'
          },
          authentication: {
            status: 'working',
            userId: userId
          }
        }
      };

      // Try to import AI module
      try {
        const aiModule = await import('./ai-response-generator');
        diagnostic.checks.aiModule = {
          status: !!aiModule.aiResponseGenerator ? 'loaded' : 'missing'
        };
      } catch (importError: any) {
        diagnostic.checks.aiModule = {
          status: 'import_failed',
          error: importError.message
        };
      }

      // Try to get user settings
      try {
        const userSettings = await storage.getUserSettings(userId);
        diagnostic.checks.userSettings = {
          status: !!userSettings ? 'loaded' : 'missing',
          hasInstrument: !!userSettings?.primaryInstrument
        };
      } catch (settingsError: any) {
        diagnostic.checks.userSettings = {
          status: 'error',
          error: settingsError.message
        };
      }

      res.json(diagnostic);
      
    } catch (error: any) {
      console.error('❌ AI diagnostic error:', error);
      res.status(500).json({
        error: 'Diagnostic failed',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Simple AI test endpoint
  app.post('/api/ai/test', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      console.log(`🧪 AI test endpoint called by user: ${userId}`);
      
      // Import and test the AI generator with minimal request
      const { aiResponseGenerator } = await import('./ai-response-generator');
      
      const testResponse = await aiResponseGenerator.generateEmailResponse({
        action: 'respond',
        customPrompt: 'Generate a simple professional thank you message for a wedding inquiry.',
        tone: 'professional'
      });
      
      console.log('✅ AI test successful:', testResponse);
      
      res.json({
        success: true,
        test: 'AI generation working',
        response: testResponse,
        timestamp: new Date().toISOString()
      });
      
    } catch (error: any) {
      console.error('❌ AI test failed:', error);
      
      res.status(500).json({
        success: false,
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Generate AI response for templates
  app.post('/api/ai/generate-response', isAuthenticated, async (req: any, res) => {
    // Set extended timeout for AI requests
    const timeout = 120000; // 2 minutes
    req.setTimeout(timeout);
    res.setTimeout(timeout);
    
    try {
      const userId = req.session?.userId;
      
      if (!userId) {
        console.log('❌ AI request without authentication');
        return res.status(401).json({ error: 'Authentication required' });
      }

      console.log(`🤖 AI response generation request for user: ${userId}`);
      console.log(`🤖 Request body:`, { 
        action: req.body.action, 
        bookingId: req.body.bookingId, 
        hasCustomPrompt: !!req.body.customPrompt,
        tone: req.body.tone,
        timestamp: new Date().toISOString()
      });

      // Import the AI generator with proper error handling
      let aiResponseGenerator;
      try {
        const aiModule = await import('./ai-response-generator');
        aiResponseGenerator = aiModule.aiResponseGenerator;
        
        if (!aiResponseGenerator) {
          throw new Error('AI response generator not found in module');
        }
        
        console.log('✅ AI response generator imported successfully');
      } catch (importError: any) {
        console.error('❌ Failed to import AI response generator:', importError);
        return res.status(500).json({ 
          error: 'AI service initialization failed',
          details: process.env.NODE_ENV === 'development' ? importError.message : 'Internal server error'
        });
      }

      const { action, bookingId, customPrompt, tone, travelExpense } = req.body;

      // Get booking context if bookingId provided
      let bookingContext = null;
      if (bookingId) {
        try {
          console.log(`🔍 Fetching booking context for ID: ${bookingId}`);
          const booking = await storage.getBooking(parseInt(bookingId));
          if (booking) {
            bookingContext = {
              clientName: booking.clientName,
              eventDate: booking.eventDate,
              eventTime: booking.eventTime,
              eventEndTime: booking.eventEndTime,
              venue: booking.venue,
              eventType: booking.eventType,
              gigType: booking.gigType,
              fee: booking.fee,
              performanceDuration: booking.performanceDuration,
              styles: booking.styles,
              equipment: (booking as any).equipment || null,
              additionalInfo: (booking as any).additionalInfo || null,
              travelExpense: booking.travelExpense || (travelExpense ? parseFloat(travelExpense) : null)
            };
            console.log(`✅ Booking context loaded:`, { 
              clientName: bookingContext.clientName, 
              eventType: bookingContext.eventType,
              gigType: bookingContext.gigType 
            });
          } else {
            console.log(`⚠️ Booking #${bookingId} not found`);
          }
        } catch (bookingError: any) {
          console.error('❌ Error fetching booking:', bookingError);
          // Continue without booking context rather than failing
          bookingContext = null;
        }
      }

      // Get user settings for personalization
      let userSettings = null;
      try {
        console.log(`🔍 Fetching user settings for user: ${userId}`);
        userSettings = await storage.getUserSettings(userId);
        console.log(`✅ User settings loaded:`, { 
          primaryInstrument: userSettings?.primaryInstrument,
          businessName: userSettings?.businessName,
          hasBusinessEmail: !!userSettings?.businessEmail
        });
      } catch (settingsError: any) {
        console.error('❌ Error fetching user settings:', settingsError);
        // Continue without user settings rather than failing
        userSettings = null;
      }
      
      // Validate request parameters
      if (!action) {
        return res.status(400).json({ 
          error: 'Missing required parameter: action' 
        });
      }

      if (!customPrompt && !bookingContext) {
        return res.status(400).json({ 
          error: 'Either customPrompt or bookingId is required for AI generation' 
        });
      }
      
      console.log(`🤖 Calling AI response generator with validated params...`);
      
      // Call AI service with comprehensive error handling
      const response = await aiResponseGenerator.generateEmailResponse({
        action: action || 'respond',
        bookingContext: bookingContext || undefined,
        userSettings: userSettings || undefined,
        customPrompt,
        tone: tone || 'professional'
      });

      console.log(`✅ AI response generated successfully for user ${userId}`);
      
      // Validate response before sending
      if (!response || !response.subject || !response.emailBody) {
        console.error('❌ Invalid AI response structure:', response);
        return res.status(500).json({ 
          error: 'AI service returned invalid response format' 
        });
      }
      
      // Ensure we set proper content type and return success
      res.setHeader('Content-Type', 'application/json');
      res.status(200).json({
        subject: response.subject,
        emailBody: response.emailBody,
        smsBody: response.smsBody || 'Thank you for your booking inquiry!',
        generatedAt: new Date().toISOString()
      });
      
    } catch (error: any) {
      console.error('❌ AI response generation failed:', error);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ Full error object:', JSON.stringify(error, null, 2));
      
      // Determine error type and provide appropriate response
      let errorMessage = 'Failed to generate AI response';
      let statusCode = 500;
      
      if (error.message?.includes('API key')) {
        errorMessage = 'AI service configuration error';
        statusCode = 503;
      } else if (error.message?.includes('rate limit')) {
        errorMessage = 'AI service rate limit exceeded. Please try again in a moment.';
        statusCode = 429;
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'AI request timed out. Please try again.';
        statusCode = 504;
      } else if (error.message?.includes('quota')) {
        errorMessage = 'AI service quota exceeded';
        statusCode = 503;
      } else if (error.message?.includes('network') || error.message?.includes('connection')) {
        errorMessage = 'Network error connecting to AI service';
        statusCode = 503;
      }
      
      // Ensure we always return JSON
      res.setHeader('Content-Type', 'application/json');
      res.status(statusCode).json({ 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
      });
    }
  });

  // AI System Diagnostic endpoint
  app.get('/api/ai/diagnostic', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      console.log(`🔍 AI diagnostic request from user: ${userId}`);
      
      const diagnostic: any = {
        timestamp: new Date().toISOString(),
        userId: userId,
        checks: {}
      };

      // Check 1: OpenAI API Key
      try {
        const apiKey = process.env.OPENAI_API_KEY;
        diagnostic.checks.apiKey = {
          configured: !!apiKey,
          length: apiKey?.length || 0,
          startsCorrectly: apiKey?.startsWith('sk-') || false,
          status: !apiKey ? 'missing' : 
                  !apiKey.startsWith('sk-') ? 'invalid_format' :
                  apiKey.length < 20 ? 'too_short' : 'valid'
        };
      } catch (error: any) {
        diagnostic.checks.apiKey = {
          status: 'error',
          error: error.message
        };
      }

      // Check 2: AI Module Import
      try {
        const aiModule = await import('./ai-response-generator');
        const generator = aiModule.aiResponseGenerator;
        
        diagnostic.checks.aiModule = {
          importSuccess: true,
          generatorExists: !!generator,
          generatorType: typeof generator,
          status: !!generator ? 'available' : 'missing'
        };
      } catch (error: any) {
        diagnostic.checks.aiModule = {
          importSuccess: false,
          error: error.message,
          status: 'import_failed'
        };
      }

      // Check 3: User Settings
      try {
        const userSettings = await storage.getUserSettings(userId);
        diagnostic.checks.userSettings = {
          exists: !!userSettings,
          hasBusinessName: !!userSettings?.businessName,
          hasInstrument: !!userSettings?.primaryInstrument,
          instrument: userSettings?.primaryInstrument || 'none',
          status: !!userSettings ? 'loaded' : 'missing'
        };
      } catch (error: any) {
        diagnostic.checks.userSettings = {
          status: 'error',
          error: error.message
        };
      }

      // Check 4: Test OpenAI Connection (if API key is valid)
      if (diagnostic.checks.apiKey?.status === 'valid') {
        try {
          console.log('🧪 Testing OpenAI connection...');
          
          // Import and test the AI generator
          const { aiResponseGenerator } = await import('./ai-response-generator');
          
          // Test with minimal request
          const testResponse = await aiResponseGenerator.generateEmailResponse({
            action: 'respond',
            customPrompt: 'Generate a simple professional thank you message.',
            tone: 'professional'
          });
          
          diagnostic.checks.openaiConnection = {
            connectionSuccess: true,
            responseReceived: !!testResponse,
            hasSubject: !!testResponse?.subject,
            hasBody: !!testResponse?.emailBody,
            status: 'working'
          };
          
        } catch (error: any) {
          diagnostic.checks.openaiConnection = {
            connectionSuccess: false,
            error: error.message,
            errorType: error.constructor.name,
            status: 'failed'
          };
        }
      } else {
        diagnostic.checks.openaiConnection = {
          status: 'skipped',
          reason: 'API key not valid'
        };
      }

      // Overall status
      const allChecks = Object.values(diagnostic.checks);
      const hasErrors = allChecks.some((check: any) => 
        check.status === 'error' || 
        check.status === 'failed' || 
        check.status === 'missing' ||
        check.status === 'import_failed'
      );
      
      diagnostic.overallStatus = hasErrors ? 'issues_detected' : 'healthy';
      diagnostic.summary = {
        apiKeyValid: diagnostic.checks.apiKey?.status === 'valid',
        moduleLoaded: diagnostic.checks.aiModule?.status === 'available',
        userSettingsLoaded: diagnostic.checks.userSettings?.status === 'loaded',
        openaiWorking: diagnostic.checks.openaiConnection?.status === 'working'
      };

      console.log(`✅ AI diagnostic completed for user ${userId}:`, diagnostic.overallStatus);
      
      res.setHeader('Content-Type', 'application/json');
      res.json(diagnostic);
      
    } catch (error: any) {
      console.error('❌ AI diagnostic failed:', error);
      
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({
        error: 'Diagnostic failed',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Generate template variations using AI
  app.post('/api/ai/template-variations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      console.log(`🤖 Template variations request for user: ${userId}`);
      
      const { templateName, templateBody, count = 3 } = req.body;

      if (!templateName || !templateBody) {
        return res.status(400).json({ error: 'Template name and body required' });
      }

      console.log(`🤖 Template variations request for user: ${userId}, template: ${templateName}`);
      
      const variations = await aiResponseGenerator.generateTemplateVariations(
        templateName,
        templateBody,
        Math.min(count, 5) // Limit to 5 variations max
      );

      console.log(`✅ Generated ${variations.length} template variations for user ${userId}`);
      res.json({ variations });
      
    } catch (error: any) {
      console.error('❌ Template variations generation failed:', error);
      res.status(500).json({ 
        error: 'Failed to generate template variations',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  });

  // Removed AI gig suggestions endpoint - feature moved to documentation

  // Catch-all middleware to ensure API routes always return JSON
  app.use('/api/*', (req: any, res: any) => {
    res.setHeader('Content-Type', 'application/json');
    res.status(404).json({
      error: 'API endpoint not found',
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  });

  console.log('✅ Clean routes registered successfully');
}