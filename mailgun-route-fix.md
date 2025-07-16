# Mailgun Email Forwarding Route Fix

## Issue Identified
The webhook system is working perfectly - test emails create enquiries successfully. However, real emails sent to leads@musobuddy.com are not reaching the webhook, indicating the Mailgun route is not configured correctly.

## Current Status
✅ **Webhook Working**: `https://musobuddy.replit.app/api/webhook/mailgun` responds correctly
✅ **AI Parsing Working**: Successfully extracted event date, venue, client info, phone, budget
✅ **Database Working**: Test enquiry #3061 created successfully
✅ **OpenAI API Key**: Configured and working

❌ **Mailgun Route**: Not pointing to correct webhook URL

## Required Fix
Update the Mailgun route to point to the current production webhook URL.

### Step 1: Access Mailgun Control Panel
1. Log into Mailgun dashboard
2. Navigate to "Receiving" → "Routes"
3. Find the route for leads@musobuddy.com

### Step 2: Update Route Configuration
**Current Issue**: Route likely points to old webhook URL
**Required URL**: `https://musobuddy.replit.app/api/webhook/mailgun`

**Route Settings Should Be:**
- **Expression**: `catch_all()` or `match_recipient("leads@musobuddy.com")`
- **Action**: `forward("https://musobuddy.replit.app/api/webhook/mailgun")`
- **Priority**: 0 (highest)
- **Description**: "Forward enquiries to MusoBuddy webhook"

### Step 3: Test Configuration
After updating the route, send a test email to leads@musobuddy.com to verify it creates an enquiry in the system.

## Alternative: Create New Route
If updating doesn't work, delete the old route and create a new one:

1. **Delete** existing leads@musobuddy.com route
2. **Create** new route with:
   - Expression: `catch_all()`
   - Action: `forward("https://musobuddy.replit.app/api/webhook/mailgun")`
   - Priority: 0

## Verification
Once fixed, real emails to leads@musobuddy.com should:
1. Appear in webhook logs with client details
2. Create enquiries with AI-parsed information
3. Show up in the bookings dashboard immediately

## Technical Details
- **Webhook Endpoint**: `/api/webhook/mailgun` (POST)
- **Expected Format**: application/x-www-form-urlencoded
- **Fields Processed**: From, Subject, body-plain, stripped-text
- **AI Parsing**: Event date, venue, client phone, budget extraction
- **Response**: JSON with success status and enquiry ID

The system is production-ready - only the Mailgun route needs to point to the correct webhook URL.