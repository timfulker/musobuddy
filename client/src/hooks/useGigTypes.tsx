import { useQuery } from "@tanstack/react-query";

// Custom hook to fetch stored gig types from database
export const useGigTypes = () => {
  // Simply fetch the stored gig types from the database
  const { data: gigTypes, isLoading, error } = useQuery({
    queryKey: ['/api/gig-types'],
    staleTime: 5 * 60 * 1000, // 5 minutes
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