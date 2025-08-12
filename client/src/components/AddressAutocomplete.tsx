import { useRef, useState } from "react";
import { useLoadScript } from "@react-google-maps/api";
import { apiRequest } from "@/lib/queryClient";

const libraries: ("places")[] = ["places"];

interface AddressData {
  address: string;
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
  placeholder = "Start typing an address…",
  defaultValue = "",
  className = "border rounded px-3 py-2 w-full"
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY!,
    libraries,
  });

  if (loadError) {
    console.error("Google Maps load error:", loadError);
    return (
      <div className="text-red-600 text-sm">
        Google Maps failed to load. Please check your API configuration.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <input
        disabled
        placeholder="Loading Google Maps..."
        className={`${className} bg-gray-100 cursor-not-allowed`}
      />
    );
  }

  const handleBlur = async () => {
    const val = inputRef.current?.value?.trim();
    if (!val || val === defaultValue) return;
    
    await handleServerGeocode(val);
  };

  const handleKeyPress = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = inputRef.current?.value?.trim();
      if (val && val !== defaultValue) {
        await handleServerGeocode(val);
      }
    }
  };
  
  const handleServerGeocode = async (address: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log("🗺️ Server geocoding:", address);
      
      // Use test endpoint for maps-test page, production endpoint otherwise
      const isTestPage = window.location.pathname.includes('maps-test');
      const endpoint = isTestPage ? '/api/maps/geocode-test' : '/api/maps/geocode';
      
      const data = await apiRequest(endpoint, {
        method: 'POST',
        body: { address }
      }) as any;
      
      if (data?.lat && data?.lng) {
        const addressData: AddressData = {
          address: data.formattedAddress || address,
          lat: data.lat,
          lng: data.lng,
          placeId: data.placeId
        };
        
        console.log("✅ Server geocoded:", addressData);
        onSelect(addressData);
      } else {
        setError("Address not found");
      }
    } catch (err) {
      console.error("Geocoding error:", err);
      setError("Failed to geocode address");
    } finally {
      setIsLoading(false);
    }
  };

  // For now, fallback to server-side geocoding only since new Places API requires different implementation
  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        defaultValue={defaultValue}
        className={`${className} ${isLoading ? 'bg-gray-50' : ''}`}
        onBlur={handleBlur}
        onKeyPress={handleKeyPress}
        disabled={isLoading}
      />
      
      {isLoading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        </div>
      )}
      
      {error && (
        <div className="text-red-600 text-sm mt-1">
          {error}
        </div>
      )}
    </div>
  );
}