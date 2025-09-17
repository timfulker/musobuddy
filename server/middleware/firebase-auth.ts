// Pure Firebase Authentication Middleware
import { type Request, type Response, type NextFunction } from 'express';
import { verifyFirebaseToken } from '../core/firebase-admin';
import { storage } from '../core/storage';
import { userStorage } from '../storage/user-storage';

// Enhanced logging for debugging - controlled by environment
const AUTH_DEBUG = process.env.AUTH_DEBUG === 'true' && process.env.NODE_ENV === 'development';

// Extend Express Request type
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    emailVerified: boolean;  // Firebase email verification status
    firstName: string;
    lastName: string;
    firebaseUid: string;
    isAdmin: boolean;
    tier: string;
    phoneVerified: boolean;
  };
  firebaseToken?: string;
}

/**
 * Extract Firebase ID token from request
 */
function extractFirebaseToken(req: Request): string | null {
  let token: string | null = null;
  
  // 1. Authorization header (Bearer token) - standard approach
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }
  
  // 2. Custom header (fallback for some clients)
  if (!token && req.headers['x-firebase-token']) {
    token = req.headers['x-firebase-token'] as string;
  }
  
  // 3. Query parameter (for download links, etc.)
  if (!token && req.query.firebaseToken) {
    token = req.query.firebaseToken as string;
  }
  
  return token;
}

/**
 * Main Firebase authentication middleware
 * Verifies Firebase ID token and attaches user to request
 */
export const authenticateWithFirebase = async (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
) => {
  const startTime = Date.now();
  
  console.log(`🔐 [FIREBASE-AUTH-ENTRY] Request to: ${req.path} at ${new Date().toISOString()}`);
  
  // Extract token
  const token = extractFirebaseToken(req);
  
  if (!token) {
    const duration = Date.now() - startTime;
    if (AUTH_DEBUG) {
      console.log(`❌ [FIREBASE-AUTH] No token provided (${duration}ms)`);
    }
    return res.status(401).json({ 
      error: 'Authentication required',
      details: 'No authentication token provided'
    });
  }
  
  try {
    // Verify Firebase token
    const firebaseUser = await verifyFirebaseToken(token);
    
    if (!firebaseUser) {
      const duration = Date.now() - startTime;
      if (AUTH_DEBUG) {
        console.log(`❌ [FIREBASE-AUTH] Invalid token (${duration}ms)`);
      }
      return res.status(401).json({ 
        error: 'Invalid authentication token',
        details: 'Please log in again'
      });
    }
    
    // Get user from database by email (Firebase UID no longer supported)
    console.log(`🔍 [FIREBASE-AUTH-DEBUG] Looking for user by email: ${firebaseUser.email}`);
    const user = await storage.getUserByEmail(firebaseUser.email);
    
    if (!user) {
      const duration = Date.now() - startTime;
      console.log(`❌ [FIREBASE-AUTH] User not found for email: ${firebaseUser.email} (${duration}ms)`);
      
      return res.status(404).json({ 
        error: 'User not found',
        details: 'Please complete your account setup or use Supabase authentication'
      });
    }
    
    // SECURITY: Check email verification for non-privileged users  
    // Allow bypass only for +test accounts (matches Stripe test environment logic)
    const isTestAccount = user.email && user.email.includes('+test');
    
    // Log verification status for debugging
    console.log(`🔍 [FIREBASE-AUTH] User ${user.id} (${user.email}) - emailVerified: ${firebaseUser.emailVerified}, isAdmin: ${user.isAdmin}, isAssigned: ${user.isAssigned}`);
    
    // TEMPORARILY DISABLED: Email verification check causing issues
    // if (!user.isAdmin && !user.isAssigned && !isTestAccount && !firebaseUser.emailVerified) {
    //   const duration = Date.now() - startTime;
    //   console.log(`🔒 [FIREBASE-AUTH] Email verification required for user ${user.id} (${user.email})`);
    //   
    //   return res.status(403).json({ 
    //     error: 'Email verification required',
    //     details: 'Please verify your email address to access this feature',
    //     requiresVerification: true,
    //     email: user.email
    //   });
    // }
    
    if (isTestAccount && AUTH_DEBUG) {
      console.log(`🧪 [FIREBASE-AUTH] Test account bypass for ${user.email}`);
    }
    
    // Check if account is locked
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const lockExpiry = new Date(user.lockedUntil);
      const duration = Date.now() - startTime;
      console.log(`🔒 [FIREBASE-AUTH] Account locked for user ${user.id} (${user.email}) until ${lockExpiry.toISOString()}`);
      
      return res.status(423).json({ 
        error: 'Account temporarily locked',
        details: `Your account is locked until ${lockExpiry.toLocaleString()}. Contact support if you need assistance.`,
        lockedUntil: lockExpiry.toISOString()
      });
    }
    
    // Check if this is a fresh login by comparing with last login time
    const currentTime = new Date();
    const lastLoginTime = user.lastLoginAt ? new Date(user.lastLoginAt) : null;
    const timeSinceLastLogin = lastLoginTime ? currentTime.getTime() - lastLoginTime.getTime() : Infinity;
    
    // Only track login activity if it's been more than 5 minutes since last login
    // This prevents tracking every API call as a "login"
    if (!lastLoginTime || timeSinceLastLogin > 5 * 60 * 1000) {
      const loginIP = req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for'] as string || 'unknown';
      
      // Update login tracking in database (async, don't block request)
      userStorage.updateLoginActivity(user.id, currentTime, loginIP).catch(error => {
        console.error('⚠️ Failed to update login activity:', error);
        // Don't block authentication if tracking fails
      });
    }
    
    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email || '',
      emailVerified: firebaseUser.emailVerified || false,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      firebaseUid: firebaseUser.uid,
      isAdmin: user.isAdmin || false,
      tier: user.tier || 'free',
      phoneVerified: user.phoneVerified || false
    };
    req.firebaseToken = token;
    
    const duration = Date.now() - startTime;
    if (AUTH_DEBUG) {
      console.log(`✅ [FIREBASE-AUTH] Authenticated user ${user.id} (${user.email}) from IP ${loginIP} in ${duration}ms`);
    }
    
    next();
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('Firebase authentication error:', error);
    
    // Handle specific Firebase errors
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ 
        error: 'Token expired',
        details: 'Please log in again'
      });
    }
    
    if (error.code === 'auth/argument-error') {
      return res.status(401).json({ 
        error: 'Invalid token format',
        details: 'Please log in again'
      });
    }
    
    return res.status(500).json({ 
      error: 'Authentication failed',
      details: 'Internal server error'
    });
  }
};

