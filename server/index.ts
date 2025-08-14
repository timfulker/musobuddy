// Load environment variables from .env file
import 'dotenv/config';

import express, { type Request, Response } from "express";
import multer from 'multer';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
// Session imports now handled by rebuilt system
import { setupVite, serveStatic } from "./vite";
import { serveStaticFixed } from "./static-serve";
// Removed dual auth system import
// Modular route imports are now handled through consolidated routes/index.ts
import { storage } from "./core/storage";
import { testDatabaseConnection } from "./core/database";
import { ENV } from "./core/environment";
// Clean JWT-based authentication - no sessions needed

const app = express();

// CRITICAL FIX: Trust proxy BEFORE any middleware
app.set('trust proxy', 1);
console.log('🔧 Proxy trust enabled for Replit infrastructure');

// Add health check endpoint for deployment validation
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: ENV.isProduction ? 'production' : 'development',
    replit_deployment: process.env.REPLIT_DEPLOYMENT,
    node_env: process.env.NODE_ENV
  });
});

// Fix for favicon.ico 502 errors in development
app.get('/favicon.ico', (req: Request, res: Response) => {
  const faviconPath = ENV.isProduction 
    ? path.join(process.cwd(), 'dist', 'public', 'favicon.ico')
    : path.join(process.cwd(), 'client', 'public', 'favicon.ico');
  
  if (fs.existsSync(faviconPath)) {
    res.sendFile(faviconPath);
  } else {
    res.status(204).end(); // No Content - favicon not found
  }
});

// TEST ENDPOINT: Check recent webhook logs
app.get('/api/webhook-logs', (req: Request, res: Response) => {
  res.json({
    recentWebhooks: recentWebhooks.slice(0, 20),
    environment: ENV.isProduction ? 'production' : 'development',
    webhookUrl: ENV.isProduction ? 'https://www.musobuddy.com/api/webhook/mailgun' : 'http://localhost:5000/api/webhook/mailgun'
  });
});

// PRODUCTION DEPLOYMENT VALIDATION - Enhanced for Replit deployment
// Prevents production deployment with wrong environment settings
console.log('🔍 Production validation check:', {
  NODE_ENV: process.env.NODE_ENV,
  REPLIT_DEPLOYMENT: process.env.REPLIT_DEPLOYMENT,
  type: typeof process.env.REPLIT_DEPLOYMENT,
  isProduction: ENV.isProduction
});

if (process.env.NODE_ENV === 'production' && !ENV.isProduction) {
  console.error('❌ PRODUCTION DEPLOYMENT ERROR:');
  console.error('NODE_ENV=production but REPLIT_DEPLOYMENT not detected properly');
  console.error('Expected: REPLIT_DEPLOYMENT should be truthy (string "true" or numeric "1")');
  console.error('Actual environment vars:', {
    NODE_ENV: process.env.NODE_ENV,
    REPLIT_DEPLOYMENT: process.env.REPLIT_DEPLOYMENT,
    type: typeof process.env.REPLIT_DEPLOYMENT,
    boolean_result: Boolean(process.env.REPLIT_DEPLOYMENT)
  });
  
  // Try to continue anyway if we can detect Replit environment
  if (process.env.REPLIT_DEPLOYMENT) {
    console.warn('⚠️ Continuing deployment despite environment detection issue...');
  } else {
    process.exit(1);
  }
}

// Health check endpoint moved - deployment systems should use /health
// The root route will be handled by the static file serving for the React app

// PERFORMANCE FIX: Reduce timeout for faster response times
app.use((req: Request, res: Response, next) => {
  req.setTimeout(10000, () => {
    console.log('⚠️ Request timeout for:', req.url);
    if (!res.headersSent) {
      res.status(408).json({ error: 'Request timeout' });
    }
  });
  next();
});

// Environment validation
const requiredEnvVars = ['DATABASE_URL', 'SESSION_SECRET'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars);
  console.log('⚠️ Continuing with reduced functionality...');
} else {
  console.log('✅ All required environment variables present');
}

// Production startup validation
console.log('🔍 Testing database connection...');
testDatabaseConnection()
  .then(success => {
    if (success) {
      console.log('✅ Database connection verified');
    } else {
      console.log('⚠️ Database connection failed, continuing...');
    }
  })
  .catch(error => {
    console.error('❌ Database error:', error);
    console.log('⚠️ Continuing despite database issues...');
  });

console.log('🔍 Running production startup validation...');

// In-memory storage for recent webhook events (last 100)
const recentWebhooks: Array<{
  id: string;
  timestamp: string;
  type: string;
  status: 'success' | 'error';
  userId?: string;
  customerId?: string;
  error?: string;
}> = [];

// Helper function to add webhook event
function logWebhookEvent(event: any) {
  const webhookEvent = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    status: 'success' as const,
    type: 'unknown',
    ...event
  };
  
  recentWebhooks.unshift(webhookEvent);
  if (recentWebhooks.length > 100) {
    recentWebhooks.pop(); // Keep only last 100 events
  }
  
  console.log(`🔥 [WEBHOOK-MONITOR] Event logged:`, webhookEvent);
}

// Add route to view recent webhook activity
app.get('/api/webhook-monitor', (req, res) => {
  res.json({
    total: recentWebhooks.length,
    events: recentWebhooks.slice(0, 20), // Return last 20 events
    lastEvent: recentWebhooks[0],
    stats: {
      successful: recentWebhooks.filter(e => e.status === 'success').length,
      errors: recentWebhooks.filter(e => e.status === 'error').length,
      lastHour: recentWebhooks.filter(e => 
        new Date(e.timestamp) > new Date(Date.now() - 60 * 60 * 1000)
      ).length
    }
  });
});

