# EMERGENCY STRIPE PAYMENT SYSTEM REPAIR MANUAL

## Critical System Overview
Stripe integration handles: Checkout sessions → Payment processing → Webhook events → Subscription activation → User upgrade

## IMMEDIATE DIAGNOSIS CHECKLIST

### 1. Test Stripe Checkout Creation
```bash
# Test checkout endpoint
curl -X POST http://localhost:5000/api/create-checkout-session \
  -H "Content-Type: application/json" \
  -H "Cookie: musobuddy.sid=SESSION_ID" \
  -d '{"priceId": "price_1RouBwD9Bo26CG1DAF1rkSZI"}'
```

### 2. Check Environment Variables
```bash
# CRITICAL: Test vs Live keys (use test for development)
STRIPE_TEST_SECRET_KEY=sk_test_...     # Development
STRIPE_TEST_PUBLISHABLE_KEY=pk_test_... # Development
STRIPE_SECRET_KEY=sk_live_...          # Production
STRIPE_WEBHOOK_SECRET=whsec_...        # Webhook validation
VITE_STRIPE_PUBLIC_KEY=pk_...          # Frontend (must match backend)
```

### 3. Verify Price IDs in Stripe Dashboard
```bash
# Check active prices
curl https://api.stripe.com/v1/prices \
  -u $STRIPE_SECRET_KEY: \
  -d "active=true"
```

## COMMON FAILURE POINTS & FIXES

### Issue 1: "Checkout Session Creation Failed"
**Symptoms**: 400/500 errors creating checkout, users can't reach payment page
**Root Cause**: Missing price IDs, incorrect API keys, or session issues

**EMERGENCY FIX**: Update `server/core/routes.ts`
```typescript
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    // CRITICAL: Verify user is authenticated
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const { priceId } = req.body;
    
    // CRITICAL: Validate price ID
    if (!priceId) {
      return res.status(400).json({ error: 'Price ID required' });
    }
    
    // Import Stripe with correct key
    const { StripeService } = await import('./stripe-service');
    const stripeService = new StripeService();
    
    // Get user for customer creation
    const user = await storage.getUserById(req.session.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Create or get Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripeService.createCustomer({
        email: user.email,
        name: user.businessName || user.email,
        metadata: { userId: user.id.toString() }
      });
      customerId = customer.id;
      
      // Update user with customer ID
      await storage.updateUser(user.id, { stripeCustomerId: customerId });
    }
    
    // Create checkout session
    const session = await stripeService.createCheckoutSession({
      customer: customerId,
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${getAppServerUrl()}/trial-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${getAppServerUrl()}/pricing`,
      metadata: {
        userId: user.id.toString()
      }
    });
    
    console.log(`✅ Checkout session created: ${session.id} for user ${user.id}`);
    
    res.json({
      url: session.url,
      checkoutUrl: session.url,
      sessionId: session.id
    });
    
  } catch (error: any) {
    console.error('❌ Checkout session error:', error);
    res.status(500).json({ 
      error: 'Failed to create checkout session',
      details: error.message 
    });
  }
});
```

### Issue 2: "Payment Succeeded but User Not Upgraded"
**Symptoms**: Stripe shows successful payment but user still on trial/demo
**Root Cause**: Webhook not processing or subscription not activated

**EMERGENCY FIX**: Create `server/core/stripe-service.ts`
```typescript
import Stripe from 'stripe';
import { storage } from './storage';

export class StripeService {
  private stripe: Stripe;
  