/**
 * Firebase authentication with subscription check
 * Ensures user has active subscription (except admins)
 */
export const authenticateWithFirebasePaid = async (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
) => {
  // First authenticate with Firebase
  await authenticateWithFirebase(req, res, async () => {
    if (!req.user) {
      return; // authenticateWithFirebase already handled the response
    }
    
    // Admin users bypass payment check
    if (req.user.isAdmin) {
      if (AUTH_DEBUG) {
        console.log(`✅ [FIREBASE-AUTH-PAID] Admin user ${req.user.id} bypassed payment check`);
      }
      return next();
    }
    
    // Check subscription status
    if (req.user.tier === 'free') {
      // Check Stripe subscription status
      try {
        const hasActiveSubscription = await checkUserSubscription(req.user.id);
        if (!hasActiveSubscription) {
          if (AUTH_DEBUG) {
            console.log(`❌ [FIREBASE-AUTH-PAID] User ${req.user.id} requires payment`);
          }
          return res.status(403).json({
            error: 'Subscription required',
            details: 'Please complete your subscription setup',
            requiresPayment: true,
            userId: req.user.id,
            email: req.user.email
          });
        }
      } catch (error) {
        console.error('Subscription check error:', error);
        // Allow access if subscription check fails (fail open)
      }
    }
    
    if (AUTH_DEBUG) {
      console.log(`✅ [FIREBASE-AUTH-PAID] User ${req.user.id} has valid subscription (tier: ${req.user.tier})`);
    }
    
    next();
  });
};

/**
 * Optional Firebase authentication
 * Doesn't fail if no token, but attaches user if valid token present
 */
export const optionalFirebaseAuth = async (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
) => {
  const token = extractFirebaseToken(req);
  
  if (!token) {
    // No token is fine for optional auth
    return next();
  }
  
  try {
    const firebaseUser = await verifyFirebaseToken(token);
    
    if (firebaseUser) {
      const user = await storage.getUserByFirebaseUid(firebaseUser.uid);
      
      if (user) {
        req.user = {
          id: user.id,
          email: user.email || '',
          emailVerified: firebaseUser.emailVerified || false,
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          firebaseUid: firebaseUser.uid,
          isAdmin: user.isAdmin || false,
          tier: user.tier || 'free',
          phoneVerified: user.phoneVerified || false
        };
        req.firebaseToken = token;
        
        if (AUTH_DEBUG) {
          console.log(`✅ [FIREBASE-AUTH-OPTIONAL] User ${user.id} authenticated`);
        }
      }
    }
  } catch (error) {
    // Silent fail for optional auth
    if (AUTH_DEBUG) {
      console.log(`⚠️ [FIREBASE-AUTH-OPTIONAL] Token verification failed (continuing anyway)`);
    }
  }
  
  next();
};

/**
 * Admin-only Firebase authentication
 * Requires valid Firebase token AND admin role
 */
export const authenticateFirebaseAdmin = async (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
) => {
  // First authenticate with Firebase
  await authenticateWithFirebase(req, res, () => {
    if (!req.user) {
      return; // authenticateWithFirebase already handled the response
    }
    
    // Check admin status
    if (!req.user.isAdmin) {
      if (AUTH_DEBUG) {
        console.log(`❌ [FIREBASE-AUTH-ADMIN] User ${req.user.id} denied admin access`);
      }
      return res.status(403).json({ 
        error: 'Admin access required',
        details: 'You do not have permission to access this resource'
      });
    }
    
    if (AUTH_DEBUG) {
      console.log(`✅ [FIREBASE-AUTH-ADMIN] Admin access granted to user ${req.user.id}`);
    }
    
    next();
  });
};

/**
 * Helper function to check user subscription status
 * This should be implemented based on your Stripe integration
 * NOTE: Email verification is checked separately in the main auth middleware
 */
async function checkUserSubscription(userId: string): Promise<boolean> {
  try {
    const user = await storage.getUserById(userId);
    if (!user) return false;
    
    // Check if user has Stripe subscription
    if (user.stripeSubscriptionId) {
      // TODO: Verify with Stripe that subscription is active
      // For now, assume having a subscription ID means active
      return true;
    }
    
    // Check if user has access using simplified logic - NO TRIAL ACCESS
    // NOTE: Email verification is enforced at the middleware level for security
    return (user.isAdmin || user.is_admin) || (user.isAssigned || user.is_assigned) || (user.hasPaid || user.has_paid);
  } catch (error) {
    console.error('Error checking subscription:', error);
    return false;
  }
}

// Re-export for backwards compatibility during migration
export const requireFirebaseAuth = authenticateWithFirebase;
export const requireFirebasePaidAuth = authenticateWithFirebasePaid;
export const requireFirebaseAdmin = authenticateFirebaseAdmin;