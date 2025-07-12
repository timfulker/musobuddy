// Add this code directly to your server/index.ts file
// Insert this AFTER the existing app setup but BEFORE registerRoutes()

// Import the bulletproof webhook handler directly
import { handleMailgunWebhook } from "./mailgun-webhook";

// CRITICAL: Add Mailgun webhook route FIRST, before ANY other middleware
app.post('/api/webhook/mailgun', express.urlencoded({ extended: true }), async (req, res) => {
  console.log('🚨 DIRECT WEBHOOK ROUTE HIT - BYPASSING ROUTES.TS');
  console.log('🚨 Method:', req.method);
  console.log('🚨 URL:', req.url);
  console.log('🚨 Content-Type:', req.headers['content-type']);
  console.log('🚨 Body keys:', Object.keys(req.body || {}));
  
  try {
    console.log('🚨 Calling bulletproof webhook handler...');
    await handleMailgunWebhook(req, res);
    console.log('🚨 Bulletproof webhook handler completed successfully');
  } catch (error: any) {
    console.error('🚨 DIRECT WEBHOOK ERROR:', error.message);
    console.error('🚨 Error stack:', error.stack);
    console.error('🚨 Error type:', typeof error);
    console.error('🚨 Error name:', error.name);
    
    // Check for the specific toISOString error
    if (error.message && error.message.includes('toISOString')) {
      console.error('🚨 ⚠️ FOUND THE toISOString ERROR IN DIRECT ROUTE!');
      console.error('🚨 This confirms the error is in the webhook handler itself');
    }
    
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Direct webhook processing failed',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
});

// Add a GET endpoint for testing webhook connectivity
app.get('/api/webhook/mailgun', (req, res) => {
  console.log('🔍 GET request to Mailgun webhook endpoint');
  res.json({ 
    status: 'active',
    message: 'Direct Mailgun webhook endpoint is operational',
    timestamp: new Date().toISOString(),
    handler: 'bulletproof',
    route: 'direct'
  });
});

// Continue with the rest of your existing code...