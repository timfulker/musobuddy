import { type Express } from "express";
import path from "path";
import { storage } from "./storage";
// import { authMonitor } from "./auth-monitor";

// Middleware
const isAuthenticated = (req: any, res: any, next: any) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

export async function registerRoutes(app: Express) {
  // ===== SYSTEM HEALTH & MONITORING =====
  app.get('/api/health/auth', (req, res) => {
    res.json({ status: 'healthy', message: 'Auth system operational' });
  });

  app.get('/api/health/system', async (req, res) => {
    res.json({ status: 'healthy', message: 'System operational' });
  });

  // ===== TEST ROUTES =====
  app.get('/test-login', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'test-direct-login.html'));
  });

  // ===== AUTHENTICATION ROUTES =====
  // Authentication routes are now handled by ProductionAuthSystem

  // ===== SIGNUP ROUTES =====
  // Signup routes are now handled by ProductionAuthSystem

  // ===== BOOKING ROUTES =====
  
  console.log('✅ Clean routes registered successfully');
}