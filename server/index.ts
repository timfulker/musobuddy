import express, { type Request, Response } from "express";
// Session imports now handled by rebuilt system
import { setupVite, serveStatic } from "./vite";
import { serveStaticFixed } from "./static-serve";
// Removed dual auth system import
import { registerRoutes } from "./core/routes";
import { storage } from "./core/storage";
import { testDatabaseConnection } from "./core/database";
import { ENV } from "./core/environment";
import { createSessionMiddleware } from "./core/session-rebuilt";
import { setupAuthRoutes } from "./core/auth-rebuilt";

const app = express();

// CRITICAL: Trust proxy BEFORE session middleware
app.set('trust proxy', 1);

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

// PRODUCTION DEPLOYMENT VALIDATION
// Prevents production deployment with wrong environment settings
if (process.env.NODE_ENV === 'production' && !ENV.isProduction) {
  console.error('❌ PRODUCTION DEPLOYMENT ERROR:');
  console.error('NODE_ENV=production but REPLIT_DEPLOYMENT not set to "true"');
  console.error('This indicates a deployment configuration problem.');
  console.error('Environment vars:', {
    NODE_ENV: process.env.NODE_ENV,
    REPLIT_DEPLOYMENT: process.env.REPLIT_DEPLOYMENT
  });
  process.exit(1);
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

// Authentication test page
app.get('/auth-test', (req, res) => {
  res.send(`
    <h1>Quick Auth Test</h1>
    <button onclick="testLogin()">Test Admin Login</button>
    <div id="result"></div>
    <script>
    async function testLogin() {
      const response = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        credentials: 'include',
        body: JSON.stringify({email: 'timfulker@gmail.com', password: 'MusoBuddy2025!'})
      });
      const data = await response.json();
      document.getElementById('result').innerHTML = JSON.stringify(data, null, 2);
    }
    </script>
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

// REBUILT: Session middleware
console.log('🔧 Setting up REBUILT session middleware...');
const sessionMiddleware = createSessionMiddleware();
app.use(sessionMiddleware);
console.log('✅ REBUILT session middleware configured');

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

// CORS middleware for contract signing from R2
app.use('/api/contracts/sign', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Add CORS for session restoration endpoints and auth routes
app.use(['/api/auth/restore-session', '/api/auth/restore-session-by-stripe', '/api/auth/user', '/api/auth/admin-login', '/api/auth/login'], (req, res, next) => {
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Determine the correct origin to allow
  const origin = req.headers.origin || 
                 req.headers.referer?.replace(/\/[^\/]*$/, '') || // Extract origin from referer
                 (req.headers.host?.includes('musobuddy.replit.app') ? 'https://musobuddy.replit.app' : 
                  req.headers.host?.includes('janeway.replit.dev') ? `https://${req.headers.host}` : 
                  'http://localhost:5000');
  
  // CORS logging disabled for performance
  
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Helper function to parse currency values to numeric
function parseCurrencyToNumber(value: string | null | undefined): number | null {
  if (!value) return null;
  // Remove currency symbols and commas, parse as float
  const numericString = value.toString().replace(/[£$€,]/g, '').trim();
  const parsed = parseFloat(numericString);
  return isNaN(parsed) ? null : parsed;
}

// CRITICAL: Email webhook registered FIRST
app.post('/api/webhook/mailgun', express.urlencoded({ extended: true }), async (req: Request, res: Response) => {
  const requestId = Date.now().toString();
  console.log(`📧 [${requestId}] Email webhook received`);
  
  try {
    const fromField = req.body.From || req.body.from || '';
    const subjectField = req.body.Subject || req.body.subject || '';
    const bodyField = req.body['body-plain'] || req.body.text || '';
    
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
    
    // AI parsing
    const aiResult = await parseEmailWithAI(bodyField, subjectField);
    
    // Extract user ID from recipient email address using fallback system
    const recipientField = req.body.To || req.body.recipient || '';
    console.log(`📧 [${requestId}] Recipient field:`, recipientField);
    
    // FALLBACK PROTECTION: Import webhook fallbacks
    const { getUserByEmailPrefix } = await import('./core/webhook-auth-fallbacks');
    
    let userId = null;
    
    // Parse email format: leads+customprefix@mg.musobuddy.com (Enhanced Hybrid System)
    if (recipientField.includes('@mg.musobuddy.com')) {
      // Extract custom prefix from plus addressing - handle both + and space (URL decoded)
      const prefixMatch = recipientField.match(/leads[\+\s]([^@]+)@mg\.musobuddy\.com$/);
      if (prefixMatch) {
        const customPrefix = prefixMatch[1].trim();
        console.log(`📧 [${requestId}] Extracted custom email prefix:`, customPrefix);
        
        // FALLBACK PROTECTION: Look up user using authentication-independent method
        try {
          const user = await getUserByEmailPrefix(customPrefix);
          if (user) {
            userId = user.id;
            console.log(`📧 [${requestId}] FALLBACK: Found user for custom prefix "${customPrefix}":`, userId);
          } else {
            console.log(`📧 [${requestId}] FALLBACK: No user found for custom prefix "${customPrefix}"`);
          }
        } catch (error) {
          console.log(`❌ [${requestId}] FALLBACK: Error looking up user by custom prefix:`, error);
        }
      }
    }
    
    // Fallback to default user if no match found
    if (!userId) {
      userId = "43963086"; // Default admin user
      console.log(`📧 [${requestId}] No user match found, using default user:`, userId);
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
    
    const newBooking = await storage.createBooking(bookingData);
    console.log(`✅ [${requestId}] Created booking #${newBooking.id}`);
    
    // Auto-create client in address book from inquiry
    if (clientName && clientName !== 'Unknown') {
      try {
        await storage.upsertClientFromBooking(newBooking, "43963086");
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
      clientEmail
    });
    
  } catch (error) {
    console.error(`❌ [${requestId}] Error:`, error);
    res.status(500).json({ error: 'Processing failed' });
  }
});

// AI email parsing function
async function parseEmailWithAI(emailBody: string, subject: string): Promise<any> {
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

Extract in JSON format. Look carefully for all money amounts, fees, quotes, budgets, and prices:
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
  "applyNowLink": "URL or null"
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
    return aiResult;
  } catch (error) {
    console.log('🤖 AI parsing failed, using fallback');
    return { eventDate: null, eventTime: null, venue: null, eventType: null, gigType: null, clientPhone: null, fee: null, budget: null, estimatedValue: null, applyNowLink: null };
  }
}

async function startServer() {
  try {
    // CRITICAL FIX: REMOVE DUPLICATE AUTHENTICATION SYSTEM  
    // Authentication will be handled by registerRoutes() below with proper session middleware order
    console.log('🔧 Skipping duplicate authentication setup - will be handled by registerRoutes()');

    // CRITICAL: Add trial-success server-side redirect BEFORE Vite setup
    app.get('/trial-success', async (req: any, res) => {
      try {
        const sessionId = req.query.session_id;
        
        if (!sessionId) {
          console.log('❌ No session_id in trial-success redirect');
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

        // Restore session on server
        req.session.userId = user.id;
        
        console.log('✅ Server-side session restored for:', user.email);
        
        // Force session save before redirect
        req.session.save((err: any) => {
          if (err) {
            console.error('❌ Session save error:', err);
            return res.redirect('/?error=session_save_failed');
          }
          
          // Redirect to dashboard with authenticated session
          res.redirect('/dashboard');
        });
        
      } catch (error: any) {
        console.error('❌ Server-side session restoration error:', error);
        res.redirect('/?error=session_restore_failed');
      }
    });

    // Setup rebuilt authentication first
    console.log('🔐 Setting up REBUILT authentication...');
    setupAuthRoutes(app);
    console.log('✅ REBUILT authentication configured');
    
    // Register all other routes AFTER authentication
    console.log('🔄 Registering API routes...');
    await registerRoutes(app);
    console.log('✅ API routes registered successfully');
    
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