import express from 'express';
import session from 'express-session';
import { Anthropic } from '@anthropic-ai/sdk';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const app = express();

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

// Simple Mailgun webhook handler
app.post('/api/webhook/mailgun', async (req, res) => {
  try {
    console.log('📧 🚨 MAILGUN WEBHOOK RECEIVED 🚨:', new Date().toISOString());
    console.log('📧 Request headers:', JSON.stringify(req.headers, null, 2));
    console.log('📧 Request body keys:', Object.keys(req.body));
    console.log('📧 Full request body:', JSON.stringify(req.body, null, 2));
    
    // Handle event webhooks (delivery status, etc.)
    if (req.body.event) {
      console.log(`📧 Event webhook: ${req.body.event} - acknowledged`);
      return res.status(200).json({ success: true, event: req.body.event });
    }
    
    // Handle storage webhooks (large emails/attachments)
    if (req.body.storage && req.body.storage.url) {
      console.log('📧 Storage webhook - fetching email content from storage');
      
      try {
        // Fetch email content from Mailgun storage
        const storageUrl = req.body.storage.url[0];
        const { default: fetch } = await import('node-fetch');
        const storageResponse = await fetch(storageUrl, {
          headers: {
            'Authorization': `Basic ${Buffer.from(`api:${process.env.MAILGUN_API_KEY}`).toString('base64')}`
          }
        });
        
        if (storageResponse.ok) {
          const emailData = await storageResponse.json();
          
          // Extract email fields from stored content
          const bodyText = emailData['body-plain'] || emailData['stripped-text'] || emailData.text || '';
          const fromEmail = emailData.from || emailData.sender || '';
          const subject = emailData.subject || '';
          const recipient = emailData.recipient || emailData.to || '';
          
          if (fromEmail && bodyText && recipient) {
            // Process the fetched email through normal queue
            const { enhancedEmailQueue } = await import('./core/email-queue-enhanced');
            const { jobId, queuePosition } = await enhancedEmailQueue.addEmail({
              from: fromEmail,
              subject,
              'body-plain': bodyText,
              recipient
            });
            
            console.log(`✅ Storage email processed - Job ${jobId}`);
            return res.status(200).json({ success: true, message: 'Storage email processed', jobId, queuePosition });
          }
        }
      } catch (error) {
        console.error('❌ Failed to fetch from storage:', error);
      }
      
      console.log('📧 Storage webhook acknowledged (could not process content)');
      return res.status(200).json({ success: true, message: 'Storage webhook acknowledged' });
    }
    
    // Process actual email content
    const bodyText = req.body['body-plain'] || req.body['stripped-text'] || req.body.text || '';
    const fromEmail = req.body.from || req.body.sender || '';
    const subject = req.body.subject || '';
    const recipient = req.body.recipient || req.body.to || '';
    
    if (!fromEmail || !bodyText || !recipient) {
      console.log('❌ Missing email fields');
      return res.status(400).json({ success: false, error: 'Missing fields' });
    }
    
    // Use the enhanced email queue for processing
    const { enhancedEmailQueue } = await import('./core/email-queue-enhanced');
    const { jobId, queuePosition } = await enhancedEmailQueue.addEmail({
      from: fromEmail,
      subject,
      'body-plain': bodyText,
      recipient
    });
    
    const result = { success: true, message: 'Email processed', jobId, queuePosition };
    
    console.log('✅ Email processed:', result);
    res.status(200).json(result);
    
  } catch (error: any) {
    console.error('❌ Webhook error:', error);
    res.status(200).json({ success: false, error: error.message });
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