# SendGrid Migration: Step-by-Step Checklist

**Date Started**: 2025-10-07
**Current Status**: Planning phase
**Last Updated**: 2025-10-07

---

## Context & Key Decisions

### Current Mailgun Setup (Discovered):
- **Domain 1**: `enquiries.musobuddy.com` - New enquiries
  - 24 user-specific routes (priority 1) with personal email forwarding
  - 1 catch-all fallback (priority 1)
  - Personal forwarding: ✅ WORKS

- **Domain 2**: `mg.musobuddy.com` - Client replies
  - 1 catch-all route (priority 0)
  - Personal forwarding: ❌ NOT IMPLEMENTED

### Why Migrating:
- Current Mailgun shared IP (185.250.239.6) is blocklisted by Validity spam filter
- Emails bouncing to some recipients (groovemeister.co.uk)
- Mailgun fix requires dedicated IP: $60-90/month + 6 weeks warming
- Current volume: 1,000 emails/month (dedicated IP is overkill)
- Scalability: Mailgun route limit = 1,000 users max
- SendGrid: Free tier covers 3,000 emails/month, unlimited users

### Key Challenge:
- **Personal email forwarding**: Currently done via Mailgun routes
- **Solution**: Implement in webhook code instead (preserves functionality, improves scalability)

### User Impact:
- **24 active users** with email prefixes
- **Personal forwarding** is actively used
- **Must preserve** this functionality during migration

---

## Migration Strategy

