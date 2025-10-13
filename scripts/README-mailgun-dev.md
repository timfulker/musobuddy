# MusoBuddy Mailgun Development Setup

**Parallel testing setup that keeps production emails working normally.**

## How It Works

This creates a **separate development route** that catches emails with `+dev` tags while leaving all production routes completely untouched.

- **Production**: `tim@enquiries.musobuddy.com` → Production server ✅
- **Development**: `tim+dev@enquiries.musobuddy.com` → Your local server 🧪

## Quick Start

### 1. Install ngrok
```bash
npm install -g ngrok
```

### 2. Start ngrok tunnel
```bash
ngrok http 5000
```
Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

### 3. Create development route
```bash
cd scripts
node mailgun-dev-setup.js create https://abc123.ngrok.io
```

### 4. Test with tagged emails
Send emails to: `yourname+dev@enquiries.musobuddy.com`

### 5. Monitor your testing
- Check ngrok interface: `http://127.0.0.1:4040`
- Watch your server logs for webhook processing
- Production emails continue working normally

### 6. Clean up when done
```bash
node mailgun-dev-setup.js remove
```

## Available Commands

```bash
# Check current setup
node mailgun-dev-setup.js status

# Create development route
node mailgun-dev-setup.js create https://abc123.ngrok.io

# List all routes (dev and production)
node mailgun-dev-setup.js list

# Remove development routes only
node mailgun-dev-setup.js remove
```

## Development Workflow

1. **Start your server** (already running on port 5000)
2. **Start ngrok**: `ngrok http 5000` 
3. **Create dev route**: `node mailgun-dev-setup.js create <ngrok-url>`
4. **Test with tagged emails**: `user+dev@enquiries.musobuddy.com`
5. **Monitor in ngrok**: `http://127.0.0.1:4040`
6. **Clean up**: `node mailgun-dev-setup.js remove`

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

## Safety Features

- ✅ **Production protected** - existing routes never modified
- ✅ **High priority** - dev route catches tagged emails first  
- ✅ **Stop processing** - prevents duplicate delivery
- ✅ **Easy cleanup** - remove dev routes anytime
- ✅ **Clear labeling** - dev routes marked with `[DEV-PARALLEL]`

## Troubleshooting

### No emails received in development
- Check ngrok is running: `ngrok http 5000`
- Verify route exists: `node mailgun-dev-setup.js status`
- Check ngrok interface: `http://127.0.0.1:4040`

### Production emails stopped working
This shouldn't happen! Production routes are never touched. If issues occur:
- Check route list: `node mailgun-dev-setup.js list`
- Verify production routes are still active
- Contact support if needed

### Tagged emails not working
- Ensure you're using `+dev` (not `-dev` or `_dev`)
- Check the exact email format: `user+dev@enquiries.musobuddy.com`
- Verify dev route expression in route list