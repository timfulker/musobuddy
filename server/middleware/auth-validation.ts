import { Request, Response, NextFunction } from 'express';
import { storage } from '../core/storage';

export interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    isAdmin: boolean;
    email: string;
  };
}

// Safe authentication middleware
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user?.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Safe admin middleware
export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user?.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    const user = await storage.getUserById(req.user.userId);
    if (!user?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    next();
  } catch (error) {
    console.error('Admin validation error:', error);
    return res.status(500).json({ error: 'Authentication validation failed' });
  }
};

// Safe user access helper
export const getSafeUserId = (req: Request): string | null => {
  return req.user?.userId || null;
};

// Safe admin check helper
export const isSafeAdmin = async (req: Request): Promise<boolean> => {
  const userId = getSafeUserId(req);
  if (!userId) return false;
  
  try {
    const user = await storage.getUserById(userId);
    return user?.isAdmin || false;
  } catch (error) {
    console.error('Admin check error:', error);
    return false;
  }
};