import express from 'express';
import session from 'express-session';
import multer from 'multer';
import { Anthropic } from '@anthropic-ai/sdk';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fetch from 'node-fetch';
import { existsSync } from 'fs';

const app = express();

// Configure multer for handling multipart/form-data from Mailgun webhooks
const upload = multer();

// Email deduplication system to prevent duplicate processing
const processedEmails = new Set<string>();
const DEDUPLICATION_WINDOW = 30000; // 30 seconds

function createEmailSignature(webhookData: any): string {
  // Create unique signature based on sender, subject, and timestamp
  const sender = webhookData.sender || webhookData.From || '';
  const subject = webhookData.subject || webhookData.Subject || '';
  const messageId = webhookData['message-id'] || webhookData['Message-Id'] || '';
  const bodySnippet = (webhookData['body-plain'] || webhookData['body-html'] || '').substring(0, 100);
  
  return `${sender}:${subject}:${messageId}:${bodySnippet}`.replace(/\s+/g, '');
}

function isDuplicateEmail(webhookData: any): boolean {
  const signature = createEmailSignature(webhookData);
  
  if (processedEmails.has(signature)) {
    console.log('🔄 DUPLICATE EMAIL DETECTED - Skipping processing:', signature.substring(0, 50));
    return true;
  }
  
  processedEmails.add(signature);
  console.log('📧 NEW EMAIL SIGNATURE ADDED:', signature.substring(0, 50));
  
  // Clean up old signatures after deduplication window
  setTimeout(() => {
    processedEmails.delete(signature);
  }, DEDUPLICATION_WINDOW);
  
  return false;
}

// CORS middleware for R2-hosted collaborative forms
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// Basic middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Trust proxy for proper HTTPS detection in deployment
app.set('trust proxy', 1);

// Session setup with proper cookie configuration
const isProduction = process.env.NODE_ENV === 'production' || process.env.REPLIT_DEPLOYMENT;
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: isProduction, // Require HTTPS in production
    httpOnly: false, // Allow frontend access
    sameSite: isProduction ? 'none' : 'lax', // Cross-site for deployment
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  }
}));

// Health check endpoints for deployment
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/', (req, res, next) => {
  // Only return JSON for explicit health checks and monitoring tools
  // Allow all browser requests (including Replit preview) to go to Vite
  const userAgent = req.headers['user-agent'] || '';
  const accept = req.headers['accept'] || '';
  
  // Check for monitoring/health check tools
  if (userAgent.includes('GoogleHC') || 
      userAgent.includes('Pingdom') ||
      userAgent.includes('StatusCake') ||
      userAgent.includes('UptimeRobot') ||
      (userAgent.includes('curl') && !accept.includes('text/html')) ||
      (userAgent.includes('python') && accept.includes('application/json'))) {
    return res.status(200).json({ 
      status: 'MusoBuddy API', 
      mode: process.env.NODE_ENV,
      timestamp: new Date().toISOString() 
    });
  }
  
  // Let Vite handle all browser requests (including Replit preview iframe)
  return next();
});

// Initialize storage and services in async wrapper
async function initializeServer() {
  const { storage } = await import('./core/storage');
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

// Webhook activity log for monitoring
const webhookLogs: any[] = [];
const MAX_LOGS = 50;

function logWebhookActivity(message: string, data?: any) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    message,
    data: data ? JSON.stringify(data).substring(0, 200) : undefined
  };
  webhookLogs.push(logEntry);
  if (webhookLogs.length > MAX_LOGS) {
    webhookLogs.shift();
  }
  console.log('📧 WEBHOOK:', message, data ? JSON.stringify(data).substring(0, 100) : '');
}

// Reply webhook activity log for monitoring
const replyWebhookLogs: any[] = [];

function logReplyWebhookActivity(message: string, data?: any) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    message,
    data: data ? JSON.stringify(data).substring(0, 200) : undefined
  };
  replyWebhookLogs.push(logEntry);
  if (replyWebhookLogs.length > MAX_LOGS) {
    replyWebhookLogs.shift();
  }
  console.log('📨 REPLY WEBHOOK:', message, data ? JSON.stringify(data).substring(0, 100) : '');
}

// Endpoint to view webhook logs
app.get('/api/webhook/logs', (req, res) => {
  const encoreLogs = webhookLogs.filter(log => 
    log.message.toLowerCase().includes('encore') || 
    log.data?.toLowerCase()?.includes('encore')
  );
  
  res.json({
    mainWebhook: {
      logs: webhookLogs.slice(-20), // Last 20 logs
      total: webhookLogs.length
    },
    replyWebhook: {
      logs: replyWebhookLogs.slice(-20), // Last 20 logs
      total: replyWebhookLogs.length
    },
    encoreSpecific: {
      logs: encoreLogs.slice(-10), // Last 10 Encore logs
      total: encoreLogs.length
    },
    summary: {
      totalWebhooks: webhookLogs.length,
      encoreEmails: encoreLogs.length,
      lastProcessed: webhookLogs.length > 0 ? webhookLogs[webhookLogs.length - 1].timestamp : 'None'
    }
  });
});

