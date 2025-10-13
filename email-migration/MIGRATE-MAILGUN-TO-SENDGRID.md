# Migration Guide: Mailgun to SendGrid

## Executive Summary

**Complexity Assessment**: Medium (4-6 hours)
**Risk Level**: Medium
**Current Email Volume**: ~1,000 emails/month
**Recommended Approach**: Phased migration with parallel testing

---

## Why Migrate?

### Current Mailgun Issues:
- ❌ Shared IP blocklisted (185.250.239.6) by Validity spam filter
- ❌ Dedicated IP costs $60-90/month (overkill for 1,000 emails/month)
- ❌ IP reputation warming takes 4-6 weeks

### SendGrid Benefits:
- ✅ Better deliverability reputation out of the box
- ✅ Free tier: 100 emails/day (3,000/month) - covers your volume
- ✅ Shared IP pools with better reputation
- ✅ No IP warming required for low volume
- ✅ Better email analytics dashboard
- ✅ Already installed in your project (`@sendgrid/mail`)

---

## Migration Complexity Analysis

### What You Currently Use Mailgun For:

1. **Transactional Emails** (contracts, invoices, notifications)
   - **Complexity**: Low
   - **Files to update**: 1 file (`server/core/services.ts`)
   - **Mailgun API**: `mailgun.messages.create()`
   - **SendGrid equivalent**: `sgMail.send()`

2. **Supabase Auth Emails** (password reset, verification)
   - **Complexity**: None (already using Mailgun SMTP)
   - **Action**: Update SMTP credentials in Supabase dashboard
   - **No code changes required**

3. **Inbound Email Webhooks** (enquiry processing, client replies)
   - **Complexity**: Medium
   - **Files to update**: 1 file (`server/index.ts`)
   - **Current**: Mailgun routes + webhook format
   - **SendGrid equivalent**: Inbound Parse + different webhook format

4. **Email Route Management** (user-specific inbox forwarding)
   - **Complexity**: High
   - **Files to update**: 1 file (`server/core/mailgun-routes.ts`)
   - **Current**: Mailgun Routes API
   - **SendGrid equivalent**: No direct equivalent - needs workaround

---

## Migration Strategy

### Option A: Full Migration (Recommended)
Migrate everything to SendGrid for consistency and to fully escape Mailgun's IP issues.

**Pros**: Clean architecture, one provider, best long-term solution
**Cons**: More complex route management setup required
**Time**: 4-6 hours

### Option B: Hybrid Approach
Keep Mailgun for inbound emails, use SendGrid for outbound only.

**Pros**: Simpler migration, less risk
**Cons**: Two providers to manage, doesn't solve deliverability issue if Mailgun is sending
**Time**: 2-3 hours

**Recommended**: Option A (Full Migration)

---

## Pre-Migration Checklist

### 1. SendGrid Account Setup

- [ ] Sign up at https://sendgrid.com
- [ ] Verify your sender domain (`musobuddy.com`)
- [ ] Set up domain authentication (SPF, DKIM, DMARC)
- [ ] Get API key (full access)
- [ ] Enable Inbound Parse webhook
- [ ] Test sending a basic email

### 2. Environment Variables Needed

Add these to your `.env` and Replit Secrets:

```bash
# SendGrid Configuration
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_SENDER_EMAIL=noreply@musobuddy.com
SENDGRID_SENDER_NAME=MusoBuddy

# Inbound Parse Subdomain (for enquiries)
SENDGRID_INBOUND_DOMAIN=enquiries.musobuddy.com
```

### 3. DNS Changes Required

You'll need to update DNS records at your domain registrar:

#### For Outbound Email (Domain Authentication):
```
Type: CNAME
Host: em1234.musobuddy.com
Value: u1234567.wl123.sendgrid.net
TTL: Auto
```

```
Type: TXT
Host: s1._domainkey.musobuddy.com
Value: [SendGrid provides this - copy from dashboard]
TTL: Auto
```

