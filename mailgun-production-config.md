# Mailgun Production Configuration

## Environment Variables to Update

Once your custom domain is verified in Mailgun, you'll need to update these environment variables:

### Required Variables
```bash
MAILGUN_API_KEY=your_api_key_here
MAILGUN_DOMAIN=mg.musobuddy.com
MAILGUN_WEBHOOK_SIGNING_KEY=your_webhook_signing_key_here
```

### How to Get These Values

1. **MAILGUN_API_KEY**: Already set (from your Mailgun account settings)
2. **MAILGUN_DOMAIN**: Change from sandbox to `musobuddy.com`
3. **MAILGUN_WEBHOOK_SIGNING_KEY**: Get from Mailgun → Sending → Webhooks

## Route Configuration Required

After domain verification, you'll need to create a route in Mailgun:

1. Go to **Receiving** → **Routes**
2. Click **Create Route**
3. Configure:
   - **Priority**: 1
   - **Filter Expression**: `match_recipient("leads@musobuddy.com")`
   - **Actions**: 
     - Forward to: `https://musobuddy.replit.app/api/webhook/mailgun`
     - Stop processing: Yes

## DNS Records to Add

Mailgun will provide these records (examples):

### MX Records
```
Type: MX
Name: @
Value: 10 mxa.mailgun.org
TTL: 300

Type: MX  
Name: @
Value: 10 mxb.mailgun.org
TTL: 300
```

### TXT Records
```
Type: TXT
Name: @
Value: v=spf1 include:mailgun.org ~all
TTL: 300

Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@musobuddy.com
TTL: 300
```

### CNAME Records
```
Type: CNAME
Name: email
Value: mailgun.org
TTL: 300
```

**Note**: Copy the exact values from your Mailgun dashboard - these are examples.

## Testing Plan

Once configured:

1. **Test Outgoing**: Send invoice/contract emails
2. **Test Incoming**: Send email to leads@musobuddy.com
3. **Verify Enquiry**: Check if enquiry is created in dashboard
4. **Check Delivery**: Verify professional email appearance

## Status Indicators

- ✅ Domain verified in Mailgun
- ✅ DNS records propagated (can take 24-48 hours)
- ✅ Route configured for incoming emails
- ✅ Application updated with new domain
- ✅ Bidirectional email flow working

Ready to proceed with domain setup?