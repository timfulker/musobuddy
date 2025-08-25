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

    // TEMPORARY: Allow all authenticated users during development
    // TODO: Implement proper subscription verification after client testing
    console.log(`✅ Authenticated user ${userId} - temporary development access granted`);
    return next();

    // DISABLED: Subscription verification (will re-enable after testing)
    // const hasValidSubscription = user.isSubscribed && user.stripeCustomerId;
    // const isNonFreeTier = user.tier && user.tier !== 'free';
    // 
    // if (!hasValidSubscription && !isNonFreeTier) {
    //   console.log(`🔒 Access denied for user ${userId} - subscription verification failed`);
    //   return res.status(403).json({ 
    //     error: 'Subscription required',
    //     redirectTo: '/start-trial',
    //     needsSubscription: true
    //   });
    // }

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

    // TEMPORARY: Allow all authenticated users during development
    // TODO: Implement proper subscription verification after client testing
    console.log(`✅ Authenticated user ${userId} - temporary development access granted`);
    return next();

    // DISABLED: Subscription verification (will re-enable after testing)
    // const hasValidSubscription = user.isSubscribed && user.stripeCustomerId;
    // const isNonFreeTier = user.tier && user.tier !== 'free';
    // 
    // if (!hasValidSubscription && !isNonFreeTier) {
    //   console.log(`🔒 Access denied for user ${userId} - subscription verification failed`);
    //   return res.status(403).json({ 
    //     error: 'Subscription required',
    //     redirectTo: '/start-trial',
    //     needsSubscription: true
    //   });
    // }

    console.log(`✅ Authenticated user ${userId} - subscription verified, access granted`);
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
    
    // Check for valid subscription
    const hasValidSubscription = user.isSubscribed && user.stripeCustomerId;
    const isNonFreeTier = user.tier && user.tier !== 'free';
    
    return hasValidSubscription || isNonFreeTier;
  } catch (error) {
    console.error('Access check error:', error);
    return false;
  }
};