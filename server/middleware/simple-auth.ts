/**
 * Project-Aware Supabase Authentication Middleware 
 * Automatically selects correct Supabase client based on JWT iss claim
 */
import { type Request, type Response, type NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { storage } from '../core/storage';

// Simple request interface
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
  };
}

// Project mapping
const PROJECT_CONFIGS = {
  [process.env.SUPABASE_URL_DEV!]: process.env.SUPABASE_ANON_KEY_DEV!,
  [process.env.SUPABASE_URL_PROD!]: process.env.SUPABASE_ANON_KEY_PROD!,
};

// Debug environment config on startup
console.log('🔧 [SIMPLE-AUTH] Environment Config:');
console.log(`   DEV URL: ${process.env.SUPABASE_URL_DEV}`);
console.log(`   PROD URL: ${process.env.SUPABASE_URL_PROD}`);
console.log(`   Available projects: ${Object.keys(PROJECT_CONFIGS).join(', ')}`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);

/**
 * Parse JWT payload without verification to get iss claim
 */
function parseTokenIss(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    return payload.iss?.replace('/auth/v1', '') || null;
  } catch {
    return null;
  }
}

/**
 * Project-aware authentication middleware using Supabase's built-in user verification
 */
export const simpleAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  // Extract token
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    // Parse token to get project URL from iss claim
    const issUrl = parseTokenIss(token);
    console.log(`🔍 [SIMPLE-AUTH] Token iss: ${issUrl}`);
    
    // Select correct Supabase client based on token's project
    const anonKey = issUrl ? PROJECT_CONFIGS[issUrl] : null;
    if (!anonKey) {
      console.log(`❌ [SIMPLE-AUTH] No config found for project: ${issUrl}`);
      return res.status(401).json({ error: 'Invalid project' });
    }

    const supabase = createClient(issUrl!, anonKey);
    console.log(`✅ [SIMPLE-AUTH] Using project: ${issUrl}`);

    // Use Supabase's built-in user verification
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user?.email) {
      console.log(`❌ [SIMPLE-AUTH] Supabase getUser failed:`, error?.message);
      return res.status(401).json({ error: 'Invalid token' });
    }

    console.log(`🔍 [SIMPLE-AUTH] Supabase user verified: ${user.email}`);

    // Get user from database (maintain compatibility with all lookup methods)  
    let dbUser;
    try {
      dbUser = await storage.getUserBySupabaseUid?.(user.id);
      if (!dbUser) {
        dbUser = await storage.getUserByEmail(user.email);
      }
    } catch (error: any) {
      console.log(`⚠️ [SIMPLE-AUTH] Database lookup failed, will auto-create user:`, error.message);
    }
    
    if (!dbUser) {
      console.log(`❌ [SIMPLE-AUTH] Database user not found for: ${user.email} (UID: ${user.id})`);
      console.log(`🔧 [SIMPLE-AUTH] User exists in Supabase Auth but not in database`);
      console.log(`💡 [SIMPLE-AUTH] Manual fix required: Update user record with correct supabaseUid`);
      return res.status(404).json({ 
        error: 'User profile not found',
        details: 'User exists in Supabase Auth but missing database profile'
      });
    }

    // Check account locking (maintain existing security)
    if (dbUser.lockedUntil && new Date(dbUser.lockedUntil) > new Date()) {
      const lockExpiry = new Date(dbUser.lockedUntil);
      console.log(`🔒 [SIMPLE-AUTH] Account locked until ${lockExpiry.toISOString()}`);
      return res.status(423).json({
        error: 'Account temporarily locked',
        details: `Your account is locked until ${lockExpiry.toLocaleString()}`,
        lockedUntil: lockExpiry.toISOString()
      });
    }

    // Attach user to request (full compatibility)
    req.user = {
      id: dbUser.id,
      email: dbUser.email || '',
      emailVerified: !!user.email_confirmed_at,
      firstName: dbUser.firstName || '',
      lastName: dbUser.lastName || '',
      isAdmin: dbUser.isAdmin || false,
      tier: dbUser.tier || 'free',
      phoneVerified: dbUser.phoneVerified || false
    };

    console.log(`✅ [SIMPLE-AUTH] Authentication successful for: ${dbUser.email}`);
    next();
  } catch (error) {
    console.error('❌ [SIMPLE-AUTH] Authentication error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

// Export alias for compatibility
export const authenticate = simpleAuth;