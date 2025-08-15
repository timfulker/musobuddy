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
      req.headers['accept']?.includes('application/json')) {
    return res.status(200).json({ 
      status: 'MusoBuddy API', 
      mode: process.env.NODE_ENV,
      timestamp: new Date().toISOString() 
    });
  }
  
  if (process.env.NODE_ENV === 'production') {
    // In production, let the static serving middleware handle it
    return next();
  }
  
  res.status(200).json({ 
    status: 'MusoBuddy API', 
    mode: process.env.NODE_ENV,
    timestamp: new Date().toISOString() 
  });
});

// Initialize storage and services
const { storage } = await import('./core/storage');
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Original Mailgun webhook handler - restored to working version
app.post('/api/webhook/mailgun', async (req, res) => {
  try {
    const bodyText = req.body['body-plain'] || req.body.text || '';
    const fromEmail = req.body.From || req.body.from || '';
    const subject = req.body.Subject || req.body.subject || '';
    
    console.log('📧 Processing email webhook:', { from: fromEmail, subject });
    
    // Use the enhanced email queue for processing
    const { processEmailInQueue } = await import('./core/email-queue');
    await processEmailInQueue(fromEmail, subject, bodyText);
    
    res.status(200).json({ success: true, message: 'Email processed' });
    
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

// Register all API routes
const { registerRoutes } = await import('./routes');
await registerRoutes(app);

// Start server
// Replit provides PORT env variable, default to 5000
const port = process.env.PORT || 5000;

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