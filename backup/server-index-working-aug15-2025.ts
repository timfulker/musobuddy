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

// CORS middleware for R2-hosted collaborative forms
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://pub-446248abf8164fb99bee2fc3dc3c513c.r2.dev');
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

// Session setup
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false,
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  }
}));

// Health check endpoints for deployment
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/', (req, res, next) => {
  // If it's an explicit API health check or a curl/health check request
  if (req.headers['user-agent']?.includes('GoogleHC') || 
      req.headers['user-agent']?.includes('curl') ||
      req.headers['accept']?.includes('application/json')) {
    return res.status(200).json({ 
      status: 'MusoBuddy API', 
      mode: process.env.NODE_ENV,
      timestamp: new Date().toISOString() 
    });
  }
  
  // In both development and production, let other middleware handle HTML requests
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

// Endpoint to view webhook logs
app.get('/api/webhook/logs', (req, res) => {
  res.json({
    logs: webhookLogs.slice(-20), // Last 20 logs
    total: webhookLogs.length
  });
});

// Enhanced Mailgun webhook handler with multipart support
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
    
  } catch (error: any) {
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

  // Register all API routes
  const { registerRoutes } = await import('./routes');
  await registerRoutes(app);

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
    
    server.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Development server running on http://0.0.0.0:${port}`);
    });
  } else {
    // Production
    console.log('🏭 Production mode: serving static files');
    const { serveStaticFixed } = await import('./core/serve-static');
    serveStaticFixed(app);
    
    app.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Production server running on port ${port}`);
    });
  }
}

// Start the server
initializeServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});