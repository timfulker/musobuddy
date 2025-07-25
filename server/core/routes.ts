import { type Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { isAuthenticated, isAdmin, isBetaTester, isAdminOrBetaTester } from "./auth-clean";
import { mailgunService, contractParserService, cloudStorageService } from "./services";
import { webhookService } from "./webhook-service";
import { generateHTMLContractPDF } from "./html-contract-template.js";
import { stripeService } from "./stripe-service";
import { emailOnboarding } from "./email-onboarding";
import { db } from "./database";
import { users, bookings, contracts, invoices, feedback, phoneVerifications, fraudPreventionLog, trialTracking } from "../../shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import multer from "multer";
import path from "path";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, and DOCX files are allowed'));
    }
  }
});

export async function registerRoutes(app: Express) {
  // ===== SAAS SIGNUP ROUTES =====
  
  // User signup with phone verification
  app.post('/api/auth/signup', async (req: any, res) => {
    try {
      const { firstName, lastName, email, phoneNumber, password } = req.body;
      
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'Email address already in use' });
      }

      // Check if phone number already exists
      const existingPhone = await db.select().from(users).where(eq(users.phoneNumber, phoneNumber));
      if (existingPhone.length > 0) {
        return res.status(400).json({ error: 'Phone number already in use' });
      }

      // Basic fraud prevention
      const signupIp = req.ip || req.connection.remoteAddress;
      const deviceFingerprint = req.headers['user-agent'] || '';
      
      // Create user account
      const newUser = await storage.createUser({
        email,
        firstName,
        lastName,
        password, // Let storage handle hashing
        phoneNumber,
        phoneVerified: false,
        trialStatus: 'inactive',
        accountStatus: 'active',
        signupIpAddress: signupIp,
        deviceFingerprint,
        fraudScore: 0,
        onboardingCompleted: false,
        tier: 'free',
        plan: 'free',
        isSubscribed: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      const userId = newUser.id;

      // Generate and send phone verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store verification code (in production, use SMS service)
      await db.insert(phoneVerifications).values({
        phoneNumber,
        verificationCode,
        expiresAt,
        ipAddress: signupIp || '',
        userAgent: deviceFingerprint || '',
        attempts: 0,
      });

      // Log fraud prevention
      await db.insert(fraudPreventionLog).values({
        phoneNumber,
        emailAddress: email,
        ipAddress: signupIp,
        deviceFingerprint,
        actionTaken: 'account_created',
        reason: 'new_signup',
        riskScore: 0,
      });

      console.log(`📱 Verification code for ${phoneNumber}: ${verificationCode}`);
      
      res.json({ 
        userId, 
        message: 'Account created successfully. Please verify your phone number.',
        // In production, remove this and send via SMS
        verificationCode 
      });

    } catch (error: any) {
      console.error('❌ Signup error:', error);
      res.status(500).json({ error: 'Failed to create account' });
    }
  });

  // Verify phone number
  app.post('/api/auth/verify-phone', async (req: any, res) => {
    try {
      const { userId, verificationCode } = req.body;
      
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (user.phoneVerified) {
        return res.status(400).json({ error: 'Phone number already verified' });
      }

      // Check verification code
      const verification = await db.select()
        .from(phoneVerifications)
        .where(eq(phoneVerifications.phoneNumber, user.phoneNumber || ''))
        .orderBy(desc(phoneVerifications.createdAt))
        .limit(1);

      if (verification.length === 0) {
        return res.status(400).json({ error: 'No verification code found' });
      }

      const record = verification[0];
      if (record.expiresAt && record.expiresAt < new Date()) {
        return res.status(400).json({ error: 'Verification code expired' });
      }

      if (record.verificationCode !== verificationCode) {
        // Increment attempts
        await db.update(phoneVerifications)
          .set({ attempts: (record.attempts || 0) + 1 })
          .where(eq(phoneVerifications.id, record.id));
          
        return res.status(400).json({ error: 'Invalid verification code' });
      }

      // Mark phone as verified
      await storage.updateUser(userId, {
        phoneVerified: true,
        phoneVerifiedAt: new Date(),
      });

      // Mark verification as used
      await db.update(phoneVerifications)
        .set({ verifiedAt: new Date() })
        .where(eq(phoneVerifications.id, record.id));

      res.json({ success: true, message: 'Phone number verified successfully' });

    } catch (error: any) {
      console.error('❌ Phone verification error:', error);
      res.status(500).json({ error: 'Failed to verify phone number' });
    }
  });

  // Resend verification code
  app.post('/api/auth/resend-verification', async (req: any, res) => {
    try {
      const { userId } = req.body;
      
      const user = await storage.getUserById(userId);
      if (!user || user.phoneVerified) {
        return res.status(400).json({ error: 'Invalid request' });
      }

      // Generate new verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await db.insert(phoneVerifications).values({
        phoneNumber: user.phoneNumber || '',
        verificationCode,
        expiresAt,
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
        attempts: 0,
      });

      console.log(`📱 New verification code for ${user.phoneNumber}: ${verificationCode}`);
      
      res.json({ 
        success: true, 
        message: 'Verification code sent',
        // In production, remove this
        verificationCode 
      });

    } catch (error: any) {
      console.error('❌ Resend verification error:', error);
      res.status(500).json({ error: 'Failed to resend verification code' });
    }
  });

  // Complete onboarding
  app.post('/api/auth/complete-onboarding', async (req: any, res) => {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID required' });
      }

      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Mark onboarding as completed
      await storage.updateUser(userId, {
        onboardingCompleted: true,
        onboardingCompletedAt: new Date(),
      });

      res.json({ 
        success: true,
        message: 'Onboarding completed successfully' 
      });

    } catch (error: any) {
      console.error('❌ Complete onboarding error:', error);
      res.status(500).json({ error: 'Failed to complete onboarding' });
    }
  });

  // Start trial (create Stripe checkout session)
  app.post('/api/auth/start-trial', async (req: any, res) => {
    try {
      const { userId } = req.body;
      
      const user = await storage.getUserById(userId);
      if (!user || !user.phoneVerified) {
        return res.status(400).json({ error: 'Phone verification required' });
      }

      if (user.trialStatus !== 'inactive') {
        return res.status(400).json({ error: 'Trial already started' });
      }

      // Create Stripe checkout session
      const checkoutSession = await stripeService.createTrialCheckoutSession(userId);
      
      // Update user trial status
      const trialStartDate = new Date();
      const trialEndDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days

      await storage.updateUser(userId, {
        trialStatus: 'active',
        trialStartedAt: trialStartDate,
        trialExpiresAt: trialEndDate,
        plan: 'core',
      });

      // Log trial start
      await db.insert(trialTracking).values({
        userId,
        trialStartedAt: trialStartDate,
        trialExpiresAt: trialEndDate,
        trialStatus: 'active',
      });

      res.json({ 
        success: true,
        checkoutUrl: checkoutSession.url,
        sessionId: checkoutSession.sessionId
      });

    } catch (error: any) {
      console.error('❌ Start trial error:', error);
      res.status(500).json({ error: 'Failed to start trial' });
    }
  });

  // ===== EMAIL ONBOARDING ROUTES =====
  
  // Check email prefix availability (like Gmail signup)
  app.post('/api/email/check-availability', isAuthenticated, async (req: any, res) => {
    try {
      const { prefix } = req.body;
      
      if (!prefix) {
        return res.status(400).json({ error: 'Email prefix is required' });
      }

      // Validate format first
      const validation = await emailOnboarding.validateEmailPrefix(prefix);
      if (!validation.valid) {
        return res.json({ 
          available: false, 
          error: validation.error 
        });
      }

      // Check availability
      const availability = await emailOnboarding.checkEmailPrefixAvailability(prefix);
      
      res.json({
        available: availability.available,
        suggestion: availability.suggestion,
        fullEmail: availability.available ? `leads+${prefix.toLowerCase()}@mg.musobuddy.com` : null
      });
      
    } catch (error: any) {
      console.error('❌ Email availability check error:', error);
      res.status(500).json({ error: 'Failed to check email availability' });
    }
  });

  // Assign email prefix to user (one-time only)
  app.post('/api/email/assign-prefix', isAuthenticated, async (req: any, res) => {
    try {
      const { prefix } = req.body;
      const userId = req.user.id;
      
      if (!prefix) {
        return res.status(400).json({ error: 'Email prefix is required' });
      }

      // Check if user already has an email prefix
      const currentUser = await storage.getUserById(userId);
      if (currentUser?.emailPrefix) {
        return res.status(400).json({ 
          error: 'Email address already assigned. Contact support if you need to change it.' 
        });
      }

      const result = await emailOnboarding.assignEmailPrefixToUser(userId, prefix);
      
      if (result.success) {
        res.json({
          success: true,
          email: result.email,
          message: 'Email address assigned successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
      
    } catch (error: any) {
      console.error('❌ Email assignment error:', error);
      res.status(500).json({ error: 'Failed to assign email prefix' });
    }
  });

  // Get user's current email address
  app.get('/api/email/my-address', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const email = await emailOnboarding.getUserEmail(userId);
      
      if (email) {
        res.json({ email });
      } else {
        res.json({ email: null, needsSetup: true });
      }
      
    } catch (error: any) {
      console.error('❌ Get user email error:', error);
      res.status(500).json({ error: 'Failed to get user email' });
    }
  });

  // ===== AUTH ROUTES =====
  // Email/password login endpoint
  app.post('/api/auth/login', async (req: any, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email and password are required' 
        });
      }

      // Authenticate user
      const user = await storage.authenticateUser(email, password);
      
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid email or password' 
        });
      }

      // Set session
      req.session.userId = user.id;
      req.session.user = user;
      
      console.log('✅ User logged in:', user.email);
      res.json({ 
        success: true, 
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          tier: user.tier,
          isAdmin: user.isAdmin
        }
      });
    } catch (error) {
      console.error('❌ Login error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Login failed' 
      });
    }
  });

  // Logout endpoint
  app.post('/api/auth/logout', (req: any, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.json({ success: true, message: 'Logged out successfully' });
    });
  });

  app.get('/api/auth/user', async (req: any, res) => {
    try {
      console.log('🔍 Auth check - Session ID:', req.session?.id);
      console.log('🔍 Auth check - User ID in session:', req.session?.userId);
      console.log('🔍 Auth check - Has req.user:', !!req.user);
      console.log('🔍 Auth check - Cookie header:', req.headers.cookie);
      
      if (req.user) {
        console.log('✅ User authenticated:', req.user.email);
        res.json({
          id: req.user.id,
          email: req.user.email,
          firstName: req.user.firstName,
          lastName: req.user.lastName,
          tier: req.user.tier || 'free',
          isAdmin: req.user.isAdmin || false
        });
      } else {
        console.log('❌ User not authenticated - no req.user found');
        res.status(401).json({ error: 'Not authenticated' });
      }
    } catch (error) {
      console.error('Auth user error:', error);
      res.status(500).json({ error: 'Authentication error' });
    }
  });

  // ===== FRESH ADMIN ROUTES =====
  app.get('/api/admin/overview', isAdmin, async (req: any, res: any) => {
    try {
      const [userCount, bookingCount, contractCount, invoiceCount] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(users),
        db.select({ count: sql<number>`count(*)` }).from(bookings),
        db.select({ count: sql<number>`count(*)` }).from(contracts),
        db.select({ count: sql<number>`count(*)` }).from(invoices)
      ]);

      res.json({
        totalUsers: userCount[0].count,
        totalBookings: bookingCount[0].count,
        totalContracts: contractCount[0].count,
        totalInvoices: invoiceCount[0].count,
        systemHealth: 'operational'
      });
    } catch (error) {
      console.error('Admin overview error:', error);
      res.status(500).json({ error: 'Failed to fetch overview' });
    }
  });

  app.get('/api/admin/users', isAdmin, async (req: any, res: any) => {
    try {
      const allUsers = await storage.getAllUsers();
      
      const userList = allUsers.map((user: any) => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        tier: user.tier || 'free',
        isAdmin: user.isAdmin || false,
        createdAt: user.createdAt?.toISOString() || new Date().toISOString()
      }));

      res.json(userList);
    } catch (error) {
      console.error('Admin users error:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  // Add new user (admin only)
  app.post('/api/admin/users', isAdmin, async (req: any, res: any) => {
    try {
      const { email, firstName, lastName, password, tier = 'free', isAdmin = false, isBetaTester = false } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      // Generate a simple user ID for admin-created users
      const userId = 'admin_' + Date.now().toString();
      
      // Set up beta testing dates if this is a beta tester
      const betaStartDate = isBetaTester ? new Date() : null;
      const betaEndDate = isBetaTester ? new Date(Date.now() + (4 * 7 * 24 * 60 * 60 * 1000)) : null; // 4 weeks from now
      
      const newUser = await storage.createUser({
        id: userId,
        email,
        firstName: firstName || null,
        lastName: lastName || null,
        password,
        tier: isBetaTester ? 'premium' : tier, // Beta testers get premium access
        isAdmin,
        isBetaTester,
        betaStartDate,
        betaEndDate,
        betaFeedbackCount: 0,
        isLifetime: isBetaTester, // Beta testers get lifetime access after successful completion
        isSubscribed: isBetaTester, // Beta testers are considered subscribed
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      res.json({
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        tier: newUser.tier,
        isAdmin: newUser.isAdmin,
        createdAt: newUser.createdAt?.toISOString(),
        loginInstructions: `User can login at /login with email: ${email} and the password you provided.`
      });
    } catch (error) {
      console.error('Admin create user error:', error);
      res.status(500).json({ error: 'Failed to create user' });
    }
  });

  // Delete user (admin only)
  app.delete('/api/admin/users/:id', isAdmin, async (req: any, res: any) => {
    try {
      const { id } = req.params;
      
      // Prevent admin from deleting themselves
      if (id === req.user.id) {
        return res.status(400).json({ error: 'Cannot delete your own admin account' });
      }
      
      const deletedUser = await storage.deleteUser(id);
      
      if (!deletedUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Admin delete user error:', error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  });



  // ===== FEEDBACK ROUTES (BETA TESTERS ONLY) =====
  
  // Get all feedback (admin only - can see all feedback)
  app.get('/api/feedback', isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.user.id;
      
      if (req.user.isAdmin) {
        // Admin can see all feedback with user information
        const allFeedback = await db
          .select({
            id: feedback.id,
            userId: feedback.userId,
            type: feedback.type,
            title: feedback.title,
            description: feedback.description,
            priority: feedback.priority,
            status: feedback.status,
            page: feedback.page,
            adminNotes: feedback.adminNotes,
            resolvedAt: feedback.resolvedAt,
            createdAt: feedback.createdAt,
            updatedAt: feedback.updatedAt,
            userName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
            userEmail: users.email
          })
          .from(feedback)
          .leftJoin(users, eq(feedback.userId, users.id))
          .orderBy(sql`${feedback.createdAt} DESC`);
        
        res.json(allFeedback);
      } else if (req.user.isBetaTester) {
        // Beta testers can only see their own feedback
        const userFeedback = await db
          .select()
          .from(feedback)
          .where(eq(feedback.userId, userId))
          .orderBy(sql`${feedback.createdAt} DESC`);
        
        res.json(userFeedback);
      } else {
        // Non-beta testers have no access
        res.status(403).json({ error: 'Beta tester access required' });
      }
    } catch (error) {
      console.error('❌ Feedback fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch feedback' });
    }
  });

  // Create feedback (beta testers only)
  app.post('/api/feedback', isAdminOrBetaTester, async (req: any, res: any) => {
    try {
      const { type, title, description, priority = 'medium', page } = req.body;
      const userId = req.user.id;

      if (!type || !title || !description) {
        return res.status(400).json({ error: 'Type, title, and description are required' });
      }

      const newFeedback = await db.insert(feedback).values({
        userId,
        type,
        title,
        description,
        priority,
        page,
        status: 'open',
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      // Update beta tester feedback count
      if (req.user.isBetaTester) {
        await db
          .update(users)
          .set({ 
            betaFeedbackCount: sql`${users.betaFeedbackCount} + 1`
          })
          .where(eq(users.id, userId));
      }

      console.log('✅ New feedback created:', newFeedback[0]);
      res.json(newFeedback[0]);
    } catch (error) {
      console.error('❌ Feedback creation error:', error);
      res.status(500).json({ error: 'Failed to create feedback' });
    }
  });

  // Update feedback status (admin only)
  app.patch('/api/feedback/:id', isAdmin, async (req: any, res: any) => {
    try {
      const feedbackId = parseInt(req.params.id);
      const { status, adminNotes } = req.body;

      const updateData: any = { updatedAt: new Date() };
      if (status) updateData.status = status;
      if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
      if (status === 'resolved') updateData.resolvedAt = new Date();

      const updatedFeedback = await db
        .update(feedback)
        .set(updateData)
        .where(eq(feedback.id, feedbackId))
        .returning();

      if (updatedFeedback.length === 0) {
        return res.status(404).json({ error: 'Feedback not found' });
      }

      res.json(updatedFeedback[0]);
    } catch (error) {
      console.error('❌ Feedback update error:', error);
      res.status(500).json({ error: 'Failed to update feedback' });
    }
  });

  const server = createServer(app);

  // ===== STRIPE SUBSCRIPTION ROUTES =====
  
  // Create Stripe checkout session (AUTHENTICATED)
  app.post('/api/create-checkout-session', isAuthenticated, async (req, res) => {
    try {
      const { priceId = 'core_monthly' } = req.body;
      const result = await stripeService.createCheckoutSession(req.user.id, priceId);
      res.json(result);
    } catch (error: any) {
      console.error('Checkout session error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Stripe webhook (PUBLIC - Stripe needs to access this)
  app.post('/api/stripe-webhook', 
    (req, res, next) => {
      // Store original req.body as buffer for Stripe webhook verification
      req.body = req.body;
      next();
    },
    async (req, res) => {
      try {
        const signature = req.headers['stripe-signature'] as string;
        await stripeService.handleWebhook(req.body, signature);
        res.json({ received: true });
      } catch (error: any) {
        console.error('Webhook error:', error);
        res.status(400).json({ error: error.message });
      }
    }
  );

  // Get subscription status (AUTHENTICATED)
  app.get('/api/subscription/status', isAuthenticated, async (req, res) => {
    try {
      const status = await stripeService.getSubscriptionStatus(req.user.id);
      res.json(status);
    } catch (error: any) {
      console.error('Subscription status error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Subscription success page
  app.get('/subscription/success', (req, res) => {
    res.send(`
      <html>
        <head><title>Subscription Successful</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: #4CAF50;">🎉 Welcome to MusoBuddy Core!</h1>
          <p>Your subscription has been activated successfully.</p>
          <a href="/" style="background: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px;">Return to Dashboard</a>
        </body>
      </html>
    `);
  });

  // Subscription cancelled page
  app.get('/subscription/cancelled', (req, res) => {
    res.send(`
      <html>
        <head><title>Subscription Cancelled</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: #f44336;">Subscription Cancelled</h1>
          <p>Your subscription was not completed. You can try again anytime.</p>
          <a href="/" style="background: #2196F3; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px;">Return to Dashboard</a>
        </body>
      </html>
    `);
  });

  // ===== PUBLIC CONTRACT SIGNING ROUTES (MUST BE FIRST - NO AUTHENTICATION) =====

  // Contract signing OPTIONS (PUBLIC - for CORS)
  app.options('/api/contracts/sign/:id', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.status(200).end();
  });

  // Regenerate signing page with correct URL (AUTHENTICATED)
  app.post('/api/contracts/:id/regenerate-signing-page', isAuthenticated, async (req, res) => {
    try {
      const contractId = parseInt(req.params.id);
      const contract = await storage.getContractById(contractId);
      
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      // Get user settings for business name
      const userSettings = await storage.getSettings(contract.userId);
      
      // Upload new signing page to cloud with correct URL
      const result = await cloudStorageService.uploadContractSigningPage(contract, userSettings);
      
      // Update contract with new signing page URL
      await storage.updateContract(contractId, {
        signingPageUrl: result.url,
        signingPageKey: result.key
      });

      res.json({ 
        success: true, 
        signingPageUrl: result.url,
        message: "Signing page regenerated with correct server URL"
      });
    } catch (error) {
      console.error('Error regenerating signing page:', error);
      res.status(500).json({ message: "Failed to regenerate signing page" });
    }
  });

  // Contract signing API (PUBLIC)
  app.post('/api/contracts/sign/:id', async (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    try {
      console.log('🔥 CONTRACT SIGNING: Starting contract signing process');
      const contractId = parseInt(req.params.id);
      const { signatureName, clientName, signature, clientPhone, clientAddress, venueAddress } = req.body;

      const finalSignatureName = signatureName || clientName;

      if (!finalSignatureName || !finalSignatureName.trim()) {
        return res.status(400).json({ message: "Signature name is required" });
      }

      // Get contract and verify it can be signed
      const contract = await storage.getContractById(contractId);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      // CRITICAL FIX: Check if already signed
      if (contract.status === 'signed') {
        console.log('🔥 CONTRACT SIGNING: ERROR - Contract already signed');
        return res.status(400).json({ 
          message: "Contract has already been signed",
          alreadySigned: true,
          signedAt: contract.signedAt,
          signedBy: contract.clientName
        });
      }

      if (contract.status !== 'sent') {
        return res.status(400).json({ message: "Contract is not available for signing" });
      }

      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

      // Prepare signature details
      const signatureDetails = {
        signedAt: new Date(),
        signatureName: finalSignatureName.trim(),
        clientIpAddress: clientIP
      };

      // Sign contract in database
      const signedContract = await storage.signContract(contractId, {
        signatureName: finalSignatureName.trim(),
        clientIP,
        signedAt: signatureDetails.signedAt,
        clientPhone: clientPhone?.trim(),
        clientAddress: clientAddress?.trim(),
        venueAddress: venueAddress?.trim()
      });

      if (!signedContract) {
        return res.status(500).json({ message: "Failed to sign contract" });
      }

      // CRITICAL: Upload signed contract to cloud storage and send emails
      try {
        const userSettings = await storage.getSettings(contract.userId);

        // Upload signed contract PDF to cloud storage
        const { uploadContractToCloud } = await import('./cloud-storage');
        const cloudResult = await uploadContractToCloud(signedContract, userSettings, signatureDetails);

        if (cloudResult.success && cloudResult.url) {
          // Update contract with cloud storage URL for signed PDF
          await storage.updateContract(contractId, {
            cloudStorageUrl: cloudResult.url,
            cloudStorageKey: cloudResult.key,
            signingUrlCreatedAt: new Date()
          });
          console.log('✅ Signed contract uploaded to cloud storage:', cloudResult.url);
        }

        // Send confirmation emails
        const { sendContractConfirmationEmails } = await import('./mailgun-email-restored');
        await sendContractConfirmationEmails(signedContract, userSettings);

        // AUTOMATIC STATUS UPDATE: Update booking status to 'confirmed' when contract is signed
        if (signedContract.enquiryId) {
          try {
            await storage.updateBooking(signedContract.enquiryId, { status: 'confirmed' });
            console.log('✅ AUTO-UPDATE: Booking status changed to "confirmed" after contract signing for booking:', signedContract.enquiryId);
          } catch (bookingError) {
            console.error('❌ Failed to auto-update booking status for booking:', signedContract.enquiryId, bookingError);
          }
        } else {
          console.log('⚠️ No enquiryId found on signed contract - cannot auto-update booking status');
        }

      } catch (emailError: any) {
        console.error('❌ Email/cloud error (contract still signed):', emailError);
      }

      return res.json({
        success: true,
        message: "Contract signed successfully! Both parties have been notified.",
        signedAt: signatureDetails.signedAt,
        signedBy: finalSignatureName.trim()
      });

    } catch (error: any) {
      console.error('❌ Contract signing error:', error);
      return res.status(500).json({ 
        message: "An error occurred while signing the contract. Please try again." 
      });
    }
  });

  // Contract signing page (PUBLIC)
  app.get('/contracts/sign/:id', async (req, res) => {
    try {
      console.log('🎯 CONTRACT SIGNING ROUTE HIT:', req.params.id);
      const contractId = parseInt(req.params.id);

      if (isNaN(contractId)) {
        return res.status(400).send('<h1>Invalid Contract ID</h1>');
      }

      // Check if contract exists
      const contract = await storage.getContractById(contractId);
      if (!contract) {
        return res.status(404).send('<h1>Contract Not Found</h1>');
      }

      // CRITICAL: If already signed, show "already signed" page
      if (contract.status === 'signed') {
        const alreadySignedHtml = generateAlreadySignedPage(contract);
        return res.send(alreadySignedHtml);
      }

      // Get user settings for branding
      const userSettings = await storage.getSettings(contract.userId);

      // Generate contract signing page
      const signingPageHTML = generateContractSigningPage(contract, userSettings);
      res.send(signingPageHTML);

    } catch (error: any) {
      console.error('❌ Contract signing page error:', error);
      res.status(500).send('<h1>Server Error</h1><p>Unable to load contract signing page.</p>');
    }
  });

  // Contract status check route for signing pages (PUBLIC)
  app.get('/api/contracts/:id/status', async (req, res) => {
    try {
      const contractId = parseInt(req.params.id);
      const contract = await storage.getContractById(contractId);

      if (!contract) {
        return res.status(404).json({ error: 'Contract not found' });
      }

      res.json({ 
        status: contract.status,
        signed: contract.status === 'signed',
        signedAt: contract.signedAt 
      });
    } catch (error) {
      console.error('Error checking contract status:', error);
      res.status(500).json({ error: 'Failed to check contract status' });
    }
  });

  // Public contract view route - UPDATED for cloud storage
  app.get('/api/contracts/public/:id', async (req, res) => {
    try {
      const contract = await storage.getContract(parseInt(req.params.id));
      if (!contract) {
        return res.status(404).json({ message: 'Contract not found' });
      }

      // Return contract data for public viewing (exclude sensitive fields)
      const publicContract = {
        ...contract,
        // Ensure cloud storage URLs are available
        cloudStorageUrl: contract.cloudStorageUrl,
        signingPageUrl: contract.signingPageUrl
      };

      res.json(publicContract);
    } catch (error) {
      res.status(500).json({ error: 'Failed to load contract' });
    }
  });

  // ===== CONTRACT ROUTES (AUTHENTICATED) =====

  // Get contracts
  app.get('/api/contracts', isAuthenticated, async (req: any, res) => {
    try {
      const contracts = await storage.getContracts(req.user.id);
      res.json(contracts);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch contracts' });
    }
  });

  // Create contract - UPDATED to always use cloud storage
  app.post('/api/contracts', isAuthenticated, async (req: any, res) => {
    try {
      // Sanitize and prepare contract data
      const sanitizedData = { ...req.body, userId: req.user.id };

      // Handle numeric fields properly
      if (sanitizedData.fee === '' || sanitizedData.fee === undefined) {
        sanitizedData.fee = '0.00';
      }
      if (sanitizedData.deposit === '' || sanitizedData.deposit === undefined) {
        sanitizedData.deposit = '0.00';
      }

      // Handle optional fields - set empty strings to null
      ['venue', 'eventTime', 'eventEndTime', 'clientAddress', 'clientPhone', 'venueAddress'].forEach(field => {
        if (sanitizedData[field] === '') {
          sanitizedData[field] = null;
        }
      });

      // Auto-generate unique contract number if not provided
      if (!sanitizedData.contractNumber || sanitizedData.contractNumber === '') {
        const eventDate = new Date(sanitizedData.eventDate);
        const dateStr = eventDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
        let baseContractNumber = `(${dateStr} - ${sanitizedData.clientName})`;
        
        // Check if contract number already exists and add suffix if needed
        let contractNumber = baseContractNumber;
        let suffix = 1;
        
        try {
          const existingContracts = await storage.getContracts(req.user.id);
          while (existingContracts.some(contract => contract.contractNumber === contractNumber)) {
            contractNumber = `${baseContractNumber} - ${suffix}`;
            suffix++;
          }
          sanitizedData.contractNumber = contractNumber;
        } catch (error) {
          // If check fails, use base number and let database handle duplicate constraint
          sanitizedData.contractNumber = baseContractNumber;
        }
      }

      // Create contract in database
      const contract = await storage.createContract(sanitizedData);
      console.log('✅ Contract created in database:', contract.id);

      // CRITICAL: Always upload to cloud storage for client access
      try {
        const userSettings = await storage.getSettings(req.user.id);
        const { uploadContractToCloud, uploadContractSigningPage } = await import('./cloud-storage');

        // Upload draft contract PDF to cloud storage
        console.log('☁️ Uploading draft contract PDF to cloud storage...');
        const contractPdfResult = await uploadContractToCloud(contract, userSettings);

        // Upload contract signing page to cloud storage
        console.log('☁️ Uploading contract signing page to cloud storage...');
        const signingPageResult = await uploadContractSigningPage(contract, userSettings);

        // Update contract with cloud storage URLs
        const updateData: any = {};

        if (contractPdfResult.success && contractPdfResult.url) {
          updateData.cloudStorageUrl = contractPdfResult.url;
          updateData.cloudStorageKey = contractPdfResult.key;
          console.log('📄 Contract PDF uploaded to cloud:', contractPdfResult.url);
        }

        if (signingPageResult.success && signingPageResult.url) {
          updateData.signingPageUrl = signingPageResult.url;
          updateData.signingPageKey = signingPageResult.storageKey;
          updateData.signingUrlCreatedAt = new Date();
          console.log('📝 Signing page uploaded to cloud:', signingPageResult.url);
        }

        if (Object.keys(updateData).length > 0) {
          const updatedContract = await storage.updateContract(contract.id, updateData, req.user.id);
          console.log('✅ Contract updated with cloud storage URLs');
          res.json(updatedContract);
        } else {
          console.warn('⚠️ No cloud storage URLs to update');
          res.json(contract);
        }

      } catch (storageError: any) {
        console.error('❌ CRITICAL: Cloud storage upload failed:', storageError);
        console.error('❌ Contract will be created without cloud storage');
        res.json(contract); // Still return the contract
      }
    } catch (error) {
      console.error('Contract creation error:', error);
      res.status(500).json({ error: 'Failed to create contract' });
    }
  });

  // Send contract email - FIXED to use correct email function
  app.post('/api/contracts/send-email', isAuthenticated, async (req: any, res) => {
    try {
      console.log('📧 Contract email route called with body:', req.body);

      const { contractId, customMessage } = req.body;

      if (!contractId) {
        return res.status(400).json({ error: 'Contract ID is required' });
      }

      const contract = await storage.getContract(contractId);

      if (!contract) {
        console.log('❌ Contract not found:', contractId);
        return res.status(404).json({ error: 'Contract not found' });
      }

      if (!contract.clientEmail) {
        console.log('❌ No client email for contract:', contractId);
        return res.status(400).json({ error: 'Contract has no client email address' });
      }

      const userSettings = await storage.getSettings(req.user.id);

      // CRITICAL: Use cloud storage signing page URL
      let signingUrl = contract.signingPageUrl || contract.cloudStorageUrl;

      // If no cloud storage URL exists, create one NOW
      if (!signingUrl) {
        console.log('🔗 No cloud storage URL found, creating one now...');
        const { uploadContractSigningPage } = await import('./cloud-storage');
        const result = await uploadContractSigningPage(contract, userSettings);

        if (result.success && result.url) {
          // Update contract with cloud storage info
          await storage.updateContract(contract.id, {
            signingPageUrl: result.url,
            signingPageKey: result.storageKey,
            signingUrlCreatedAt: new Date()
          }, req.user.id);

          signingUrl = result.url;
          console.log('✅ Created cloud-hosted signing URL:', signingUrl);
        } else {
          return res.status(500).json({ error: 'Failed to create signing page' });
        }
      }

      // ISSUE 2 FIX: Check if contract is already signed and regenerate signing page
      if (contract.status === 'signed') {
        console.log('⚠️ Contract already signed - regenerating already-signed page');
        const { uploadContractSigningPage } = await import('./cloud-storage');
        const pageResult = await uploadContractSigningPage(contract, userSettings);
        
        if (pageResult.success && pageResult.url) {
          await storage.updateContract(contract.id, {
            signingPageUrl: pageResult.url,
            signingPageKey: pageResult.storageKey,
            signingUrlCreatedAt: new Date()
          }, req.user.id);
          signingUrl = pageResult.url;
        }
      }

      console.log('📧 Sending contract SIGNING email with cloud-hosted signing page:', signingUrl);

      // CRITICAL FIX: Import and call the correct function for SIGNING emails
      const { sendContractEmail } = await import('./mailgun-email-restored');
      const emailSubject = customMessage || `Contract ready for signing - ${contract.contractNumber}`;

      // FIXED: This should send "please sign" email, not "signed" confirmation
      console.log('📧 CALLING sendContractEmail for SIGNING (not confirmation)');
      const emailResult = await sendContractEmail(contract, userSettings, emailSubject, signingUrl);

      // Update contract status to 'sent' when email is successfully sent
      if (emailResult.success) {
        await storage.updateContract(contractId, {
          status: 'sent',
          sentAt: new Date()
        }, req.user.id);

        console.log('✅ Contract SIGNING email sent successfully for contract:', contractId);
        console.log('✅ Contract status updated to: sent');
        res.json({ 
          success: true,
          message: 'Contract signing email sent successfully via Mailgun',
          recipient: contract.clientEmail,
          messageId: emailResult?.messageId || 'No ID returned',
          signingUrl: signingUrl
        });
      } else {
        console.error('❌ Contract SIGNING email failed:', emailResult.diagnostics);
        res.status(500).json({ 
          error: 'Failed to send contract signing email',
          details: emailResult.diagnostics?.error
        });
      }

    } catch (error: any) {
      console.error('❌ Contract email error:', error);
      res.status(500).json({ 
        error: 'Failed to send contract email',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // INVOICE EMAIL SENDING - COPIED FROM CONTRACT PATTERN
  app.post('/api/invoices/send-email', isAuthenticated, async (req: any, res) => {
    try {
      console.log('📧 Invoice email route called with body:', req.body);

      const { invoiceId, customMessage } = req.body;

      if (!invoiceId) {
        return res.status(400).json({ error: 'Invoice ID is required' });
      }

      const invoice = await storage.getInvoice(invoiceId);

      if (!invoice) {
        console.log('❌ Invoice not found:', invoiceId);
        return res.status(404).json({ error: 'Invoice not found' });
      }

      if (!invoice.clientEmail) {
        console.log('❌ No client email for invoice:', invoiceId);
        return res.status(400).json({ error: 'Invoice has no client email address' });
      }

      const userSettings = await storage.getSettings(req.user.id);

      // Upload invoice PDF to cloud storage
      const { uploadInvoiceToCloud } = await import('./cloud-storage');
      const result = await uploadInvoiceToCloud(invoice, userSettings);

      if (!result.success || !result.url) {
        return res.status(500).json({ error: 'Failed to upload invoice to cloud storage' });
      }

      // Update invoice with cloud storage URL
      const updatedInvoice = await storage.updateInvoice(invoice.id, {
        cloudStorageUrl: result.url,
        cloudStorageKey: result.key,
        uploadedAt: new Date()
      });

      console.log('📧 Sending invoice email with cloud-hosted PDF:', result.url);

      // Send email with R2 PDF link (same pattern as contracts)
      const { sendInvoiceEmail } = await import('./mailgun-email-restored');
      const emailSubject = customMessage || `Invoice ${invoice.invoiceNumber} - View and Download`;

      const emailResult = await sendInvoiceEmail(invoice, userSettings, emailSubject, result.url);

      // Update invoice status to 'sent' when email is successfully sent
      if (emailResult.success) {
        await storage.updateInvoice(invoiceId, {
          status: 'sent',
          sentAt: new Date()
        });

        console.log('✅ Invoice email sent successfully for invoice:', invoiceId);
        console.log('✅ Invoice status updated to: sent');
        res.json({ 
          success: true,
          message: 'Invoice email sent successfully with view link',
          recipient: invoice.clientEmail,
          messageId: emailResult?.messageId || 'No ID returned',
          viewUrl: result.url
        });
      } else {
        console.error('❌ Invoice email failed:', emailResult.diagnostics);
        res.status(500).json({ 
          error: 'Failed to send invoice email',
          details: emailResult.diagnostics?.error
        });
      }

    } catch (error: any) {
      console.error('❌ Invoice email error:', error);
      res.status(500).json({ 
        error: 'Failed to send invoice email',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // INVOICE MARK AS PAID - SIMPLE STATUS UPDATE
  app.post('/api/invoices/:id/mark-paid', isAuthenticated, async (req: any, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      console.log('💰 Mark invoice as paid:', invoiceId);

      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      const updatedInvoice = await storage.updateInvoice(invoiceId, {
        status: 'paid',
        paidAt: new Date()
      });

      console.log('✅ Invoice marked as paid:', invoiceId);
      res.json({ 
        success: true,
        message: 'Invoice marked as paid successfully',
        invoice: updatedInvoice
      });

    } catch (error: any) {
      console.error('❌ Mark paid error:', error);
      res.status(500).json({ 
        error: 'Failed to mark invoice as paid',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // PUBLIC CONTRACT VIEWING WITH DOWNLOAD BUTTON
  app.get('/view/contracts/:id', async (req, res) => {
    try {
      const contractId = parseInt(req.params.id);
      console.log('👁️ Public contract view request for ID:', contractId);

      const contract = await storage.getContract(contractId);
      if (!contract) {
        return res.status(404).send(`
          <!DOCTYPE html>
          <html>
          <head><title>Contract Not Found</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #dc2626;">Contract Not Found</h1>
            <p>The contract you're looking for could not be found.</p>
            <a href="/" style="color: #2563eb;">← Back to Home</a>
          </body>
          </html>
        `);
      }

      // If contract has cloud storage URL, redirect to it
      if (contract.cloudStorageUrl) {
        console.log('📄 Redirecting to cloud storage URL:', contract.cloudStorageUrl);
        return res.redirect(contract.cloudStorageUrl);
      }

      // Fallback: generate and serve contract PDF directly
      console.log('📄 Generating contract PDF for viewing...');
      const userSettings = await storage.getSettings(contract.userId);
      const { generateContractPDF } = await import('./pdf-generator');
      
      const pdfBuffer = await generateContractPDF(contract, userSettings);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="Contract-${contract.contractNumber}.pdf"`);
      res.send(pdfBuffer);

    } catch (error: any) {
      console.error('❌ Contract view error:', error);
      res.status(500).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Error</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: #dc2626;">Server Error</h1>
          <p>Unable to load contract. Please try again later.</p>
          <a href="/" style="color: #2563eb;">← Back to Home</a>
        </body>
        </html>
      `);
    }
  });

  // PUBLIC INVOICE VIEWING WITH DOWNLOAD BUTTON
  app.get('/view/invoices/:id', async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      console.log('👁️ Public invoice view request for ID:', invoiceId);

      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice) {
        return res.status(404).send(`
          <!DOCTYPE html>
          <html>
          <head><title>Invoice Not Found</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #dc2626;">Invoice Not Found</h1>
            <p>The invoice you're looking for could not be found.</p>
            <a href="/" style="color: #2563eb;">← Back to Home</a>
          </body>
          </html>
        `);
      }

      const userSettings = await storage.getSettings(invoice.userId);
      const businessName = userSettings?.businessName || 'MusoBuddy';

      // Generate HTML page with embedded PDF and download button
      const invoiceViewingPage = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invoice #${invoice.invoiceNumber} | ${businessName}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
              min-height: 100vh;
              display: flex;
              flex-direction: column;
            }
            
            .header {
              background: white;
              padding: 20px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              text-align: center;
            }
            
            .header h1 {
              color: #2563eb;
              font-size: 28px;
              margin-bottom: 10px;
            }
            
            .header p {
              color: #6b7280;
              font-size: 16px;
            }
            
            .container {
              flex: 1;
              max-width: 1200px;
              margin: 0 auto;
              padding: 20px;
              display: flex;
              flex-direction: column;
              gap: 20px;
            }
            
            .invoice-details {
              background: white;
              padding: 20px;
              border-radius: 10px;
              box-shadow: 0 4px 15px rgba(0,0,0,0.1);
              display: flex;
              justify-content: space-between;
              align-items: center;
              flex-wrap: wrap;
              gap: 20px;
            }
            
            .invoice-info {
              display: flex;
              gap: 40px;
              flex-wrap: wrap;
            }
            
            .info-item {
              text-align: left;
            }
            
            .info-label {
              font-size: 12px;
              color: #6b7280;
              text-transform: uppercase;
              font-weight: 600;
              margin-bottom: 5px;
            }
            
            .info-value {
              font-size: 16px;
              color: #111827;
              font-weight: 500;
            }
            
            .amount {
              font-size: 24px;
              color: #059669;
              font-weight: bold;
            }
            
            .download-section {
              display: flex;
              gap: 15px;
              align-items: center;
            }
            
            .download-btn {
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              color: white;
              padding: 12px 24px;
              border: none;
              border-radius: 8px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              display: flex;
              align-items: center;
              gap: 8px;
              transition: all 0.3s ease;
              text-decoration: none;
            }
            
            .download-btn:hover {
              transform: translateY(-2px);
              box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
            }
            
            .pdf-container {
              background: white;
              border-radius: 10px;
              box-shadow: 0 4px 15px rgba(0,0,0,0.1);
              overflow: hidden;
              flex: 1;
              min-height: 800px;
            }
            
            .pdf-frame {
              width: 100%;
              height: 800px;
              border: none;
            }
            
            .status-badge {
              padding: 6px 12px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 600;
              text-transform: uppercase;
            }
            
            .status-paid {
              background: #d1fae5;
              color: #065f46;
            }
            
            .status-sent {
              background: #dbeafe;
              color: #1e40af;
            }
            
            .status-draft {
              background: #f3f4f6;
              color: #374151;
            }
            
            .status-overdue {
              background: #fee2e2;
              color: #991b1b;
            }
            
            @media (max-width: 768px) {
              .container {
                padding: 10px;
              }
              
              .invoice-details {
                flex-direction: column;
                text-align: center;
              }
              
              .invoice-info {
                justify-content: center;
                gap: 20px;
              }
              
              .header h1 {
                font-size: 24px;
              }
              
              .pdf-frame {
                height: 600px;
              }
              
              /* Override download section for invoice page */
              .download-section {
                display: flex !important;
                flex-direction: column !important;
                gap: 15px !important;
                align-items: center !important;
                background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
                padding: 25px !important;
                border-radius: 12px !important;
                margin-bottom: 20px !important;
                box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3) !important;
              }
              
              .download-instruction {
                color: white;
                font-size: 16px;
                font-weight: 600;
                text-align: center;
              }
              
              .download-btn {
                background: white !important;
                color: #059669 !important;
                padding: 16px 32px !important;
                border: 3px solid #059669 !important;
                border-radius: 10px !important;
                font-size: 18px !important;
                font-weight: bold !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Invoice #${invoice.invoiceNumber}</h1>
            <p>From ${businessName}</p>
          </div>
          
          <div class="container">
            <div class="invoice-details">
              <div class="invoice-info">
                <div class="info-item">
                  <div class="info-label">Client</div>
                  <div class="info-value">${invoice.clientName}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Date</div>
                  <div class="info-value">${invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString('en-GB') : 'Not set'}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Due Date</div>
                  <div class="info-value">${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-GB') : 'Not set'}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Amount</div>
                  <div class="info-value amount">£${Number(invoice.amount).toLocaleString()}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Status</div>
                  <div class="status-badge status-${invoice.status}">
                    ${invoice.status === 'paid' ? '✅ Paid' : 
                      invoice.status === 'sent' ? '📧 Sent' : 
                      invoice.status === 'overdue' ? '⚠️ Overdue' : 
                      '📄 Draft'}
                  </div>
                </div>
              </div>
              
              <div class="download-section">
                <div class="download-instruction">
                  💾 To save this invoice to your computer, click the download button below:
                </div>
                <a href="/download/invoices/${invoice.id}" class="download-btn" download onclick="window.location.href=this.href; return false;">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7,10 12,15 17,10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Download Invoice PDF
                </a>
                <div style="font-size: 14px; color: white; text-align: center; margin-top: 10px;">
                  This will save the PDF file to your Downloads folder
                </div>
              </div>
            </div>
            
            <div class="pdf-container">
              <iframe 
                src="${invoice.cloudStorageUrl || `/download/invoices/${invoice.id}`}" 
                class="pdf-frame"
                title="Invoice #${invoice.invoiceNumber}">
              </iframe>
            </div>
          </div>
        </body>
        </html>
      `;

      res.setHeader('Content-Type', 'text/html');
      res.send(invoiceViewingPage);

    } catch (error: any) {
      console.error('❌ Invoice view error:', error);
      res.status(500).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Error Loading Invoice</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: #dc2626;">Error Loading Invoice</h1>
          <p>There was an error loading the invoice. Please try again later.</p>
          <a href="/" style="color: #2563eb;">← Back to Home</a>
        </body>
        </html>
      `);
    }
  });

  // INVOICE PDF DOWNLOAD ROUTE - COPIED FROM CONTRACT PATTERN
  app.get('/api/invoices/:id/download', isAuthenticated, async (req: any, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      console.log('📄 Invoice PDF download request for ID:', invoiceId);

      // Get invoice for authenticated user
      const invoice = await storage.getInvoice(invoiceId);

      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      // PRIORITY 1: For authenticated users, fetch from R2 and serve directly (no CORS)
      // For unauthenticated access (email links), redirect to R2
      if (invoice.cloudStorageUrl) {
        // Always serve directly for authenticated users (no CORS issues)
        console.log('👤 Authenticated user: Fetching invoice PDF from R2 and serving directly');
        try {
          const response = await fetch(invoice.cloudStorageUrl);
          if (response.ok) {
            const pdfBuffer = await response.arrayBuffer();
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`);
            res.setHeader('Content-Length', pdfBuffer.byteLength.toString());
            return res.send(Buffer.from(pdfBuffer));
          }
        } catch (fetchError) {
          console.log('⚠️ Failed to fetch invoice from R2, falling back to generation');
        }
      }

      // PRIORITY 2: Generate and upload to cloud storage
      console.log('☁️ No cloud URL found, generating and uploading to cloud storage...');

      try {
        const userSettings = await storage.getSettings(invoice.userId);
        const { uploadInvoiceToCloud } = await import('./cloud-storage');

        const cloudResult = await uploadInvoiceToCloud(invoice, userSettings);

        if (cloudResult.success && cloudResult.url) {
          // Update invoice with cloud storage URL
          await storage.updateInvoice(invoice.id, {
            cloudStorageUrl: cloudResult.url,
            cloudStorageKey: cloudResult.key
          });

          console.log('✅ Invoice uploaded to cloud');
          // Continue to fallback generation for authenticated users
        }
      } catch (cloudError) {
        console.error('❌ Cloud storage failed, falling back to direct generation');
      }

      // FALLBACK: Generate PDF directly (should rarely be needed)
      console.log('📄 Generating invoice PDF directly as fallback...');
      const userSettings = await storage.getSettings(invoice.userId);
      const { generateInvoicePDF } = await import('./pdf-generator');
      const pdfBuffer = await generateInvoicePDF(invoice, null, userSettings);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`);
      res.send(pdfBuffer);

    } catch (error: any) {
      console.error('❌ Invoice download error:', error);
      res.status(500).json({ 
        error: 'Failed to download invoice',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // PUBLIC COMPLIANCE DOCUMENT VIEWING WITH DOWNLOAD BUTTON
  app.get('/view/compliance/:id', async (req, res) => {
    try {
      const complianceId = parseInt(req.params.id);
      console.log('👁️ Public compliance document view request for ID:', complianceId);

      const compliance = await storage.getComplianceDocument(complianceId);
      if (!compliance) {
        return res.status(404).send(`
          <!DOCTYPE html>
          <html>
          <head><title>Document Not Found</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #dc2626;">Document Not Found</h1>
            <p>The compliance document you're looking for could not be found.</p>
            <a href="/" style="color: #2563eb;">← Back to Home</a>
          </body>
          </html>
        `);
      }

      const userSettings = await storage.getSettings(compliance.userId);
      const businessName = userSettings?.businessName || 'MusoBuddy';

      const getDocumentTypeLabel = (type: string): string => {
        switch (type) {
          case 'public_liability':
            return 'Public Liability Insurance';
          case 'pat_testing':
            return 'PAT Testing Certificate';
          case 'music_license':
            return 'Music Performance License';
          default:
            return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }
      };

      const getStatusInfo = (status: string) => {
        switch (status) {
          case 'valid':
            return { color: '#065f46', bg: '#d1fae5', icon: '✅', text: 'Valid' };
          case 'expiring':
            return { color: '#92400e', bg: '#fef3c7', icon: '⚠️', text: 'Expiring Soon' };
          case 'expired':
            return { color: '#991b1b', bg: '#fee2e2', icon: '❌', text: 'Expired' };
          default:
            return { color: '#374151', bg: '#f3f4f6', icon: '📄', text: 'Unknown' };
        }
      };

      const statusInfo = getStatusInfo(compliance.status);

      // Generate HTML page with embedded document and download button
      const complianceViewingPage = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${getDocumentTypeLabel(compliance.type)} | ${businessName}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
              min-height: 100vh;
              display: flex;
              flex-direction: column;
            }
            
            .header {
              background: white;
              padding: 20px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              text-align: center;
            }
            
            .header h1 {
              color: #059669;
              font-size: 28px;
              margin-bottom: 10px;
            }
            
            .header p {
              color: #6b7280;
              font-size: 16px;
            }
            
            .container {
              flex: 1;
              max-width: 1200px;
              margin: 0 auto;
              padding: 20px;
              display: flex;
              flex-direction: column;
              gap: 20px;
            }
            
            .document-details {
              background: white;
              padding: 20px;
              border-radius: 10px;
              box-shadow: 0 4px 15px rgba(0,0,0,0.1);
              display: flex;
              justify-content: space-between;
              align-items: center;
              flex-wrap: wrap;
              gap: 20px;
            }
            
            .document-info {
              display: flex;
              gap: 40px;
              flex-wrap: wrap;
            }
            
            .info-item {
              text-align: left;
            }
            
            .info-label {
              font-size: 12px;
              color: #6b7280;
              text-transform: uppercase;
              font-weight: 600;
              margin-bottom: 5px;
            }
            
            .info-value {
              font-size: 16px;
              color: #111827;
              font-weight: 500;
            }
            
            .download-section {
              display: flex;
              gap: 15px;
              align-items: center;
            }
            
            .download-btn {
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              color: white;
              padding: 12px 24px;
              border: none;
              border-radius: 8px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              display: flex;
              align-items: center;
              gap: 8px;
              transition: all 0.3s ease;
              text-decoration: none;
            }
            
            .download-btn:hover {
              transform: translateY(-2px);
              box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
            }
            
            .document-container {
              background: white;
              border-radius: 10px;
              box-shadow: 0 4px 15px rgba(0,0,0,0.1);
              overflow: hidden;
              flex: 1;
              min-height: 800px;
            }
            
            .document-frame {
              width: 100%;
              height: 800px;
              border: none;
            }
            
            .status-badge {
              padding: 6px 12px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 600;
              text-transform: uppercase;
              background: ${statusInfo.bg};
              color: ${statusInfo.color};
            }
            
            @media (max-width: 768px) {
              .container {
                padding: 10px;
              }
              
              .document-details {
                flex-direction: column;
                text-align: center;
              }
              
              .document-info {
                justify-content: center;
                gap: 20px;
              }
              
              .header h1 {
                font-size: 24px;
              }
              
              .document-frame {
                height: 600px;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${getDocumentTypeLabel(compliance.type)}</h1>
            <p>From ${businessName}</p>
          </div>
          
          <div class="container">
            <div class="document-details">
              <div class="document-info">
                <div class="info-item">
                  <div class="info-label">Document Type</div>
                  <div class="info-value">${getDocumentTypeLabel(compliance.type)}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Uploaded</div>
                  <div class="info-value">${compliance.createdAt ? new Date(compliance.createdAt).toLocaleDateString('en-GB') : 'Not set'}</div>
                </div>
                ${compliance.expiryDate ? `
                <div class="info-item">
                  <div class="info-label">Expires</div>
                  <div class="info-value">${new Date(compliance.expiryDate).toLocaleDateString('en-GB')}</div>
                </div>
                ` : ''}
                <div class="info-item">
                  <div class="info-label">Status</div>
                  <div class="status-badge">
                    ${statusInfo.icon} ${statusInfo.text}
                  </div>
                </div>
              </div>
              
              <div class="download-section">
                <a href="${compliance.documentUrl}" class="download-btn" download>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7,10 12,15 17,10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Download Document
                </a>
              </div>
            </div>
            
            <div class="document-container">
              <iframe 
                src="${compliance.documentUrl}" 
                class="document-frame"
                title="${getDocumentTypeLabel(compliance.type)}">
              </iframe>
            </div>
          </div>
        </body>
        </html>
      `;

      res.setHeader('Content-Type', 'text/html');
      res.send(complianceViewingPage);

    } catch (error: any) {
      console.error('❌ Compliance document view error:', error);
      res.status(500).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Error Loading Document</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: #dc2626;">Error Loading Document</h1>
          <p>There was an error loading the compliance document. Please try again later.</p>
          <a href="/" style="color: #2563eb;">← Back to Home</a>
        </body>
        </html>
      `);
    }
  });

  // PUBLIC COMPLIANCE DOCUMENT DOWNLOAD ROUTE - FORCES FILE DOWNLOAD
  app.get('/download/compliance/:id', async (req: any, res) => {
    try {
      const complianceId = parseInt(req.params.id);
      console.log('📄 Public compliance document download request for ID:', complianceId);
      
      const compliance = await storage.getComplianceDocument(complianceId);
      
      if (!compliance) {
        return res.status(404).json({ error: 'Compliance document not found' });
      }

      // Always fetch from R2 and serve with download headers
      if (compliance.documentUrl) {
        console.log('📄 Fetching compliance document from R2 and forcing download');
        try {
          const response = await fetch(compliance.documentUrl);
          if (response.ok) {
            const fileBuffer = await response.arrayBuffer();
            const fileName = compliance.name || `${compliance.type}-document.pdf`;
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.setHeader('Content-Length', fileBuffer.byteLength.toString());
            return res.send(Buffer.from(fileBuffer));
          }
        } catch (fetchError) {
          console.log('⚠️ Failed to fetch compliance document from R2:', fetchError);
        }
      }

      return res.status(500).json({ error: 'Could not download compliance document' });
    } catch (error) {
      console.error('❌ Public compliance document download error:', error);
      res.status(500).json({ error: 'Failed to download compliance document' });
    }
  });

  // Public invoice download route for email links (NO AUTHENTICATION) - FORCES FILE DOWNLOAD
  app.get('/download/invoices/:id', async (req: any, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      console.log('📄 Public invoice download request for ID:', invoiceId);
      
      const invoice = await storage.getInvoice(invoiceId);
      
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      // Always fetch from R2 and serve with download headers (like contracts)
      if (invoice.cloudStorageUrl) {
        console.log('📄 Fetching invoice from R2 and forcing download');
        try {
          const response = await fetch(invoice.cloudStorageUrl);
          if (response.ok) {
            const pdfBuffer = await response.arrayBuffer();
            const fileName = `invoice-${invoice.invoiceNumber || invoice.id}.pdf`;
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.setHeader('Content-Length', pdfBuffer.byteLength.toString());
            return res.send(Buffer.from(pdfBuffer));
          }
        } catch (fetchError) {
          console.log('⚠️ Failed to fetch invoice from R2, generating new one');
        }
      }

      // If no cloud URL or fetch failed, generate and serve directly
      const userSettings = await storage.getSettings(invoice.userId);
      const { generateInvoicePDF } = await import('./pdf-generator');
      const pdfBuffer = await generateInvoicePDF(invoice, null, userSettings);
      
      const fileName = `invoice-${invoice.invoiceNumber || invoice.id}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', pdfBuffer.length.toString());
      res.send(pdfBuffer);

    } catch (error) {
      console.error('❌ Public invoice download error:', error);
      res.status(500).json({ error: 'Failed to download invoice' });
    }
  });

  // Contract PDF download route - handles both authenticated and unauthenticated access
  app.get('/api/contracts/:id/download', isAuthenticated, async (req: any, res) => {
    // This route will now always have authenticated users due to middleware
    console.log('👤 Authenticated download request - user ID:', req.user.id);
    try {
      const contractId = parseInt(req.params.id);
      console.log('📄 Contract PDF download request for ID:', contractId);
      console.log('🔍 Authentication status - req.user:', !!req.user, req.user ? 'authenticated' : 'not authenticated');

      // Get contract (try both authenticated and public access)
      let contract = null;
      let userId = null;

      contract = await storage.getContract(contractId, req.user.id);

      if (!contract) {
        return res.status(404).json({ error: 'Contract not found' });
      }

      // PRIORITY 1: For authenticated users, fetch from R2 and serve directly (no CORS)
      // For unauthenticated access (email links), redirect to R2
      if (contract.cloudStorageUrl) {
        // Always serve directly for authenticated users (no CORS issues)
        console.log('👤 Authenticated user: Fetching PDF from R2 and serving directly');
        try {
          const response = await fetch(contract.cloudStorageUrl);
          if (response.ok) {
            const pdfBuffer = await response.arrayBuffer();
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="Contract-${contract.contractNumber || contract.id}.pdf"`);
            res.setHeader('Content-Length', pdfBuffer.byteLength.toString());
            return res.send(Buffer.from(pdfBuffer));
          }
        } catch (fetchError) {
          console.log('⚠️ Failed to fetch from R2, falling back to generation');
        }
      }

      // PRIORITY 2: Generate and upload to cloud storage
      console.log('☁️ No cloud URL found, generating and uploading to cloud storage...');

      try {
        const userSettings = await storage.getSettings(contract.userId);
        const { uploadContractToCloud } = await import('./cloud-storage');

        // Determine if this is a signed contract
        const signatureDetails = contract.status === 'signed' && contract.signedAt ? {
          signedAt: new Date(contract.signedAt),
          signatureName: contract.clientName,
          clientIpAddress: 'contract-download'
        } : undefined;

        const cloudResult = await uploadContractToCloud(contract, userSettings, signatureDetails);

        if (cloudResult.success && cloudResult.url) {
          // Update contract with cloud storage URL
          await storage.updateContract(contract.id, {
            cloudStorageUrl: cloudResult.url,
            cloudStorageKey: cloudResult.key
          });

          console.log('✅ Contract uploaded to cloud');
          
          // Authenticated user - continue to fallback generation
          console.log('👤 Authenticated user: Serving generated PDF directly');
        } else {
          console.log('⚠️ Cloud upload failed, generating directly');
        }
      } catch (cloudError) {
        console.error('❌ Cloud storage failed, falling back to direct generation');
      }

      // FALLBACK: Generate PDF directly (should rarely be needed)
      console.log('📄 Generating PDF directly as fallback...');
      const userSettings = await storage.getSettings(contract.userId);
      const { generateContractPDF } = await import('./pdf-generator');

      const signatureDetails = contract.status === 'signed' && contract.signedAt ? {
        signedAt: new Date(contract.signedAt),
        signatureName: contract.clientName,
        clientIpAddress: 'contract-download'
      } : undefined;

      const pdfBuffer = await generateContractPDF(contract, userSettings, signatureDetails);

      // Set proper headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Contract-${contract.contractNumber || contract.id}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length.toString());

      // Send the PDF buffer
      res.send(pdfBuffer);

    } catch (error) {
      console.error('❌ Contract PDF download error:', error);
      res.status(500).json({ error: 'Failed to generate contract PDF' });
    }
  });

  // Public contract download route for email links (NO AUTHENTICATION)
  app.get('/download/contracts/:id', async (req: any, res) => {
    try {
      const contractId = parseInt(req.params.id);
      console.log('🔗 Public contract access for ID:', contractId);
      
      const contract = await storage.getContractById(contractId);
      
      if (!contract) {
        return res.status(404).json({ error: 'Contract not found' });
      }

      // For public access, always redirect to R2 cloud storage
      if (contract.cloudStorageUrl) {
        console.log('🔗 Redirecting to cloud storage:', contract.cloudStorageUrl);
        return res.redirect(contract.cloudStorageUrl);
      }

      // If no cloud URL, generate and redirect
      const userSettings = await storage.getSettings(contract.userId);
      const { uploadContractToCloud } = await import('./cloud-storage');

      const signatureDetails = contract.status === 'signed' && contract.signedAt ? {
        signedAt: new Date(contract.signedAt),
        signatureName: contract.clientName,
        clientIpAddress: 'public-download'
      } : undefined;

      const cloudResult = await uploadContractToCloud(contract, userSettings, signatureDetails);

      if (cloudResult.success && cloudResult.url) {
        await storage.updateContract(contract.id, {
          cloudStorageUrl: cloudResult.url,
          cloudStorageKey: cloudResult.key
        });
        return res.redirect(cloudResult.url);
      }

      return res.status(500).json({ error: 'Could not generate contract PDF' });
    } catch (error) {
      console.error('❌ Public contract download error:', error);
      res.status(500).json({ error: 'Failed to access contract' });
    }
  });

  // Contract update/edit route - MISSING FUNCTIONALITY ADDED
  app.patch('/api/contracts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const contractId = parseInt(req.params.id);
      const updates = req.body;
      
      console.log('📝 Contract update request for ID:', contractId, 'Updates:', updates);
      
      const updatedContract = await storage.updateContract(contractId, updates, req.user.id);
      
      if (!updatedContract) {
        return res.status(404).json({ error: 'Contract not found or not authorized' });
      }
      
      console.log('✅ Contract updated successfully');
      res.json(updatedContract);
    } catch (error: any) {
      console.error('❌ Contract update error:', error);
      res.status(500).json({ 
        error: 'Failed to update contract', 
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Contract deletion routes
  app.delete('/api/contracts/:id', isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteContract(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error('Contract deletion error:', error);
      res.status(500).json({ error: 'Failed to delete contract' });
    }
  });

  app.post('/api/contracts/bulk-delete', isAuthenticated, async (req: any, res) => {
    try {
      const { contractIds } = req.body;

      if (!Array.isArray(contractIds) || contractIds.length === 0) {
        return res.status(400).json({ error: 'Contract IDs array is required' });
      }

      // Delete contracts one by one
      for (const id of contractIds) {
        await storage.deleteContract(parseInt(id));
      }

      res.json({ success: true, deletedCount: contractIds.length });
    } catch (error) {
      console.error('Bulk contract deletion error:', error);
      res.status(500).json({ error: 'Failed to delete contracts' });
    }
  });

  // ===== BOOKING ROUTES =====
  // Comprehensive document upload for bookings (contracts, invoices, other documents)
  app.post('/api/bookings/:id/upload-document', isAuthenticated, upload.single('document'), async (req: any, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      const file = req.file;
      const documentType = req.body.documentType || 'other'; // contract, invoice, other
      
      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      if (file.mimetype !== 'application/pdf') {
        return res.status(400).json({ error: 'Only PDF files are allowed' });
      }

      // Verify booking belongs to user
      const booking = await storage.getBooking(bookingId);
      if (!booking || booking.userId !== req.user.id) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      // Upload to R2 cloud storage
      const timestamp = Date.now();
      const filename = file.originalname;
      const storageKey = `uploaded-documents/${documentType}/${req.user.id}/${timestamp}-${filename}`;
      
      const { uploadFileToCloudflare } = await import('./cloud-storage');
      // Ensure buffer is properly formatted for cloud storage
      const fileBuffer = Buffer.isBuffer(file.buffer) ? file.buffer : Buffer.from(file.buffer);
      const uploadResult = await uploadFileToCloudflare(storageKey, fileBuffer, file.mimetype);
      
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Failed to upload to cloud storage');
      }
      
      const cloudUrl = uploadResult.url!;

      // Update booking with appropriate document info based on type
      let updatedBooking;
      if (documentType === 'contract') {
        updatedBooking = await storage.updateBookingContractDocument(
          bookingId, 
          cloudUrl, 
          storageKey, 
          filename
        );
      } else if (documentType === 'invoice') {
        updatedBooking = await storage.updateBookingInvoiceDocument(
          bookingId, 
          cloudUrl, 
          storageKey, 
          filename
        );
      } else {
        // For 'other' documents, add to the uploadedDocuments array
        updatedBooking = await storage.addBookingDocument(
          bookingId,
          cloudUrl,
          storageKey,
          filename,
          documentType
        );
      }

      res.json({
        success: true,
        message: `${documentType.charAt(0).toUpperCase() + documentType.slice(1)} document uploaded successfully`,
        booking: updatedBooking
      });

    } catch (error) {
      console.error('Error uploading document:', error);
      res.status(500).json({ error: 'Failed to upload document' });
    }
  });

  app.get('/api/bookings', isAuthenticated, async (req: any, res) => {
    try {
      const bookings = await storage.getBookings(req.user.id);
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch bookings' });
    }
  });

  // NEW CONFLICT DETECTION SYSTEM - Get conflicts for specific booking
  app.get('/api/conflicts/:bookingId', isAuthenticated, async (req: any, res) => {
    try {
      const bookingId = parseInt(req.params.bookingId);
      const { ConflictEngine } = await import('./conflict-engine');
      
      // Get all bookings for user
      const allBookings = await storage.getBookings(req.user.id);
      
      // Find the target booking
      const targetBooking = allBookings.find(b => b.id === bookingId);
      if (!targetBooking) {
        return res.status(404).json({ error: 'Booking not found' });
      }
      
      // Convert to conflict engine format
      const bookingInfo = {
        id: targetBooking.id,
        clientName: targetBooking.clientName,
        eventDate: targetBooking.eventDate?.toISOString() || '',
        eventTime: targetBooking.eventTime || undefined,
        eventEndTime: targetBooking.eventEndTime || undefined,
        venue: targetBooking.venue || undefined,
        status: targetBooking.status
      };
      
      const otherBookings = allBookings
        .filter(b => b.id !== bookingId)
        .map(b => ({
          id: b.id,
          clientName: b.clientName,
          eventDate: b.eventDate?.toISOString() || '',
          eventTime: b.eventTime || undefined,
          eventEndTime: b.eventEndTime || undefined,
          venue: b.venue || undefined,
          status: b.status
        }));
      
      // Detect conflicts
      const conflicts = [];
      for (const otherBooking of otherBookings) {
        const result = ConflictEngine.detectConflict(bookingInfo, otherBooking);
        if (result.hasConflict) {
          conflicts.push({
            withBookingId: otherBooking.id,
            severity: result.severity === 'critical' ? 'hard' : result.severity === 'warning' ? 'soft' : 'resolved',
            clientName: otherBooking.clientName,
            status: otherBooking.status,
            time: otherBooking.eventTime && otherBooking.eventEndTime 
              ? `${otherBooking.eventTime}–${otherBooking.eventEndTime}`
              : 'Time not specified',
            canEdit: otherBooking.status === 'enquiry' || otherBooking.status === 'new',
            canReject: otherBooking.status === 'enquiry' || otherBooking.status === 'new',
            type: result.type,
            message: result.message,
            overlapMinutes: result.details.overlapMinutes
          });
        }
      }
      
      res.json({
        bookingId,
        conflicts
      });
      
    } catch (error) {
      console.error('❌ Conflict detection error:', error);
      res.status(500).json({ error: 'Failed to detect conflicts' });
    }
  });

  // Dashboard conflicts summary - Get all conflicts for user
  app.get('/api/conflicts', isAuthenticated, async (req: any, res) => {
    try {
      const { ConflictEngine } = await import('./conflict-engine');
      
      // Get all bookings for user
      const allBookings = await storage.getBookings(req.user.id);
      
      // Convert to conflict engine format
      const bookings = allBookings.map(b => ({
        id: b.id,
        clientName: b.clientName,
        eventDate: b.eventDate?.toISOString() || '',
        eventTime: b.eventTime || undefined,
        eventEndTime: b.eventEndTime || undefined,
        venue: b.venue || undefined,
        status: b.status
      }));
      
      // Detect all conflicts
      const allConflicts = ConflictEngine.detectAllConflicts(bookings);
      
      // Format for dashboard widget (legacy format for compatibility)
      const formattedConflicts = allConflicts.map((conflict, index) => ({
        id: index + 1,
        enquiryId: conflict.details.booking1.id,
        conflictType: 'booking',
        conflictId: conflict.details.booking2.id,
        severity: conflict.severity === 'critical' ? 'high' : conflict.severity === 'warning' ? 'medium' : 'low',
        message: conflict.message,
        resolved: false,
        createdAt: new Date().toISOString(),
        enquiry: {
          title: `${conflict.details.booking1.clientName} Event`,
          clientName: conflict.details.booking1.clientName,
          eventDate: conflict.details.booking1.eventDate,
          eventTime: conflict.details.booking1.eventTime,
          venue: conflict.details.booking1.venue
        },
        conflictItem: {
          title: `${conflict.details.booking2.clientName} Event`,
          clientName: conflict.details.booking2.clientName,
          eventDate: conflict.details.booking2.eventDate,
          eventTime: conflict.details.booking2.eventTime,
          venue: conflict.details.booking2.venue
        }
      }));
      
      console.log(`🔍 Found ${formattedConflicts.length} conflicts for user ${req.user.id}`);
      res.json(formattedConflicts);
      
    } catch (error) {
      console.error('❌ Conflicts detection error:', error);
      res.status(500).json({ error: 'Failed to detect conflicts' });
    }
  });

  app.get('/api/bookings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      const booking = await storage.getBooking(bookingId);
      
      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }
      
      // Verify the booking belongs to the authenticated user
      if (booking.userId !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized to access this booking' });
      }
      
      res.json(booking);
    } catch (error) {
      console.error('❌ Individual booking fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch booking' });
    }
  });

  app.post('/api/bookings', isAuthenticated, async (req: any, res) => {
    try {
      // Sanitize data before creating - convert empty strings to null for decimal fields only
      const sanitizedData = { ...req.body, userId: req.user.id };
      
      // All time fields (setupTime, soundCheckTime, packupTime, travelTime, performanceDuration) are now text fields
      
      // Handle decimal fields
      const decimalFields = ['fee', 'deposit'];
      decimalFields.forEach(field => {
        if (sanitizedData[field] === '' || sanitizedData[field] === undefined) {
          sanitizedData[field] = null;
        } else if (sanitizedData[field] && typeof sanitizedData[field] === 'string') {
          const parsed = parseFloat(sanitizedData[field]);
          sanitizedData[field] = isNaN(parsed) ? null : parsed.toString();
        }
      });
      
      const booking = await storage.createBooking(sanitizedData);
      res.json(booking);
    } catch (error) {
      console.error('❌ Booking creation error:', error);
      res.status(500).json({ error: 'Failed to create booking' });
    }
  });

  app.patch('/api/bookings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      console.log('📝 Updating booking:', bookingId, 'with data:', req.body);
      
      // Sanitize data before updating - convert empty strings to null for decimal fields only
      const sanitizedData = { ...req.body };
      
      // All time fields (setupTime, soundCheckTime, packupTime, travelTime, performanceDuration) are now text fields
      
      // Handle decimal fields
      const decimalFields = ['fee', 'deposit'];
      decimalFields.forEach(field => {
        if (sanitizedData[field] === '' || sanitizedData[field] === undefined) {
          sanitizedData[field] = null;
        } else if (sanitizedData[field] && typeof sanitizedData[field] === 'string') {
          const parsed = parseFloat(sanitizedData[field]);
          sanitizedData[field] = isNaN(parsed) ? null : parsed.toString();
        }
      });
      
      const booking = await storage.updateBooking(bookingId, sanitizedData);
      console.log('✅ Booking updated successfully:', booking);
      res.json(booking);
    } catch (error: any) {
      console.error('❌ Booking update error:', error);
      res.status(500).json({ 
        error: 'Failed to update booking',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  app.delete('/api/bookings/:id', isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteBooking(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete booking' });
    }
  });

  // Send compliance documents to booking client
  app.post('/api/bookings/:id/send-compliance', isAuthenticated, async (req: any, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      const { documentIds, recipientEmail, customMessage } = req.body;

      console.log('📋 Sending compliance documents for booking:', bookingId);
      console.log('📋 Document IDs:', documentIds);
      console.log('📋 Recipient:', recipientEmail);

      // Validate input
      if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
        return res.status(400).json({ error: 'Document IDs are required' });
      }

      if (!recipientEmail) {
        return res.status(400).json({ error: 'Recipient email is required' });
      }

      // Get booking details for template variables
      const booking = await storage.getBooking(bookingId);
      if (!booking || booking.userId !== req.user.id) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      // Get compliance documents
      const allDocuments = await storage.getCompliance(req.user.id);
      const selectedDocuments = allDocuments.filter((doc: any) => documentIds.includes(doc.id));

      if (selectedDocuments.length === 0) {
        return res.status(404).json({ error: 'No valid documents found' });
      }

      // Get user settings for business signature
      const userSettings = await storage.getSettings(req.user.id);

      // Replace template variables in custom message
      let personalizedMessage = customMessage || '';
      
      // Replace booking variables
      personalizedMessage = personalizedMessage.replace(/\[Client Name\]/g, booking.clientName || 'Client');
      personalizedMessage = personalizedMessage.replace(/\[Event Date\]/g, booking.eventDate ? new Date(booking.eventDate).toLocaleDateString('en-GB') : '[Event Date]');
      personalizedMessage = personalizedMessage.replace(/\[Venue\]/g, booking.venue || '[Venue]');
      personalizedMessage = personalizedMessage.replace(/\[Event Time\]/g, booking.eventTime || '[Event Time]');

      // Replace business signature
      const businessSignature = userSettings ? 
        `${userSettings.businessName || 'MusoBuddy User'}\n${userSettings.businessEmail || ''}\n${userSettings.phone || ''}` :
        'MusoBuddy User';
      personalizedMessage = personalizedMessage.replace(/\[Business Signature\]/g, businessSignature);

      // Send email with compliance documents
      const { sendComplianceEmail } = await import('./mailgun-email-restored');
      const emailResult = await sendComplianceEmail(
        recipientEmail,
        booking,
        selectedDocuments,
        personalizedMessage,
        userSettings
      );

      if (emailResult.success) {
        console.log('✅ Compliance documents sent successfully to:', recipientEmail);
        res.json({
          success: true,
          message: 'Compliance documents sent successfully',
          recipient: recipientEmail,
          documentsCount: selectedDocuments.length,
          messageId: emailResult?.messageId || 'No ID returned'
        });
      } else {
        console.error('❌ Compliance email failed:', emailResult.diagnostics);
        res.status(500).json({
          error: 'Failed to send compliance documents',
          details: emailResult.diagnostics?.error
        });
      }

    } catch (error: any) {
      console.error('❌ Send compliance error:', error);
      res.status(500).json({
        error: 'Failed to send compliance documents',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // ===== INVOICE ROUTES =====
  app.get('/api/invoices', isAuthenticated, async (req: any, res) => {
    try {
      const invoices = await storage.getInvoices(req.user.id);
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch invoices' });
    }
  });

  app.post('/api/invoices', isAuthenticated, async (req: any, res) => {
    try {
      console.log('📝 Creating invoice with data:', req.body);
      
      const {
        contractId,
        clientName,
        clientEmail,
        ccEmail,
        clientAddress,
        venueAddress,
        amount,
        dueDate,
        performanceDate,
        performanceFee,
        depositPaid
      } = req.body;

      // Validate required fields
      if (!clientName || !amount || !dueDate) {
        return res.status(400).json({ error: 'Missing required fields: clientName, amount, dueDate' });
      }

      // Get user settings for auto-incrementing invoice number
      const userSettings = await storage.getSettings(req.user.id);
      const nextNumber = userSettings?.nextInvoiceNumber || 1;
      
      // Generate HMRC-compliant sequential invoice number
      const invoiceNumber = String(nextNumber).padStart(5, '0');
      
      console.log('📄 Generated invoice number:', invoiceNumber, 'for user:', req.user.id);

      // Prepare invoice data matching database schema
      const invoiceData = {
        userId: req.user.id,
        contractId: contractId ? parseInt(contractId) : null,
        invoiceNumber,
        clientName: clientName.trim(),
        clientEmail: clientEmail?.trim() || null,
        ccEmail: ccEmail?.trim() || null,
        clientAddress: clientAddress?.trim() || null,
        venueAddress: venueAddress?.trim() || null,
        amount: parseFloat(amount),
        fee: performanceFee ? parseFloat(performanceFee) : parseFloat(amount),
        depositPaid: depositPaid ? parseFloat(depositPaid) : 0,
        dueDate: new Date(dueDate),
        eventDate: performanceDate ? new Date(performanceDate) : null,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log('📝 Processed invoice data:', invoiceData);

      const invoice = await storage.createInvoice(invoiceData);
      console.log('✅ Invoice created successfully:', invoice.id);
      
      // Update user settings with next invoice number
      await storage.updateSettings(req.user.id, {
        nextInvoiceNumber: nextNumber + 1
      });
      
      console.log('📄 Updated next invoice number to:', nextNumber + 1);
      
      res.json(invoice);
    } catch (error) {
      console.error('❌ Invoice creation error:', error);
      res.status(500).json({ error: 'Failed to create invoice' });
    }
  });

  app.patch('/api/invoices/:id', isAuthenticated, async (req: any, res) => {
    try {
      console.log('📝 Updating invoice ID:', req.params.id);
      console.log('📝 Update data received:', req.body);
      
      const invoiceId = parseInt(req.params.id);
      const updateData = { ...req.body };
      
      // Handle field name mapping for dates and amounts
      if (updateData.performanceDate) {
        updateData.eventDate = updateData.performanceDate;
        delete updateData.performanceDate;
      }
      
      if (updateData.performanceFee) {
        updateData.fee = updateData.performanceFee;
        delete updateData.performanceFee;
      }
      
      // Ensure numeric fields are properly formatted as strings for decimal columns
      if (updateData.amount !== undefined && updateData.amount !== '') {
        updateData.amount = parseFloat(updateData.amount).toString();
      }
      if (updateData.fee !== undefined && updateData.fee !== '') {
        updateData.fee = parseFloat(updateData.fee).toString();
      }
      if (updateData.depositPaid !== undefined && updateData.depositPaid !== '') {
        updateData.depositPaid = parseFloat(updateData.depositPaid).toString();
      }
      
      // Handle date fields
      if (updateData.dueDate) {
        updateData.dueDate = new Date(updateData.dueDate);
      }
      if (updateData.eventDate) {
        updateData.eventDate = new Date(updateData.eventDate);
      }
      
      // Add updatedAt timestamp
      updateData.updatedAt = new Date();
      
      console.log('📝 Mapped update data:', updateData);
      
      const invoice = await storage.updateInvoice(invoiceId, updateData);
      
      console.log('✅ Invoice updated successfully:', invoice.invoiceNumber);
      res.json(invoice);
      
    } catch (error: any) {
      console.error('❌ Invoice update error:', error);
      console.error('❌ Error stack:', error.stack);
      res.status(500).json({ 
        error: 'Failed to update invoice',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  app.post('/api/invoices/:id/mark-paid', isAuthenticated, async (req: any, res) => {
    try {
      console.log(`💰 Marking invoice ${req.params.id} as paid`);
      
      const invoiceId = parseInt(req.params.id);
      const updateData = {
        status: 'paid',
        paidAt: new Date(),
        updatedAt: new Date()
      };

      const invoice = await storage.updateInvoice(invoiceId, updateData);
      console.log('✅ Invoice marked as paid successfully');
      
      res.json({ success: true, invoice });
    } catch (error) {
      console.error('❌ Error marking invoice as paid:', error);
      res.status(500).json({ error: 'Failed to mark invoice as paid' });
    }
  });

  app.post('/api/invoices/send-email', isAuthenticated, async (req: any, res) => {
    try {
      console.log('📧 Sending invoice email:', req.body);
      
      const { invoiceId, customMessage } = req.body;
      
      if (!invoiceId) {
        return res.status(400).json({ error: 'Invoice ID is required' });
      }

      // Get invoice details
      const invoices = await storage.getInvoices(req.user.id);
      const invoice = invoices.find(inv => inv.id === parseInt(invoiceId));
      
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      // Update invoice status to 'sent'
      await storage.updateInvoice(parseInt(invoiceId), {
        status: 'sent',
        sentAt: new Date(),
        updatedAt: new Date()
      });

      console.log('✅ Invoice email sent successfully');
      res.json({ success: true, message: 'Invoice sent successfully' });
    } catch (error) {
      console.error('❌ Error sending invoice email:', error);
      res.status(500).json({ error: 'Failed to send invoice email' });
    }
  });

  app.delete('/api/invoices/:id', isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteInvoice(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error('Invoice deletion error:', error);
      res.status(500).json({ error: 'Failed to delete invoice' });
    }
  });

  // ===== SETTINGS ROUTES =====
  app.get('/api/settings', isAuthenticated, async (req: any, res) => {
    try {
      const settings = await storage.getSettings(req.user.id);
      res.json(settings || {});
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  });

  app.post('/api/settings', isAuthenticated, async (req: any, res) => {
    try {
      const settings = await storage.updateSettings(req.user.id, req.body);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update settings' });
    }
  });

  // ===== COMPLIANCE ROUTES =====
  app.get('/api/compliance', isAuthenticated, async (req: any, res) => {
    try {
      const documents = await storage.getCompliance(req.user.id);
      res.json(documents);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch compliance documents' });
    }
  });

  app.post('/api/compliance', isAuthenticated, async (req: any, res) => {
    try {
      const documentData = {
        ...req.body,
        userId: req.user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const document = await storage.createCompliance(documentData);
      res.json(document);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create compliance document' });
    }
  });

  app.post('/api/compliance/upload', isAuthenticated, upload.single('documentFile'), async (req: any, res) => {
    try {
      console.log('📎 Starting compliance document upload...');
      console.log('📎 File info:', req.file?.originalname, req.file?.size, 'bytes');
      console.log('📎 User ID:', req.user?.id);
      console.log('📎 Body data:', req.body);
      
      if (!req.file) {
        console.error('❌ No file in request');
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Upload to Cloudflare R2
      console.log('☁️ Attempting cloud storage upload...');
      const fileName = `compliance/${req.user.id}/${Date.now()}-${req.file.originalname}`;
      console.log('☁️ File name for R2:', fileName);
      
      const { uploadFileToCloudflare } = await import('./cloud-storage');
      console.log('☁️ Cloud storage function imported successfully');
      
      const uploadResult = await uploadFileToCloudflare(fileName, req.file.buffer, req.file.mimetype);
      console.log('☁️ Upload result:', uploadResult);
      
      if (!uploadResult.success) {
        console.error('❌ Cloud upload failed:', uploadResult.error);
        throw new Error(uploadResult.error || 'Failed to upload to cloud storage');
      }

      console.log('✅ Cloud upload successful, creating database record...');
      
      // Create compliance document record with R2 URL
      const complianceDoc = {
        userId: req.user.id,
        type: req.body.type,
        name: req.body.name || req.file.originalname,
        expiryDate: req.body.expiryDate ? new Date(req.body.expiryDate) : null,
        status: 'valid',
        documentUrl: uploadResult.url, // R2 public URL
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log('💾 Creating compliance record:', complianceDoc);
      const document = await storage.createCompliance(complianceDoc);
      console.log('✅ Compliance document created in database:', document);
      
      res.json(document);
    } catch (error: any) {
      console.error('❌ Compliance upload error details:', error);
      console.error('❌ Error stack:', error.stack);
      res.status(500).json({ error: error.message || 'Failed to upload document' });
    }
  });

  app.delete('/api/compliance/:id', isAuthenticated, async (req: any, res) => {
    try {
      const documentId = parseInt(req.params.id);
      
      // Get document to find file URL before deletion
      const documents = await storage.getCompliance(req.user.id);
      const document = documents.find(d => d.id === documentId);
      
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // Delete from cloud storage if it's an R2 URL
      if (document.documentUrl && document.documentUrl.includes('r2.dev')) {
        try {
          const fileName = document.documentUrl.split('/').slice(-2).join('/'); // Extract file path
          // Note: Delete functionality not implemented yet, just log for now
          console.log('🗑️ Would delete file from cloud storage:', fileName);
        } catch (deleteError) {
          console.log('⚠️ Could not delete file from cloud storage:', deleteError);
        }
      }

      // Delete from database
      await storage.deleteCompliance(documentId, req.user.id);
      console.log('✅ Compliance document deleted successfully');
      
      res.json({ success: true });
    } catch (error: any) {
      console.error('❌ Compliance deletion error:', error);
      res.status(500).json({ error: error.message || 'Failed to delete document' });
    }
  });

  // ===== DASHBOARD ROUTES =====
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const stats = await storage.getDashboardStats(req.user.id);
      res.json(stats);
    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
  });

  // Admin routes completely removed for authentication system rebuild

  // ===== TEMPLATE ROUTES =====
  app.get('/api/templates', isAuthenticated, async (req: any, res) => {
    try {
      const templates = await storage.getEmailTemplates(req.user.id);
      res.json(templates);
    } catch (error) {
      console.error('❌ Templates fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch templates' });
    }
  });

  app.post('/api/templates', isAuthenticated, async (req: any, res) => {
    try {
      const template = await storage.createEmailTemplate({
        ...req.body,
        userId: req.user.id
      });
      res.json(template);
    } catch (error) {
      console.error('❌ Template creation error:', error);
      res.status(500).json({ error: 'Failed to create template' });
    }
  });

  app.patch('/api/templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const template = await storage.updateEmailTemplate(
        parseInt(req.params.id),
        req.body,
        req.user.id
      );
      res.json(template);
    } catch (error) {
      console.error('❌ Template update error:', error);
      res.status(500).json({ error: 'Failed to update template' });
    }
  });

  app.delete('/api/templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteEmailTemplate(parseInt(req.params.id), req.user.id);
      res.json({ success: true });
    } catch (error) {
      console.error('❌ Template deletion error:', error);
      res.status(500).json({ error: 'Failed to delete template' });
    }
  });

  // TEMPLATE EMAIL SENDING ENDPOINT - Business Email Ghosting
  app.post('/api/templates/send-email', isAuthenticated, async (req: any, res) => {
    try {
      const { template, bookingId } = req.body;
      
      if (!template || !bookingId) {
        return res.status(400).json({ error: 'Template and booking ID are required' });
      }

      // Get booking data
      const booking = await storage.getBooking(parseInt(bookingId));
      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      if (booking.userId !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized to access this booking' });
      }

      // Get user settings for business email
      const userSettings = await storage.getSettings(req.user.id);
      if (!userSettings?.businessEmail) {
        return res.status(400).json({ error: 'Business email not configured in settings. Please add your business email address.' });
      }

      // Send template email using existing email infrastructure
      const { sendTemplateEmail } = await import('./mailgun-email-restored');
      const result = await sendTemplateEmail(template, booking, userSettings);

      if (result.success) {
        console.log('✅ Template email sent successfully:', result.messageId);
        
        // Automatic status updates happen, but user retains full manual override control
        // Check if this is a response email and auto-update from "new" to "in_progress"
        if (booking.status === 'new') {
          try {
            await storage.updateBooking(parseInt(bookingId), { status: 'in_progress' });
            console.log('✅ Booking auto-updated: new → in_progress (user can manually revert if needed)');
          } catch (updateError) {
            console.error('⚠️ Failed to auto-update booking status:', updateError);
          }
        }
        
        res.json({ 
          success: true, 
          messageId: result.messageId,
          message: 'Email sent successfully. Replies will go to your business email.' 
        });
      } else {
        console.error('❌ Template email failed:', result.error);
        res.status(500).json({ error: result.error || 'Failed to send email' });
      }
    } catch (error: any) {
      console.error('❌ Template email endpoint error:', error);
      res.status(500).json({ error: 'Failed to send template email' });
    }
  });

  // Client Management Routes
  app.get('/api/clients', isAuthenticated, async (req: any, res) => {
    try {
      const clients = await storage.getClients(req.user.id);
      res.json(clients);
    } catch (error) {
      console.error('Error fetching clients:', error);
      res.status(500).json({ error: 'Failed to fetch clients' });
    }
  });

  app.post('/api/clients', isAuthenticated, async (req: any, res) => {
    try {
      const clientData = { ...req.body, userId: req.user.id };
      const client = await storage.createClient(clientData);
      res.json(client);
    } catch (error) {
      console.error('Error creating client:', error);
      res.status(500).json({ error: 'Failed to create client' });
    }
  });

  app.patch('/api/clients/:id', isAuthenticated, async (req: any, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const client = await storage.updateClient(clientId, req.body);
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }
      res.json(client);
    } catch (error) {
      console.error('Error updating client:', error);
      res.status(500).json({ error: 'Failed to update client' });
    }
  });

  app.delete('/api/clients/:id', isAuthenticated, async (req: any, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const client = await storage.deleteClient(clientId);
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting client:', error);
      res.status(500).json({ error: 'Failed to delete client' });
    }
  });

  app.post('/api/clients/populate-from-bookings', isAuthenticated, async (req: any, res) => {
    try {
      console.log('🔄 Starting address book population for user:', req.user.id);
      
      const bookings = await storage.getBookings(req.user.id);
      console.log(`📚 Found ${bookings.length} bookings to process`);
      
      let createdCount = 0;
      let skippedCount = 0;
      
      for (const booking of bookings) {
        console.log(`Processing booking ${booking.id}: ${booking.clientName}`);
        if (booking.clientName) {
          const result = await storage.upsertClientFromBooking(booking, req.user.id);
          if (result) {
            createdCount++;
            console.log(`✅ Created/updated client: ${booking.clientName}`);
          } else {
            skippedCount++;
            console.log(`⚠️ Skipped booking ${booking.id}: no client name`);
          }
        } else {
          skippedCount++;
          console.log(`⚠️ Skipped booking ${booking.id}: no client name`);
        }
      }
      
      console.log(`✅ Population complete: ${createdCount} clients created/updated, ${skippedCount} skipped`);
      
      res.json({ 
        success: true, 
        message: `Processed ${bookings.length} bookings: ${createdCount} clients created/updated, ${skippedCount} skipped`,
        createdCount,
        skippedCount,
        totalBookings: bookings.length
      });
    } catch (error: any) {
      console.error('❌ Error populating address book:', error);
      res.status(500).json({ error: 'Failed to populate address book: ' + error.message });
    }
  });

  return server;
}

// CRITICAL HELPER FUNCTIONS

/**
 * Generate HTML page for already signed contracts
 */
function generateAlreadySignedPage(contract: any): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Contract Already Signed</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                margin: 0;
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .container {
                max-width: 600px;
                background: white;
                padding: 40px;
                border-radius: 10px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                text-align: center;
            }
            .success-icon {
                font-size: 64px;
                color: #10b981;
                margin-bottom: 20px;
            }
            h1 {
                color: #065f46;
                margin-bottom: 20px;
                font-size: 32px;
            }
            .contract-info {
                background: #f9fafb;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
                text-align: left;
            }
            .info-row {
                margin: 10px 0;
                padding: 5px 0;
            }
            .info-row strong {
                color: #374151;
                display: inline-block;
                width: 120px;
            }
            .download-btn {
                display: inline-block;
                background: #059669;
                color: white;
                padding: 15px 30px;
                text-decoration: none;
                border-radius: 5px;
                font-weight: bold;
                margin: 20px 10px;
                transition: background 0.3s;
            }
            .download-btn:hover {
                background: #047857;
            }
            .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                font-size: 14px;
                color: #6b7280;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="success-icon">✅</div>
            <h1>Contract Already Signed</h1>
            <h2>${contract.contractNumber}</h2>

            <div class="success-message">
                <h3>This contract has already been signed successfully!</h3>
                <p><strong>Signed by:</strong> ${contract.clientSignature || contract.clientName}</p>
                <p><strong>Signed on:</strong> ${contract.signedAt ? new Date(contract.signedAt).toLocaleString('en-GB') : 'Recently'}</p>
            </div>

            <div class="contract-info">
                <h3>Event Details</h3>
                <div class="info-row">
                    <strong>Client:</strong> ${contract.clientName}
                </div>
                <div class="info-row">
                    <strong>Date:</strong> ${new Date(contract.eventDate).toLocaleDateString('en-GB')}
                </div>
                <div class="info-row">
                    <strong>Time:</strong> ${contract.eventTime} ${contract.eventEndTime ? '- ' + contract.eventEndTime : ''}
                </div>
                <div class="info-row">
                    <strong>Venue:</strong> ${contract.venue}
                </div>
                <div class="info-row">
                    <strong>Performance Fee:</strong> £${contract.fee}
                </div>
            </div>

            <div style="margin: 30px 0;">
                <a href="/api/contracts/${contract.id}/download" class="download-btn">📄 Download Signed Contract</a>
            </div>

            <div class="footer">
                <p>If you need any assistance, please contact us directly.</p>
            </div>
        </div>
    </body>
    </html>
  `;
}

/**
 * Generate HTML contract signing page (fallback - cloud storage version is preferred)
 */
function generateContractSigningPage(contract: any, userSettings: any): string {
  const businessName = userSettings?.businessName || 'MusoBuddy';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sign Contract - ${businessName}</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                margin: 0;
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
            }
            .container {
                max-width: 800px;
                margin: 0 auto;
                background: white;
                padding: 40px;
                border-radius: 10px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            }
            .header {
                text-align: center;
                margin-bottom: 40px;
                border-bottom: 2px solid #e5e7eb;
                padding-bottom: 20px;
            }
            .notice {
                background: #fef3c7;
                border: 1px solid #f59e0b;
                border-radius: 8px;
                padding: 16px;
                margin: 20px 0;
                text-align: center;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📝 Performance Contract</h1>
                <p>Please review and sign the contract below</p>
            </div>

            <div class="notice">
                <p><strong>Note:</strong> This is a fallback signing page. For the best experience, please use the cloud-hosted signing page.</p>
            </div>

            <div style="text-align: center; margin: 40px 0;">
                <h2>Contract: ${contract.contractNumber}</h2>
                <p><strong>Client:</strong> ${contract.clientName}</p>
                <p><strong>Event:</strong> ${new Date(contract.eventDate).toLocaleDateString('en-GB')}</p>
                <p><strong>Venue:</strong> ${contract.venue}</p>
                <p><strong>Fee:</strong> £${contract.fee}</p>
            </div>

            <div style="text-align: center;">
                <p>Please contact ${businessName} directly to complete the contract signing process.</p>
            </div>
        </div>
    </body>
    </html>
  `;
}