// DEBUG: Special endpoint to test Encore email processing
app.post('/api/debug/encore-email', async (req, res) => {
  try {
    console.log('🧪 DEBUG: Testing Encore email processing simulation');
    
    const testEmailData = {
      From: req.body.from || 'Joseph <no-reply-messages@encoremusicians.com>',
      To: req.body.to || 'timfulkermusic@enquiries.musobuddy.com',
      Subject: req.body.subject || 'Test Encore Follow-up',
      'body-plain': req.body.body || 'Congratulations! You have been selected for this booking.',
      timestamp: new Date().toISOString()
    };
    
    console.log('🧪 Test email data:', testEmailData);
    
    // Simulate the same processing as the webhook
    const fromField = testEmailData.From;
    const toField = testEmailData.To;
    const subjectField = testEmailData.Subject;
    const bodyField = testEmailData['body-plain'];
    
    // Use the same enhanced detection logic as the main webhook
    const isFromEncoreService = (
      fromField.toLowerCase().includes('encore') || 
      fromField.includes('@encoremusicians.com') ||
      fromField.includes('no-reply-message@encoremusicians.com')
    );
    
    const hasJobAlertIndicators = (
      subjectField.toLowerCase().includes('job alert') ||
      bodyField.toLowerCase().includes('apply now') ||
      bodyField.toLowerCase().includes('new gig') ||
      bodyField.toLowerCase().includes('gig opportunity')
    );
    
    const hasFollowupIndicators = (
      // Direct follow-up keywords
      bodyField.toLowerCase().includes('congratulations') ||
      bodyField.toLowerCase().includes('you have been selected') ||
      bodyField.toLowerCase().includes('client has chosen') ||
      bodyField.toLowerCase().includes('booking confirmed') ||
      bodyField.toLowerCase().includes('booking update') ||
      bodyField.toLowerCase().includes('payment') ||
      bodyField.toLowerCase().includes('cancelled') ||
      bodyField.toLowerCase().includes('rescheduled') ||
      
      // Conversation patterns (like Joseph's message)
      bodyField.toLowerCase().includes('sorry to chase') ||
      bodyField.toLowerCase().includes('sent over the booking') ||
      bodyField.toLowerCase().includes('booking request') ||
      bodyField.toLowerCase().includes('check all was good') ||
      bodyField.toLowerCase().includes('confirming to play') ||
      bodyField.toLowerCase().includes('your current quote') ||
      bodyField.toLowerCase().includes('reply to this email to respond') ||
      bodyField.toLowerCase().includes('new message from')
    );
    
    const isEncoreFollowup = (
      isFromEncoreService && 
      !hasJobAlertIndicators &&
      hasFollowupIndicators
    );
    
    console.log('🧪 Classification result:', { isEncoreFollowup });
    
    res.json({
      success: true,
      testData: testEmailData,
      classification: {
        isFromEncoreService,
        hasJobAlertIndicators,
        hasFollowupIndicators,
        isEncoreFollowup: isEncoreFollowup
      },
      message: 'Debug test completed - check server logs for detailed processing'
    });
    
  } catch (error: any) {
    console.error('🧪 DEBUG ERROR:', error);
    res.status(500).json({ error: error.message });
  }
});

