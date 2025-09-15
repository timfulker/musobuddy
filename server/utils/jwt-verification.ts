/**
 * Secure JWT Verification for Supabase Authentication
 * 
 * This module implements proper JWT verification with signature validation
 * using Supabase's JWKS endpoint. NEVER trust tokens without verification!
 */

import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

// Cache for JWKS to avoid repeated requests
const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

/**
 * Supabase JWT payload interface
 */
export interface SupabaseJWTPayload extends JWTPayload {
  sub: string;
  email: string;
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
 * Get or create JWKS for a Supabase project
 */
function getJWKS(supabaseUrl: string): ReturnType<typeof createRemoteJWKSet> {
  if (!jwksCache.has(supabaseUrl)) {
    const jwksUrl = new URL(`${supabaseUrl}/auth/v1/jwks`);
    jwksCache.set(supabaseUrl, createRemoteJWKSet(jwksUrl));
  }
  return jwksCache.get(supabaseUrl)!;
}

/**
 * Verify Supabase JWT token with proper signature validation
 * 
 * @param token - The JWT token to verify
 * @param supabaseUrl - Supabase project URL for JWKS endpoint
 * @param expectedAudience - Expected audience (usually 'authenticated')
 * @returns Verified JWT payload
 * @throws Error if token is invalid, expired, or signature verification fails
 */
export async function verifySupabaseJWT(
  token: string,
  supabaseUrl: string,
  expectedAudience: string = 'authenticated'
): Promise<SupabaseJWTPayload> {
  try {
    // Get JWKS for signature verification
    const JWKS = getJWKS(supabaseUrl);

    // Verify the JWT with signature validation
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `${supabaseUrl}/auth/v1`,
      audience: expectedAudience,
      // Allow some clock skew (30 seconds)
      clockTolerance: 30,
    });

    // Type assertion with runtime validation
    const supabasePayload = payload as SupabaseJWTPayload;

    // Validate required Supabase fields
    if (!supabasePayload.sub) {
      throw new Error('Invalid token: missing subject (sub)');
    }

    if (!supabasePayload.email) {
      throw new Error('Invalid token: missing email');
    }

    // Validate token is not too old (optional additional security)
    if (supabasePayload.iat) {
      const tokenAge = Date.now() / 1000 - supabasePayload.iat;
      const maxAge = 24 * 60 * 60; // 24 hours
      
      if (tokenAge > maxAge) {
        throw new Error('Token is too old, please refresh');
      }
    }

    return supabasePayload;
  } catch (error) {
    // Log security-relevant verification failures
    console.error('🚨 JWT Verification Failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      hasToken: !!token,
      tokenPrefix: token ? token.substring(0, 20) + '...' : 'null',
      supabaseUrl: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'null',
      timestamp: new Date().toISOString(),
    });

    // Re-throw with security-focused error message
    if (error instanceof Error) {
      throw new Error(`JWT verification failed: ${error.message}`);
    }
    throw new Error('JWT verification failed: Unknown error');
  }
}

/**
 * Verify JWT with graceful handling for optional authentication
 * Returns null if token is invalid rather than throwing
 */
export async function verifySupabaseJWTOptional(
  token: string,
  supabaseUrl: string,
  expectedAudience: string = 'authenticated'
): Promise<SupabaseJWTPayload | null> {
  try {
    return await verifySupabaseJWT(token, supabaseUrl, expectedAudience);
  } catch (error) {
    // Log for monitoring but don't throw for optional auth
    console.warn('⚠️ Optional JWT verification failed:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

/**
 * Environment-aware Supabase URL getter
 */
export function getSupabaseUrl(): string {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const supabaseUrl = isDevelopment
    ? process.env.SUPABASE_URL_DEV
    : process.env.SUPABASE_URL_PROD;

  if (!supabaseUrl) {
    const env = isDevelopment ? 'development' : 'production';
    throw new Error(
      `Missing Supabase URL for ${env} environment. ` +
      `Please set SUPABASE_URL_${env.toUpperCase()}`
    );
  }

  return supabaseUrl;
}

/**
 * Clear JWKS cache (useful for testing or key rotation)
 */
export function clearJWKSCache(): void {
  jwksCache.clear();
  console.log('🔄 JWKS cache cleared');
}