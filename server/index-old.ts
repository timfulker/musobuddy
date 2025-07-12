import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { handleUltraSafeWebhook } from "./ultra-safe-webhook";

const app = express();

// CRITICAL: SIMPLE TEST ROUTE TO VERIFY ROUTE REGISTRATION
app.get('/api/test-route', (req, res) => {
  console.log('✅ Test route hit!');
  res.json({ message: 'Test route working', timestamp: new Date().toISOString() });
});

// CRITICAL: MAILGUN WEBHOOK ROUTE - MUST BE REGISTERED BEFORE VITE MIDDLEWARE
app.post('/api/webhook/mailgun', express.urlencoded({ extended: true }), async (req, res) => {
  console.log('📧 MAILGUN WEBHOOK HIT! Email received');
  console.log('📧 Body:', req.body);
  
  try {
    // Extract email data
    const sender = req.body.sender || req.body.from || 'unknown@example.com';
    const subject = req.body.subject || 'Email enquiry';
    const bodyText = req.body['body-plain'] || req.body.text || 'No message content';
    
    console.log('📧 Sender:', sender);
    console.log('📧 Subject:', subject);
    
    // Extract client name from sender
    let clientName = 'Unknown Client';
    if (sender.includes('<')) {
      const nameMatch = sender.match(/^([^<]+)/);
      if (nameMatch) {
        clientName = nameMatch[1].trim().replace(/['"]/g, '');
      }
    }
    if (clientName === 'Unknown Client') {
      const emailMatch = sender.match(/[\w.-]+@[\w.-]+\.\w+/);
      const email = emailMatch ? emailMatch[0] : sender;
      clientName = email.split('@')[0];
    }
    
    // Create simple enquiry - NO DATE PROCESSING
    const enquiry = {
      userId: '43963086',
      title: subject,
      clientName: clientName,
      clientEmail: sender.match(/[\w.-]+@[\w.-]+\.\w+/)?.[0] || sender,
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
    
    console.log('📧 Creating enquiry...');
    const newEnquiry = await storage.createEnquiry(enquiry);
    
    console.log('📧 ✅ ENQUIRY CREATED SUCCESSFULLY!');
    console.log('📧 Enquiry ID:', newEnquiry.id);
    
    res.status(200).json({
      success: true,
      message: 'Mailgun webhook processed successfully',
      enquiryId: newEnquiry.id,
      clientName: enquiry.clientName,
      subject: subject,
      processing: 'direct-registration'
    });
    
  } catch (error: any) {
    console.error('📧 MAILGUN WEBHOOK ERROR:', error.message);
    console.error('📧 Error stack:', error.stack);
    
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Mailgun webhook processing failed',
        details: error.message
      });
    }
  }
});

// Webhook route will be registered AFTER registerRoutes to ensure it overrides any conflicting routes

