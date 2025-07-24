import { type Express } from "express";
import { storage } from "./storage";

// Replit authentication system using their auth service
export async function setupAuthentication(app: Express): Promise<void> {
  console.log('🔐 Setting up Replit authentication...');

  // Authentication middleware for unified email/password system
  app.use(async (req: any, res, next) => {
    try {
      // Check for session-based authentication first
      if (req.session?.userId) {
        const user = await storage.getUserById(req.session.userId);
        if (user) {
          req.user = user;
          return next();
        }
      }

      // For owner of the Repl, auto-create admin account if needed
      if (process.env.REPL_OWNER) {
        let user = await storage.getUserByEmail('timfulker@gmail.com');
        
        if (!user) {
          // Create admin user automatically with a default password
          user = await storage.createUser({
            email: 'timfulker@gmail.com',
            firstName: 'Tim',
            lastName: 'Fulker', 
            password: 'admin123', // You should change this
            tier: 'premium',
            isAdmin: true
          });
          console.log('✅ Auto-created admin user:', user.email, 'with password: admin123');
        }
      }

      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      next();
    }
  });

  console.log('✅ Replit authentication setup complete');
}

// Simple authentication middleware
export async function isAuthenticated(req: any, res: any, next: any) {
  if (req.user) {
    return next();
  }
  
  console.log('❌ Authentication required');
  res.status(401).json({ error: 'Authentication required' });
}

// Admin middleware  
export async function isAdmin(req: any, res: any, next: any) {
  if (req.user?.isAdmin) {
    return next();
  }
  
  console.log('❌ Admin access required');
  res.status(403).json({ error: 'Admin access required' });
}

// Beta tester middleware
export async function isBetaTester(req: any, res: any, next: any) {
  if (req.user?.isBetaTester || req.user?.isAdmin) {
    return next();
  }
  
  console.log('❌ Beta tester access required');
  res.status(403).json({ error: 'Beta tester access required' });
}

// Admin or beta tester middleware
export async function isAdminOrBetaTester(req: any, res: any, next: any) {
  if (req.user?.isAdmin || req.user?.isBetaTester) {
    return next();
  }
  
  console.log('❌ Beta tester or admin access required');
  res.status(403).json({ error: 'Beta tester or admin access required' });
}