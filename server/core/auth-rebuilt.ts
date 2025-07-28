// COMPLETELY REBUILT AUTHENTICATION SYSTEM
import { type Express } from "express";
import { storage } from "./storage.js";
import { ENV } from './environment-rebuilt.js';

/**
 * REBUILT AUTHENTICATION MIDDLEWARE
 * Clean, simple authentication check
 */
export const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

/**
 * REBUILT AUTHENTICATION ROUTES
 * Simple, working authentication without complexity
 */
export function setupAuthRoutes(app: Express) {
  console.log('🔐 Setting up rebuilt authentication routes...');

  // Admin login - simple and direct
  app.post('/api/auth/admin-login', async (req: any, res) => {
    try {
      const { email, password } = req.body;
      
      if (email === 'timfulker@gmail.com' && password === 'admin123') {
        // Set session data
        req.session.userId = '43963086';
        req.session.email = email;
        req.session.isAdmin = true;
        req.session.phoneVerified = true;
        
        // Explicit session save
        await new Promise((resolve, reject) => {
          req.session.save((err: any) => {
            if (err) reject(err);
            else resolve(true);
          });
        });
        
        console.log('✅ Admin login successful, session saved');
        
        res.json({
          success: true,
          user: {
            id: req.session.userId,
            email: email,
            isAdmin: true,
            tier: 'admin',
            phoneVerified: true
          }
        });
      } else {
        res.status(401).json({ error: 'Invalid credentials' });
      }
    } catch (error) {
      console.error('❌ Admin login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // Get current user
  app.get('/api/auth/user', (req: any, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    res.json({
      id: req.session.userId,
      email: req.session.email,
      isAdmin: req.session.isAdmin || false,
      tier: 'admin',
      phoneVerified: req.session.phoneVerified || false
    });
  });

  // Logout
  app.post('/api/auth/logout', (req: any, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        console.error('❌ Logout error:', err);
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.json({ success: true });
    });
  });

  console.log('✅ Rebuilt authentication routes configured');
}