// CRITICAL: ULTRA-SAFE WEBHOOK ROUTE FIRST - ABSOLUTELY HIGHEST PRIORITY
app.post('/api/webhook/mailgun-ultra-safe', express.urlencoded({ extended: true }), async (req, res) => {
  console.log('🚨 🚨 🚨 ULTRA-SAFE WEBHOOK ROUTE HIT - FIRST IN ENTIRE APP! 🚨 🚨 🚨');
  console.log('🚨 Method:', req.method);
  console.log('🚨 URL:', req.url);
  console.log('🚨 Content-Type:', req.headers['content-type']);
  console.log('🚨 Body keys:', Object.keys(req.body || {}));
  
  try {
    console.log('🚨 Processing webhook with ULTRA-SAFE handler...');
    
    // Extract basic information without any date processing
    const sender = req.body.sender || req.body.from || 'unknown@example.com';
    const recipient = req.body.recipient || req.body.to || 'leads@musobuddy.com';
    const subject = req.body.subject || 'Email enquiry';
    const bodyText = req.body['body-plain'] || req.body.text || 'No message content';
    
    console.log('🚨 Extracted data:');
    console.log('🚨 Sender:', sender);
    console.log('🚨 Recipient:', recipient);
    console.log('🚨 Subject:', subject);
    console.log('🚨 Body length:', bodyText.length);
    
    // Extract client name from sender
    let clientName = 'Unknown Client';
    if (sender.includes('<')) {
      const nameMatch = sender.match(/^([^<]+)/);
      if (nameMatch) {
        clientName = nameMatch[1].trim().replace(/['"]/g, '');
      }
    }
    if (clientName === 'Unknown Client') {
      const emailMatch = sender.match(/[\w.-]+@[\w.-]+\.\w+/);
      const email = emailMatch ? emailMatch[0] : sender;
      clientName = email.split('@')[0];
    }
    
    // Create ultra-minimal enquiry with NO date fields
    const ultraSafeEnquiry = {
      userId: '43963086', // Your user ID
      title: subject,
      clientName: clientName,
      clientEmail: sender.match(/[\w.-]+@[\w.-]+\.\w+/)?.[0] || sender,
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
    
    console.log('🚨 Ultra safe enquiry data prepared');
    console.log('🚨 Client name:', ultraSafeEnquiry.clientName);
    console.log('🚨 Client email:', ultraSafeEnquiry.clientEmail);
    
    // Create enquiry with ultra-safe data
    console.log('🚨 Creating enquiry with ultra-safe data...');
    const newEnquiry = await storage.createEnquiry(ultraSafeEnquiry);
    
    console.log('🚨 ✅ ULTRA-SAFE ENQUIRY CREATED SUCCESSFULLY!');
    console.log('🚨 Enquiry ID:', newEnquiry.id);
    
    res.status(200).json({
      success: true,
      message: 'ULTRA-SAFE webhook processed successfully',
      enquiryId: newEnquiry.id,
      clientName: ultraSafeEnquiry.clientName,
      subject: subject,
      processing: 'ultra-safe-mode',
      route: 'first-in-app'
    });
    
  } catch (error: any) {
    console.error('🚨 ULTRA-SAFE WEBHOOK ERROR:', error.message);
    console.error('🚨 Error stack:', error.stack);
    
    // Check for the specific toISOString error
    if (error.message && error.message.includes('toISOString')) {
      console.error('🚨 ⚠️ FOUND THE toISOString ERROR IN ULTRA-SAFE ROUTE!');
      console.error('🚨 This confirms the error is in the webhook handler itself');
    }
    
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Ultra-safe webhook processing failed',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
});

// CRITICAL: Test Mailgun FIRST, before ANY middleware 
app.post('/api/test-mailgun', express.json(), async (req, res) => {
  console.log('🧪 Testing Mailgun integration...');
  try {
    const { sendEmail } = await import('./mailgun-email');
    
    const testResult = await sendEmail({
      to: 'test@example.com',
      from: 'MusoBuddy <noreply@sandbox2e23cfec6e14ec6b880912ce39e4926.mailgun.org>',
      subject: 'MusoBuddy Email Test',
      text: 'This is a test email to verify Mailgun integration is working.',
      html: '<h1>Email Test</h1><p>This is a test email to verify Mailgun integration is working.</p>'
    });
    
    res.json({ 
      success: testResult,
      message: testResult ? 'Email sent successfully' : 'Email failed to send'
    });
  } catch (error: any) {
    console.error('Test email error:', error);
    res.status(500).json({ error: 'Failed to send test email', details: error.message });
  }
});

// Webhook route will be registered AFTER registerRoutes to ensure priority

// GET endpoint removed to avoid conflicts with priority POST route

// CRITICAL: Register invoice route FIRST, before ANY middleware to bypass Vite interference  
app.post('/api/invoices', express.json({ limit: '50mb' }), async (req: any, res) => {
  console.log('🚨🚨🚨 PRIORITY INVOICE ROUTE HIT - FIRST IN STACK! 🚨🚨🚨');
  console.log('🔥 Method:', req.method);
  console.log('🔥 Path:', req.path);
  console.log('🔥 URL:', req.url);
  console.log('🔥 Headers:', JSON.stringify(req.headers, null, 2));
  console.log('🔥 Body received:', JSON.stringify(req.body, null, 2));
  console.log('🔥 Body type:', typeof req.body);
  console.log('🔥 Body keys:', Object.keys(req.body || {}));
  console.log('🔥 Session check - req.session exists:', !!req.session);
  console.log('🔥 Session user ID:', req.session?.user?.id);
  
  try {
    // Validate request body exists
    if (!req.body) {
      console.error('❌ No request body received');
      return res.status(400).json({ message: 'Request body is required' });
    }
    
    const { 
      contractId, 
      clientName, 
      clientEmail, 
      clientAddress, 
      venueAddress, 
      amount, 
      dueDate, 
      performanceDate,
      performanceFee,
      depositPaid 
    } = req.body;
    
    console.log('🔥 Extracted fields:');
    console.log('  - contractId:', contractId);
    console.log('  - clientName:', clientName);
    console.log('  - clientEmail:', clientEmail);
    console.log('  - clientAddress:', clientAddress);
    console.log('  - venueAddress:', venueAddress);
    console.log('  - amount:', amount);
    console.log('  - dueDate:', dueDate);
    console.log('  - performanceDate:', performanceDate);
    console.log('  - performanceFee:', performanceFee);
    console.log('  - depositPaid:', depositPaid);
    
    // Validate required fields
    if (!clientName || !amount || !dueDate) {
      console.error('❌ Missing required fields');
      console.error('  - clientName:', !!clientName);
      console.error('  - amount:', !!amount);
      console.error('  - dueDate:', !!dueDate);
      return res.status(400).json({ 
        message: 'Missing required fields: clientName, amount, and dueDate are required' 
      });
    }
    
    // Validate amount is a valid number
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      console.error('❌ Invalid amount:', amount);
      return res.status(400).json({ 
        message: 'Amount must be a valid number greater than 0' 
      });
    }
    
    // Get user ID - try multiple sources for now
    let userId = req.session?.user?.id;
    
    // TEMPORARY: For testing, use hardcoded user ID if no session
    if (!userId) {
      userId = '43963086'; // Hard-coded for testing
      console.log('⚠️ No session user found, using hardcoded user ID for testing:', userId);
    } else {
      console.log('✅ Using session user ID:', userId);
    }
    
    // Prepare invoice data for storage
    const invoiceData = {
      userId: userId,
      contractId: contractId || null,
      clientName: clientName.trim(),
      clientEmail: clientEmail?.trim() || null,
      clientAddress: clientAddress?.trim() || null,
      venueAddress: venueAddress?.trim() || null,
      amount: parsedAmount,
      dueDate: new Date(dueDate),
      performanceDate: performanceDate ? new Date(performanceDate) : null,
      performanceFee: performanceFee ? parseFloat(performanceFee) : null,
      depositPaid: depositPaid ? parseFloat(depositPaid) : null,
      status: 'draft' as const
    };
    
    console.log('🔥 Prepared invoice data for storage:', JSON.stringify(invoiceData, null, 2));
    
    // Call storage to create invoice
    console.log('🔥 Calling storage.createInvoice...');
    const invoice = await storage.createInvoice(invoiceData);
    console.log('✅ Invoice created successfully:', JSON.stringify(invoice, null, 2));
    
    // Return the created invoice
    res.status(201).json(invoice);
    
  } catch (error: any) {
    console.error('❌❌❌ INVOICE CREATION ERROR ❌❌❌');
    console.error('Error type:', typeof error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error constraint:', error.constraint);
    console.error('Error stack:', error.stack);
    console.error('Full error object:', JSON.stringify(error, null, 2));
    
    // Send appropriate error response
    const statusCode = error.code === '23505' ? 409 : 500; // 409 for duplicate key
    const message = error.code === '23505' 
      ? 'Invoice number already exists, please try again' 
      : error.message || 'Failed to create invoice';
      
    res.status(statusCode).json({ 
      message,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Mailgun test endpoint moved to top of file

// Essential middleware setup
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' })); // Important for SendGrid form data

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  console.log('🔧 Starting route registration...');
  
  try {
    // Register all routes (including webhook routes)
    const server = await registerRoutes(app);
    console.log('✅ All routes registered successfully');
    
    // CRITICAL: OVERRIDE ANY CONFLICTING ROUTES - Register webhook AFTER all other routes
    console.log('🔧 Registering mailgun webhook...');
    app.post('/api/webhook/mailgun', express.urlencoded({ extended: true }), async (req, res) => {
    console.log('📧 FINAL MAILGUN WEBHOOK HIT! Email received');
    console.log('📧 Body:', req.body);
    
    try {
      // Extract email data
      const sender = req.body.sender || req.body.from || 'unknown@example.com';
      const subject = req.body.subject || 'Email enquiry';
      const bodyText = req.body['body-plain'] || req.body.text || 'No message content';
      
      console.log('📧 Sender:', sender);
      console.log('📧 Subject:', subject);
      
      // Extract client name from sender
      let clientName = 'Unknown Client';
      if (sender.includes('<')) {
        const nameMatch = sender.match(/^([^<]+)/);
        if (nameMatch) {
          clientName = nameMatch[1].trim().replace(/['"]/g, '');
        }
      }
      if (clientName === 'Unknown Client') {
        const emailMatch = sender.match(/[\w.-]+@[\w.-]+\.\w+/);
        const email = emailMatch ? emailMatch[0] : sender;
        clientName = email.split('@')[0];
      }
      
      // Create simple enquiry - NO DATE PROCESSING
      const enquiry = {
        userId: '43963086',
        title: subject,
        clientName: clientName,
        clientEmail: sender.match(/[\w.-]+@[\w.-]+\.\w+/)?.[0] || sender,
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
      
      console.log('📧 Creating enquiry for:', clientName);
      const newEnquiry = await storage.createEnquiry(enquiry);
      
      console.log('📧 ✅ EMAIL PROCESSED! Enquiry created:', newEnquiry.id);
      
      res.status(200).json({
        success: true,
        enquiryId: newEnquiry.id,
        message: 'Email processed successfully - FINAL HANDLER',
        handler: 'final-override'
      });
      
    } catch (error: any) {
      console.error('📧 Mailgun webhook error:', error);
      res.status(500).json({ error: error.message, handler: 'final-override' });
    }
  });

  // Test webhook endpoint to verify new handler is working
  app.post('/api/webhook/mailgun-test', express.urlencoded({ extended: true }), async (req, res) => {
    console.log('🧪 TEST WEBHOOK HIT!');
    console.log('🧪 Body:', req.body);
    
    res.status(200).json({
      success: true,
      message: 'Test webhook working!',
      handler: 'test-handler',
      body: req.body
    });
  });
  
  // CRITICAL: Add Mailgun webhook route BEFORE Vite middleware to ensure priority - INLINE HANDLER
  app.post('/api/webhook/mailgun-priority', express.urlencoded({ extended: true }), async (req, res) => {
    console.log('🚨 PRIORITY WEBHOOK ROUTE HIT - BEFORE VITE');
    console.log('🚨 Method:', req.method);
    console.log('🚨 URL:', req.url);
    console.log('🚨 Content-Type:', req.headers['content-type']);
    console.log('🚨 Body keys:', Object.keys(req.body || {}));
    
    try {
      console.log('🚨 Processing webhook with INLINE ultra-safe handler...');
      
      // Extract basic information without any date processing - INLINE IMPLEMENTATION
      const sender = req.body.sender || req.body.from || 'unknown@example.com';
      const recipient = req.body.recipient || req.body.to || 'leads@musobuddy.com';
      const subject = req.body.subject || 'Email enquiry';
      const bodyText = req.body['body-plain'] || req.body.text || 'No message content';
      
      console.log('🚨 Extracted data:');
      console.log('🚨 Sender:', sender);
      console.log('🚨 Recipient:', recipient);
      console.log('🚨 Subject:', subject);
      console.log('🚨 Body length:', bodyText.length);
      
      // Extract client name from sender
      let clientName = 'Unknown Client';
      if (sender.includes('<')) {
        const nameMatch = sender.match(/^([^<]+)/);
        if (nameMatch) {
          clientName = nameMatch[1].trim().replace(/['"]/g, '');
        }
      }
      if (clientName === 'Unknown Client') {
        const emailMatch = sender.match(/[\w.-]+@[\w.-]+\.\w+/);
        const email = emailMatch ? emailMatch[0] : sender;
        clientName = email.split('@')[0];
      }
      
      // Create ultra-minimal enquiry with NO date fields
      const ultraSafeEnquiry = {
        userId: '43963086', // Your user ID
        title: subject,
        clientName: clientName,
        clientEmail: sender.match(/[\w.-]+@[\w.-]+\.\w+/)?.[0] || sender,
        clientPhone: null, // Explicitly null
        eventDate: null, // Explicitly null - no date processing
        eventTime: null, // Explicitly null
        eventEndTime: null, // Explicitly null
        performanceDuration: null, // Explicitly null
        venue: null, // Explicitly null
        eventType: null, // Explicitly null
        gigType: null, // Explicitly null
        estimatedValue: null, // Explicitly null
        status: 'new' as const,
        notes: bodyText,
        responseNeeded: true,
        lastContactedAt: null // Explicitly null - no date processing
      };
      
      console.log('🚨 Ultra safe enquiry data prepared');
      console.log('🚨 Client name:', ultraSafeEnquiry.clientName);
      console.log('🚨 Client email:', ultraSafeEnquiry.clientEmail);
      
      // Create enquiry with ultra-safe data
      console.log('🚨 Creating enquiry with ultra-safe data...');
      const newEnquiry = await storage.createEnquiry(ultraSafeEnquiry);
      
      console.log('🚨 ✅ Ultra safe enquiry created successfully!');
      console.log('🚨 Enquiry ID:', newEnquiry.id);
      
      res.status(200).json({
        success: true,
        message: 'PRIORITY ultra safe webhook processed successfully',
        enquiryId: newEnquiry.id,
        clientName: ultraSafeEnquiry.clientName,
        subject: subject,
        processing: 'priority-ultra-safe-mode',
        route: 'before-vite'
      });
      
    } catch (error: any) {
      console.error('🚨 PRIORITY WEBHOOK ERROR:', error.message);
      console.error('🚨 Error stack:', error.stack);
      console.error('🚨 Error type:', typeof error);
      console.error('🚨 Error name:', error.name);
      
      // Check for the specific toISOString error
      if (error.message && error.message.includes('toISOString')) {
        console.error('🚨 ⚠️ FOUND THE toISOString ERROR IN PRIORITY ROUTE!');
        console.error('🚨 This confirms the error is in the webhook handler itself');
      }
      
      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'Priority webhook processing failed',
          details: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
  });
  
  // Start automatic cleanup service
  // Automatic cleanup disabled for now
  // const { scheduleAutomaticCleanup } = await import('./cleanup-service');
  // scheduleAutomaticCleanup();

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  
  // Webhook middleware protection is no longer needed since priority routes are registered first
  
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
} catch (error) {
  console.error('❌ Fatal error in route registration:', error);
  console.error('❌ Stack trace:', error.stack);
  process.exit(1);
}
})();