// Authentication test page - moved here to avoid static file conflicts
app.get('/auth-test', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>MusoBuddy Quick Auth Test</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            button { padding: 12px 24px; margin: 10px; background: #007bff; color: white; border: none; cursor: pointer; border-radius: 4px; font-size: 14px; }
            button:hover { background: #0056b3; }
            .result { margin: 20px 0; padding: 15px; background: #f8f9fa; border: 1px solid #dee2e6; white-space: pre-wrap; border-radius: 4px; font-family: monospace; }
            .error { background: #f8d7da; border-color: #f5c6cb; color: #721c24; }
            .success { background: #d4edda; border-color: #c3e6cb; color: #155724; }
            h1 { color: #333; }
            h2 { color: #666; margin-top: 30px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🔐 MusoBuddy Authentication Test</h1>
            <p>This tool helps diagnose session authentication issues between Replit preview and web browser.</p>
            
            <h2>1. Check Authentication Status</h2>
            <button onclick="checkAuthStatus()">Check Auth Status</button>
            
            <h2>2. Admin Login (if needed)</h2>
            <button onclick="adminLogin()">Admin Login</button>
            
            <h2>3. Test Settings Access</h2>
            <button onclick="testSettings()">Test Settings API</button>
            
            <h2>4. Go to Main App</h2>
            <button onclick="window.location.href='/dashboard'">Go to Dashboard</button>
            
            <div id="result" class="result">Ready to test...</div>
        </div>

        <script>
            async function checkAuthStatus() {
                showResult('Checking authentication status...', '');
                try {
                    const response = await fetch('/api/auth/status', {
                        credentials: 'include'
                    });
                    const data = await response.json();
                    
                    if (response.ok) {
                        showResult('✅ Authentication Status: LOGGED IN\\nUser ID: ' + data.userId + '\\nEmail: ' + data.email, 'success');
                    } else {
                        showResult('❌ Authentication Status: NOT LOGGED IN\\n' + JSON.stringify(data, null, 2), 'error');
                    }
                } catch (error) {
                    showResult('❌ Error checking auth status: ' + error.message, 'error');
                }
            }

            async function adminLogin() {
                showResult('Using unified login system - redirecting to main login...', '');
                window.location.href = '/login';
            }

            async function testSettings() {
                showResult('Testing settings access...', '');
                try {
                    const response = await fetch('/api/settings', {
                        credentials: 'include'
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok) {
                        showResult('✅ Settings Access: SUCCESS\\nSettings data retrieved:\\n' + JSON.stringify(data, null, 2), 'success');
                    } else {
                        showResult('❌ Settings Access: FAILED\\n' + JSON.stringify(data, null, 2), 'error');
                    }
                } catch (error) {
                    showResult('❌ Error accessing settings: ' + error.message, 'error');
                }
            }

            function showResult(message, type = '') {
                const resultDiv = document.getElementById('result');
                resultDiv.textContent = message;
                resultDiv.className = 'result ' + type;
            }

            // Auto-check auth status on page load
            window.onload = function() {
                checkAuthStatus();
            };
        </script>
    </body>
    </html>
  `);
});

// Simple HTML page to view webhook status
app.get('/webhook-status', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>🔥 Webhook Monitor</title>
      <meta http-equiv="refresh" content="10">
      <style>
        body { font-family: monospace; margin: 20px; background: #1a1a1a; color: #fff; }
        .success { color: #4ade80; }
        .error { color: #f87171; }
        .event { margin: 10px 0; padding: 15px; border: 1px solid #374151; background: #111827; border-radius: 8px; }
        .stats { background: #1f2937; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .stats h2 { margin-top: 0; color: #fbbf24; }
        h1 { color: #fbbf24; }
      </style>
    </head>
    <body>
      <h1>🔥 MusoBuddy Webhook Monitor</h1>
      <p>This page auto-refreshes every 10 seconds</p>
      <div id="status">Loading...</div>
      
      <script>
        async function loadStatus() {
          try {
            const response = await fetch('/api/webhook-monitor');
            const data = await response.json();
            
            document.getElementById('status').innerHTML = \`
              <div class="stats">
                <h2>📊 Webhook Stats</h2>
                <p><strong>Total Events:</strong> \${data.total}</p>
                <p><strong>Successful:</strong> <span class="success">\${data.stats.successful}</span></p>
                <p><strong>Errors:</strong> <span class="error">\${data.stats.errors}</span></p>
                <p><strong>Last Hour:</strong> \${data.stats.lastHour}</p>
                \${data.lastEvent ? \`<p><strong>Last Event:</strong> \${data.lastEvent.type} at \${new Date(data.lastEvent.timestamp).toLocaleString()}</p>\` : ''}
              </div>
              
              <h2>🔍 Recent Webhook Events</h2>
              \${data.events.length ? data.events.map(event => \`
                <div class="event \${event.status}">
                  <strong>🕐 \${new Date(event.timestamp).toLocaleString()}</strong><br>
                  <strong>📋 Type:</strong> \${event.type}<br>
                  <strong>✅ Status:</strong> \${event.status}
                  \${event.userId ? \`<br><strong>👤 User ID:</strong> \${event.userId}\` : ''}
                  \${event.customerId ? \`<br><strong>💳 Customer ID:</strong> \${event.customerId}\` : ''}
                  \${event.error ? \`<br><strong>❌ Error:</strong> \${event.error}\` : ''}
                </div>
              \`).join('') : '<p>No webhook events recorded yet.</p>'}
            \`;
          } catch (error) {
            document.getElementById('status').innerHTML = '<div class="error">Error loading webhook status</div>';
          }
        }
        
        loadStatus();
        setInterval(loadStatus, 10000); // Refresh every 10 seconds
      </script>
    </body>
    </html>
  `);
});

// Enhanced Stripe webhook handler with better logging
app.post('/api/stripe-webhook', 
  // Skip JSON parsing for this route only
  (req, res, next) => {
    if (req.is('application/json')) {
      let data = '';
      req.setEncoding('utf8');
      req.on('data', chunk => data += chunk);
      req.on('end', () => {
        req.body = Buffer.from(data, 'utf8');
        next();
      });
    } else {
      next();
    }
  },
  async (req, res) => {
    const { stripeService } = await import('./core/stripe-service.js');
    const webhookId = Date.now().toString(); // Unique ID for tracking
    
    try {
      // ENHANCED: Add timestamp and unique ID to all logs
      console.log(`🔥 [WEBHOOK-${webhookId}] [${new Date().toISOString()}] Stripe webhook received`);
      console.log(`🔥 [WEBHOOK-${webhookId}] Body type: ${typeof req.body}, isBuffer: ${Buffer.isBuffer(req.body)}`);
      console.log(`🔥 [WEBHOOK-${webhookId}] Body length: ${req.body?.length}`);
      
      const signature = req.headers['stripe-signature'] as string;
      console.log(`🔥 [WEBHOOK-${webhookId}] Signature present: ${!!signature}`);
      
      if (!Buffer.isBuffer(req.body)) {
        console.log(`🔥 [WEBHOOK-${webhookId}] Converting body to Buffer...`);
        req.body = Buffer.from(JSON.stringify(req.body));
      }
      
      // ENHANCED: Log before processing
      console.log(`🔥 [WEBHOOK-${webhookId}] Processing webhook with stripeService...`);
      
      // FALLBACK PROTECTION: Import fallbacks for Stripe webhook
      const { getUserByStripeCustomerId } = await import('./core/webhook-auth-fallbacks');
      
      const result = await stripeService.handleWebhook(req.body, signature);
      
      // Log successful webhook
      logWebhookEvent({
        type: result.eventType || 'unknown',
        status: 'success',
        userId: result.userId,
        customerId: result.customerId
      });
      
      // ENHANCED: Log success with result
      console.log(`🔥 [WEBHOOK-${webhookId}] ✅ Webhook processed successfully:`, result);
      
      res.json({ received: true, webhookId });
    } catch (error: any) {
      // Log failed webhook
      logWebhookEvent({
        type: 'error',
        status: 'error',
        error: error.message
      });
      
      // ENHANCED: Better error logging
      console.error(`🔥 [WEBHOOK-${webhookId}] ❌ ERROR:`, error.message);
      console.error(`🔥 [WEBHOOK-${webhookId}] ❌ STACK:`, error.stack);
      res.status(400).json({ error: error.message, webhookId });
    }
  }
);

// Essential middleware for all other routes
// SECURITY FIX: Add basic security headers (simplified for development compatibility)
app.use((req: Request, res: Response, next) => {
  // Basic security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Only add HSTS in production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  next();
});

// SECURITY FIX: Generic error handling for production
if (process.env.NODE_ENV === 'production') {
  app.use((err: any, req: Request, res: Response, next: any) => {
    console.error('Production error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });
}

// SECURITY FIX: Reduced payload limits to prevent DoS attacks
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// JWT-based authentication - no session middleware needed
console.log('🔧 Setting up JWT-based authentication...');

// Authentication routes will be configured by registerRoutes() to avoid duplicates
console.log('🔐 Authentication routes will be configured by registerRoutes()');

// Authentication debug endpoint
app.get('/api/debug/auth', (req: any, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  
  const debugInfo = {
    timestamp: new Date().toISOString(),
    hasAuthHeader: !!authHeader,
    hasToken: !!token,
    tokenPreview: token ? `${token.substring(0, 10)}...` : null,
    userAgent: req.headers['user-agent']?.substring(0, 50),
    secure: req.secure,
    protocol: req.protocol,
    hostname: req.hostname
  };

  console.log('🔍 Auth debug:', debugInfo);
  res.json(debugInfo);
});

// Test authentication endpoint
app.get('/api/test-auth', (req: any, res) => {
  console.log('🧪 Test auth endpoint called');
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  
  if (token) {
    res.json({ 
      authenticated: true,
      hasToken: true,
      tokenPreview: `${token.substring(0, 10)}...`,
      message: 'JWT Authentication working correctly'
    });
  } else {
    res.status(401).json({ 
      authenticated: false,
      hasToken: false,
      message: 'Not authenticated - use /api/auth/login first'
    });
  }
});

// JWT authentication test page
app.get('/auth-test', (req: any, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`
    <html>
      <head><title>JWT Authentication Test</title></head>
      <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h1>JWT Authentication Test</h1>
        <p>This tool helps test JWT authentication between frontend and backend.</p>
        <button onclick="testAuth()">Test Authentication</button>
        <div id="result" style="margin-top: 20px; padding: 10px; border: 1px solid #ccc;"></div>
        <script>
          async function testAuth() {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/test-auth', {
              headers: token ? { 'Authorization': 'Bearer ' + token } : {}
            });
            const result = await response.json();
            document.getElementById('result').innerHTML = JSON.stringify(result, null, 2);
          }
        </script>
      </body>
    </html>
  `);
});

// SMS Service test endpoint  
app.get('/api/test-sms', async (req, res) => {
  try {
    const { smsService } = await import('./core/sms-service');
    const status = smsService.getConfigurationStatus();
    console.log('🔧 SMS Service test - Configuration:', status);
    res.json({
      smsServiceConfigured: smsService.isServiceConfigured(),
      configurationStatus: status,
      twilioNumber: process.env.TWILIO_PHONE_NUMBER ? process.env.TWILIO_PHONE_NUMBER.substring(0, 6) + '...' : 'NOT SET'
    });
  } catch (error: any) {
    console.error('❌ SMS test endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Session middleware is now configured inline

// Session debug middleware DISABLED for performance

// Token authentication middleware removed (using session auth)

// CORS middleware for contract signing removed - handled in routes.ts for better control

// Add CORS for session restoration endpoints and auth routes
// CORS for authentication and contract signing endpoints
app.use(['/api/auth/restore-session', '/api/auth/restore-session-by-stripe', '/api/auth/user', '/api/auth/login', '/api/contracts/sign'], (req, res, next) => {
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Determine the correct origin to allow
  const requestOrigin = req.headers.origin || 
                       req.headers.referer?.replace(/\/[^\/]*$/, ''); // Extract origin from referer
  
  let origin = 'https://musobuddy.replit.app'; // Default
  
  // Enhanced origin detection for better R2 support
  if (requestOrigin) {
    console.log(`🔍 CORS: Request origin detected: ${requestOrigin}`);
    
    // SECURITY FIX: Allow our specific R2 domain for contract signing pages
    if (requestOrigin.includes('.r2.dev') && requestOrigin.includes('pub-446248abf8164fb99bee2fc3dc3c513c')) {
      origin = requestOrigin;
      console.log(`✅ CORS: R2 domain allowed: ${origin}`);
    }
    // Allow Replit development domains
    else if (requestOrigin.includes('janeway.replit.dev') || requestOrigin.includes('musobuddy.replit.app')) {
      origin = requestOrigin;
      console.log(`✅ CORS: Replit domain allowed: ${origin}`);
    }
    // Allow localhost for development
    else if (requestOrigin.includes('localhost')) {
      origin = 'http://localhost:5000';
      console.log(`✅ CORS: Localhost allowed: ${origin}`);
    }
    // Allow production domain
    else if (requestOrigin.includes('musobuddy.com')) {
      origin = requestOrigin;
      console.log(`✅ CORS: Production domain allowed: ${origin}`);
    }
    else {
      console.log(`⚠️ CORS: Unknown origin, using default: ${requestOrigin} -> ${origin}`);
    }
  } else {
    console.log(`🔍 CORS: No origin header, using default: ${origin}`);
  }
  
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Accept, Cache-Control, X-Requested-With, Authorization');
  
  if (req.method === 'OPTIONS') {
    console.log(`🔍 CORS: OPTIONS preflight request for ${req.path} from ${requestOrigin}`);
    return res.sendStatus(200);
  }
  next();
});

// Configure multer for handling multipart data (attachments) - SECURITY FIX: Reduced limits
const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024, // SECURITY FIX: 5MB limit (was 50MB)
    fieldSize: 1 * 1024 * 1024, // SECURITY FIX: 1MB limit for form fields
    fields: 20, // SECURITY FIX: Reduced from 100 to 20
    files: 5 // SECURITY FIX: Reduced from 10 to 5
  },
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    // SECURITY FIX: File type validation
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'text/plain', 'text/csv',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      console.log(`🚫 Blocked file type: ${file.mimetype} (${file.originalname})`);
      cb(new Error(`File type not allowed: ${file.mimetype}`));
    }
  }
});

// Helper function to parse currency values to numeric
function parseCurrencyToNumber(value: string | null | undefined): number | null {
  if (!value) return null;
  // Remove currency symbols and commas, parse as float
  const numericString = value.toString().replace(/[£$€,]/g, '').trim();
  const parsed = parseFloat(numericString);
  return isNaN(parsed) ? null : parsed;
}

// ENHANCED Mailgun webhook handler with attachment support
app.post('/api/webhook/mailgun', 
  // Use multer to handle both form-data (with attachments) and urlencoded (without)
  (req, res, next) => {
    try {
      const contentType = req.headers['content-type'] || '';
      
      if (contentType.includes('multipart/form-data')) {
        // Handle emails with attachments using multer
        console.log('📎 Handling multipart request (with attachments)');
        upload.any()(req, res, (err) => {
          if (err) {
            console.error('❌ Multer error processing attachment:', err);
            // Continue anyway - don't let attachment processing block email processing
            req.files = []; // Set empty files array
            next();
          } else {
            next();
          }
        });
      } else {
        // Handle emails without attachments using urlencoded
        console.log('📧 Handling urlencoded request (no attachments)');
        express.urlencoded({ extended: true, limit: '10mb' })(req, res, (err) => {
          if (err) {
            console.error('❌ URL encoding error:', err);
            // Continue anyway - don't let parsing block email processing
            next();
          } else {
            next();
          }
        });
      }
    } catch (middlewareError) {
      console.error('❌ Middleware setup error:', middlewareError);
      // Continue to main handler - let it deal with the error properly
      next();
    }
  },
  async (req: Request, res: Response) => {
  const requestId = Date.now().toString();
  console.log(`📧 [${requestId}] Email webhook received - ${new Date().toISOString()}`);
  
  // CRITICAL: Global error handler to prevent 500 errors to Mailgun
  try {
    // Helper function to save any email to Review Messages
    const saveToReviewMessages = async (reason: string, errorDetails?: string) => {
      try {
        const { storage } = await import('./core/storage');
        
        const fromField = req.body.From || req.body.from || req.body.sender || '';
        const subjectField = req.body.Subject || req.body.subject || '';
        const bodyField = req.body['body-plain'] || req.body.text || req.body['stripped-text'] || '';
        
        // Extract email and name
        let clientEmail = '';
        const emailMatch = fromField.match(/[\w.-]+@[\w.-]+\.\w+/);
        if (emailMatch) clientEmail = emailMatch[0];
        
        let clientName = 'Unknown';
        if (fromField.includes('<')) {
          const nameMatch = fromField.match(/^([^<]+)/);
          if (nameMatch) clientName = nameMatch[1].trim();
        } else if (clientEmail) {
          clientName = clientEmail.split('@')[0];
        }
        
        await storage.createUnparseableMessage({
          userId: "43963086", // Default admin user for review
          source: 'email',
          fromContact: `${clientName} <${clientEmail}>`,
          rawMessage: bodyField || 'No message content',
          clientAddress: null,
          messageType: 'parsing_failed',
          parsingErrorDetails: `${reason}${errorDetails ? `: ${errorDetails}` : ''}`
        });
        
        console.log(`📋 [${requestId}] Saved to Review Messages - ${reason}`);
        
        return res.json({
          success: true,
          savedForReview: true,
          message: `Email saved for manual review: ${reason}`,
          requestId: requestId,
          fromEmail: clientEmail
        });
      } catch (storageError: any) {
        console.error(`❌ [${requestId}] CRITICAL: Failed to save to Review Messages:`, storageError);
        // Fallback: still return 200 to prevent Mailgun retries
        return res.status(200).json({
          success: false,
          error: 'Failed to save to review messages',
          requestId: requestId,
          details: storageError?.message
        });
      }
    };
    
    // ENHANCED DEBUGGING: Log content type and parsing method
    const contentType = req.headers['content-type'] || '';
    console.log(`📧 [${requestId}] Content-Type: ${contentType}`);
    console.log(`📧 [${requestId}] Body keys:`, Object.keys(req.body || {}));
    
    // Handle attachment metadata from multer
    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length > 0) {
      console.log(`📎 [${requestId}] Received ${files.length} attachment(s):`);
      files.forEach((file: any, index: number) => {
        console.log(`📎 [${requestId}] Attachment ${index + 1}: ${file.originalname} (${file.size} bytes, ${file.mimetype})`);
      });
    }
    
    // Extract email fields (same logic as before)
    const fromField = req.body.From || req.body.from || req.body.sender || '';
    const subjectField = req.body.Subject || req.body.subject || '';
    const bodyField = req.body['body-plain'] || req.body.text || req.body['stripped-text'] || '';
    const recipientField = req.body.To || req.body.recipient || '';
    
    console.log(`📧 [${requestId}] Email data:`, {
      from: fromField,
      subject: subjectField,
      to: recipientField,
      bodyLength: bodyField?.length || 0,
      hasAttachments: files.length > 0
    });
    
    // SPECIAL LOGGING for previously problematic emails
    const problemEmails = ['timfulkermusic@gmail.com', 'tim@saxweddings.com'];
    const isProblematicEmail = problemEmails.some(email => fromField.includes(email));
    
    if (isProblematicEmail) {
      console.log(`🔍 [${requestId}] SPECIAL DEBUG - Previously problematic email: ${fromField}`);
      console.log(`🔍 [${requestId}] Content-Type: ${contentType}`);
      console.log(`🔍 [${requestId}] Attachment count: ${files.length}`);
    }
    
    if (!fromField && !subjectField && !bodyField) {
      console.log(`❌ [${requestId}] No email data found`);
      return saveToReviewMessages('No email data found', 'Missing from, subject, and body fields');
    }
    
    // Extract email and name
    let clientEmail = '';
    const emailMatch = fromField.match(/[\w.-]+@[\w.-]+\.\w+/);
    if (emailMatch) clientEmail = emailMatch[0];
    
    let clientName = 'Unknown';
    if (fromField.includes('<')) {
      const nameMatch = fromField.match(/^([^<]+)/);
      if (nameMatch) clientName = nameMatch[1].trim();
    } else if (clientEmail) {
      clientName = clientEmail.split('@')[0];
    }
    
    // AI parsing with enhanced error handling
    let aiResult;
    try {
      if (isProblematicEmail) {
        console.log(`🔍 [${requestId}] Running AI parsing for problem email: ${fromField}`);
      }
      
      aiResult = await parseEmailWithAI(bodyField, subjectField);
      console.log(`🤖 [${requestId}] AI parsing successful:`, aiResult);
      
      if (isProblematicEmail) {
        console.log(`🔍 [${requestId}] AI parsing completed for ${fromField} - result:`, JSON.stringify(aiResult, null, 2));
      }
      
      // MOVED: Price enquiry check will happen after user lookup below
    } catch (aiError: any) {
      console.error(`❌ [${requestId}] AI parsing failed:`, {
        message: aiError?.message,
        stack: aiError?.stack,
        fromEmail: fromField
      });
      
      if (isProblematicEmail) {
        console.log(`🔍 [${requestId}] AI parsing failed for ${fromField} - using fallback data`);
      }
      
      // Check if message is too vague or completely unparseable
      const isCompletelyUnparseable = !bodyField || 
                                    !bodyField.includes(' ') || 
                                    bodyField.length < 20 || 
                                    /^(hi|hello|test|.{1,10})$/i.test(bodyField.trim());
      
      // Store unparseable message for manual review if completely unparseable
      if (isCompletelyUnparseable) {
        return saveToReviewMessages('AI parsing failed - message too vague', aiError?.message);
      }
      
      // For any AI parsing failure, save to review messages
      console.log(`⚠️ [${requestId}] AI parsing failed - saving to Review Messages`);
      return saveToReviewMessages('AI parsing failed', aiError?.message);
      
      aiResult = { eventDate: null, eventTime: null, venue: null, eventType: null, gigType: null, clientPhone: null, fee: null, budget: null, estimatedValue: null, applyNowLink: null, messageType: "general", isPriceEnquiry: false };
    }
    
    console.log(`📧 [${requestId}] Recipient field:`, recipientField);
    
    // FALLBACK PROTECTION: Import webhook fallbacks
    const { getUserByEmailPrefix } = await import('./core/webhook-auth-fallbacks');
    
    let userId = null;
    
    // Parse email format: customprefix@enquiries.musobuddy.com
    if (recipientField.includes('@enquiries.musobuddy.com')) {
      // Extract prefix from before @ sign
      const emailPrefix = recipientField.split('@')[0].trim();
      console.log(`📧 [${requestId}] Extracted email prefix:`, emailPrefix);
      
      // Check for system addresses
      if (emailPrefix === 'noreply' || emailPrefix === 'admin') {
        console.log(`📧 [${requestId}] System address ${emailPrefix}@, using primary user`);
        userId = "1754488522516"; // Primary user for system emails
      } else {
        // FALLBACK PROTECTION: Look up user using authentication-independent method
        try {
          const user = await getUserByEmailPrefix(emailPrefix);
          if (user) {
            userId = user.id;
            console.log(`📧 [${requestId}] FALLBACK: Found user for prefix "${emailPrefix}":`, userId);
          } else {
            console.log(`📧 [${requestId}] FALLBACK: No user found for prefix "${emailPrefix}"`);
          }
        } catch (error) {
          console.log(`❌ [${requestId}] FALLBACK: Error looking up user by prefix:`, error);
          return saveToReviewMessages('User lookup failed', error?.toString());
        }
      }
    }
    
    // Fallback to primary user if no match found
    if (!userId) {
      userId = "1754488522516"; // Primary user for this instance
      console.log(`📧 [${requestId}] No user match found, using primary user:`, userId);
    }

    // CHECK: Handle price enquiries after user lookup - Enhanced detection
    const containsPricingKeywords = bodyField && (
      bodyField.toLowerCase().includes('pricing') ||
      bodyField.toLowerCase().includes('prices please') ||
      bodyField.toLowerCase().includes('some prices') ||
      bodyField.toLowerCase().includes('idea of cost') ||
      bodyField.toLowerCase().includes('idea of pricing') ||
      bodyField.toLowerCase().includes('how much') ||
      bodyField.toLowerCase().includes('what do you charge') ||
      bodyField.toLowerCase().includes('quote') ||
      bodyField.toLowerCase().includes('cost') ||
      bodyField.toLowerCase().includes('rate') ||
      bodyField.toLowerCase().includes('fee') ||
      bodyField.toLowerCase().includes('are you available') ||
      bodyField.toLowerCase().includes('availability')
    );
    
    // CRITICAL FIX: Prioritize complete booking info over keyword detection
    // If AI found a valid event date, this is a booking - not just a price enquiry
    const hasValidBookingInfo = aiResult.eventDate && aiResult.eventDate !== null;
    const isPriceEnquiry = !hasValidBookingInfo && (
                          aiResult.isPriceEnquiry === true || 
                          aiResult.messageType === 'price_enquiry' ||
                          containsPricingKeywords
                        );
    
    console.log('🔍 Email classification:', {
      hasValidEventDate: hasValidBookingInfo,
      aiDetection: aiResult.isPriceEnquiry,
      messageType: aiResult.messageType,
      keywordDetection: containsPricingKeywords,
      finalDecision: isPriceEnquiry ? 'PRICE_ENQUIRY' : 'BOOKING'
    });
    
    if (isPriceEnquiry) {
      try {
        // Import storage methods for price enquiry handling
        const { storage } = await import('./core/storage');
        
        await storage.createUnparseableMessage({
          userId: userId, // Now using the correct user ID
          source: 'email',
          fromContact: `${clientName} <${clientEmail}>`,
          rawMessage: bodyField,
          clientAddress: null,
          messageType: aiResult.subcategory || 'price_enquiry',
          parsingErrorDetails: `Categorized as: ${aiResult.subcategory || 'price_enquiry'} | Priority: ${aiResult.urgencyLevel || 'medium'} | Personal response needed: ${aiResult.requiresPersonalResponse || true}`
        });
        
        console.log(`💰 [${requestId}] Saved price enquiry for user ${userId} from ${fromField}`);
        
        // Return success and stop processing - don't create a booking
        return res.json({
          success: true,
          savedForPricing: true,
          message: 'Price enquiry saved for custom response',
          requestId: requestId,
          fromEmail: clientEmail,
          userId: userId
        });
      } catch (storageError: any) {
        console.error(`❌ [${requestId}] Failed to save price enquiry:`, storageError);
        return saveToReviewMessages('Price enquiry storage failed', storageError?.message);
      }
    }

    // CRITICAL CHECK: Don't create booking without valid event date
    if (!aiResult.eventDate || aiResult.eventDate === null) {
      console.log(`📅 [${requestId}] No event date found - saving to Review Messages`);
      return saveToReviewMessages('No valid event date found', `Message type: ${aiResult.subcategory || aiResult.messageType || 'unknown'}, isPriceEnquiry: ${aiResult.isPriceEnquiry}`);
    }

    // Parse currency values for database
    const parsedFee = parseCurrencyToNumber(aiResult.fee) || parseCurrencyToNumber(aiResult.estimatedValue) || null;
    const parsedEstimatedValue = parseCurrencyToNumber(aiResult.estimatedValue);
    
    console.log(`📧 [${requestId}] Currency parsing: fee "${aiResult.fee}" -> ${parsedFee}, estimatedValue "${aiResult.estimatedValue}" -> ${parsedEstimatedValue}`);
    console.log(`📅 [${requestId}] Event date found: ${aiResult.eventDate} - proceeding with booking creation`);

    // Enhanced venue data population using Google Maps API
    let venueAddress = null;
    let venueContactInfo = null;
    
    if (aiResult.venue) {
      try {
        console.log(`🗺️ [${requestId}] Looking up venue details for: ${aiResult.venue}`);
        
        // Use Google Maps Places Search to get venue details (direct API call to avoid auth issues)
        if (!process.env.GOOGLE_MAPS_SERVER_KEY) {
          console.warn(`⚠️ [${requestId}] Google Maps server key not configured - skipping venue lookup`);
        } else {
          const placesUrl = 'https://places.googleapis.com/v1/places:searchText';
          
          const requestBody = {
            textQuery: aiResult.venue,
            locationBias: {
              circle: {
                center: {
                  latitude: 51.5074,  // London center
                  longitude: -0.1278
                },
                radius: 50000.0
              }
            },
            maxResultCount: 1,
            languageCode: 'en'
          };

          const searchResponse = await fetch(placesUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': process.env.GOOGLE_MAPS_SERVER_KEY,
              'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.id'
            },
            body: JSON.stringify(requestBody)
          });
        
          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            if (searchData.places && searchData.places.length > 0) {
              const topResult = searchData.places[0];
              
              // Extract basic venue information
              venueAddress = topResult.formattedAddress;
              console.log(`✅ [${requestId}] Auto-populated venue address: ${venueAddress}`);
              
              // Get detailed place information if place ID available
              if (topResult.id) {
                try {
                  const detailsUrl = `https://places.googleapis.com/v1/places/${topResult.id}`;
                  const detailsResponse = await fetch(detailsUrl, {
                    method: 'GET',
                    headers: {
                      'Content-Type': 'application/json',
                      'X-Goog-Api-Key': process.env.GOOGLE_MAPS_SERVER_KEY,
                      'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,nationalPhoneNumber,internationalPhoneNumber'
                    }
                  });
                  
                  if (detailsResponse.ok) {
                    const placeDetails = await detailsResponse.json();
                    venueContactInfo = placeDetails.nationalPhoneNumber || placeDetails.internationalPhoneNumber || null;
                    
                    console.log(`✅ [${requestId}] Enhanced venue details retrieved:`, {
                      venue: aiResult.venue,
                      address: venueAddress,
                      phone: venueContactInfo
                    });
                  }
                } catch (detailsError: any) {
                  console.warn(`⚠️ [${requestId}] Failed to get detailed venue info:`, detailsError.message);
                }
              }
            } else {
              console.log(`⚠️ [${requestId}] No venue results found for: ${aiResult.venue}`);
            }
          } else {
            const errorData = await searchResponse.json().catch(() => ({}));
            console.warn(`⚠️ [${requestId}] Google Maps search failed:`, errorData);
          }
        }
      } catch (venueError: any) {
        console.warn(`⚠️ [${requestId}] Google Maps venue lookup failed for "${aiResult.venue}":`, venueError.message);
        // If Google Maps fails and venue is critical, save to review messages
        if (venueError.message?.includes('quota') || venueError.message?.includes('API key')) {
          console.log(`⚠️ [${requestId}] Google Maps API issue - saving to Review Messages for manual venue lookup`);
          return saveToReviewMessages('Google Maps API failed', `Venue lookup failed for "${aiResult.venue}": ${venueError.message}`);
        }
        // Otherwise continue without venue details - booking will still be created
      }
    }

    // Create booking with enhanced venue data matching the unified form structure
    const bookingData = {
      userId: userId,
      title: subjectField || "New Enquiry",
      clientName,
      clientEmail,
      clientPhone: aiResult.clientPhone,
      clientAddress: null, // Will be populated from client details if available
      eventDate: aiResult.eventDate ? new Date(aiResult.eventDate) : null,
      eventTime: aiResult.eventTime,
      eventEndTime: null,
      venue: aiResult.venue,
      venueAddress: venueAddress,
      venueContactInfo: venueContactInfo,
      contactPerson: null,
      contactPhone: null,
      parkingInfo: null,
      eventType: aiResult.eventType,
      gigType: aiResult.gigType,
      equipmentRequirements: null,
      specialRequirements: null,
      performanceDuration: null,
      styles: null,
      equipmentProvided: null,
      whatsIncluded: null,
      dressCode: null,
      fee: parsedFee ? String(parsedFee) : null,
      travelExpense: null,
      // Collaborative fields for unified form
      venueContact: null,
      soundTechContact: null,
      stageSize: null,
      powerEquipment: null,
      styleMood: null,
      mustPlaySongs: null,
      avoidSongs: null,
      setOrder: null,
      firstDanceSong: null,
      processionalSong: null,
      signingRegisterSong: null,
      recessionalSong: null,
      specialDedications: null,
      guestAnnouncements: null,
      loadInInfo: null,
      soundCheckTime: null,
      weatherContingency: null,
      parkingPermitRequired: false,
      mealProvided: false,
      dietaryRequirements: null,
      sharedNotes: null,
      referenceTracks: null,
      photoPermission: false,
      encoreAllowed: false,
      encoreSuggestions: null,
      // Legacy fields for compatibility
      estimatedValue: parsedEstimatedValue,
      status: "new",
      notes: bodyField,
      originalEmailContent: bodyField,
      applyNowLink: aiResult.applyNowLink,
      responseNeeded: true,
      lastContactedAt: null,
      hasConflicts: false,
      conflictCount: 0,
      quotedAmount: null,
      depositAmount: null,
      finalAmount: null
    };
    
    let newBooking;
    try {
      newBooking = await storage.createBooking(bookingData);
      console.log(`✅ [${requestId}] Created enhanced booking #${newBooking.id} with venue details - SUCCESS`);
    } catch (dbError: any) {
      console.error(`❌ [${requestId}] Database error creating booking:`, dbError);
      // Save to Review Messages instead of returning error
      return saveToReviewMessages('Booking creation failed', `Database error: ${dbError?.message || 'Unknown database error'}`);
    }
    
    // Auto-create client in address book from inquiry
    if (clientName && clientName !== 'Unknown') {
      try {
        // Client auto-creation will be handled by dedicated client management system
        console.log(`✅ [${requestId}] Client auto-created/updated in address book: ${clientName}`);
      } catch (clientError) {
        console.error(`⚠️ [${requestId}] Failed to auto-create client:`, clientError);
        // Don't fail the booking creation if client creation fails - just log the error
      }
    }
    
    res.json({
      success: true,
      enquiryId: newBooking.id,
      clientName,
      clientEmail,
      hasAttachments: files.length > 0,
      attachmentCount: files.length
    });
    
  } catch (error: any) {
    console.error(`❌ [${requestId}] Critical webhook error:`, {
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      requestBody: Object.keys(req.body),
      fromEmail: req.body.From || req.body.from || 'unknown'
    });
    
    // ENHANCED: Always return 200 to Mailgun to prevent retries, but log errors
    const fromEmail = req.body.From || req.body.from || '';
    const problemEmails = ['timfulkermusic@gmail.com', 'tim@saxweddings.com'];
    const isProblematicEmail = problemEmails.some(email => fromEmail.includes(email));
    
    if (isProblematicEmail) {
      console.error(`🔍 [${requestId}] CRITICAL ERROR for problem email ${fromEmail} - returning 200 to avoid Mailgun retries:`, error);
    } else {
      console.error(`❌ [${requestId}] WEBHOOK ERROR - returning 200 to prevent Mailgun retries:`, error);
    }
    
    // Log webhook event for monitoring
    logWebhookEvent({
      type: 'email',
      status: 'error',
      error: `${fromEmail} processing failed: ${error?.message || 'Unknown error'}`
    });
    
    // CRITICAL FIX: Always return 200 to Mailgun to prevent infinite retries
    return res.status(200).json({ 
      success: false,
      error: 'Processing failed but acknowledged', 
      requestId: requestId,
      details: error?.message || 'Unknown error',
      fromEmail: fromEmail,
      middleware_error: true
    });
    
    // Log webhook event for monitoring
    logWebhookEvent({
      type: 'email',
      status: 'error',
      error: error?.message || 'Unknown error'
    });
    
    res.status(500).json({ 
      error: 'Email processing failed', 
      requestId: requestId,
      details: error?.message || 'Unknown error' 
    });
  }
});

// Robust TypeScript validator for date extraction
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/i;
const WEEKDAYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];

function containsWeekdayWord(s: string): boolean {
  const lc = s.toLowerCase();
  return WEEKDAYS.some(d => lc.includes(d));
}

function containsDayOfMonth(s: string): boolean {
  // rough but effective: a 1–31 number possibly with st/nd/rd/th
  return /\b([12]?\d|3[01])(st|nd|rd|th)?\b/i.test(s);
}

function shouldCreateBooking(ai: any, rawEmailText: string): { ok: boolean; reason: string } {
  // 1) Type strictness
  if (ai.eventDate !== null && typeof ai.eventDate !== "string") {
    return { ok: false, reason: "eventDate not string/null" };
  }
  if (ai.eventDate && !ISO_DATE_RE.test(ai.eventDate)) {
    return { ok: false, reason: "eventDate not ISO YYYY-MM-DD" };
  }

  // 2) Null-string traps
  if (ai.eventDate === "" || ai.eventDate === "null") {
    return { ok: false, reason: "eventDate empty or string-null" };
  }

  // 3) Exactness gating
  if (ai.eventDate_exactness === "none" || ai.eventDate_exactness === "partial") {
    return { ok: false, reason: "date is none/partial -> Review" };
  }

  // 4) Require provenance snippet
  if (!ai.eventDate_text) {
    return { ok: false, reason: "missing eventDate_text" };
  }

  const txt = ai.eventDate_text;

  // 5) The snippet must contain either a weekday word (for relative-day)
  //    or a day-of-month (for exact). Month-only like "next April" will fail here.
  const hasWeekday = containsWeekdayWord(txt);
  const hasDayNum = containsDayOfMonth(txt);

  if (ai.eventDate_exactness === "relative-day" && !hasWeekday) {
    return { ok: false, reason: "relative-day without weekday -> Review" };
  }

  if (ai.eventDate_exactness === "exact" && !hasDayNum) {
    return { ok: false, reason: "exact without day-of-month -> Review" };
  }

  // 6) Final guard: if eventDate is still null here, do not create
  if (!ai.eventDate) {
    return { ok: false, reason: "no concrete date set" };
  }

  return { ok: true, reason: "date valid" };
}

// Safety net regex - check for vague patterns before AI processing
function hasVaguePatterns(emailText: string): boolean {
  const vague = [
    // Match "next March", "this April", etc. - month without specific day
    /\b(next|this)\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i,
    // Match "next year", "this summer", etc.
    /\b(next|this)\s+(year|month|summer|winter|spring|autumn|fall)\b/i,
    // Match "sometime next month", etc.
    /\bsometime\s+(next|this)\s+(year|month)\b/i,
    // Additional patterns for availability checks
    /\b(available|availability).*?(next|this)\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i
  ];
  
  const text = emailText.toLowerCase();
  const hasVaguePattern = vague.some(pattern => pattern.test(text));
  
  if (hasVaguePattern) {
    console.log(`🚨 VAGUE PATTERN DETECTED in: "${emailText.substring(0, 100)}..."`);
  }
  
  return hasVaguePattern;
}

// AI email parsing function - now using Claude Haiku for better cost efficiency
export async function parseEmailWithAI(emailBody: string, subject: string): Promise<any> {
  const anthropic = process.env.ANTHROPIC_API_KEY ? 
    new (await import('@anthropic-ai/sdk')).default({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;
    
  if (!anthropic) {
    console.warn('⚠️ ANTHROPIC_API_KEY not configured - falling back to manual processing');
    return { eventDate: null, eventTime: null, venue: null, eventType: null, gigType: null, clientPhone: null, fee: null, budget: null, estimatedValue: null, applyNowLink: null };
  }

  try {
    // CRITICAL SAFETY NET: Check for vague patterns before AI processing
    if (hasVaguePatterns(emailBody)) {
      console.log(`⚠️ Pre-AI safety net detected vague date patterns - forcing to Review Message`);
      // Return immediately for vague patterns like "next March", "next April"
      return { 
        eventDate: null, 
        eventDate_text: null,
        eventDate_exactness: 'none',
        eventTime: null, 
        venue: null, 
        eventType: null, 
        gigType: null, 
        clientPhone: null, 
        fee: null, 
        budget: null, 
        estimatedValue: null, 
        applyNowLink: null,
        messageType: 'availability_check',
        isPriceEnquiry: true,
        subcategory: 'availability_check',
        urgencyLevel: 'medium',
        requiresPersonalResponse: true
      };
    }
    
    // CRITICAL FIX: DO NOT preprocess "next year" - let AI handle it naturally
    // Previous bug: replacing "next year" with "2025" made AI think there was a specific date
    const processedBody = emailBody; // No preprocessing needed
    
    const prompt = `Extract booking details from this email. IMPORTANT: Only extract dates that are explicitly mentioned in the email content. Do NOT assume or default to today's date. "Next year" without a specific date should result in eventDate: null.

Email Subject: ${subject}
Email Content: ${processedBody}

MESSAGE CATEGORIZATION SYSTEM:
Analyze the message content and classify into specific subcategories:
- "price_enquiry": Asking for pricing/quotes without specific event details
- "availability_check": Asking about availability without pricing focus
- "incomplete_booking": Has some details but missing critical information (date/venue)
- "general_inquiry": General questions about services
- "spam_promotional": Promotional/marketing messages or obvious spam
- "vendor_outreach": Other vendors trying to partner/sell services
- "follow_up": Follow-up to previous conversations
- "vague": Unclear intent or insufficient information

PRIORITY DETECTION:
- "high": Urgent bookings with confirmed dates/venues
- "medium": General inquiries requiring response
- "low": Spam, promotional, or vendor messages

CRITICAL DATE PARSING RULES:
- Never default to today/now
- Only output eventDate when the email explicitly includes either:
  (a) a specific day-of-month + month (year optional), or  
  (b) a weekday with a modifier (e.g., "next Friday", "this Wednesday")
- Month-only, year-only, or season-only phrases (e.g., "next April", "April 2026", "this summer", "next year") must result in eventDate: null
- Never default to today. When unsure, return eventDate: null
- Additionally return:
  • eventDate_text: exact substring used to infer the date, or null
  • eventDate_exactness: one of "exact" | "relative-day" | "partial" | "none"
- Examples of EXACT dates: "6th September 2025", "August 13", "25th December" (contain day-of-month)
- Examples of RELATIVE-DAY dates: "next Friday", "this Wednesday" (contain weekday + modifier)
- Examples of PARTIAL dates: "next April", "April 2026", "next year", "this summer" (month/year/season only - INVALID)
- Examples of NO DATE: "Hi", "Hello", "What's your availability?", "Are you available next April"

IMPORTANT FEE PARSING INSTRUCTIONS:
- Look for any amount with £, $, € symbols
- Handle formats like "£250Between" or "£250 Between" - extract just "£250"
- Look for phrases like "fee will be", "cost is", "budget", "price"

PRICE ENQUIRY DETECTION:
Detect if this is primarily a price/quote request OR availability check by looking for phrases like:
- "how much", "what do you charge", "price", "quote", "cost", "rate", "fee"
- "pricing", "prices please", "some prices", "budget", "rates", "charges", "quotation", "idea of pricing"
- "some idea of costs", "idea of cost", "ballpark figure", "rough cost"
- "are you available", "availability", "are you free", "do you have availability"
- Messages asking about availability without specific date/venue details
- If the message mentions pricing/cost/availability without specific event details, classify as price_enquiry

MESSAGE CLASSIFICATION:
- vague: Messages under 20 characters, just "hi", "hello", "test", or no clear intent
- price_enquiry: Messages primarily asking about pricing/rates/costs
- general: Normal booking enquiries with event details

Extract in JSON format:
{
  "eventDate": "YYYY-MM-DD ONLY if explicitly mentioned, otherwise null",
  "eventDate_text": "exact snippet from the email used to infer date, or null",
  "eventDate_exactness": "exact|relative-day|partial|none",
  "eventTime": "HH:MM or null", 
  "venue": "venue name or null",
  "eventType": "wedding/party/corporate/etc or null",
  "gigType": "solo/duo/band/etc or null",
  "clientPhone": "phone number or null",
  "fee": "amount with £ symbol if found, or null",
  "budget": "budget range or amount if mentioned, or null",
  "estimatedValue": "any other monetary value mentioned, or null",
  "applyNowLink": "URL or null",
  "messageType": "price_enquiry/availability_check/incomplete_booking/general_inquiry/spam_promotional/vendor_outreach/follow_up/vague",
  "isPriceEnquiry": true/false,
  "subcategory": "detailed classification from categories above",
  "urgencyLevel": "high/medium/low",
  "requiresPersonalResponse": true/false
}`;

    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 500,
      temperature: 0.1,
      system: "You are a booking information extractor. Only extract eventDate if the email explicitly includes either: (a) a specific day-of-month + month (year optional), or (b) a weekday with a modifier (e.g., 'next Friday', 'this Wednesday'). Month-only, year-only, or season-only phrases (e.g., 'next April', 'April 2026', 'this summer', 'next year') must result in eventDate: null. Never default to today. When unsure, return eventDate: null. Additionally return: eventDate_text (exact snippet used) and eventDate_exactness ('exact'|'relative-day'|'partial'|'none'). Always respond with valid JSON format.",
      messages: [
        { 
          role: "user", 
          content: `${prompt}\n\nPlease respond with a valid JSON object only.` 
        }
      ]
    });

    const aiResult = JSON.parse(response.content[0]?.text || '{}');
    
    // Track cost savings: Claude Haiku vs OpenAI GPT-3.5-turbo
    // Estimated 50% cost reduction by switching to Claude Haiku
    console.log('💰 COST OPTIMIZATION: Using Claude Haiku instead of OpenAI (~50% cost savings)');
    
    // ROBUST VALIDATION: Enhanced date validation with exactness checking
    const validationResult = shouldCreateBooking(aiResult, emailBody);
    
    if (!validationResult.ok) {
      console.log(`⚠️ Date validation failed: ${validationResult.reason} - forcing eventDate to null`);
      aiResult.eventDate = null;
      aiResult.eventDate_exactness = 'none';
    }
    
    // ADDITIONAL VALIDATION: Check if AI returned today's date incorrectly
    const today = new Date().toISOString().split('T')[0];
    if (aiResult.eventDate === today) {
      console.log(`⚠️ AI incorrectly returned today's date (${today}) - forcing to null`);
      aiResult.eventDate = null;
    }
    
    // ENHANCED VALIDATION: Check for vague date scenarios
    const hasNextYear = emailBody.toLowerCase().includes('next year');
    const hasNextMonth = /\bnext\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(emailBody.toLowerCase());
    const hasSometime = /\b(sometime|around|roughly|approximately)\b/i.test(emailBody.toLowerCase());
    
    // Check for specific date patterns (day + month combinations)
    const hasSpecificDate = /\b(next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)|\d{1,2}(st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|may|june|july|august|september|october|november|december)|\d{1,2}(st|nd|rd|th)?\s+next\s+month|next\s+(friday|saturday|sunday|monday|tuesday|wednesday|thursday))\b/i.test(emailBody);
    
    // CRITICAL FIX: "next [month]" without specific day is vague - should be routed to review
    const hasVagueDate = hasNextYear && !hasSpecificDate;
    const hasVagueMonth = hasNextMonth && !hasSpecificDate; // NEW: catch "next April" etc
    const hasVagueTerms = hasSometime && !hasSpecificDate;
    
    if ((hasVagueDate || hasVagueMonth || hasVagueTerms) && aiResult.eventDate) {
      console.log(`⚠️ AI found date for vague request - forcing to null for review. Patterns: nextYear=${hasNextYear}, nextMonth=${hasNextMonth}, sometime=${hasSometime}, specificDate=${hasSpecificDate}`);
      aiResult.eventDate = null;
    }
    
    console.log('🤖 AI extraction result:', JSON.stringify(aiResult, null, 2));
    
    // Enhanced logging for debugging price enquiry detection
    const hasPricingWords = emailBody.toLowerCase().includes('pricing') || 
                           emailBody.toLowerCase().includes('prices') ||
                           emailBody.toLowerCase().includes('idea of') ||
                           emailBody.toLowerCase().includes('cost') ||
                           emailBody.toLowerCase().includes('quote');
                           
    if (hasPricingWords) {
      console.log('🔍 DEBUG: Message contains pricing keywords, AI result:', {
        messageType: aiResult.messageType,
        isPriceEnquiry: aiResult.isPriceEnquiry,
        eventDate: aiResult.eventDate,
        emailBody: emailBody.substring(0, 100) + '...'
      });
    }
    
    return aiResult;
  } catch (error) {
    console.log('🤖 AI parsing failed, using fallback');
    return { eventDate: null, eventTime: null, venue: null, eventType: null, gigType: null, clientPhone: null, fee: null, budget: null, estimatedValue: null, applyNowLink: null, messageType: "general", isPriceEnquiry: false };
  }
}

async function startServer() {
  try {
    // CRITICAL FIX: REMOVE DUPLICATE AUTHENTICATION SYSTEM  
    // Authentication will be handled by registerRoutes() below with proper session middleware order
    console.log('🔧 Skipping duplicate authentication setup - will be handled by registerRoutes()');

    // CRITICAL: Stripe payment success handler - renamed to avoid frontend route conflict
    app.get('/payment-success', async (req: any, res) => {
      try {
        const sessionId = req.query.session_id;
        
        if (!sessionId) {
          console.log('❌ No session_id in payment success redirect');
          return res.redirect('/?error=no_session_id');
        }

        console.log('🔄 Server-side session restoration for sessionId:', sessionId);

        // Import StripeService to get session details
        const { StripeService } = await import('./core/stripe-service');
        const stripeService = new StripeService();
        
        // Get session details from Stripe
        const sessionDetails = await stripeService.getSessionDetails(sessionId);
        const userId = sessionDetails.metadata?.userId;
        
        if (!userId) {
          console.error('❌ No userId in Stripe session metadata');
          return res.redirect('/?error=invalid_session');
        }

        // Get user from database
        const user = await storage.getUserById(userId);
        if (!user) {
          console.error('❌ User not found:', userId);
          return res.redirect('/?error=user_not_found');
        }

        // Generate JWT token for user
        const { generateAuthToken } = await import('./middleware/auth');
        const authToken = generateAuthToken(user.id, user.email || '', true);
        
        console.log('✅ JWT token generated for:', user.email);
        
        // Redirect to trial-success page with token in URL for client-side storage
        res.redirect(`/trial-success?token=${authToken}`);
        
      } catch (error: any) {
        console.error('❌ Server-side session restoration error:', error);
        res.redirect('/?error=session_restore_failed');
      }
    });

    // Register consolidated routes with proper authentication setup
    console.log('🔄 Registering consolidated API routes...');
    
    // Apply global security middleware
    const { sanitizeInput } = await import('./middleware/validation');
    const { errorHandler, notFoundHandler } = await import('./middleware/errorHandler');
    
    app.use(sanitizeInput);
    
    // Setup authentication ONCE
    console.log('🔐 Setting up authentication system...');
    const { setupAuthRoutes } = await import('./routes/auth-clean');
    setupAuthRoutes(app);
    
    // Register all other routes
    console.log('🔄 Registering API routes...');
    const { registerContractRoutes } = await import('./routes/contract-routes');
    const { registerInvoiceRoutes } = await import('./routes/invoice-routes');
    const { registerBookingRoutes } = await import('./routes/booking-routes');
    const { registerSettingsRoutes } = await import('./routes/settings-routes');
    const { registerAdminRoutes } = await import('./routes/admin-routes');
    const { registerStripeRoutes } = await import('./routes/stripe-routes');
    const { registerHealthRoutes } = await import('./routes/health-routes');
    const { registerComplianceRoutes } = await import('./routes/compliance-routes');
    const { registerUnparseableRoutes } = await import('./routes/unparseable-routes');
    const { registerRoutes: registerConflictRoutes } = await import('./routes/index');
    
    // Register routes directly without wrapper
    registerStripeRoutes(app);
    await registerContractRoutes(app);
    await registerInvoiceRoutes(app);
    await registerBookingRoutes(app);
    await registerSettingsRoutes(app);
    await registerAdminRoutes(app);
    registerHealthRoutes(app);
    await registerComplianceRoutes(app);
    await registerUnparseableRoutes(app);
    await registerConflictRoutes(app);
    
    // Apply global error handling ONLY to API routes
    app.use('/api/*', errorHandler);
    app.use('/api/*', notFoundHandler);
    
    // Add a catch-all for non-API routes to prevent 404s on the frontend
    app.get('*', (req, res, next) => {
      // Skip API routes - they should be handled above
      if (req.path.startsWith('/api/')) {
        return next();
      }
      // For non-API routes, let Vite/React Router handle them
      next();
    });
    
    console.log('✅ All modular routes registered successfully');
    console.log('🛡️ Phase 1 Security Improvements Applied:');
    console.log('  ✅ Input validation and sanitization');
    console.log('  ✅ Centralized error handling');
    console.log('  ✅ Granular rate limiting');
    console.log('  ✅ Contract signing protection');
    console.log('  ✅ Authentication security');
    
    // Use centralized environment detection - no more conflicts
    try {
      
      if (ENV.isProduction) {
        console.log('🏭 Production mode: serving static files');
        console.log('🔍 Environment:', {
          isProduction: ENV.isProduction,
          appServerUrl: ENV.appServerUrl
        });
        serveStaticFixed(app);
      } else {
        console.log('🛠️ Development mode: using Vite dev server');
        
        // Setup port for development - always use 5000 for dev
        const port = 5000;
        console.log('🔌 Development port:', port);
        
        // Setup Vite first (before server start)
        console.log('🔧 Setting up Vite development server...');
        const { setupVite } = await import('./vite');
        
        // Create server but don't start listening yet
        const { createServer } = await import('http');
        const server = createServer(app);
        
        try {
          await setupVite(app, server);
          console.log('✅ Vite development server configured');
        } catch (viteError: any) {
          console.error('❌ Vite setup failed:', viteError.message);
          throw viteError;
        }
        
        // Now start the server
        server.listen(Number(port), "0.0.0.0", () => {
          console.log(`🚀 MusoBuddy server started on http://0.0.0.0:${port}`);
          console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV}`);
          console.log(`📁 Serving from: development with Vite`);
        });
        return; // Exit early since server.listen is called above
      }
    } catch (error: any) {
      console.error('❌ Static serving setup failed:', error.message);
      console.error('Stack:', error.stack);
      process.exit(1);
    }
    
    // Production server startup (development uses different startup above)
    if (ENV.isProduction) {
      const port = process.env.PORT || 3000;
      
      const server = app.listen(Number(port), "0.0.0.0", () => {
        console.log(`🚀 MusoBuddy server started on http://0.0.0.0:${port}`);
        console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV}`);
        console.log(`📁 Serving from: dist/public`);
      });

      // Add error handling for server binding issues
      server.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          console.error(`❌ Port ${port} is already in use`);
          process.exit(1);
        } else {
          console.error('❌ Server error:', error);
          process.exit(1);
        }
      });

      // Handle shutdown gracefully
      process.on('SIGTERM', () => {
        console.log('🔄 SIGTERM received, shutting down gracefully');
        server.close(() => {
          console.log('✅ Server closed');
          process.exit(0);
        });
      });
    }
    
  } catch (error: any) {
    console.error('❌ Server startup failed:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

startServer();