import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export function useAuth() {
  const queryClient = useQueryClient();
  
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['/api/auth/user'],
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    refetchInterval: false,
    onError: (error: any) => {
      // If user account no longer exists, redirect to landing page
      if (error?.message?.includes('User account no longer exists')) {
        console.log('🔄 User account deleted - redirecting to landing page');
        window.location.href = '/';
      }
    }
  });

  // Authentication state tracking (reduced logging for performance)

  const logout = async () => {
    try {
      await apiRequest('/api/auth/logout', {
        method: 'POST'
      });
      // Clear all queries and redirect
      queryClient.clear();
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      // Force redirect even if logout fails
      window.location.href = '/';
    }
  };

  // Admin users are always considered fully authenticated regardless of verification status
  const isAdminAuthenticated = (user as any)?.isAdmin === true;
  const isRegularUserAuthenticated = !!user && !error && (user as any)?.phoneVerified;

  return {
    user,
    isAuthenticated: isAdminAuthenticated || isRegularUserAuthenticated,
    isLoading,
    error,
    isAdmin: (user as any)?.isAdmin === true,
    needsVerification: !!user && !(user as any)?.phoneVerified && !(user as any)?.isAdmin,
    logout
  };
}