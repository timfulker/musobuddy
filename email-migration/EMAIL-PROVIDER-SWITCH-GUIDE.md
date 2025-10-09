# Email Provider Switch Guide

## Single Environment Variable Control

Switch between Mailgun and SendGrid with **ONE environment variable**: `EMAIL_PROVIDER`

---

## Quick Switch Instructions

### Switch to SendGrid

1. **Update Environment Variable**:
   ```bash
   EMAIL_PROVIDER=sendgrid
   ```

2. **Restart Application**:
   ```bash
   # Replit will auto-restart
   # Or manually: npm run dev
   ```

3. **Verify** in logs:
   ```
   ✅ Email service using sendgrid
   ```

### Switch Back to Mailgun

1. **Update Environment Variable**:
   ```bash
   EMAIL_PROVIDER=mailgun
   ```

2. **Restart Application**

3. **Verify** in logs:
   ```
   ✅ Email service using mailgun
   ```

### Default Behavior

If `EMAIL_PROVIDER` is not set → **Defaults to Mailgun** (backward compatible)

---

## Implementation Steps

### Step 1: Add Abstraction Layer File

The file `server/core/email-provider-abstraction.ts` has been created with the abstraction layer.

### Step 2: Update services.ts to Use Abstraction

**File**: `server/core/services.ts`

**Option A** - Simple re-export (recommended):

Add at the TOP of the file, before the current EmailService class:

```typescript
// Re-export the abstraction layer for backward compatibility
export { EmailService, emailService } from './email-provider-abstraction';
```

Then comment out or remove the old EmailService class definition.

**Option B** - Replace the entire EmailService:

Replace the entire `EmailService` class (lines 5-132) with:

```typescript
// Import the abstraction layer
export { EmailService, emailService } from './email-provider-abstraction';
```

### Step 3: Set Environment Variables

#### For Development (.env file):

```bash
# Choose provider (mailgun or sendgrid)
EMAIL_PROVIDER=mailgun

# Mailgun Config (keep these for easy switch back)
MAILGUN_API_KEY=your-mailgun-api-key
MAILGUN_DOMAIN=musobuddy.com

# SendGrid Config (add these even if not using yet)
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_SENDER_EMAIL=noreply@musobuddy.com
SENDGRID_SENDER_NAME=MusoBuddy
```

#### For Production (Replit Secrets):

Add these secrets:

1. `EMAIL_PROVIDER` = `mailgun` (or `sendgrid`)
2. `MAILGUN_API_KEY` = (your existing Mailgun key)
3. `MAILGUN_DOMAIN` = `musobuddy.com`
4. `SENDGRID_API_KEY` = (your SendGrid key - get from SendGrid dashboard)
5. `SENDGRID_SENDER_EMAIL` = `noreply@musobuddy.com`
6. `SENDGRID_SENDER_NAME` = `MusoBuddy`

---

## Testing the Switch

### Test 1: Verify Current Provider

Check your application logs on startup. You should see one of:
```
✅ Email service using mailgun
```
or
```
✅ Email service using sendgrid
```

### Test 2: Add Temporary Test Endpoint

Add this to `server/index.ts` (temporary, for testing):

```typescript
// TEMPORARY TEST ENDPOINT - Remove after testing
app.get('/api/test-email-provider', async (req, res) => {
  const { emailService } = await import('./core/email-provider-abstraction');

  const result = await emailService.sendEmail({
    to: 'timfulkermusic@gmail.com',
    subject: `Test from ${emailService.getProviderName()}`,
    html: `<h1>Success!</h1><p>This email was sent using <strong>${emailService.getProviderName()}</strong></p>`,
    text: `This email was sent using ${emailService.getProviderName()}`
  });

  res.json({
    provider: emailService.getProviderName(),
    configured: emailService.isConfigured(),
    result
  });
});
```

Test it:
```bash
curl https://musobuddy.replit.app/api/test-email-provider
```

