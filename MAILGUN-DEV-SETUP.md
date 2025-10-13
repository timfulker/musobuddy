# MusoBuddy Mailgun Development Setup

**Complete guide for testing email webhooks locally without affecting production**

## Overview

This setup creates a **parallel testing environment** that allows you to test email functionality during development while keeping production emails working normally.

- **Production**: `tim@enquiries.musobuddy.com` → Production server ✅
- **Development**: `tim+dev@enquiries.musobuddy.com` → Your local server 🧪

## Prerequisites

- MusoBuddy server running on port 5000 (already configured)
- Mailgun API key in environment variables
- ngrok account (free tier works fine)

## Initial Setup

### 1. Install ngrok
```bash
npm install -g ngrok
```

### 2. Create ngrok account and get authtoken
1. **Sign up**: https://dashboard.ngrok.com/signup
2. **Get authtoken**: https://dashboard.ngrok.com/get-started/your-authtoken
3. **Configure ngrok**:
   ```bash
   ngrok config add-authtoken YOUR_AUTHTOKEN_HERE
   ```

## Development Workflow

### Step 1: Start ngrok tunnel
```bash
ngrok http 5000
```
**Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)

### Step 2: Create development route
```bash
cd scripts
node mailgun-dev-setup.js create https://abc123.ngrok.io
```
*(Replace with your actual ngrok URL)*

### Step 3: Test with tagged emails
Send test emails to: **`yourname+dev@enquiries.musobuddy.com`**

Examples:
- Instead of `tim@enquiries.musobuddy.com` → use `tim+dev@enquiries.musobuddy.com`
- Instead of `sarah@enquiries.musobuddy.com` → use `sarah+dev@enquiries.musobuddy.com`

### Step 4: Monitor your testing
- **Webhook requests**: Visit `http://127.0.0.1:4040` to see all incoming requests
- **Server logs**: Watch your terminal for processing logs
- **Production verification**: Send a regular email to confirm production still works

### Step 5: Clean up when done
```bash
node mailgun-dev-setup.js remove
```

## Available Commands

```bash
# Check current setup status
node mailgun-dev-setup.js status

# Create development route
node mailgun-dev-setup.js create <ngrok-url>

# List all routes (dev and production)
node mailgun-dev-setup.js list

# Remove development routes only
node mailgun-dev-setup.js remove
```

## How It Works

### Safe Parallel System
- Creates a **separate high-priority route** for `+dev` tagged emails
- Uses `stop()` to prevent duplicate processing
- **Production routes remain completely untouched**

### Smart Email Processing
- Webhook handler automatically strips `+dev` tags for user lookup
- `tim+dev@enquiries.musobuddy.com` correctly finds user "tim"
- Also supports `+test`, `+staging`, and `dev-` prefixes

### Route Priority
1. **Development route** (priority 0): Catches `*+dev@enquiries.musobuddy.com`
2. **Production routes** (priority 1+): Handle regular emails

## Testing Examples

**Production email (unchanged):**
```
To: tim@enquiries.musobuddy.com
→ Goes to production server
→ Works exactly as before
```

**Development email:**
```
To: tim+dev@enquiries.musobuddy.com  
→ Goes to your local server via ngrok
→ Perfect for testing new features
```

## Troubleshooting

### ngrok Issues
**Error: "authentication failed"**
```bash
# Solution: Add your authtoken
ngrok config add-authtoken YOUR_AUTHTOKEN_HERE
```

**Error: "ngrok command not found"**
```bash
# Solution: Install ngrok globally
npm install -g ngrok
```

### Email Issues
**No development emails received:**
1. Check ngrok is running: `ngrok http 5000`
2. Verify development route exists: `node mailgun-dev-setup.js status`
3. Check ngrok interface: `http://127.0.0.1:4040`
4. Ensure you're using `+dev` tag correctly

**Production emails stopped working:**
- This shouldn't happen! Production routes are never modified
- Check route list: `node mailgun-dev-setup.js list`
- Verify production routes are still active

### Development Route Issues
**Route creation fails:**
- Verify `MAILGUN_API_KEY` environment variable is set
- Check Mailgun API key has proper permissions
- Ensure ngrok URL is HTTPS (not HTTP)

## Security Notes

- **ngrok URLs are public** - anyone with the URL can access your local server
- **Use only for development** - never use ngrok URLs in production
- **Close ngrok when not testing** - stop the tunnel when you're done
- **Temporary routes** - development routes are marked with `[DEV-PARALLEL]`

## Quick Reference

**Start development session:**
```bash
# Terminal 1: Start ngrok
ngrok http 5000

# Terminal 2: Create dev route
cd scripts
node mailgun-dev-setup.js create https://abc123.ngrok.io
```

**Test emails:**
- Production: `user@enquiries.musobuddy.com`
- Development: `user+dev@enquiries.musobuddy.com`

**Monitor:**
- ngrok interface: `http://127.0.0.1:4040`
- Server logs: Your terminal running the server

**Clean up:**
```bash
node mailgun-dev-setup.js remove
```

## Benefits

✅ **Zero production impact** - existing emails continue working  
✅ **Fast iteration** - test email features instantly  
✅ **Real webhook data** - see exactly what Mailgun sends  
✅ **Easy debugging** - ngrok provides request inspection  
✅ **Safe switching** - easy toggle between dev/production modes  
✅ **No code changes** - existing webhook handlers work unchanged