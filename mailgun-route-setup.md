# Mailgun Route Setup for leads@musobuddy.com

## Step 1: Verify Domain in Mailgun
1. Go to Mailgun dashboard → Sending → Domains
2. Click "Verify DNS Settings" on mg.musobuddy.com
3. Wait for all records to show as "Verified" (may take 15-30 minutes)

## Step 2: Create Email Route
Once domain is verified, create a route to forward emails from leads@musobuddy.com to our webhook:

1. Go to **Receiving** → **Routes**
2. Click **Create Route**
3. Configure:
   - **Priority**: 1
   - **Filter Expression**: `match_recipient("leads@musobuddy.com")`
   - **Actions**: 
     - **Forward to**: `https://musobuddy.replit.app/api/webhook/mailgun`
     - **Stop processing**: Yes

## Step 3: Update Environment Variables
Once domain is verified, update these environment variables in Replit:

```bash
MAILGUN_DOMAIN=mg.musobuddy.com
```

## Step 4: Test Email Flow
1. **Test Outgoing**: Send an invoice/contract email
2. **Test Incoming**: Send email to leads@musobuddy.com
3. **Verify**: Check if enquiry is created in dashboard

## Important Notes
- The route allows emails sent to leads@musobuddy.com to be processed by mg.musobuddy.com
- This setup enables receiving emails at the main domain while sending from the subdomain
- Both sending and receiving will work through the same Mailgun configuration

## Expected Timeline
- DNS propagation: 15-30 minutes
- Domain verification: Immediate after DNS propagation
- Route creation: Immediate
- Email testing: Immediate after route creation