import { type Express } from "express";
import path from "path";
import { storage } from "./storage";
// Session middleware imported inline
// ProductionAuthSystem removed - using direct route registration
import { generalApiRateLimit, slowDownMiddleware } from './rate-limiting.js';

// OPTIMIZED AUTHENTICATION MIDDLEWARE - No logging
const isAuthenticated = (req: any, res: any, next: any) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
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
        const { generateProfessionalContractPDF } = await import('./pdf-generator');
        const pdfBuffer = await generateProfessionalContractPDF(newContract, userSettings);
        
        console.log('✅ PDF generated successfully, size:', pdfBuffer.length, 'bytes');
        
        // Upload PDF to cloud storage
        const { uploadContractToCloud } = await import('./cloud-storage');
        const cloudResult = await uploadContractToCloud(newContract, userSettings);
        
        if (cloudResult.success) {
          // Update contract with cloud storage URL
          const updatedContract = await storage.updateContract(newContract.id, {
            cloudStorageUrl: cloudResult.url,
            cloudStorageKey: cloudResult.key
          });
          
          console.log('✅ Contract PDF uploaded to cloud storage:', cloudResult.url);
          res.json(updatedContract);
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
      const subject = customMessage || `Contract ready for signing - ${contract.contractNumber}`;
      await emailService.sendContractEmail(contract, userSettings, subject, pdfUrl);
      
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
      
      const subject = customMessage || `Contract reminder - ${contract.contractNumber}`;
      await emailService.sendContractEmail(contract, userSettings, subject);
      
      console.log(`✅ Contract #${contractId} resent successfully`);
      res.json({ success: true, message: 'Contract resent successfully' });
      
    } catch (error) {
      console.error('❌ Failed to resend contract:', error);
      res.status(500).json({ error: 'Failed to resend contract' });
    }
  });

  // Get individual contract
  app.get('/api/contracts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const contractId = parseInt(req.params.id);
      const contract = await storage.getContract(contractId);
      if (!contract) {
        return res.status(404).json({ error: 'Contract not found' });
      }
      res.json(contract);
    } catch (error) {
      console.error('❌ Failed to fetch contract:', error);
      res.status(500).json({ error: 'Failed to fetch contract' });
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

  // ===== INVOICES ROUTES =====
  
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
            const time1 = booking1.eventStartTime && booking1.eventFinishTime;
            const time2 = booking2.eventStartTime && booking2.eventFinishTime;
            
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
            
            const timeDisplay2 = booking2.eventStartTime && booking2.eventFinishTime 
              ? `${booking2.eventStartTime} - ${booking2.eventFinishTime}`
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
            const timeDisplay1 = booking1.eventStartTime && booking1.eventFinishTime 
              ? `${booking1.eventStartTime} - ${booking1.eventFinishTime}`
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
  
  console.log('✅ Clean routes registered successfully');
}