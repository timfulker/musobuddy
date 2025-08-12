import { GoogleMap, Marker, useLoadScript } from "@react-google-maps/api";

type Pin = { 
  lat: number; 
  lng: number; 
  type: "stage" | "parking" | "foh" | "greenroom"; 
  note?: string;
  id?: string; 
};

interface LoadInMapProps {
  center: google.maps.LatLngLiteral;
  pins: Pin[];
  zoom?: number;
  height?: number;
  onPinClick?: (pin: Pin) => void;
}

export default function LoadInMap({
  center,
  pins,
  zoom = 15,
  height = 360,
  onPinClick
}: LoadInMapProps) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY!,
  });

  if (loadError) {
    return (
      <div className="flex items-center justify-center bg-gray-100 rounded" style={{ height }}>
        <div className="text-red-600 text-center">
          <p className="font-medium">Google Maps failed to load</p>
          <p className="text-sm">Please check your API configuration</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center bg-gray-100 rounded animate-pulse" style={{ height }}>
        <div className="text-gray-500">Loading map...</div>
      </div>
    );
  }

  const getIconFor = (type: Pin["type"]) => {
    // Color-coded pins for different load-in points
    const colors = {
      stage: "#DC2626", // red
      parking: "#2563EB", // blue  
      foh: "#059669", // green
      greenroom: "#7C3AED" // purple
    };
    
    return {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: colors[type],
      fillOpacity: 1,
      strokeColor: "#FFFFFF",
      strokeWeight: 2,
      scale: 8,
    };
  };

  const getPinLabel = (type: Pin["type"]) => {
    const labels = {
      stage: "S",
      parking: "P", 
      foh: "F",
      greenroom: "G"
    };
    return labels[type];
  };

  const mapContainerStyle = {
    width: "100%",
    height: `${height}px`
  };

  const mapOptions = {
    disableDefaultUI: false,
    zoomControl: true,
    mapTypeControl: false,
    streetViewControl: true,
    fullscreenControl: true,
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <GoogleMap 
        zoom={zoom} 
        center={center} 
        mapContainerStyle={mapContainerStyle}
        options={mapOptions}
      >
        {pins.map((pin, index) => (
          <Marker 
            key={pin.id || `${pin.type}-${index}`}
            position={{ lat: pin.lat, lng: pin.lng }} 
            icon={getIconFor(pin.type)}
            label={{
              text: getPinLabel(pin.type),
              color: "white",
              fontWeight: "bold",
              fontSize: "12px"
            }}
            title={pin.note || `${pin.type.charAt(0).toUpperCase() + pin.type.slice(1)} Door`}
            onClick={() => onPinClick?.(pin)}
          />
        ))}
      </GoogleMap>
      
      {/* Legend */}
      <div className="bg-gray-50 p-3 border-t">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-600"></div>
            <span>Stage Door</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-600"></div>
            <span>Parking</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-600"></div>
            <span>Front of House</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-600"></div>
            <span>Green Room</span>
          </div>
        </div>
      </div>
    </div>
  );
}