#### For Inbound Email (Inbound Parse):
```
Type: MX
Host: enquiries.musobuddy.com
Value: mx.sendgrid.net
Priority: 10
TTL: Auto
```

**⏰ DNS propagation**: Allow 1-24 hours

---

## Step-by-Step Migration

### Phase 1: Outbound Email Migration (2-3 hours)

#### Step 1.1: Update Email Service Class

**File**: `server/core/services.ts`

Replace Mailgun implementation with SendGrid:

```typescript
// OLD (Mailgun):
import Mailgun from 'mailgun.js';
import FormData from 'form-data';

export class EmailService {
  private mailgun: any;

  constructor() {
    const mailgun = new Mailgun(FormData);
    this.mailgun = mailgun.client({
      username: 'api',
      key: process.env.MAILGUN_API_KEY || '',
      url: 'https://api.eu.mailgun.net'
    });
  }

  async sendEmail(emailData: any) {
    const messageData = {
      from: `MusoBuddy <${emailData.fromEmail || 'noreply@musobuddy.com'}>`,
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text
    };

    const result = await this.mailgun.messages.create(
      process.env.MAILGUN_DOMAIN || '',
      messageData
    );
    return result;
  }
}
```

**NEW (SendGrid):**

```typescript
import sgMail from '@sendgrid/mail';

export class EmailService {
  constructor() {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ SendGrid not configured - email features will be disabled');
      return;
    }

    sgMail.setApiKey(apiKey);
    console.log('✅ SendGrid Email Service initialized');
  }

  async sendEmail(emailData: {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
    fromEmail?: string;
    fromName?: string;
    replyTo?: string;
    cc?: string[];
    bcc?: string[];
    attachments?: Array<{
      content: string;
      filename: string;
      type?: string;
      disposition?: string;
    }>;
  }) {
    try {
      const msg: any = {
        to: emailData.to,
        from: {
          email: emailData.fromEmail || process.env.SENDGRID_SENDER_EMAIL || 'noreply@musobuddy.com',
          name: emailData.fromName || process.env.SENDGRID_SENDER_NAME || 'MusoBuddy'
        },
        subject: emailData.subject,
        html: emailData.html
      };

      // Add optional fields
      if (emailData.text) msg.text = emailData.text;
      if (emailData.replyTo) msg.replyTo = emailData.replyTo;
      if (emailData.cc && emailData.cc.length > 0) msg.cc = emailData.cc;
      if (emailData.bcc && emailData.bcc.length > 0) msg.bcc = emailData.bcc;
      if (emailData.attachments) msg.attachments = emailData.attachments;

      console.log(`📧 Sending email via SendGrid: ${emailData.subject}`);
      console.log(`📧 To: ${Array.isArray(emailData.to) ? emailData.to.join(', ') : emailData.to}`);

      const result = await sgMail.send(msg);

      console.log('✅ Email sent successfully via SendGrid');
      console.log('📊 Message ID:', result[0]?.headers?.['x-message-id']);

      return {
        success: true,
        messageId: result[0]?.headers?.['x-message-id'],
        statusCode: result[0]?.statusCode
      };
    } catch (error: any) {
      console.error('❌ Failed to send email via SendGrid:', error);
      console.error('❌ Error response:', error.response?.body);

      return {
        success: false,
        error: error.message,
        details: error.response?.body
      };
    }
  }

  // For backward compatibility with bulk sending
  async sendBulkEmail(emails: Array<{
    to: string;
    subject: string;
    html: string;
    text?: string;
  }>) {
    const results = await Promise.allSettled(
      emails.map(email => this.sendEmail(email))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`📊 Bulk email results: ${successful} sent, ${failed} failed`);

    return { successful, failed, results };
  }
}

export const emailService = new EmailService();
```

#### Step 1.2: Update Auth Email Service (Optional Tracking Control)

**File**: `server/core/mailgun-auth-service.ts`

**Option A**: Rename and update to use SendGrid:

