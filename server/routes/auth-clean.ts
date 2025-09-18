import { type Express } from "express";
import { storage } from "../core/storage";
import { nanoid } from 'nanoid';
import { authenticate, type AuthenticatedRequest } from '../middleware/supabase-only-auth';
// Removed - using centralized auth middleware

// Check if user is exempt from subscription requirements
function isExemptUser(email: string): boolean {
  const allowedBypassEmails = ['timfulker@gmail.com', 'timfulkermusic@gmail.com', 'jake.stanley@musobuddy.com'];
  return allowedBypassEmails.includes(email);
}

// SMS verification now uses secure database storage instead of vulnerable in-memory Map

export function setupAuthRoutes(app: Express) {
  console.log('🔐 Setting up clean JWT-based authentication...');
  console.log('🔍 [DEBUG] Express app object:', !!app);
  console.log('🔍 [DEBUG] App.post method:', typeof app.post);



  // TEST ENDPOINT - Verify routing works for auth paths
  console.log('🔍 [DEBUG] Registering test route...');
  app.get('/api/auth/test-route', async (req, res) => {
    console.log('🧪 TEST ROUTE HIT - Auth routing works!');
    res.json({ success: true, message: 'Auth routing is working' });
  });
  console.log('✅ [DEBUG] Test route registered');

  // DIAGNOSTIC ENDPOINT - Check if all required functions exist
  app.get('/api/auth/diagnostic', async (req, res) => {
    const diagnostics = {
      storageExists: !!storage,
      createUserExists: typeof storage.createUser === 'function',
      supabaseConfigured: !!(process.env.SUPABASE_URL_DEV || process.env.SUPABASE_URL_PROD)
    };
    
    console.log('🚑 Diagnostics check:', diagnostics);
    res.json({ diagnostics });
  });

  // TEST ENDPOINT - Debug what auth returns
  app.get('/api/auth/debug-user/:email', async (req, res) => {
    try {
      const email = req.params.email;
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Show exactly what we're getting from DB and what we're returning
      res.json({
        rawFromDb: {
          tier: user.tier,
          plan: user.plan,
          created_via_stripe: user.created_via_stripe,
          is_subscribed: user.is_subscribed,
          trial_status: user.trial_status
        },
        whatWeShouldReturn: {
          isAdmin: user.isAdmin || user.is_admin || false,
          isAssigned: user.isAssigned || user.is_assigned || false,
          hasPaid: user.hasPaid || user.has_paid || false,
          trialEndsAt: user.trialEndsAt || user.trial_ends_at,
          hasAccess: (user.isAdmin || user.is_admin) || (user.isAssigned || user.is_assigned) || (user.hasPaid || user.has_paid)  // NO TRIAL ACCESS
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // FIX ENDPOINT - Update Supabase UID for user
  app.post('/api/auth/fix-supabase-uid', async (req, res) => {
    try {
      const { email, supabaseUid } = req.body;
      
      if (!email || !supabaseUid) {
        return res.status(400).json({ error: 'Email and supabaseUid are required' });
      }
      
      // Get user by email first
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: 'User not found with that email' });
      }
      
      // Update the user with the Supabase UID
      await storage.updateUser(user.id, { supabaseUid: supabaseUid });
      
      // Verify the update
      const updatedUser = await storage.getUserByEmail(email);
      
      res.json({
        success: true,
        message: 'Supabase UID updated successfully',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          supabaseUid: updatedUser.supabaseUid
        }
      });
    } catch (error) {
      console.error('❌ Error fixing Supabase UID:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // DATABASE INSPECTION ENDPOINT - Check user records
  app.get('/api/auth/inspect-users', async (req, res) => {
    try {
      console.log('🔍 Inspecting all user records...');
      
      // Get all users with key fields
      const allUsers = await storage.getAllUsers();
      
      const userSummaries = allUsers.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        supabaseUid: user.supabaseUid,
        isActive: user.isActive,
        tier: user.tier,
        plan: user.plan,
        isAdmin: user.isAdmin,
        onboardingCompleted: user.onboardingCompleted,
        createdAt: user.createdAt
      }));
      
      console.log(`Found ${userSummaries.length} users:`, userSummaries);
      
      res.json({ 
        count: userSummaries.length,
        users: userSummaries 
      });
      
    } catch (error) {
      console.error('❌ User inspection failed:', error);
      res.status(500).json({ 
        error: 'Failed to inspect users',
        details: error.message 
      });
    }
  });




  // Public endpoint to check if user is authenticated (no auth required)
  app.get('/api/auth/check', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.json({ authenticated: false });
      }
      
      const token = authHeader.split(' ')[1];
      
      // Note: Token verification now handled by authenticate middleware
      
      return res.json({ authenticated: false });
    } catch (error) {
      return res.json({ authenticated: false });
    }
  });
  
  // Get current user endpoint - uses Supabase authentication
  app.get('/api/auth/user', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      // Now using proper authentication middleware
      const userId = req.user?.id;

      if (!userId) {
        return res.status(400).json({ error: 'No user ID found' });
      }
      
      // Handle admin user from database or fallback from middleware
      console.log(`🔍 [DEBUG] Attempting storage.getUserById(${userId})`);
      let user;
      try {
        user = await storage.getUserById(userId);
        console.log(`🔍 [DEBUG] Database result:`, user ? 'User found' : 'User not found');
      } catch (error: any) {
        console.log(`⚠️ [DEBUG] Database lookup failed, using middleware data:`, error.message);
        // Use data from req.user (which includes fallback data)
        user = {
          id: req.user?.id,
          email: req.user?.email,
          firstName: req.user?.firstName,
          lastName: req.user?.lastName,
          isAdmin: req.user?.isAdmin,
          tier: req.user?.tier,
          emailPrefix: null,
          hasPaid: false,
          trialEndsAt: null,
          accountNotes: null,
          stripeCustomerId: null,
          stripeSubscriptionId: null,
        };
        console.log(`✅ [DEBUG] Using fallback user data for endpoint`);
      }
      
      // Auto-provision missing database record for valid Supabase users
      if (!user && req.user?.id && req.user?.email) {
        console.log(`🏗️ [AUTO-PROVISION] Creating missing database record for ${req.user.email}`);
        
        // Check if this is a bypass email that should get admin privileges
        const allowedBypassEmails = ['timfulker@gmail.com', 'timfulkermusic@gmail.com', 'jake.stanley@musobuddy.com'];
        const isAdminBypass = allowedBypassEmails.includes(req.user.email);
        
        try {
          const newUserData = {
            id: req.user.supabaseUid,
            email: req.user.email,
            supabaseUid: req.user.supabaseUid,
            firstName: req.user.firstName || '',
            lastName: req.user.lastName || '',
            tier: 'free',
            isAdmin: isAdminBypass,
            isAssigned: isAdminBypass, 
            hasPaid: isAdminBypass,
            isBetaTester: false,
            createdByAdmin: true,
            emailVerified: req.user.emailVerified || false
          };
          
          user = await storage.createUser(newUserData);
          console.log(`✅ [AUTO-PROVISION] Created user ${user.id} with admin: ${isAdminBypass}`);
          
        } catch (error: any) {
          // Handle race condition - another request might have created the user
          if (error.message?.includes('already exists') || error.code === '23505') {
            console.log(`🔄 [AUTO-PROVISION] User ${req.user.email} created by another request, refetching...`);
            user = await storage.getUserById(req.user.id) || await storage.getUserByEmail(req.user.email);
          } else {
            console.error(`❌ [AUTO-PROVISION] Failed to create user ${req.user.email}:`, error);
            throw error;
          }
        }
      }
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Return simplified user data with new access control fields
      const responseData = {
        // Identity
        id: user.id, // Frontend expects this field
        uid: user.id,
        userId: user.id, // Keep for backwards compatibility
        email: user.email,
        emailVerified: true, // Email verified if they can authenticate via JWT
        firstName: user.firstName,
        lastName: user.lastName,
        emailPrefix: user.emailPrefix || null,
        
        // User Type (new simplified fields) - handle both camelCase and snake_case
        isAdmin: user.isAdmin || user.is_admin || false,
        isAssigned: user.isAssigned || user.is_assigned || false,
        isBetaTester: user.isBetaTester || user.is_beta_tester || false,
        createdByAdmin: user.createdByAdmin || user.created_by_admin || false, // IMPORTANT: Include for access control
        
        // Access Control (new simplified fields) - handle both camelCase and snake_case  
        hasPaid: user.hasPaid || user.has_paid || false,
        trialEndsAt: user.trialEndsAt || null,
        accountNotes: user.accountNotes || null,
        
        // Stripe Integration (keep for payment processing)
        stripeCustomerId: user.stripeCustomerId || null,
        stripeSubscriptionId: user.stripeSubscriptionId || null,
        
        // No legacy fields - clean response only
        hasCompletedPayment: user.hasPaid || false
      };

      res.json(responseData);

    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Alias for /api/auth/user
  app.get('/api/auth/me', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Return simplified user data with new access control fields (matching /api/auth/user)
      res.json({
        // Identity
        uid: user.id,
        userId: user.id, // Keep for backwards compatibility
        email: user.email,
        emailVerified: true, // Email verified if they can authenticate via JWT
        firstName: user.firstName,
        lastName: user.lastName,
        emailPrefix: user.emailPrefix || null,
        
        // User Type (new simplified fields) - handle both camelCase and snake_case
        isAdmin: user.isAdmin || user.is_admin || false,
        isAssigned: user.isAssigned || user.is_assigned || false,
        isBetaTester: user.isBetaTester || user.is_beta_tester || false,
        createdByAdmin: user.createdByAdmin || user.created_by_admin || false, // IMPORTANT: Include for access control
        
        // Access Control (new simplified fields) - handle both camelCase and snake_case  
        hasPaid: user.hasPaid || user.has_paid || false,
        trialEndsAt: user.trialEndsAt || null,
        accountNotes: user.accountNotes || null,
        
        // Stripe Integration (keep for payment processing)
        stripeCustomerId: user.stripeCustomerId || null,
        stripeSubscriptionId: user.stripeSubscriptionId || null,
        
        // No legacy fields - clean response only
        hasCompletedPayment: user.hasPaid || false
      });

    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });



  // Verify SMS code - protected with rate limiting

  // CRITICAL FIX: Add subscription status directly in auth routes to avoid conflicts
  app.get('/api/subscription/status', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      console.log('📊 Auth route handling subscription status for userId:', userId);
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Return user subscription info from user record
      res.json({
        subscription: {
          plan: user.plan || 'free',
          stripeCustomerId: user.stripeCustomerId || null,
          stripeSubscriptionId: user.stripeSubscriptionId || null,
          trialStartDate: user.trialStartDate || null,
          trialEndDate: user.trialEndDate || null
        },
        user: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        }
      });
    } catch (error) {
      console.error('❌ Subscription status error:', error);
      res.status(500).json({ error: 'Failed to fetch subscription status' });
    }
  });

  // New endpoint: Authenticate users after Stripe checkout
  app.post('/api/auth/stripe-login', async (req, res) => {
    try {
      const { sessionId } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ error: 'Session ID is required' });
      }
      
      console.log(`🔐 Stripe login attempt with session ID: ${sessionId}`);
      
      // Get session details from Stripe
      const { stripeService } = await import('../core/stripe-service');
      const session = await stripeService.getSessionDetails(sessionId);
      
      if (!session) {
        return res.status(400).json({ error: 'Invalid session ID' });
      }
      
      const userEmail = session.metadata?.userEmail || session.customer_email;
      
      if (!userEmail) {
        return res.status(400).json({ error: 'No email found in session' });
      }
      
      console.log(`🔐 Looking up user with email: ${userEmail}`);
      
      // Find the user created by the webhook
      const user = await storage.getUserByEmail(userEmail);
      
      if (!user) {
        // User might not exist yet if webhook hasn't processed
        return res.status(404).json({ error: 'User not found. Please wait a moment and try again.' });
      }
      
      console.log(`✅ Stripe login successful for user: ${user.id} (${user.email})`);
      
      res.json({
        success: true,
        message: 'Authentication successful',
        user: {
          userId: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneVerified: true // Stripe users are considered verified
        }
      });
      
    } catch (error) {
      console.error('Stripe login error:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  });


  // Create Stripe checkout session for regular users
  app.post('/api/create-checkout-session', async (req, res) => {
    try {
      const { userEmail, userId, isBeta } = req.body;
      
      if (!userEmail || !userId) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      console.log('🔄 Creating checkout session for:', userEmail);
      console.log('📨 Beta status from frontend:', isBeta);
      
      // Check if user is a beta tester to apply appropriate coupon
      const user = await storage.getUserById(userId);
      
      // Automatically detect test mode from email pattern
      const isTestAccount = userEmail.includes('+test');
      const shouldUseTestMode = isTestAccount || process.env.NODE_ENV === 'development';
      const stripeKey = shouldUseTestMode 
        ? process.env.STRIPE_TEST_SECRET_KEY 
        : process.env.STRIPE_SECRET_KEY;
      
      if (isTestAccount) {
        console.log('🧪 Test account detected - using Stripe test mode');
      }
      
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(stripeKey || '', { 
        apiVersion: '2024-12-18.acacia' 
      });
      // Use isBeta from frontend if provided, otherwise check database
      const isBetaTester = isBeta || user?.isBetaTester || false;
      
      console.log('👤 User beta status:', isBetaTester);
      
      // Determine trial length based on beta status
      const trialDays = isBetaTester ? 90 : 30; // 90 days for beta, 30 for regular
      
      // Prepare subscription data with appropriate trial period
      const subscriptionData: any = {
        trial_period_days: trialDays,
        metadata: {
          is_beta_tester: isBetaTester ? 'true' : 'false'
        }
      };
      
      console.log(`🎯 Setting ${trialDays}-day trial for ${isBetaTester ? 'beta tester' : 'regular user'}`);
      
      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer_email: userEmail,
        payment_method_types: ['card'],
        line_items: [{
          price: shouldUseTestMode
            ? 'price_1RouBwD9Bo26CG1DAF1rkSZI' // Test environment
            : 'price_1RoX6JD9Bo26CG1DAHob4Bh1', // Live environment
          quantity: 1
        }],
        mode: 'subscription',
        subscription_data: subscriptionData,
        success_url: `${req.headers.origin}/trial-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin}/signup`,
        metadata: {
          userId: userId,
          userEmail: userEmail,
          signup_type: isBetaTester ? 'beta_tester' : 'trial',
          is_beta_user: isBetaTester.toString()
        }
      });
      
      console.log('✅ Checkout session created:', session.id);
      
      res.json({ 
        url: session.url,
        sessionId: session.id 
      });
      
    } catch (error: any) {
      console.error('❌ Checkout session creation failed:', error);
      res.status(500).json({ 
        error: 'Failed to create checkout session',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Stripe session verification endpoint
  app.post('/api/stripe/verify-session', async (req, res) => {
    try {
      const { sessionId } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ error: 'Session ID is required' });
      }
      
      console.log('🔍 Verifying Stripe session:', sessionId);
      console.log('🔍 [DEBUG] About to retrieve session from Stripe...');
      
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(process.env.STRIPE_TEST_SECRET_KEY || '', { 
        apiVersion: '2024-12-18.acacia' 
      });
      
      // Retrieve the session from Stripe
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['payment_intent', 'subscription'] // Expand both payment_intent and subscription
      });
      
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      
      // Check if session is complete (works for both subscriptions and one-time payments)
      if (session.status !== 'complete') {
        console.error('❌ Session not complete:', session.status);
        return res.status(400).json({ error: 'Session not complete' });
      }
      
      // For subscription mode (trial setup), just verify the session is complete
      if (session.mode === 'subscription') {
        console.log('✅ Subscription session verified:', {
          sessionId: session.id,
          subscription: session.subscription,
          status: session.status,
          paymentStatus: session.payment_status
        });
        // Session is complete, user has set up their trial/subscription
      } else if (session.mode === 'payment') {
        // For one-time payments, verify the payment_intent
        const paymentIntent = session.payment_intent as any;
        if (!paymentIntent || paymentIntent.status !== 'succeeded') {
          console.error('❌ Payment not succeeded');
          return res.status(402).json({ 
            error: 'Payment not completed'
          });
        }
      }
      
      // Get customer email
      const customerEmail = session.customer_email || session.metadata?.userEmail;
      
      if (!customerEmail) {
        console.error('❌ No customer email found in session');
        return res.status(400).json({ error: 'No customer email found' });
      }
      
      // Find user by email
      console.log('🔍 Looking up user by email:', customerEmail);
      let user = await storage.getUserByEmail(customerEmail);
      
      if (!user) {
        console.log('🏗️ User not found in database, creating from Stripe session...');
        
        // Auto-create user from Stripe session data
        const userId = nanoid();
        const userData = {
          id: userId,
          email: customerEmail,
          firstName: session.metadata?.firstName || '',
          lastName: session.metadata?.lastName || '',
          emailVerified: true, // Email verified if they can authenticate and pay
          hasPaid: true, // They just completed payment
          isAdmin: false,
          isAssigned: false,
          isBetaTester: false,
          createdByAdmin: false,
          stripeCustomerId: session.customer || null,
          stripeSubscriptionId: session.mode === 'subscription' ? session.subscription : null
        };
        
        user = await storage.createUser(userData);
        console.log('✅ Auto-created user from Stripe session:', user.id);
      }
      
      console.log('👤 Found user:', { 
        id: user.id, 
        email: user.email, 
        currentHasPaid: user.hasPaid 
      });
      
      console.log('✅ Session verified for user:', {
        user: user.email,
        sessionId: session.id,
        mode: session.mode,
        status: session.status
      });
      
      // ATOMIC UPDATE: Set payment status to true - session is complete
      console.log('🔄 Updating user payment status for:', user.id);
      const updateResult = await storage.updateUser(user.id, { 
        hasPaid: true,
        stripeCustomerId: session.customer || null,
        stripeSubscriptionId: session.mode === 'subscription' ? session.subscription : null
      });
      console.log('✅ User payment status updated to PAID, result:', updateResult?.hasPaid);
      
      // Return user data with updated payment status
      const updatedUser = await storage.getUserById(user.id);
      console.log('📊 Updated user from DB:', { 
        id: updatedUser.id, 
        email: updatedUser.email, 
        hasPaid: updatedUser.hasPaid 
      });
      res.json({
        success: true,
        user: {
          userId: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          hasPaid: updatedUser.hasPaid
        }
      });
      
    } catch (error: any) {
      console.error('❌ Session verification failed:', error);
      res.status(500).json({ 
        error: 'Session verification failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Note: Firebase authentication endpoint is defined earlier in the file at line 208


  
  // Subscription watchdog endpoint - checks subscription status for periodic verification  
  console.log('🔍 REGISTERING WATCHDOG ROUTE: /api/subscription/watchdog-status');
  app.get('/api/subscription/watchdog-status', authenticate, async (req: AuthenticatedRequest, res) => {
    console.log('🔍 WATCHDOG ENDPOINT HIT - userId:', req.user?.userId);
    try {
      const userId = req.user?.id;
      
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // STRICT: Only these 3 specific accounts bypass subscription checks  
      const allowedBypassEmails = ['timfulker@gmail.com', 'timfulkermusic@gmail.com', 'jake.stanley@musobuddy.com'];
      const isAdminCreated = allowedBypassEmails.includes(user.email) || user.createdByAdmin;
      
      // Check access using simplified logic - NO TRIAL ACCESS
      const hasValidSubscription = (user.isAdmin || user.is_admin) || (user.isAssigned || user.is_assigned) || (user.hasPaid || user.has_paid);

      console.log('🔍 WATCHDOG RESULT:', {
        userId: user.id,
        tier: user.tier,
        isSubscribed: user.isSubscribed,
        hasValidSubscription
      });

      res.json({
        hasValidSubscription,
        isAdminCreated,
        stripeCustomerId: user.stripeCustomerId,
        isSubscribed: user.isSubscribed,
        tier: user.tier,
        userId: user.id
      });

    } catch (error) {
      console.error('❌ Watchdog status error:', error);
      res.status(500).json({ error: 'Failed to fetch subscription status' });
    }
  });

  // Firebase custom token endpoint removed - system migrated to Supabase

  // NEW: Clean Supabase signup with database creation and beta user detection
  app.post('/api/auth/supabase-signup', async (req, res) => {
    try {
      const { supabaseUid, email, firstName, lastName, deviceFingerprint, inviteCode } = req.body;

      if (!supabaseUid || !email || !firstName || !lastName) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      console.log('🔷 Processing Supabase signup for:', email);

      // Log if invite code was provided
      if (inviteCode) {
        console.log('📨 Invite code provided:', inviteCode);
      }

      // Check if user already exists in database by Supabase UID
      const existingUserBySupabaseUid = await storage.getUserBySupabaseUid(supabaseUid);
      if (existingUserBySupabaseUid) {
        return res.status(409).json({
          error: 'Account already exists with this Supabase UID',
          redirect: '/login'
        });
      }

      // Check if user already exists by email
      const existingUserByEmail = await storage.getUserByEmail(email);
      if (existingUserByEmail) {
        // If user exists by email but no Supabase UID, update their record
        console.log('🔧 Updating existing user with Supabase UID:', supabaseUid);
        // TODO: Add updateUserSupabaseUid method to storage
        // For now, just return existing user info
        return res.status(200).json({
          user: existingUserByEmail,
          message: 'Account exists, linking with Supabase'
        });
      }

      // Check if user has a beta invite (same logic as Firebase)
      let isBetaUser = false;
      let betaInvite = null;

      try {
        console.log('🔍 Checking beta invite list for email:', email);
        betaInvite = await storage.getBetaInviteByEmail(email);

        if (betaInvite) {
          isBetaUser = true;
          console.log('✅ Beta user detected by email invitation');
        }

        // Check if invite code matches a valid dynamic beta code
        if (!isBetaUser && inviteCode) {
          try {
            const betaCode = await storage.getBetaInviteCodeByCode(inviteCode);
            if (betaCode && betaCode.status === 'active') {
              // Check if code hasn't expired
              if (!betaCode.expiresAt || new Date() <= new Date(betaCode.expiresAt)) {
                // Check if code hasn't reached max uses
                if (betaCode.currentUses < betaCode.maxUses) {
                  isBetaUser = true;
                  console.log('✅ Valid dynamic beta invite code provided:', inviteCode);

                  // Increment usage count
                  try {
                    await storage.incrementBetaInviteCodeUsage(inviteCode);
                    console.log('📈 Beta code usage incremented');
                  } catch (error) {
                    console.warn('⚠️ Failed to increment beta code usage:', error);
                  }
                } else {
                  console.log('❌ Beta code has reached maximum uses');
                }
              } else {
                console.log('❌ Beta code has expired');
              }
            } else {
              console.log('❌ Invalid or inactive beta code');
            }
          } catch (betaError) {
            console.warn('⚠️ Error validating beta code:', betaError);
          }
        }
      } catch (error) {
        console.warn('⚠️ Error checking beta status:', error);
      }

      // Create user in database
      const userId = nanoid();
      const userData = {
        id: userId,
        email: email,
        firstName: firstName,
        lastName: lastName,
        emailVerified: true, // Email verified via Supabase authentication
        supabaseUid: supabaseUid, // Store Supabase UID
        signupIpAddress: req.ip || req.connection?.remoteAddress || 'unknown',
        deviceFingerprint: deviceFingerprint,
        isBetaTester: isBetaUser,
        trialEndsAt: isBetaUser ? null : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14-day trial for non-beta users
      };

      console.log('💾 Creating user with data:', {
        id: userData.id,
        email: userData.email,
        supabaseUid: userData.supabaseUid,
        isBetaTester: userData.isBetaTester,
        trialEndsAt: userData.trialEndsAt
      });

      const user = await storage.createUser(userData);
      console.log('✅ User created in database with ID:', user.id);

      res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          supabaseUid: user.supabaseUid,
          isBetaTester: user.isBetaTester || false,
          trialEndsAt: user.trialEndsAt
        },
        message: 'Supabase account created successfully'
      });

    } catch (error: any) {
      console.error('❌ Supabase signup error:', error);

      if (error.code === '23505') { // Unique constraint violation
        return res.status(409).json({
          error: 'Account already exists',
          redirect: '/login'
        });
      }

      res.status(500).json({ error: 'Account creation failed' });
    }
  });

  // Periodic cleanup of expired verification codes for security hygiene
  setInterval(async () => {
    try {
      await storage.deleteExpiredSmsVerifications();
    } catch (error) {
      console.error('❌ Error cleaning up expired SMS verifications:', error);
    }
  }, 10 * 60 * 1000); // Clean up every 10 minutes

  console.log('✅ Clean authentication system configured with SMS and Stripe integration');
  console.log('🧹 Periodic cleanup enabled for expired verification codes');
}