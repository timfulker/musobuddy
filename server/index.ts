import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Enable extended URL encoding for webhook data

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

// Register webhook BEFORE everything else to prevent conflicts
app.all('/webhook/sendgrid', async (req, res) => {
  console.log(`🔥 WEBHOOK ENDPOINT HIT: ${req.method} ${req.url}`);
  console.log('Request IP:', req.ip);
  console.log('User-Agent:', req.headers['user-agent']);
  console.log('Content-Type:', req.headers['content-type']);
  console.log('🚀 WEBHOOK ROUTE REGISTERED AND WORKING!');
  
  if (req.method === 'GET') {
    console.log('GET request to webhook endpoint - SendGrid testing connectivity');
    res.json({ 
      status: 'active', 
      message: 'SendGrid webhook endpoint is accessible',
      timestamp: new Date().toISOString(),
      url: 'https://musobuddy.replit.app/webhook/sendgrid',
      debug: 'No authentication required for webhooks'
    });
  } else if (req.method === 'POST') {
    console.log('🔥 EMAIL WEBHOOK HIT! Processing email from SendGrid...');
    console.log('Request body keys:', Object.keys(req.body || {}));
    console.log('Request body:', req.body);
    
    try {
      const { to, from, subject, text } = req.body;
      
      if (!to || !from || !text) {
        console.log('❌ Missing required fields in webhook data');
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      // Extract client name from email
      const clientName = from.split('@')[0].replace(/[^a-zA-Z0-9\s]/g, ' ').trim() || 'New Client';
      
      // Create enquiry data
      const enquiryData = {
        userId: "43963086", // Your user ID
        title: `Email from ${clientName}`,
        clientName,
        clientEmail: from,
        message: text,
        status: 'new' as const,
        source: 'Email' as const,
        eventDate: null,
        venue: null,
        notes: `Original subject: ${subject}`
      };
      
      console.log('Creating enquiry with data:', enquiryData);
      
      // Import storage dynamically to avoid circular imports
      const { storage } = await import('./storage');
      const enquiry = await storage.createEnquiry(enquiryData);
      
      console.log('✅ Enquiry created successfully:', enquiry.id);
      res.json({ 
        success: true, 
        enquiryId: enquiry.id,
        message: 'Email processed successfully' 
      });
      
    } catch (error) {
      console.error('❌ Error processing email webhook:', error);
      res.status(500).json({ error: 'Failed to process email' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
});

(async () => {
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