Expected response:
```json
{
  "provider": "mailgun",
  "configured": true,
  "result": {
    "success": true,
    "messageId": "...",
    "provider": "mailgun"
  }
}
```

### Test 3: Switch Providers and Test Again

1. Go to Replit Secrets
2. Change `EMAIL_PROVIDER` from `mailgun` to `sendgrid`
3. Wait for app to restart (or restart manually)
4. Call the test endpoint again
5. Response should show `"provider": "sendgrid"`
6. Check your email - should arrive from SendGrid

---

## API Compatibility

The abstraction layer is **100% backward compatible** with your existing code.

### Your Current Code (Still Works):

```typescript
await emailService.sendEmail({
  to: 'client@example.com',
  subject: 'Your Contract',
  html: '<h1>Contract</h1>',
  from: 'MusoBuddy <noreply@musobuddy.com>',
  replyTo: 'user@example.com',
  cc: ['admin@example.com'],
  bcc: ['archive@example.com'],
  attachments: [...]
});
```

### New Features Available:

```typescript
// Disable tracking for auth emails
await emailService.sendEmail({
  to: 'user@example.com',
  subject: 'Verify Your Email',
  html: '<a href="...">Verify</a>',
  disableTracking: true  // Works with both providers
});

// Check which provider is active
console.log(emailService.getProviderName()); // 'mailgun' or 'sendgrid'

// Check if configured properly
if (!emailService.isConfigured()) {
  console.error('Email provider not configured!');
}
```

---

## 30-Second Rollback Procedure

If you switch to SendGrid and encounter any issues:

### Step 1: Change Environment Variable
- Replit Secrets → `EMAIL_PROVIDER` → Change from `sendgrid` to `mailgun`

### Step 2: Restart App
- Click Stop → Run (or wait for auto-restart)

### Step 3: Verify
- Check logs: `✅ Email service using mailgun`
- Send test email
- Done!

**No code deployment needed. No Git commits needed. Just change one variable.**

---

## Monitoring Current Provider

### Add to Health Check

Update your health check endpoint to show which provider is active:

```typescript
// In server/routes/health-routes.ts or server/index.ts
app.get('/api/health', async (req, res) => {
  const { emailService } = await import('./core/email-provider-abstraction');

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    emailProvider: emailService.getProviderName(),
    emailConfigured: emailService.isConfigured(),
    // ... other health checks
  });
});
```

Now you can check which provider is active:
```bash
curl https://musobuddy.replit.app/api/health
```

### Email Logs

Both providers log with clear prefixes:

**Mailgun logs**:
```
📧 [MAILGUN] Sending email: Contract for John Doe
✅ [MAILGUN] Email sent successfully: <message-id>
```

**SendGrid logs**:
```
📧 [SENDGRID] Sending email: Contract for John Doe
✅ [SENDGRID] Email sent successfully
```

Easy to filter and monitor!

---

## Migration Timeline

### Week 1: Setup (No Risk)
- [x] Add abstraction layer file ✅ (already done)
- [ ] Update services.ts to use abstraction
- [ ] Add SendGrid environment variables
- [ ] Keep `EMAIL_PROVIDER=mailgun` (no change)
- [ ] Deploy to production
- [ ] Verify emails still work with Mailgun

### Week 2: Test SendGrid in Development
- [ ] Set up SendGrid account
- [ ] Get SendGrid API key
- [ ] Update local `.env` with `EMAIL_PROVIDER=sendgrid`
- [ ] Test all email types in development
- [ ] Verify deliverability

### Week 3: Switch Production to SendGrid
- [ ] Update production `EMAIL_PROVIDER=sendgrid`
- [ ] Restart application
- [ ] Monitor logs for 1 hour
- [ ] Send test emails (contract, invoice, password reset)
- [ ] Verify all working correctly

