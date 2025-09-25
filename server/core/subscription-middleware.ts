import { Request, Response, NextFunction } from 'express';
import { storage } from './storage';

// Extend Request interface to include user
declare module 'express-serve-static-core' {
  interface Request {
    user?: any;
  }
}

// SECURE: Verify subscription status before granting access
export const requireSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        redirectTo: '/login'
      });
    }

    const userId = req.user.id || req.user.userId;
    const user = await storage.getUserById(userId);
    
    if (!user) {
      return res.status(401).json({ 
        error: 'User not found',
        redirectTo: '/login'
      });
    }

    // STRICT: Only allow specific exempt accounts to bypass subscription checks
    const allowedBypassEmails = ['timfulker@gmail.com', 'timfulkermusic@gmail.com', 'jake.stanley@musobuddy.com'];
    const isExemptUser = allowedBypassEmails.includes(user.email) || user.createdByAdmin;
    
    if (isExemptUser) {
      console.log(`✅ Exempt user ${userId} (${user.email}) - subscription check bypassed`);
      return next();
    }

    // ENFORCE: hasPaid must be true for any access
    if (!user.hasPaid) {
      console.log(`🔒 Access denied for user ${userId} (${user.email}) - subscription verification failed`);
      return res.status(403).json({ 
        error: 'Subscription required',
        redirectTo: '/start-trial',
        needsSubscription: true
      });
    }

    console.log(`✅ Authenticated user ${userId} - subscription verified, access granted`);
    return next();

  } catch (error) {
    console.error('Subscription middleware error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// SECURE: Verify subscription status OR admin access before granting access
export const requireSubscriptionOrAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        redirectTo: '/login'
      });
    }

    const userId = req.user.id || req.user.userId;
    const user = await storage.getUserById(userId);

    if (!user) {
      return res.status(401).json({
        error: 'User not found',
        redirectTo: '/login'
      });
    }

    // Allow admin access
    if (user.isAdmin) {
      console.log(`✅ Admin user ${userId} - access granted`);
      return next();
    }

    // STRICT: Only allow specific exempt accounts to bypass subscription checks
    const allowedBypassEmails = ['timfulker@gmail.com', 'timfulkermusic@gmail.com', 'jake.stanley@musobuddy.com'];
    const isExemptUser = allowedBypassEmails.includes(user.email) || user.createdByAdmin;

    if (isExemptUser) {
      console.log(`✅ Exempt user ${userId} (${user.email}) - subscription check bypassed`);
      return next();
    }

    // ENFORCE: hasPaid must be true for any access
    const hasAccess = user.hasPaid;

    if (!hasAccess) {
      console.log(`🔒 Access denied for user ${userId} (${user.email}) - hasPaid must be true for access`, {
        hasPaid: user.hasPaid,
        isSubscribed: user.isSubscribed,
        trialEndsAt: user.trialEndsAt,
        isBetaTester: user.isBetaTester
      });
      return res.status(403).json({
        error: 'Subscription required',
        redirectTo: '/start-trial',
        needsSubscription: true
      });
    }

    console.log(`✅ Authenticated user ${userId} - access granted`, { hasPaid: user.hasPaid });
    return next();

  } catch (error) {
    console.error('Subscription middleware error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// SECURE: Helper function to check if user has valid subscription access
export const hasSubscriptionAccess = async (userId: string): Promise<boolean> => {
  try {
    const user = await storage.getUserById(userId);
    if (!user) return false;
    
    // Admin users always have access
    if (user.isAdmin) return true;
    
    // Simple check: hasPaid must be true
    return user.hasPaid;
  } catch (error) {
    console.error('Access check error:', error);
    return false;
  }
};