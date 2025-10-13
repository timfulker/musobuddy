# Setup Mailgun SMTP for Supabase Auth Emails

## Problem
Supabase's built-in email service has 5+ minute delays for password reset emails. This creates a poor user experience.

## Solution
Configure Supabase to use your existing Mailgun account for instant email delivery.

---

## Step 1: Get Mailgun SMTP Credentials

### Option A: Mailgun Dashboard
1. Log in to [Mailgun Dashboard](https://app.mailgun.com/)
2. Go to **Sending** > **Domain Settings**
3. Select your domain (e.g., `musobuddy.com`)
4. Click **SMTP Credentials**
5. Note down:
   - **SMTP Hostname**: `smtp.mailgun.org` (or `smtp.eu.mailgun.org` for EU)
   - **Port**: `587` (recommended) or `465`
   - **Username**: Usually `postmaster@your-domain.com`
   - **Password**: Your SMTP password (create one if needed)

### Option B: Create New SMTP Credentials
If you don't have SMTP credentials:

1. In Mailgun Dashboard → **Sending** > **Domain Settings** > **SMTP Credentials**
2. Click **Add New SMTP Credential**
3. Create username: `noreply@musobuddy.com` (or similar)
4. Set a strong password
5. Save credentials securely

---

## Step 2: Configure Supabase SMTP Settings

### For Production Database:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your **PRODUCTION** project
3. Navigate to: **Project Settings** > **Authentication** > **SMTP Settings**
4. Click **Enable Custom SMTP**
5. Enter the following:

```
SMTP Settings:
├─ Host: smtp.mailgun.org
├─ Port: 587
├─ Username: postmaster@musobuddy.com (or your SMTP username)
├─ Password: [Your Mailgun SMTP Password]
├─ Sender email: noreply@musobuddy.com
└─ Sender name: MusoBuddy
```

6. Click **Save**

### For Development Database (Optional):

Repeat the same process for your development Supabase project if you want faster emails in dev.

---

## Step 3: Test the Configuration

### Test Password Reset Email:

1. Go to your production site: `https://www.musobuddy.com/auth/forgot-password`
2. Enter: `timfulkermusic@gmail.com`
3. Click **Send reset link**
4. Check email inbox

**Expected Result**: Email should arrive within **seconds** (not minutes!)

### Check Email Content:

The email should now come from:
- **From**: `noreply@musobuddy.com` (instead of Supabase default)
- **Subject**: "Reset Your Password" (or similar)
- **Body**: Contains reset link with proper branding

---

## Step 4: Customize Email Templates (Optional)

After SMTP is working, you can customize the email templates:

1. Supabase Dashboard → **Authentication** > **Email Templates**
2. Edit templates for:
   - **Reset Password** (the one you just tested)
   - **Confirm Signup** (for new user verification)
   - **Magic Link** (if you use magic link login)
   - **Email Change** (when users change their email)

### Email Template Variables:

Available variables to use in templates:
- `{{ .ConfirmationURL }}` - The reset/confirmation link
- `{{ .Token }}` - The token (if you need it separately)
- `{{ .Email }}` - The user's email address
- `{{ .SiteURL }}` - Your site URL

### Example Custom Reset Password Template:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">MusoBuddy</h1>
  </div>

  <div style="background: #ffffff; padding: 40px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="color: #333; margin-top: 0;">Reset Your Password</h2>

    <p>Hi there,</p>

    <p>You requested to reset your password for your MusoBuddy account ({{ .Email }}).</p>

    <p style="margin: 30px 0;">
      <a href="{{ .ConfirmationURL }}"
         style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
        Reset Password
      </a>
    </p>

    <p>Or copy and paste this link into your browser:</p>
    <p style="word-break: break-all; color: #667eea; font-size: 12px;">{{ .ConfirmationURL }}</p>

    <p style="margin-top: 30px; padding-top: 30px; border-top: 1px solid #e0e0e0; color: #666; font-size: 14px;">
      If you didn't request this password reset, you can safely ignore this email. Your password will not be changed.
    </p>

    <p style="color: #666; font-size: 14px;">
      This link will expire in 1 hour for security reasons.
    </p>
  </div>

  <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
    <p>© 2025 MusoBuddy. All rights reserved.</p>
    <p>
      <a href="https://www.musobuddy.com" style="color: #667eea; text-decoration: none;">Visit Website</a> •
      <a href="https://www.musobuddy.com/support" style="color: #667eea; text-decoration: none;">Get Support</a>
    </p>
  </div>
</body>
</html>
```

---

## Step 5: Verify Delivery & Monitoring

### Check Mailgun Logs:

1. Go to Mailgun Dashboard → **Sending** > **Logs**
2. Filter by domain: `musobuddy.com`
3. Look for password reset emails
4. Check status: **Delivered**, **Opened**, **Clicked**

### Expected Metrics:

- **Delivery Time**: < 5 seconds
- **Delivery Rate**: 99%+
- **Open Rate**: Varies (depends on user)

### Troubleshooting:

If emails still don't arrive:

1. **Check Mailgun Logs** for delivery failures
2. **Check SMTP credentials** are correct in Supabase
3. **Verify domain** is verified in Mailgun
4. **Check spam folder** (first few emails might go to spam)
5. **Test with different email provider** (Gmail, Outlook, etc.)

---

## Benefits of Custom SMTP

✅ **Instant delivery** (seconds instead of 5+ minutes)
✅ **Branded emails** from your own domain
✅ **Better deliverability** (less likely to be marked as spam)
✅ **Email analytics** (open rates, click rates in Mailgun)
✅ **Professional appearance** (builds trust)
✅ **Full control** over email templates and content

---

## Security Notes

### SMTP Password Security:
- Use a **strong, unique password** for SMTP
- **Never commit** SMTP credentials to Git
- Store in Supabase dashboard only (they encrypt it)
- Rotate password periodically (every 6-12 months)

### Rate Limiting:
- Mailgun has rate limits (check your plan)
- Default: 100 emails/hour for free tier
- Paid plans: much higher limits
- Password reset emails count towards this limit

### Domain Reputation:
- Don't send spam from your domain
- Monitor bounce rates (keep < 5%)
- Keep complaint rates low (< 0.1%)
- This affects all emails from your domain

---

## Testing Checklist

After setup, test these scenarios:

- [ ] Password reset email arrives within 10 seconds
- [ ] Email comes from `noreply@musobuddy.com`
- [ ] Reset link works and redirects correctly
- [ ] Email looks professional (if using custom template)
- [ ] Email doesn't go to spam folder
- [ ] Links in email work (not rewritten by spam filters)
- [ ] Test with different email providers (Gmail, Outlook, Yahoo)
- [ ] Check Mailgun logs show successful delivery

---

## Rollback Plan

If something goes wrong:

1. Supabase Dashboard → **Project Settings** > **Authentication** > **SMTP Settings**
2. Click **Disable Custom SMTP**
3. Emails will revert to Supabase's default service
4. Fix the issue, then re-enable

---

## Next Steps

After password reset emails are working:

1. ✅ Set up SMTP for production (this guide)
2. ⏭️ Customize email templates for branding
3. ⏭️ Set up SMTP for development (optional)
4. ⏭️ Configure other auth email types (signup confirmation, magic links)
5. ⏭️ Monitor email delivery in Mailgun dashboard

---

## Support

If you encounter issues:

1. **Supabase Discord**: https://discord.supabase.com
2. **Mailgun Support**: https://help.mailgun.com
3. **Check Supabase Docs**: https://supabase.com/docs/guides/auth/auth-smtp

---

## Summary

You're replacing Supabase's slow default email service with your existing Mailgun account. This gives you:
- **Fast delivery** (instant vs 5 minutes)
- **Professional branding** (your domain)
- **Better control** (custom templates, analytics)

The setup takes about 5 minutes and dramatically improves user experience. 🚀
