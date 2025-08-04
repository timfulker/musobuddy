import { useQuery } from "@tanstack/react-query";
import { COMMON_GIG_TYPES } from "@shared/gig-types";

// Custom hook to fetch and combine static gig types with user's custom gig types
export const useGigTypes = () => {
  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const response = await fetch('/api/settings', {
        credentials: 'include',
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