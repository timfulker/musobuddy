import type { Express } from "express";
import { StripeService } from "../core/stripe-service";
import { authenticateWithFirebase, type AuthenticatedRequest } from '../middleware/firebase-auth';
import { storage } from "../core/storage";

const stripeService = new StripeService();

export function registerStripeRoutes(app: Express) {
  console.log('💳 Setting up Stripe routes with PRIORITY registration...');

  // Debug: Log all registered routes to confirm registration
  console.log('🔍 STRIPE ROUTES: Registering /api/subscription/test');
  console.log('🔍 STRIPE ROUTES: Registering /api/subscription/status');
  console.log('🔍 STRIPE ROUTES: Registering /api/create-checkout-session');
  console.log('🔥 PRIORITY STRIPE ROUTE REGISTRATION - These routes will take precedence');



  // Test route to verify auth middleware works
  app.get('/api/subscription/test', authenticateWithFirebase, async (req, res) => {
    const userId = req.user?.id;
    console.log('🔍 Test route - userId:', userId);
    res.json({ message: 'Auth test successful', userId });
  });

  // Public endpoint for new trial signups (no auth required)
  app.post('/api/start-trial', async (req, res) => {
    try {
      const { email, priceId = 'price_1RouBwD9Bo26CG1DAF1rkSZI' } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      console.log('🔥 Creating trial checkout session for new user:', email);

      // Get the host from request headers for dynamic URL generation
      const host = req.get('host') || req.headers.host;
      const result = await stripeService.createNewUserTrialSession(email, priceId, undefined, host);
      
      console.log('🔥 Trial session created:', result.sessionId);
      
      res.json({
        sessionId: result.sessionId,
        url: result.checkoutUrl,
        checkoutUrl: result.checkoutUrl
      });

    } catch (error) {
      console.error('❌ Trial session creation failed:', error);
      res.status(500).json({ 
        error: 'Failed to create trial session',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Create checkout session for new users after phone verification
  app.post('/api/stripe/create-checkout', async (req, res) => {
    try {
      const { userId, email, priceId = 'price_1RouBwD9Bo26CG1DAF1rkSZI' } = req.body;

      if (!userId || !email) {
        return res.status(400).json({ error: 'User ID and email are required' });
      }

      console.log('🔥 Creating checkout session for verified user:', userId);

      // Get user to verify they exist
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get the host from request headers for dynamic URL generation
      const host = req.get('host') || req.headers.host;
      // Create Stripe checkout session
      const result = await stripeService.createNewUserTrialSession(email, priceId, userId, host);
      
      console.log('🔥 Checkout session created for user:', userId, 'sessionId:', result.sessionId);
      
      res.json({
        sessionId: result.sessionId,
        url: result.checkoutUrl,
        checkoutUrl: result.checkoutUrl
      });

    } catch (error) {
      console.error('❌ Checkout session creation failed:', error);
      res.status(500).json({ 
        error: 'Failed to create checkout session',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Verify payment session and complete user setup
  app.post('/api/stripe/verify-session', async (req, res) => {
    try {
      const { sessionId } = req.body;

      if (!sessionId) {
        return res.status(400).json({ error: 'Session ID is required' });
      }

      console.log('🔥 Verifying payment session:', sessionId);

      // Get session details from Stripe
      const sessionDetails = await stripeService.getSessionDetails(sessionId);
      
      if (!sessionDetails || sessionDetails.payment_status !== 'paid') {
        return res.status(400).json({ error: 'Payment not completed' });
      }

      // Get or create user from session metadata
      const email = sessionDetails.customer_email || sessionDetails.customer_details?.email;
      const userId = sessionDetails.metadata?.userId;
      
      if (!email) {
        return res.status(400).json({ error: 'No email found in session' });
      }

      let user = userId ? await storage.getUserById(userId) : null;
      
      if (!user) {
        // Try to find user by email
        user = await storage.getUserByEmail(email);
      }

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Update user with Stripe customer ID and subscription
      const customerId = sessionDetails.customer as string;
      const subscriptionId = sessionDetails.subscription as string;

      await storage.updateUser(user.id, {
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        plan: 'trial',
        trialStartDate: new Date(),
        trialEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        createdViaStripe: true
      });

      console.log('✅ User subscription activated:', user.id);

      res.json({
        success: true,
        message: 'Payment verified and subscription activated',
        user: {
          userId: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          emailPrefix: user.emailPrefix || null
        }
      });

    } catch (error) {
      console.error('❌ Session verification failed:', error);
      res.status(500).json({ 
        error: 'Failed to verify payment session',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Existing checkout session for authenticated users
  app.post('/api/create-checkout-session', authenticateWithFirebase, async (req, res) => {
    try {
      const { priceId = 'price_1RouBwD9Bo26CG1DAF1rkSZI' } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      console.log('🔥 Creating checkout session for user:', userId, 'priceId:', priceId);

      // Get the host from request headers for dynamic URL generation
      const host = req.get('host') || req.headers.host;
      const result = await stripeService.createTrialCheckoutSession(userId, priceId, host);
      
      console.log('🔥 Checkout session created:', result.sessionId);
      
      res.json({
        sessionId: result.sessionId,
        url: result.checkoutUrl,
        checkoutUrl: result.checkoutUrl
      });

    } catch (error) {
      console.error('❌ Checkout session creation failed:', error);
      res.status(500).json({ 
        error: 'Failed to create checkout session',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Alternative subscription status endpoint to avoid route conflicts
  app.get('/api/stripe/subscription-status', authenticateWithFirebase, async (req, res) => {
    try {
      const userId = req.user?.id;
      console.log('🔍 Stripe subscription status - userId:', userId);
      
      if (!userId) {
        console.log('❌ Stripe subscription status - no userId found');
        return res.status(401).json({ error: 'Authentication required' });
      }

      console.log('🔍 Stripe subscription status - calling stripeService.getSubscriptionStatus...');
      const subscriptionStatus = await stripeService.getSubscriptionStatus(userId);
      console.log('✅ Stripe subscription status - result:', subscriptionStatus);
      res.json(subscriptionStatus);

    } catch (error) {
      console.error('❌ Error getting stripe subscription status:', error);
      res.status(500).json({ error: 'Failed to get subscription status' });
    }
  });

  // REMOVED: Duplicate endpoint - now handled in auth-clean.ts to avoid conflicts

  // Handle Stripe webhooks
  app.post('/api/stripe/webhook', async (req, res) => {
    try {
      const signature = req.headers['stripe-signature'] as string;
      
      if (!signature) {
        return res.status(400).json({ error: 'Missing stripe-signature header' });
      }

      const result = await stripeService.handleWebhook(req.body, signature);
      
      console.log('🔥 Webhook processed successfully:', result);
      res.json({ received: true });

    } catch (error) {
      console.error('❌ Webhook processing failed:', error);
      res.status(400).json({ error: 'Webhook signature verification failed' });
    }
  });

  // Payment success callback
  app.get('/payment-success', async (req, res) => {
    try {
      const sessionId = req.query.session_id as string;
      
      if (!sessionId) {
        return res.redirect('/pricing?error=no_session');
      }

      // Get session details to verify payment
      const sessionDetails = await stripeService.getSessionDetails(sessionId);
      
      console.log('🔥 Payment success for session:', sessionId);
      
      // Redirect to dashboard with success message
      res.redirect('/dashboard?payment=success');

    } catch (error) {
      console.error('❌ Payment success handling failed:', error);
      res.redirect('/pricing?error=payment_verification');
    }
  });

  console.log('✅ Stripe routes configured');
}