# Bounce Handling Implementation Guide

## Overview

Bounce handling automatically removes invalid email addresses from your system to maintain good sender reputation and improve deliverability.

## What's Been Created

✅ **File Created:** `server/core/bounce-handler.ts`

This module provides:
- Automatic hard bounce suppression
- Soft bounce tracking (suppresses after 3 attempts)
- Spam complaint handling
- Booking flagging for bounced emails
- Webhook parsers for SendGrid and Mailgun

## Implementation Steps

### 1. Database Schema (Required)

Add a new table for suppressed emails:

```sql
-- Create suppressed_emails table
CREATE TABLE IF NOT EXISTS suppressed_emails (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  reason VARCHAR(50) NOT NULL,
  first_bounce_date TIMESTAMP NOT NULL DEFAULT NOW(),
  bounce_count INTEGER NOT NULL DEFAULT 1,
  provider VARCHAR(20),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_suppressed_emails_email ON suppressed_emails(email);
CREATE INDEX idx_suppressed_emails_reason ON suppressed_emails(reason);

-- Add RLS policies if using Supabase
ALTER TABLE suppressed_emails ENABLE ROW LEVEL SECURITY;

-- Admin-only access policy
CREATE POLICY "Admin can manage suppressed emails"
  ON suppressed_emails
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');
```

### 2. Storage Methods (Required)

Add these methods to `server/core/storage.ts` or `server/storage/misc-storage.ts`:

```typescript
/**
 * Add email to suppression list
 */
async addSuppressedEmail(data: {
  email: string;
  reason: string;
  firstBounceDate: Date;
  bounceCount: number;
  provider: string;
  notes?: string;
}): Promise<void> {
  const { data: result, error } = await supabase
    .from('suppressed_emails')
    .upsert({
      email: data.email.toLowerCase(),
      reason: data.reason,
      first_bounce_date: data.firstBounceDate.toISOString(),
      bounce_count: data.bounceCount,
      provider: data.provider,
      notes: data.notes || null,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'email'
    });

  if (error) {
    console.error('❌ Failed to add suppressed email:', error);
    throw new Error(`Failed to suppress email: ${error.message}`);
  }

  console.log(`✅ Email suppressed: ${data.email}`);
}

/**
 * Check if email is suppressed
 */
async getSuppressedEmail(email: string): Promise<{
  email: string;
  reason: string;
  bounceCount: number;
} | null> {
  const { data, error } = await supabase
    .from('suppressed_emails')
    .select('*')
    .eq('email', email.toLowerCase())
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = not found
    console.error('❌ Failed to check suppressed email:', error);
    return null;
  }

  if (!data) return null;

  return {
    email: data.email,
    reason: data.reason,
    bounceCount: data.bounce_count
  };
}

/**
 * Remove email from suppression list (for admin manual removal)
 */
async removeSuppressedEmail(email: string): Promise<void> {
  const { error } = await supabase
    .from('suppressed_emails')
    .delete()
    .eq('email', email.toLowerCase());

  if (error) {
    throw new Error(`Failed to remove suppressed email: ${error.message}`);
  }

  console.log(`✅ Email removed from suppression: ${email}`);
}

/**
 * Get all suppressed emails (for admin dashboard)
 */
async getAllSuppressedEmails(): Promise<Array<{
  email: string;
  reason: string;
  bounceCount: number;
  firstBounceDate: Date;
  provider: string;
}>> {
  const { data, error } = await supabase
    .from('suppressed_emails')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Failed to get suppressed emails:', error);
    return [];
  }

  return data.map(row => ({
    email: row.email,
    reason: row.reason,
    bounceCount: row.bounce_count,
    firstBounceDate: new Date(row.first_bounce_date),
    provider: row.provider
  }));
}
```

### 3. Webhook Endpoints (Required)

Add webhook endpoints to receive bounce notifications:

**File:** `server/routes/bounce-webhook-routes.ts`

```typescript
import { Router } from 'express';
import { bounceHandler, parseSendGridBounce, parseMailgunBounce } from '../core/bounce-handler';

const router = Router();

/**
 * SendGrid bounce webhook
 * Configure in SendGrid dashboard: Event Webhook Settings
 * URL: https://yourdomain.com/api/webhook/sendgrid/bounce
 */
router.post('/sendgrid/bounce', async (req, res) => {
  try {
    console.log('📧 [SENDGRID-WEBHOOK] Received bounce notification');

    const events = Array.isArray(req.body) ? req.body : [req.body];

    for (const event of events) {
      const bounceRecord = parseSendGridBounce(event);
      if (bounceRecord) {
        await bounceHandler.processBounce(bounceRecord);
      }
    }

    res.status(200).json({ success: true });

  } catch (error: any) {
    console.error('❌ [SENDGRID-WEBHOOK] Error processing bounce:', error);
    res.status(500).json({ error: 'Failed to process bounce' });
  }
});

/**
 * Mailgun bounce webhook
 * Configure in Mailgun dashboard: Webhooks
 * URL: https://yourdomain.com/api/webhook/mailgun/bounce
 */
router.post('/mailgun/bounce', async (req, res) => {
  try {
    console.log('📧 [MAILGUN-WEBHOOK] Received bounce notification');

    const bounceRecord = parseMailgunBounce(req.body);
    if (bounceRecord) {
      await bounceHandler.processBounce(bounceRecord);
    }

    res.status(200).json({ success: true });

  } catch (error: any) {
    console.error('❌ [MAILGUN-WEBHOOK] Error processing bounce:', error);
    res.status(500).json({ error: 'Failed to process bounce' });
  }
});

export default router;
```

