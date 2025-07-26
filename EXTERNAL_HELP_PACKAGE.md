# MusoBuddy Webhook Issue - External Help Package

## Problem Summary

**Issue**: Stripe webhook system appears to be working (returns 200 status) but webhook handler logs are not appearing in the published version console, making it difficult to verify automatic subscription activation.

**Current Status**: 
- Manual subscription activation works perfectly
- Webhook endpoint returns 200 OK with {"received":true}
- Database shows subscription was activated (customer ID updated)
- Development logs show webhook processing, but published version logs are not visible

## Critical Files for Webhook System

### Core Webhook Handler
- **`server/index.ts`** (Lines 48-91) - Main webhook endpoint with custom raw body processing
- **`server/core/stripe-service.ts`** (Lines 114-200) - Webhook event processing logic
- **`server/core/storage.ts`** - Database operations for user subscription updates
- **`server/core/routes.ts`** - Main API routes file
- **`server/core/webhook-service.ts`** - Additional webhook processing utilities

### Configuration Files
- **`.env`** - Environment variables (STRIPE_WEBHOOK_SECRET, API keys)
- **`package.json`** - Dependencies and build scripts
- **`vite.config.ts`** - Build configuration
- **`drizzle.config.ts`** - Database configuration

### Test Scripts (Created During Debugging)
- **`debug-webhook-secret.js`** - Tests webhook with proper Stripe signature
- **`test-webhook-endpoint.js`** - Basic webhook endpoint testing
- **`trigger-confirmation-emails.js`** - Retrieves recent checkout sessions
- **`delete-and-recreate-webhook.js`** - Webhook management script

## Database Schema

### Users Table (Relevant Fields)
```sql
CREATE TABLE users (
  id VARCHAR PRIMARY KEY,
  email VARCHAR UNIQUE,
  stripe_customer_id VARCHAR,
  plan VARCHAR DEFAULT 'free',
  is_subscribed BOOLEAN DEFAULT false,
  tier VARCHAR DEFAULT 'free'
);
```

## Environment Variables Required

```
STRIPE_TEST_SECRET_KEY=sk_test_...
STRIPE_TEST_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_UG2YTKBYCHpYv5AQvHMJTNrmi3fXayh6
DATABASE_URL=postgresql://...
```

## Current Webhook Configuration

- **Endpoint**: `https://musobuddy.replit.app/api/stripe-webhook`
- **API Version**: `2023-10-16`
- **Events**: checkout.session.completed, customer.subscription.deleted, invoice.payment_failed
- **Secret**: `whsec_UG2YTKBYCHpYv5AQvHMJTNrmi3fXayh6`

## Test Results

### Working Evidence
1. **Webhook endpoint responds**: 200 OK with `{"received":true}`
2. **Database updates**: User subscription activated automatically
3. **Development logs**: Show successful webhook processing
4. **Stripe signature verification**: Passes successfully

### Missing Evidence
1. **Published version logs**: No webhook logs visible in user's console
2. **Real-time processing**: Cannot see webhook events as they happen

## Key Code Sections

### Webhook Handler (server/index.ts:48-91)
```javascript
app.post('/api/stripe-webhook', 
  // Custom raw body processing middleware
  (req, res, next) => {
    if (req.is('application/json')) {
      let data = '';
      req.setEncoding('utf8');
      req.on('data', chunk => data += chunk);
      req.on('end', () => {
        req.body = Buffer.from(data, 'utf8');
        next();
      });
    } else {
      next();
    }
  },
  async (req, res) => {
    const { stripeService } = await import('./core/stripe-service.js');
    try {
      console.log('🔍 Custom Stripe webhook handler triggered');
      // ... webhook processing logic
      await stripeService.handleWebhook(req.body, signature);
      res.json({ received: true });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);
```

### Webhook Processing (server/core/stripe-service.ts:114-200)
```javascript
async handleWebhook(body: Buffer, signature: string) {
  const event = this.stripe.webhooks.constructEvent(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET || ''
  );
  
  switch (event.type) {
    case 'checkout.session.completed':
      await this.handleCheckoutCompleted(event.data.object);
      break;
    // ... other event handlers
  }
}
```

## Specific Questions for External Help

1. **Why are webhook logs not appearing in published version console?**
   - Development version shows logs correctly
   - Published version processes webhooks but logs are missing

2. **Is the logging issue masking other problems?**
   - Webhook appears to work (200 response, DB updates)
   - But inability to see logs makes verification difficult

3. **Are there Replit-specific webhook considerations?**
   - Published vs development version differences
   - Console logging behavior in production

## Success Criteria

✅ **Working**: Webhook returns 200 OK
✅ **Working**: Database updates correctly  
✅ **Working**: Subscription activation occurs
❌ **Missing**: Visible webhook logs in published version
❌ **Missing**: Real-time webhook monitoring capability

## Files Modified During Debugging

1. **server/index.ts** - Added custom webhook handler
2. **server/core/stripe-service.ts** - Enhanced logging
3. **PRODUCTION_WEBHOOK_MIGRATION.md** - Documentation
4. Multiple test scripts created for debugging

## Manual Workaround Available

```sql
UPDATE users 
SET stripe_customer_id = 'cus_...', 
    is_subscribed = true, 
    plan = 'core', 
    tier = 'premium' 
WHERE email = 'user@example.com';
```

This works perfectly for immediate subscription activation while webhook logging issue is resolved.