```typescript
/**
 * SendGrid Authentication Email Service
 * Handles sending authentication emails with click tracking disabled
 */

import sgMail from '@sendgrid/mail';

export class SendGridAuthService {
  private initialized: boolean = false;

  constructor() {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ SendGrid not configured - auth email features will be disabled');
      return;
    }

    sgMail.setApiKey(apiKey);
    this.initialized = true;
    console.log('✅ SendGrid Auth Service initialized');
  }

  async sendAuthEmail(emailData: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }) {
    if (!this.initialized) {
      console.log('📧 SendGrid not configured, skipping auth email');
      return { success: false, error: 'Email service not configured' };
    }

    try {
      console.log(`📧 Sending auth email: ${emailData.subject}`);
      console.log(`📧 To: ${emailData.to}`);

      const msg: any = {
        to: emailData.to,
        from: {
          email: process.env.SENDGRID_SENDER_EMAIL || 'noreply@musobuddy.com',
          name: process.env.SENDGRID_SENDER_NAME || 'MusoBuddy'
        },
        subject: emailData.subject,
        html: emailData.html,
        // Disable click tracking to prevent URL rewriting
        trackingSettings: {
          clickTracking: {
            enable: false,
            enableText: false
          },
          openTracking: {
            enable: false
          }
        }
      };

      if (emailData.text) {
        msg.text = emailData.text;
      }

      console.log('🚫 Authentication email: Click tracking disabled');

      const result = await sgMail.send(msg);

      console.log('✅ Auth email sent successfully via SendGrid');
      console.log('📊 Message ID:', result[0]?.headers?.['x-message-id']);

      return {
        success: true,
        messageId: result[0]?.headers?.['x-message-id'],
        statusCode: result[0]?.statusCode
      };
    } catch (error: any) {
      console.error('❌ Failed to send auth email via SendGrid:', error);
      console.error('❌ Error response:', error.response?.body);

      return {
        success: false,
        error: error.message,
        details: error.response?.body
      };
    }
  }

  async sendTestVerificationEmail(email: string, testUrl: string) {
    const testHtml = `
      <!DOCTYPE html>
      <html>
      <body>
        <h2>Test Verification Email</h2>
        <p>This is a test email to verify that click tracking is disabled.</p>
        <p>Click this test link: <a href="${testUrl}">Verify Email</a></p>
        <p>The URL should NOT be rewritten by SendGrid.</p>
      </body>
      </html>
    `;

    const testText = `
      Test Verification Email

      This is a test email to verify that click tracking is disabled.
      Click this test link: ${testUrl}
      The URL should NOT be rewritten by SendGrid.
    `;

    return await this.sendAuthEmail({
      to: email,
      subject: 'Test: Email Verification (Click Tracking Disabled)',
      html: testHtml,
      text: testText
    });
  }
}

export const sendGridAuthService = new SendGridAuthService();
```

**Option B**: Just use main EmailService (simpler)

You can delete `mailgun-auth-service.ts` and use the main `EmailService` class for auth emails too, since SendGrid tracking can be disabled per-message.

#### Step 1.3: Test Outbound Email

```bash
# In your production environment, test sending an email
curl -X POST https://musobuddy.replit.app/api/test-email \
  -H "Content-Type: application/json" \
  -d '{"to": "timfulkermusic@gmail.com", "subject": "Test from SendGrid"}'
```

Create a test endpoint temporarily:

```typescript
// In server/index.ts - TEMPORARY TEST ENDPOINT
app.post('/api/test-email', async (req, res) => {
  const { to, subject } = req.body;

  const result = await emailService.sendEmail({
    to: to || 'timfulkermusic@gmail.com',
    subject: subject || 'Test Email from SendGrid',
    html: '<h1>Success!</h1><p>SendGrid is working correctly.</p>',
    text: 'Success! SendGrid is working correctly.'
  });

  res.json(result);
});
```

✅ **Checkpoint**: Verify you can send emails successfully before proceeding.

