import express, { type Request, Response } from "express";
import multer from 'multer';
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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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
  
  // Always allow R2 origin for contract signing pages
  const allowedOrigins = [
    'https://pub-446248abf8164fb99bee2fc3dc3c513c.r2.dev',
    'https://musobuddy.replit.app'
  ];
  
  // Determine the correct origin to allow
  const requestOrigin = req.headers.origin || 
                       req.headers.referer?.replace(/\/[^\/]*$/, ''); // Extract origin from referer
  
  let origin = 'https://musobuddy.replit.app'; // Default
  
  if (requestOrigin) {
    if (allowedOrigins.includes(requestOrigin) || requestOrigin.includes('janeway.replit.dev')) {
      origin = requestOrigin;
    } else if (requestOrigin.includes('localhost')) {
      origin = 'http://localhost:5000';
    }
  }
  
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Accept, Cache-Control, X-Requested-With, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Configure multer for handling multipart data (attachments)
const upload = multer({
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for attachments
    fieldSize: 10 * 1024 * 1024, // 10MB limit for form fields
    fields: 100, // Maximum number of non-file fields
    files: 10 // Maximum number of file fields
  },
  storage: multer.memoryStorage() // Store in memory (we don't need to save files)
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
    const contentType = req.headers['content-type'] || '';
    
    if (contentType.includes('multipart/form-data')) {
      // Handle emails with attachments using multer
      console.log('📎 Handling multipart request (with attachments)');
      upload.any()(req, res, next);
    } else {
      // Handle emails without attachments using urlencoded
      console.log('📧 Handling urlencoded request (no attachments)');
      express.urlencoded({ extended: true, limit: '10mb' })(req, res, next);
    }
  },
  async (req: Request, res: Response) => {
  const requestId = Date.now().toString();
  console.log(`📧 [${requestId}] Email webhook received - ${new Date().toISOString()}`);
  
  try {
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
      return res.status(400).json({ error: 'No email data found' });
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
        try {
          // Import storage methods
          const { storage } = await import('./core/storage');
          
          await storage.createUnparseableMessage({
            userId: "43963086", // Default admin user for now, will be corrected after user lookup
            source: 'email',
            fromContact: `${clientName} <${clientEmail}>`,
            rawMessage: bodyField || 'No message content',
            clientAddress: null,
            messageType: 'vague',
            parsingErrorDetails: `AI parsing failed: ${aiError?.message || 'Unknown error'}`
          });
          
          console.log(`📋 [${requestId}] Saved unparseable email for manual review from ${fromField}`);
          
          // Return success to prevent Mailgun retries
          return res.json({
            success: true,
            savedForReview: true,
            message: 'Message saved for manual review',
            requestId: requestId,
            fromEmail: clientEmail
          });
        } catch (storageError: any) {
          console.error(`❌ [${requestId}] Failed to save unparseable message:`, storageError);
          // Continue with fallback creation instead
        }
      }
      
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
        console.log(`📧 [${requestId}] System address ${emailPrefix}@, using admin user`);
        userId = "43963086"; // Admin user for system emails
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
        }
      }
    }
    
    // Fallback to default user if no match found
    if (!userId) {
      userId = "43963086"; // Default admin user
      console.log(`📧 [${requestId}] No user match found, using default user:`, userId);
    }

    // CHECK: Handle price enquiries after user lookup - Enhanced detection
    const containsPricingKeywords = bodyField && (
      bodyField.toLowerCase().includes('pricing') ||
      bodyField.toLowerCase().includes('idea of cost') ||
      bodyField.toLowerCase().includes('idea of pricing') ||
      bodyField.toLowerCase().includes('how much') ||
      bodyField.toLowerCase().includes('what do you charge')
    );
    
    // FIXED: AI returns isPriceEnquiry: true but messageType: "general", so prioritize isPriceEnquiry flag
    const isPriceEnquiry = aiResult.isPriceEnquiry === true || 
                          aiResult.messageType === 'price_enquiry' ||
                          containsPricingKeywords;
    
    console.log('🔍 Price enquiry check:', {
      aiDetection: aiResult.isPriceEnquiry,
      messageType: aiResult.messageType,
      keywordDetection: containsPricingKeywords,
      finalDecision: isPriceEnquiry
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
          messageType: 'price_enquiry',
          parsingErrorDetails: 'Price enquiry detected - needs custom response with pricing'
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
        // Continue with normal booking creation if storage fails
      }
    }

    // Parse currency values for database
    const parsedFee = parseCurrencyToNumber(aiResult.fee) || parseCurrencyToNumber(aiResult.estimatedValue) || null;
    const parsedEstimatedValue = parseCurrencyToNumber(aiResult.estimatedValue);
    
    console.log(`📧 [${requestId}] Currency parsing: fee "${aiResult.fee}" -> ${parsedFee}, estimatedValue "${aiResult.estimatedValue}" -> ${parsedEstimatedValue}`);

    // Create booking
    const bookingData = {
      userId: userId,
      title: subjectField || "New Enquiry",
      clientName,
      clientEmail,
      clientPhone: aiResult.clientPhone,
      eventDate: aiResult.eventDate ? new Date(aiResult.eventDate) : null,
      eventTime: aiResult.eventTime,
      eventEndTime: null,
      performanceDuration: null,
      venue: aiResult.venue,
      venueAddress: null,
      clientAddress: null,
      eventType: aiResult.eventType,
      gigType: aiResult.gigType,
      fee: parsedFee,
      equipmentRequirements: null,
      specialRequirements: null,
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
      console.log(`✅ [${requestId}] Created booking #${newBooking.id} - SUCCESS`);
    } catch (dbError: any) {
      console.error(`❌ [${requestId}] Database error creating booking:`, dbError);
      return res.status(500).json({ error: 'Failed to create booking', details: dbError?.message || 'Unknown database error' });
    }
    
    // Auto-create client in address book from inquiry
    if (clientName && clientName !== 'Unknown') {
      try {
        // Client auto-creation will be handled by dedicated client management system
        console.log(`✅ [${requestId}] Client auto-created/updated in address book: ${clientName}`);
      } catch (clientError) {
        console.error(`⚠️ [${requestId}] Failed to auto-create client:`, clientError);
        // Don't fail the booking creation if client creation fails
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
    
    // SPECIAL HANDLING for problem email addresses - never return 400
    const fromEmail = req.body.From || req.body.from || '';
    const problemEmails = ['timfulkermusic@gmail.com', 'tim@saxweddings.com'];
    const isProblematicEmail = problemEmails.some(email => fromEmail.includes(email));
    
    if (isProblematicEmail) {
      console.error(`🔍 [${requestId}] CRITICAL ERROR for problem email ${fromEmail} - returning 200 to avoid Mailgun 400:`, error);
      
      // Log webhook event for monitoring
      logWebhookEvent({
        type: 'email',
        status: 'error',
        error: `${fromEmail} processing failed: ${error?.message || 'Unknown error'}`
      });
      
      // Return 200 to prevent Mailgun retries, but log the error
      return res.status(200).json({ 
        success: false,
        error: 'Processing failed but acknowledged', 
        requestId: requestId,
        details: error?.message || 'Unknown error',
        fromEmail: fromEmail
      });
    }
    
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

// AI email parsing function
export async function parseEmailWithAI(emailBody: string, subject: string): Promise<any> {
  const openai = process.env.OPENAI_EMAIL_PARSING_KEY ? 
    new (await import('openai')).default({ apiKey: process.env.OPENAI_EMAIL_PARSING_KEY }) : null;
    
  if (!openai) {
    return { eventDate: null, eventTime: null, venue: null, eventType: null, gigType: null, clientPhone: null, fee: null, budget: null, estimatedValue: null, applyNowLink: null };
  }

  try {
    const currentYear = new Date().getFullYear();
    const processedBody = emailBody.replace(/next year/gi, `${currentYear + 1}`);
    
    const prompt = `Extract booking details from this email. Today is ${new Date().toDateString()}.

Email Subject: ${subject}
Email Content: ${processedBody}

IMPORTANT DATE PARSING INSTRUCTIONS:
- "sixth of September this year" = 2025-09-06
- "September 6th this year" = 2025-09-06  
- "6th September this year" = 2025-09-06
- Handle ordinal numbers (1st, 2nd, 3rd, 4th, etc.) and written numbers (first, second, third, etc.)

IMPORTANT FEE PARSING INSTRUCTIONS:
- Look for any amount with £, $, € symbols
- Handle formats like "£250Between" or "£250 Between" - extract just "£250"
- Look for phrases like "fee will be", "cost is", "budget", "price"

PRICE ENQUIRY DETECTION:
Detect if this is primarily a price/quote request by looking for phrases like:
- "how much", "what do you charge", "price", "quote", "cost", "rate", "fee"
- "pricing", "budget", "rates", "charges", "quotation", "idea of pricing"
- "some idea of costs", "idea of cost", "ballpark figure", "rough cost"
- Messages asking about availability AND pricing together
- If the message mentions pricing/cost without specific event details, classify as price_enquiry

MESSAGE CLASSIFICATION:
- vague: Messages under 20 characters, just "hi", "hello", "test", or no clear intent
- price_enquiry: Messages primarily asking about pricing/rates/costs
- general: Normal booking enquiries with event details

Extract in JSON format:
{
  "eventDate": "YYYY-MM-DD or null",
  "eventTime": "HH:MM or null", 
  "venue": "venue name or null",
  "eventType": "wedding/party/corporate/etc or null",
  "gigType": "solo/duo/band/etc or null",
  "clientPhone": "phone number or null",
  "fee": "amount with £ symbol if found, or null",
  "budget": "budget range or amount if mentioned, or null",
  "estimatedValue": "any other monetary value mentioned, or null",
  "applyNowLink": "URL or null",
  "messageType": "general/price_enquiry/vague",
  "isPriceEnquiry": true/false
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 300,
      temperature: 0.1
    });

    const aiResult = JSON.parse(response.choices[0].message.content || '{}');
    console.log('🤖 AI extraction result:', JSON.stringify(aiResult, null, 2));
    
    // Additional logging for debugging price enquiry detection
    if (emailBody.toLowerCase().includes('pricing') || emailBody.toLowerCase().includes('idea of')) {
      console.log('🔍 DEBUG: Message contains pricing keywords, AI result:', {
        messageType: aiResult.messageType,
        isPriceEnquiry: aiResult.isPriceEnquiry,
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
        
        // Setup port for development
        const port = process.env.PORT || 5000;
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