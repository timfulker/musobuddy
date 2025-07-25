import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 5000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const response = await fetch("/api/auth/user", {
        credentials: "include",
      });

      console.log('🔍 Auth check response:', response.status);

      if (response.status === 401) {
        console.log('❌ User not authenticated');
        return null;
      }

      if (!response.ok) {
        console.error('❌ Auth error:', response.status, response.statusText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const userData = await response.json();
      console.log('✅ User authenticated:', userData.email);
      return userData;
    },
  });

  const logout = useCallback(async () => {
    try {
      console.log('🚪 Initiating logout...');

      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Logout successful:', result);

        // Clear all queries to reset the app state
        queryClient.clear();

        // Force refetch of auth status
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });

        // Redirect to landing page
        if (result.redirectTo) {
          window.location.href = result.redirectTo;
        } else {
          window.location.href = '/';
        }
      } else {
        console.error('❌ Logout failed:', response.status, response.statusText);

        // Even if server logout fails, clear client state and redirect
        queryClient.clear();
        window.location.href = '/?error=logout_failed';
      }
    } catch (error) {
      console.error('❌ Logout error:', error);

      // Fallback: clear client state and redirect anyway
      queryClient.clear();
      window.location.href = '/?error=logout_error';
    }
  }, [queryClient]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      console.log('🔑 Attempting login for:', email);

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const userData = await response.json();
        console.log('✅ Login successful:', userData.email);

        // Invalidate auth query to refetch user data
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });

        return { success: true, user: userData };
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Login failed' }));
        console.error('❌ Login failed:', response.status, errorData);
        return { success: false, error: errorData.message || 'Login failed' };
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      return { success: false, error: 'Network error during login' };
    }
  }, [queryClient]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !error,
    logout,
    login,
  };
}