**Register routes in `server/index.ts`:**

```typescript
import bounceWebhookRoutes from './routes/bounce-webhook-routes';

// ... other imports and setup

app.use('/api/webhook', bounceWebhookRoutes);
```

### 4. Email Sending Integration (Required)

Update `server/core/email-provider-abstraction.ts` to check suppression before sending:

```typescript
import { bounceHandler } from './bounce-handler';

// In the EmailService.sendEmail() method, add this check:

async sendEmail(emailData: EmailData): Promise<EmailResult> {
  // Check if email is suppressed
  const recipient = Array.isArray(emailData.to) ? emailData.to[0] : emailData.to;
  const suppressionCheck = await bounceHandler.isEmailSuppressed(recipient);

  if (suppressionCheck.suppressed) {
    console.log(`🚫 [EMAIL-SUPPRESSED] Not sending to ${recipient}: ${suppressionCheck.reason}`);
    return {
      success: false,
      error: `Email suppressed: ${suppressionCheck.reason}`,
      provider: 'none' as any
    };
  }

  // ... existing code continues
  const provider = this.selectProvider(emailData);
  // ... rest of the method
}
```

---

## Configuration Steps

### SendGrid Webhook Setup

1. Log into SendGrid dashboard: https://app.sendgrid.com
2. Go to **Settings** → **Mail Settings** → **Event Webhook**
3. Enable the webhook
4. Set URL: `https://musobuddy.replit.app/api/webhook/sendgrid/bounce`
5. Select events to track:
   - ✅ Bounced
   - ✅ Dropped
   - ✅ Spam Report
6. Save settings

### Mailgun Webhook Setup

1. Log into Mailgun dashboard: https://app.mailgun.com
2. Go to **Sending** → **Webhooks**
3. Add webhook for each domain:
   - **Permanent Failure**: `https://musobuddy.replit.app/api/webhook/mailgun/bounce`
   - **Temporary Failure**: `https://musobuddy.replit.app/api/webhook/mailgun/bounce`
   - **Complained**: `https://musobuddy.replit.app/api/webhook/mailgun/bounce`
4. Save settings

---

## Testing

### Manual Test

```typescript
// Test the bounce handler directly
import { bounceHandler } from './server/core/bounce-handler';

await bounceHandler.processBounce({
  email: 'test@example.com',
  bounceType: 'hard',
  timestamp: new Date(),
  reason: 'Mailbox does not exist',
  provider: 'sendgrid'
});

// Check if email is suppressed
const check = await bounceHandler.isEmailSuppressed('test@example.com');
console.log(check); // Should return { suppressed: true, reason: 'hard_bounce' }
```

### Webhook Test

Use tools like:
- **Webhook.site**: Generate a test URL to see webhook payload
- **ngrok**: Test locally before deploying

---

## Monitoring & Maintenance

### Dashboard Metrics

Add to admin dashboard:
- Total suppressed emails
- Bounces by reason (hard/soft/complaint)
- Recent bounces (last 24 hours)
- Bounce rate by provider

### Periodic Cleanup

Add a cron job to clean up old soft bounce tracking:

```typescript
// Run daily at midnight
setInterval(() => {
  bounceHandler.cleanupSoftBounces();
}, 24 * 60 * 60 * 1000);
```

### Review Suppressed Emails

Periodically review suppressed emails list:
- Check for patterns (e.g., specific domain bouncing)
- Remove false positives manually if needed
- Export list for analysis

---

## Benefits

### Improved Deliverability
- ✅ Removes invalid addresses automatically
- ✅ Reduces bounce rate to < 2%
- ✅ Improves sender reputation
- ✅ Prevents hitting spam filters

### Better Data Quality
- ✅ Identifies problematic client contacts
- ✅ Flags bookings needing attention
- ✅ Maintains clean email list

### Cost Savings
- ✅ Reduces wasted API calls
- ✅ Lowers email provider costs
- ✅ Prevents rate limit issues

---

## Status

- ✅ Bounce handler module created
- ⏳ Database schema needs to be applied
- ⏳ Storage methods need to be added
- ⏳ Webhook routes need to be created
- ⏳ Email sending integration needed
- ⏳ Provider webhooks need configuration

---

## Next Steps

1. **Immediate:**
   - Apply database schema
   - Add storage methods
   - Create webhook routes

2. **Short-term:**
   - Configure SendGrid webhooks
   - Configure Mailgun webhooks
   - Test with sample bounces

3. **Long-term:**
   - Add admin dashboard for suppressed emails
   - Implement automated reporting
   - Set up monitoring alerts

---

**Created:** 2025-10-12
**Status:** Ready for implementation
