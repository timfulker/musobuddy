/**
 * Robust Supabase-First JWT Verification with Firebase Fallback
 * 
 * Algorithm-based authentication routing:
 * - HS256 tokens → Supabase authentication (primary)
 * - RS256 tokens → Firebase authentication (fallback)
 * - Explicit anon key detection and rejection for security
 */

import { jwtVerify, type JWTPayload, createRemoteJWKSet } from 'jose';

/**
 * Supabase JWT payload interface
 */
export interface SupabaseJWTPayload extends JWTPayload {
  sub: string;
  email: string;
  email_verified?: boolean;
  email_confirmed_at?: string;
  phone_confirmed_at?: string;
  app_metadata?: {
    provider?: string;
    providers?: string[];
  };
  user_metadata?: Record<string, any>;
  role?: string;
  aal?: string;
  amr?: Array<{ method: string; timestamp: number }>;
  session_id?: string;
}

/**
 * Firebase JWT payload interface
 */
export interface FirebaseJWTPayload extends JWTPayload {
  sub: string;
  email: string;
  email_verified?: boolean;
  firebase?: {
    sign_in_provider?: string;
    identities?: Record<string, any>;
  };
  uid: string;
}

/**
 * Unified JWT payload interface for backward compatibility
 */
export type UnifiedJWTPayload = SupabaseJWTPayload | FirebaseJWTPayload;

/**
 * JWT algorithm detection result
 */
interface AlgorithmDetection {
  algorithm: 'HS256' | 'RS256' | 'unknown';
  provider: 'supabase' | 'firebase' | 'unknown';
  isAnonKey: boolean;
}

/**
 * Structured logging for debugging authentication flows
 */
function logAuthEvent(level: 'info' | 'warn' | 'error', message: string, context: Record<string, any> = {}) {
  const timestamp = new Date().toISOString();
  const logData = {
    timestamp,
    level: level.toUpperCase(),
    message,
    ...context
  };
  
  if (level === 'error') {
    console.error(`🚨 [AUTH-JWT] ${message}`, logData);
  } else if (level === 'warn') {
    console.warn(`⚠️ [AUTH-JWT] ${message}`, logData);
  } else {
    console.log(`🔍 [AUTH-JWT] ${message}`, logData);
  }
}

/**
 * Comprehensive anon key detection (SECURITY CRITICAL)
 */
function isAnonKey(token: string): boolean {
  // Check against all known anon keys
  const anonKeys = [
    process.env.SUPABASE_ANON_KEY_DEV,
    process.env.SUPABASE_ANON_KEY_PROD,
    process.env.SUPABASE_ANON_KEY_PRODUCTION,
    process.env.SUPABASE_ANON_KEY,
    process.env.VITE_SUPABASE_ANON_KEY_DEV,
    process.env.VITE_SUPABASE_ANON_KEY_PROD,
    process.env.VITE_SUPABASE_ANON_KEY_PRODUCTION,
    process.env.VITE_SUPABASE_ANON_KEY
  ].filter(Boolean);
  
  if (anonKeys.includes(token)) {
    return true;
  }
  
  // Additional security: Check JWT payload for anon role without verification
  try {
    const payload = parseJWTPayloadUnsafe(token);
    if (payload?.role === 'anon') {
      return true;
    }
  } catch (error) {
    // If we can't parse it, it's suspicious but not necessarily an anon key
  }
  
  return false;
}

/**
 * Parse JWT payload without verification (for quick anon role check)
 */
function parseJWTPayloadUnsafe(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    // Decode payload (without verification)
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString());
  } catch (error) {
    logAuthEvent('warn', 'Failed to parse JWT payload', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      tokenPrefix: token.substring(0, 20) + '...'
    });
    return null;
  }
}

/**
 * Detect JWT algorithm and provider from token header
 */
function detectTokenType(token: string): AlgorithmDetection {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { algorithm: 'unknown', provider: 'unknown', isAnonKey: false };
    }
    
    // Decode header
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    const algorithm = header.alg;
    
    // Check if it's an anon key first
    const isAnon = isAnonKey(token);
    
    // Route based on algorithm
    if (algorithm === 'HS256') {
      return { algorithm: 'HS256', provider: 'supabase', isAnonKey: isAnon };
    } else if (algorithm === 'RS256') {
      return { algorithm: 'RS256', provider: 'firebase', isAnonKey: isAnon };
    }
    
    return { algorithm: 'unknown', provider: 'unknown', isAnonKey: isAnon };
  } catch (error) {
    logAuthEvent('warn', 'Failed to detect token type', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      tokenPrefix: token.substring(0, 20) + '...'
    });
    return { algorithm: 'unknown', provider: 'unknown', isAnonKey: false };
  }
}

/**
 * Get environment configuration
 */