---

### Phase 2: Inbound Email Migration (2-3 hours)

#### Understanding the Current System

Your Mailgun setup uses:
1. **Routes**: Forward `emailPrefix@enquiries.musobuddy.com` → webhook
2. **Webhook**: Mailgun format (multipart form data)
3. **Processing**: Extract sender, subject, body → AI parsing

SendGrid Inbound Parse works differently:
1. **MX Record**: All emails to `enquiries.musobuddy.com` → SendGrid
2. **Webhook**: SendGrid format (different field names)
3. **No routing API**: All emails go to one webhook, you filter in code

#### Step 2.1: Set Up SendGrid Inbound Parse

1. **SendGrid Dashboard** → **Settings** → **Inbound Parse**
2. Click **Add Host & URL**
3. Configure:
   ```
   Domain: enquiries.musobuddy.com
   Subdomain: (leave blank for root domain)
   Destination URL: https://musobuddy.replit.app/api/webhook/sendgrid

   Options:
   ☑ Check incoming emails for spam
   ☐ Post raw full MIME message
   ```
4. Click **Save**

SendGrid will provide MX record to add to DNS.

#### Step 2.2: Update DNS

Add MX record for inbound email:

```
Type: MX
Host: enquiries.musobuddy.com
Value: mx.sendgrid.net
Priority: 10
TTL: Auto
```

**Note**: This replaces your existing Mailgun MX record.

#### Step 2.3: Create SendGrid Webhook Handler

**File**: `server/index.ts`

Add new webhook endpoint BEFORE the Mailgun webhook:

