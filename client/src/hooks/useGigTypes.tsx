import { useQuery } from "@tanstack/react-query";

// Custom hook to fetch stored gig types from database
export const useGigTypes = () => {
  // Fetch AI-generated + custom gig types from instruments
  const { data: gigTypes, isLoading, error } = useQuery({
    queryKey: ['gig-types'],
    queryFn: async () => {
      const response = await fetch('/api/gig-types', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch gig types');
      return response.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1,
  });

  console.log('🎵 useGigTypes Debug:', {
    totalGigTypes: gigTypes?.length || 0,
    djGigTypesIncluded: gigTypes?.filter((gt: string) => gt.toLowerCase().includes('dj')) || [],
    gigTypesLoaded: !!gigTypes
  });

  return {
    gigTypes: gigTypes || [],
    isLoading,
    error,
  };
};