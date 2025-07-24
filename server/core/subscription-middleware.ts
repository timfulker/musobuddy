import { Request, Response, NextFunction } from 'express';
import { storage } from './storage';

// Extend Request interface to include user
declare module 'express-serve-static-core' {
  interface Request {
    user?: any;
  }
}

export const requireSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        redirectTo: '/login'
      });
    }

    // Get user's subscription status
    const user = await storage.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Allow access if subscribed or lifetime user
    if (user.isSubscribed || user.isLifetime) {
      return next();
    }

    // For API requests, return JSON error
    if (req.path.startsWith('/api/')) {
      return res.status(403).json({ 
        error: 'Subscription required',
        message: 'This feature requires an active MusoBuddy subscription',
        plan: user.plan || 'free',
        upgradeUrl: '/pricing'
      });
    }

    // For page requests, redirect to pricing
    return res.redirect('/pricing?required=true');

  } catch (error) {
    console.error('Subscription middleware error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const requireSubscriptionOrAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        redirectTo: '/login'
      });
    }

    // Get user's subscription status
    const user = await storage.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Allow access if admin, subscribed, or lifetime user
    if (user.isAdmin || user.isSubscribed || user.isLifetime) {
      return next();
    }

    // For API requests, return JSON error
    if (req.path.startsWith('/api/')) {
      return res.status(403).json({ 
        error: 'Subscription or admin access required',
        message: 'This feature requires an active MusoBuddy subscription or admin access',
        plan: user.plan || 'free',
        upgradeUrl: '/pricing'
      });
    }

    // For page requests, redirect to pricing
    return res.redirect('/pricing?required=true');

  } catch (error) {
    console.error('Subscription middleware error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Helper function to check if user has access
export const hasSubscriptionAccess = async (userId: string): Promise<boolean> => {
  try {
    const user = await storage.getUserById(userId);
    return user ? (user.isSubscribed || user.isLifetime || user.isAdmin) : false;
  } catch (error) {
    console.error('Access check error:', error);
    return false;
  }
};