function getEnvironmentConfig() {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return {
    isDevelopment,
    jwtSecret: process.env.SUPABASE_JWT_SECRET,
    supabaseUrl: isDevelopment
      ? process.env.SUPABASE_URL_DEV
      : process.env.SUPABASE_URL_PROD
  };
}

/**
 * Unified JWT verification with algorithm-based routing
 * 
 * @param token - The JWT token to verify
 * @param expectedAudience - Expected audience (default: 'authenticated')
 * @returns Verified JWT payload (Supabase or Firebase)
 * @throws Error if token is invalid, expired, or signature verification fails
 */
export async function verifyUnifiedJWT(
  token: string,
  expectedAudience: string = 'authenticated'
): Promise<UnifiedJWTPayload> {
  const startTime = Date.now();
  
  // Detect token type and route appropriately
  const detection = detectTokenType(token);
  
  logAuthEvent('info', 'Token detection completed', {
    algorithm: detection.algorithm,
    provider: detection.provider,
    isAnonKey: detection.isAnonKey,
    tokenPrefix: token.substring(0, 20) + '...'
  });
  
  // SECURITY: Explicit anon key rejection
  if (detection.isAnonKey) {
    logAuthEvent('error', 'Anon key detected and rejected', {
      provider: detection.provider,
      algorithm: detection.algorithm,
      tokenPrefix: token.substring(0, 20) + '...',
      environment: process.env.NODE_ENV
    });
    throw new Error('SECURITY: Anon key cannot be used for user authentication');
  }
  
  // Route to appropriate verification method
  if (detection.algorithm === 'HS256' && detection.provider === 'supabase') {
    return await verifySupabaseHS256(token, expectedAudience);
  } else if (detection.algorithm === 'RS256' && detection.provider === 'firebase') {
    return await verifyFirebaseRS256(token);
  } else {
    throw new Error(`Unsupported token type: ${detection.algorithm} from ${detection.provider}`);
  }
}

/**
 * Supabase HS256 JWT verification (primary method)
 * 
 * @param token - The JWT token to verify
 * @param expectedAudience - Expected audience (default: 'authenticated')
 * @returns Verified Supabase JWT payload
 * @throws Error if token is invalid, expired, or signature verification fails
 */
export async function verifySupabaseHS256(
  token: string,
  expectedAudience: string = 'authenticated'
): Promise<SupabaseJWTPayload> {
  const startTime = Date.now();
  
  logAuthEvent('info', 'Starting Supabase HS256 JWT verification', {
    audience: expectedAudience,
    tokenPrefix: token.substring(0, 20) + '...'
  });
  
  // Get environment configuration
  const config = getEnvironmentConfig();
  
  if (!config.jwtSecret) {
    const env = config.isDevelopment ? 'development' : 'production';
    throw new Error(`Missing Supabase JWT secret for ${env} environment`);
  }
  
  if (!config.supabaseUrl) {
    const env = config.isDevelopment ? 'development' : 'production';
    throw new Error(`Missing Supabase URL for ${env} environment`);
  }
  
  try {
    // Create secret key for HS256 verification
    const secret = new TextEncoder().encode(config.jwtSecret);
    
    // Verify JWT with proper claims validation
    const { payload } = await jwtVerify(token, secret, {
      issuer: `${config.supabaseUrl}/auth/v1`,
      audience: expectedAudience,
      algorithms: ['HS256'],
      clockTolerance: 30 // 30 seconds clock skew tolerance
    });
    
    logAuthEvent('info', 'Supabase HS256 token verified successfully', {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      aud: payload.aud
    });
    
    // Convert to typed payload
    const supabasePayload: SupabaseJWTPayload = {
      ...payload,
      sub: payload.sub!,
      email: payload.email as string || '',
      email_verified: !!payload.email_confirmed_at
    };
    
    // Final validation of required fields
    if (!supabasePayload.sub) {
      throw new Error('Invalid Supabase token: missing subject (sub)');
    }
    
    if (!supabasePayload.email) {
      throw new Error('Invalid Supabase token: missing email');
    }
    
    // Final security check - ensure role is authenticated
    if (supabasePayload.role !== 'authenticated') {
      throw new Error(`Invalid authentication: expected 'authenticated' role, got '${supabasePayload.role}'`);
    }
    
    const duration = Date.now() - startTime;
    logAuthEvent('info', 'Supabase HS256 JWT verification completed successfully', {
      sub: supabasePayload.sub,
      email: supabasePayload.email,
      role: supabasePayload.role,
      duration: `${duration}ms`
    });
    
    return supabasePayload;
    
  } catch (error) {
    const duration = Date.now() - startTime;
    logAuthEvent('error', 'Supabase HS256 JWT verification failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: `${duration}ms`,
      tokenPrefix: token.substring(0, 20) + '...'
    });
    throw error;
  }
}

