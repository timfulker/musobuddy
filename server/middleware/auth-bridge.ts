// Auth Bridge - Handles both Firebase and Supabase authentication
import { type Request, type Response, type NextFunction } from 'express';
import { authenticateUser as firebaseAuth } from './firebase-auth';
import { authenticateWithSupabase } from './supabase-auth';
import { useSupabase } from '../../lib/supabase/client';

/**
 * Unified authentication middleware that handles both Firebase and Supabase
 * Automatically detects which auth system to use based on token and configuration
 */
export async function unifiedAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.log(`🔐 [AUTH-BRIDGE] Authenticating request to: ${req.path}`);

  // Check if we're using Supabase
  if (useSupabase()) {
    // Check for Supabase token
    const authHeader = req.headers.authorization;
    const supabaseToken = req.headers['x-supabase-token'];

    if (authHeader?.startsWith('Bearer ') || supabaseToken) {
      console.log('🔑 [AUTH-BRIDGE] Detected Supabase token, using Supabase auth');
      return authenticateWithSupabase(req, res, next);
    }
  }

  // Fallback to Firebase auth
  console.log('🔑 [AUTH-BRIDGE] Using Firebase auth (fallback)');
  return firebaseAuth(req, res, next);
}

// Export as default authentication method
export const authenticate = unifiedAuth;