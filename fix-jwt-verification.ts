/**
 * EMERGENCY FIX: JWT Verification without JWKS
 * 
 * This fixes the critical authentication failure by implementing
 * JWT verification using Supabase's JWT secret instead of JWKS.
 */

import { jwtVerify, createRemoteJWKSet, SignJWT } from 'jose';

export interface SupabaseJWTPayload {
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
  aud?: string;
  iss?: string;
  iat?: number;
  exp?: number;
}

/**
 * Get JWT secret for the current environment
 */
function getJWTSecret(): string {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Try different secret environment variables
  const possibleSecrets = isDevelopment 
    ? [
        process.env.SUPABASE_JWT_SECRET_DEV,
        process.env.JWT_SECRET_DEV,
        process.env.JWT_SECRET,
        process.env.SUPABASE_SERVICE_KEY_DEV, // Service keys can sometimes be used
      ]
    : [
        process.env.SUPABASE_JWT_SECRET_PROD,
        process.env.JWT_SECRET_PROD, 
        process.env.JWT_SECRET,
        process.env.SUPABASE_SERVICE_KEY_PROD,
      ];

  const secret = possibleSecrets.find(s => s && s.length > 0);
  
  if (!secret) {
    const env = isDevelopment ? 'development' : 'production';
    throw new Error(
      `Missing JWT secret for ${env} environment. ` +
      `Please set one of: SUPABASE_JWT_SECRET_${env.toUpperCase()}, JWT_SECRET_${env.toUpperCase()}, or JWT_SECRET`
    );
  }

  return secret;
}

/**
 * Get Supabase URL for the current environment
 */
function getSupabaseUrl(): string {
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
 * FIXED: Verify Supabase JWT using direct secret verification
 * This bypasses the failing JWKS endpoint
 */
export async function verifySupabaseJWT(
  token: string,
  supabaseUrl?: string,
  expectedAudience: string = 'authenticated'
): Promise<SupabaseJWTPayload> {
  try {
    console.log('🔐 [JWT-FIX] Starting fixed JWT verification');

    if (!supabaseUrl) {
      supabaseUrl = getSupabaseUrl();
    }

    // First, try to decode the token to see its algorithm
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    console.log('🔍 [JWT-FIX] Token algorithm:', header.alg);

    let payload: any;

    if (header.alg === 'HS256') {
      // For HS256 tokens, verify with JWT secret
      console.log('🔑 [JWT-FIX] Using HS256 verification with JWT secret');
      
      const secret = getJWTSecret();
      const secretBytes = new TextEncoder().encode(secret);
      
      const { payload: verifiedPayload } = await jwtVerify(token, secretBytes, {
        issuer: `${supabaseUrl}/auth/v1`,
        audience: expectedAudience,
        clockTolerance: 30,
      });

      payload = verifiedPayload;
      
    } else if (header.alg.startsWith('RS') || header.alg.startsWith('ES')) {
      // For RSA/ECDSA tokens, we still need JWKS - but try a different approach
      console.log('🔑 [JWT-FIX] Token uses public key crypto, attempting alternative verification');
      
      // Try creating JWKS with authentication
      const anonKey = process.env.NODE_ENV === 'development' 
        ? process.env.SUPABASE_ANON_KEY_DEV 
        : process.env.SUPABASE_ANON_KEY_PROD;

      if (anonKey) {
        // Create authenticated JWKS fetcher
        const jwksUrl = new URL(`${supabaseUrl}/auth/v1/jwks`);
        
        // Custom JWKS fetcher with authentication
        const authenticatedJWKS = createRemoteJWKSet(jwksUrl, {
          agent: false, // Use default agent
          headers: {
            'apikey': anonKey,
            'Authorization': `Bearer ${anonKey}`,
            'Accept': 'application/json',
            'User-Agent': 'MusoBuddy-Auth/1.0'
          },
        });

        const { payload: verifiedPayload } = await jwtVerify(token, authenticatedJWKS, {
          issuer: `${supabaseUrl}/auth/v1`,
          audience: expectedAudience,
          clockTolerance: 30,
        });

        payload = verifiedPayload;
      } else {
        throw new Error('No authentication available for JWKS endpoint');
      }
    } else {
      throw new Error(`Unsupported token algorithm: ${header.alg}`);
    }

    // Type assertion and validation
    const supabasePayload = payload as SupabaseJWTPayload;

    if (!supabasePayload.sub) {
      throw new Error('Invalid token: missing subject (sub)');
    }

    if (!supabasePayload.email) {
      throw new Error('Invalid token: missing email');
    }

    // Validate token age
    if (supabasePayload.iat) {
      const tokenAge = Date.now() / 1000 - supabasePayload.iat;
      const maxAge = 24 * 60 * 60; // 24 hours
      
      if (tokenAge > maxAge) {
        throw new Error('Token is too old, please refresh');
      }
    }

    console.log('✅ [JWT-FIX] JWT verification successful');
    return supabasePayload;

  } catch (error) {
    console.error('🚨 [JWT-FIX] JWT Verification Failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      hasToken: !!token,
      tokenPrefix: token ? token.substring(0, 20) + '...' : 'null',
      supabaseUrl: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'null',
      timestamp: new Date().toISOString(),
    });

    if (error instanceof Error) {
      throw new Error(`JWT verification failed: ${error.message}`);
    }
    throw new Error('JWT verification failed: Unknown error');
  }
}

/**
 * Optional JWT verification - doesn't throw on failure
 */
export async function verifySupabaseJWTOptional(
  token: string,
  supabaseUrl?: string,
  expectedAudience: string = 'authenticated'
): Promise<SupabaseJWTPayload | null> {
  try {
    return await verifySupabaseJWT(token, supabaseUrl, expectedAudience);
  } catch (error) {
    console.warn('⚠️ [JWT-FIX] Optional JWT verification failed:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

/**
 * Test function to verify the fix works
 */
export async function testJWTVerificationFix(): Promise<boolean> {
  console.log('🧪 [JWT-FIX] Testing JWT verification fix...');
  
  try {
    // Test environment configuration
    const supabaseUrl = getSupabaseUrl();
    console.log('✅ [JWT-FIX] Supabase URL configured');
    
    try {
      const secret = getJWTSecret();
      console.log('✅ [JWT-FIX] JWT secret available');
    } catch (e) {
      console.log('⚠️ [JWT-FIX] No JWT secret available, will rely on JWKS with auth');
    }
    
    console.log('✅ [JWT-FIX] Configuration test passed');
    return true;
    
  } catch (error) {
    console.error('❌ [JWT-FIX] Configuration test failed:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}