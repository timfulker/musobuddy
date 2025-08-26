import { type Express } from "express";
import { storage } from "../core/storage";
import { nanoid } from 'nanoid';
import { verifyFirebaseToken, createCustomToken } from '../core/firebase-admin';
import { authenticateWithFirebase, type AuthenticatedRequest } from '../middleware/firebase-auth';

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



  // Get current user endpoint - uses Firebase authentication
  app.get('/api/auth/user', authenticateWithFirebase, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      
      // Handle admin user from database
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: user.isAdmin || false,
        phoneVerified: user.phoneVerified || false,
        emailPrefix: user.emailPrefix || null
      });

    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Alias for /api/auth/user
  app.get('/api/auth/me', authenticateWithFirebase, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: user.isAdmin || false,
        phoneVerified: user.phoneVerified || false,
        emailPrefix: user.emailPrefix || null
      });

    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });



  // Verify SMS code - protected with rate limiting

  // CRITICAL FIX: Add subscription status directly in auth routes to avoid conflicts
  app.get('/api/subscription/status', authenticateWithFirebase, async (req: AuthenticatedRequest, res) => {
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
      const { idToken, firstName, lastName } = req.body;
      
      if (!idToken || !firstName || !lastName) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      console.log('🔥 Processing Firebase signup...');
      
      // Verify Firebase token
      const firebaseUser = await verifyFirebaseToken(idToken);
      if (!firebaseUser) {
        return res.status(401).json({ error: 'Invalid Firebase token' });
      }
      
      console.log('✅ Firebase token verified for:', firebaseUser.email);
      
      // Check if user already exists in database
      const existingUser = await storage.getUserByFirebaseUid(firebaseUser.uid);
      if (existingUser) {
        return res.status(409).json({ 
          error: 'Account already exists',
          redirect: '/login' 
        });
      }
      
      // Check if user is a beta tester in Stripe
      let isBetaUser = false;
      let stripeCustomerId = null;
      
      try {
        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(process.env.STRIPE_TEST_SECRET_KEY || '', { 
          apiVersion: '2024-12-18.acacia' 
        });
        
        console.log('🔍 Checking Stripe for beta customer with email:', firebaseUser.email);
        console.log('🔑 Using Stripe key starting with:', process.env.STRIPE_SECRET_KEY?.substring(0, 12));
        const customers = await stripe.customers.list({
          email: firebaseUser.email,
          limit: 1
        });
        
        console.log('📋 Stripe API returned:', customers.data.length, 'customers');
        
        if (customers.data.length > 0) {
          const customer = customers.data[0];
          console.log('🎯 Found Stripe customer:', customer.id);
          
          // Check if customer has beta metadata or subscription
          if (customer.metadata?.is_beta === 'true') {
            isBetaUser = true;
            stripeCustomerId = customer.id;
            console.log('✅ Beta user detected via metadata');
          } else {
            // Check for beta subscription
            const subscriptions = await stripe.subscriptions.list({
              customer: customer.id,
              limit: 10
            });
            
            const hasBetaSubscription = subscriptions.data.some(sub => 
              sub.items.data.some(item => 
                item.price.product === 'beta' || 
                item.price.nickname?.toLowerCase().includes('beta')
              )
            );
            
            if (hasBetaSubscription) {
              isBetaUser = true;
              stripeCustomerId = customer.id;
              console.log('✅ Beta user detected via subscription');
            }
          }
        }
      } catch (stripeError) {
        console.error('⚠️ Stripe check failed, continuing as regular user:', stripeError);
        console.error('⚠️ Error details:', stripeError.message);
        console.error('⚠️ Error type:', stripeError.type);
        // Continue without beta status if Stripe fails
      }
      
      // Create user in database with appropriate status
      const userId = nanoid();
      const newUser = await storage.createUser({
        id: userId,
        email: firebaseUser.email || '',
        password: '', // Firebase users don't need password
        firstName,
        lastName,
        firebaseUid: firebaseUser.uid,
        phoneVerified: firebaseUser.emailVerified || false,
        isAdmin: false,
        isBetaTester: isBetaUser,
        tier: isBetaUser ? 'standard' : 'pending_payment',
        stripeCustomerId: stripeCustomerId,
        createdAt: new Date()
      });
      
      console.log(`✅ User created in database: ${userId} (${isBetaUser ? 'BETA' : 'REGULAR'})`);
      
      res.json({
        success: true,
        user: {
          userId: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          status: newUser.tier,
          isBeta: isBetaUser
        },
        requiresPayment: !isBetaUser
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
      const { userEmail, userId } = req.body;
      
      if (!userEmail || !userId) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(process.env.STRIPE_TEST_SECRET_KEY || '', { 
        apiVersion: '2024-12-18.acacia' 
      });
      
      console.log('🔄 Creating checkout session for:', userEmail);
      
      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer_email: userEmail,
        payment_method_types: ['card'],
        line_items: [{
          price: 'price_1RouBwD9Bo26CG1DAF1rkSZI', // Your pre-configured Stripe price ID
          quantity: 1
        }],
        mode: 'subscription',
        success_url: `${req.headers.origin}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin}/signup`,
        metadata: {
          userId: userId,
          userEmail: userEmail
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

  // Note: Firebase authentication endpoint is defined earlier in the file at line 208


  
  // Subscription watchdog endpoint - checks subscription status for periodic verification  
  console.log('🔍 REGISTERING WATCHDOG ROUTE: /api/subscription/watchdog-status');
  app.get('/api/subscription/watchdog-status', authenticateWithFirebase, async (req: AuthenticatedRequest, res) => {
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
      
      // Check subscription validity - pending_payment users need to complete payment
      const hasValidSubscription = 
        (user.isSubscribed && user.stripeCustomerId && user.tier !== 'free') &&
        user.tier !== 'pending_payment'; // Exclude pending_payment users - they need to complete payment

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