/**
 * Firebase RS256 JWT verification (fallback method)
 * 
 * @param token - The Firebase JWT token to verify
 * @returns Verified Firebase JWT payload
 * @throws Error if token is invalid, expired, or signature verification fails
 */
export async function verifyFirebaseRS256(token: string): Promise<FirebaseJWTPayload> {
  const startTime = Date.now();
  
  logAuthEvent('info', 'Starting Firebase RS256 JWT verification', {
    tokenPrefix: token.substring(0, 20) + '...'
  });
  
  try {
    // Firebase uses RS256 with JWKS (public key cryptography)
    const projectId = process.env.FIREBASE_PROJECT_ID;
    if (!projectId) {
      throw new Error('Missing Firebase project ID for RS256 verification');
    }
    
    // Create JWKS client for Firebase
    const JWKS = createRemoteJWKSet(new URL(`https://www.googleapis.com/oauth2/v3/certs`));
    
    // Verify JWT with Firebase JWKS
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
      algorithms: ['RS256'],
      clockTolerance: 30
    });
    
    logAuthEvent('info', 'Firebase RS256 token verified successfully', {
      sub: payload.sub,
      email: payload.email,
      email_verified: payload.email_verified,
      aud: payload.aud
    });
    
    // Convert to typed Firebase payload
    const firebasePayload: FirebaseJWTPayload = {
      ...payload,
      sub: payload.sub!,
      email: payload.email as string || '',
      email_verified: !!payload.email_verified,
      uid: payload.sub!
    };
    
    // Validate required Firebase fields
    if (!firebasePayload.sub || !firebasePayload.uid) {
      throw new Error('Invalid Firebase token: missing subject (sub/uid)');
    }
    
    const duration = Date.now() - startTime;
    logAuthEvent('info', 'Firebase RS256 JWT verification completed successfully', {
      sub: firebasePayload.sub,
      email: firebasePayload.email,
      email_verified: firebasePayload.email_verified,
      duration: `${duration}ms`
    });
    
    return firebasePayload;
    
  } catch (error) {
    const duration = Date.now() - startTime;
    logAuthEvent('error', 'Firebase RS256 JWT verification failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: `${duration}ms`,
      tokenPrefix: token.substring(0, 20) + '...'
    });
    throw error;
  }
}

/**
 * Optional unified JWT verification - returns null instead of throwing
 */
export async function verifyUnifiedJWTOptional(
  token: string,
  expectedAudience: string = 'authenticated'
): Promise<UnifiedJWTPayload | null> {
  try {
    return await verifyUnifiedJWT(token, expectedAudience);
  } catch (error) {
    logAuthEvent('warn', 'Optional unified JWT verification failed (continuing anyway)', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return null;
  }
}

/**
 * Legacy Supabase-only verification (for backward compatibility)
 */
export async function verifySupabaseJWT(
  token: string,
  expectedAudience: string = 'authenticated'
): Promise<SupabaseJWTPayload> {
  return await verifySupabaseHS256(token, expectedAudience);
}

/**
 * Optional Supabase JWT verification - returns null instead of throwing
 */
export async function verifySupabaseJWTOptional(
  token: string,
  expectedAudience: string = 'authenticated'
): Promise<SupabaseJWTPayload | null> {
  try {
    return await verifySupabaseJWT(token, expectedAudience);
  } catch (error) {
    logAuthEvent('warn', 'Optional Supabase JWT verification failed (continuing anyway)', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return null;
  }
}

/**
 * Get Supabase URL for the current environment
 */
export function getSupabaseUrl(): string {
  const config = getEnvironmentConfig();
  if (!config.supabaseUrl) {
    const env = config.isDevelopment ? 'development' : 'production';
    throw new Error(`Missing Supabase URL for ${env} environment`);
  }
  return config.supabaseUrl;
}

// Enhanced compatibility exports
export const verifyJWT = verifyUnifiedJWT; // Primary export now uses unified verification
export const verifyJWTOptional = verifyUnifiedJWTOptional;

// Legacy compatibility for existing code
export const verifySupabaseJWTLegacy = verifySupabaseJWT;
export const verifySupabaseJWTOptionalLegacy = verifySupabaseJWTOptional;

/**
 * Get authentication provider from token (helper function)
 */
export function getTokenProvider(token: string): 'supabase' | 'firebase' | 'unknown' {
  const detection = detectTokenType(token);
  return detection.provider;
}

/**
 * Check if token is valid without full verification (helper function)
 */
export function isValidTokenFormat(token: string): boolean {
  try {
    const parts = token.split('.');
    return parts.length === 3 && !isAnonKey(token);
  } catch {
    return false;
  }
}

// Legacy compatibility export (keeping for backward compatibility)
export type { UnifiedJWTPayload };