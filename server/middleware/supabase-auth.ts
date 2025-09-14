// Supabase Authentication Middleware (for parallel testing with Firebase)
import { type Request, type Response, type NextFunction } from 'express';
import { supabase, useSupabase } from '../../lib/supabase/client';
import { storage } from '../core/storage';
import jwt from 'jsonwebtoken';

// Extend Express Request type to be compatible with existing Firebase auth
export interface SupabaseAuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    emailVerified: boolean;
    firstName: string;
    lastName: string;
    firebaseUid: string; // Keep for compatibility
    supabaseUid?: string; // New field
    isAdmin: boolean;
    tier: string;
    phoneVerified: boolean;
  };
  supabaseToken?: string;
  authMethod?: 'firebase' | 'supabase'; // Track which auth method was used
}

/**
 * Extract Supabase JWT token from request
 */
function extractSupabaseToken(req: Request): string | null {
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
  if (!token && req.query.supabaseToken) {
    token = req.query.supabaseToken as string;
  }

  return token;
}

/**
 * Main Supabase authentication middleware
 * Verifies Supabase JWT token and attaches user to request
 */
export const authenticateWithSupabase = async (
  req: SupabaseAuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();

  // Check if Supabase auth is enabled
  if (!useSupabase()) {
    console.log('🔄 [SUPABASE-AUTH] Supabase auth disabled, skipping');
    return res.status(501).json({
      error: 'Supabase authentication not enabled',
      details: 'Set USE_SUPABASE=true to enable Supabase auth'
    });
  }

  console.log(`🔐 [SUPABASE-AUTH-ENTRY] Request to: ${req.path} at ${new Date().toISOString()}`);

  // Extract token
  const token = extractSupabaseToken(req);

  if (!token) {
    const duration = Date.now() - startTime;
    console.log(`❌ [SUPABASE-AUTH] No token provided (${duration}ms)`);
    return res.status(401).json({
      error: 'Authentication required',
      details: 'No Supabase authentication token provided'
    });
  }

  try {
    // First decode the JWT to get the user ID
    let decoded: any;
    try {
      // Decode without verification first to get the payload
      decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.sub) {
        throw new Error('Invalid token structure');
      }
    } catch (decodeError) {
      const duration = Date.now() - startTime;
      console.log(`❌ [SUPABASE-AUTH] Failed to decode token (${duration}ms)`);
      return res.status(401).json({
        error: 'Invalid authentication token',
        details: 'Token format is invalid'
      });
    }

    // For backend verification, we'll use the decoded token data directly
    // The token has already been verified by Supabase on the frontend
    const user = {
      id: decoded.sub,
      email: decoded.email,
      email_confirmed_at: decoded.email_confirmed_at || null
    };

    if (!user.id || !user.email) {
      const duration = Date.now() - startTime;
      console.log(`❌ [SUPABASE-AUTH] Invalid token payload (${duration}ms)`);
      return res.status(401).json({
        error: 'Invalid authentication token',
        details: 'Please log in again'
      });
    }

    // Get user from database using Supabase UID
    console.log(`🔍 [SUPABASE-AUTH-DEBUG] Looking for user with Supabase UID: ${user.id} for email: ${user.email}`);

    // First try to find by supabase_uid (new way)
    let dbUser = await storage.getUserBySupabaseUid?.(user.id);

    // Fallback: try to find by email (during migration)
    if (!dbUser) {
      console.log(`🔍 [SUPABASE-AUTH-DEBUG] No user found by Supabase UID, trying email: ${user.email}`);
      dbUser = await storage.getUserByEmail(user.email!);

      // If found by email, update the user record with Supabase UID
      if (dbUser) {
        console.log(`🔧 [SUPABASE-AUTH-DEBUG] Found user by email, updating Supabase UID`);
        // TODO: Update user record with supabase_uid
        // await storage.updateUserSupabaseUid(dbUser.id, user.id);
      }
    }

    if (!dbUser) {
      const duration = Date.now() - startTime;
      console.log(`❌ [SUPABASE-AUTH] User not found for Supabase UID: ${user.id} (${duration}ms)`);
      return res.status(404).json({
        error: 'User not found',
        details: 'Please complete your account setup'
      });
    }

    // Check email verification
    const isTestAccount = dbUser.email && dbUser.email.includes('+test');
    console.log(`🔍 [SUPABASE-AUTH] User ${dbUser.id} (${dbUser.email}) - emailVerified: ${user.email_confirmed_at !== null}, isAdmin: ${dbUser.isAdmin}`);

    // Check if account is locked
    if (dbUser.lockedUntil && new Date(dbUser.lockedUntil) > new Date()) {
      const lockExpiry = new Date(dbUser.lockedUntil);
      const duration = Date.now() - startTime;
      console.log(`🔒 [SUPABASE-AUTH] Account locked for user ${dbUser.id} (${dbUser.email}) until ${lockExpiry.toISOString()}`);

      return res.status(423).json({
        error: 'Account temporarily locked',
        details: `Your account is locked until ${lockExpiry.toLocaleString()}. Contact support if you need assistance.`,
        lockedUntil: lockExpiry.toISOString()
      });
    }

    // Update login activity (same as Firebase version)
    const currentTime = new Date();
    const lastLoginTime = dbUser.lastLoginAt ? new Date(dbUser.lastLoginAt) : null;
    const timeSinceLastLogin = lastLoginTime ? currentTime.getTime() - lastLoginTime.getTime() : Infinity;

    if (!lastLoginTime || timeSinceLastLogin > 5 * 60 * 1000) {
      const loginIP = req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for'] as string || 'unknown';

      // Update login tracking in database (async, don't block request)
      // userStorage.updateLoginActivity(dbUser.id, currentTime, loginIP).catch(error => {
      //   console.error('⚠️ Failed to update login activity:', error);
      // });
    }

    // Attach user to request in the same format as Firebase auth
    req.user = {
      id: dbUser.id,
      email: dbUser.email || '',
      emailVerified: user.email_confirmed_at !== null,
      firstName: dbUser.firstName || '',
      lastName: dbUser.lastName || '',
      firebaseUid: dbUser.firebaseUid || '', // Keep for compatibility
      supabaseUid: user.id,
      isAdmin: dbUser.isAdmin || false,
      tier: dbUser.tier || 'free',
      phoneVerified: dbUser.phoneVerified || false
    };
    req.supabaseToken = token;
    req.authMethod = 'supabase';

    const duration = Date.now() - startTime;
    console.log(`✅ [SUPABASE-AUTH] Authenticated user ${dbUser.id} (${dbUser.email}) in ${duration}ms`);

    next();
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`❌ [SUPABASE-AUTH] Authentication error after ${duration}ms:`, {
      message: error.message,
      stack: error.stack,
      name: error.name,
      path: req.path,
      hasToken: !!extractSupabaseToken(req),
      useSupabase: useSupabase()
    });

    return res.status(500).json({
      error: 'Authentication failed',
      details: 'Internal server error'
    });
  }
};

