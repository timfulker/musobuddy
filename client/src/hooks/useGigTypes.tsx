import { useQuery } from "@tanstack/react-query";
import { COMMON_GIG_TYPES } from "@shared/gig-types";

// Custom hook to fetch and combine static gig types with user's custom gig types
// Helper function to get the correct auth token - using standard format
const getAuthTokenKey = () => {
  const hostname = window.location.hostname;
  
  // Development: Admin-only access for simplified testing
  if (hostname.includes('janeway.replit.dev') || hostname.includes('localhost')) {
    return 'authToken_dev_admin';
  }
  
  // Production: Environment-specific to prevent conflicts (match standard format)
  return `authToken_${hostname.replace(/[^a-zA-Z0-9]/g, '_')}`;
};

const getAuthToken = () => {
  const tokenKey = getAuthTokenKey();
  return localStorage.getItem(tokenKey);
};

export const useGigTypes = () => {
  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const token = getAuthToken();
      
      if (!token) {
        console.error('❌ No auth token found for useGigTypes');
        throw new Error('No authentication token');
      }
      
      console.log('🔍 useGigTypes - Token key:', getAuthTokenKey());
      console.log('🔍 useGigTypes - Token found:', !!token);
      
      const response = await fetch('/api/settings', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.error('❌ Settings API error in useGigTypes:', response.status, response.statusText);
        throw new Error('Failed to fetch settings');
      }
      
      const data = await response.json();
      console.log('✅ useGigTypes settings loaded successfully');
      return data;
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