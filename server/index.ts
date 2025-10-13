import express from 'express';
import session from 'express-session';
import multer from 'multer';
import { Anthropic } from '@anthropic-ai/sdk';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fetch from 'node-fetch';
import { existsSync } from 'fs';
import { db } from './core/database';

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

/**
 * Normalizes email prefix by stripping development tags (+dev, +test, dev- prefix)
 * Allows development testing with tagged emails while maintaining user lookup compatibility
 * Examples: 
 *   tim+dev → tim
 *   sarah+test → sarah  
 *   dev-tim → tim
 */
function normalizeEmailPrefix(emailPrefix: string): string {
  return emailPrefix
    .replace(/\+(dev|test|staging).*$/i, '') // Remove +dev, +test, +staging tags
    .replace(/^(dev|test|staging)-/i, '');    // Remove dev-, test-, staging- prefixes
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

// CRITICAL: Simple ping endpoint for deployment health checks
// This endpoint responds immediately without any async operations or database calls
// This ensures the health check passes during deployment
app.get('/ping', (req, res) => {
  console.log('🏓 PING health check received');
  res.status(200).send('pong');
});

// Health check endpoint for deployment with logging
app.get('/health', (req, res) => {
  console.log('❤️ HEALTH check received');
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Root endpoint - simplified to respond quickly for all health checks
app.get('/', (req, res, next) => {
  const userAgent = req.headers['user-agent'] || '';
  const accept = req.headers['accept'] || '';
  
  console.log('🏠 ROOT endpoint hit - User-Agent:', userAgent.substring(0, 50), 'Accept:', accept.substring(0, 30));
  
  // For any health check tool or non-browser request, respond immediately with JSON
  // This ensures fast response for deployment health checks
  if (!accept.includes('text/html') || 
      userAgent.includes('GoogleHC') || 
      userAgent.includes('Pingdom') ||
      userAgent.includes('StatusCake') ||
      userAgent.includes('UptimeRobot') ||
      userAgent.includes('curl') ||
      userAgent.includes('python') ||
      userAgent.includes('wget')) {
    console.log('✅ Responding to health check/monitoring tool');
    return res.status(200).json({ 
      status: 'MusoBuddy API Online', 
      mode: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString() 
    });
  }
  
  // Let Vite handle browser requests
  console.log('🌐 Passing to Vite for browser request');
  return next();
});

// Track server initialization state
let serverInitialized = false;

// Middleware to return 503 for non-health endpoints during initialization
// This prevents 404 errors and properly communicates that the server is warming up
app.use((req, res, next) => {
  // Allow health check endpoints to always pass through
  if (req.path === '/ping' || req.path === '/health' || req.path === '/') {
    return next();
  }
  
  // If server is not initialized yet, return 503 Service Unavailable
  if (!serverInitialized) {
    console.log(`⏳ Request to ${req.path} during initialization - returning 503`);
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'Server is starting up, please try again in a moment',
      retryAfter: 5
    });
  }
  
  // Server is initialized, proceed normally
  next();
});


// Initialize storage and services in async wrapper
async function initializeServer() {
  const { storage } = await import('./core/storage');
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // BACKUP SYSTEM: Primary + Secondary webhook endpoints for redundancy
  // Primary webhook endpoint for mg.musobuddy.com replies
  // Lightweight client reply webhook handler for mg.musobuddy.com
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
      
      // Extract plain text content for fallback storage
      const plainTextContent = webhookData['body-plain'] || 
        (webhookData['body-html'] || webhookData['stripped-html'] || '')
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .trim() || 'No content available';

      // Store message in cloud storage
      const { uploadToCloudflareR2 } = await import('./core/cloud-storage');
      const fileName = `user${userId}/booking${bookingId}/messages/${replyType}_reply_${Date.now()}.html`;
      const messageBuffer = Buffer.from(messageHtml, 'utf8');
      
      let finalMessageUrl = fileName;
      
      try {
        await uploadToCloudflareR2(messageBuffer, fileName, 'text/html', {
          'booking-id': bookingId,
          'user-id': userId,
          'reply-type': replyType
        });
        console.log(`✅ Message stored in cloud storage: ${fileName}`);
      } catch (cloudError) {
        console.error(`❌ Cloud storage failed, using fallback:`, cloudError);
        // Use data URL as fallback - store content directly in the URL field
        const contentBase64 = Buffer.from(plainTextContent, 'utf-8').toString('base64');
        finalMessageUrl = `data:text/plain;base64,${contentBase64}`;
      }
      
      // Create notification entry with either cloud URL or fallback data URL
      await storage.createMessageNotification({
        userId: userId,
        bookingId: bookingId,
        senderEmail: senderEmail,
        subject: subject,
        messageUrl: finalMessageUrl,
        isRead: false,
        createdAt: new Date()
      });
      
      logReplyWebhookActivity(`${replyType} reply stored successfully`, { fileName, userId, bookingId });
      updateEmailHealthMetrics(true); // Track successful email processing
      res.status(200).json({ 
        status: 'success', 
        type: `${replyType}_reply`, 
        bookingId, 
        userId,
        message: 'Reply processed and stored'
      });
      
    } catch (error: any) {
      logReplyWebhookActivity('Error processing reply', { error: error.message, stack: error.stack?.substring(0, 200) });
      updateEmailHealthMetrics(false, error); // Track email processing failure
      
      // Return 200 to prevent Mailgun retries
      res.status(200).json({ 
        status: 'error', 
        message: error.message,
        note: 'Error logged, returning 200 to prevent retries'
      });
    }
  });

  // BACKUP WEBHOOK: Secondary endpoint for redundancy (identical processing)
  app.post('/api/webhook/mailgun-replies-backup', upload.any(), async (req, res) => {
    logReplyWebhookActivity('BACKUP: Received client reply', { keys: Object.keys(req.body || {}) });
    
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
      
      const bookingMatch = recipientEmail.match(/booking-?(\d+)@/);
      const invoiceMatch = recipientEmail.match(/invoice-?(\d+)@/);
      
      let bookingId = null;
      let replyType = 'unknown';
      
      if (bookingMatch) {
        bookingId = bookingMatch[1];
        replyType = 'booking';
      } else if (invoiceMatch) {
        bookingId = invoiceMatch[1];
        replyType = 'invoice';
      } else {
        logReplyWebhookActivity('BACKUP: No booking/invoice ID found in recipient', { recipientEmail });
        return res.status(200).json({ 
          status: 'ignored', 
          reason: 'not_a_reply_email',
          note: 'Backup webhook - only processes booking/invoice replies'
        });
      }
      
      const booking = await storage.getBooking(bookingId);
      
      if (!booking) {
        logReplyWebhookActivity('BACKUP: Booking not found', { bookingId });
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
        .reply-type { background: #dc2626; color: white; padding: 2px 8px; border-radius: 3px; font-size: 0.8em; }
    </style>
</head>
<body>
    <div class="reply-header">
        <div class="metadata">
            <span class="reply-type">BACKUP ${replyType.toUpperCase()} REPLY</span><br>
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
      
      // Extract plain text content for fallback storage
      const plainTextContent = webhookData['body-plain'] || 
        (webhookData['body-html'] || webhookData['stripped-html'] || '')
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .trim() || 'No content available';

      // Store message in cloud storage
      const { uploadToCloudflareR2 } = await import('./core/cloud-storage');
      const fileName = `user${userId}/booking${bookingId}/messages/backup_${replyType}_reply_${Date.now()}.html`;
      const messageBuffer = Buffer.from(messageHtml, 'utf8');
      
      let finalMessageUrl = fileName;
      
      try {
        await uploadToCloudflareR2(messageBuffer, fileName, 'text/html', {
          'booking-id': bookingId,
          'user-id': userId,
          'reply-type': `backup_${replyType}`
        });
        console.log(`✅ BACKUP: Message stored in cloud storage: ${fileName}`);
      } catch (cloudError) {
        console.error(`❌ BACKUP: Cloud storage failed, using fallback:`, cloudError);
        const contentBase64 = Buffer.from(plainTextContent, 'utf-8').toString('base64');
        finalMessageUrl = `data:text/plain;base64,${contentBase64}`;
      }
      
      // Create notification entry
      await storage.createMessageNotification({
        userId: userId,
        bookingId: bookingId,
        senderEmail: `[BACKUP] ${senderEmail}`,
        subject: `[BACKUP] ${subject}`,
        messageUrl: finalMessageUrl,
        isRead: false,
        createdAt: new Date()
      });
      
      logReplyWebhookActivity(`BACKUP: ${replyType} reply stored successfully`, { fileName, userId, bookingId });
      updateEmailHealthMetrics(true); // Track successful backup email processing
      res.status(200).json({ 
        status: 'success', 
        type: `backup_${replyType}_reply`, 
        bookingId, 
        userId,
        message: 'Reply processed via backup endpoint'
      });
      
    } catch (error: any) {
      logReplyWebhookActivity('BACKUP: Error processing reply', { error: error.message, stack: error.stack?.substring(0, 200) });
      updateEmailHealthMetrics(false, error); // Track backup email processing failure
      
      res.status(200).json({ 
        status: 'error', 
        message: error.message,
        note: 'Backup endpoint error logged, returning 200 to prevent retries'
      });
    }
  });

// EMAIL HEALTH MONITORING SYSTEM
const emailHealthMetrics = {
  lastProcessedEmail: null as Date | null,
  totalProcessed: 0,
  totalErrors: 0,
  recentErrors: [] as any[],
  alertThresholds: {
    noEmailMinutes: 30, // Alert if no emails processed for 30 minutes
    errorRate: 0.1, // Alert if error rate exceeds 10%
    consecutiveErrors: 3 // Alert after 3 consecutive errors
  },
  consecutiveErrorCount: 0,
  alerts: [] as any[]
};

function updateEmailHealthMetrics(success: boolean, error?: any) {
  if (success) {
    emailHealthMetrics.lastProcessedEmail = new Date();
    emailHealthMetrics.totalProcessed++;
    emailHealthMetrics.consecutiveErrorCount = 0;
  } else {
    emailHealthMetrics.totalErrors++;
    emailHealthMetrics.consecutiveErrorCount++;
    emailHealthMetrics.recentErrors.push({
      timestamp: new Date(),
      error: error?.message || 'Unknown error',
      stack: error?.stack?.substring(0, 200)
    });
    
    // Keep only last 10 errors
    if (emailHealthMetrics.recentErrors.length > 10) {
      emailHealthMetrics.recentErrors.shift();
    }
    
    // Check if we need to create an alert
    checkEmailHealthAlerts();
  }
}

function checkEmailHealthAlerts() {
  const now = new Date();
  const { alertThresholds, lastProcessedEmail, totalErrors, totalProcessed, consecutiveErrorCount } = emailHealthMetrics;
  
  // Check for no email processing alert
  if (lastProcessedEmail) {
    const minutesSinceLastEmail = (now.getTime() - lastProcessedEmail.getTime()) / (1000 * 60);
    if (minutesSinceLastEmail > alertThresholds.noEmailMinutes) {
      createAlert('NO_EMAIL_PROCESSING', `No emails processed for ${Math.round(minutesSinceLastEmail)} minutes`);
    }
  }
  
  // Check error rate alert
  if (totalProcessed > 0) {
    const errorRate = totalErrors / (totalProcessed + totalErrors);
    if (errorRate > alertThresholds.errorRate) {
      createAlert('HIGH_ERROR_RATE', `Email error rate at ${(errorRate * 100).toFixed(1)}%`);
    }
  }
  
  // Check consecutive errors alert
  if (consecutiveErrorCount >= alertThresholds.consecutiveErrors) {
    createAlert('CONSECUTIVE_ERRORS', `${consecutiveErrorCount} consecutive email processing errors`);
  }
}

function createAlert(type: string, message: string) {
  const alert = {
    id: Date.now().toString(),
    type,
    message,
    timestamp: new Date(),
    acknowledged: false
  };
  
  emailHealthMetrics.alerts.push(alert);
  
  // Keep only last 20 alerts
  if (emailHealthMetrics.alerts.length > 20) {
    emailHealthMetrics.alerts.shift();
  }
  
  console.error(`🚨 EMAIL HEALTH ALERT [${type}]: ${message}`);
}

// Real-time email health monitoring endpoint
app.get('/api/email/health', (req, res) => {
  const now = new Date();
  const { lastProcessedEmail, totalProcessed, totalErrors, recentErrors, alerts } = emailHealthMetrics;
  
  let status = 'healthy';
  let statusMessage = 'All email processing systems operational';
  
  // Check current health status
  if (lastProcessedEmail) {
    const minutesSinceLastEmail = (now.getTime() - lastProcessedEmail.getTime()) / (1000 * 60);
    if (minutesSinceLastEmail > emailHealthMetrics.alertThresholds.noEmailMinutes) {
      status = 'warning';
      statusMessage = `No emails processed for ${Math.round(minutesSinceLastEmail)} minutes`;
    }
  }
  
  if (emailHealthMetrics.consecutiveErrorCount >= emailHealthMetrics.alertThresholds.consecutiveErrors) {
    status = 'critical';
    statusMessage = `${emailHealthMetrics.consecutiveErrorCount} consecutive processing errors`;
  }
  
  const healthData = {
    status,
    statusMessage,
    timestamp: now.toISOString(),
    metrics: {
      lastProcessedEmail: lastProcessedEmail?.toISOString() || null,
      totalProcessed,
      totalErrors,
      errorRate: totalProcessed > 0 ? (totalErrors / (totalProcessed + totalErrors)) : 0,
      consecutiveErrors: emailHealthMetrics.consecutiveErrorCount,
      webhookLogsCount: webhookLogs.length,
      replyWebhookLogsCount: replyWebhookLogs.length
    },
    recentErrors: recentErrors.slice(-5), // Last 5 errors
    alerts: alerts.filter(alert => !alert.acknowledged).slice(-10), // Last 10 unacknowledged alerts
    uptime: {
      minutes: process.uptime() / 60,
      formatted: `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m`
    }
  };
  
  res.json(healthData);
});

// Acknowledge health alerts
app.post('/api/email/health/acknowledge', (req, res) => {
  const { alertId } = req.body;
  
  if (!alertId) {
    return res.status(400).json({ error: 'alertId required' });
  }
  
  const alert = emailHealthMetrics.alerts.find(a => a.id === alertId);
  if (alert) {
    alert.acknowledged = true;
    console.log(`✅ ALERT ACKNOWLEDGED: ${alert.type} - ${alert.message}`);
    res.json({ success: true, message: 'Alert acknowledged' });
  } else {
    res.status(404).json({ error: 'Alert not found' });
  }
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

// EMAIL RECOVERY SYSTEM: Check for missed emails
app.get('/api/email/recovery/check', async (req, res) => {
  try {
    console.log('🔍 EMAIL RECOVERY: Starting missed email check...');
    
    // Get query parameters
    const hours = parseInt(req.query.hours as string) || 24; // Last 24 hours by default
    const user_id = req.query.user_id as string;
    
    if (!user_id) {
      return res.status(400).json({ error: 'user_id parameter required' });
    }
    
    // Calculate time range
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - (hours * 60 * 60 * 1000));
    
    console.log(`🔍 Checking emails from ${startTime.toISOString()} to ${endTime.toISOString()}`);
    
    // Get our processed emails from webhook logs and database notifications
    const processedEmails = new Set();
    
    // Add emails from webhook logs
    webhookLogs.forEach(log => {
      if (log.data && log.timestamp) {
        const logTime = new Date(log.timestamp);
        if (logTime >= startTime && logTime <= endTime) {
          try {
            const data = JSON.parse(log.data);
            if (data.messageId || data['Message-Id']) {
              processedEmails.add(data.messageId || data['Message-Id']);
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    });
    
    replyWebhookLogs.forEach(log => {
      if (log.data && log.timestamp) {
        const logTime = new Date(log.timestamp);
        if (logTime >= startTime && logTime <= endTime) {
          try {
            const data = JSON.parse(log.data);
            if (data.messageId || data['Message-Id']) {
              processedEmails.add(data.messageId || data['Message-Id']);
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    });
    
    console.log(`🔍 Found ${processedEmails.size} processed emails in our logs`);
    
    // Query Mailgun Events API for delivered emails
    // Note: This would require Mailgun API key and proper implementation
    const mailgunDelivered = [];
    
    // For now, simulate this check - in production, integrate with Mailgun Events API
    const simulatedMailgunEmails = [
      {
        id: 'mg-event-1',
        timestamp: endTime.getTime() / 1000 - 3600, // 1 hour ago
        recipient: `${user_id}@enquiries.musobuddy.com`,
        subject: 'Test email that might be missed',
        delivered: true
      }
    ];
    
    const missedEmails = [];
    const recoveredEmails = [];
    
    // Check for emails delivered by Mailgun but not processed by us
    for (const mgEmail of simulatedMailgunEmails) {
      if (!processedEmails.has(mgEmail.id)) {
        missedEmails.push({
          mailgunId: mgEmail.id,
          timestamp: new Date(mgEmail.timestamp * 1000).toISOString(),
          recipient: mgEmail.recipient,
          subject: mgEmail.subject,
          status: 'missed'
        });
      }
    }
    
    console.log(`🔍 EMAIL RECOVERY: Found ${missedEmails.length} potentially missed emails`);
    
    // Attempt recovery for missed emails (placeholder for now)
    for (const missed of missedEmails) {
      // In production, this would:
      // 1. Fetch email content from Mailgun
      // 2. Process it through our normal email processing pipeline
      // 3. Mark as recovered
      recoveredEmails.push({
        ...missed,
        status: 'recovery_attempted',
        recoveryTime: new Date().toISOString()
      });
    }
    
    const result = {
      timeRange: {
        start: startTime.toISOString(),
        end: endTime.toISOString(),
        hours: hours
      },
      summary: {
        processedEmails: processedEmails.size,
        missedEmails: missedEmails.length,
        recoveredEmails: recoveredEmails.length
      },
      missedEmails: missedEmails,
      recoveredEmails: recoveredEmails,
      note: 'This is a prototype implementation. Production version will integrate with Mailgun Events API.'
    };
    
    res.json(result);
    
  } catch (error: any) {
    console.error('❌ EMAIL RECOVERY ERROR:', error);
    res.status(500).json({ 
      error: 'Email recovery check failed', 
      message: error.message 
    });
  }
});

// FALLBACK EMAIL PROCESSING: Process emails from Mailgun API
app.post('/api/email/recovery/process', async (req, res) => {
  try {
    console.log('🔄 FALLBACK PROCESSING: Starting email recovery...');
    
    const { emailId, user_id, force = false } = req.body;
    
    if (!emailId || !user_id) {
      return res.status(400).json({ error: 'emailId and user_id required' });
    }
    
    // Check if we've already processed this email (unless force=true)
    if (!force) {
      const alreadyProcessed = webhookLogs.some(log => 
        log.data && log.data.includes(emailId)
      ) || replyWebhookLogs.some(log => 
        log.data && log.data.includes(emailId)
      );
      
      if (alreadyProcessed) {
        return res.json({
          status: 'skipped',
          message: 'Email already processed',
          emailId,
          note: 'Use force=true to reprocess'
        });
      }
    }
    
    console.log(`🔄 Attempting recovery of email ${emailId} for user ${user_id}`);
    
    // In production, this would:
    // 1. Use Mailgun Events API to fetch email details
    // 2. Use Mailgun Messages API to fetch full email content
    // 3. Process through normal email handling pipeline
    
    // Simulated recovery process for now
    const simulatedEmailData = {
      messageId: emailId,
      from: 'client@example.com',
      to: `${user_id}@enquiries.musobuddy.com`,
      subject: 'Recovered Email - Test Subject',
      'body-plain': 'This is a recovered email that was previously missed by the webhook system.',
      'body-html': '<p>This is a recovered email that was previously missed by the webhook system.</p>',
      timestamp: Date.now() / 1000,
      recipient: `${user_id}@enquiries.musobuddy.com`
    };
    
    console.log('🔄 FALLBACK: Processing recovered email data...');
    
    // Process through our normal email handling
    const recipientEmail = simulatedEmailData.recipient || simulatedEmailData.to || '';
    const bookingMatch = recipientEmail.match(/booking-?(\d+)@/);
    const invoiceMatch = recipientEmail.match(/invoice-?(\d+)@/);
    
    let bookingId = null;
    let replyType = 'unknown';
    
    if (bookingMatch) {
      bookingId = bookingMatch[1];
      replyType = 'booking';
    } else if (invoiceMatch) {
      bookingId = invoiceMatch[1];
      replyType = 'invoice';
    } else {
      // This might be a general inquiry - store as unparseable message
      console.log('🔄 FALLBACK: No booking/invoice ID found, treating as general inquiry');
      
      // Store as unparseable message for later processing
      // This would typically go to the AI parsing system
      const result = {
        status: 'recovered_as_inquiry',
        emailId,
        message: 'Email recovered and stored as general inquiry',
        recoveryTime: new Date().toISOString(),
        note: 'Email did not match booking/invoice pattern'
      };
      
      updateEmailHealthMetrics(true); // Count as successful recovery
      return res.json(result);
    }
    
    // If we have a booking/invoice ID, process normally
    const booking = await storage.getBooking(bookingId);
    
    if (!booking) {
      return res.status(404).json({ 
        error: 'Booking not found', 
        bookingId,
        emailId
      });
    }
    
    const userId = booking.userId;
    const senderEmail = simulatedEmailData.from || 'Unknown';
    const subject = simulatedEmailData.subject || 'No Subject';
    
    // Create HTML message for recovered email
    const messageHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Recovered Email - ${subject}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 20px; }
        .recovery-header { background: #fef3c7; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #f59e0b; }
        .reply-content { background: white; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
        .metadata { color: #666; font-size: 0.9em; margin-bottom: 10px; }
        .recovery-type { background: #f59e0b; color: white; padding: 2px 8px; border-radius: 3px; font-size: 0.8em; }
    </style>
</head>
<body>
    <div class="recovery-header">
        <div class="metadata">
            <span class="recovery-type">RECOVERED ${replyType.toUpperCase()} EMAIL</span><br>
            <strong>From:</strong> ${senderEmail}<br>
            <strong>Subject:</strong> ${subject}<br>
            <strong>Original Date:</strong> ${new Date(simulatedEmailData.timestamp * 1000).toLocaleString()}<br>
            <strong>Recovery Date:</strong> ${new Date().toLocaleString()}<br>
            <strong>Booking ID:</strong> ${bookingId}<br>
            <strong>Email ID:</strong> ${emailId}
        </div>
        <p><strong>⚠️ This email was recovered through the fallback processing system after being missed by the primary webhook.</strong></p>
    </div>
    <div class="reply-content">
        ${simulatedEmailData['body-html'] || simulatedEmailData['body-plain']?.replace(/\n/g, '<br>') || 'No content'}
    </div>
</body>
</html>`;
    
    // Store recovered message
    const { uploadToCloudflareR2 } = await import('./core/cloud-storage');
    const fileName = `user${userId}/booking${bookingId}/messages/recovered_${replyType}_${emailId}_${Date.now()}.html`;
    const messageBuffer = Buffer.from(messageHtml, 'utf8');
    
    let finalMessageUrl = fileName;
    
    try {
      await uploadToCloudflareR2(messageBuffer, fileName, 'text/html', {
        'booking-id': bookingId,
        'user-id': userId,
        'reply-type': `recovered_${replyType}`,
        'original-email-id': emailId
      });
      console.log(`✅ RECOVERED: Message stored in cloud storage: ${fileName}`);
    } catch (cloudError) {
      console.error(`❌ RECOVERED: Cloud storage failed, using fallback:`, cloudError);
      const contentBase64 = Buffer.from(simulatedEmailData['body-plain'] || 'No content', 'utf-8').toString('base64');
      finalMessageUrl = `data:text/plain;base64,${contentBase64}`;
    }
    
    // Create notification entry
    await storage.createMessageNotification({
      userId: userId,
      bookingId: bookingId,
      senderEmail: `[RECOVERED] ${senderEmail}`,
      subject: `[RECOVERED] ${subject}`,
      messageUrl: finalMessageUrl,
      isRead: false,
      createdAt: new Date()
    });
    
    // Log successful recovery
    console.log(`✅ FALLBACK: Successfully recovered and processed email ${emailId}`);
    updateEmailHealthMetrics(true); // Count as successful recovery
    
    const result = {
      status: 'recovered',
      emailId,
      bookingId,
      userId,
      replyType,
      fileName,
      recoveryTime: new Date().toISOString(),
      message: 'Email successfully recovered and processed'
    };
    
    res.json(result);
    
  } catch (error: any) {
    console.error('❌ FALLBACK PROCESSING ERROR:', error);
    updateEmailHealthMetrics(false, error); // Count as recovery failure
    
    res.status(500).json({ 
      error: 'Fallback processing failed', 
      message: error.message,
      emailId: req.body.emailId
    });
  }
});

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
    
    // FIXED: Encore job notifications can have BOTH follow-up indicators AND apply-now links
    // The key is whether it's from Encore service and has follow-up indicators
    const isEncoreFollowup = (
      isFromEncoreService && 
      hasFollowupIndicators
      // REMOVED: !hasJobAlertIndicators - this was incorrectly excluding legitimate bookings
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

    // Detection for important Encore service messages that aren't bookings
    const isEncoreServiceMessage = (
      // Messages from the two key Encore addresses
      (fromField.toLowerCase().includes('message@encoremusicians.com') ||
       fromField.toLowerCase().includes('bookings@encoremusicians.com')) &&
      // These are NOT new job alerts
      !hasJobAlertIndicators
    );

    // Detection for job expiry/ending notifications
    const isJobExpiredNotification = (
      subjectField.toLowerCase().includes('job expired') ||
      subjectField.toLowerCase().includes('job ended') ||
      subjectField.toLowerCase().includes('gig expired') ||
      subjectField.toLowerCase().includes('opportunity expired') ||
      bodyField.toLowerCase().includes('this job has expired') ||
      bodyField.toLowerCase().includes('this job has ended') ||
      bodyField.toLowerCase().includes('this opportunity is no longer available') ||
      bodyField.toLowerCase().includes('listing has expired')
    );

    // Combine: Any non-booking message from Encore that should go to unparsable
    const isEncoreNonBookingMessage = isEncoreServiceMessage || isJobExpiredNotification;

    // FIXED: Encore job notifications can have BOTH follow-up indicators AND apply-now links
    // The key is whether it's from Encore service and has follow-up indicators
    const isEncoreFollowup = (
      isFromEncoreService &&
      hasFollowupIndicators &&
      !isEncoreNonBookingMessage  // Don't treat service messages as follow-ups
      // REMOVED: !hasJobAlertIndicators - this was incorrectly excluding legitimate bookings
    );

    logWebhookActivity('Email classification check', {
      recipient: recipient.substring(0, 50),
      isFromEncoreService,
      hasJobAlertIndicators,
      hasFollowupIndicators,
      isEncoreServiceMessage,
      isJobExpiredNotification,
      isEncoreNonBookingMessage,
      isEncoreFollowup
    });

    // Handle Encore non-booking messages (includes job expired, service messages, etc.)
    if (isEncoreNonBookingMessage) {
      const messageTypeLabel = isJobExpiredNotification ? 'JOB EXPIRED' : 'ENCORE SERVICE MESSAGE';
      logWebhookActivity(`${messageTypeLabel} DETECTED - saving to unparsable messages`);

      try {
        const { storage } = await import('./core/storage');

        // Extract user from recipient email prefix
        const recipientMatch = recipient.match(/([^@]+)@/);
        const rawEmailPrefix = recipientMatch ? recipientMatch[1].toLowerCase() : '';
        const emailPrefix = normalizeEmailPrefix(rawEmailPrefix);

        if (emailPrefix) {
          const user = await storage.getUserByEmailPrefix(emailPrefix);

          if (user) {
            // Determine the message type and label
            const messageType = isJobExpiredNotification ? 'job_expired_notification' : 'encore_service_message';
            const subjectPrefix = isJobExpiredNotification ? '[JOB EXPIRED]' : '[ENCORE MESSAGE]';
            const errorDetails = isJobExpiredNotification
              ? 'Job expiry notification - not a booking request'
              : `Service message from ${fromField} - not a booking request`;

            await storage.createUnparseableMessage({
              userId: user.id,
              source: 'email',
              fromContact: fromField,
              subject: `${subjectPrefix} ${subjectField}`,
              rawMessage: emailData['body-plain'] || emailData['body-html'] || 'No content',
              parsingErrorDetails: errorDetails,
              messageType: messageType,
              createdAt: new Date()
            });

            logWebhookActivity(`${messageTypeLabel} saved to unparsable messages`, {
              userId: user.id,
              subject: subjectField,
              from: fromField
            });

            return res.status(200).json({
              status: 'ok',
              type: messageType,
              message: `${messageTypeLabel} saved to unparsable messages`
            });
          }
        }

        // If no user found, still log it
        logWebhookActivity(`${messageTypeLabel} - no user found`, { emailPrefix });
      } catch (error: any) {
        logWebhookActivity(`Error saving ${messageTypeLabel}`, { error: error.message });
      }
    }

    // Handle Encore follow-up emails by converting to conversation
    if (isEncoreFollowup) {
      logWebhookActivity('ENCORE FOLLOW-UP DETECTED - searching for related booking');
      
      try {
        const { storage } = await import('./core/storage');
        
        // Extract user from recipient email prefix
        const recipientMatch = recipient.match(/([^@]+)@/);
        const rawEmailPrefix = recipientMatch ? recipientMatch[1].toLowerCase() : '';
        const emailPrefix = normalizeEmailPrefix(rawEmailPrefix); // Strip dev tags for user lookup
        
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
              logWebhookActivity('No Encore bookings found - saving to unparseable messages');
              
              // Save to unparseable messages for manual review and linking
              await storage.createUnparseableMessage({
                userId: user.id,
                source: 'email',
                fromContact: fromField,
                subject: `[ENCORE FOLLOW-UP] ${subjectField}`,
                rawMessage: emailData['body-plain'] || emailData['body-html'] || 'No content',
                parsingErrorDetails: 'Encore follow-up email - no existing Encore bookings found to link to',
                messageType: 'encore_followup_unlinked',
                createdAt: new Date()
              });
              
              logWebhookActivity('Encore follow-up saved to unparseable messages', { 
                userId: user.id, 
                reason: 'No Encore bookings found' 
              });
              
              return res.status(200).json({ 
                status: 'ok', 
                type: 'encore_followup_unparseable', 
                message: 'Encore follow-up saved to unparseable messages for manual review'
              });
            }
          } else {
            logWebhookActivity('No user found for email prefix', { emailPrefix });
            
            // If user not found, still try to save somewhere for review
            const fallbackUser = await storage.getUserByEmailPrefix('timfulkermusic'); // Your default user
            if (fallbackUser) {
              await storage.createUnparseableMessage({
                userId: fallbackUser.id,
                source: 'email',
                fromContact: fromField,
                subject: `[ENCORE - NO USER: ${emailPrefix}] ${subjectField}`,
                rawMessage: emailData['body-plain'] || emailData['body-html'] || 'No content',
                parsingErrorDetails: `Encore follow-up email sent to ${recipient} but no user found for prefix "${emailPrefix}"`,
                messageType: 'encore_followup_no_user',
                createdAt: new Date()
              });
              
              logWebhookActivity('Encore follow-up saved to fallback user unparseable messages', { 
                fallbackUserId: fallbackUser.id,
                originalEmailPrefix: emailPrefix
              });
              
              return res.status(200).json({ 
                status: 'ok', 
                type: 'encore_followup_fallback', 
                message: 'Encore follow-up saved for manual review (user not found)'
              });
            }
          }
        }
      } catch (error: any) {
        logWebhookActivity('Error processing Encore follow-up', { error: error.message });
        
        // Failsafe: try to save to unparseable messages even if there's an error
        try {
          const fallbackUser = await storage.getUserByEmailPrefix('timfulkermusic');
          if (fallbackUser) {
            await storage.createUnparseableMessage({
              userId: fallbackUser.id,
              source: 'email',
              fromContact: fromField,
              subject: `[ENCORE ERROR] ${subjectField}`,
              rawMessage: emailData['body-plain'] || emailData['body-html'] || 'No content',
              parsingErrorDetails: `Error processing Encore follow-up: ${error.message}`,
              messageType: 'encore_followup_error',
              createdAt: new Date()
            });
            
            logWebhookActivity('Encore follow-up saved to unparseable after error', { 
              error: error.message 
            });
          }
        } catch (failsafeError: any) {
          logWebhookActivity('Complete failure saving Encore email', { 
            originalError: error.message,
            failsafeError: failsafeError.message 
          });
        }
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
    
    // MIGRATION: Use migration controller to route between old/new systems
    const { emailMigrationController } = await import('./core/email-migration-controller');

    try {
      await emailMigrationController.processEmail(emailData);
      logWebhookActivity(`[${webhookId}] Email processed via migration controller`);
      
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
        const rawEmailPrefix = recipientMatch ? recipientMatch[1].toLowerCase() : '';
        const emailPrefix = normalizeEmailPrefix(rawEmailPrefix); // Strip dev tags for user lookup
        
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

// SendGrid Enquiries Webhook Handler (enquiries.musobuddy.com)
app.post('/api/webhook/sendgrid-enquiries', upload.any(), async (req, res) => {
  const webhookId = `sendgrid_enq_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

  console.log(`🟢 [${webhookId}] SendGrid enquiries webhook received`);
  console.log(`🟢 [${webhookId}] Body keys:`, Object.keys(req.body || {}));

  logWebhookActivity(`[${webhookId}] Received SendGrid enquiries webhook`, {
    keys: Object.keys(req.body || {}),
    userAgent: req.headers['user-agent'],
    contentType: req.headers['content-type']
  });

  try {
    const webhookData = req.body;

    // SendGrid uses lowercase field names: from, to, subject, text, html
    let fromField = webhookData.from || webhookData.envelope?.from || 'UNKNOWN_SENDER';
    // FIXED: Use envelope.to first (raw SMTP recipient) instead of to (may have display name)
    console.log(`🔍 [${webhookId}] DEBUG - webhookData.to: "${webhookData.to}"`);
    console.log(`🔍 [${webhookId}] DEBUG - webhookData.envelope?.to: "${webhookData.envelope?.to}"`);
    console.log(`🔍 [${webhookId}] DEBUG - envelope exists: ${!!webhookData.envelope}`);
    let toField = webhookData.envelope?.to || webhookData.to || 'UNKNOWN_RECIPIENT';
    let subjectField = webhookData.subject || 'UNKNOWN_SUBJECT';

    console.log(`🟢 [${webhookId}] FROM: ${fromField}`);
    console.log(`🟢 [${webhookId}] TO (final): ${toField}`);
    console.log(`🟢 [${webhookId}] SUBJECT: ${subjectField}`);

    // Log inbound email to database for monitoring
    let emailLogId: number | null = null;
    try {
      const { inboundEmailLog } = await import('@shared/schema');
      const attachments = (req.files as any[]) || [];
      const [logEntry] = await db.insert(inboundEmailLog).values({
        webhookType: 'enquiries',
        fromEmail: fromField,
        toEmail: toField,
        subject: subjectField,
        textContent: webhookData.text,
        htmlContent: webhookData.html,
        attachmentCount: attachments.length,
        attachmentNames: attachments.length > 0 ? attachments.map(f => f.originalname) : null,
        rawHeaders: webhookData.headers ? JSON.parse(JSON.stringify(webhookData.headers)) : null,
        spamScore: webhookData.spam_score ? parseFloat(webhookData.spam_score) : null,
        processingStatus: 'received'
      }).returning({ id: inboundEmailLog.id });
      emailLogId = logEntry.id;
      console.log(`📊 [${webhookId}] Logged inbound email to database (ID: ${emailLogId})`);
    } catch (logError) {
      console.error(`❌ [${webhookId}] Failed to log inbound email:`, logError);
      // Don't fail the webhook if logging fails
    }

    // Check for duplicate email processing
    if (isDuplicateEmail(webhookData)) {
      console.log(`🔄 [${webhookId}] DUPLICATE DETECTED - skipping`);
      logWebhookActivity(`[${webhookId}] DUPLICATE EMAIL`, { from: fromField, subject: subjectField });
      return res.status(200).json({
        status: 'duplicate',
        message: 'Email already processed',
        webhookId: webhookId
      });
    }

    // Extract user email prefix from recipient (e.g., timfulkermusic@enquiries.musobuddy.com)
    // Handle display name format from email clients: "Display Name <email@domain.com>"
    let actualEmail = toField;
    const angleMatch = toField.match(/<([^>]+)>/);
    if (angleMatch) {
      actualEmail = angleMatch[1];
      console.log(`🔵 [${webhookId}] Extracted email from angle brackets: ${actualEmail}`);
    }

    const recipientMatch = actualEmail.match(/([^@]+)@/);
    const rawEmailPrefix = recipientMatch ? recipientMatch[1].toLowerCase() : '';
    const emailPrefix = normalizeEmailPrefix(rawEmailPrefix);

    console.log(`🟢 [${webhookId}] Email prefix: ${emailPrefix}`);

    // Handle personal email forwarding (replicate Mailgun route behavior)
    if (emailPrefix) {
      try {
        const { storage } = await import('./core/storage');
        const user = await storage.getUserByEmailPrefix(emailPrefix);

        if (user && user.settings?.personalForwardEmail) {
          console.log(`📧 [${webhookId}] Personal forwarding enabled for user ${user.id}: ${user.settings.personalForwardEmail}`);

          // Forward to personal email using email service
          const { emailService } = await import('./core/email-provider-abstraction');

          await emailService.sendEmail({
            to: user.settings.personalForwardEmail,
            fromEmail: 'noreply@enquiries.musobuddy.com',
            fromName: 'MusoBuddy Enquiries',
            replyTo: fromField,
            subject: subjectField,
            html: webhookData.html || webhookData.text?.replace(/\n/g, '<br>') || 'No content',
            text: webhookData.text || 'No content'
          });

          console.log(`✅ [${webhookId}] Personal email forwarded successfully`);
          logWebhookActivity(`[${webhookId}] Personal email forwarded`, {
            to: user.settings.personalForwardEmail,
            userId: user.id
          });
        }
      } catch (forwardError: any) {
        console.error(`❌ [${webhookId}] Personal forwarding failed:`, forwardError.message);
        logWebhookActivity(`[${webhookId}] Personal forwarding failed`, { error: forwardError.message });
        // Continue processing even if forwarding fails
      }
    }

    // Process as new inquiry via migration controller
    console.log(`🟢 [${webhookId}] Processing as new inquiry`);

    // Convert SendGrid format to Mailgun-compatible format
    const mailgunCompatibleData = {
      sender: fromField,
      From: fromField,
      from: fromField,
      recipient: toField,
      To: toField,
      to: toField,
      subject: subjectField,
      Subject: subjectField,
      'body-plain': webhookData.text || '',
      'body-html': webhookData.html || '',
      'stripped-text': webhookData.text || '',
      'stripped-html': webhookData.html || '',
      'message-id': webhookData.headers?.['message-id'] || `sendgrid-${Date.now()}`
    };

    const { emailMigrationController } = await import('./core/email-migration-controller');

    try {
      await emailMigrationController.processEmail(mailgunCompatibleData);
      logWebhookActivity(`[${webhookId}] Email processed via migration controller`);

      res.status(200).json({
        status: 'ok',
        webhookId: webhookId,
        processedAs: 'new_inquiry'
      });

    } catch (queueError: any) {
      console.error(`❌ [${webhookId}] QUEUE ERROR:`, queueError);

      // Failsafe: save to unparseable messages
      console.log(`🆘 [${webhookId}] QUEUE FAILED - SAVING TO UNPARSEABLE AS FAILSAFE`);
      try {
        const { storage } = await import('./core/storage');

        if (emailPrefix) {
          const user = await storage.getUserByEmailPrefix(emailPrefix);
          if (user) {
            await storage.createUnparseableMessage({
              userId: user.id,
              source: 'email',
              fromContact: fromField,
              subject: subjectField,
              rawMessage: webhookData.text || webhookData.html || 'No content',
              parsingErrorDetails: `Queue failed: ${queueError.message}`,
              messageType: 'queue_failure',
              createdAt: new Date()
            });
            console.log(`🆘 [${webhookId}] FAILSAFE SAVE SUCCESSFUL`);
          }
        }
      } catch (failsafeError: any) {
        console.error(`💀 [${webhookId}] TOTAL FAILURE:`, failsafeError.message);
      }

      logWebhookActivity(`[${webhookId}] Queue processing failed`, { error: queueError.message });

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

    res.status(200).json({
      status: 'error',
      message: error.message,
      note: 'Returning 200 to prevent SendGrid retries'
    });
  }
});

// SendGrid Replies Webhook Handler (mg.musobuddy.com)
app.post('/api/webhook/sendgrid-replies', upload.any(), async (req, res) => {
  const webhookId = `sendgrid_rep_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

  console.log(`🔵 [${webhookId}] SendGrid replies webhook received`);
  console.log(`🔵 [${webhookId}] Body keys:`, Object.keys(req.body || {}));

  logWebhookActivity(`[${webhookId}] Received SendGrid replies webhook`, {
    keys: Object.keys(req.body || {}),
    userAgent: req.headers['user-agent'],
    contentType: req.headers['content-type']
  });

  try {
    const webhookData = req.body;

    // SendGrid uses lowercase field names
    let fromField = webhookData.from || webhookData.envelope?.from || 'UNKNOWN_SENDER';
    let toField = webhookData.to || webhookData.envelope?.to || 'UNKNOWN_RECIPIENT';
    let subjectField = webhookData.subject || 'UNKNOWN_SUBJECT';

    console.log(`🔵 [${webhookId}] FROM: ${fromField}`);
    console.log(`🔵 [${webhookId}] TO: ${toField}`);
    console.log(`🔵 [${webhookId}] SUBJECT: ${subjectField}`);

    // Check for duplicate email processing
    if (isDuplicateEmail(webhookData)) {
      console.log(`🔄 [${webhookId}] DUPLICATE DETECTED - skipping`);
      logWebhookActivity(`[${webhookId}] DUPLICATE EMAIL`, { from: fromField, subject: subjectField });
      return res.status(200).json({
        status: 'duplicate',
        message: 'Email already processed',
        webhookId: webhookId
      });
    }

    // Extract userId and bookingId from format: user{USERID}-booking{BOOKINGID}@mg.musobuddy.com
    // UserID can contain hyphens (e.g., "a-f3aXjxMXJHdSTujnAO5"), so use non-greedy match

    // First, extract actual email address from angle brackets if present
    // Format might be: "Display Name <email@domain.com>" or just "email@domain.com"
    let actualEmail = toField;
    const angleMatch = toField.match(/<([^>]+)>/);
    if (angleMatch) {
      actualEmail = angleMatch[1];
      console.log(`🔵 [${webhookId}] Extracted email from angle brackets: ${actualEmail}`);
    }

    const recipientMatch = actualEmail.match(/^user(.+?)-booking(\d+)@/i);

    if (!recipientMatch) {
      console.log(`⚠️ [${webhookId}] Invalid reply email format: ${actualEmail}`);
      logWebhookActivity(`[${webhookId}] Invalid reply email format`, { to: toField, actualEmail });
      return res.status(200).json({
        status: 'error',
        message: 'Invalid reply email format - expected user{USERID}-booking{BOOKINGID}@mg.musobuddy.com'
      });
    }

    const userId = recipientMatch[1];
    const bookingId = recipientMatch[2];

    // Log inbound email to database for monitoring (with extracted userId and bookingId)
    let emailLogId: number | null = null;
    try {
      const { inboundEmailLog } = await import('@shared/schema');
      const attachments = (req.files as any[]) || [];
      const [logEntry] = await db.insert(inboundEmailLog).values({
        webhookType: 'replies',
        fromEmail: fromField,
        toEmail: toField,
        subject: subjectField,
        textContent: webhookData.text,
        htmlContent: webhookData.html,
        userId: userId,
        bookingId: parseInt(bookingId),
        attachmentCount: attachments.length,
        attachmentNames: attachments.length > 0 ? attachments.map(f => f.originalname) : null,
        rawHeaders: webhookData.headers ? JSON.parse(JSON.stringify(webhookData.headers)) : null,
        spamScore: webhookData.spam_score ? parseFloat(webhookData.spam_score) : null,
        processingStatus: 'received'
      }).returning({ id: inboundEmailLog.id });
      emailLogId = logEntry.id;
      console.log(`📊 [${webhookId}] Logged inbound email to database (ID: ${emailLogId}, User: ${userId}, Booking: ${bookingId})`);
    } catch (logError) {
      console.error(`❌ [${webhookId}] Failed to log inbound email:`, logError);
      // Don't fail the webhook if logging fails
    }

    console.log(`🔵 [${webhookId}] Booking reply detected - User: ${userId}, Booking: ${bookingId}`);
    logWebhookActivity(`[${webhookId}] Booking reply detected`, { userId, bookingId, recipient: toField });

    // Store immediately in cloud storage as client message
    try {
      const { uploadToCloudflareR2 } = await import('./core/cloud-storage');

      // Clean the email content to extract only the client's actual reply
      let cleanedContent = webhookData.text || '';

      if (webhookData.text) {
        // Split into lines and extract only the client's reply (before quoted content)
        const lines = webhookData.text.split('\n');
        const replyLines = [];

        for (const line of lines) {
          const cleanLine = line.trim();

          // Stop at common quoted content markers
          if (cleanLine.startsWith('>') ||
              cleanLine.match(/^On .* wrote:/i) ||
              cleanLine.match(/^On .* at .* wrote:/i) ||
              cleanLine.match(/^-----Original Message-----/i) ||
              cleanLine.includes('________________________________') ||
              cleanLine.includes('From:') && replyLines.length > 0) {
            break;
          }

          replyLines.push(line);
        }

        cleanedContent = replyLines.join('\n').trim();
        console.log(`📧 [${webhookId}] Cleaned email - Original: ${webhookData.text.length} chars, Cleaned: ${cleanedContent.length} chars`);
      }

      // Create HTML content for the reply message with cleaned content
      const messageHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Client Reply - ${subjectField}</title>
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
            <strong>From:</strong> ${fromField}<br>
            <strong>Subject:</strong> ${subjectField}<br>
            <strong>Date:</strong> ${new Date().toLocaleString()}<br>
            <strong>Booking ID:</strong> ${bookingId}
        </div>
    </div>
    <div class="message-content">
        ${cleanedContent.replace(/\n/g, '<br>') || 'No content'}
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
      const { storage } = await import('./core/storage');
      await storage.createMessageNotification({
        userId: userId,
        bookingId: bookingId,
        senderEmail: fromField,
        subject: subjectField,
        messageUrl: fileName,
        isRead: false,
        createdAt: new Date()
      });

      console.log(`✅ [${webhookId}] Client reply stored successfully: ${fileName}`);
      logWebhookActivity(`[${webhookId}] Client reply stored successfully`, { fileName, userId, bookingId });

      return res.status(200).json({
        status: 'ok',
        type: 'booking_reply',
        bookingId,
        userId,
        webhookId: webhookId
      });

    } catch (error: any) {
      console.error(`❌ [${webhookId}] Failed to store client reply:`, error);
      logWebhookActivity(`[${webhookId}] Failed to store client reply`, { error: error.message });

      return res.status(200).json({
        status: 'error',
        type: 'booking_reply_failed',
        message: error.message,
        webhookId: webhookId
      });
    }

  } catch (error: any) {
    console.error(`❌ [${webhookId}] WEBHOOK ERROR:`, error);
    console.error(`❌ [${webhookId}] WEBHOOK ERROR STACK:`, error.stack);
    logWebhookActivity(`[${webhookId}] Webhook processing failed`, { error: error.message });

    res.status(200).json({
      status: 'error',
      message: error.message,
      note: 'Returning 200 to prevent SendGrid retries'
    });
  }
});

// SendGrid Support Email Forwarding Webhook (support@musobuddy.com)
app.post('/api/webhook/sendgrid-support', upload.any(), async (req, res) => {
  const webhookId = `sendgrid_sup_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

  console.log(`🆘 [${webhookId}] SendGrid support webhook received`);

  try {
    const webhookData = req.body;
    const fromField = webhookData.from || webhookData.envelope?.from || 'UNKNOWN_SENDER';
    const toField = webhookData.to || webhookData.envelope?.to || 'support@musobuddy.com';
    const subjectField = webhookData.subject || 'UNKNOWN_SUBJECT';

    console.log(`🆘 [${webhookId}] FROM: ${fromField}`);
    console.log(`🆘 [${webhookId}] TO: ${toField}`);
    console.log(`🆘 [${webhookId}] SUBJECT: ${subjectField}`);

    // Log to database
    try {
      const { inboundEmailLog } = await import('@shared/schema');
      const attachments = (req.files as any[]) || [];
      await db.insert(inboundEmailLog).values({
        webhookType: 'support',
        fromEmail: fromField,
        toEmail: toField,
        subject: subjectField,
        textContent: webhookData.text,
        htmlContent: webhookData.html,
        attachmentCount: attachments.length,
        attachmentNames: attachments.length > 0 ? attachments.map(f => f.originalname) : null,
        rawHeaders: webhookData.headers ? JSON.parse(JSON.stringify(webhookData.headers)) : null,
        spamScore: webhookData.spam_score ? parseFloat(webhookData.spam_score) : null,
        processingStatus: 'received'
      });
      console.log(`📊 [${webhookId}] Logged support email to database`);
    } catch (logError) {
      console.error(`❌ [${webhookId}] Failed to log support email:`, logError);
    }

    // Forward to musobuddy@gmail.com
    const { emailService } = await import('./core/email-provider-abstraction');

    await emailService.sendEmail({
      to: 'musobuddy@gmail.com',
      fromEmail: 'support@musobuddy.com',
      fromName: 'MusoBuddy Support',
      replyTo: fromField,
      subject: `[Support] ${subjectField}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <div style="background: #f5f5f5; padding: 15px; border-left: 4px solid #673ab7; margin-bottom: 20px;">
            <h3 style="margin: 0 0 10px 0;">Support Email Received</h3>
            <p style="margin: 5px 0;"><strong>From:</strong> ${fromField}</p>
            <p style="margin: 5px 0;"><strong>To:</strong> ${toField}</p>
            <p style="margin: 5px 0;"><strong>Subject:</strong> ${subjectField}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date().toLocaleString()}</p>
          </div>
          <div style="padding: 20px; background: white; border: 1px solid #ddd;">
            ${webhookData.html || webhookData.text?.replace(/\n/g, '<br>') || 'No content'}
          </div>
        </div>
      `,
      text: `Support Email from ${fromField}\n\nSubject: ${subjectField}\n\n${webhookData.text || 'No content'}`
    });

    console.log(`✅ [${webhookId}] Support email forwarded to musobuddy@gmail.com`);

    res.status(200).json({
      status: 'success',
      message: 'Support email forwarded',
      webhookId: webhookId
    });

  } catch (error: any) {
    console.error(`❌ [${webhookId}] Support webhook error:`, error);

    res.status(200).json({
      status: 'error',
      message: error.message,
      note: 'Returning 200 to prevent SendGrid retries'
    });
  }
});

// ===== EMAIL BOUNCE WEBHOOKS =====
// These endpoints receive bounce notifications from email providers

// SendGrid Bounce Webhook Handler
app.post('/api/webhook/sendgrid/bounce', express.json(), async (req, res) => {
  const webhookId = `sendgrid_bounce_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

  console.log(`⚠️ [${webhookId}] SendGrid bounce webhook received`);

  try {
    const events = Array.isArray(req.body) ? req.body : [req.body];

    console.log(`📧 [${webhookId}] Processing ${events.length} bounce event(s)`);

    const { parseSendGridBounce, bounceHandler } = await import('./core/bounce-handler');

    for (const event of events) {
      console.log(`🔍 [${webhookId}] Event type: ${event.event}, Email: ${event.email}`);

      // Parse the SendGrid bounce event
      const bounceData = parseSendGridBounce(event);

      if (bounceData) {
        console.log(`📨 [${webhookId}] Processing ${bounceData.bounceType} bounce for ${bounceData.email}`);

        // Process the bounce through the bounce handler
        await bounceHandler.processBounce(bounceData);

        console.log(`✅ [${webhookId}] Bounce processed successfully for ${bounceData.email}`);
      } else {
        console.log(`⏭️ [${webhookId}] Event type '${event.event}' is not a bounce - skipping`);
      }
    }

    // Always return 200 to acknowledge receipt
    res.status(200).json({
      status: 'success',
      message: 'Bounce events processed',
      webhookId: webhookId,
      eventsProcessed: events.length
    });

  } catch (error: any) {
    console.error(`❌ [${webhookId}] SendGrid bounce webhook error:`, error);
    console.error(`❌ [${webhookId}] Error stack:`, error.stack);

    // Return 200 even on error to prevent SendGrid retries
    res.status(200).json({
      status: 'error',
      message: error.message,
      webhookId: webhookId,
      note: 'Returning 200 to prevent retries'
    });
  }
});

// Mailgun Bounce Webhook Handler
app.post('/api/webhook/mailgun/bounce', express.json(), async (req, res) => {
  const webhookId = `mailgun_bounce_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

  console.log(`⚠️ [${webhookId}] Mailgun bounce webhook received`);

  try {
    const webhookData = req.body;

    console.log(`🔍 [${webhookId}] Event type: ${webhookData['event-data']?.event}, Recipient: ${webhookData['event-data']?.recipient}`);

    const { parseMailgunBounce, bounceHandler } = await import('./core/bounce-handler');

    // Parse the Mailgun bounce event
    const bounceData = parseMailgunBounce(webhookData);

    if (bounceData) {
      console.log(`📨 [${webhookId}] Processing ${bounceData.bounceType} bounce for ${bounceData.email}`);

      // Process the bounce through the bounce handler
      await bounceHandler.processBounce(bounceData);

      console.log(`✅ [${webhookId}] Bounce processed successfully for ${bounceData.email}`);

      res.status(200).json({
        status: 'success',
        message: 'Bounce event processed',
        webhookId: webhookId
      });
    } else {
      console.log(`⏭️ [${webhookId}] Event type is not a bounce - skipping`);

      res.status(200).json({
        status: 'skipped',
        message: 'Not a bounce event',
        webhookId: webhookId
      });
    }

  } catch (error: any) {
    console.error(`❌ [${webhookId}] Mailgun bounce webhook error:`, error);
    console.error(`❌ [${webhookId}] Error stack:`, error.stack);

    // Return 200 even on error to prevent Mailgun retries
    res.status(200).json({
      status: 'error',
      message: error.message,
      webhookId: webhookId,
      note: 'Returning 200 to prevent retries'
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
                           session.metadata?.is_beta_user === 'true' ||
                           user.isBetaTester; // Also check existing beta status
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

  // Final setup for production: add static file serving
  console.log('✅ Server initialization complete - all routes and middleware ready');
}

// ===== SCHEDULED JOBS =====
// Start background jobs for email bounce monitoring

// Check for deferred emails stuck for 24+ hours (runs every hour)
console.log('🕐 Starting deferred email monitoring job...');
const { bounceHandler } = await import('./core/bounce-handler');

// Run immediately on startup
bounceHandler.checkStuckDeferrals().catch(error => {
  console.error('❌ Initial deferred check failed:', error);
});

// Then run every hour
setInterval(async () => {
  try {
    await bounceHandler.checkStuckDeferrals();
  } catch (error) {
    console.error('❌ Deferred check job failed:', error);
  }
}, 60 * 60 * 1000); // Every hour

console.log('✅ Deferred email monitoring active (checks every hour)');

// Start email retry job for soft bounces (runs every 4 hours)
console.log('🔄 Starting email retry scheduler...');
const { startEmailRetryScheduler } = await import('./jobs/email-retry-job');
startEmailRetryScheduler();
console.log('✅ Email retry scheduler active (runs every 4 hours)');

// CRITICAL FIX: Start server listening IMMEDIATELY for fast health check response
// Health endpoints (/ping, /health, /) are registered above and respond immediately
// Other routes are registered asynchronously after the server starts listening
const port = parseInt(process.env.PORT || '5000', 10);
// Note: isProduction is already declared at the top of the file

console.log(`🔍 Environment: NODE_ENV=${process.env.NODE_ENV}, REPLIT_DEPLOYMENT=${process.env.REPLIT_DEPLOYMENT}`);
console.log(`🚀 Starting server on port ${port} (binding to 0.0.0.0)...`);

if (isProduction) {
  // PRODUCTION: Start listening IMMEDIATELY so health checks pass during deployment
  console.log('🏭 Production mode: starting server immediately for fast health checks');
  
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`✅ Production server listening on http://0.0.0.0:${port}`);
    console.log(`🏓 Health check endpoints ready: /ping, /health, /`);
    console.log(`⏳ Registering application routes in background...`);
    
    // Run async initialization AFTER server is listening to register remaining routes
    // Health checks will pass immediately while routes are being registered
    initializeServer()
      .then(() => {
        // Add static file serving after routes are initialized
        return import('./core/serve-static').then(({ serveStaticFixed }) => {
          serveStaticFixed(app);
          console.log('✅ Static file serving configured');
        });
      })
      .then(() => {
        // Mark server as fully initialized
        serverInitialized = true;
        console.log('🎉 Production server fully initialized - all routes ready');
      })
      .catch(error => {
        console.error('❌ CRITICAL: Failed to initialize application routes:', error);
        console.error('❌ Shutting down server due to initialization failure');
        // Exit the process on initialization failure to prevent running a broken server
        server.close(() => {
          process.exit(1);
        });
      });
  });
  
  // Handle server errors
  server.on('error', (err: any) => {
    console.error('❌ Production server error:', err);
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${port} is already in use`);
    }
    process.exit(1);
  });
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  });
  
} else {
  // DEVELOPMENT: Use traditional flow with Vite
  console.log('🛠️ Development mode: initializing with Vite');
  
  initializeServer()
    .then(async () => {
      const { setupVite } = await import('./vite');
      const { createServer } = await import('http');
      const server = createServer(app);
      
      await setupVite(app, server);
      
      server.listen(port, '0.0.0.0', () => {
        serverInitialized = true;
        console.log(`🚀 Development server with Vite running on http://0.0.0.0:${port}`);
      });
      
      server.on('error', (err: any) => {
        console.error('❌ Server error:', err);
        process.exit(1);
      });
    })
    .catch(error => {
      console.error('❌ Failed to start development server:', error);
      process.exit(1);
    });
}