import { useQuery, useQueryClient } from '@tanstack/react-query';

export function useAuth() {
  const queryClient = useQueryClient();
  
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      const response = await fetch('/api/auth/user', {
        credentials: 'include', // CRITICAL: Include cookies
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Not authenticated');
        }
        throw new Error(`HTTP ${response.status}`);
      }
      
      return response.json();
    },
    retry: 1,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const isAuthenticated = !!user && !error;

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear cache and redirect, even if logout fails
      queryClient.clear();
      window.location.href = '/';
    }
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    logout,
  };
}