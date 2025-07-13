import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";

const app = express();

console.log('🔧 === STARTING ROUTE REGISTRATION ===');

// CATCH-ALL MIDDLEWARE TO LOG ALL REQUESTS
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.includes('webhook')) {
    console.log(`🌐 ALL WEBHOOK REQUESTS: ${req.method} ${req.path}`);
    console.log(`🌐 User-Agent: ${req.headers['user-agent']}`);
    console.log(`🌐 Content-Type: ${req.headers['content-type']}`);
  }
  next();
});

// MINIMAL DIAGNOSTIC WEBHOOK
app.post('/api/webhook/mailgun', express.urlencoded({ extended: true }), async (req: Request, res: Response) => {
  const requestId = Date.now().toString();
  console.log(`🔍 [${requestId}] DIAGNOSTIC WEBHOOK START`);
  
  try {
    // Log everything first
    console.log(`🔍 [${requestId}] Raw body:`, JSON.stringify(req.body, null, 2));
    console.log(`🔍 [${requestId}] Headers:`, JSON.stringify(req.headers, null, 2));
    
    // CRITICAL: Log all possible field variations to identify the issue
    console.log(`🔍 [${requestId}] Body keys:`, Object.keys(req.body || {}));
    console.log(`🔍 [${requestId}] From variations:`, {
      From: req.body.From,
      from: req.body.from,
      sender: req.body.sender,
      'From-Field': req.body['From-Field'],
      'from-field': req.body['from-field']
    });
    console.log(`🔍 [${requestId}] Subject variations:`, {
      Subject: req.body.Subject,
      subject: req.body.subject,
      'Subject-Field': req.body['Subject-Field'],
      'subject-field': req.body['subject-field']
    });
    console.log(`🔍 [${requestId}] Body variations:`, {
      'body-plain': req.body['body-plain'],
      'stripped-text': req.body['stripped-text'],
      text: req.body.text,
      message: req.body.message,
      body: req.body.body
    });
    
    // Extract fields with fallbacks
    const from = req.body.From || req.body.from || req.body.sender || 'NO_FROM_FIELD';
    const subject = req.body.Subject || req.body.subject || 'NO_SUBJECT_FIELD';
    const body = req.body['body-plain'] || req.body['stripped-text'] || req.body.text || 'NO_BODY_FIELD';
    
    console.log(`🔍 [${requestId}] Extracted - From: "${from}"`);
    console.log(`🔍 [${requestId}] Extracted - Subject: "${subject}"`);
    console.log(`🔍 [${requestId}] Extracted - Body length: ${body.length}`);
    
    // Test email extraction
    const emailMatch = from.match(/[\w.-]+@[\w.-]+\.\w+/);
    const clientEmail = emailMatch ? emailMatch[0] : from;
    console.log(`🔍 [${requestId}] Email extraction - Match: ${!!emailMatch}, Result: "${clientEmail}"`);
    
    // Test name extraction
    let clientName = 'Unknown';
    if (from.includes('<')) {
      const nameMatch = from.match(/^([^<]+)/);
      if (nameMatch) {
        clientName = nameMatch[1].trim();
      }
    } else if (clientEmail && clientEmail !== 'NO_FROM_FIELD') {
      clientName = clientEmail.split('@')[0];
    }
    console.log(`🔍 [${requestId}] Name extraction result: "${clientName}"`);
    
    // Create enquiry object
    const enquiry = {
      userId: '43963086',
      title: subject !== 'NO_SUBJECT_FIELD' ? subject : `Email from ${clientName}`,
      clientName,
      clientEmail: clientEmail !== 'NO_FROM_FIELD' ? clientEmail : null,
      clientPhone: null,
      eventDate: null,
      eventTime: null,
      eventEndTime: null,
      performanceDuration: null,
      venue: null,
      eventType: null,
      gigType: null,
      estimatedValue: null,
      status: 'new' as const,
      notes: body !== 'NO_BODY_FIELD' ? body : 'Email enquiry with no body content',
      responseNeeded: true,
      lastContactedAt: null
    };
    
    console.log(`🔍 [${requestId}] Enquiry object:`, JSON.stringify(enquiry, null, 2));
    
    // Validate critical fields
    if (!enquiry.userId || !enquiry.title || !enquiry.clientName || !enquiry.status) {
      console.log(`❌ [${requestId}] VALIDATION FAILED - Missing required fields`);
      console.log(`❌ [${requestId}] userId: ${!!enquiry.userId}`);
      console.log(`❌ [${requestId}] title: ${!!enquiry.title}`);
      console.log(`❌ [${requestId}] clientName: ${!!enquiry.clientName}`);
      console.log(`❌ [${requestId}] status: ${!!enquiry.status}`);
      
      return res.status(200).json({
        success: false,
        error: 'Validation failed',
        enquiry,
        requestId
      });
    }
    
    // Database insertion with detailed error logging
    console.log(`🔍 [${requestId}] Attempting database insertion...`);
    
    try {
      const newEnquiry = await storage.createEnquiry(enquiry);
      console.log(`✅ [${requestId}] SUCCESS - Database record created: ${newEnquiry.id}`);
      
      res.status(200).json({
        success: true,
        enquiryId: newEnquiry.id,
        clientName: enquiry.clientName,
        clientEmail: enquiry.clientEmail,
        requestId
      });
      
    } catch (dbError: any) {
      console.log(`❌ [${requestId}] DATABASE ERROR:`, dbError.message);
      console.log(`❌ [${requestId}] Error code:`, dbError.code);
      console.log(`❌ [${requestId}] Error constraint:`, dbError.constraint);
      console.log(`❌ [${requestId}] Error detail:`, dbError.detail);
      console.log(`❌ [${requestId}] Error stack:`, dbError.stack);
      
      // Return success to Mailgun but log the error
      res.status(200).json({
        success: false,
        error: 'Database error',
        dbErrorMessage: dbError.message,
        dbErrorCode: dbError.code,
        enquiry,
        requestId
      });
    }
    
  } catch (generalError: any) {
    console.log(`❌ [${requestId}] GENERAL ERROR:`, generalError.message);
    console.log(`❌ [${requestId}] Error stack:`, generalError.stack);
    
    res.status(200).json({
      success: false,
      error: 'General processing error',
      message: generalError.message,
      requestId
    });
  }
  
  console.log(`🔍 [${requestId}] DIAGNOSTIC WEBHOOK END`);
});

