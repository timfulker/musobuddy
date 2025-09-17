/**
 * CLEAN SUPABASE-ONLY AUTHENTICATION MIDDLEWARE
 * No Firebase, no fallbacks, no legacy code
 * Created: December 2024
 */

import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { storage } from '../core/storage';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    emailVerified: boolean;
    firstName: string;
    lastName: string;
    isAdmin: boolean;
    tier: string;
    phoneVerified: boolean;
    supabaseUid: string;
  };
}

// Select Supabase project based on environment
const SUPABASE_URL = process.env.NODE_ENV === 'production'
  ? process.env.SUPABASE_URL_PROD!
  : process.env.SUPABASE_URL_DEV!;

const SUPABASE_ANON_KEY = process.env.NODE_ENV === 'production'
  ? process.env.SUPABASE_ANON_KEY_PROD!
  : process.env.SUPABASE_ANON_KEY_DEV!;

// Create single Supabase client for this environment
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log(`🔥 [NEW-AUTH] Initialized for ${process.env.NODE_ENV || 'development'} environment`);
console.log(`🔥 [NEW-AUTH] Using Supabase: ${SUPABASE_URL}`);

/**
 * Extract token from request
 */
function getToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

/**
 * Main authentication middleware - CLEAN VERSION
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const token = getToken(req);

  if (!token) {
    return res.status(401).json({ error: 'No authentication token provided' });
  }

  try {
    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.log(`❌ [NEW-AUTH] Token verification failed:`, error?.message);
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

    // Get user from database
    let dbUser = await storage.getUserBySupabaseUid?.(user.id);

    // Fallback to email lookup if needed (for migration period)
    if (!dbUser) {
      dbUser = await storage.getUserByEmail(user.email!);

      // Auto-link if found by email
      if (dbUser && !dbUser.supabaseUid) {
        await storage.updateUserSupabaseUid?.(dbUser.id, user.id);
        console.log(`🔗 [NEW-AUTH] Auto-linked Supabase UID for ${user.email}`);
      }
    }

    if (!dbUser) {
      console.log(`❌ [NEW-AUTH] No database user for ${user.email}`);
      return res.status(404).json({
        error: 'User account not found',
        details: 'Please complete account setup'
      });
    }

    // Check if account is locked
    if (dbUser.lockedUntil && new Date(dbUser.lockedUntil) > new Date()) {
      const lockExpiry = new Date(dbUser.lockedUntil);
      return res.status(423).json({
        error: 'Account temporarily locked',
        lockedUntil: lockExpiry.toISOString()
      });
    }

    // Attach user to request
    req.user = {
      id: dbUser.id,
      email: dbUser.email,
      emailVerified: !!user.email_confirmed_at,
      firstName: dbUser.firstName || '',
      lastName: dbUser.lastName || '',
      isAdmin: dbUser.isAdmin || false,
      tier: dbUser.tier || 'free',
      phoneVerified: dbUser.phoneVerified || false,
      supabaseUid: user.id
    };

    next();
  } catch (error) {
    console.error('❌ [NEW-AUTH] Unexpected error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};