// Enhanced Mailgun webhook handler with multipart support
app.post('/api/webhook/mailgun', upload.any(), async (req, res) => {
  // JOSEPH DEBUG: Log ALL incoming webhook data
  const fromField = req.body.From || req.body.from || req.body.sender || '';
  const subjectField = req.body.Subject || req.body.subject || '';
  console.log(`🎯 [JOSEPH-DEBUG] WEBHOOK RECEIVED:`, {
    from: fromField,
    subject: subjectField,
    recipient: req.body.To || req.body.recipient || '',
    timestamp: new Date().toISOString(),
    hasBody: !!(req.body['body-plain'] || req.body.text),
    messageId: req.body['message-id'] || req.body['Message-Id'] || ''
  });
  const webhookId = `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  
  // ENHANCED LOGGING: Track ALL webhook attempts
  console.log(`🔍 [${webhookId}] WEBHOOK RECEIVED`);
  console.log(`🔍 [${webhookId}] Headers:`, JSON.stringify(req.headers, null, 2));
  console.log(`🔍 [${webhookId}] Body keys:`, Object.keys(req.body || {}));
  console.log(`🔍 [${webhookId}] Full body:`, JSON.stringify(req.body, null, 2).substring(0, 500));
  
  logWebhookActivity(`[${webhookId}] Received Mailgun webhook`, { 
    keys: Object.keys(req.body || {}),
    userAgent: req.headers['user-agent'],
    contentType: req.headers['content-type']
  });
  
  try {
    const webhookData = req.body;
    
    // ENHANCED: Log sender and recipient before duplicate check
    let fromField = webhookData.sender || webhookData.From || webhookData.from || 'UNKNOWN_SENDER';
    let toField = webhookData.recipient || webhookData.To || webhookData.to || 'UNKNOWN_RECIPIENT';
    let subjectField = webhookData.subject || webhookData.Subject || 'UNKNOWN_SUBJECT';
    
    console.log(`🔍 [${webhookId}] FROM: ${fromField}`);
    console.log(`🔍 [${webhookId}] TO: ${toField}`);
    console.log(`🔍 [${webhookId}] SUBJECT: ${subjectField}`);
    
    // SPECIAL: Check for Encore emails specifically
    if (fromField.toLowerCase().includes('encore')) {
      console.log(`🎵 [${webhookId}] ENCORE EMAIL DETECTED!`);
      logWebhookActivity(`[${webhookId}] ENCORE EMAIL PROCESSING`, {
        from: fromField,
        to: toField,
        subject: subjectField,
        isJobAlert: subjectField.toLowerCase().includes('job alert')
      });
    }
    
    // Check for duplicate email processing
    if (isDuplicateEmail(webhookData)) {
      console.log(`🔄 [${webhookId}] DUPLICATE DETECTED - but still logging for analysis`);
      logWebhookActivity(`[${webhookId}] DUPLICATE EMAIL`, { from: fromField, subject: subjectField });
      return res.status(200).json({ 
        status: 'duplicate', 
        message: 'Email already processed, skipping to prevent duplication',
        webhookId: webhookId
      });
    }
    
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
    
    // Check if this is a reply to a booking-specific email
    const recipient = emailData.recipient || emailData.To || '';
    // Update variables with final email data
    fromField = emailData.sender || emailData.From || fromField;
    subjectField = emailData.subject || emailData.Subject || subjectField;
    const bodyField = emailData['body-plain'] || emailData['stripped-text'] || '';
    
    // SPECIAL HANDLING: Encore follow-up emails detection
    const isFromEncoreService = (
      fromField.toLowerCase().includes('encore') || 
      fromField.includes('@encoremusicians.com') ||
      fromField.includes('no-reply-message@encoremusicians.com')
    );
    
    const hasJobAlertIndicators = (
      subjectField.toLowerCase().includes('job alert') ||
      bodyField.toLowerCase().includes('apply now') ||
      bodyField.toLowerCase().includes('new gig') ||
      bodyField.toLowerCase().includes('gig opportunity')
    );
    
    // Enhanced follow-up detection - includes conversation patterns
    const hasFollowupIndicators = (
      // Direct follow-up keywords
      bodyField.toLowerCase().includes('congratulations') ||
      bodyField.toLowerCase().includes('you have been selected') ||
      bodyField.toLowerCase().includes('client has chosen') ||
      bodyField.toLowerCase().includes('booking confirmed') ||
      bodyField.toLowerCase().includes('booking update') ||
      bodyField.toLowerCase().includes('payment') ||
      bodyField.toLowerCase().includes('cancelled') ||
      bodyField.toLowerCase().includes('rescheduled') ||
      
      // Conversation patterns (like Joseph's message)
      bodyField.toLowerCase().includes('sorry to chase') ||
      bodyField.toLowerCase().includes('sent over the booking') ||
      bodyField.toLowerCase().includes('booking request') ||
      bodyField.toLowerCase().includes('check all was good') ||
      bodyField.toLowerCase().includes('confirming to play') ||
      bodyField.toLowerCase().includes('your current quote') ||
      bodyField.toLowerCase().includes('reply to this email to respond') ||
      bodyField.toLowerCase().includes('new message from')
    );
    
    const isEncoreFollowup = (
      isFromEncoreService && 
      !hasJobAlertIndicators &&
      hasFollowupIndicators
    );
    
    logWebhookActivity('Email classification check', {
      recipient: recipient.substring(0, 50),
      isFromEncoreService,
      hasJobAlertIndicators,
      hasFollowupIndicators,
      isEncoreFollowup
    });
    
    // Handle Encore follow-up emails by converting to conversation
    if (isEncoreFollowup) {
      logWebhookActivity('ENCORE FOLLOW-UP DETECTED - searching for related booking');
      
      try {
        const { storage } = await import('./core/storage');
        
        // Extract user from recipient email prefix
        const recipientMatch = recipient.match(/([^@]+)@/);
        const emailPrefix = recipientMatch ? recipientMatch[1].toLowerCase() : '';
        
        if (emailPrefix) {
          const user = await storage.getUserByEmailPrefix(emailPrefix);
          
          if (user) {
            // Look for recent Encore bookings for this user
            const userBookings = await storage.getBookings(user.id);
            const encoreBookings = userBookings
              .filter(b => 
                b.title?.toLowerCase().includes('encore') || 
                b.originalEmailContent?.toLowerCase().includes('encore') ||
                b.venue?.toLowerCase().includes('encore')
              )
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .slice(0, 5); // Get 5 most recent Encore bookings
            
            if (encoreBookings.length > 0) {
              const targetBooking = encoreBookings[0]; // Use most recent
              logWebhookActivity('Found target Encore booking for follow-up', { 
                bookingId: targetBooking.id,
                bookingTitle: targetBooking.title
              });
              
              // Store as conversation message for the booking
              const { uploadToCloudflareR2 } = await import('./core/cloud-storage');
              
              const messageHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Encore Follow-up - ${subjectField}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 20px; }
        .message-header { background: #fff3cd; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #ffc107; }
        .message-content { background: white; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
        .metadata { color: #666; font-size: 0.9em; margin-bottom: 10px; }
        .encore-badge { background: #28a745; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8em; }
    </style>
</head>
<body>
    <div class="message-header">
        <div class="metadata">
            <strong>🎵 Encore Follow-up Message</strong> <span class="encore-badge">AUTO-LINKED</span><br>
            <strong>From:</strong> ${fromField}<br>
            <strong>Subject:</strong> ${subjectField}<br>
            <strong>Date:</strong> ${new Date().toLocaleString()}<br>
            <strong>Linked to Booking:</strong> #${targetBooking.id} - ${targetBooking.title}
        </div>
    </div>
    <div class="message-content">
        ${emailData['body-html'] || bodyField?.replace(/\n/g, '<br>') || 'No content'}
    </div>
</body>
</html>`;

              const fileName = `user${user.id}/booking${targetBooking.id}/messages/encore_followup_${Date.now()}.html`;
              const messageBuffer = Buffer.from(messageHtml, 'utf8');
              await uploadToCloudflareR2(messageBuffer, fileName, 'text/html', {
                'booking-id': String(targetBooking.id),
                'user-id': user.id,
                'message-type': 'encore-followup'
              });
              
              // Create message notification
              await storage.createMessageNotification({
                userId: user.id,
                bookingId: targetBooking.id,
                senderEmail: fromField,
                subject: `[Encore] ${subjectField}`,
                messageUrl: fileName,
                isRead: false,
                createdAt: new Date()
              });
              
              logWebhookActivity('Encore follow-up stored as conversation', { 
                fileName, 
                userId: user.id, 
                bookingId: targetBooking.id 
              });
              
              return res.status(200).json({ 
                status: 'ok', 
                type: 'encore_followup', 
                bookingId: targetBooking.id,
                message: 'Encore follow-up linked to booking conversation'
              });
            } else {
              logWebhookActivity('No Encore bookings found - treating as unparseable');
            }
          }
        }
      } catch (error: any) {
        logWebhookActivity('Error processing Encore follow-up', { error: error.message });
      }
    }
    
    const bookingIdMatch = recipient.match(/user(\d+)-booking(\d+)@/);
    
    if (bookingIdMatch) {
      const userId = bookingIdMatch[1];
      const bookingId = bookingIdMatch[2];
      
      logWebhookActivity('Booking reply detected', { userId, bookingId, recipient });
      
      // Store immediately in cloud storage as client message
      try {
        const { uploadToCloudflareR2 } = await import('./core/cloud-storage');
        
        // Create HTML content for the reply message
        const messageHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Client Reply - ${emailData.subject || 'No Subject'}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 20px; }
        .message-header { background: #e3f2fd; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .message-content { background: white; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
        .metadata { color: #666; font-size: 0.9em; margin-bottom: 10px; }
    </style>
</head>
<body>
    <div class="message-header">
        <div class="metadata">
            <strong>📨 Client Reply</strong><br>
            <strong>From:</strong> ${emailData.sender || emailData.From || 'Unknown'}<br>
            <strong>Subject:</strong> ${emailData.subject || emailData.Subject || 'No Subject'}<br>
            <strong>Date:</strong> ${new Date().toLocaleString()}<br>
            <strong>Booking ID:</strong> ${bookingId}
        </div>
    </div>
    <div class="message-content">
        ${emailData['body-html'] || emailData['stripped-html'] || emailData['body-plain']?.replace(/\n/g, '<br>') || 'No content'}
    </div>
</body>
</html>`;

        // Store as incoming message
        const fileName = `user${userId}/booking${bookingId}/messages/reply_${Date.now()}.html`;
        const messageBuffer = Buffer.from(messageHtml, 'utf8');
        await uploadToCloudflareR2(messageBuffer, fileName, 'text/html', {
          'booking-id': bookingId,
          'user-id': userId,
          'message-type': 'client-reply'
        });
        
        // Create notification entry in database
        await storage.createMessageNotification({
          userId: userId,
          bookingId: bookingId,
          senderEmail: emailData.sender || emailData.From || 'Unknown',
          subject: emailData.subject || emailData.Subject || 'No Subject',
          messageUrl: fileName,
          isRead: false,
          createdAt: new Date()
        });
        
        logWebhookActivity('Client reply stored successfully', { fileName, userId, bookingId });
        return res.status(200).json({ status: 'ok', type: 'booking_reply', bookingId, userId });
        
      } catch (error: any) {
        logWebhookActivity('Failed to store client reply', { error: error.message });
        // CRITICAL: Don't fall through - return error to prevent duplicate processing
        return res.status(200).json({ 
          status: 'error', 
          type: 'booking_reply_failed',
          message: error.message 
        });
      }
    }

    // Process as new inquiry (no booking ID detected)
    logWebhookActivity(`[${webhookId}] Processing as new inquiry - no booking ID detected`);
    
    // JOSEPH DEBUG: Log exactly what's being queued
    console.log(`🎯 [JOSEPH-DEBUG] ABOUT TO QUEUE EMAIL:`, {
      from: fromField,
      subject: subjectField,
      hasBodyPlain: !!(emailData['body-plain']),
      hasBodyHtml: !!(emailData['body-html']),
      bodyLength: (emailData['body-plain'] || '').length,
      isEncoreFollowup: isEncoreFollowup
    });
    
    const { enhancedEmailQueue } = await import('./core/email-queue-enhanced');
    
    try {
      await enhancedEmailQueue.addEmail(emailData);
      logWebhookActivity(`[${webhookId}] Email added to queue successfully`);
      
      // SPECIAL: Final check for Encore emails
      if (fromField.toLowerCase().includes('encore')) {
        console.log(`🎵 [${webhookId}] ENCORE EMAIL QUEUED SUCCESSFULLY`);
      }
      
      res.status(200).json({ 
        status: 'ok', 
        webhookId: webhookId,
        processedAs: 'new_inquiry'
      });
      
    } catch (queueError: any) {
      console.error(`❌ [${webhookId}] QUEUE ERROR:`, queueError);
      
      // FAILSAFE: If queue fails, force save to unparseable
      console.log(`🆘 [${webhookId}] QUEUE FAILED - SAVING TO UNPARSEABLE AS FAILSAFE`);
      try {
        const { storage } = await import('./core/storage');
        const recipient = emailData.recipient || emailData.To || '';
        const recipientMatch = recipient.match(/([^@]+)@/);
        const emailPrefix = recipientMatch ? recipientMatch[1].toLowerCase() : '';
        
        if (emailPrefix) {
          const user = await storage.getUserByEmailPrefix(emailPrefix);
          if (user) {
            await storage.createUnparseableMessage({
              userId: user.id,
              source: 'email',
              fromContact: fromField,
              subject: subjectField,
              rawMessage: emailData['body-plain'] || emailData['body-html'] || 'No content',
              parsingErrorDetails: `Queue failed: ${queueError.message}`,
              messageType: 'queue_failure',
              createdAt: new Date()
            });
            console.log(`🆘 [${webhookId}] FAILSAFE SAVE SUCCESSFUL - email in unparseable`);
          }
        }
      } catch (failsafeError: any) {
        console.error(`💀 [${webhookId}] TOTAL FAILURE:`, failsafeError.message);
      }
      logWebhookActivity(`[${webhookId}] Queue processing failed`, { error: queueError.message });
      
      // For Encore emails that fail queue processing, log specifically
      if (fromField.toLowerCase().includes('encore')) {
        console.error(`🎵 [${webhookId}] ENCORE EMAIL FAILED QUEUE PROCESSING:`, {
          error: queueError.message,
          from: fromField,
          to: toField,
          subject: subjectField
        });
      }
      
      // Still return 200 to prevent Mailgun retries
      res.status(200).json({ 
        status: 'error', 
        webhookId: webhookId,
        message: 'Queue processing failed but webhook acknowledged',
        error: queueError.message 
      });
    }
    
  } catch (error: any) {
    console.error(`❌ [${webhookId}] WEBHOOK ERROR:`, error);
    console.error(`❌ [${webhookId}] WEBHOOK ERROR STACK:`, error.stack);
    logWebhookActivity(`[${webhookId}] Webhook processing failed`, { error: error.message });
    
    // Return 200 anyway to prevent Mailgun retries that could duplicate emails
    res.status(200).json({ 
      status: 'error', 
      message: error.message,
      note: 'Returning 200 to prevent Mailgun retries'
    });
  }
});

// Stripe success/cancel handlers
app.get('/payment/success', async (req: any, res) => {
  try {
    const sessionId = req.query.session_id;
    if (!sessionId) {
      return res.redirect('/?error=no_session_id');
    }

    const { StripeService } = await import('./core/stripe-service');
    const stripeService = new StripeService();
    
    const sessionDetails = await stripeService.getSessionDetails(sessionId);
    const userId = sessionDetails.metadata?.userId;
    
    if (!userId) {
      return res.redirect('/?error=no_user_id');
    }
    
    req.session.userId = userId;
    console.log('✅ User logged in via Stripe payment success:', userId);
    
    return res.redirect('/?payment=success');
    
  } catch (error: any) {
    console.error('❌ Payment success handler error:', error);
    return res.redirect('/?error=payment_handler_failed');
  }
});

app.get('/payment/cancel', (req, res) => {
  res.redirect('/?payment=cancelled');
});

// Email queue status endpoint
app.get('/api/email-queue/status', async (req, res) => {
  try {
    const { emailQueue } = await import('./core/email-queue');
    const status = emailQueue.getStatus();
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

  // Lightweight client reply webhook handler for mg.musobuddy.com (must be before modular routes)
  app.post('/api/webhook/mailgun-replies', upload.any(), async (req, res) => {
    logReplyWebhookActivity('Received client reply', { keys: Object.keys(req.body || {}) });
    
    try {
      const webhookData = req.body;
      
      // Check for duplicate email processing
      if (isDuplicateEmail(webhookData)) {
        return res.status(200).json({ 
          status: 'duplicate', 
          message: 'Email already processed, skipping to prevent duplication' 
        });
      }
      const recipientEmail = webhookData.recipient || webhookData.To || '';
      
      // Extract booking ID from email address 
      // Supports both formats:
      // - booking-12345@mg.musobuddy.com (direct format)
      // - user1754488522516-booking7317@mg.musobuddy.com (user-specific format)
      const bookingMatch = recipientEmail.match(/booking-?(\d+)@/);
      const invoiceMatch = recipientEmail.match(/invoice-?(\d+)@/);
      
      let bookingId = null;
      let replyType = 'unknown';
      
      if (bookingMatch) {
        bookingId = bookingMatch[1];
        replyType = 'booking';
      } else if (invoiceMatch) {
        bookingId = invoiceMatch[1]; // Invoice replies also link to booking
        replyType = 'invoice';
      } else {
        logReplyWebhookActivity('No booking/invoice ID found in recipient - NOT A REPLY', { recipientEmail });
        
        // CRITICAL: This webhook should ONLY handle replies with booking/invoice IDs
        // If no ID is found, this is likely a new inquiry that should go to main webhook
        // Return 200 to acknowledge but don't process it here
        return res.status(200).json({ 
          status: 'ignored', 
          reason: 'not_a_reply_email',
          note: 'This webhook only processes booking/invoice replies'
        });
      }
      
      // Find the booking to get user ID
      const { storage } = await import('./core/storage');
      const booking = await storage.getBooking(bookingId);
      
      if (!booking) {
        logReplyWebhookActivity('Booking not found', { bookingId });
        return res.status(200).json({ status: 'ignored', reason: 'booking_not_found' });
      }
      
      const userId = booking.userId;
      const senderEmail = webhookData.sender || webhookData.From || 'Unknown';
      const subject = webhookData.subject || webhookData.Subject || 'No Subject';
      
      // Create simplified HTML message
      const messageHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Client Reply - ${subject}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 20px; }
        .reply-header { background: #f0f9ff; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .reply-content { background: white; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
        .metadata { color: #666; font-size: 0.9em; margin-bottom: 10px; }
        .reply-type { background: #06b6d4; color: white; padding: 2px 8px; border-radius: 3px; font-size: 0.8em; }
    </style>
</head>
<body>
    <div class="reply-header">
        <div class="metadata">
            <span class="reply-type">${replyType.toUpperCase()} REPLY</span><br>
            <strong>From:</strong> ${senderEmail}<br>
            <strong>Subject:</strong> ${subject}<br>
            <strong>Date:</strong> ${new Date().toLocaleString()}<br>
            <strong>Booking ID:</strong> ${bookingId}
        </div>
    </div>
    <div class="reply-content">
        ${webhookData['body-html'] || webhookData['stripped-html'] || webhookData['body-plain']?.replace(/\n/g, '<br>') || 'No content'}
    </div>
</body>
</html>`;
      
      // Store message in cloud storage
      const { uploadToCloudflareR2 } = await import('./core/cloud-storage');
      const fileName = `user${userId}/booking${bookingId}/messages/${replyType}_reply_${Date.now()}.html`;
      const messageBuffer = Buffer.from(messageHtml, 'utf8');
      await uploadToCloudflareR2(messageBuffer, fileName, 'text/html', {
        'booking-id': bookingId,
        'user-id': userId,
        'reply-type': replyType
      });
      
      // Create notification entry
      await storage.createMessageNotification({
        userId: userId,
        bookingId: bookingId,
        senderEmail: senderEmail,
        subject: subject,
        messageUrl: fileName,
        isRead: false,
        createdAt: new Date()
      });
      
      logReplyWebhookActivity(`${replyType} reply stored successfully`, { fileName, userId, bookingId });
      res.status(200).json({ 
        status: 'success', 
        type: `${replyType}_reply`, 
        bookingId, 
        userId,
        message: 'Reply processed and stored'
      });
      
    } catch (error: any) {
      logReplyWebhookActivity('Error processing reply', { error: error.message, stack: error.stack?.substring(0, 200) });
      
      // Return 200 to prevent Mailgun retries
      res.status(200).json({ 
        status: 'error', 
        message: error.message,
        note: 'Error logged, returning 200 to prevent retries'
      });
    }
  });

  // Stripe webhook alias route (to match Stripe dashboard configuration)
  app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    // Forward to the main webhook handler
    req.url = '/api/webhook/stripe';
    return handleStripeWebhook(req, res);
  });

  // Main Stripe webhook handler for payment completion
  async function handleStripeWebhook(req: any, res: any) {
    try {
      console.log('🔔 Stripe webhook received');
      
      const sig = req.headers['stripe-signature'] as string;
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      
      if (!webhookSecret) {
        console.error('❌ Missing STRIPE_WEBHOOK_SECRET');
        return res.status(400).send('Webhook secret not configured');
      }
      
      let event;
      
      try {
        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(process.env.STRIPE_TEST_SECRET_KEY || '', { 
          apiVersion: '2024-12-18.acacia' 
        });
        
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        console.log('✅ Stripe webhook signature verified:', event.type);
      } catch (err: any) {
        console.error('❌ Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }
      
      // Handle the event
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        console.log('💳 Processing checkout.session.completed:', session.id);
        
        // Get customer email from session
        const customerEmail = session.customer_email || session.metadata?.userEmail;
        
        if (!customerEmail) {
          console.error('❌ No customer email found in session');
          return res.status(400).send('No customer email');
        }
        
        console.log('🔍 Looking up user with email:', customerEmail);
        
        // Find user by email and upgrade their tier
        const user = await storage.getUserByEmail(customerEmail);
        
        if (!user) {
          console.error('❌ User not found for email:', customerEmail);
          return res.status(404).send('User not found');
        }
        
        // Check if this is a beta tester, trial signup, or paid subscription
        const isBetaSignup = session.metadata?.signup_type === 'beta_tester' ||
                           session.metadata?.is_beta_user === 'true';
        const isTrialSignup = session.metadata?.signup_type === 'trial' || 
                             (session.subscription && session.amount_total === 0 && !isBetaSignup);
        
        if (isBetaSignup) {
          // Beta tester completing checkout - they have 365 day trial
          console.log('🎉 Beta tester completing checkout:', user.id);
          
          // SECURITY: Beta testers must complete checkout to access the app
          // has_paid = true means they've completed the payment flow (even with 100% discount)
          await storage.updateUser(user.id, {
            stripeCustomerId: session.customer,
            stripeSubscriptionId: session.subscription,
            hasPaid: true, // CRITICAL: Set to true - they've completed checkout
            isBetaTester: true // Ensure beta flag is set
          });
          
          console.log('✅ Beta tester activated (has_paid = true):', {
            userId: user.id,
            email: customerEmail,
            customerId: session.customer
          });
        } else if (isTrialSignup) {
          // Trial user completing checkout - they have 30 day trial
          console.log('🎯 Trial user completing checkout:', user.id);
          
          // SECURITY: Trial users must complete checkout to access the app
          // has_paid = true means they've completed the payment flow (even with 100% discount)
          await storage.updateUser(user.id, {
            stripeCustomerId: session.customer,
            stripeSubscriptionId: session.subscription,
            hasPaid: true // CRITICAL: Set to true - they've completed checkout
          });
          
          console.log('✅ Trial user activated (has_paid = true):', {
            userId: user.id,
            email: customerEmail,
            customerId: session.customer
          });
        } else {
          // Paid subscription - user has actually paid money
          console.log('💳 Processing payment for user:', user.id);
          
          await storage.updateUser(user.id, {
            stripeCustomerId: session.customer,
            stripeSubscriptionId: session.subscription,
            hasPaid: true, // Mark as paid user
            // Clear trial_ends_at since they've paid
            trialEndsAt: null
          });
          
          console.log('✅ User marked as paid subscriber:', {
            userId: user.id,
            email: customerEmail,
            customerId: session.customer,
            subscriptionId: session.subscription
          });
        }
      } else if (event.type === 'customer.subscription.updated') {
        const subscription = event.data.object;
        console.log('🔄 Processing subscription update:', subscription.id);
        
        // Check if this is a beta tester reaching the end of their 12-month free period
        const customer = subscription.customer;
        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(process.env.STRIPE_TEST_SECRET_KEY || '', { 
          apiVersion: '2024-12-18.acacia' 
        });
        
        // Get customer email
        const stripeCustomer = await stripe.customers.retrieve(customer as string);
        const customerEmail = stripeCustomer.email;
        
        if (!customerEmail) {
          console.error('❌ No customer email found for subscription update');
          return res.status(400).send('No customer email');
        }
        
        console.log('🔍 Looking up user for subscription update:', customerEmail);
        const user = await storage.getUserByEmail(customerEmail);
        
        if (!user) {
          console.error('❌ User not found for subscription update:', customerEmail);
          return res.status(404).send('User not found');
        }
        
        // Check if user is a beta tester and if BETA_TESTER_2025 coupon is expiring
        if (user.isBetaTester && subscription.discount?.coupon?.id === 'BETA_TESTER_2025') {
          // Check if the discount is ending (next period will not have the discount)
          const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
            customer: customer as string
          });
          
          // If upcoming invoice doesn't have the beta tester discount, upgrade to alumni
          const hasAlumniDiscount = upcomingInvoice.discounts?.some(d => d.coupon?.id === 'BETA_ALUMNI_30_FOREVER');
          const hasBetaDiscount = upcomingInvoice.discounts?.some(d => d.coupon?.id === 'BETA_TESTER_2025');
          
          if (!hasBetaDiscount && !hasAlumniDiscount) {
            console.log('🎓 Beta tester transitioning to alumni - applying lifetime 30% discount');
            
            try {
              // Apply the alumni discount to the subscription
              await stripe.subscriptions.update(subscription.id, {
                discounts: [{
                  coupon: 'BETA_ALUMNI_30_FOREVER'
                }]
              });
              
              // Update user status
              await storage.updateUser(user.id, {
                plan: 'beta_alumni',
                trialStatus: 'expired' // Beta period over, now on alumni pricing
              });
              
              console.log('✅ Beta alumni upgrade completed:', {
                userId: user.id,
                email: customerEmail,
                subscriptionId: subscription.id
              });
            } catch (error) {
              console.error('❌ Failed to apply alumni discount:', error);
            }
          }
        }
      } else if (event.type === 'customer.subscription.created' || 
                 event.type === 'customer.subscription.deleted' ||
                 event.type === 'invoice.payment_succeeded' ||
                 event.type === 'invoice.payment_failed') {
        console.log(`📋 Handling ${event.type} - no special beta logic needed`);
        // These events are logged but don't need special beta handling
      } else {
        console.log(`ℹ️ Unhandled webhook event: ${event.type}`);
      }
      
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('❌ Stripe webhook error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }

  // Original webhook route using the shared handler function
  app.post('/api/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    return handleStripeWebhook(req, res);
  });

  // Add development fallback middleware for database failures
  // TEMPORARILY DISABLED for production testing - NODE_ENV issue
  console.log(`🔍 [ENV-DEBUG] NODE_ENV: "${process.env.NODE_ENV}", REPLIT_DEPLOYMENT: "${process.env.REPLIT_DEPLOYMENT}"`);
  if (false && process.env.NODE_ENV === 'development') {
    console.log('🚧 Setting up development database fallback middleware...');
    const { createDevelopmentFallback } = await import('./middleware/development-fallback');
    app.use('/api', createDevelopmentFallback());
    console.log('✅ Development fallback middleware active for /api/* routes');
  }

  // Register all API routes with error handling
  console.log('🔄 Registering all modular routes...');
  try {
    const { registerRoutes } = await import('./routes');
    console.log('✅ Successfully imported registerRoutes function');
    await registerRoutes(app);
    console.log('✅ All modular routes registered successfully');
  } catch (error) {
    console.error('❌ CRITICAL: Route registration failed:', error);
    console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    // Continue server startup even if routes fail - better to have a partially working server
  }

  // Apply global subscription protection AFTER routes (so req.user is set)
  console.log('🔒 Setting up global subscription protection...');
  const { subscriptionGuard } = await import('./middleware/subscription-guard');
  app.use(subscriptionGuard);
  console.log('✅ Global subscription guard active for all /api/* routes');

  // Start server
  // Replit provides PORT env variable, default to 5000
  const port = parseInt(process.env.PORT || '5000', 10);

  if (process.env.NODE_ENV !== 'production') {
    // Development with Vite
    console.log('🛠️ Development mode: using Vite dev server');
    const { setupVite } = await import('./vite');
    const { createServer } = await import('http');
    const server = createServer(app);

    await setupVite(app, server);
    
    // Force use of port 5000 for Replit compatibility
    server.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Development server running on http://0.0.0.0:${port}`);
    });
    
    server.on('error', (err: any) => {
      console.error('❌ Server error:', err);
      process.exit(1);
    });
  } else {
    // Production
    console.log('🏭 Production mode: serving static files');
    const { serveStaticFixed } = await import('./core/serve-static');
    serveStaticFixed(app);
    
    // Check if port is available before listening
    const server = app.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Production server running on port ${port}`);
    });
    
    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${port} is already in use in production. This requires manual intervention.`);
        process.exit(1);
      } else {
        throw err;
      }
    });
  }
}

// Start the server
initializeServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});