# Mailgun Single Route Setup (Free Plan)

## Current Limitation
- Free plan allows only 1 route
- Need to modify existing route or replace it

## Option 1: Modify Existing Route

If you have an existing route, **edit it** to:
- **Priority**: `0`
- **Expression**: `catch_all()` (catches all emails to your domain)
- **Actions**: `forward("https://musobuddy.replit.app/api/webhook/mailgun")`

This will forward ALL emails to your domain to the webhook.

## Option 2: Replace with Specific Route

If you want only leads@ emails:
- **Priority**: `0`
- **Expression**: `match_recipient("leads@musobuddy.com")`
- **Actions**: `forward("https://musobuddy.replit.app/api/webhook/mailgun")`

## Option 3: Multi-Action Route

You can have ONE route with MULTIPLE actions:
- **Expression**: `catch_all()`
- **Actions**: 
  - `forward("https://musobuddy.replit.app/api/webhook/mailgun")`
  - `store()`  (if you want to keep copies in Mailgun)

## Current Route Check

What does your current route look like? We can modify it to work with your webhook while keeping any existing functionality you need.

## DNS Status

Before any email forwarding works, we still need MX records to propagate. Let me check current status...