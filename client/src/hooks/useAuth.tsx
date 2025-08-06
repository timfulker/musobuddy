import { useQuery, useQueryClient } from "@tanstack/react-query";

// Environment-specific auth token key to prevent dev/production conflicts
const getAuthTokenKey = () => {
  const hostname = window.location.hostname;
  
  // Development URLs contain .replit.dev domain
  if (hostname.includes('janeway.replit.dev') || hostname.includes('localhost')) {
    return 'authToken_dev';
  }
  
  // Production deployment
  if (hostname === 'musobuddy.replit.app') {
    return 'authToken_prod';
  }
  
  // Fallback for other environments
  return `authToken_${hostname.split('.')[0]}`;
};

export function useAuth() {
  const queryClient = useQueryClient();
  const authTokenKey = getAuthTokenKey();
  
  // Custom fetch function that includes JWT token
  const fetchUser = async () => {
    const token = localStorage.getItem(authTokenKey);
    console.log('🔍 Auth check - Token key:', authTokenKey);
    console.log('🔍 Auth check - Token found:', !!token);
    
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
    enabled: !!localStorage.getItem(authTokenKey) // Only run query if token exists
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
      // Remove JWT token
      localStorage.removeItem(authTokenKey);
      
      // Clear all queries and redirect
      queryClient.clear();
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      // Force redirect even if logout fails
      localStorage.removeItem(authTokenKey);
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