# Mailgun Route Setup Guide

## Step 1: Access Routes in Mailgun Dashboard

1. **Login to Mailgun Dashboard**: https://app.mailgun.com/
2. **Navigate to Routes**: 
   - Click on "Sending" in the left sidebar
   - Click on "Routes" in the dropdown menu
   - Or go directly to: https://app.mailgun.com/app/sending/routes

## Step 2: Create New Route

1. **Click "Create Route"** button
2. **Fill in Route Details**:

   **Expression Type**: `Match Recipient`
   **Expression**: `leads@musobuddy.com`
   
   **Priority**: `0` (highest priority)
   
   **Actions**: Select `Forward` and enter:
   ```
   https://musobuddy.replit.app/api/webhook/mailgun
   ```

3. **Route Configuration Summary**:
   ```
   Priority: 0
   Expression: match_recipient("leads@musobuddy.com")
   Actions: forward("https://musobuddy.replit.app/api/webhook/mailgun")
   ```

## Step 3: Save and Activate

1. **Click "Create Route"** to save
2. **Verify Route is Active** - it should appear in your routes list
3. **Route should show as "Active"** status

## Step 4: Test Route (After DNS Propagation)

Once your MX records propagate, you can test by:
1. Sending email to `leads@musobuddy.com`
2. Check your MusoBuddy enquiries page for new entries
3. Monitor webhook logs for processing confirmation

## Important Notes

- **DNS Propagation Required**: MX records must be globally propagated before email forwarding works
- **Route Priority**: Priority 0 ensures this route takes precedence over others
- **Webhook Ready**: Your webhook endpoint is confirmed working via direct testing
- **No Dashboard Test**: The Mailgun dashboard "Send Sample POST" test is unreliable - ignore it

## Current Status

✅ **Webhook endpoint working** (confirmed via external testing)
✅ **Route configuration ready** (instructions above)
⏳ **DNS propagation pending** (MX records not globally resolved yet)

## Next Steps

1. Create the route using steps above
2. Wait for DNS propagation (15 minutes to 24 hours)
3. Test with real email to leads@musobuddy.com
4. Monitor enquiries page for new entries