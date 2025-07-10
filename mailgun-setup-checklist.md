# Mailgun Setup Checklist

## Phase 1: Account Setup
- [ ] Go to mailgun.com and create account
- [ ] Use your real business details (not "MusoBuddy")
- [ ] Verify email address
- [ ] Add domain: musobuddy.com

## Phase 2: DNS Configuration (Namecheap)
Replace the SendGrid MX record with Mailgun:

### Current MX Record (to replace):
- Type: MX
- Host: @
- Value: mx.sendgrid.net
- Priority: 10

### New MX Records (add these):
- Type: MX, Host: @, Value: `mxa.mailgun.org`, Priority: 10
- Type: MX, Host: @, Value: `mxb.mailgun.org`, Priority: 10

### Additional DNS Records:
- Type: TXT, Host: @, Value: `v=spf1 include:mailgun.org ~all`
- Type: CNAME, Host: email, Value: `mailgun.org`

**Note:** Keep all existing SendGrid CNAME records for sending emails

## Phase 3: Mailgun Route Setup
1. In Mailgun dashboard → Receiving → Routes
2. Click "Create Route"
3. Configure:
   - Priority: 0
   - Filter: `catch_all()`
   - Action: `forward("https://musobuddy.replit.app/api/webhook/mailgun")`
   - Description: "Forward all emails to MusoBuddy"

## Phase 4: Testing
- [ ] Send test email to leads@musobuddy.com
- [ ] Check webhook logs for activity
- [ ] Verify enquiry creation in dashboard
- [ ] Run test script: `node test-mailgun-webhook.js`

## Phase 5: Verification
- [ ] DNS propagation check (24-48 hours)
- [ ] Test with different email providers
- [ ] Monitor enquiry creation
- [ ] Send message to Ronan (see message-to-ronan.txt)

## Backup Plan
If Mailgun doesn't work:
- [ ] Revert MX records to SendGrid
- [ ] Continue troubleshooting with SendGrid
- [ ] Consider subdomain approach (leads.musobuddy.com)

## Success Indicators
- ✅ Emails to leads@musobuddy.com create enquiries
- ✅ Webhook responds with 200 OK
- ✅ SendGrid still works for sending emails
- ✅ No DNS conflicts or errors

The webhook endpoint `https://musobuddy.replit.app/api/webhook/mailgun` is ready and tested.