### Week 4: Monitor & Decide
- [ ] Monitor deliverability for 1 week
- [ ] Check for any bounces or issues
- [ ] If all good: Keep SendGrid ✅
- [ ] If issues: Rollback to Mailgun (30 seconds)

---

## Comparison: Both Providers Configured

With this abstraction layer, you can keep BOTH providers configured and switch instantly:

```bash
# In Replit Secrets, have ALL these set:
EMAIL_PROVIDER=mailgun  # ← This one controls which is used

MAILGUN_API_KEY=key_xxxxx
MAILGUN_DOMAIN=musobuddy.com

SENDGRID_API_KEY=SG.xxxxx
SENDGRID_SENDER_EMAIL=noreply@musobuddy.com
SENDGRID_SENDER_NAME=MusoBuddy
```

**Switch to SendGrid**: Change `EMAIL_PROVIDER=sendgrid`, restart
**Switch to Mailgun**: Change `EMAIL_PROVIDER=mailgun`, restart

No code changes. No redeployment. Just one variable.

---

## Feature Parity

| Feature | Mailgun | SendGrid | Abstraction Layer |
|---------|---------|----------|-------------------|
| Send HTML emails | ✅ | ✅ | ✅ Both supported |
| Send plain text | ✅ | ✅ | ✅ Both supported |
| Attachments | ✅ | ✅ | ✅ Both supported |
| CC/BCC | ✅ | ✅ | ✅ Both supported |
| Reply-To | ✅ | ✅ | ✅ Both supported |
| Disable tracking | ✅ | ✅ | ✅ Both supported |
| Bulk send | ✅ | ✅ | ✅ Both supported |
| Error handling | ✅ | ✅ | ✅ Unified format |
| Webhook signature | ✅ | ✅ | ⚠️ Need to add SendGrid webhook |

---

## Benefits of This Approach

### 1. Zero Risk
- Both providers stay configured
- Switch with one environment variable
- 30-second rollback if needed

### 2. A/B Testing
- Test deliverability with both
- Compare bounce rates
- Choose best performer

### 3. Disaster Recovery
- If one provider has outage
- Switch to backup instantly
- No downtime

### 4. No Vendor Lock-In
- Not dependent on any provider
- Leverage for pricing negotiations
- Easy to migrate in future

### 5. Future-Proof
- Can add more providers later (AWS SES, Postmark, etc.)
- Centralized email logic
- Consistent error handling

---

## Next Steps

1. **Review the abstraction layer**: Check `server/core/email-provider-abstraction.ts`
2. **Update services.ts**: Add re-export at top of file
3. **Add environment variables**: Set up SendGrid credentials
4. **Test in development**: Switch to SendGrid locally
5. **Deploy with Mailgun**: Deploy abstraction but keep using Mailgun
6. **Switch to SendGrid**: When ready, change one variable

---

## Support & Troubleshooting

### Issue: "Email provider not configured"

**Check**:
1. `EMAIL_PROVIDER` is set to `mailgun` or `sendgrid`
2. Corresponding API keys are set correctly
3. App restarted after changing variables

### Issue: Emails not sending after switch

**Check**:
1. Logs show correct provider name
2. API key is valid (test in provider dashboard)
3. Domain is verified (for SendGrid)
4. Check provider dashboard for errors

### Issue: Want to switch back

**Solution**:
1. Change `EMAIL_PROVIDER` back to previous value
2. Restart app
3. Verify in logs

---

## Summary

✅ **Single environment variable** (`EMAIL_PROVIDER`) controls everything
✅ **30-second rollback** if any issues
✅ **No code changes** needed to switch
✅ **100% backward compatible** with existing code
✅ **Both providers** can stay configured
✅ **Zero risk** migration path

**Current state**: Using Mailgun (blocklist issue)
**Safe migration**: Add SendGrid config, test, then switch
**Easy rollback**: Change one variable back
**Future-proof**: Ready to scale from 1k → 100k emails/month
