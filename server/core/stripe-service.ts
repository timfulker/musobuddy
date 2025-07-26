import Stripe from 'stripe';
import { storage } from './storage';

// URL detection function for production/development environments
function getAppServerUrl(): string {
  // 1. Check for explicit production environment variable (highest priority)
  if (process.env.APP_SERVER_URL) {
    console.log('🔗 Using explicit APP_SERVER_URL:', process.env.APP_SERVER_URL);
    return process.env.APP_SERVER_URL;
  }
  
  // 2. Check for Replit deployment environments
  if (process.env.REPLIT_DEPLOYMENT) {
    console.log('🔗 Detected REPLIT_DEPLOYMENT, using production URL');
    return 'https://musobuddy.replit.app';
  }
  
  if (process.env.REPLIT_DEV_DOMAIN) {
    console.log('🔗 Detected REPLIT_DEV_DOMAIN, using production URL');
    return 'https://musobuddy.replit.app';
  }
  
  // 3. Check for production indicators
  if (process.env.NODE_ENV === 'production') {
    console.log('🔗 Detected NODE_ENV=production, using production URL');
    return 'https://musobuddy.replit.app';
  }
  
  // 4. Default to localhost for development
  console.log('🔗 Using localhost for development');
  return 'http://localhost:5000';
}

// Initialize Stripe with test key for beta testing (only if available)
let stripe: Stripe | null = null;
if (process.env.STRIPE_TEST_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_TEST_SECRET_KEY, {
    apiVersion: '2023-10-16',
  });
}

export class StripeService {
  private stripe = stripe;

