import { useQuery } from "@tanstack/react-query";
import { COMMON_GIG_TYPES } from "@shared/gig-types";

// Custom hook to fetch and combine static gig types with user's custom gig types
// Helper function to get the correct auth token
const getAuthToken = () => {
  const hostname = window.location.hostname;
  
  // Development: Check for admin token first, then regular dev token
  if (hostname.includes('janeway.replit.dev') || hostname.includes('localhost')) {
    return localStorage.getItem('authToken_dev_admin') || localStorage.getItem('authToken_dev');
  }
  
  // Production: Use domain-specific token
  return localStorage.getItem(`authToken_${hostname}`) || localStorage.getItem('authToken_prod');
};

export const useGigTypes = () => {
  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const token = getAuthToken();
      const response = await fetch('/api/settings', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch settings');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1, // Reduce retries to prevent loops
  });

  // Combine static gig types with user's custom gig types
  // Ensure customGigTypes is always an array to prevent iteration errors
  const customGigTypes = Array.isArray(settings?.customGigTypes) ? settings.customGigTypes : [];
  
  // Defensive check: ensure COMMON_GIG_TYPES is an array
  const staticGigTypes = Array.isArray(COMMON_GIG_TYPES) ? COMMON_GIG_TYPES : [];
  
  const allGigTypes = [
    ...staticGigTypes,
    ...customGigTypes
  ];

  // Remove duplicates and sort alphabetically
  const uniqueGigTypes = [...new Set(allGigTypes)].sort();

  return {
    gigTypes: uniqueGigTypes,
    isLoading: isLoading,
    error: error,
    staticGigTypes: staticGigTypes,
    customGigTypes: customGigTypes
  };
};