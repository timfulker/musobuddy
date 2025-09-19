# Mailgun Click Tracking Fix for Email Verification

## Problem
Mailgun's click tracking feature rewrites all URLs in emails, including Supabase email verification links. This corrupts the authentication tokens and breaks the email verification flow.

## Solution

### Option 1: Domain-Wide Configuration (Recommended)
The most reliable solution is to disable click tracking domain-wide in Mailgun:

1. **Login to Mailgun Dashboard**
   - Go to https://app.mailgun.com/
   - Navigate to your domain (enquiries.musobuddy.com)

2. **Disable Click Tracking**
   - Go to Domain Settings → Tracking
   - Turn OFF "Click Tracking" 
   - Turn OFF "Open Tracking" (optional but recommended for auth emails)
   - Save settings

3. **Verify Configuration**
   - Send a test email with a link
   - Verify that URLs are not rewritten with tracking parameters

### Option 2: Per-Email Configuration (Alternative)
If you need click tracking for other emails but want to disable it for auth emails:

1. **Use Mailgun API** (instead of SMTP) for auth emails
2. **Add tracking headers** to disable per email:
   ```
   o:tracking = no
   o:tracking-clicks = no
   o:tracking-opens = no
   ```

### Option 3: Custom Auth Email Service (Implemented)
I've created a custom `MailgunAuthService` that:
- Sends emails via Mailgun API with tracking disabled
- Specifically handles authentication emails
- Prevents URL rewriting for verification links

## Implementation Status

✅ **Completed:**
- Updated `signUpWithEmail` to use proper `emailRedirectTo` parameter
- Updated `resendVerificationEmail` to use proper `emailRedirectTo` parameter  
- Enhanced email verification page to handle URL tokens
- Created `MailgunAuthService` for auth emails with tracking disabled

🔄 **Next Steps:**
1. Configure Mailgun domain settings to disable click tracking (Option 1)
2. OR integrate the custom auth email service (Option 3)
3. Test email verification flow

## Configuration Files Updated
- `client/src/hooks/useAuth.tsx` - Added emailRedirectTo parameters
- `client/src/pages/auth/email-verification.tsx` - Enhanced token handling
- `server/core/mailgun-auth-service.ts` - New auth email service

## Testing
Use the test endpoint to verify click tracking is disabled:
```bash
curl -X POST /api/test-auth-email \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "testUrl": "https://example.com/verify"}'
```

## Important Notes
- Supabase uses SMTP to send emails, so domain-wide configuration is most effective
- The custom service requires switching from SMTP to API for auth emails
- Always test with actual verification emails after implementing changes