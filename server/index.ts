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

// CLEAN EMAIL FORWARDING WEBHOOK
app.post('/api/webhook/mailgun', express.urlencoded({ extended: true }), async (req: Request, res: Response) => {
  const requestId = Date.now().toString();
  console.log(`📧 [${requestId}] Email webhook received`);
  
  try {
    // Extract email data with comprehensive field checking
    const fromField = req.body.From || req.body.from || req.body.sender || req.body['from-field'] || '';
    const subjectField = req.body.Subject || req.body.subject || req.body['subject-field'] || '';
    const bodyField = req.body['body-plain'] || req.body['stripped-text'] || req.body.text || req.body.message || req.body.body || '';
    
    console.log(`📧 [${requestId}] From: "${fromField}"`);
    console.log(`📧 [${requestId}] Subject: "${subjectField}"`);
    console.log(`📧 [${requestId}] Body length: ${bodyField.length}`);
    
    // Extract client email
    let clientEmail = '';
    const emailMatch = fromField.match(/[\w.-]+@[\w.-]+\.\w+/);
    if (emailMatch) {
      clientEmail = emailMatch[0];
    }
    
    // Extract client name
    let clientName = 'Unknown';
    if (fromField.includes('<')) {
      // Format: "John Doe <john@example.com>"
      const nameMatch = fromField.match(/^([^<]+)/);
      if (nameMatch) {
        clientName = nameMatch[1].trim();
      }
    } else if (clientEmail) {
      // Use email username as name
      clientName = clientEmail.split('@')[0];
    }
    
    // Create enquiry
    const enquiry = {
      userId: '43963086',
      title: subjectField || `Email from ${clientName}`,
      clientName,
      clientEmail: clientEmail || null,
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
      notes: bodyField || 'Email enquiry with no body content',
      responseNeeded: true,
      lastContactedAt: null
    };
    
    console.log(`📧 [${requestId}] Creating enquiry for: ${clientName} (${clientEmail})`);
    
    const newEnquiry = await storage.createEnquiry(enquiry);
    console.log(`✅ [${requestId}] Created enquiry #${newEnquiry.id}`);
    
    res.status(200).json({
      success: true,
      enquiryId: newEnquiry.id,
      clientName: enquiry.clientName,
      clientEmail: enquiry.clientEmail
    });
    
  } catch (error: any) {
    console.error(`❌ [${requestId}] Error:`, error.message);
    res.status(200).json({ success: false, error: error.message });
  }
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