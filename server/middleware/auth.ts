// Unified Authentication Middleware with Supabase-First and Firebase Fallback
import { type Request, type Response, type NextFunction } from 'express';
import { storage } from '../core/storage';
import { 
  verifyUnifiedJWT, 
  verifyUnifiedJWTOptional, 
  getSupabaseUrl, 
  getTokenProvider,
  isValidTokenFormat,
  type UnifiedJWTPayload,
  type SupabaseJWTPayload,
  type FirebaseJWTPayload
} from '../utils/jwt-verification';

// Extend Express Request type with unified auth support
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    emailVerified: boolean;
    firstName: string;
    lastName: string;
    supabaseUid?: string; // Optional for Firebase fallback
    firebaseUid?: string; // Optional for Firebase fallback
    isAdmin: boolean;
    tier: string;
    phoneVerified: boolean;
  };
  token?: string;
  authProvider?: 'supabase' | 'firebase'; // Track which auth method was used
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
 * Check if JWT payload is from Supabase
 */
function isSupabasePayload(payload: UnifiedJWTPayload): payload is SupabaseJWTPayload {
  return 'role' in payload && 'aud' in payload;
}

/**
 * Check if JWT payload is from Firebase
 */
function isFirebasePayload(payload: UnifiedJWTPayload): payload is FirebaseJWTPayload {
  return 'uid' in payload && !('role' in payload);
}

