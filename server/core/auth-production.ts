// CLEAN AUTHENTICATION SYSTEM - REBUILT FROM SCRATCH
import bcrypt from 'bcrypt';
import { storage } from './storage.js';

export class ProductionAuthSystem {
  constructor(private app: any) {}

  setupRoutes() {
    // Admin login endpoint - clean implementation
    this.app.post('/api/auth/admin-login', async (req: any, res) => {
      const loginId = Date.now().toString();
      console.log(`🔐 [ADMIN-${loginId}] Admin login attempt`);
      
      try {
        const { email, password } = req.body;
        
        // Verify hardcoded admin credentials
        if (email === 'timfulker@gmail.com' && password === 'admin123') {
          // Get admin user from database
          const adminUser = await storage.getUserByEmail('timfulker@gmail.com');
          
          // Set session data
          req.session.userId = adminUser?.id || '43963086';
          req.session.email = email;
          req.session.isAdmin = true;
          req.session.phoneVerified = true;
          
          // Save session explicitly
          req.session.save((err: any) => {
            if (err) {
              console.error(`❌ [ADMIN-${loginId}] Session save error:`, err);
              return res.status(500).json({ error: 'Session save failed' });
            }
            
            console.log(`✅ [ADMIN-${loginId}] Admin session created: ${req.session.userId}`);
            
            return res.json({
              success: true,
              user: {
                id: req.session.userId,
                email: email,
                isAdmin: true,
                tier: 'admin',
                phoneVerified: true
              }
            });
          });
        } else {
          console.log(`❌ [ADMIN-${loginId}] Invalid admin credentials`);
          return res.status(401).json({ error: 'Invalid credentials' });
        }
      } catch (error) {
        console.error(`❌ [ADMIN-${loginId}] Admin login error:`, error);
        res.status(500).json({ error: 'Login failed' });
      }
    });

    // Regular user login endpoint
    this.app.post('/api/auth/login', async (req: any, res) => {
      const loginId = Date.now().toString();
      console.log(`🔐 [LOGIN-${loginId}] Login attempt`);
      
      try {
        const { email, password } = req.body;
        
        // Get user from database
        const user = await storage.getUserByEmail(email);
        if (!user) {
          console.log(`❌ [LOGIN-${loginId}] User not found: ${email}`);
          return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Verify password
        const passwordValid = await bcrypt.compare(password, user.password);
        if (!passwordValid) {
          console.log(`❌ [LOGIN-${loginId}] Invalid password for: ${email}`);
          return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Set session data
        req.session.userId = user.id;
        req.session.email = user.email;
        req.session.isAdmin = user.isAdmin || false;
        req.session.phoneVerified = user.phoneVerified || false;
        
        // Save session explicitly
        req.session.save((err: any) => {
          if (err) {
            console.error(`❌ [LOGIN-${loginId}] Session save error:`, err);
            return res.status(500).json({ error: 'Session save failed' });
          }
          
          console.log(`✅ [LOGIN-${loginId}] User session created: ${user.id}`);
          
          return res.json({
            success: true,
            user: {
              id: user.id,
              email: user.email,
              isAdmin: user.isAdmin || false,
              tier: user.tier || 'trial',
              phoneVerified: user.phoneVerified || false
            }
          });
        });
      } catch (error) {
        console.error(`❌ [LOGIN-${loginId}] Login error:`, error);
        res.status(500).json({ error: 'Login failed' });
      }
    });

    // Get current user endpoint
    this.app.get('/api/auth/user', (req: any, res) => {
      console.log(`👤 Auth check - Session:`, {
        userId: req.session?.userId,
        email: req.session?.email,
        sessionId: req.sessionID,
        hasSession: !!req.session
      });
      
      if (!req.session?.userId) {
        console.log(`❌ No authenticated user session`);
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      res.json({
        id: req.session.userId,
        email: req.session.email,
        isAdmin: req.session.isAdmin || false,
        tier: 'admin', // Admin user gets admin tier
        phoneVerified: req.session.phoneVerified || false
      });
    });

    // Logout endpoint
    this.app.post('/api/auth/logout', (req: any, res) => {
      req.session.destroy((err: any) => {
        if (err) {
          console.error('❌ Logout error:', err);
          return res.status(500).json({ error: 'Logout failed' });
        }
        console.log('✅ User logged out successfully');
        res.json({ success: true });
      });
    });
  }
}