import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";

const app = express();

console.log('🔧 === STARTING ROUTE REGISTRATION ===');

// STEP 2: DEDICATED WEBHOOK HANDLER - INTERCEPT BEFORE ALL MIDDLEWARE
app.use('/api/webhook/mailgun', express.urlencoded({ extended: true }), async (req: Request, res: Response) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  console.log('📧 MAILGUN WEBHOOK - DEDICATED HANDLER');
  console.log('📧 Request body:', req.body);
  
  try {
    const sender = req.body.sender || req.body.from || 'unknown@example.com';
    const subject = req.body.subject || 'Email enquiry';
    const bodyText = req.body['body-plain'] || req.body.text || 'No message content';
    
    let clientName = 'Unknown Client';
    const emailMatch = sender.match(/[\w.-]+@[\w.-]+\.\w+/);
    const email = emailMatch ? emailMatch[0] : sender;
    
    if (sender.includes('<')) {
      const nameMatch = sender.match(/^([^<]+)/);
      if (nameMatch) {
        clientName = nameMatch[1].trim().replace(/['"]/g, '');
      }
    } else {
      clientName = email.split('@')[0].replace(/[._]/g, ' ');
    }
    
    const enquiry = {
      userId: '43963086',
      title: subject,
      clientName: clientName,
      clientEmail: email,
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
      notes: bodyText,
      responseNeeded: true,
      lastContactedAt: null
    };
    
    const newEnquiry = await storage.createEnquiry(enquiry);
    console.log('📧 ✅ Enquiry created:', newEnquiry.id);
    
    res.status(200).json({
      success: true,
      message: 'Webhook processed successfully',
      enquiryId: newEnquiry.id,
      clientName: clientName,
      processing: 'dedicated-handler'
    });
    
  } catch (error: any) {
    console.error('📧 Processing error:', error.message);
    res.status(500).json({
      error: 'Webhook processing failed',
      details: error.message
    });
  }
});

console.log('✅ Dedicated webhook handler registered');

// Set up basic middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '50mb' }));

// Test route
app.get('/api/test-route', (req, res) => {
  console.log('✅ Test route hit!');
  res.json({ message: 'Test route working', timestamp: new Date().toISOString() });
});

// Logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/api') && !req.path.startsWith('/api/webhook')) {
    console.log(`=== UNMATCHED ROUTE: ${req.method} ${req.path} ===`);
  }
  next();
});

// Register all routes
(async () => {
  console.log('🔧 Starting clean route registration...');
  
  try {
    const server = await registerRoutes(app);
    console.log('✅ All routes registered successfully');
    
    // List all registered routes for debugging
    console.log('🔍 Registered routes:');
    app._router.stack.forEach((layer, index) => {
      if (layer.route) {
        console.log(`  ${index}: ${Object.keys(layer.route.methods)} ${layer.route.path}`);
      } else if (layer.name) {
        console.log(`  ${index}: middleware - ${layer.name}`);
      }
    });
    
    // Setup Vite
    if (process.env.NODE_ENV === "development") {
      console.log('🔧 Setting up Vite middleware...');
      await setupVite(app, server);
      console.log('✅ Vite middleware set up');
    } else {
      serveStatic(app);
    }
    
    console.log('✅ Vite middleware setup completed');
    
    // Start server
    const port = process.env.PORT || 5000;
    server.listen(port, "0.0.0.0", () => {
      console.log(`Server running on port ${port}`);
    });
    
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
})();