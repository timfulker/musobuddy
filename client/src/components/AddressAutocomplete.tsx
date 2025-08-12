import { useRef, useState, useEffect } from "react";
import { useLoadScript } from "@react-google-maps/api";
import { apiRequest } from "@/lib/queryClient";

const libraries: ("places")[] = ["places"];

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
  className = "border rounded px-3 py-2 w-full"
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY || '',
    libraries,
  });

  // Initialize Google Places Autocomplete when loaded
  useEffect(() => {
    if (isLoaded && inputRef.current && !autocompleteRef.current && import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY) {
      try {
        console.log("🗺️ Initializing Google Places Autocomplete...");
        
        autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
          types: ['establishment', 'geocode'],
          fields: ['name', 'formatted_address', 'geometry.location', 'place_id']
        });

        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current?.getPlace();
          
          if (place && place.geometry && place.geometry.location) {
            const addressData: AddressData = {
              address: place.name || place.formatted_address || '',
              formattedAddress: place.formatted_address,
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
              placeId: place.place_id
            };
            
            console.log('📍 Google Places selected:', addressData);
            onSelect(addressData);
            setError(null);
          }
        });

        console.log("✅ Google Places Autocomplete initialized");
      } catch (error) {
        console.error("❌ Error initializing Google Places:", error);
      }
    }
  }, [isLoaded, onSelect]);

  // Fallback geocoding when user types and blurs without selecting
  const handleBlur = async () => {
    const value = inputRef.current?.value?.trim();
    if (!value || value === defaultValue) return;

    // Don't geocode if we just selected from autocomplete
    if (autocompleteRef.current?.getPlace()?.geometry) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log("🗺️ Fallback geocoding:", value);
      
      const result = await apiRequest('/api/maps/geocode', {
        method: 'POST',
        body: { address: value }
      });

      if (result?.lat && result?.lng) {
        const addressData: AddressData = {
          address: value,
          formattedAddress: result.formattedAddress,
          lat: result.lat,
          lng: result.lng,
          placeId: result.placeId
        };
        
        console.log('✅ Server geocoded:', addressData);
        onSelect(addressData);
      }
    } catch (err: any) {
      console.error('Geocoding error:', err);
      setError(err?.message || 'Address not found');
    } finally {
      setIsLoading(false);
    }
  };

  // Show fallback input if Google Maps fails to load
  if (loadError || !import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY) {
    return (
      <div className="relative">
        <input
          type="text"
          placeholder={placeholder}
          defaultValue={defaultValue}
          className={className}
          onBlur={handleBlur}
          disabled={isLoading}
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          </div>
        )}
        {error && (
          <div className="text-red-600 text-sm mt-1">{error}</div>
        )}
        {!import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY && (
          <div className="text-yellow-600 text-xs mt-1">
            Google Maps API key not configured - using basic geocoding
          </div>
        )}
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <input
        type="text"
        placeholder="Loading Google Maps..."
        className={`${className} bg-gray-100 cursor-not-allowed`}
        disabled
      />
    );
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        defaultValue={defaultValue}
        className={`${className} ${isLoading ? 'bg-gray-50' : ''}`}
        onBlur={handleBlur}
        disabled={isLoading}
      />
      
      {isLoading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        </div>
      )}
      
      {error && (
        <div className="text-red-600 text-sm mt-1">{error}</div>
      )}
    </div>
  );
}