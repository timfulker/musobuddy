import { useRef, useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";

interface AddressData {
  address: string;
  formattedAddress?: string;
  lat: number;
  lng: number;
  placeId?: string;
  contactInfo?: {
    phoneNumber: string;
    website: string;
  };
  businessInfo?: {
    openingHours: string[];
    rating: number | null;
    ratingCount: number;
    description: string;
  };
}

interface AddressAutocompleteProps {
  onSelect: (data: AddressData) => void;
  placeholder?: string;
  defaultValue?: string;
  value?: string; // Add controlled value prop
  className?: string;
  searchOnTabOnly?: boolean; // New prop to control search behavior
}

export default function AddressAutocomplete({
  onSelect,
  placeholder = "Start typing venue name or address...",
  defaultValue = "",
  value, // Add value prop
  className = "border rounded px-3 py-2 w-full min-w-[300px]",
  searchOnTabOnly = false // New prop to control search behavior
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputValue, setInputValue] = useState(value || defaultValue);
  
  // Sync with external value changes (for controlled input)
  useEffect(() => {
    if (value !== undefined && value !== inputValue) {
      setInputValue(value);
    }
  }, [value]);

  // Fetch detailed place information
  const fetchPlaceDetails = async (placeId: string) => {
    try {
      console.log("📍 Fetching place details for:", placeId);
      const response = await apiRequest('/api/maps/place-details', {
        method: 'POST',
        body: JSON.stringify({ placeId }),
      });
      
      const placeDetails = await response.json();
      console.log("✅ Place details retrieved:", placeDetails);
      return placeDetails;
    } catch (error) {
      console.warn("❌ Failed to fetch place details:", error);
      return null;
    }
  };

  // Search for places using our backend API (which can use Places API New)
  const searchPlaces = async (query: string) => {
    if (!query.trim() || query.length < 3) { // Require at least 3 characters
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      console.log("🗺️ Searching places for:", query);
      const response = await apiRequest('/api/maps/places-search', {
        method: 'POST',
        body: JSON.stringify({ query }),
      });
      
      const data = await response.json();
      
      if (data.suggestions) {
        setSuggestions(data.suggestions);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error("❌ Places search error:", error);
      setError("Failed to search places");
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounce search requests - only run if not searchOnTabOnly mode
  useEffect(() => {
    // Skip automatic search if searchOnTabOnly is enabled
    if (searchOnTabOnly) {
      return;
    }
    
    const timeoutId = setTimeout(() => {
      if (inputValue && inputValue.length >= 3) { // Only search after 3+ characters
        searchPlaces(inputValue);
      }
    }, 800); // Longer delay to allow more typing
    
    return () => clearTimeout(timeoutId);
  }, [inputValue, searchOnTabOnly]);

  const handleSelectSuggestion = async (suggestion: any) => {
    console.log("🔍 handleSelectSuggestion called");
    // Immediately hide suggestions and clear them to prevent UI issues
    setShowSuggestions(false);
    setSuggestions([]);
    setError(null);
    
    // Start with basic address data
    const baseAddressData: AddressData = {
      address: suggestion.name || suggestion.formatted_address,
      formattedAddress: suggestion.formatted_address,
      lat: suggestion.lat,
      lng: suggestion.lng,
      placeId: suggestion.placeId
    };
    
    console.log("📍 Selected place data:", baseAddressData);
    
    // Set loading state while fetching details
    setIsLoading(true);
    setInputValue(suggestion.name || suggestion.formatted_address);

    // Fetch detailed place information if we have a place ID
    if (suggestion.placeId) {
      try {
        const placeDetails = await fetchPlaceDetails(suggestion.placeId);
        if (placeDetails) {
          const enrichedAddressData: AddressData = {
            ...baseAddressData,
            contactInfo: placeDetails.contactInfo,
            businessInfo: placeDetails.businessInfo
          };
          console.log("📍 Enriched address data with place details:", enrichedAddressData);
          onSelect(enrichedAddressData);
        } else {
          // Fallback to basic data if details fetch failed
          onSelect(baseAddressData);
        }
      } catch (error) {
        console.warn("Failed to fetch place details, using basic data:", error);
        onSelect(baseAddressData);
      }
    } else {
      onSelect(baseAddressData);
    }
    
    setIsLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    console.log("🔍 Input changed to:", value);
    setInputValue(value);
    
    if (!value.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Handle Tab key press to trigger search
  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab' && inputValue.trim() && inputValue.length >= 3) {
      e.preventDefault(); // Prevent default tab behavior
      console.log("⌨️ Tab pressed, searching for:", inputValue);
      await searchPlaces(inputValue);
    }
  };

  // Fallback geocoding when user types and blurs without selecting
  const handleBlur = async () => {
    // Hide suggestions immediately on blur
    setTimeout(() => {
      setShowSuggestions(false);
      setSuggestions([]);
    }, 150); // Small delay to allow click events to complete
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className={`${className} ${isLoading ? 'opacity-50' : ''}`}
        disabled={isLoading}
      />
      
      {isLoading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
        </div>
      )}
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log("🔍 Suggestion clicked, hiding suggestions");
                handleSelectSuggestion(suggestion);
              }}
            >
              <div className="font-medium text-sm">
                {suggestion.name}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {suggestion.formatted_address}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {error && (
        <div className="text-red-500 text-xs mt-1">
          {error}
        </div>
      )}
    </div>
  );
}