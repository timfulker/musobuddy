import jwt from 'jsonwebtoken';
import { type Request, type Response, type NextFunction } from 'express';

const JWT_SECRET = process.env.SESSION_SECRET || 'fallback-secret-key';

interface AuthToken {
  userId: string;
  email: string;
  isVerified: boolean;
}

export function generateAuthToken(userId: string, email: string, isVerified: boolean = true): string {
  return jwt.sign({ userId, email, isVerified }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyAuthToken(token: string): AuthToken | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthToken;
  } catch (error) {
    return null;
  }
}

export const requireAuth = (req: any, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const decoded = verifyAuthToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  
  req.user = decoded;
  next();
};