// CRITICAL FIX: Unified authentication middleware to prevent inconsistent token validation
import jwt from 'jsonwebtoken';
import { type Request, type Response, type NextFunction } from 'express';

// Centralized JWT configuration
const JWT_CONFIG = {
  secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || (() => {
    console.error('🚨 CRITICAL SECURITY ERROR: No JWT_SECRET environment variable set!');
    throw new Error('JWT_SECRET environment variable is required');
  })(),
  expiresIn: '7d',
  issuer: 'musobuddy',
  algorithms: ['HS256'] as jwt.Algorithm[]
};

// Enhanced logging for debugging - controlled by environment
const AUTH_DEBUG = process.env.AUTH_DEBUG === 'true' && process.env.NODE_ENV === 'development';

interface AuthToken {
  userId: string;
  email: string;
  isVerified: boolean;
  iat?: number;
  exp?: number;
}

// Centralized token generation with consistent format
export function generateAuthToken(userId: string, email: string, isVerified: boolean = true): string {
  const payload: AuthToken = { userId, email, isVerified };
  
  const token = jwt.sign(payload, JWT_CONFIG.secret, {
    expiresIn: JWT_CONFIG.expiresIn,
    issuer: JWT_CONFIG.issuer
  } as jwt.SignOptions);
  
  if (AUTH_DEBUG) {
    console.log(`🔑 [AUTH] Token generated for user ${userId} (${email})`);
  }
  
  return token;
}

// Robust token verification with multiple fallbacks
export function verifyAuthToken(token: string): AuthToken | null {
  if (!token) {
    if (AUTH_DEBUG) console.log('🔒 [AUTH] No token provided');
    return null;
  }

  try {
    // Primary verification with full options
    const decoded = jwt.verify(token, JWT_CONFIG.secret, {
      issuer: JWT_CONFIG.issuer,
      algorithms: JWT_CONFIG.algorithms
    }) as AuthToken;
    
    if (AUTH_DEBUG) {
      console.log(`✅ [AUTH] Token verified for user ${decoded.userId}`);
    }
    
    return decoded;
  } catch (error: any) {
    // Fallback: Try without issuer check (for backwards compatibility)
    if (error.name === 'JsonWebTokenError' && error.message.includes('issuer')) {
      try {
        const decoded = jwt.verify(token, JWT_CONFIG.secret, {
          algorithms: JWT_CONFIG.algorithms
        }) as AuthToken;
        
        if (AUTH_DEBUG) {
          console.log(`⚠️ [AUTH] Token verified with fallback (no issuer) for user ${decoded.userId}`);
        }
        
        return decoded;
      } catch (fallbackError) {
        // Continue to error handling
      }
    }
    
    // Log specific JWT errors for debugging
    if (AUTH_DEBUG) {
      if (error.name === 'TokenExpiredError') {
        console.log(`❌ [AUTH] Token expired at ${error.expiredAt}`);
      } else if (error.name === 'JsonWebTokenError') {
        console.log(`❌ [AUTH] Invalid token: ${error.message}`);
      } else {
        console.log(`❌ [AUTH] Token verification failed: ${error.message}`);
      }
    }
    
    return null;
  }
}

// Unified authentication middleware with comprehensive token extraction
export const requireAuth = (req: any, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Extract token from multiple sources (in priority order)
  let token: string | null = null;
  let tokenSource = 'none';
  
  // 1. Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
    tokenSource = 'bearer';
  }
  
  // 2. Custom header (fallback for some clients)
  if (!token && req.headers['x-auth-token']) {
    token = req.headers['x-auth-token'] as string;
    tokenSource = 'x-auth-token';
  }
  
  // 3. Query parameter (for download links, etc.)
  if (!token && req.query.token) {
    token = req.query.token as string;
    tokenSource = 'query';
  }
  
  // 4. Cookie (for browser-based requests)
  if (!token && req.cookies?.authToken) {
    token = req.cookies.authToken;
    tokenSource = 'cookie';
  }
  
  if (AUTH_DEBUG) {
    console.log(`🔍 [AUTH] Token extraction: source=${tokenSource}, hasToken=${!!token}`);
  }
  
  if (!token) {
    const duration = Date.now() - startTime;
    if (AUTH_DEBUG) {
      console.log(`❌ [AUTH] No token found (${duration}ms)`);
    }
    return res.status(401).json({ 
      error: 'Authentication required',
      details: 'No authentication token provided'
    });
  }
  
  const decoded = verifyAuthToken(token);
  if (!decoded) {
    const duration = Date.now() - startTime;
    if (AUTH_DEBUG) {
      console.log(`❌ [AUTH] Invalid token (${duration}ms)`);
    }
    return res.status(401).json({ 
      error: 'Invalid or expired token',
      details: 'Please log in again'
    });
  }
  
  // Attach user info to request
  req.user = decoded;
  req.authSource = tokenSource;
  
  const duration = Date.now() - startTime;
  if (AUTH_DEBUG) {
    console.log(`✅ [AUTH] Authenticated user ${decoded.userId} via ${tokenSource} (${duration}ms)`);
  }
  
  next();
};

