# Complete Mailgun Setup Guide

## Current Status
✅ Removed all SendGrid code conflicts  
✅ Created clean Mailgun sender  
✅ Updated all email routes to use Mailgun  
✅ Single webhook endpoint active  

## DNS Configuration Required

### Step 1: Remove SendGrid Records
In Namecheap, delete these records:
- MX: mx.sendgrid.net
- CNAME: s1._domainkey → SendGrid
- CNAME: s2._domainkey → SendGrid  
- Any other SendGrid CNAME records

### Step 2: Add Mailgun Records
Add these records in Namecheap:
```
Type: MX, Host: @, Value: mxa.mailgun.org, Priority: 10
Type: MX, Host: @, Value: mxb.mailgun.org, Priority: 10
Type: TXT, Host: @, Value: v=spf1 include:mailgun.org ~all
Type: CNAME, Host: email, Value: mailgun.org
```

### Step 3: Mailgun Route Setup
In your Mailgun dashboard:
1. Go to Routes
2. Create route:
   - Expression: `match_recipient("leads@musobuddy.com")`
   - Action: `forward("https://musobuddy.replit.app/api/webhook/mailgun")`

## Environment Variables Needed
```
MAILGUN_API_KEY=your_mailgun_api_key
MAILGUN_DOMAIN=musobuddy.com
```

## Test Plan
1. Update DNS records
2. Add environment variables
3. Send test email to leads@musobuddy.com
4. Verify webhook receives email and creates enquiry
5. Test invoice/contract email sending

This eliminates all service conflicts and provides a unified email solution.