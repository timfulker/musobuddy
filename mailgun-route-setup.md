# Mailgun Route Setup Instructions

## Step 1: Create New Route

1. **Go to Mailgun Dashboard**
   - Login to your Mailgun account
   - Navigate to **Receiving** → **Routes**

2. **Click "Create Route"**

## Step 2: Configure Route Settings

Fill in these exact values:

### Expression
```
catch_all()
```

### Priority
```
0
```

### Action
```
forward("https://musobuddy.replit.app/api/webhook/mailgun")
```

### Description (optional)
```
MusoBuddy Email Forwarding
```

## Step 3: Save Route

1. Click **"Create Route"**
2. The route should now appear in your routes list
3. Status should show as **Active**

## Step 4: Test the Setup

Once created, send a test email to:
- `leads@musobuddy.com` 
- `leads@mg.musobuddy.com` (both should work)

## What This Does

- **catch_all()**: Captures ALL emails sent to your domain
- **Priority 0**: Highest priority route
- **forward()**: Sends email data to your webhook
- **Webhook**: Processes email and creates enquiry automatically

## Expected Result

After setup, emails sent to `leads@musobuddy.com` will:
1. Reach Mailgun servers
2. Match the catch_all() expression
3. Forward to your webhook
4. Create new enquiry in MusoBuddy
5. Show processing logs in your Replit console

## Verification

Send test email from `timfulkermusic@gmail.com` and check:
- Replit console logs should show webhook activity
- New enquiry should appear in MusoBuddy dashboard
- Enquiry should contain extracted client information