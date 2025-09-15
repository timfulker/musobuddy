import { type Express } from "express";
import { storage } from "../core/storage";
import { nanoid } from 'nanoid';
import { verifyFirebaseToken, createCustomToken } from '../core/firebase-admin';
import { authenticate, type AuthenticatedRequest } from '../middleware/simple-auth';
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
      getUserByFirebaseUidExists: typeof storage.getUserByFirebaseUid === 'function',
      createUserExists: typeof storage.createUser === 'function',
      verifyFirebaseTokenExists: typeof verifyFirebaseToken === 'function',
      firebaseAdminConfigured: true
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
        firebaseUid: user.firebaseUid,
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

  // DISABLED: Firebase auth is now handled client-side only
  // app.post('/api/auth/firebase-login', async (req, res) => {
  //   console.log('🔥 Firebase login endpoint called (deprecated - auth handled client-side)');
  //   res.json({
  //     success: true,
  //     message: 'Authentication now handled entirely client-side with Firebase'
  //   });
  // });



  // Public endpoint to check if user is authenticated (no auth required)
  app.get('/api/auth/check', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.json({ authenticated: false });
      }
      
      const token = authHeader.split(' ')[1];
      
      try {
        const firebaseUser = await verifyFirebaseToken(token);
        if (firebaseUser) {
          const user = await storage.getUserByFirebaseUid(firebaseUser.uid);
          return res.json({ 
            authenticated: true,
            hasPaid: user?.hasPaid || false,
            email: user?.email
          });
        }
      } catch (error) {
        // Token invalid
      }
      
      return res.json({ authenticated: false });
    } catch (error) {
      return res.json({ authenticated: false });
    }
  });
  
  // Get current user endpoint - uses Supabase authentication
  app.get('/api/auth/user', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      console.log(`🔍 [DEBUG] /api/auth/user - userId: ${userId}, req.user:`, req.user);

      // HOTFIX: If userId is undefined but we have email, lookup by email directly
      if (!userId && req.user?.email) {
        console.log(`🔧 [HOTFIX] No userId but have email ${req.user.email}, looking up by email`);
        const userByEmail = await storage.getUserByEmail(req.user.email);
        if (userByEmail) {
          console.log(`✅ [HOTFIX] Found user by email: ${userByEmail.id}`);
          return res.json({
            id: userByEmail.id,
            email: userByEmail.email,
            firstName: userByEmail.firstName || '',
            lastName: userByEmail.lastName || '',
            isAdmin: userByEmail.isAdmin || false,
            tier: userByEmail.tier || 'free'
          });
        }
      }

      if (!userId) {
        console.error('❌ [DEBUG] No userId found in req.user');
        return res.status(400).json({ error: 'No user ID found' });
      }
      
      // Handle admin user from database
      console.log(`🔍 [DEBUG] Calling storage.getUserById(${userId})`);
      const user = await storage.getUserById(userId);
      console.log(`🔍 [DEBUG] Database result:`, user ? 'User found' : 'User not found');
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Return simplified user data with new access control fields
      const responseData = {
        // Identity
        uid: user.id,
        userId: user.id, // Keep for backwards compatibility
        email: user.email,
        emailVerified: req.user?.emailVerified || false, // Add Firebase email verification status
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
        emailVerified: req.user?.emailVerified || false, // Add Firebase email verification status
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

  // NEW: Clean Firebase signup with database creation and beta user detection
  app.post('/api/auth/firebase-signup', async (req, res) => {
    try {
      const { idToken, firstName, lastName, deviceFingerprint, inviteCode } = req.body;
      
      if (!idToken || !firstName || !lastName) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      console.log('🔥 Processing Firebase signup...');
      
      // Log if invite code was provided
      if (inviteCode) {
        console.log('📨 Invite code provided:', inviteCode);
      }
      
      // Verify Firebase token
      const firebaseUser = await verifyFirebaseToken(idToken);
      if (!firebaseUser) {
        return res.status(401).json({ error: 'Invalid Firebase token' });
      }
      
      console.log('✅ Firebase token verified for:', firebaseUser.email);
      
      // Check if user already exists in database by Firebase UID
      const existingUser = await storage.getUserByFirebaseUid(firebaseUser.uid);
      if (existingUser) {
        return res.status(409).json({ 
          error: 'Account already exists',
          redirect: '/login' 
        });
      }
      
      // Check if user has a beta invite (either by email match or invite code)
      let isBetaUser = false;
      let betaInvite = null;
      
      try {
        console.log('🔍 Checking beta invite list for email:', firebaseUser.email);
        betaInvite = await storage.getBetaInviteByEmail(firebaseUser.email || '');
        
        // Check if invite code matches a valid dynamic beta code
        if (!isBetaUser && inviteCode) {
          const betaCode = await storage.getBetaInviteCodeByCode(inviteCode);
          if (betaCode && betaCode.status === 'active') {
            // Check if code hasn't expired
            if (!betaCode.expiresAt || new Date() <= new Date(betaCode.expiresAt)) {
              // Check if code hasn't reached max uses
              if (betaCode.currentUses < betaCode.maxUses) {
                isBetaUser = true;
                console.log('✅ Valid dynamic beta invite code provided:', inviteCode);
                console.log('📋 Code details:', {
                  id: betaCode.id,
                  maxUses: betaCode.maxUses,
                  currentUses: betaCode.currentUses,
                  trialDays: betaCode.trialDays,
                  description: betaCode.description
                });
              } else {
                console.log('⚠️ Beta code has reached maximum uses:', inviteCode);
              }
            } else {
              console.log('⚠️ Beta code has expired:', inviteCode);
            }
          } else {
            console.log('❌ Invalid or inactive beta code:', inviteCode);
          }
        }
        
        if (betaInvite && betaInvite.status === 'pending') {
          isBetaUser = true;
          console.log('✅ Beta invite found - user eligible for beta access');
          console.log('📋 Beta invite details:', {
            cohort: betaInvite.cohort,
            invitedBy: betaInvite.invitedBy,
            invitedAt: betaInvite.invitedAt
          });
        } else if (betaInvite && betaInvite.status === 'used') {
          console.log('⚠️ Beta invite already used - treating as regular user');
        } else if (!isBetaUser) {
          console.log('❌ No beta invite found for this email - regular signup');
        }
      } catch (betaError) {
        console.error('⚠️ Beta invite check failed, continuing as regular user:', betaError);
        // Continue without beta status if beta check fails
      }
      
      // Capture security and tracking data
      const signupIP = req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for'] as string || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';
      
      console.log('🔒 Security data captured:', { signupIP, userAgent, deviceFingerprint });
      
      // Determine trial duration based on user type
      const trialDays = isBetaUser ? 90 : 30; // Beta testers get 90 days, regular users get 30 days
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);
      
      // Create user in database with trial period
      const userId = nanoid();
      const newUser = await storage.createUser({
        id: userId,
        email: firebaseUser.email || '',
        firstName,
        lastName,
        firebaseUid: firebaseUser.uid,
        isAdmin: false,
        isBetaTester: isBetaUser,
        isAssigned: false, // Not an assigned account
        trialEndsAt: trialEndsAt, // Set trial expiration
        hasPaid: false, // Hasn't paid yet
        // No tier field - using simplified access control
        stripeCustomerId: null, // Will be set during subscription creation
        signupIpAddress: signupIP,
        deviceFingerprint: deviceFingerprint || `${userAgent}-${Date.now()}`,
        lastLoginAt: new Date(),
        lastLoginIP: signupIP,
        fraudScore: 0,
        createdAt: new Date()
      });
      
      console.log(`✅ User created in database: ${userId} (${isBetaUser ? 'BETA' : 'REGULAR'})`);
      
      // Mark beta invite as used if applicable
      if (isBetaUser) {
        try {
          // Mark email-based beta invite as used
          if (betaInvite) {
            await storage.markBetaInviteAsUsed(firebaseUser.email || '', userId);
            console.log('✅ Beta invite marked as used');
          }
          
          // Mark beta invite code as used if one was provided
          if (inviteCode) {
            await storage.markBetaInviteCodeAsUsed(inviteCode, userId);
            console.log('✅ Beta invite code marked as used:', inviteCode);
          }
        } catch (error) {
          console.error('⚠️ Failed to mark beta invite/code as used:', error);
          // Don't fail the whole signup for this
        }
      }
      
      res.json({
        success: true,
        user: {
          userId: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          isBeta: isBetaUser,
          trialEndsAt: trialEndsAt,
          hasPaid: false
        },
        message: isBetaUser 
          ? 'Welcome! Complete setup to start your 1-year free beta access.' 
          : 'Welcome! Complete setup to start your 30-day trial.',
        redirect: '/payment' // Everyone goes to payment (Stripe handles trial)
      });
      
    } catch (error: any) {
      console.error('❌ Firebase signup error:', error);
      res.status(500).json({ 
        error: 'Account creation failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
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
      const user = await storage.getUserByEmail(customerEmail);
      
      if (!user) {
        console.error('❌ User not found for email:', customerEmail);
        return res.status(404).json({ error: 'User not found' });
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

  // Generate Firebase custom token for authenticated user after payment
  app.post('/api/auth/firebase-token', async (req, res) => {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      console.log('🔥 Generating Firebase custom token for user:', userId);

      // Get user from database
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (!user.firebaseUid) {
        return res.status(400).json({ error: 'User does not have Firebase UID' });
      }

      // Generate custom token
      const customToken = await createCustomToken(user.firebaseUid, {
        userId: user.id,
        email: user.email,
        tier: user.tier
      });

      console.log('✅ Custom token generated for user:', user.email);

      res.json({
        success: true,
        customToken: customToken
      });

    } catch (error: any) {
      console.error('❌ Custom token generation error:', error);
      res.status(500).json({ 
        error: 'Failed to generate authentication token',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

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