import { useQuery, useQueryClient } from "@tanstack/react-query";

import { findActiveAuthToken, clearAllAuthTokens } from '@/utils/authToken';
import { isMobileDevice, findMobileAuthToken, forceMobileAuthRefresh } from '@/utils/mobileAuth';

// Circuit breaker to prevent infinite auth loops
let authFailureCount = 0;
let lastAuthFailure = 0;
let consecutiveNoTokenFailures = 0;
const MAX_AUTH_FAILURES = 3;
const MAX_NO_TOKEN_FAILURES = 1; // Only count first "no token" as failure
const FAILURE_RESET_TIME = 60000; // 1 minute

function shouldSkipAuth(): boolean {
  const now = Date.now();
  
  // Check for auth success flag from Stripe verification
  if (typeof window !== 'undefined') {
    const successFlag = window.localStorage.getItem('auth_success_flag');
    if (successFlag === 'true') {
      console.log('🟢 Auth success flag detected - resetting circuit breaker');
      authFailureCount = 0;
      lastAuthFailure = 0;
      consecutiveNoTokenFailures = 0;
      window.localStorage.removeItem('auth_success_flag');
      return false;
    }
    
    // Reset circuit breaker on login/public pages for fresh start
    const currentPath = window.location.pathname;
    if (currentPath === '/login' || currentPath === '/' || currentPath.includes('/signup')) {
      if (authFailureCount > 0) {
        console.log('🔄 Resetting circuit breaker for public page visit');
        authFailureCount = 0;
        lastAuthFailure = 0;
        consecutiveNoTokenFailures = 0;
      }
    }
  }
  
  // Reset failure count after timeout
  if (now - lastAuthFailure > FAILURE_RESET_TIME) {
    authFailureCount = 0;
    consecutiveNoTokenFailures = 0;
  }
  
  // Skip if too many failures
  if (authFailureCount >= MAX_AUTH_FAILURES) {
    console.log(`🚫 Circuit breaker: Skipping auth after ${authFailureCount} failures`);
    return true;
  }
  
  return false;
}

function recordAuthFailure(isNoTokenError: boolean = false): void {
  // ALL failures count toward circuit breaker to prevent loops
  authFailureCount++;
  lastAuthFailure = Date.now();
  
  if (isNoTokenError) {
    consecutiveNoTokenFailures++;
    console.log(`🔴 No token failure #${consecutiveNoTokenFailures} recorded (total: ${authFailureCount})`);
  } else {
    console.log(`🔴 Auth failure #${authFailureCount} recorded`);
  }
}

function resetAuthFailures(): void {
  if (authFailureCount > 0 || consecutiveNoTokenFailures > 0) {
    console.log(`🟢 Auth success - resetting ${authFailureCount} auth failures, ${consecutiveNoTokenFailures} no-token failures`);
    authFailureCount = 0;
    lastAuthFailure = 0;
    consecutiveNoTokenFailures = 0;
  }
}

