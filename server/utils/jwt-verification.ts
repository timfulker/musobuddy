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
 * Get or create JWKS for a Supabase project with API key authentication
 */
function getJWKS(supabaseUrl: string): ReturnType<typeof createRemoteJWKSet> {
  const cacheKey = supabaseUrl;
  if (!jwksCache.has(cacheKey)) {
    const jwksUrl = new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`);
    
    // Get the appropriate API key based on environment
    const isDevelopment = process.env.NODE_ENV === 'development';
    const apiKey = isDevelopment 
      ? process.env.SUPABASE_ANON_KEY_DEV 
      : process.env.SUPABASE_ANON_KEY_PROD;
    
    if (!apiKey) {
      throw new Error(`Missing Supabase API key for ${isDevelopment ? 'development' : 'production'} environment`);
    }

    // Create custom fetch function with API key header
    const customFetch = async (url: string, options?: any) => {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options?.headers,
          'apikey': apiKey,
          'Authorization': `Bearer ${apiKey}`,
        },
      });
      return response;
    };

    // Create JWKS with custom fetch that includes API key
    jwksCache.set(cacheKey, createRemoteJWKSet(jwksUrl, {
      agent: customFetch as any
    }));
  }
  return jwksCache.get(cacheKey)!;
}

/**
 * Verify Supabase JWT token using Supabase client library
 * This method uses the Supabase client which handles JWKS internally
 * 
 * @param token - The JWT token to verify
 * @param supabaseUrl - Supabase project URL
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
    // First try using Supabase client library for verification
    console.log('🔍 [JWT-VERIFY] Attempting Supabase client verification');
    
    const isDevelopment = process.env.NODE_ENV === 'development';
    const apiKey = isDevelopment 
      ? process.env.SUPABASE_ANON_KEY_DEV 
      : process.env.SUPABASE_ANON_KEY_PROD;
    
    if (!apiKey) {
      throw new Error(`Missing Supabase API key for ${isDevelopment ? 'development' : 'production'} environment`);
    }

    // Import Supabase client dynamically to avoid circular dependencies
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseClient = createClient(supabaseUrl, apiKey);

    // Use Supabase client to verify the user token
    const { data: { user }, error } = await supabaseClient.auth.getUser(token);

    if (error) {
      console.log('⚠️ [JWT-VERIFY] Supabase client verification failed:', error.message);
      throw new Error(`Supabase verification failed: ${error.message}`);
    }

    if (!user) {
      throw new Error('Invalid token: no user found');
    }

    // Convert Supabase user to our JWT payload format
    const supabasePayload: SupabaseJWTPayload = {
      sub: user.id,
      email: user.email || '',
      email_confirmed_at: user.email_confirmed_at || null,
      phone_confirmed_at: user.phone_confirmed_at || null,
      app_metadata: user.app_metadata,
      user_metadata: user.user_metadata,
      role: user.role,
      aud: expectedAudience,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    };

    // Validate required fields
    if (!supabasePayload.sub) {
      throw new Error('Invalid token: missing subject (sub)');
    }

    if (!supabasePayload.email) {
      throw new Error('Invalid token: missing email');
    }

    console.log('✅ [JWT-VERIFY] Supabase client verification successful');
    return supabasePayload;

  } catch (error) {
    // If Supabase client verification fails, try fallback JWKS verification
    console.log('🔄 [JWT-VERIFY] Falling back to JWKS verification');
    
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

      console.log('✅ [JWT-VERIFY] JWKS verification successful');
      return supabasePayload;

    } catch (jwksError) {
      // Log both errors for debugging
      console.error('🚨 JWT Verification Failed:', {
        supabaseClientError: error instanceof Error ? error.message : 'Unknown error',
        jwksError: jwksError instanceof Error ? jwksError.message : 'Unknown error',
        hasToken: !!token,
        tokenPrefix: token ? token.substring(0, 20) + '...' : 'null',
        supabaseUrl: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'null',
        timestamp: new Date().toISOString(),
      });

      // Re-throw the more specific error
      if (error instanceof Error) {
        throw new Error(`JWT verification failed: ${error.message}`);
      }
      throw new Error('JWT verification failed: Unknown error');
    }
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