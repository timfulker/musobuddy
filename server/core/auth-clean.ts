import { type Express } from "express";
import { storage } from "./storage";

// Replit authentication system using their auth service
export async function setupAuthentication(app: Express): Promise<void> {
  console.log('🔐 Setting up Replit authentication...');

  // Authentication middleware for unified email/password system
  app.use(async (req: any, res, next) => {
    try {
      // Minimal debug for production
      if (req.url === '/api/auth/user' && req.session?.userId) {
        console.log('✅ Auth check: User', req.session.userId, 'authenticated');
      }
      
      // Check for session-based authentication first - handle multiple session formats
      let userId = null;
      
      if (req.session?.userId) {
        userId = req.session.userId;
      } else if (req.session?.passport?.user) {
        userId = req.session.passport.user;
      } else if (req.session?.user?.id) {
        userId = req.session.user.id;
      }
      
      if (userId) {
        console.log('🔍 Found userId in session:', userId);
        const user = await storage.getUserById(userId.toString());
        if (user) {
          console.log('✅ User authenticated:', user.email);
          req.user = user;
          return next();
        } else {
          console.log('❌ User not found in database for ID:', userId);
        }
      } else {
        if (req.url === '/api/auth/user') {
          console.log('❌ No userId found in session');
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