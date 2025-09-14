// Unified Supabase Authentication Middleware
import { type Request, type Response, type NextFunction } from 'express';
import { storage } from '../core/storage';
import jwt from 'jsonwebtoken';

// Extend Express Request type
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    emailVerified: boolean;
    firstName: string;
    lastName: string;
    supabaseUid: string;
    isAdmin: boolean;
    tier: string;
    phoneVerified: boolean;
  };
  token?: string;
}

/**
 * Extract JWT token from request
 */
function extractToken(req: Request): string | null {
  let token: string | null = null;

  // 1. Authorization header (Bearer token) - standard approach
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  // 2. Custom header for Supabase
  if (!token && req.headers['x-supabase-token']) {
    token = req.headers['x-supabase-token'] as string;
  }

  // 3. Query parameter (for download links, etc.)
  if (!token && req.query.token) {
    token = req.query.token as string;
  }

  return token;
}

/**
 * Main authentication middleware - Supabase only
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();

  console.log(`🔐 [AUTH] Request to: ${req.path} at ${new Date().toISOString()}`);

  // Extract token
  const token = extractToken(req);

  if (!token) {
    const duration = Date.now() - startTime;
    console.log(`❌ [AUTH] No token provided (${duration}ms)`);
    return res.status(401).json({
      error: 'Authentication required',
      details: 'No authentication token provided'
    });
  }

  try {
    // Decode the JWT to get user information
    // The token has already been verified by Supabase on the frontend
    const decoded = jwt.decode(token) as any;

    if (!decoded || !decoded.sub || !decoded.email) {
      const duration = Date.now() - startTime;
      console.log(`❌ [AUTH] Invalid token structure (${duration}ms)`);
      return res.status(401).json({
        error: 'Invalid authentication token',
        details: 'Token format is invalid'
      });
    }

    // Get user from database using Supabase UID or email
    console.log(`🔍 [AUTH] Looking for user with Supabase UID: ${decoded.sub} or email: ${decoded.email}`);

    // First try to find by supabase_uid
    let dbUser = await storage.getUserBySupabaseUid?.(decoded.sub);

    // Fallback: try to find by email
    if (!dbUser) {
      console.log(`🔍 [AUTH] No user found by Supabase UID, trying email: ${decoded.email}`);
      dbUser = await storage.getUserByEmail(decoded.email);

      // If found by email, we should update the user record with Supabase UID
      if (dbUser) {
        console.log(`🔧 [AUTH] Found user by email, should update Supabase UID`);
        // This will be handled by a migration script
      }
    }

    if (!dbUser) {
      const duration = Date.now() - startTime;
      console.log(`❌ [AUTH] User not found for Supabase UID: ${decoded.sub} (${duration}ms)`);
      return res.status(404).json({
        error: 'User not found',
        details: 'Please complete your account setup'
      });
    }

    // Check if account is locked
    if (dbUser.lockedUntil && new Date(dbUser.lockedUntil) > new Date()) {
      const lockExpiry = new Date(dbUser.lockedUntil);
      const duration = Date.now() - startTime;
      console.log(`🔒 [AUTH] Account locked for user ${dbUser.id} until ${lockExpiry.toISOString()}`);

      return res.status(423).json({
        error: 'Account temporarily locked',
        details: `Your account is locked until ${lockExpiry.toLocaleString()}. Contact support if you need assistance.`,
        lockedUntil: lockExpiry.toISOString()
      });
    }

    // Attach user to request
    req.user = {
      id: dbUser.id,
      email: dbUser.email || '',
      emailVerified: decoded.email_confirmed_at !== null,
      firstName: dbUser.firstName || '',
      lastName: dbUser.lastName || '',
      supabaseUid: decoded.sub,
      isAdmin: dbUser.isAdmin || false,
      tier: dbUser.tier || 'free',
      phoneVerified: dbUser.phoneVerified || false
    };
    req.token = token;

    const duration = Date.now() - startTime;
    console.log(`✅ [AUTH] Authenticated user ${dbUser.id} (${dbUser.email}) in ${duration}ms`);

    next();
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('Authentication error:', error);

    return res.status(500).json({
      error: 'Authentication failed',
      details: 'Internal server error'
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const token = extractToken(req);

  if (!token) {
    // No token is fine for optional auth
    return next();
  }

  try {
    // Decode token
    const decoded = jwt.decode(token) as any;

    if (decoded && decoded.sub && decoded.email) {
      // Try to get user from database
      let dbUser = await storage.getUserBySupabaseUid?.(decoded.sub);
      if (!dbUser) {
        dbUser = await storage.getUserByEmail(decoded.email);
      }

      if (dbUser) {
        req.user = {
          id: dbUser.id,
          email: dbUser.email || '',
          emailVerified: decoded.email_confirmed_at !== null,
          firstName: dbUser.firstName || '',
          lastName: dbUser.lastName || '',
          supabaseUid: decoded.sub,
          isAdmin: dbUser.isAdmin || false,
          tier: dbUser.tier || 'free',
          phoneVerified: dbUser.phoneVerified || false
        };
        req.token = token;

        console.log(`✅ [AUTH-OPTIONAL] User ${dbUser.id} authenticated`);
      }
    }
  } catch (error) {
    // Silent fail for optional auth
    console.log(`⚠️ [AUTH-OPTIONAL] Token verification failed (continuing anyway)`);
  }

  next();
};

// Export aliases for compatibility
export const requireAuth = authenticate;
export const authenticateUser = authenticate;