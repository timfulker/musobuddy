// Firebase-compatible auth token utilities
// Provides backward compatibility for legacy JWT code

import { auth } from '@/lib/firebase';

/**
 * Find active Firebase ID token
 * Returns Firebase ID token if user is authenticated
 */
export const findActiveAuthToken = async (): Promise<string | null> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return null;
    }
    
    // Get fresh Firebase ID token
    const token = await user.getIdToken();
    return token;
  } catch (error) {
    console.error('Error getting Firebase token:', error);
    return null;
  }
};

/**
 * Store auth token (no-op for Firebase auth)
 * Firebase handles token storage automatically
 */
export const storeAuthToken = (token: string, email: string): void => {
  // Firebase handles token storage automatically
  // This is a no-op for backward compatibility
  console.log('🔥 Firebase auth - token storage handled automatically');
};

/**
 * Clear all auth tokens (Firebase sign out)
 */
export const clearAllAuthTokens = async (): Promise<void> => {
  try {
    await auth.signOut();
    console.log('🔥 Firebase user signed out');
  } catch (error) {
    console.error('Error signing out:', error);
  }
};

/**
 * Legacy function - returns Firebase token synchronously if available
 * Note: This is not ideal as Firebase tokens are async, but needed for backward compatibility
 */
export const findActiveAuthTokenSync = (): string | null => {
  const user = auth.currentUser;
  if (!user) {
    return null;
  }
  
  // For sync compatibility, return a placeholder - this should be replaced with async calls
  console.warn('Using sync token retrieval - consider migrating to async findActiveAuthToken()');
  return 'firebase-token-sync-placeholder';
};