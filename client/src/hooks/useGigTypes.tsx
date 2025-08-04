import { useQuery } from "@tanstack/react-query";
import { COMMON_GIG_TYPES } from "@shared/gig-types";

// Custom hook to fetch and combine static gig types with user's custom gig types
export const useGigTypes = () => {
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const response = await fetch('/api/settings', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch settings');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Combine static gig types with user's custom gig types
  const allGigTypes = [
    ...COMMON_GIG_TYPES,
    ...(settings?.customGigTypes || [])
  ];

  // Remove duplicates and sort alphabetically
  const uniqueGigTypes = [...new Set(allGigTypes)].sort();

  return {
    gigTypes: uniqueGigTypes,
    isLoading: false, // We have static types immediately, custom types are a bonus
    staticGigTypes: COMMON_GIG_TYPES,
    customGigTypes: settings?.customGigTypes || []
  };
};