import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";

const app = express();

console.log('🔧 === STARTING ROUTE REGISTRATION ===');
console.log('🔧 Webhook routes will be registered after Vite middleware...');

// Test route
app.get('/api/test-route', (req, res) => {
  console.log('✅ Test route hit!');
  res.json({ message: 'Test route working', timestamp: new Date().toISOString() });
});

// Rest of the middleware setup
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '50mb' }));

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