import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['/api/auth/user'],
    retry: false,
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
    isAuthenticated: !!user && !error,
    isLoading,
    error
  };
}