# Mailgun Route Setup - Step by Step

## Where to Create the Route

1. **Log into Mailgun Dashboard**
   - Go to mailgun.com
   - Sign in to your account

2. **Navigate to Routes**
   - In the left sidebar, click **"Receiving"**
   - Click **"Routes"** (under the Receiving section)

3. **Create New Route**
   - Click the **"Create Route"** button (usually blue button on the right)

4. **Fill in Route Details**
   ```
   Priority: 0
   Filter Expression: catch_all()
   Actions: forward("https://musobuddy.replit.app/api/webhook/mailgun")
   Description: Forward all emails to MusoBuddy webhook
   ```

5. **Save Route**
   - Click **"Create Route"** to save

## Visual Guide

The page structure looks like this:
```
Mailgun Dashboard
├── Sending
├── Receiving
│   ├── Routes          ← Click here
│   ├── Suppressions
│   └── Webhooks
├── Analytics
└── Settings
```

## What Each Field Means

- **Priority**: 0 = highest priority (processed first)
- **Filter**: `catch_all()` = captures all emails to your domain
- **Action**: `forward("URL")` = sends POST request to your webhook
- **Description**: Human-readable note for your reference

## After Creating Route

The route will show up in your Routes list and will be active immediately. Once DNS propagates, emails to leads@musobuddy.com will trigger this route.