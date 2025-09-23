# MusoBuddy Mailgun Development Setup

This guide helps you test Mailgun webhooks locally during development without affecting production.

## Quick Start Guide

### 1. Install ngrok
```bash
npm install -g ngrok
# OR download from https://ngrok.com/download
```

### 2. Start your development workflow
Your MusoBuddy server should be running on port 5000 (already done)

### 3. Expose your local server
```bash
# In a new terminal window
ngrok http 5000
```

You'll see output like:
```
Session Status                online
Account                       your-account (Plan: Free)
Version                       3.3.4
Region                        United States (us)
Latency                       -
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123.ngrok.io -> http://localhost:5000
```

### 4. Switch Mailgun routes to development
```bash
# Use the HTTPS forwarding URL from ngrok
cd scripts
node mailgun-dev-setup.js dev https://abc123.ngrok.io
```

### 5. Test your webhooks
- Send test emails to your configured addresses
- Check your development server logs
- Use ngrok's web interface at `http://127.0.0.1:4040` to inspect webhook requests

### 6. Switch back to production when done
```bash
node mailgun-dev-setup.js prod
```

## Available Commands

```bash
# List all current Mailgun routes
node mailgun-dev-setup.js list

# Switch to development (replace with your ngrok URL)
node mailgun-dev-setup.js dev https://abc123.ngrok.io

# Switch back to production
node mailgun-dev-setup.js prod
```

## Development Workflow

1. **Start development server** (done automatically)
2. **Start ngrok tunnel**: `ngrok http 5000`
3. **Switch routes to dev**: `node mailgun-dev-setup.js dev <ngrok-url>`
4. **Test your email features**
5. **Monitor in ngrok interface**: `http://127.0.0.1:4040`
6. **Switch back to production**: `node mailgun-dev-setup.js prod`

## Debugging Tips

### Check ngrok requests
- Visit `http://127.0.0.1:4040` to see all incoming webhook requests
- Replay requests for testing error scenarios
- Check request/response details

### Monitor your server logs
Your MusoBuddy server will show webhook processing in the console

### Verify webhook endpoint
Test your webhook endpoint directly:
```bash
curl -X POST https://abc123.ngrok.io/api/webhook/mailgun \
  -d "test=webhook"
```

## Security Notes

- **ngrok URLs are public** - anyone with the URL can access your local server
- **Use only for development** - never use ngrok URLs in production
- **Close ngrok when not testing** - stop the tunnel when you're done
- **Temporary routes** - the script marks dev routes with `[DEV]` prefix

## Troubleshooting

### "MAILGUN_API_KEY not found"
Make sure your Mailgun API key is set in your environment variables.

### "ngrok command not found"
Install ngrok globally: `npm install -g ngrok`

### Routes not updating
Check your Mailgun API key permissions and that you're using the correct domain.

### Webhooks not received
- Verify ngrok is running and showing the correct forwarding URL
- Check the ngrok web interface for incoming requests
- Ensure your development server is running on port 5000