```typescript
// SendGrid Inbound Parse Webhook
app.post('/api/webhook/sendgrid', upload.any(), async (req, res) => {
  console.log('📧 [SENDGRID] Inbound email received');
  console.log('📧 [SENDGRID] Body keys:', Object.keys(req.body || {}));

  try {
    const webhookData = req.body;

    // SendGrid webhook format is different from Mailgun
    const fromEmail = webhookData.from || '';
    const toEmail = webhookData.to || '';
    const subject = webhookData.subject || '';
    const textBody = webhookData.text || '';
    const htmlBody = webhookData.html || '';

    console.log('📧 [SENDGRID] Email details:', {
      from: fromEmail,
      to: toEmail,
      subject: subject,
      hasText: !!textBody,
      hasHtml: !!htmlBody
    });

    // Extract recipient prefix (user identification)
    const recipientMatch = toEmail.match(/^([^@]+)@enquiries\.musobuddy\.com/);
    if (!recipientMatch) {
      console.log('❌ [SENDGRID] Invalid recipient format:', toEmail);
      return res.status(200).json({ status: 'ignored', message: 'Invalid recipient format' });
    }

    const emailPrefix = recipientMatch[1];
    const normalizedPrefix = normalizeEmailPrefix(emailPrefix);

    console.log('👤 [SENDGRID] Email prefix:', emailPrefix, '→ Normalized:', normalizedPrefix);

    // Duplicate check (reuse existing function)
    const emailSignature = createEmailSignature({
      sender: fromEmail,
      subject: subject,
      'message-id': webhookData.message_id || '',
      'body-plain': textBody
    });

    if (processedEmails.has(emailSignature)) {
      console.log('🔄 [SENDGRID] DUPLICATE EMAIL DETECTED - Skipping');
      return res.status(200).json({
        status: 'duplicate',
        message: 'Email already processed'
      });
    }

    processedEmails.add(emailSignature);
    setTimeout(() => processedEmails.delete(emailSignature), DEDUPLICATION_WINDOW);

    // Look up user by email prefix
    const { db } = await import('@db');
    const { users } = await import('@shared/schema');
    const { eq } = await import('drizzle-orm');

    const userResults = await db.select().from(users).where(eq(users.emailPrefix, normalizedPrefix));

    if (userResults.length === 0) {
      console.log('❌ [SENDGRID] No user found for email prefix:', normalizedPrefix);
      return res.status(200).json({
        status: 'user_not_found',
        message: `No user registered with email prefix: ${normalizedPrefix}`
      });
    }

    const user = userResults[0];
    console.log('✅ [SENDGRID] User found:', user.id, user.email);

    // Extract email body (prefer plain text, fallback to HTML stripped)
    let emailBody = textBody || '';
    if (!emailBody && htmlBody) {
      // Simple HTML stripping (you may want to use a library like cheerio)
      emailBody = htmlBody.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }

    // Parse email with AI (reuse existing logic)
    const parsedData = await parseEmailWithAI(fromEmail, subject, emailBody);

    if (parsedData.canParse) {
      // Create booking directly
      console.log('✅ [SENDGRID] Email parsed successfully, creating booking');

      const { bookings } = await import('@shared/schema');

      const [newBooking] = await db.insert(bookings).values({
        userId: user.id,
        clientName: parsedData.clientName || fromEmail.split('@')[0],
        clientEmail: fromEmail,
        eventDate: parsedData.eventDate ? new Date(parsedData.eventDate) : null,
        eventTime: parsedData.eventTime || null,
        location: parsedData.location || null,
        eventType: parsedData.eventType || 'Unknown',
        additionalInfo: parsedData.additionalInfo || emailBody,
        status: parsedData.eventDate ? 'pending' : 'pending',
        createdAt: new Date()
      }).returning();

      console.log('✅ [SENDGRID] Booking created:', newBooking.id);

      // Send confirmation email to client
      await emailService.sendEmail({
        to: fromEmail,
        subject: `Re: ${subject}`,
        html: `
          <p>Thank you for your enquiry!</p>
          <p>We have received your message and will get back to you shortly.</p>
          <p>Best regards,<br>MusoBuddy Team</p>
        `,
        replyTo: user.email
      });

      return res.status(200).json({
        status: 'booking_created',
        bookingId: newBooking.id
      });

    } else {
      // Save to unparseable messages
      console.log('⚠️ [SENDGRID] Email cannot be parsed automatically, saving to review queue');

      const { unparseableMessages } = await import('@shared/schema');

      const [savedMessage] = await db.insert(unparseableMessages).values({
        userId: user.id,
        fromEmail: fromEmail,
        subject: subject,
        bodyText: emailBody,
        bodyHtml: htmlBody,
        aiReason: parsedData.reason || 'Could not extract required booking information',
        status: 'pending',
        createdAt: new Date()
      }).returning();

      console.log('✅ [SENDGRID] Saved to unparseable_messages:', savedMessage.id);

      return res.status(200).json({
        status: 'saved_for_review',
        messageId: savedMessage.id
      });
    }

  } catch (error: any) {
    console.error('❌ [SENDGRID] Webhook processing error:', error);
    console.error('❌ [SENDGRID] Stack trace:', error.stack);

    return res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});
```

#### Step 2.4: Handle Client Replies

SendGrid Inbound Parse will also receive replies to booking/invoice emails. You need to detect these and route them correctly:

```typescript
// In the SendGrid webhook handler, add this logic BEFORE user lookup:

// Check if this is a reply to booking/invoice email
const bookingMatch = toEmail.match(/booking-?(\d+)@/);
const invoiceMatch = toEmail.match(/invoice-?(\d+)@/);

if (bookingMatch || invoiceMatch) {
  // This is a client reply to a booking or invoice
  // Route to existing reply handler logic
  console.log('📨 [SENDGRID] This is a client reply, routing to reply handler');

  // Reuse your existing reply processing logic
  // You can extract it into a shared function

  const bookingId = bookingMatch ? bookingMatch[1] : invoiceMatch[1];
  const replyType = bookingMatch ? 'booking' : 'invoice';

  // ... (insert existing reply handling logic here)

  return res.status(200).json({ status: 'reply_processed' });
}
```

---

### Phase 3: Route Management Migration (1-2 hours)

