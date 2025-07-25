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
    apiVersion: '2025-06-30.basil',
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

      return { sessionId: session.id, url: session.url };
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
    if (!this.stripe) {
      throw new Error('Stripe not configured - please add STRIPE_TEST_SECRET_KEY environment variable');
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