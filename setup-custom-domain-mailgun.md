# Mailgun Custom Domain Setup Guide

## Current Status
- ✅ Mailgun API integration working
- ✅ Webhook processing operational
- ✅ Email sending functionality tested
- 🔧 Need: Custom domain configuration for production

## Step 1: Add Custom Domain to Mailgun

### 1.1 Login to Mailgun Dashboard
1. Go to https://app.mailgun.com/
2. Navigate to "Sending" → "Domains"
3. Click "Add New Domain"

### 1.2 Add musobuddy.com Domain
1. Enter domain: `musobuddy.com`
2. Select region: US (or EU based on your preference)
3. Click "Add Domain"

## Step 2: DNS Configuration Required

Mailgun will provide you with DNS records to add. You'll need to add these to your Namecheap DNS settings:

### 2.1 Expected DNS Records
After adding the domain, Mailgun will show you records like:

**TXT Records (for verification):**
- Name: `musobuddy.com`
- Value: `v=spf1 include:mailgun.org ~all`

**MX Records (for receiving emails):**
- Name: `musobuddy.com`
- Value: `10 mxa.mailgun.org`
- Name: `musobuddy.com`  
- Value: `10 mxb.mailgun.org`

**CNAME Records (for tracking/authentication):**
- Name: `email.musobuddy.com`
- Value: `mailgun.org`

### 2.2 Important Note
The exact records will be shown in your Mailgun dashboard. Copy them exactly as shown.

## Step 3: Configure Email Routing

### 3.1 Set Up Route for Incoming Emails
1. Go to "Receiving" → "Routes"
2. Click "Create Route"
3. Configure:
   - **Filter Expression**: `match_recipient("leads@musobuddy.com")`
   - **Actions**: 
     - Forward to: `https://musobuddy.replit.app/api/webhook/mailgun`
     - Stop processing: Yes

## Step 4: Update Application Configuration

Once your domain is verified, I'll need to update the application to use your custom domain instead of the sandbox domain.

## Step 5: Test Bidirectional Email Flow

### 5.1 Test Outgoing Emails
- Send invoice/contract emails using custom domain
- Verify delivery and professional appearance

### 5.2 Test Incoming Emails
- Send test email to leads@musobuddy.com
- Verify webhook processing and enquiry creation

## Next Actions Needed

1. **You**: Add the custom domain in Mailgun dashboard
2. **You**: Add DNS records to Namecheap
3. **Me**: Update application configuration once domain is verified
4. **Both**: Test the complete email flow

Would you like me to walk you through adding the domain to Mailgun, or do you want to start with that step first?