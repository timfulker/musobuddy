import { Request, Response, NextFunction } from 'express';
import { storage } from './storage';

// Extend Request interface to include user
declare module 'express-serve-static-core' {
  interface Request {
    user?: any;
  }
}

// Simplified middleware - all authenticated users have access
export const requireSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        redirectTo: '/login'
      });
    }

    // All authenticated users have access (no free tier)
    return next();

  } catch (error) {
    console.error('Subscription middleware error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Simplified middleware - all authenticated users have access (no free tier blocking)
export const requireSubscriptionOrAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        redirectTo: '/login'
      });
    }

    // All authenticated users have access (admin-created accounts and subscribers)
    const userId = req.user.id || req.user.userId;
    console.log(`✅ Authenticated user ${userId} - access granted`);
    return next();

  } catch (error) {
    console.error('Subscription middleware error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Helper function to check if user has access (simplified - all authenticated users have access)
export const hasSubscriptionAccess = async (userId: string): Promise<boolean> => {
  try {
    const user = await storage.getUserById(userId);
    return !!user; // Any valid user has access
  } catch (error) {
    console.error('Access check error:', error);
    return false;
  }
};