/**
 * Main authentication middleware - Unified Supabase-first with Firebase fallback
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();

  console.log(`🔐 [UNIFIED-AUTH] Request to: ${req.path} at ${new Date().toISOString()}`);

  // Extract token
  const token = extractToken(req);

  if (!token) {
    const duration = Date.now() - startTime;
    console.log(`❌ [UNIFIED-AUTH] No token provided (${duration}ms)`);
    return res.status(401).json({
      error: 'Authentication required',
      details: 'No authentication token provided'
    });
  }

  // Quick validation of token format and anon key rejection
  if (!isValidTokenFormat(token)) {
    const duration = Date.now() - startTime;
    console.log(`❌ [UNIFIED-AUTH] Invalid token format or anon key detected (${duration}ms)`);
    return res.status(401).json({
      error: 'Invalid authentication token',
      details: 'Auth session missing! Please log in with a valid user account'
    });
  }

  // Detect provider for logging
  const provider = getTokenProvider(token);
  console.log(`🔍 [UNIFIED-AUTH] Detected ${provider} token`);

  try {
    // Verify JWT signature and claims using unified verification
    // This will automatically route HS256→Supabase, RS256→Firebase
    const decoded = await verifyUnifiedJWT(token, 'authenticated');

    if (!decoded || !decoded.sub || !decoded.email) {
      const duration = Date.now() - startTime;
      console.log(`❌ [UNIFIED-AUTH] Invalid verified token structure (${duration}ms)`);
      return res.status(401).json({
        error: 'Invalid authentication token',
        details: 'Token verification failed'
      });
    }

    let dbUser;
    let authProvider: 'supabase' | 'firebase';

    // Handle Supabase authentication
    if (isSupabasePayload(decoded)) {
      authProvider = 'supabase';
      console.log(`🔍 [UNIFIED-AUTH] Processing Supabase user: ${decoded.sub} (${decoded.email})`);

      // First try to find by supabase_uid
      dbUser = await storage.getUserBySupabaseUid?.(decoded.sub);

      // Fallback: try to find by email
      if (!dbUser) {
        console.log(`🔍 [UNIFIED-AUTH] No user found by Supabase UID, trying email: ${decoded.email}`);
        dbUser = await storage.getUserByEmail(decoded.email);

        // If found by email, we should update the user record with Supabase UID
        if (dbUser) {
          console.log(`🔧 [UNIFIED-AUTH] Found user by email, should update Supabase UID`);
          // This will be handled by a migration script
        }
      }
    }
    // Handle Firebase authentication (fallback)
    else if (isFirebasePayload(decoded)) {
      authProvider = 'firebase';
      console.log(`🔍 [UNIFIED-AUTH] Processing Firebase user: ${decoded.uid} (${decoded.email})`);

      // First try to find by firebase_uid
      dbUser = await storage.getUserByFirebaseUid?.(decoded.uid);

      // Fallback: try to find by email
      if (!dbUser) {
        console.log(`🔍 [UNIFIED-AUTH] No user found by Firebase UID, trying email: ${decoded.email}`);
        dbUser = await storage.getUserByEmail(decoded.email);
      }
    }
    else {
      const duration = Date.now() - startTime;
      console.log(`❌ [UNIFIED-AUTH] Unknown token payload type (${duration}ms)`);
      return res.status(401).json({
        error: 'Invalid authentication token',
        details: 'Unsupported token type'
      });
    }

    if (!dbUser) {
      const duration = Date.now() - startTime;
      const uid = isSupabasePayload(decoded) ? decoded.sub : (decoded as FirebaseJWTPayload).uid;
      console.log(`❌ [UNIFIED-AUTH] User not found for ${authProvider} UID: ${uid} (${duration}ms)`);
      return res.status(404).json({
        error: 'User not found',
        details: 'Please complete your account setup'
      });
    }

    // Check if account is locked
    if (dbUser.lockedUntil && new Date(dbUser.lockedUntil) > new Date()) {
      const lockExpiry = new Date(dbUser.lockedUntil);
      const duration = Date.now() - startTime;
      console.log(`🔒 [UNIFIED-AUTH] Account locked for user ${dbUser.id} until ${lockExpiry.toISOString()}`);

      return res.status(423).json({
        error: 'Account temporarily locked',
        details: `Your account is locked until ${lockExpiry.toLocaleString()}. Contact support if you need assistance.`,
        lockedUntil: lockExpiry.toISOString()
      });
    }

    // Attach user to request with provider-specific fields
    req.user = {
      id: dbUser.id,
      email: dbUser.email || '',
      emailVerified: isSupabasePayload(decoded) 
        ? decoded.email_confirmed_at !== null 
        : !!decoded.email_verified,
      firstName: dbUser.firstName || '',
      lastName: dbUser.lastName || '',
      isAdmin: dbUser.isAdmin || false,
      tier: dbUser.tier || 'free',
      phoneVerified: dbUser.phoneVerified || false
    };

    // Add provider-specific UIDs
    if (isSupabasePayload(decoded)) {
      req.user.supabaseUid = decoded.sub;
    } else if (isFirebasePayload(decoded)) {
      req.user.firebaseUid = decoded.uid;
    }

    req.token = token;
    req.authProvider = authProvider;

    const duration = Date.now() - startTime;
    console.log(`✅ [UNIFIED-AUTH] Authenticated ${authProvider} user ${dbUser.id} (${dbUser.email}) in ${duration}ms`);

    next();
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`❌ [UNIFIED-AUTH] Authentication error after ${duration}ms:`, {
      message: error.message,
      name: error.name,
      path: req.path,
      provider: getTokenProvider(token),
      hasToken: !!token
    });

    // Check for specific anon key errors
    if (error.message?.includes('anon key') || error.message?.includes('SECURITY')) {
      return res.status(401).json({
        error: 'Invalid authentication',
        details: 'Auth session missing! Please log in with a valid user account'
      });
    }

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

  // Quick validation and anon key rejection
  if (!isValidTokenFormat(token)) {
    console.log(`⚠️ [UNIFIED-AUTH-OPTIONAL] Invalid token format or anon key detected (continuing anyway)`);
    return next();
  }

  try {
    // Verify JWT signature for optional auth (graceful failure)
    const decoded = await verifyUnifiedJWTOptional(token, 'authenticated');

    if (decoded && decoded.sub && decoded.email) {
      let dbUser;

      // Handle Supabase authentication
      if (isSupabasePayload(decoded)) {
        // Try to get user from database
        dbUser = await storage.getUserBySupabaseUid?.(decoded.sub);
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
          req.authProvider = 'supabase';

          console.log(`✅ [UNIFIED-AUTH-OPTIONAL] Supabase user ${dbUser.id} authenticated`);
        }
      }
      // Handle Firebase authentication (fallback)
      else if (isFirebasePayload(decoded)) {
        dbUser = await storage.getUserByFirebaseUid?.(decoded.uid);
        if (!dbUser) {
          dbUser = await storage.getUserByEmail(decoded.email);
        }

        if (dbUser) {
          req.user = {
            id: dbUser.id,
            email: dbUser.email || '',
            emailVerified: !!decoded.email_verified,
            firstName: dbUser.firstName || '',
            lastName: dbUser.lastName || '',
            firebaseUid: decoded.uid,
            isAdmin: dbUser.isAdmin || false,
            tier: dbUser.tier || 'free',
            phoneVerified: dbUser.phoneVerified || false
          };
          req.token = token;
          req.authProvider = 'firebase';

          console.log(`✅ [UNIFIED-AUTH-OPTIONAL] Firebase user ${dbUser.id} authenticated`);
        }
      }
    }
  } catch (error) {
    // Silent fail for optional auth - token verification already logged in JWT utility
    console.log(`⚠️ [UNIFIED-AUTH-OPTIONAL] Token verification failed (continuing anyway)`);
  }

  next();
};

// Export aliases for compatibility
export const requireAuth = authenticate;
export const authenticateUser = authenticate;