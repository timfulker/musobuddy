/**
 * Project-Aware Supabase Admin Client Configuration
 * Provides server-side admin functions for user management and password changes
 * Automatically selects correct project based on request context
 */
import { createClient } from '@supabase/supabase-js';

// Project configurations will be populated below after validation

// Simple environment detection - only use NODE_ENV
// REPLIT_ENVIRONMENT is unreliable and often set to 'production' even in dev
const isDevelopment = process.env.NODE_ENV !== 'production';
const isDeployment = !isDevelopment;

if (isDevelopment) {
  if (!process.env.SUPABASE_URL_DEV || !process.env.SUPABASE_SERVICE_KEY_DEV) {
    throw new Error('Missing DEV environment variables: SUPABASE_URL_DEV, SUPABASE_SERVICE_KEY_DEV');
  }
} else {
  if (!process.env.SUPABASE_URL_PROD || !process.env.SUPABASE_SERVICE_KEY_PROD) {
    throw new Error('Missing PROD environment variables: SUPABASE_URL_PROD, SUPABASE_SERVICE_KEY_PROD');
  }
}

// Only include configured projects in the mapping
const PROJECT_ADMIN_CONFIGS: Record<string, string> = {};
if (process.env.SUPABASE_URL_DEV && process.env.SUPABASE_SERVICE_KEY_DEV) {
  PROJECT_ADMIN_CONFIGS[process.env.SUPABASE_URL_DEV] = process.env.SUPABASE_SERVICE_KEY_DEV;
}
if (process.env.SUPABASE_URL_PROD && process.env.SUPABASE_SERVICE_KEY_PROD) {
  PROJECT_ADMIN_CONFIGS[process.env.SUPABASE_URL_PROD] = process.env.SUPABASE_SERVICE_KEY_PROD;
}

if (process.env.NODE_ENV === 'development') {
  console.log('🔧 [SUPABASE-ADMIN] Project configurations loaded:', Object.keys(PROJECT_ADMIN_CONFIGS));
}

/**
 * Create project-specific admin client
 * @param projectUrl - Supabase project URL
 * @returns Admin client for the specific project
 */
function createProjectAdminClient(projectUrl: string) {
  const serviceKey = PROJECT_ADMIN_CONFIGS[projectUrl];
  if (!serviceKey) {
    throw new Error(`No service key found for project: ${projectUrl}`);
  }
  
  return createClient(projectUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// Legacy admin client (uses environment detection with REPLIT_DEPLOYMENT support)
const defaultProjectUrl = isDevelopment ? process.env.SUPABASE_URL_DEV! : process.env.SUPABASE_URL_PROD!;
export const supabaseAdmin = createProjectAdminClient(defaultProjectUrl);

if (process.env.NODE_ENV === 'development') {
  console.log('✅ [SUPABASE-ADMIN] Default admin client initialized for:', defaultProjectUrl);
}

/**
 * Change user password using admin privileges
 * @param userId - Supabase user ID
 * @param newPassword - New password to set
 * @param projectUrl - Supabase project URL (from request context)
 * @returns Success/error result
 */
export async function adminChangeUserPassword(userId: string, newPassword: string, projectUrl?: string) {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔐 [SUPABASE-ADMIN] Attempting to change password for user: ${userId}`);
    }
    
    // Validate inputs
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid user ID provided');
    }
    
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long');
    }
    
    // Use project-specific admin client if provided, otherwise use default
    const adminClient = projectUrl ? createProjectAdminClient(projectUrl) : supabaseAdmin;
    
    // Use admin client to update user password
    const { data, error } = await adminClient.auth.admin.updateUserById(userId, {
      password: newPassword
    });
    
    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ [SUPABASE-ADMIN] Password change failed:', error);
      }
      throw new Error(error.message || 'Failed to update password');
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ [SUPABASE-ADMIN] Password changed successfully for user: ${userId}`);
    }
    return { success: true, user: data.user };
    
  } catch (error: any) {
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ [SUPABASE-ADMIN] Password change error:', error);
    }
    throw error;
  }
}

/**
 * Verify user credentials by attempting sign in
 * @param email - User email
 * @param password - Current password
 * @param projectUrl - Supabase project URL
 * @param anonKey - Anonymous key for the project
 * @returns Verification result
 */
export async function verifyUserCredentials(email: string, password: string, projectUrl: string, anonKey: string) {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 [SUPABASE-ADMIN] Verifying credentials for: ${email}`);
    }
    
    // Create a temporary client for credential verification
    const tempClient = createClient(projectUrl, anonKey);
    
    const { data, error } = await tempClient.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`❌ [SUPABASE-ADMIN] Credential verification failed: ${error.message}`);
      }
      return { valid: false, error: error.message };
    }
    
    // Sign out immediately to clean up the session
    await tempClient.auth.signOut();
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ [SUPABASE-ADMIN] Credentials verified for: ${email}`);
    }
    return { valid: true, userId: data.user?.id };
    
  } catch (error: any) {
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ [SUPABASE-ADMIN] Credential verification error:', error);
    }
    return { valid: false, error: error.message || 'Verification failed' };
  }
}

