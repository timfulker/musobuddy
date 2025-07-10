# Mailgun Setup Guide for MusoBuddy

## Why Mailgun?
- More reliable than SendGrid for email forwarding
- Simpler setup process with "Routes" system
- Better webhook delivery consistency
- No issues with Replit hosting compatibility

## Setup Steps

### 1. Create Mailgun Account
1. Go to [mailgun.com](https://www.mailgun.com/)
2. Sign up for a free account
3. Verify your email address
4. Add your domain: `musobuddy.com`

### 2. Domain Configuration
Add these DNS records to your Namecheap account:

**MX Record:**
- Type: MX
- Host: @
- Value: `mxa.mailgun.org` (priority 10)
- Value: `mxb.mailgun.org` (priority 10)

**TXT Record (SPF):**
- Type: TXT
- Host: @
- Value: `v=spf1 include:mailgun.org ~all`

**CNAME Records:**
- Type: CNAME
- Host: `email.musobuddy.com`
- Value: `mailgun.org`

**TXT Record (DKIM):**
- Type: TXT
- Host: `k1._domainkey`
- Value: (Mailgun will provide this in your dashboard)

### 3. Create Mailgun Route
1. In Mailgun dashboard, go to **Receiving** → **Routes**
2. Click **Create Route**
3. Configure:
   - **Priority**: 0 (highest)
   - **Filter**: `catch_all()`
   - **Action**: `forward("https://musobuddy.replit.app/api/webhook/mailgun")`
   - **Description**: "Forward all emails to MusoBuddy webhook"

### 4. Test Configuration
Run the test script to verify everything works:
```bash
node test-mailgun-webhook.js
```

### 5. Update Email Address
Once DNS propagates (24-48 hours), emails sent to `leads@musobuddy.com` will be forwarded to your webhook and automatically create enquiries.

## Webhook Details
- **Endpoint**: `https://musobuddy.replit.app/api/webhook/mailgun`
- **Method**: POST
- **Response**: Always returns 200 OK immediately
- **Processing**: Parses email and creates enquiry in database

## Mailgun vs SendGrid Comparison

| Feature | Mailgun | SendGrid |
|---------|---------|----------|
| Setup Complexity | Simple Routes | Complex Inbound Parse |
| DNS Records | 4 records | 6 records |
| Webhook Reliability | Excellent | Issues with Replit |
| Documentation | Clear | Confusing |
| Free Tier | 5,000 emails/month | 100 emails/day |

## Benefits of Mailgun
- **Reliable Delivery**: No routing issues like SendGrid
- **Simple Configuration**: Routes are intuitive
- **Better Debugging**: Clear logs and error messages
- **Flexible Actions**: Can forward, store, and webhook simultaneously

## Next Steps
1. Set up Mailgun account
2. Configure DNS records
3. Create the route
4. Test with a real email
5. Monitor enquiries being created automatically

The system is ready to switch from SendGrid to Mailgun whenever you're ready to make the change.