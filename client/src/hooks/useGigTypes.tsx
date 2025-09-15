import { useQuery } from "@tanstack/react-query";

// Custom hook to fetch user gig types from database bookings
export const useGigTypes = () => {
  // Fetch gig types from user's existing bookings using proper queryClient
  const { data: gigTypes, isLoading, error } = useQuery({
    queryKey: ['user-gig-types'],
    // No custom queryFn - use default from queryClient which handles Supabase auth properly
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1,
  });

  console.log('🎵 useGigTypes Debug:', {
    totalGigTypes: gigTypes?.length || 0,
    gigTypesList: gigTypes || [],
    isLoading,
    error: error?.message || null,
    gigTypesLoaded: !!gigTypes
  });

  return {
    gigTypes: gigTypes || [],
    isLoading,
    error,
  };
};