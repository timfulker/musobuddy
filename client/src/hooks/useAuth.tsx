import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['auth', 'user'], // Better query key structure
    retry: false,
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
    staleTime: 5 * 60 * 1000, // 5 minutes - prevent excessive requests
    queryFn: async () => {
      const res = await fetch('/api/auth/user', {
        credentials: 'include',
      });
      
      // Return null for unauthenticated instead of throwing
      if (res.status === 401) {
        return null;
      }
      
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      
      return res.json();
    },
  });

  return {
    user,
    isAuthenticated: !!user && !error, // This logic is correct
    isLoading,
    error
  };
}