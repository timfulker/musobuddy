import { type Express } from "express";
import path from "path";
import { storage } from "./storage";
// Session middleware imported inline
// ProductionAuthSystem removed - using direct route registration
import { generalApiRateLimit, slowDownMiddleware } from './rate-limiting.js';

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

  // ===== SETTINGS API =====
  app.get('/api/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      console.log(`⚙️ Fetching settings for user: ${userId}`);
      
      const settings = await storage.getUserSettings(userId);
      
      if (!settings) {
        // Return default empty settings instead of 404
        console.log(`📝 No settings found for user ${userId}, returning defaults`);
        return res.json({
          userId: userId,
          businessName: '',
          businessEmail: '',
          businessAddress: '',
          phone: '',
          website: '',
          bankDetails: '',
          defaultTerms: ''
        });
      }
      
      console.log(`✅ Settings found for user ${userId}`);
      res.json(settings);
      
    } catch (error: any) {
      console.error('❌ Failed to fetch user settings:', error);
      res.status(500).json({ 
        error: 'Failed to fetch user settings',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

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
      
      // CRITICAL PERFORMANCE FIX: Limit to 50 most recent bookings
      const limit = parseInt(req.query.limit as string) || 50;
      const rawBookings = await storage.getBookings(userId);
      
      // Sort by date and limit results to prevent system overload
      const recentBookings = rawBookings
        .sort((a: any, b: any) => new Date(b.eventDate || 0).getTime() - new Date(a.eventDate || 0).getTime())
        .slice(0, limit);
      
      // Format bookings consistently
      const formattedBookings = formatBookings(recentBookings);
      
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