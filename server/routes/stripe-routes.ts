import type { Express } from "express";
import { StripeService } from "../core/stripe-service";
import { requireAuth } from '../middleware/auth';
import { storage } from "../core/storage";

const stripeService = new StripeService();

export function registerStripeRoutes(app: Express) {
  console.log('💳 Setting up Stripe routes...');

  // Create checkout session for subscription
  app.post('/api/create-checkout-session', requireAuth, async (req, res) => {
    try {
      const { priceId = 'price_1RouBwD9Bo26CG1DAF1rkSZI' } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      console.log('🔥 Creating checkout session for user:', userId, 'priceId:', priceId);

      const result = await stripeService.createTrialCheckoutSession(userId, priceId);
      
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

  // Get subscription status
  app.get('/api/subscription/status', requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const subscriptionStatus = await stripeService.getSubscriptionStatus(userId);
      res.json(subscriptionStatus);

    } catch (error) {
      console.error('❌ Error getting subscription status:', error);
      res.status(500).json({ error: 'Failed to get subscription status' });
    }
  });

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