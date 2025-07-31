import { type Express } from "express";
import { storage } from "./storage";

// Simple authentication middleware
const isAuthenticated = async (req: any, res: any, next: any) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

export async function registerRoutes(app: Express) {
  console.log('🚀 Routes registration started');
  
  // Basic test route
  app.get('/api/test-basic', (req, res) => {
    res.json({ 
      message: 'Basic routing works', 
      timestamp: new Date().toISOString(),
      server: 'running'
    });
  });
  
  // AI status route
  app.get('/api/ai/status', (req, res) => {
    res.json({
      status: 'AI routes loaded',
      timestamp: new Date().toISOString(),
      openaiConfigured: !!process.env.OPENAI_API_KEY
    });
  });
  
  // Add your other routes here...
  
  console.log('✅ Routes registration completed');
}