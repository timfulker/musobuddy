import { useRef, useState, useEffect } from "react";
import { useLoadScript } from "@react-google-maps/api";

const libraries: ("places")[] = ["places"];

interface AddressData {
  address: string;
  placeName?: string;
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
  placeholder = "Start typing venue name...",
  defaultValue = "",
  className = "border rounded px-3 py-2 w-full"
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY!,
    libraries,
  });

  // Debug logging
  useEffect(() => {
    console.log("🗺️ Google Maps loading state:", { 
      isLoaded, 
      loadError: loadError?.message,
      apiKey: import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY ? "Present" : "Missing"
    });
  }, [isLoaded, loadError]);

  useEffect(() => {
    if (isLoaded && inputRef.current && !autocompleteRef.current) {
      try {
        console.log("🗺️ Initializing Google Places Autocomplete...");
        
        // Initialize Google Places Autocomplete
        autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
          types: ['establishment'], // Focus on venues/establishments
          fields: ['name', 'formatted_address', 'geometry.location', 'place_id']
        });

        console.log("✅ Google Places Autocomplete initialized");

        // Listen for place selection
        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current?.getPlace();
          console.log("🔍 Place changed:", place);
          
          if (place && place.geometry && place.geometry.location) {
            const addressData: AddressData = {
              placeName: place.name || '',
              address: place.formatted_address || '',
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
              placeId: place.place_id
            };
            
            console.log('📍 Place selected:', addressData);
            onSelect(addressData);
          } else {
            console.log("❌ No valid place data received");
          }
        });
      } catch (error) {
        console.error("❌ Error initializing Google Places:", error);
      }
    }
  }, [isLoaded, onSelect]);

  if (loadError) {
    console.error("Google Maps load error:", loadError);
    return (
      <input
        type="text"
        placeholder={placeholder}
        defaultValue={defaultValue}
        className={className}
        onChange={(e) => {
          // Fallback to basic input if Google Maps fails
          if (e.target.value) {
            onSelect({
              address: e.target.value,
              placeName: e.target.value,
              lat: 0,
              lng: 0
            });
          }
        }}
      />
    );
  }

  if (!isLoaded) {
    return (
      <input
        type="text"
        placeholder={placeholder}
        defaultValue={defaultValue}
        className={className}
        onChange={(e) => {
          // If Google Maps isn't loaded, just use basic input
          const value = e.target.value;
          onSelect({
            address: value,
            placeName: value,
            lat: 0,
            lng: 0
          });
        }}
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
        disabled={isLoading}
        onChange={(e) => {
          // Fallback: if autocomplete isn't working, capture manual input
          if (!autocompleteRef.current) {
            const value = e.target.value;
            onSelect({
              address: value,
              placeName: value,
              lat: 0,
              lng: 0
            });
          }
        }}
      />
      
      {isLoading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  );
}