#### The Challenge

Mailgun has a Routes API that lets you programmatically create email forwarding rules. SendGrid Inbound Parse doesn't have this - all emails go to one webhook.

#### Solution: Database-Driven Routing

Instead of creating routes in Mailgun, store user email prefixes in your database (you already do this) and route in your webhook handler.

**Current system**: ✅ Already works this way!
**No changes needed**: Your `emailPrefix` in the `users` table already handles routing.

#### What About Personal Email Forwarding?

Currently, your Mailgun route can forward to both webhook AND personal email:

```typescript
// Current Mailgun route:
const actions = [
  `forward("https://musobuddy.replit.app/api/webhook/mailgun")`,
  `forward("user@gmail.com")` // Personal forwarding
];
```

**SendGrid Equivalent**: Add forwarding logic in your webhook handler:

```typescript
// In SendGrid webhook, after successful processing:
if (user.personalEmailForward && user.personalEmailForward.trim()) {
  console.log('📨 [SENDGRID] Forwarding to personal email:', user.personalEmailForward);

  await emailService.sendEmail({
    to: user.personalEmailForward,
    subject: `FWD: ${subject}`,
    html: htmlBody || `<pre>${textBody}</pre>`,
    text: textBody,
    replyTo: fromEmail
  });
}
```

**Database Change Required**: Add column to `users` table:

```sql
ALTER TABLE users ADD COLUMN personal_email_forward VARCHAR(255);
```

Update schema:

```typescript
// In shared/schema.ts
export const users = pgTable("users", {
  // ... existing fields
  personalEmailForward: varchar("personal_email_forward").default(null),
});
```

#### Remove Mailgun Route Manager

Once SendGrid is working, you can delete or deprecate:

```typescript
// server/core/mailgun-routes.ts
// This file is no longer needed with SendGrid
```

Update any code that calls `mailgunRoutes.createUserEmailRoute()` to instead just update the database:

```typescript
// OLD (Mailgun):
const routeResult = await mailgunRoutes.createUserEmailRoute(emailPrefix, userId, personalEmail);

// NEW (SendGrid - no external API call needed):
await db.update(users)
  .set({ emailPrefix, personalEmailForward: personalEmail })
  .where(eq(users.id, userId));
```

---

### Phase 4: Update Supabase SMTP (10 minutes)

#### Get SendGrid SMTP Credentials

1. SendGrid Dashboard → **Settings** → **API Keys**
2. Create new API key with **Mail Send** permission only
3. Or use existing API key

SendGrid SMTP credentials:
```
Host: smtp.sendgrid.net
Port: 587 (or 465 for SSL)
Username: apikey (literally the word "apikey")
Password: [Your SendGrid API Key]
```

#### Update Supabase Auth Settings

1. **Supabase Dashboard** → **Project Settings** → **Authentication** → **SMTP Settings**
2. Update:
   ```
   SMTP Settings:
   ├─ Host: smtp.sendgrid.net
   ├─ Port: 587
   ├─ Username: apikey
   ├─ Password: [Your SendGrid API Key]
   ├─ Sender email: noreply@musobuddy.com
   └─ Sender name: MusoBuddy
   ```
3. Click **Save**

#### Test Password Reset

1. Go to `https://www.musobuddy.com/auth/forgot-password`
2. Enter `timfulkermusic@gmail.com`
3. Check email arrives within seconds
4. Verify SendGrid logs show delivery

---

## Testing Checklist

### Pre-Deployment Testing (Development)

- [ ] **Test 1**: Send transactional email (contract, invoice)
  - Send a test contract email
  - Verify it arrives via SendGrid
  - Check SendGrid dashboard shows delivery

- [ ] **Test 2**: Send auth email (password reset)
  - Trigger password reset in dev
  - Verify Supabase uses SendGrid SMTP
  - Verify link works (no URL rewriting)