### Phase 1: SendGrid Setup (No code changes, no production impact)
- Set up SendGrid account
- Verify domains
- Configure Inbound Parse (but don't change DNS yet)
- Get API keys

### Phase 2: Code Implementation (Deploy with Mailgun still active)
- Add provider abstraction layer
- Add SendGrid webhook handlers
- Implement personal forwarding in webhook code
- Deploy (but keep EMAIL_PROVIDER=mailgun)

### Phase 3: Testing (In development/staging)
- Test outbound emails via SendGrid
- Test inbound emails via SendGrid webhook
- Test personal forwarding works correctly
- Verify all 24 users' forwarding addresses work

### Phase 4: Production Switch (DNS + environment variable)
- Update DNS MX records for both domains
- Switch EMAIL_PROVIDER=sendgrid
- Monitor closely for 24-48 hours

### Phase 5: Cleanup (After 30-60 days stability)
- Remove Mailgun routes
- Cancel Mailgun account
- Remove Mailgun dependencies

---

## Detailed Step-by-Step Checklist

---

## PHASE 1: SENDGRID SETUP

### Step 1.1: Create SendGrid Account ⬜ NOT STARTED

**Action**: Sign up for SendGrid account

1. Go to https://sendgrid.com
2. Click "Start for Free" or "Sign Up"
3. Create account with business email
4. Verify email address
5. Complete account setup

**Screenshot needed**: SendGrid dashboard after login

**Status**: ⬜ Not Started | ⏳ In Progress | ✅ Completed
**Date completed**: ___________
**Notes**:


---

### Step 1.2: Domain Authentication (Outbound Email) ⬜ NOT STARTED

**Action**: Verify `musobuddy.com` for sending emails

**In SendGrid:**
1. Go to **Settings** → **Sender Authentication**
2. Click **Authenticate Your Domain**
3. Select your DNS provider (Cloudflare, Namecheap, etc.)
4. Enter domain: `musobuddy.com`
5. SendGrid will provide DNS records to add

**Screenshot needed**:
- SendGrid DNS records to add
- Your current DNS provider dashboard

**DNS Records to Add** (SendGrid will provide exact values):
```
Type: CNAME
Host: em[####].musobuddy.com
Value: u[#######].wl[###].sendgrid.net

Type: CNAME
Host: s1._domainkey.musobuddy.com
Value: [SendGrid provides]

Type: CNAME
Host: s2._domainkey.musobuddy.com
Value: [SendGrid provides]
```

**Status**: ⬜ Not Started | ⏳ In Progress | ✅ Completed
**Date completed**: ___________
**Notes**:


---

### Step 1.3: Get SendGrid API Key ⬜ NOT STARTED

**Action**: Create API key for sending emails

**In SendGrid:**
1. Go to **Settings** → **API Keys**
2. Click **Create API Key**
3. Name: "MusoBuddy Production"
4. Permissions: **Full Access** (or at minimum: Mail Send + Inbound Parse)
5. Click **Create & View**
6. **COPY THE KEY IMMEDIATELY** (you can't see it again!)

**API Key Format**: `SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

**Save to** (temporarily, we'll add to environment later):
- Password manager
- Secure note

**Status**: ⬜ Not Started | ⏳ In Progress | ✅ Completed
**Date completed**: ___________
**API Key saved**: ⬜ Yes | ⬜ No
**Notes**:


---

### Step 1.4: Set Up Inbound Parse #1 (enquiries.musobuddy.com) ⬜ NOT STARTED

**Action**: Configure inbound email for enquiries domain

**In SendGrid:**
1. Go to **Settings** → **Inbound Parse**
2. Click **Add Host & URL**
3. Configure:
   - **Domain**: `enquiries.musobuddy.com`
   - **Subdomain**: (leave blank - we're using the root)
   - **Destination URL**: `https://musobuddy.replit.app/api/webhook/sendgrid-enquiries`
   - **Spam Check**: ✅ Check incoming emails for spam
   - **Send Raw**: ⬜ Leave unchecked (we want parsed email)
4. Click **Add**

**SendGrid will provide MX record**:
```
Type: MX
Host: enquiries.musobuddy.com
Value: mx.sendgrid.net
Priority: 10
TTL: Auto
```

**DO NOT add this DNS record yet!** (We'll do it in Phase 4)

**Screenshot needed**: SendGrid Inbound Parse configuration page showing the MX record

**Status**: ⬜ Not Started | ⏳ In Progress | ✅ Completed
**Date completed**: ___________
**Notes**:


---

### Step 1.5: Set Up Inbound Parse #2 (mg.musobuddy.com) ⬜ NOT STARTED

**Action**: Configure inbound email for replies domain

**In SendGrid:**
1. Go to **Settings** → **Inbound Parse**
2. Click **Add Host & URL**
3. Configure:
   - **Domain**: `mg.musobuddy.com`
   - **Subdomain**: (leave blank)
   - **Destination URL**: `https://musobuddy.replit.app/api/webhook/sendgrid-replies`
   - **Spam Check**: ✅ Check incoming emails for spam
   - **Send Raw**: ⬜ Leave unchecked
4. Click **Add**

**SendGrid will provide MX record**:
```
Type: MX
Host: mg.musobuddy.com
Value: mx.sendgrid.net
Priority: 10
TTL: Auto
```

**DO NOT add this DNS record yet!** (We'll do it in Phase 4)

**Screenshot needed**: SendGrid Inbound Parse configuration page

**Status**: ⬜ Not Started | ⏳ In Progress | ✅ Completed
**Date completed**: ___________
**Notes**:


---

### Step 1.6: Verify SendGrid SMTP Credentials ⬜ NOT STARTED

**Action**: Get SMTP credentials for Supabase Auth

**SMTP Credentials**:
```
Host: smtp.sendgrid.net
Port: 587 (or 465 for SSL)
Username: apikey (literally the word "apikey")
Password: [Your SendGrid API Key from Step 1.3]
```

**DO NOT update Supabase yet!** (We'll do it in Phase 4)

**Status**: ⬜ Not Started | ⏳ In Progress | ✅ Completed
**Date completed**: ___________
**Notes**:


---

## PHASE 2: CODE IMPLEMENTATION

### Step 2.1: Add Provider Abstraction Layer ⬜ NOT STARTED

**Action**: Add the email provider abstraction code

**File already created**: `server/core/email-provider-abstraction.ts`

**Verify file exists**:
```bash
ls -la server/core/email-provider-abstraction.ts
```

If it exists: ✅
If not: Contact Claude to recreate it

**Status**: ⬜ Not Started | ⏳ In Progress | ✅ Completed
**Date completed**: ___________
**Notes**:


---

### Step 2.2: Update services.ts to Use Abstraction ⬜ NOT STARTED

**Action**: Update the email service to use provider abstraction

**File**: `server/core/services.ts`

**Option A** - Re-export (recommended, less code change):

Add at the TOP of the file (before existing EmailService class):
```typescript
// Re-export the abstraction layer for backward compatibility
export { EmailService, emailService } from './email-provider-abstraction';
```

Then comment out or delete the old EmailService class (lines ~5-132)

**Option B** - Replace entirely:

Replace the entire EmailService class with:
```typescript
export { EmailService, emailService } from './email-provider-abstraction';
```

**Test after change**:
```bash
npm run check
# Should have no TypeScript errors
```

**Status**: ⬜ Not Started | ⏳ In Progress | ✅ Completed
**Date completed**: ___________
**Compilation errors**: ⬜ Yes | ⬜ No
**Notes**:


---

### Step 2.3: Add SendGrid Enquiries Webhook Handler ⬜ NOT STARTED

**Action**: Create webhook endpoint for SendGrid enquiries

**File**: `server/index.ts`

**Add this code** (after existing Mailgun webhook, around line 1100+):

```typescript
// ============================================================================
// SENDGRID WEBHOOK: Inbound enquiries (enquiries.musobuddy.com)
// ============================================================================
app.post('/api/webhook/sendgrid-enquiries', upload.any(), async (req, res) => {
  console.log('📧 [SENDGRID-ENQUIRIES] Inbound email received');
  console.log('📧 [SENDGRID-ENQUIRIES] Body keys:', Object.keys(req.body || {}));

  try {
    const webhookData = req.body;

    // SendGrid webhook format (different from Mailgun)
    const fromEmail = webhookData.from || '';
    const toEmail = webhookData.to || '';
    const subject = webhookData.subject || '';
    const textBody = webhookData.text || '';
    const htmlBody = webhookData.html || '';

    console.log('📧 [SENDGRID-ENQUIRIES] Email details:', {
      from: fromEmail,
      to: toEmail,
      subject: subject,
      hasText: !!textBody,
      hasHtml: !!htmlBody
    });

    // Extract recipient prefix (user identification)
    const recipientMatch = toEmail.match(/^([^@]+)@enquiries\.musobuddy\.com/);
    if (!recipientMatch) {
      console.log('❌ [SENDGRID-ENQUIRIES] Invalid recipient format:', toEmail);
      return res.status(200).json({ status: 'ignored', message: 'Invalid recipient format' });
    }

    const emailPrefix = recipientMatch[1];
    const normalizedPrefix = normalizeEmailPrefix(emailPrefix);

    console.log('👤 [SENDGRID-ENQUIRIES] Email prefix:', emailPrefix, '→ Normalized:', normalizedPrefix);

    // Duplicate check (reuse existing function)
    const emailSignature = createEmailSignature({
      sender: fromEmail,
      subject: subject,
      'message-id': webhookData.message_id || '',
      'body-plain': textBody
    });

    if (processedEmails.has(emailSignature)) {
      console.log('🔄 [SENDGRID-ENQUIRIES] DUPLICATE EMAIL - Skipping');
      return res.status(200).json({
        status: 'duplicate',
        message: 'Email already processed'
      });
    }

    processedEmails.add(emailSignature);
    setTimeout(() => processedEmails.delete(emailSignature), DEDUPLICATION_WINDOW);

    // Look up user by email prefix
    const { db } = await import('@db');
    const { users, settings } = await import('@shared/schema');
    const { eq } = await import('drizzle-orm');

    const userResults = await db.select().from(users).where(eq(users.emailPrefix, normalizedPrefix));

    if (userResults.length === 0) {
      console.log('❌ [SENDGRID-ENQUIRIES] No user found for email prefix:', normalizedPrefix);
      return res.status(200).json({
        status: 'user_not_found',
        message: `No user registered with email prefix: ${normalizedPrefix}`
      });
    }

    const user = userResults[0];
    console.log('✅ [SENDGRID-ENQUIRIES] User found:', user.id, user.email);

    // CRITICAL: Personal email forwarding
    // Get user's settings to check for personal forward email
    const userSettings = await db.select().from(settings).where(eq(settings.userId, user.id));
    const personalForwardEmail = userSettings[0]?.personalForwardEmail;

    if (personalForwardEmail && personalForwardEmail.trim()) {
      console.log('📨 [SENDGRID-ENQUIRIES] Forwarding to personal email:', personalForwardEmail);

      try {
        const { emailService } = await import('./core/email-provider-abstraction');

        await emailService.sendEmail({
          to: personalForwardEmail,
          subject: subject,
          html: htmlBody || `<pre>${textBody}</pre>`,
          text: textBody,
          replyTo: fromEmail,
          fromEmail: 'noreply@musobuddy.com',
          fromName: 'MusoBuddy Enquiries'
        });

        console.log('✅ [SENDGRID-ENQUIRIES] Personal forwarding successful');
      } catch (forwardError) {
        console.error('❌ [SENDGRID-ENQUIRIES] Personal forwarding failed:', forwardError);
        // Continue processing even if forwarding fails
      }
    } else {
      console.log('ℹ️ [SENDGRID-ENQUIRIES] No personal forwarding configured for this user');
    }

    // Extract email body (prefer plain text, fallback to HTML stripped)
    let emailBody = textBody || '';
    if (!emailBody && htmlBody) {
      // Simple HTML stripping
      emailBody = htmlBody.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }

    // Parse email with AI (reuse existing logic)
    const parsedData = await parseEmailWithAI(fromEmail, subject, emailBody);

    if (parsedData.canParse) {
      // Create booking directly
      console.log('✅ [SENDGRID-ENQUIRIES] Email parsed successfully, creating booking');

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

      console.log('✅ [SENDGRID-ENQUIRIES] Booking created:', newBooking.id);

      // Send confirmation email to client
      const { emailService } = await import('./core/email-provider-abstraction');
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
      console.log('⚠️ [SENDGRID-ENQUIRIES] Email cannot be parsed automatically, saving to review queue');

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

      console.log('✅ [SENDGRID-ENQUIRIES] Saved to unparseable_messages:', savedMessage.id);

      return res.status(200).json({
        status: 'saved_for_review',
        messageId: savedMessage.id
      });
    }

  } catch (error: any) {
    console.error('❌ [SENDGRID-ENQUIRIES] Webhook processing error:', error);
    console.error('❌ [SENDGRID-ENQUIRIES] Stack trace:', error.stack);

    return res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});
```

**Status**: ⬜ Not Started | ⏳ In Progress | ✅ Completed
**Date completed**: ___________
**Notes**:


---

### Step 2.4: Add SendGrid Replies Webhook Handler ⬜ NOT STARTED

**Action**: Create webhook endpoint for SendGrid replies

**File**: `server/index.ts`

**Add this code** (after SendGrid enquiries webhook):

```typescript
// ============================================================================
// SENDGRID WEBHOOK: Client replies (mg.musobuddy.com)
// ============================================================================
app.post('/api/webhook/sendgrid-replies', upload.any(), async (req, res) => {
  console.log('📧 [SENDGRID-REPLIES] Client reply received');
  console.log('📧 [SENDGRID-REPLIES] Body keys:', Object.keys(req.body || {}));

  try {
    const webhookData = req.body;

    // SendGrid webhook format
    const fromEmail = webhookData.from || '';
    const toEmail = webhookData.to || '';
    const subject = webhookData.subject || '';
    const textBody = webhookData.text || '';
    const htmlBody = webhookData.html || '';

    console.log('📧 [SENDGRID-REPLIES] Email details:', {
      from: fromEmail,
      to: toEmail,
      subject: subject
    });

    // Extract booking/invoice ID from recipient
    const bookingMatch = toEmail.match(/booking-?(\d+)@/);
    const invoiceMatch = toEmail.match(/invoice-?(\d+)@/);

    let bookingId = null;
    let replyType = 'unknown';

    if (bookingMatch) {
      bookingId = bookingMatch[1];
      replyType = 'booking';
    } else if (invoiceMatch) {
      bookingId = invoiceMatch[1];
      replyType = 'invoice';
    } else {
      console.log('❌ [SENDGRID-REPLIES] No booking/invoice ID found in recipient:', toEmail);
      return res.status(200).json({
        status: 'ignored',
        message: 'No booking/invoice ID found'
      });
    }

    console.log(`📨 [SENDGRID-REPLIES] ${replyType} reply for ID:`, bookingId);

    // Duplicate check
    const emailSignature = createEmailSignature({
      sender: fromEmail,
      subject: subject,
      'message-id': webhookData.message_id || '',
      'body-plain': textBody
    });

    if (processedEmails.has(emailSignature)) {
      console.log('🔄 [SENDGRID-REPLIES] DUPLICATE EMAIL - Skipping');
      return res.status(200).json({
        status: 'duplicate',
        message: 'Email already processed'
      });
    }

    processedEmails.add(emailSignature);
    setTimeout(() => processedEmails.delete(emailSignature), DEDUPLICATION_WINDOW);

    // Extract email body
    let emailBody = textBody || '';
    if (!emailBody && htmlBody) {
      emailBody = htmlBody.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }

    // Save reply to booking
    const { db } = await import('@db');
    const { bookings, bookingTimeline } = await import('@shared/schema');
    const { eq } = await import('drizzle-orm');

    const bookingResults = await db.select().from(bookings).where(eq(bookings.id, parseInt(bookingId)));

    if (bookingResults.length === 0) {
      console.log('❌ [SENDGRID-REPLIES] Booking not found:', bookingId);
      return res.status(200).json({
        status: 'booking_not_found',
        message: `Booking ${bookingId} not found`
      });
    }

    const booking = bookingResults[0];
    console.log('✅ [SENDGRID-REPLIES] Booking found:', booking.id);

    // Add to booking timeline
    await db.insert(bookingTimeline).values({
      bookingId: booking.id,
      action: 'client_reply',
      description: `Client replied: ${emailBody.substring(0, 200)}...`,
      metadata: JSON.stringify({
        from: fromEmail,
        subject: subject,
        body: emailBody
      }),
      createdAt: new Date()
    });

    console.log('✅ [SENDGRID-REPLIES] Reply saved to booking timeline');

    return res.status(200).json({
      status: 'reply_saved',
      bookingId: booking.id
    });

  } catch (error: any) {
    console.error('❌ [SENDGRID-REPLIES] Webhook processing error:', error);
    console.error('❌ [SENDGRID-REPLIES] Stack trace:', error.stack);

    return res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});
```

**Status**: ⬜ Not Started | ⏳ In Progress | ✅ Completed
**Date completed**: ___________
**Notes**:


---

### Step 2.5: Add Environment Variables ⬜ NOT STARTED

**Action**: Add SendGrid credentials to environment

**In Replit Secrets** (Production):
Add these secrets:

```
EMAIL_PROVIDER=mailgun
# ↑ Keep as mailgun for now! We'll change this in Phase 4

SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_SENDER_EMAIL=noreply@musobuddy.com
SENDGRID_SENDER_NAME=MusoBuddy

# Keep existing Mailgun secrets:
MAILGUN_API_KEY=xxxxx
MAILGUN_DOMAIN=musobuddy.com
```

**In `.env` file** (Development - local testing):
```bash
EMAIL_PROVIDER=mailgun

SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_SENDER_EMAIL=noreply@musobuddy.com
SENDGRID_SENDER_NAME=MusoBuddy

MAILGUN_API_KEY=xxxxx
MAILGUN_DOMAIN=musobuddy.com
```

**Status**: ⬜ Not Started | ⏳ In Progress | ✅ Completed
**Date completed**: ___________
**Notes**:


---

### Step 2.6: Deploy Code to Production ⬜ NOT STARTED

**Action**: Deploy all code changes (but keep using Mailgun)

**Before deploying:**
1. ✅ All code changes committed to git
2. ✅ `EMAIL_PROVIDER=mailgun` in production
3. ✅ TypeScript compiles without errors (`npm run check`)
4. ✅ All tests pass (if you have tests)

**Deploy:**
```bash
git add .
git commit -m "Add SendGrid provider abstraction and webhook handlers (not active yet)"
git push origin main
```

**After deploy:**
1. Check logs: App starts without errors
2. Verify: Existing emails still work (Mailgun still active)
3. Check: New webhook endpoints exist but not receiving traffic

**Status**: ⬜ Not Started | ⏳ In Progress | ✅ Completed
**Date completed**: ___________
**Errors**: ⬜ Yes | ⬜ No
**Notes**:


---

## PHASE 3: TESTING

### Step 3.1: Test Outbound Email (Development) ⬜ NOT STARTED

**Action**: Test SendGrid email sending in development environment

**In your local `.env` file, change:**
```bash
EMAIL_PROVIDER=sendgrid
```

**Restart your dev server**

**Add temporary test endpoint** (in `server/index.ts`):
```typescript
// TEMPORARY TEST ENDPOINT - Remove after testing
app.get('/api/test-sendgrid-outbound', async (req, res) => {
  const { emailService } = await import('./core/email-provider-abstraction');

  const result = await emailService.sendEmail({
    to: 'timfulkermusic@gmail.com',
    subject: 'Test Email from SendGrid',
    html: '<h1>Success!</h1><p>SendGrid outbound email is working!</p>',
    text: 'Success! SendGrid outbound email is working!'
  });

  res.json({
    provider: emailService.getProviderName(),
    configured: emailService.isConfigured(),
    result
  });
});
```

**Test:**
```bash
curl http://localhost:5000/api/test-sendgrid-outbound
```

**Expected result:**
- Email arrives at timfulkermusic@gmail.com ✅
- Response shows `"provider": "sendgrid"` ✅
- Response shows `"success": true` ✅

**Status**: ⬜ Not Started | ⏳ In Progress | ✅ Completed
**Date completed**: ___________
**Email received**: ⬜ Yes | ⬜ No
**Notes**:


---

### Step 3.2: Test Personal Forwarding Logic ⬜ NOT STARTED

**Action**: Test that personal forwarding code works

**Setup test data in database:**
```sql
-- Update a test user with personal forwarding
UPDATE settings
SET personal_forward_email = 'timfulkermusic@gmail.com'
WHERE user_id = (SELECT id FROM users WHERE email_prefix = 'tim' LIMIT 1);
```

**Create test webhook payload** (save as `test-sendgrid-enquiry.json`):
```json
{
  "from": "testclient@example.com",
  "to": "tim@enquiries.musobuddy.com",
  "subject": "Test Enquiry",
  "text": "This is a test enquiry for my wedding on 2025-12-25",
  "html": "<p>This is a test enquiry for my wedding on 2025-12-25</p>"
}
```

**Test the webhook** (dev server):
```bash
curl -X POST http://localhost:5000/api/webhook/sendgrid-enquiries \
  -H "Content-Type: application/json" \
  -d @test-sendgrid-enquiry.json
```

**Expected result:**
- Booking created in database ✅
- Email forwarded to timfulkermusic@gmail.com ✅
- Logs show `[SENDGRID-ENQUIRIES] Personal forwarding successful` ✅

**Status**: ⬜ Not Started | ⏳ In Progress | ✅ Completed
**Date completed**: ___________
**Booking created**: ⬜ Yes | ⬜ No
**Forwarding worked**: ⬜ Yes | ⬜ No
**Notes**:


---

### Step 3.3: Test All 24 Users' Forwarding Addresses ⬜ NOT STARTED

**Action**: Verify all users with personal forwarding configured

**Query database:**
```sql
SELECT
  u.id,
  u.email_prefix,
  u.email,
  s.personal_forward_email
FROM users u
LEFT JOIN settings s ON s.user_id = u.id
WHERE u.email_prefix IS NOT NULL
ORDER BY u.email_prefix;
```

**Create checklist:**
- Total users with email prefix: _______
- Users with personal forwarding: _______
- Users without personal forwarding: _______

**For each user with personal forwarding:**
1. Verify email address is valid
2. Note any that look suspicious (test addresses, old addresses, etc.)
3. Consider emailing users to confirm their forwarding address is current

**Status**: ⬜ Not Started | ⏳ In Progress | ✅ Completed
**Date completed**: ___________
**Total users checked**: _______
**Issues found**: _______
**Notes**:


---

### Step 3.4: Switch Back to Mailgun (Verify Rollback Works) ⬜ NOT STARTED

**Action**: Test that switching back to Mailgun works

**In your local `.env` file, change:**
```bash
EMAIL_PROVIDER=mailgun
```

**Restart your dev server**

**Test:**
```bash
curl http://localhost:5000/api/test-sendgrid-outbound
```

**Expected result:**
- Response shows `"provider": "mailgun"` ✅
- Email still sends successfully ✅
- Logs show `[MAILGUN]` instead of `[SENDGRID]` ✅

**This confirms rollback will work if needed!**

**Status**: ⬜ Not Started | ⏳ In Progress | ✅ Completed
**Date completed**: ___________
**Rollback works**: ⬜ Yes | ⬜ No
**Notes**:


---

## PHASE 4: PRODUCTION SWITCH

### Step 4.1: Pre-Switch Checklist ⬜ NOT STARTED

**Action**: Final verification before switching production

**Verify:**
- [ ] SendGrid domain authentication complete (Step 1.2)
- [ ] SendGrid Inbound Parse configured (Steps 1.4, 1.5)
- [ ] Code deployed to production (Step 2.6)
- [ ] All webhooks tested in development (Steps 3.1-3.3)
- [ ] Rollback tested and working (Step 3.4)
- [ ] Mailgun account still active (for rollback)
- [ ] DNS provider access confirmed
- [ ] Backup of current DNS records taken

**Screenshot DNS records BEFORE changes:**
- enquiries.musobuddy.com MX record
- mg.musobuddy.com MX record

**Status**: ⬜ Not Started | ⏳ In Progress | ✅ Completed
**Date completed**: ___________
**All checks passed**: ⬜ Yes | ⬜ No
**Notes**:


---

### Step 4.2: Update DNS Records ⬜ NOT STARTED

**Action**: Point email to SendGrid

**⚠️ IMPORTANT**: Do this during low-traffic time (e.g., evening/weekend)

**In your DNS provider dashboard:**

**Change #1: enquiries.musobuddy.com**
```
OLD:
Type: MX
Host: enquiries.musobuddy.com
Value: mxa.mailgun.org (or similar)
Priority: 10

NEW:
Type: MX
Host: enquiries.musobuddy.com
Value: mx.sendgrid.net
Priority: 10
TTL: Auto (or 300 for faster rollback)
```

**Change #2: mg.musobuddy.com**
```
OLD:
Type: MX
Host: mg.musobuddy.com
Value: mxa.mailgun.org (or similar)
Priority: 10

NEW:
Type: MX
Host: mg.musobuddy.com
Value: mx.sendgrid.net
Priority: 10
TTL: Auto (or 300 for faster rollback)
```

**After making changes:**
- Screenshot new DNS records
- Note the time DNS was changed: ___________

**DNS Propagation Check:**
```bash
# Check DNS propagation (may take 1-4 hours)
dig enquiries.musobuddy.com MX
dig mg.musobuddy.com MX

# Should show: mx.sendgrid.net
```

**Status**: ⬜ Not Started | ⏳ In Progress | ✅ Completed
**Date completed**: ___________
**DNS propagated**: ⬜ Yes | ⬜ No | ⬜ Partial
**Time taken**: _______ hours
**Notes**:


---

### Step 4.3: Switch EMAIL_PROVIDER to SendGrid ⬜ NOT STARTED

**Action**: Activate SendGrid for outbound emails

**In Replit Secrets (Production):**

Change:
```bash
EMAIL_PROVIDER=mailgun
```

To:
```bash
EMAIL_PROVIDER=sendgrid
```

**Restart production application**

**Verify in logs:**
```
✅ Email service using sendgrid
✅ SendGrid provider initialized
```

**Status**: ⬜ Not Started | ⏳ In Progress | ✅ Completed
**Date completed**: ___________
**Time switched**: ___________
**Logs look good**: ⬜ Yes | ⬜ No
**Notes**:


---

### Step 4.4: Monitor Production (First Hour) ⬜ NOT STARTED

**Action**: Watch logs and test immediately after switch

**Monitor:**
- [ ] Application logs (watch for errors)
- [ ] SendGrid dashboard (check for incoming emails)
- [ ] Mailgun dashboard (should stop receiving emails)

**Test #1: Send outbound email**
- Trigger password reset or send test contract
- Verify email arrives via SendGrid
- Check SendGrid dashboard shows sent email

**Test #2: Inbound enquiry email**
- Send email to your test prefix (e.g., tim@enquiries.musobuddy.com)
- Check logs for `[SENDGRID-ENQUIRIES]`
- Verify booking created
- Verify personal forwarding worked (check personal email)

**Test #3: Inbound reply email**
- Reply to an existing booking email (booking-123@mg.musobuddy.com)
- Check logs for `[SENDGRID-REPLIES]`
- Verify reply saved to booking

**Status**: ⬜ Not Started | ⏳ In Progress | ✅ Completed
**Date completed**: ___________
**Time monitored**: _______ minutes
**Issues found**: ⬜ Yes | ⬜ No
**Notes**:


---

### Step 4.5: Monitor Production (First 24 Hours) ⬜ NOT STARTED

**Action**: Continued monitoring after initial switch

**Check every 4-6 hours:**
- [ ] Application logs (any errors?)
- [ ] SendGrid dashboard (emails being processed?)
- [ ] User complaints (any missing emails?)
- [ ] Personal forwarding working (spot check a few users)

**Metrics to track:**
- Emails received (enquiries): _______
- Emails received (replies): _______
- Personal forwards sent: _______
- Errors/failures: _______

**Status**: ⬜ Not Started | ⏳ In Progress | ✅ Completed
**Date completed**: ___________
**Issues found**: ⬜ Yes | ⬜ No
**Notes**:


---

### Step 4.6: Update Supabase SMTP to SendGrid ⬜ NOT STARTED

**Action**: Switch Supabase auth emails to SendGrid

**In Supabase Dashboard:**
1. Go to **Project Settings** → **Authentication** → **SMTP Settings**
2. Update to SendGrid:
   ```
   Host: smtp.sendgrid.net
   Port: 587
   Username: apikey
   Password: [Your SendGrid API Key from Step 1.3]
   Sender email: noreply@musobuddy.com
   Sender name: MusoBuddy
   ```
3. Click **Save**

**Test:**
- Trigger password reset for test account
- Verify email arrives quickly (within seconds)
- Check email links work correctly

**Status**: ⬜ Not Started | ⏳ In Progress | ✅ Completed
**Date completed**: ___________
**Password reset works**: ⬜ Yes | ⬜ No
**Notes**:


---

## PHASE 5: STABILITY & CLEANUP

### Step 5.1: Monitor for 30 Days ⬜ NOT STARTED

**Action**: Ensure stability before final cleanup

**Weekly checks (4 weeks):**

**Week 1**: ___________
- Emails working: ⬜ Yes | ⬜ No
- Issues: ___________

**Week 2**: ___________
- Emails working: ⬜ Yes | ⬜ No
- Issues: ___________

**Week 3**: ___________
- Emails working: ⬜ Yes | ⬜ No
- Issues: ___________

**Week 4**: ___________
- Emails working: ⬜ Yes | ⬜ No
- Issues: ___________

**Status**: ⬜ Not Started | ⏳ In Progress | ✅ Completed
**Date completed**: ___________
**Notes**:


---

### Step 5.2: Delete Mailgun Routes ⬜ NOT STARTED

**Action**: Clean up Mailgun (after 30 days stability)

**In Mailgun Dashboard:**
1. Go to Routes
2. Delete all 24 user-specific routes (priority 1)
3. Delete 2 catch-all routes (priority 0/1)
4. Screenshot empty routes list

**Note**: Keep Mailgun account active for another 30 days (for emergency rollback)

**Status**: ⬜ Not Started | ⏳ In Progress | ✅ Completed
**Date completed**: ___________
**Routes deleted**: _______ routes
**Notes**:


---

### Step 5.3: Remove Mailgun Code Dependencies ⬜ NOT STARTED

**Action**: Clean up code (after 60 days stability)

**Remove these files:**
- `server/core/mailgun-routes.ts`
- `server/core/mailgun-auth-service.ts`

**Update `package.json`:**
Remove:
```json
"mailgun.js": "^12.0.3",
```

**Run:**
```bash
npm install
```

**Remove from environment:**
- `MAILGUN_API_KEY`
- `MAILGUN_DOMAIN`

**Keep:**
- `EMAIL_PROVIDER=sendgrid`

**Status**: ⬜ Not Started | ⏳ In Progress | ✅ Completed
**Date completed**: ___________
**Notes**:


---

### Step 5.4: Cancel Mailgun Account ⬜ NOT STARTED

**Action**: Final cleanup (after 90 days stability)

**In Mailgun Dashboard:**
1. Go to Account Settings
2. Cancel subscription
3. Download final invoice/records
4. Take final screenshot of account

**Update documentation:**
- Update any internal docs mentioning Mailgun
- Update deployment guides
- Update onboarding docs

**Status**: ⬜ Not Started | ⏳ In Progress | ✅ Completed
**Date completed**: ___________
**Final cost savings**: $_______ per month
**Notes**:


---

## ROLLBACK PROCEDURE (IF NEEDED)

### Emergency Rollback (Use if SendGrid has issues)

**Step 1: Revert DNS (Highest priority)**
```
Change MX records back to Mailgun:

enquiries.musobuddy.com → mxa.mailgun.org
mg.musobuddy.com → mxa.mailgun.org
```

**Step 2: Switch Environment Variable**
```
Replit Secrets:
EMAIL_PROVIDER=mailgun
```

**Step 3: Restart Application**

**Step 4: Verify**
- Check logs show `[MAILGUN]` instead of `[SENDGRID]`
- Test inbound email
- Test outbound email

**Time to rollback**: 15-30 minutes (depending on DNS propagation)

---

## CONTACT & SUPPORT

### If You Get Stuck:

**SendGrid Support:**
- Dashboard: https://app.sendgrid.com
- Support: https://support.sendgrid.com
- Status: https://status.sendgrid.com

**DNS Issues:**
- Check propagation: https://dnschecker.org
- MX lookup: `dig domain.com MX`

**Replit Issues:**
- Check logs in Replit console
- Verify secrets are set correctly
- Restart deployment

**Claude Code:**
- Open new conversation
- Reference this file: `SENDGRID-MIGRATION-STEP-BY-STEP.md`
- Provide specific error messages or screenshots

---

## COST TRACKING

### Before Migration (Mailgun):
- Monthly cost: $0 (but emails bouncing due to blocklist)
- To fix: $60-90/month (dedicated IP)

### After Migration (SendGrid):
- Current volume: 1,000 emails/month
- SendGrid tier: **Free** (up to 3,000/month)
- Monthly cost: **$0**
- Cost savings: **$60-90/month** ($720-1,080/year)

### Future Scaling:
- At 50k/month: $20/month (vs Mailgun $95/month) = $75/month savings
- At 100k/month: $90/month (vs Mailgun $140/month) = $50/month savings

---

## SUCCESS CRITERIA

Migration is successful when:
- ✅ All inbound emails processed correctly (enquiries + replies)
- ✅ All outbound emails delivered (contracts, invoices, notifications)
- ✅ Personal email forwarding works for all 24 users
- ✅ No user complaints about missing emails
- ✅ Deliverability > 99% (no bounces due to blocklist)
- ✅ SendGrid dashboard shows healthy delivery metrics
- ✅ 30 days stability with no major issues

---

## MIGRATION LOG

**Start Date**: ___________
**Completion Date**: ___________
**Total Time**: _______ days
**Issues Encountered**: ___________
**Lessons Learned**: ___________

---

**END OF MIGRATION CHECKLIST**

*This document should be updated as you progress through each step.*
*Take screenshots at every major milestone.*
*Keep this file for future reference and troubleshooting.*