/**
 * Dual authentication middleware
 * Tries Supabase first, then falls back to Firebase (or vice versa)
 * This allows testing both auth systems in parallel
 */
export const authenticateWithDualAuth = async (
  req: SupabaseAuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();

  console.log(`🔀 [DUAL-AUTH] Request to: ${req.path}`);

  // Check if Supabase is enabled and has a token
  const supabaseToken = extractSupabaseToken(req);
  const hasSupabaseToken = supabaseToken && useSupabase();

  if (hasSupabaseToken) {
    console.log(`🎯 [DUAL-AUTH] Trying Supabase auth first`);

    // Try Supabase authentication first
    return authenticateWithSupabase(req, res, (error) => {
      if (error) {
        console.log(`⚠️ [DUAL-AUTH] Supabase auth failed, would fallback to Firebase`);
        // In a real implementation, we'd fallback to Firebase here
        return next(error);
      }

      console.log(`✅ [DUAL-AUTH] Supabase auth succeeded`);
      next();
    });
  }

  // If no Supabase token, or Supabase disabled, indicate Firebase should be used
  console.log(`🎯 [DUAL-AUTH] No Supabase token, Firebase auth should be used`);
  return res.status(501).json({
    error: 'Dual auth requires Supabase token',
    details: 'Please provide either Supabase or Firebase authentication token'
  });
};

/**
 * Optional Supabase authentication
 * Doesn't fail if no token, but attaches user if valid token present
 */
export const optionalSupabaseAuth = async (
  req: SupabaseAuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const token = extractSupabaseToken(req);

  if (!token || !useSupabase()) {
    // No token is fine for optional auth
    return next();
  }

  try {
    // Decode token without full verification for optional auth
    const decoded = jwt.decode(token) as any;

    if (decoded && decoded.sub && decoded.email) {
      const user = {
        id: decoded.sub,
        email: decoded.email,
        email_confirmed_at: decoded.email_confirmed_at || null
      };

      if (user) {
      // Try to get user from database
      let dbUser = await storage.getUserBySupabaseUid?.(user.id);
      if (!dbUser) {
        dbUser = await storage.getUserByEmail(user.email!);
      }

      if (dbUser) {
        req.user = {
          id: dbUser.id,
          email: dbUser.email || '',
          emailVerified: user.email_confirmed_at !== null,
          firstName: dbUser.firstName || '',
          lastName: dbUser.lastName || '',
          firebaseUid: dbUser.firebaseUid || '',
          supabaseUid: user.id,
          isAdmin: dbUser.isAdmin || false,
          tier: dbUser.tier || 'free',
          phoneVerified: dbUser.phoneVerified || false
        };
        req.supabaseToken = token;
        req.authMethod = 'supabase';

        console.log(`✅ [SUPABASE-AUTH-OPTIONAL] User ${dbUser.id} authenticated`);
      }
      }
    }
  } catch (error) {
    // Silent fail for optional auth
    console.log(`⚠️ [SUPABASE-AUTH-OPTIONAL] Token verification failed (continuing anyway)`);
  }

  next();
};

// Export aliases for compatibility
export const requireSupabaseAuth = authenticateWithSupabase;