- [ ] **Test 3**: Receive inbound enquiry email
  - Send email to `yourprefix@enquiries.musobuddy.com`
  - Check webhook receives it
  - Verify parsing and booking creation

- [ ] **Test 4**: Receive unparseable email
  - Send vague email without date
  - Verify it goes to review queue
  - Check notification counter updates

- [ ] **Test 5**: Receive client reply
  - Send email to `booking-123@enquiries.musobuddy.com`
  - Verify reply is saved to booking
  - Check timeline updates

### Production Testing

- [ ] **Test 6**: Live enquiry processing
  - Send real enquiry from external email
  - Monitor logs for successful processing
  - Verify booking created correctly

- [ ] **Test 7**: Deliverability check
  - Send test emails to Gmail, Outlook, Yahoo
  - Check they don't go to spam
  - Verify SPF/DKIM passes (mail-tester.com)

- [ ] **Test 8**: Monitor for 24 hours
  - Watch for any webhook errors
  - Check all emails processed correctly
  - Monitor SendGrid dashboard for bounces

---

## Rollback Plan

### If Something Goes Wrong

#### Rollback Outbound Emails (Code Change)

1. Revert changes to `server/core/services.ts`
2. Redeploy application
3. Verify Mailgun starts working again

```bash
git revert [commit-hash]
git push
```

#### Rollback Inbound Emails (DNS Change)

1. Update MX record back to Mailgun:
   ```
   Type: MX
   Host: enquiries.musobuddy.com
   Value: mxa.mailgun.org
   Priority: 10
   ```
2. Wait for DNS propagation (1-2 hours)
3. Mailgun webhooks resume

#### Rollback Supabase SMTP (Dashboard Change)

1. Supabase Dashboard → **SMTP Settings**
2. Enter Mailgun SMTP credentials again
3. Test password reset

**DNS Note**: Keep both Mailgun and SendGrid accounts active during migration. You can switch between them with just DNS changes.

---

## Cost Comparison

### Current (Mailgun):
- **Shared IP**: $0/month (but blocklisted)
- **Dedicated IP**: $60-90/month + base plan
- **Email volume**: 1,000/month
- **Total**: $60-90/month to fix deliverability

### After Migration (SendGrid):
- **Free Tier**: 100 emails/day (3,000/month)
- **Email volume**: 1,000/month ✅ Fits in free tier
- **Total**: $0/month 🎉

### If You Exceed Free Tier:
- **Essentials Plan**: $20/month for 50,000 emails
- Still cheaper than Mailgun dedicated IP

---

## Timeline

### Phased Migration (Recommended)

**Week 1**:
- Day 1-2: SendGrid account setup, domain authentication
- Day 3-4: Migrate outbound emails (Phase 1)
- Day 5-7: Test outbound emails thoroughly

**Week 2**:
- Day 1-2: DNS changes for inbound email
- Day 3-4: Deploy inbound webhook handler (Phase 2)
- Day 5-7: Monitor and test inbound emails

**Week 3**:
- Day 1-2: Update Supabase SMTP (Phase 4)
- Day 3-7: Full production testing, monitor all emails

**Week 4**:
- Cleanup: Remove Mailgun dependencies
- Final testing and documentation

### Fast Migration (If Urgent)

**Day 1**: Setup SendGrid, update code, deploy
**Day 2**: DNS changes, test inbound
**Day 3**: Update Supabase SMTP
**Day 4**: Monitor and fix issues
**Day 5**: Remove Mailgun

---

## Post-Migration

### Monitor These Metrics

1. **Email Deliverability** (SendGrid Dashboard → Analytics)
   - Delivery rate (should be >99%)
   - Bounce rate (should be <2%)
   - Spam reports (should be <0.1%)
   - Open rates (for comparison)

2. **Webhook Success Rate** (Your logs)
   - Check for 5xx errors in webhook handler
   - Monitor for duplicate processing
   - Verify all emails reach review queue or bookings

3. **User Complaints**
   - "I didn't receive the email"
   - "Email went to spam"
   - "Reset link doesn't work"