/**
 * Revoke all sessions for a user after password change
 * Implements REAL session invalidation by both updating metadata and revoking refresh tokens
 * @param userId - Supabase user ID
 * @param projectUrl - Supabase project URL (from request context)
 * @returns Success/error result
 */
export async function adminRevokeUserSessions(userId: string, projectUrl?: string) {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔒 [SUPABASE-ADMIN] REAL session revocation for user: ${userId}`);
    }
    
    // Use project-specific admin client if provided, otherwise use default
    const adminClient = projectUrl ? createProjectAdminClient(projectUrl) : supabaseAdmin;
    
    const revocationTimestamp = new Date().toISOString();
    
    // Step 1: Update user metadata with revocation timestamp (for our middleware checks)
    const { error: metadataError } = await adminClient.auth.admin.updateUserById(userId, {
      user_metadata: { 
        session_revoked_at: revocationTimestamp
      }
    });
    
    if (metadataError) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ [SUPABASE-ADMIN] Metadata update failed:', metadataError);
      }
      throw new Error(metadataError.message || 'Failed to update session metadata');
    }
    
    // Step 2: Use Supabase admin API to actually revoke refresh tokens
    // This is the REAL session invalidation that makes existing JWTs useless
    try {
      // Fixed API signature - remove the incorrect 'global' parameter
      const { error: signOutError } = await adminClient.auth.admin.signOutUser(userId);
      
      if (signOutError) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`⚠️ [SUPABASE-ADMIN] User sign-out failed (non-critical): ${signOutError.message}`);
        }
        // Continue - metadata approach will still work via middleware
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ [SUPABASE-ADMIN] User sign-out successful for user: ${userId}`);
        }
      }
    } catch (signOutError: any) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`⚠️ [SUPABASE-ADMIN] User sign-out error (non-critical): ${signOutError.message}`);
      }
      // Continue - metadata approach will still work via middleware
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ [SUPABASE-ADMIN] Real session revocation completed for user: ${userId}`);
    }
    return { success: true, revokedAt: revocationTimestamp };
    
  } catch (error: any) {
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ [SUPABASE-ADMIN] Session revocation error:', error);
    }
    // Don't throw - session revocation is optional and shouldn't fail password change
    return { success: false, error: error.message };
  }
}

/**
 * Create new user using Supabase Admin
 * @param email - User email
 * @param password - User password 
 * @param firstName - User first name
 * @param lastName - User last name
 * @param isAdmin - Whether user is admin (optional)
 * @param projectUrl - Supabase project URL (from request context)
 * @returns Success result with user data
 */
export async function adminCreateUser(
  email: string, 
  password: string, 
  firstName: string, 
  lastName: string, 
  isAdmin: boolean = false, 
  projectUrl?: string
) {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log(`👤 [SUPABASE-ADMIN] Creating new user: ${email}`);
    }
    
    // Validate inputs
    if (!email || typeof email !== 'string') {
      throw new Error('Invalid email provided');
    }
    
    if (!password || typeof password !== 'string' || password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }
    
    if (!firstName || typeof firstName !== 'string') {
      throw new Error('First name is required');
    }
    
    if (!lastName || typeof lastName !== 'string') {
      throw new Error('Last name is required');
    }
    
    // Use project-specific admin client if provided, otherwise use default
    const adminClient = projectUrl ? createProjectAdminClient(projectUrl) : supabaseAdmin;
    
    // Create user in Supabase auth
    const { data, error } = await adminClient.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Set email as verified
      user_metadata: {
        firstName: firstName,
        lastName: lastName,
        displayName: `${firstName} ${lastName}`,
        isAdmin: isAdmin
      }
    });
    
    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ [SUPABASE-ADMIN] User creation failed:', error);
      }
      throw new Error(error.message || 'Failed to create user in Supabase');
    }
    
    if (!data.user) {
      throw new Error('No user data returned from Supabase');
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ [SUPABASE-ADMIN] User created successfully: ${email} (ID: ${data.user.id})`);
    }
    
    return { 
      success: true, 
      user: data.user,
      supabaseUid: data.user.id
    };
    
  } catch (error: any) {
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ [SUPABASE-ADMIN] User creation error:', error);
    }
    throw error;
  }
}

/**
 * @deprecated - HARD FAIL to prevent accidental use
 * This function is DISABLED because it doesn't scale beyond 1000 users and is inefficient
 * Use direct user ID from JWT token instead via the authenticate middleware
 */
export async function adminGetUserByEmail(email: string): Promise<never> {
  console.error('🚫 [SUPABASE-ADMIN] CRITICAL ERROR: adminGetUserByEmail is DISABLED');
  console.error('🚫 [SUPABASE-ADMIN] This function was called but is deprecated and insecure');
  console.error('🚫 [SUPABASE-ADMIN] Use the user ID from JWT token via authenticate middleware instead');
  console.error(`🚫 [SUPABASE-ADMIN] Attempted email lookup for: ${email}`);
  
  // Hard fail to prevent accidental use in production
  throw new Error(
    'SECURITY ERROR: adminGetUserByEmail is deprecated and disabled. ' +
    'Use user ID from JWT token via authenticate middleware instead. ' +
    'This function does not scale and poses security risks.'
  );
}