// SECURITY FIX: New middleware to require paid subscription
export const requirePaidAuth = async (req: any, res: Response, next: NextFunction) => {
  // First check authentication
  requireAuth(req, res, async () => {
    if (!req.user) {
      return; // requireAuth already handled the response
    }
    
    try {
      // Check user's payment status
      const { storage } = await import('../core/storage');
      const user = await storage.getUserById(req.user.userId);
      
      if (!user) {
        return res.status(401).json({ 
          error: 'User not found',
          details: 'Please log in again'
        });
      }
      
      const userPlan = user.plan || 'pending_payment';
      
      // Block access for users without valid payment
      if (userPlan === 'pending_payment' && !user.createdViaStripe) {
        if (AUTH_DEBUG) {
          console.log(`❌ [AUTH-PAID] User ${user.id} blocked - payment required`);
        }
        return res.status(403).json({
          error: 'Payment required',
          details: 'Please complete your subscription setup',
          requiresPayment: true,
          userId: user.id,
          email: user.email
        });
      }
      
      // Attach full user info to request
      req.userDetails = user;
      
      if (AUTH_DEBUG) {
        console.log(`✅ [AUTH-PAID] User ${user.id} has valid plan: ${userPlan}`);
      }
      
      next();
    } catch (error) {
      console.error('Payment verification error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};

// Optional authentication (doesn't fail if no token)
export const optionalAuth = (req: any, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  
  if (token) {
    const decoded = verifyAuthToken(token);
    if (decoded) {
      req.user = decoded;
      if (AUTH_DEBUG) {
        console.log(`✅ [AUTH-OPTIONAL] User ${decoded.userId} authenticated`);
      }
    }
  }
  
  next();
};

// Admin-only middleware
export const requireAdmin = async (req: any, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Extract token from multiple sources (in priority order)
  let token: string | null = null;
  let tokenSource = 'none';
  
  // 1. Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
    tokenSource = 'bearer';
  }
  
  // 2. Custom header (fallback for some clients)
  if (!token && req.headers['x-auth-token']) {
    token = req.headers['x-auth-token'] as string;
    tokenSource = 'x-auth-token';
  }
  
  // 3. Query parameter (for download links, etc.)
  if (!token && req.query.token) {
    token = req.query.token as string;
    tokenSource = 'query';
  }
  
  // 4. Cookie (for browser-based requests)
  if (!token && req.cookies?.authToken) {
    token = req.cookies.authToken;
    tokenSource = 'cookie';
  }
  
  if (AUTH_DEBUG) {
    console.log(`🔍 [AUTH-ADMIN] Token extraction: source=${tokenSource}, hasToken=${!!token}`);
  }
  
  if (!token) {
    const duration = Date.now() - startTime;
    if (AUTH_DEBUG) {
      console.log(`❌ [AUTH-ADMIN] No token found (${duration}ms)`);
    }
    return res.status(401).json({ 
      error: 'Authentication required',
      details: 'No authentication token provided'
    });
  }
  
  const decoded = verifyAuthToken(token);
  if (!decoded) {
    const duration = Date.now() - startTime;
    if (AUTH_DEBUG) {
      console.log(`❌ [AUTH-ADMIN] Invalid token (${duration}ms)`);
    }
    return res.status(401).json({ 
      error: 'Invalid or expired token',
      details: 'Please log in again'
    });
  }
  
  // Check for admin access via database lookup
  let isAdmin = false;
  try {
    const { storage } = await import('../core/storage');
    const user = await storage.getUserById(decoded.userId);
    isAdmin = user?.isAdmin || false;
  } catch (error) {
    console.error('Admin lookup error:', error);
    isAdmin = false;
  }
  
  if (!isAdmin) {
    const duration = Date.now() - startTime;
    if (AUTH_DEBUG) {
      console.log(`❌ [AUTH-ADMIN] User ${decoded.userId} denied admin access (${duration}ms)`);
    }
    return res.status(403).json({ 
      error: 'Admin access required',
      details: 'You do not have permission to access this resource'
    });
  }
  
  // Attach user info to request
  req.user = decoded;
  req.authSource = tokenSource;
  
  const duration = Date.now() - startTime;
  if (AUTH_DEBUG) {
    console.log(`✅ [AUTH-ADMIN] Admin access granted to user ${decoded.userId} via ${tokenSource} (${duration}ms)`);
  }
  
  next();
};

// Token refresh endpoint
export const refreshToken = (req: any, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No user in request' });
  }
  
  const newToken = generateAuthToken(
    req.user.userId,
    req.user.email,
    req.user.isVerified
  );
  
  res.json({ 
    authToken: newToken,
    expiresIn: JWT_CONFIG.expiresIn
  });
};