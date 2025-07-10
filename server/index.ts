import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Enable extended URL encoding for webhook data

// Priority webhook route registration - must happen BEFORE any other middleware
// This ensures SendGrid webhook requests are handled immediately without interference
app.post('/api/webhook/sendgrid', async (req, res) => {
  console.log('🔥 PRIORITY WEBHOOK HIT! Email received via /api/webhook/sendgrid');
  console.log('Request from IP:', req.ip);
  console.log('User-Agent:', req.headers['user-agent']);
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Raw body keys:', Object.keys(req.body));
  try {
    const { handleSendGridWebhook } = await import('./email-webhook');
    await handleSendGridWebhook(req, res);
  } catch (error) {
    console.error("Error in priority SendGrid webhook:", error);
    res.status(500).json({ message: "Failed to process SendGrid webhook" });
  }
});

// GET endpoint for testing webhook connectivity
app.get('/api/webhook/sendgrid', (req, res) => {
  res.json({ 
    status: 'webhook_active',
    message: 'SendGrid webhook endpoint is accessible',
    timestamp: new Date().toISOString(),
    endpoint: '/api/webhook/sendgrid (priority route)',
    note: 'Ready for POST requests from SendGrid Inbound Parse'
  });
});

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
