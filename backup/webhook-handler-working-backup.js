// WORKING WEBHOOK HANDLER BACKUP - Aug 15, 2025
// This version successfully handles signature image attachments
// DO NOT MODIFY - Use for emergency restoration

import multer from 'multer';

// Configure multer for handling multipart/form-data from Mailgun webhooks
const upload = multer();

// Webhook activity logging system
const webhookLogs = [];

function logWebhookActivity(message, data) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    message,
    ...(data && { data: JSON.stringify(data) })
  };
  
  webhookLogs.unshift(logEntry);
  if (webhookLogs.length > 50) webhookLogs.pop();
  
  console.log(`📧 WEBHOOK: ${message}`, data || '');
}

// Webhook logs endpoint
app.get('/api/webhook/logs', (req, res) => {
  res.json({
    logs: webhookLogs.slice(0, 20),
    total: webhookLogs.length
  });
});

// CRITICAL: Enhanced Mailgun webhook handler with multipart support
app.post('/api/webhook/mailgun', upload.any(), async (req, res) => {
  logWebhookActivity('Received Mailgun webhook', { keys: Object.keys(req.body || {}) });
  
  try {
    const webhookData = req.body;
    
    // Log what type of webhook this is
    if (webhookData['body-plain'] || webhookData['body-html'] || webhookData['stripped-text']) {
      logWebhookActivity('Direct email content detected');
    } else if (webhookData['message-url']) {
      logWebhookActivity('Storage webhook detected (message-url)');
    } else if (webhookData.storage?.url) {
      logWebhookActivity('Storage webhook detected (storage.url)');
    } else {
      logWebhookActivity('Unknown format', { availableKeys: Object.keys(webhookData) });
    }
    
    // Check if this is an event webhook (not an email)
    if (webhookData.event) {
      logWebhookActivity('Event webhook received', { event: webhookData.event });
      // Event webhooks should just be acknowledged
      return res.status(200).json({ status: 'ok', type: 'event' });
    }
    
    // Try to process as email
    let emailData = webhookData;
    
    // If it's a storage webhook, fetch the content
    if (!webhookData['body-plain'] && !webhookData['body-html']) {
      const storageUrl = webhookData['message-url'] || 
                       webhookData.storage?.url?.[0] || 
                       webhookData.storage?.url;
      
      if (storageUrl) {
        logWebhookActivity('Fetching from storage URL', { url: storageUrl.substring(0, 50) });
        
        try {
          const response = await fetch(storageUrl, {
            headers: {
              'Authorization': `Basic ${Buffer.from(`api:${process.env.MAILGUN_API_KEY}`).toString('base64')}`
            }
          });
          
          logWebhookActivity('Storage fetch response', { status: response.status });
          
          if (!response.ok) {
            const errorText = await response.text();
            logWebhookActivity('Storage fetch failed', { status: response.status, error: errorText.substring(0, 100) });
            throw new Error(`Storage fetch failed: ${response.status}`);
          }
          
          emailData = await response.json();
          logWebhookActivity('Fetched email data successfully', { keys: Object.keys(emailData).slice(0, 10) });
        } catch (fetchError) {
          logWebhookActivity('Storage fetch error', { error: fetchError instanceof Error ? fetchError.message : String(fetchError) });
          throw fetchError;
        }
      }
    }
    
    // Process the email
    const { enhancedEmailQueue } = await import('./core/email-queue-enhanced');
    await enhancedEmailQueue.addEmail(emailData);
    
    logWebhookActivity('Email added to queue successfully');
    res.status(200).json({ status: 'ok' });
    
  } catch (error) {
    console.error('📧 WEBHOOK: Error processing webhook:', error);
    console.error('📧 WEBHOOK: Error stack:', error.stack);
    
    // Return 200 anyway to prevent Mailgun retries that could duplicate emails
    res.status(200).json({ 
      status: 'error', 
      message: error.message,
      note: 'Returning 200 to prevent Mailgun retries'
    });
  }
});