import { useQuery, useQueryClient } from "@tanstack/react-query";

import { findActiveAuthToken, clearAllAuthTokens } from '@/utils/authToken';
import { isMobileDevice, findMobileAuthToken, forceMobileAuthRefresh } from '@/utils/mobileAuth';

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
    return userData;
  };
  
  const { data: user, isLoading, error, isFetching } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: fetchUser,
    retry: (failureCount, error: any) => {
      // Only retry for network errors, not auth failures
      return failureCount < 2 && !(error as any)?.status;
    },
    refetchOnWindowFocus: false,
    staleTime: 2 * 60 * 1000, // 2 minutes cache
    refetchInterval: false,
    enabled: true // Always try to find any valid token
  });

  // Enhanced error handling for authentication failures
  if (error) {
    console.log('🔍 Auth error:', (error as any)?.status, error?.message);
    
    // Handle specific authentication errors
    if (error?.message?.includes('User account no longer exists')) {
      console.log('🔄 User account deleted - redirecting to landing page');
      window.location.href = '/';
    }
    
    // Don't redirect on initial 401 - user might just not be logged in
    if ((error as any)?.status === 401) {
      console.log('🔍 User not authenticated - staying on current page');
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
  
  // More robust loading state - consider both initial load and refetching
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
    error,
    isAdmin: (user as any)?.isAdmin === true,
    needsVerification: !!user && !(user as any)?.phoneVerified && !(user as any)?.isAdmin,
    authenticationStatus, // New: explicit status for debugging
    logout
  };
}