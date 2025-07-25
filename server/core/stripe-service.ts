import Stripe from 'stripe';
import { storage } from './storage';

// Initialize Stripe with secret key (only if available)
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-06-30.basil',
  });
}

export class StripeService {
  private stripe = stripe;

  async createTrialCheckoutSession(userId: string, priceId: string = 'price_1RoX6JD9Bo26CG1DAHob4Bh1') {
    if (!this.stripe) {
      throw new Error('Stripe not configured - please add STRIPE_SECRET_KEY environment variable');
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
        success_url: `${process.env.APP_SERVER_URL || 'http://localhost:5000'}/trial-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.APP_SERVER_URL || 'http://localhost:5000'}/pricing`,
        metadata: {
          userId: userId,
          trial_type: 'core_monthly',
        },
        allow_promotion_codes: false,
        billing_address_collection: 'required',
      });

      return { sessionId: session.id, url: session.url };
    } catch (error) {
      console.error('Error creating trial checkout session:', error);
      throw error;
    }
  }

  async createCheckoutSession(userId: string, priceId: string = 'price_1RoX6JD9Bo26CG1DAHob4Bh1') {
    // Legacy method for non-trial subscriptions
    return this.createTrialCheckoutSession(userId, priceId);
  }

  async handleWebhook(body: Buffer, signature: string) {
    if (!this.stripe) {
      throw new Error('Stripe not configured - please add STRIPE_SECRET_KEY environment variable');
    }
    
    try {
      const event = this.stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET || ''
      );

      console.log('Stripe webhook event:', event.type);

      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          break;
        
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
        
        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;
        
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      return { received: true };
    } catch (error) {
      console.error('Webhook error:', error);
      throw error;
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.userId;
    const customerId = session.customer as string;

    if (!userId) {
      console.error('No userId in checkout session metadata');
      return;
    }

    try {
      // Update user subscription status
      await storage.updateUser(userId, {
        isSubscribed: true,
        plan: 'core', // Assuming core plan for now
        stripeCustomerId: customerId,
      });

      console.log('✅ User subscription activated:', userId);
    } catch (error) {
      console.error('Error updating user after checkout:', error);
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