### Cleanup Tasks

- [ ] Remove Mailgun from `package.json` dependencies
- [ ] Delete `server/core/mailgun-routes.ts`
- [ ] Delete `server/core/mailgun-auth-service.ts`
- [ ] Remove `MAILGUN_API_KEY` from environment variables
- [ ] Remove Mailgun DNS records (after 1 month)
- [ ] Cancel Mailgun account (after 1 month)
- [ ] Update documentation

---

## Environment Variables Summary

### Before Migration (Mailgun)
```bash
MAILGUN_API_KEY=xxxxx
MAILGUN_DOMAIN=musobuddy.com
```

### After Migration (SendGrid)
```bash
SENDGRID_API_KEY=SG.xxxxx
SENDGRID_SENDER_EMAIL=noreply@musobuddy.com
SENDGRID_SENDER_NAME=MusoBuddy
SENDGRID_INBOUND_DOMAIN=enquiries.musobuddy.com
```

### Update in Both Places:
1. `.env` file (local development)
2. Replit Secrets (production)

---

## Support Resources

### SendGrid Documentation
- **Getting Started**: https://docs.sendgrid.com/for-developers/sending-email
- **Inbound Parse**: https://docs.sendgrid.com/for-developers/parsing-email/setting-up-the-inbound-parse-webhook
- **SMTP Integration**: https://docs.sendgrid.com/for-developers/sending-email/integrating-with-the-smtp-api
- **Node.js SDK**: https://github.com/sendgrid/sendgrid-nodejs

### Troubleshooting
- **SendGrid Support**: https://support.sendgrid.com
- **Status Page**: https://status.sendgrid.com
- **Community Forum**: https://community.sendgrid.com

### Email Testing Tools
- **Mail Tester**: https://www.mail-tester.com (check spam score)
- **MX Toolbox**: https://mxtoolbox.com (verify DNS records)
- **SendGrid Email Testing**: https://sendgrid.com/docs/ui/sending-email/email-testing

---

## FAQ

### Q: Will this solve the blocklist issue?
**A**: Yes. SendGrid uses different IP pools with better reputation. You won't inherit Mailgun's IP blocklist issues.

### Q: What if I exceed the free tier?
**A**: At 1,000 emails/month, you're well within the 3,000/month limit. If you grow, the $20/month plan covers 50,000 emails.

### Q: Can I test SendGrid while keeping Mailgun active?
**A**: Yes! You can run both in parallel during testing. Use environment variables to switch between them.

### Q: What about email deliverability compared to Mailgun?
**A**: SendGrid generally has better deliverability for low-volume senders because their shared IPs are well-maintained. Mailgun's shared IP being blocklisted is proof they're not as carefully managed.

### Q: Will I lose any features?
**A**: The only "feature" you'll lose is the Routes API, but your current implementation already works with database-driven routing. Everything else has a SendGrid equivalent.

### Q: How long does DNS propagation take?
**A**: Usually 1-4 hours, but can take up to 48 hours in rare cases. Test with `dig` or `nslookup` to check propagation status.

### Q: Can I undo the migration?
**A**: Yes! Keep your Mailgun account active for 1 month. You can switch back with just DNS changes and code revert.

---

## Summary

**Bottom Line**: For 1,000 emails/month, SendGrid's free tier is perfect. The migration is medium complexity but well worth it to:
- ✅ Fix deliverability issues (blocklist)
- ✅ Save $60-90/month (no dedicated IP needed)
- ✅ Get better analytics
- ✅ Use a more modern, well-maintained service

**Recommended Approach**: Phased migration over 2-3 weeks with thorough testing at each stage.

**Biggest Risk**: Inbound email routing during DNS propagation window (mitigated by testing in dev first).

**Biggest Benefit**: Instant fix for blocklist issue + free email service forever.

---

Need help with any specific step? Let me know and I can provide more detailed code examples or troubleshooting guidance.
