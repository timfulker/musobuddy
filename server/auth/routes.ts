import { type Express } from "express";
import { handleLogin, requireAuth, requireAdmin } from "./simple-auth";

export function setupAuthRoutes(app: Express): void {
  console.log('🔗 Setting up authentication routes...');

  // Login endpoint
  app.post('/api/auth/login', async (req: any, res) => {
    try {
      const { email, password } = req.body;
      const result = await handleLogin(email, password);
      
      if (result.success && result.user) {
        // Set session
        req.session.userId = result.user.id;
        
        console.log(`✅ User logged in: ${result.user.email}`);
        res.json({ 
          success: true,
          message: 'Login successful',
          user: result.user
        });
      } else {
        res.status(401).json({ 
          success: false,
          message: result.error || 'Login failed'
        });
      }
    } catch (error) {
      console.error('Login endpoint error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Server error'
      });
    }
  });

  // Current user endpoint
  app.get('/api/auth/user', (req: any, res) => {
    if (req.user) {
      res.json({
        id: req.user.id,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        tier: req.user.tier || 'free',
        isAdmin: req.user.isAdmin || false
      });
    } else {
      res.status(401).json({ error: 'Not authenticated' });
    }
  });

  // Logout endpoint
  app.post('/api/auth/logout', (req: any, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.json({ success: true, message: 'Logged out' });
    });
  });

  console.log('✅ Authentication routes ready');
}