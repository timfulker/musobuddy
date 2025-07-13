import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";

const app = express();

console.log('🔧 === STARTING ROUTE REGISTRATION ===');

// SIMPLE MAILGUN WEBHOOK - REBUILT FROM SCRATCH
app.post('/api/webhook/mailgun', express.urlencoded({ extended: true }), async (req: Request, res: Response) => {
  console.log('📧 SIMPLE WEBHOOK - Mailgun email received');
  
  try {
    // Log all incoming data to see what Mailgun actually sends
    console.log('📧 Full body data:', JSON.stringify(req.body, null, 2));
    
    // Extract email data using actual Mailgun field names
    const from = req.body.From || req.body.sender || req.body.from || '';
    const subject = req.body.Subject || req.body.subject || 'Email enquiry';
    const body = req.body['body-plain'] || req.body['stripped-text'] || req.body.text || '';
    
    // Log raw request body for debugging
    console.log('🔍 Raw request body keys:', Object.keys(req.body));
    console.log('🔍 Body-plain field:', req.body['body-plain']);
    console.log('🔍 Stripped-text field:', req.body['stripped-text']);
    console.log('🔍 Text field:', req.body.text);
    console.log('🔍 From field variants:', {
      From: req.body.From,
      from: req.body.from,
      sender: req.body.sender
    });
    
    console.log('📧 From:', from);
    console.log('📧 Subject:', subject);
    console.log('📧 Body length:', body.length);
    console.log('📧 Body content:', body);
    
    // Extract client email
    const emailMatch = from.match(/[\w.-]+@[\w.-]+\.\w+/);
    const clientEmail = emailMatch ? emailMatch[0] : from;
    
    // Extract client name
    let clientName = 'Unknown';
    if (from.includes('<')) {
      const nameMatch = from.match(/^([^<]+)/);
      if (nameMatch) {
        clientName = nameMatch[1].trim();
      }
    } else if (clientEmail) {
      clientName = clientEmail.split('@')[0];
    }
    
    // Look for name in body
    const bodyNameMatch = body.match(/(?:my name is|i'm|i am)\s+([A-Za-z\s]{2,30}?)(?:\s+and|\s+I|\.|,|\n|$)/i);
    if (bodyNameMatch) {
      clientName = bodyNameMatch[1].trim();
    }
    
    console.log('📧 Client name:', clientName);
    console.log('📧 Client email:', clientEmail);
    
    // Create enquiry
    const enquiry = {
      userId: '43963086',
      title: subject,
      clientName,
      clientEmail,
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
      notes: body,
      responseNeeded: true,
      lastContactedAt: null
    };
    
    const newEnquiry = await storage.createEnquiry(enquiry);
    console.log('📧 ✅ Enquiry created:', newEnquiry.id);
    
    res.status(200).json({
      success: true,
      enquiryId: newEnquiry.id,
      clientName,
      clientEmail
    });
    
  } catch (error: any) {
    console.error('📧 ❌ Webhook error:', error);
    res.status(500).json({ error: error.message });
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