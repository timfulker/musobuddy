import { useRef, useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";

interface AddressData {
  address: string;
  formattedAddress?: string;
  lat: number;
  lng: number;
  placeId?: string;
}

interface AddressAutocompleteProps {
  onSelect: (data: AddressData) => void;
  placeholder?: string;
  defaultValue?: string;
  className?: string;
}

export default function AddressAutocomplete({
  onSelect,
  placeholder = "Start typing venue name or address...",
  defaultValue = "",
  className = "border rounded px-3 py-2 w-full min-w-0"
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputValue, setInputValue] = useState(defaultValue);

  // Search for places using our backend API (which can use Places API New)
  const searchPlaces = async (query: string) => {
    if (!query.trim() || query.length < 2) {
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

  // Debounce search requests
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (inputValue) {
        searchPlaces(inputValue);
      }
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [inputValue]);

  const handleSelectSuggestion = (suggestion: any) => {
    const addressData: AddressData = {
      address: suggestion.name || suggestion.formatted_address,
      formattedAddress: suggestion.formatted_address,
      lat: suggestion.lat,
      lng: suggestion.lng,
      placeId: suggestion.placeId
    };
    
    console.log("📍 Selected place data:", addressData);
    console.log("📍 Original suggestion:", suggestion);
    onSelect(addressData);
    setInputValue(suggestion.name || suggestion.formatted_address);
    setShowSuggestions(false);
    setError(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    if (!value.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Fallback geocoding when user types and blurs without selecting
  const handleBlur = async () => {
    // Small delay to allow click on suggestions
    setTimeout(async () => {
      if (!inputValue.trim()) return;
      
      const query = inputValue.trim();
      if (query.length < 2) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        console.log("🗺️ Fallback geocoding:", query);
        
        const response = await apiRequest('/api/maps/geocode', {
          method: 'POST',
          body: JSON.stringify({ address: query })
        });
        
        const result = await response.json();
        
        if (result.lat && result.lng) {
          const addressData: AddressData = {
            address: result.address || query,
            formattedAddress: result.formattedAddress,
            lat: result.lat,
            lng: result.lng,
            placeId: result.placeId
          };
          
          console.log("✅ Fallback geocoding success:", addressData);
          onSelect(addressData);
        }
      } catch (error: any) {
        console.error("Geocoding error:", error);
        setError("Could not find location");
      } finally {
        setIsLoading(false);
        setShowSuggestions(false);
      }
    }, 150);
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={inputValue}
        onChange={handleInputChange}
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
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent blur from firing
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