import { type Express } from "express";
import { storage } from "./storage";

// Clean Replit-only authentication system
export async function setupAuthentication(app: Express): Promise<void> {
  console.log('🔐 Setting up clean Replit authentication...');

  // Simple middleware to get user from Replit
  app.use(async (req: any, res, next) => {
    // Get Replit user info
    const replitUser = req.headers['x-replit-user-id'] ? {
      id: req.headers['x-replit-user-id'] as string,
      name: req.headers['x-replit-user-name'] as string,
      email: req.headers['x-replit-user-email'] as string,
      profileImageUrl: req.headers['x-replit-user-profile-image'] as string
    } : null;

    if (replitUser?.email) {
      // Get or create user in our database
      let user = await storage.getUserByEmail(replitUser.email);
      
      if (!user) {
        // Auto-create user from Replit data
        user = await storage.createUser({
          id: replitUser.id,
          email: replitUser.email,
          firstName: replitUser.name?.split(' ')[0] || 'User',
          lastName: replitUser.name?.split(' ').slice(1).join(' ') || '',
          profileImageUrl: replitUser.profileImageUrl,
          tier: 'free',
          isAdmin: replitUser.email === 'timfulker@gmail.com' // Only you are admin
        });
        console.log('✅ Auto-created user from Replit:', user.email);
      }

      req.user = user;
    }

    next();
  });

  console.log('✅ Clean Replit authentication setup complete');
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