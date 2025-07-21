import express, { type Request, Response } from "express";
import { setupVite, serveStatic } from "./vite";
import { testDatabaseConnection } from "./db";

const app = express();

// Essential middleware only
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Test database connection at startup
console.log('🔍 Testing database connection...');
testDatabaseConnection()
  .then(success => {
    if (success) {
      console.log('✅ Database connection verified successfully');
    } else {
      console.log('⚠️ Database connection failed, continuing...');
    }
  })
  .catch(() => console.log('⚠️ Database connection issues, continuing...'));

// Core route registration
const { registerAllRoutes } = await import('./core-routes');
await registerAllRoutes(app);

// Vite setup
await setupVite(app);
serveStatic(app);

const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 MusoBuddy server started on http://0.0.0.0:${PORT}`);
});