export function useAuth() {
  const queryClient = useQueryClient();
  
  // Custom fetch function that includes JWT token with mobile fallback
  const fetchUser = async () => {
    // Force mobile auth refresh on first load
    if (isMobileDevice()) {
      forceMobileAuthRefresh();
    }
    
    // Try standard token detection first
    let token = findActiveAuthToken();
    
    // Mobile fallback: use enhanced mobile detection
    if (!token && isMobileDevice()) {
      console.log('📱 Standard token detection failed, trying mobile fallback');
      token = findMobileAuthToken();
    }
    
    console.log('🔍 Auth check - Token found:', !!token, isMobileDevice() ? '(Mobile)' : '(Desktop)');
    
    if (!token) {
      console.log('❌ No auth token found');
      throw new Error('No auth token');
    }

    const response = await fetch('/api/auth/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('🔍 Auth response status:', response.status);

    if (!response.ok) {
      console.log('❌ Auth failed with status:', response.status);
      const error: any = new Error('Authentication failed');
      error.status = response.status;
      throw error;
    }

    const userData = await response.json();
    console.log('✅ Auth successful:', userData);
    resetAuthFailures(); // Reset circuit breaker on success
    return userData;
  };
  
  const { data: user, isLoading, error, isFetching } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: fetchUser,
    retry: (failureCount, error: any) => {
      // CRITICAL FIX: Never retry when no token exists
      if (error?.message === 'No auth token') {
        console.log('🚫 No auth token - stopping retries to prevent infinite loop');
        recordAuthFailure(true); // Mark as no-token error
        return false; // Stop retrying immediately
      }
      
      // CRITICAL FIX: Never retry on auth failures to prevent infinite loops
      const status = (error as any)?.status;
      if (status === 401 || status === 404 || status === 403) {
        console.log(`🚫 Auth error ${status} - clearing invalid token and stopping retries`);
        recordAuthFailure(false); // Mark as real auth failure
        clearAllAuthTokens(); // Clear invalid tokens immediately
        return false; // Stop retrying
      }
      // Only retry for network errors (no status code)
      return failureCount < 2 && !status;
    },
    refetchOnWindowFocus: false,
    staleTime: 2 * 60 * 1000, // 2 minutes cache
    refetchInterval: false,
    enabled: !shouldSkipAuth() // Circuit breaker integration
  });

  // Enhanced error handling for authentication failures
  if (error) {
    const status = (error as any)?.status;
    console.log('🔍 Auth error:', status, error?.message);
    
    // CRITICAL FIX: Don't process "No auth token" errors to prevent loops
    if (error?.message === 'No auth token') {
      console.log('🔍 No auth token error - skipping cleanup to prevent loops');
    } else if (error?.message?.includes('User account no longer exists')) {
      console.log('🔄 User account deleted - redirecting to landing page');
      clearAllAuthTokens();
      window.location.href = '/';
    } else if (status === 401 || status === 404 || status === 403) {
      // CRITICAL FIX: Clear tokens on persistent auth failures to prevent loops
      console.log(`🧹 Clearing invalid tokens due to ${status} error`);
      clearAllAuthTokens();
      queryClient.clear(); // Clear React Query cache
    }
  }

  const logout = async () => {
    try {
      // SECURITY FIX: Clear all auth tokens
      clearAllAuthTokens();
      
      // Clear theme settings to prevent leaking to next user
      localStorage.removeItem('musobuddy-theme');
      localStorage.removeItem('musobuddy-custom-color');
      
      console.log('🔓 Logged out - cleared all tokens and theme');
      
      // Clear all queries and redirect
      queryClient.clear();
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      // Force redirect even if logout fails
      clearAllAuthTokens();
      localStorage.removeItem('musobuddy-theme');
      localStorage.removeItem('musobuddy-custom-color');
      queryClient.clear();
      window.location.href = '/';
    }
  };

  // Enhanced authentication state logic
  const isAdminAuthenticated = (user as any)?.isAdmin === true;
  const isRegularUserAuthenticated = !!user && !error && (user as any)?.phoneVerified;
  
  // Check if we're in circuit breaker mode (only during active failures)
  const isCircuitBreakerActive = authFailureCount >= MAX_AUTH_FAILURES;
  
  // More robust loading state - show loading during actual loading or circuit breaker
  const isAuthLoading = isLoading || isFetching;
  
  // Enhanced authentication status with clear state differentiation
  const authenticationStatus = (() => {
    if (isAuthLoading) return 'loading';
    if ((error as any)?.status === 401) return 'unauthenticated';
    if (error && (error as any)?.status !== 401) return 'error';
    if (isAdminAuthenticated) return 'admin';
    if (isRegularUserAuthenticated) return 'authenticated'; 
    if (user && !(user as any)?.phoneVerified) return 'needs_verification';
    return 'unauthenticated';
  })();

  return {
    user,
    isAuthenticated: isAdminAuthenticated || isRegularUserAuthenticated,
    isLoading: isAuthLoading,
    error, // Show actual errors
    isAdmin: (user as any)?.isAdmin === true,
    needsVerification: !!user && !(user as any)?.phoneVerified && !(user as any)?.isAdmin,
    authenticationStatus, // New: explicit status for debugging
    logout
  };
}