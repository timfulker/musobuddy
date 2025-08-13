import Stripe from 'stripe';
import { storage } from './storage';

// Import centralized environment detection
import { ENV } from './environment';

// FORCE TEST MODE for StripeService until ready for production
let stripe: Stripe | null = null;
if (process.env.STRIPE_TEST_SECRET_KEY) {
  const secretKey = process.env.STRIPE_TEST_SECRET_KEY;
  stripe = new Stripe(secretKey, {
    apiVersion: '2025-06-30.basil' as any,
  });
  
  console.log('✅ StripeService FORCED to TEST mode:', secretKey.startsWith('sk_test_') ? 'TEST' : 'LIVE');
} else {
  console.error('❌ STRIPE_TEST_SECRET_KEY required for development');
}

export class StripeService {
  private stripe = stripe;

  async createNewUserTrialSession(email: string, priceId: string = 'price_1RouBwD9Bo26CG1DAF1rkSZI', userId?: string) {
    if (!this.stripe) {
      throw new Error('Stripe not configured - please add STRIPE_SECRET_KEY or STRIPE_TEST_SECRET_KEY environment variable');
    }
    
    try {
      // Create checkout session for new user with 30-day trial
      // User account will be created after successful payment via webhook
      const session = await this.stripe.checkout.sessions.create({
        customer_email: email,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId, // Core monthly price ID
            quantity: 1,
          },
        ],
        mode: 'subscription',
        subscription_data: {
          trial_period_days: 30,
          metadata: {
            trial_type: 'core_monthly',
            new_signup: 'true',
            ...(userId && { userId })
          },
        },
        success_url: `https://musobuddy.replit.app/trial-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `https://musobuddy.replit.app/pricing`,
        metadata: {
          userEmail: email,
          trial_type: 'core_monthly',
          new_signup: 'true',
          ...(userId && { userId })
        },
        allow_promotion_codes: false,
        billing_address_collection: 'required',
      });

      return { sessionId: session.id, checkoutUrl: session.url };
    } catch (error) {
      console.error('Error creating new user trial session:', error);
      throw error;
    }
  }

  async createTrialCheckoutSession(userId: string, priceId: string = 'price_1RouBwD9Bo26CG1DAF1rkSZI') {
    if (!this.stripe) {
      throw new Error('Stripe not configured - please add STRIPE_SECRET_KEY or STRIPE_TEST_SECRET_KEY environment variable');
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

      // Create checkout session with 30-day trial
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
          trial_period_days: 30,
          metadata: {
            userId: userId,
            trial_type: 'core_monthly',
          },
        },
        success_url: `https://musobuddy.replit.app/trial-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `https://musobuddy.replit.app/pricing`,
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
      throw new Error('Stripe not configured - please add STRIPE_SECRET_KEY or STRIPE_TEST_SECRET_KEY environment variable');
    }
    
    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['subscription', 'customer']
      });
      return session;
    } catch (error) {
      console.error('Error getting session details:', error);
      throw error;
    }
  }

  async handleWebhook(body: Buffer, signature: string) {
    const webhookId = Date.now().toString();
    
    if (!this.stripe) {
      throw new Error('Stripe not configured - please add STRIPE_SECRET_KEY or STRIPE_TEST_SECRET_KEY environment variable');
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
    
    const isNewSignup = session.metadata?.new_signup === 'true';
    const userId = session.metadata?.userId;
    const userEmail = session.metadata?.userEmail || session.customer_email;
    const customerId = session.customer as string;

    console.log(`🔥 [CHECKOUT-${sessionId}] Is new signup: ${isNewSignup}`);
    console.log(`🔥 [CHECKOUT-${sessionId}] UserID: ${userId}`);
    console.log(`🔥 [CHECKOUT-${sessionId}] UserEmail: ${userEmail}`);
    console.log(`🔥 [CHECKOUT-${sessionId}] CustomerID: ${customerId}`);

    try {
      let actualUserId = userId;
      
      // Handle new user signup flow
      if (isNewSignup && userEmail) {
        console.log(`🔥 [CHECKOUT-${sessionId}] Creating new user account for: ${userEmail}`);
        
        // Check if user already exists
        const existingUser = await storage.getUserByEmail(userEmail);
        
        if (existingUser) {
          console.log(`🔥 [CHECKOUT-${sessionId}] User already exists, updating subscription`);
          actualUserId = existingUser.id;
        } else {
          // Create new user account with trial subscription
          const newUser = await storage.createUser({
            email: userEmail,
            stripeCustomerId: customerId,
            isSubscribed: true,
            plan: 'core',
            tier: 'core',
            trialStatus: 'active',
            trialExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            createdViaStripe: true,
          });
          
          actualUserId = newUser.id;
          console.log(`🔥 [CHECKOUT-${sessionId}] ✅ New user created: ${actualUserId}`);
        }
      }
      
      if (!actualUserId) {
        console.error(`🔥 [CHECKOUT-${sessionId}] ❌ No userId available`);
        return;
      }

      console.log(`🔥 [CHECKOUT-${sessionId}] Updating user subscription...`);
      
      // Update user subscription status
      await storage.updateUser(actualUserId, {
        isSubscribed: true,
        plan: 'core',
        tier: 'core',
        stripeCustomerId: customerId,
        trialStatus: 'active',
        trialExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      });

      console.log(`🔥 [CHECKOUT-${sessionId}] ✅ User subscription activated: ${actualUserId}`);
      
      // Verify the update worked
      const updatedUser = await storage.getUserById(actualUserId);
      console.log(`🔥 [CHECKOUT-${sessionId}] ✅ Verification - User plan: ${updatedUser?.plan}, subscribed: ${updatedUser?.isSubscribed}`);
      
    } catch (error) {
      console.error(`🔥 [CHECKOUT-${sessionId}] ❌ Error processing checkout:`, error);
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