  constructor() {
    // CRITICAL: Use correct key based on environment
    const secretKey = process.env.NODE_ENV === 'production' 
      ? process.env.STRIPE_SECRET_KEY 
      : process.env.STRIPE_TEST_SECRET_KEY;
    
    if (!secretKey) {
      throw new Error('Missing Stripe secret key');
    }
    
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16', // CRITICAL: Must match webhook API version
    });
    
    console.log(`✅ Stripe service initialized with ${process.env.NODE_ENV} keys`);
  }
  
  async createCustomer(customerData: {
    email: string;
    name?: string;
    metadata?: any;
  }): Promise<Stripe.Customer> {
    return await this.stripe.customers.create(customerData);
  }
  
  async createCheckoutSession(sessionData: any): Promise<Stripe.Checkout.Session> {
    return await this.stripe.checkout.sessions.create(sessionData);
  }
  
  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    console.log(`🔔 Processing webhook: ${event.type}`);
    
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
        
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionChange(event.data.object as Stripe.Subscription);
        break;
        
      case 'customer.subscription.deleted':
        await this.handleSubscriptionCancelled(event.data.object as Stripe.Subscription);
        break;
        
      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
        
      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
        
      default:
        console.log(`ℹ️ Unhandled webhook event: ${event.type}`);
    }
  }
  
  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    try {
      const userId = session.metadata?.userId;
      if (!userId) {
        console.error('❌ No userId in checkout session metadata');
        return;
      }
      
      // Get the subscription from the session
      let subscription: Stripe.Subscription | null = null;
      
      if (session.subscription) {
        subscription = await this.stripe.subscriptions.retrieve(
          session.subscription as string
        );
      }
      
      // Update user subscription status
      await storage.updateUser(parseInt(userId), {
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: subscription?.id || null,
        isSubscribed: subscription?.status === 'active',
        subscriptionStatus: subscription?.status || 'incomplete',
        trialEndsAt: subscription?.trial_end ? new Date(subscription.trial_end * 1000) : null
      });
      
      console.log(`✅ User ${userId} subscription activated via checkout`);
      
    } catch (error: any) {
      console.error('❌ Checkout completion error:', error);
    }
  }
  
  private async handleSubscriptionChange(subscription: Stripe.Subscription): Promise<void> {
    try {
      // Find user by customer ID
      const user = await storage.getUserByStripeCustomerId(subscription.customer as string);
      if (!user) {
        console.error(`❌ No user found for customer: ${subscription.customer}`);
        return;
      }
      
      // Update subscription status
      await storage.updateUser(user.id, {
        stripeSubscriptionId: subscription.id,
        isSubscribed: subscription.status === 'active',
        subscriptionStatus: subscription.status,
        trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null
      });
      
      console.log(`✅ User ${user.id} subscription updated: ${subscription.status}`);
      
    } catch (error: any) {
      console.error('❌ Subscription change error:', error);
    }
  }
  
  private async handleSubscriptionCancelled(subscription: Stripe.Subscription): Promise<void> {
    try {
      const user = await storage.getUserByStripeCustomerId(subscription.customer as string);
      if (!user) return;
      
      await storage.updateUser(user.id, {
        isSubscribed: false,
        subscriptionStatus: 'cancelled',
        stripeSubscriptionId: null
      });
      
      console.log(`✅ User ${user.id} subscription cancelled`);
      
    } catch (error: any) {
      console.error('❌ Subscription cancellation error:', error);
    }
  }
  
  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    console.log(`✅ Payment succeeded for invoice: ${invoice.id}`);
  }
  
  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    console.log(`❌ Payment failed for invoice: ${invoice.id}`);
  }
}
```

### Issue 3: "Webhook Events Not Processing"
**Symptoms**: Payments succeed but webhook events not received
**Root Cause**: Webhook endpoint not configured or wrong API version

**EMERGENCY FIX**: Add webhook endpoint to `server/core/routes.ts`
```typescript
app.post('/api/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.error('❌ Missing STRIPE_WEBHOOK_SECRET');
      return res.status(500).send('Webhook secret not configured');
    }
    
    // CRITICAL: Verify webhook signature
    const { StripeService } = await import('./stripe-service');
    const stripe = new (require('stripe'))(
      process.env.NODE_ENV === 'production' 
        ? process.env.STRIPE_SECRET_KEY 
        : process.env.STRIPE_TEST_SECRET_KEY,
      { apiVersion: '2023-10-16' }
    );
    
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      console.error('❌ Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    // Process the event
    const stripeService = new StripeService();
    await stripeService.handleWebhookEvent(event);
    
    console.log(`✅ Webhook processed: ${event.type}`);
    res.json({ received: true });
    
  } catch (error: any) {
    console.error('❌ Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});
```

### Issue 4: "Frontend Stripe Integration Broken"
**Symptoms**: Checkout button doesn't work, Stripe Elements not loading
**Root Cause**: Missing or incorrect publishable key

**EMERGENCY FIX**: Update `client/src/pages/pricing.tsx`
```typescript
// CRITICAL: Verify environment variable
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  console.error('❌ Missing VITE_STRIPE_PUBLIC_KEY environment variable');
}

const createCheckoutMutation = useMutation({
  mutationFn: async (priceId: string) => {
    try {
      console.log(`🔄 Creating checkout session for price: ${priceId}`);
      
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        credentials: 'include', // CRITICAL: Include cookies for authentication
        body: JSON.stringify({ priceId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Checkout creation failed');
      }
      
      const data = await response.json();
      console.log('✅ Checkout session created:', data);
      
      return data;
    } catch (error: any) {
      console.error('❌ Checkout session creation failed:', error);
      throw error;
    }
  },
  onSuccess: (data) => {
    console.log('🔄 Redirecting to Stripe checkout:', data.url);
    
    if (data.url) {
      window.location.href = data.url;
    } else {
      throw new Error('No checkout URL received');
    }
  },
  onError: (error: any) => {
    console.error('❌ Checkout error:', error);
    alert(`Payment setup failed: ${error.message}`);
  },
});
```

## STRIPE WEBHOOK CONFIGURATION CHECKLIST

### 1. Create Webhook in Stripe Dashboard
- URL: `https://yourdomain.com/api/webhook/stripe`
- API Version: `2023-10-16` (CRITICAL: Must match code)
- Events to listen for:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`

### 2. Update Environment Variables
```bash
STRIPE_WEBHOOK_SECRET=whsec_... # From webhook settings
```

## PRICE ID SETUP SCRIPT

Create `scripts/setup-stripe-prices.js`:
```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function createPrices() {
  // Create Core monthly subscription
  const corePrice = await stripe.prices.create({
    currency: 'gbp',
    unit_amount: 999, // £9.99
    recurring: { interval: 'month' },
    product_data: {
      name: 'MusoBuddy Core',
      description: 'Professional booking management for musicians'
    },
    metadata: {
      plan: 'core',
      features: 'unlimited_bookings,contracts,invoices,email_templates'
    }
  });
  
  console.log('Core Price ID:', corePrice.id);
  
  return { corePrice };
}

createPrices().catch(console.error);
```

## DEBUGGING COMMANDS
```bash
# Test Stripe API connection
curl https://api.stripe.com/v1/prices -u $STRIPE_SECRET_KEY:

# Check webhook endpoint
curl -X POST http://localhost:5000/api/webhook/stripe \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# List recent payment intents
curl https://api.stripe.com/v1/payment_intents?limit=3 \
  -u $STRIPE_SECRET_KEY:
```

## SUCCESS INDICATORS
- ✅ Checkout session creation returns 200 with session URL
- ✅ User successfully redirected to Stripe payment page
- ✅ Payment completion triggers webhook event processing
- ✅ User subscription status updated in database
- ✅ User gains access to premium features after payment