  async createTrialCheckoutSession(userId: string, priceId: string = 'price_1RouBwD9Bo26CG1DAF1rkSZI') {
    if (!this.stripe) {
      throw new Error('Stripe not configured - please add STRIPE_TEST_SECRET_KEY environment variable');
    }
    
    try {
      const user = await storage.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Create or get Stripe customer
      let customerId = user.stripeCustomerId;
      
      if (!customerId) {
        const customer = await this.stripe.customers.create({
          email: user.email || '',
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          phone: user.phoneNumber || undefined,
          metadata: {
            userId: userId,
          },
        });
        customerId = customer.id;
        
        // Update user with Stripe customer ID
        await storage.updateUser(userId, { stripeCustomerId: customerId });
      }

      // Create checkout session with 14-day trial
      const session = await this.stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId, // Core monthly price ID
            quantity: 1,
          },
        ],
        mode: 'subscription',
        subscription_data: {
          trial_period_days: 14,
          metadata: {
            userId: userId,
            trial_type: 'core_monthly',
          },
        },
        success_url: `${getAppServerUrl()}/trial-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${getAppServerUrl()}/pricing`,
        metadata: {
          userId: userId,
          trial_type: 'core_monthly',
        },
        allow_promotion_codes: false,
        billing_address_collection: 'required',
      });

      return { sessionId: session.id, checkoutUrl: session.url };
    } catch (error) {
      console.error('Error creating trial checkout session:', error);
      throw error;
    }
  }

  async createCheckoutSession(userId: string, priceId: string = 'price_1RouBwD9Bo26CG1DAF1rkSZI') {
    // Legacy method for non-trial subscriptions
    return this.createTrialCheckoutSession(userId, priceId);
  }

  async handleWebhook(body: Buffer, signature: string) {
    const webhookId = Date.now().toString();
    
    if (!this.stripe) {
      throw new Error('Stripe not configured - please add STRIPE_TEST_SECRET_KEY environment variable');
    }
    
    try {
      console.log(`🔥 [STRIPE-${webhookId}] [${new Date().toISOString()}] Processing webhook`);
      console.log(`🔥 [STRIPE-${webhookId}] Signature: ${signature ? 'Present' : 'Missing'}`);
      console.log(`🔥 [STRIPE-${webhookId}] Body length: ${body.length}`);
      
      const event = this.stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET || ''
      );

      console.log(`🔥 [STRIPE-${webhookId}] ✅ Signature verified`);
      console.log(`🔥 [STRIPE-${webhookId}] Event type: ${event.type}`);
      console.log(`🔥 [STRIPE-${webhookId}] Event ID: ${event.id}`);

      let result = { received: true, eventType: event.type, eventId: event.id, userId: undefined, customerId: undefined };

      switch (event.type) {
        case 'checkout.session.completed':
          console.log(`🔥 [STRIPE-${webhookId}] Processing checkout completion...`);
          const session = event.data.object as Stripe.Checkout.Session;
          await this.handleCheckoutCompleted(session);
          result.userId = session.metadata?.userId;
          result.customerId = session.customer as string;
          console.log(`🔥 [STRIPE-${webhookId}] ✅ Checkout completion processed`);
          break;
        
        case 'customer.subscription.deleted':
          console.log(`🔥 [STRIPE-${webhookId}] Processing subscription deletion...`);
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          console.log(`🔥 [STRIPE-${webhookId}] ✅ Subscription deletion processed`);
          break;
        
        case 'invoice.payment_failed':
          console.log(`🔥 [STRIPE-${webhookId}] Processing payment failure...`);
          await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
          console.log(`🔥 [STRIPE-${webhookId}] ✅ Payment failure processed`);
          break;
        
        default:
          console.log(`🔥 [STRIPE-${webhookId}] ⚠️ Unhandled event type: ${event.type}`);
      }

      console.log(`🔥 [STRIPE-${webhookId}] ✅ Webhook handling complete`);
      return result;
    } catch (error) {
      console.error(`🔥 [STRIPE-${webhookId}] ❌ Webhook error:`, error);
      throw error;
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const sessionId = Date.now().toString();
    console.log(`🔥 [CHECKOUT-${sessionId}] [${new Date().toISOString()}] Processing checkout completion`);
    console.log(`🔥 [CHECKOUT-${sessionId}] Session ID: ${session.id}`);
    
    const userId = session.metadata?.userId;
    const customerId = session.customer as string;

    console.log(`🔥 [CHECKOUT-${sessionId}] UserID: ${userId}`);
    console.log(`🔥 [CHECKOUT-${sessionId}] CustomerID: ${customerId}`);

    if (!userId) {
      console.error(`🔥 [CHECKOUT-${sessionId}] ❌ No userId in metadata:`, session.metadata);
      return;
    }

    try {
      console.log(`🔥 [CHECKOUT-${sessionId}] Updating user subscription...`);
      
      // Update user subscription status
      console.log(`🔥 [CHECKOUT-${sessionId}] Updating user with:`, {
        isSubscribed: true,
        plan: 'core',
        stripeCustomerId: customerId,
      });
      
      await storage.updateUser(userId, {
        isSubscribed: true,
        plan: 'core',
        stripeCustomerId: customerId,
      });

      console.log(`🔥 [CHECKOUT-${sessionId}] ✅ User subscription activated: ${userId}`);
      
      // Verify the update worked
      const updatedUser = await storage.getUserById(userId);
      console.log(`🔥 [CHECKOUT-${sessionId}] ✅ Verification - User plan: ${updatedUser?.plan}, subscribed: ${updatedUser?.isSubscribed}`);
      
    } catch (error) {
      console.error(`🔥 [CHECKOUT-${sessionId}] ❌ Error updating user:`, error);
      throw error; // Re-throw to ensure webhook fails properly
    }
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const customerId = subscription.customer as string;
    
    try {
      // Find user by Stripe customer ID
      const user = await storage.getUserByStripeCustomerId(customerId);
      if (user) {
        await storage.updateUser(user.id, {
          isSubscribed: false,
          plan: 'free',
        });
        console.log('✅ User subscription cancelled:', user.id);
      }
    } catch (error) {
      console.error('Error handling subscription deletion:', error);
    }
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice) {
    const customerId = invoice.customer as string;
    
    try {
      // Find user by Stripe customer ID
      const user = await storage.getUserByStripeCustomerId(customerId);
      if (user) {
        await storage.updateUser(user.id, {
          isSubscribed: false,
          plan: 'free',
        });
        console.log('⚠️ User subscription paused due to payment failure:', user.id);
      }
    } catch (error) {
      console.error('Error handling payment failure:', error);
    }
  }

  async getSubscriptionStatus(userId: string) {
    try {
      const user = await storage.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      return {
        plan: user.plan || 'free',
        isSubscribed: user.isSubscribed || false,
        isLifetime: user.isLifetime || false,
        hasAccess: user.isSubscribed || user.isLifetime,
      };
    } catch (error) {
      console.error('Error getting subscription status:', error);
      throw error;
    }
  }
}

export const stripeService = new StripeService();