import Stripe from 'stripe';
import { storage } from './storage';

// Import centralized environment detection
import { getAppServerUrl } from './environment';

// Initialize Stripe with test key for beta testing (only if available)
let stripe: Stripe | null = null;
if (process.env.STRIPE_TEST_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_TEST_SECRET_KEY, {
    apiVersion: '2025-06-30.basil' as any,
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
        success_url: `${getAppServerUrl()}/trial-success?stripe_session={CHECKOUT_SESSION_ID}`,
        cancel_url: `${getAppServerUrl()}/pricing`,
        metadata: {
          userId: userId,
          userEmail: user.email || '',
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

  async getSessionDetails(sessionId: string) {
    if (!this.stripe) {
      throw new Error('Stripe not configured - please add STRIPE_TEST_SECRET_KEY environment variable');
    }
    
    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);
      return {
        id: session.id,
        customer: session.customer,
        metadata: session.metadata,
        status: session.status,
      };
    } catch (error) {
      console.error('Error getting session details:', error);
      throw error;
    }
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

      let result = { received: true, eventType: event.type, eventId: event.id, userId: undefined as string | undefined, customerId: undefined as string | undefined };

      switch (event.type) {
        case 'checkout.session.completed':
          console.log(`🔥 [STRIPE-${webhookId}] Processing checkout completion...`);
          const session = event.data.object as Stripe.Checkout.Session;
          await this.handleCheckoutCompleted(session);
          result.userId = session.metadata?.userId || undefined;
          result.customerId = (session.customer as string) || undefined;
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
        tier: 'core',
        stripeCustomerId: customerId,
        trialStatus: 'active',
        trialExpiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
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