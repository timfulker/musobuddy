# CRITICAL EMAIL WEBHOOK SYSTEM - BACKUP DOCUMENTATION
## Created: August 15, 2025

## PROBLEM SUMMARY
Email signature images (354KB PNG files) from `timfulkermusic@gmail.com` and `tim@saxweddings.com` trigger multipart/form-data encoding that breaks webhook processing. This causes 400 Bad Request errors and prevents booking creation.

## ROOT CAUSE
- Email clients generate signature images with names like "D2BE90F87486485EACF5C2F08EA20FCE.png"
- These attachments force Mailgun to send storage webhooks instead of direct email content
- Original webhook handler only parsed JSON/URL-encoded data, not multipart/form-data
- Storage webhook handling requires authenticated API calls to Mailgun storage URLs

## WORKING SOLUTION COMPONENTS

### 1. Enhanced Webhook Handler (server/index.ts)
```typescript
import multer from 'multer';
const upload = multer();

app.post('/api/webhook/mailgun', upload.any(), async (req, res) => {
  // Always return 200 to prevent Mailgun retry loops
  try {
    const webhookData = req.body;
    
    // Handle event webhooks (acknowledge only)
    if (webhookData.event) {
      return res.status(200).json({ status: 'ok', type: 'event' });
    }
    
    let emailData = webhookData;
    
    // Storage webhook handling for attachments
    if (!webhookData['body-plain'] && !webhookData['body-html']) {
      const storageUrl = webhookData['message-url'] || 
                       webhookData.storage?.url?.[0] || 
                       webhookData.storage?.url;
      
      if (storageUrl) {
        const response = await fetch(storageUrl, {
          headers: {
            'Authorization': `Basic ${Buffer.from(`api:${process.env.MAILGUN_API_KEY}`).toString('base64')}`
          }
        });
        
        if (response.ok) {
          emailData = await response.json();
        }
      }
    }
    
    // Process email through queue
    const { enhancedEmailQueue } = await import('./core/email-queue-enhanced');
    await enhancedEmailQueue.addEmail(emailData);
    
    res.status(200).json({ status: 'ok' });
  } catch (error) {
    // CRITICAL: Always return 200 to prevent retry loops
    res.status(200).json({ 
      status: 'error', 
      message: error.message,
      note: 'Returning 200 to prevent Mailgun retries'
    });
  }
});
```

### 2. Required Dependencies
- `multer` for multipart/form-data parsing
- Mailgun API key in environment variables
- Storage webhook handling logic

### 3. Logging System (server/index.ts)
```typescript
const webhookLogs: Array<{timestamp: string, message: string, data?: string}> = [];

function logWebhookActivity(message: string, data?: any) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    message,
    ...(data && { data: JSON.stringify(data) })
  };
  
  webhookLogs.unshift(logEntry);
  if (webhookLogs.length > 50) webhookLogs.pop();
  
  console.log(`📧 WEBHOOK: ${message}`, data || '');
}

app.get('/api/webhook/logs', (req, res) => {
  res.json({
    logs: webhookLogs.slice(0, 20),
    total: webhookLogs.length
  });
});
```

## AFFECTED EMAIL ACCOUNTS
- `timfulkermusic@gmail.com` - Has image signature
- `tim@saxweddings.com` - Has image signature
- Other accounts without image signatures work fine

## TESTING PROCEDURE
1. Send email from account with image signature to booking address
2. Check Mailgun logs - should show "Delivered" not "400 Bad Request"
3. Check `/api/webhook/logs` - should show proper processing steps
4. Verify booking appears in dashboard

## CRITICAL SUCCESS INDICATORS
- Mailgun webhook logs show "Delivered" status
- No 400 Bad Request errors
- Storage webhook detection and processing
- Email queue processing completion
- Booking creation in database

## PREVENTION MEASURES
1. Never remove multer middleware from webhook endpoint
2. Always handle both direct email and storage webhook formats
3. Maintain 200 status responses to prevent retry loops
4. Keep logging system for debugging
5. Preserve MAILGUN_API_KEY environment variable

## DEPLOYMENT REQUIREMENTS
External integrations require production deployment to function. Development webhook endpoints cannot receive external webhook calls.

## FILES TO BACKUP IF ISSUE RECURS
- server/index.ts (webhook handler)
- server/core/email-queue-enhanced.ts (processing logic)
- server/ai/booking-message-parser.ts (parsing logic)
- package.json (dependencies)
- .env (API keys)

## EMERGENCY RESTORATION COMMAND
```bash
git checkout [working-commit-hash] server/index.ts
npm install multer
npm run build
# Deploy immediately
```