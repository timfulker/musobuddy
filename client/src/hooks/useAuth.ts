import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 0, // No caching - always check server
    refetchOnWindowFocus: true, // Check auth status when window gains focus
    queryFn: async () => {
      const response = await fetch("/api/auth/user", {
        credentials: "include",
      });
      
      console.log('🔥 Auth check response:', response.status);
      
      if (response.status === 401) {
        console.log('🔥 User not authenticated');
        return null;
      }
      
      if (!response.ok) {
        console.error('🔥 Auth error:', response.status, response.statusText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const userData = await response.json();
      console.log('🔥 User authenticated:', userData);
      return userData;
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !error,
  };
}
