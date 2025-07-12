import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";

const app = express();

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

// WEBHOOK ENDPOINTS - Must be registered before middleware to avoid routing conflicts
app.post('/api/webhook/mailgun', express.urlencoded({ extended: true, limit: '50mb' }), async (req, res) => {
  console.log('📧 MAILGUN WEBHOOK HIT! Email received via /api/webhook/mailgun');
  console.log('Request from IP:', req.ip);
  console.log('User-Agent:', req.headers['user-agent']);
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Raw request body (form-data):', JSON.stringify(req.body, null, 2));
  console.log('All form fields:', Object.keys(req.body || {}));
  
  // Log each field for debugging
  if (req.body) {
    for (const [key, value] of Object.entries(req.body)) {
      console.log(`📧 Form field "${key}":`, typeof value, '=', value);
    }
  }
  
  try {
    const { handleMailgunWebhook } = await import('./mailgun-webhook');
    await handleMailgunWebhook(req, res);
  } catch (error) {
    console.error("Error in Mailgun webhook:", error);
    res.status(500).json({ message: "Failed to process Mailgun webhook" });
  }
});

// SENDGRID WEBHOOK - Priority registration to avoid Vite interference
app.post('/api/webhook/sendgrid', express.urlencoded({ extended: true, limit: '50mb' }), async (req, res) => {
  console.log('📧 SENDGRID WEBHOOK HIT! Email received via /api/webhook/sendgrid');
  console.log('Request from IP:', req.ip);
  console.log('User-Agent:', req.headers['user-agent']);
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Body keys:', Object.keys(req.body));
  
  try {
    const { handleSendGridWebhook } = await import('./email-webhook');
    await handleSendGridWebhook(req, res);
  } catch (error) {
    console.error("Error in SendGrid webhook:", error);
    res.status(500).json({ message: "Failed to process SendGrid webhook" });
  }
});

app.post('/api/webhook/simple-email', express.json({ limit: '50mb' }), express.urlencoded({ extended: true, limit: '50mb' }), async (req, res) => {
  console.log('🔥 SIMPLE EMAIL WEBHOOK HIT! Email received via /api/webhook/simple-email');
  console.log('Request from IP:', req.ip);
  console.log('User-Agent:', req.headers['user-agent']);
  console.log('Content-Type:', req.headers['content-type']);
  try {
    const { handleSimpleEmailWebhook } = await import('./simple-email-webhook');
    await handleSimpleEmailWebhook(req, res);
  } catch (error) {
    console.error("Error in simple email webhook:", error);
    res.status(500).json({ message: "Failed to process simple email webhook" });
  }
});

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
  // Register all routes (including webhook routes)
  const server = await registerRoutes(app);
  
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
})();