console.log('✅ Dedicated webhook handler registered');

// STEP 3: REGISTER ALL OTHER ROUTES
console.log('🔧 Starting clean route registration...');

// Initialize the server
const server = await registerRoutes(app);

console.log('✅ All routes registered successfully');

// Debug: Show all registered routes
const routes = app._router.stack.map((middleware: any, index: number) => {
  if (middleware.route) {
    return `${index}: ${Object.keys(middleware.route.methods).join(', ')} ${middleware.route.path}`;
  } else {
    return `${index}: middleware - ${middleware.name || '<anonymous>'}`;
  }
}).filter(Boolean);

console.log('🔍 Registered routes:');
routes.forEach(route => console.log('  ' + route));

// STEP 4: SETUP VITE MIDDLEWARE
console.log('🔧 Setting up Vite middleware...');

if (app.get('env') === 'development') {
  await setupVite(app);
  console.log('✅ Vite middleware set up');
} else {
  serveStatic(app);
  console.log('✅ Static files served');
}

console.log('✅ Vite middleware setup completed');

// Catch all unmatched routes for debugging
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/api/')) {
    console.log(`=== UNMATCHED ROUTE: ${req.method} ${req.path} ===`);
  }
  next();
});

const PORT = Number(process.env.PORT) || 5000;
server.listen(PORT, "0.0.0.0", () => {
  log(`Server running on port ${PORT}`);
});