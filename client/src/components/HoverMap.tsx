import React, { useEffect, useRef, useState } from 'react';

interface HoverMapProps {
  venue: string;
  children: React.ReactNode;
}

const HoverMap: React.FC<HoverMapProps> = ({ venue, children }) => {
  const [isHovering, setIsHovering] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const hoverTimeout = useRef<NodeJS.Timeout>();

  const loadGoogleMaps = () => {
    if (window.google && window.google.maps) {
      setMapLoaded(true);
      return;
    }

    // Check if the script is already loading
    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      // Wait for it to load
      const checkLoaded = () => {
        if (window.google && window.google.maps) {
          setMapLoaded(true);
        } else {
          setTimeout(checkLoaded, 100);
        }
      };
      checkLoaded();
      return;
    }

    // Load Google Maps script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setMapLoaded(true);
    document.head.appendChild(script);
  };

  const createMap = async () => {
    if (!mapLoaded || !mapRef.current || !venue) return;

    try {
      // Use Google Geocoding service to find the location
      const geocoder = new google.maps.Geocoder();
      
      geocoder.geocode({ address: venue }, (results, status) => {
        if (status === 'OK' && results && results[0] && mapRef.current) {
          const location = results[0].geometry.location;
          
          const map = new google.maps.Map(mapRef.current, {
            center: location,
            zoom: 15,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            zoomControl: true,
            styles: [
              {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }]
              }
            ]
          });

          // Add a marker
          new google.maps.Marker({
            position: location,
            map: map,
            title: venue,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#4F46E5',
              fillOpacity: 1,
              strokeColor: '#FFFFFF',
              strokeWeight: 2
            }
          });

          mapInstance.current = map;
        }
      });
    } catch (error) {
      console.error('Error creating map:', error);
    }
  };

  useEffect(() => {
    if (isHovering && mapLoaded) {
      // Small delay to ensure the DOM element is visible
      setTimeout(() => createMap(), 50);
    }
  }, [isHovering, mapLoaded, venue]);

  const handleMouseEnter = () => {
    // Clear any existing timeout
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
    }
    
    // Load Google Maps if not already loaded
    if (!mapLoaded) {
      loadGoogleMaps();
    }
    
    // Set hover state with a slight delay to avoid flickering
    hoverTimeout.current = setTimeout(() => {
      setIsHovering(true);
    }, 300);
  };

  const handleMouseLeave = () => {
    // Clear the timeout
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
    }
    
    // Hide with a slight delay to allow moving to the popup
    hoverTimeout.current = setTimeout(() => {
      setIsHovering(false);
    }, 200);
  };

  const handlePopupMouseEnter = () => {
    // Keep the popup open when hovering over it
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
    }
  };

  const handlePopupMouseLeave = () => {
    // Hide when leaving the popup
    setIsHovering(false);
  };

  if (!venue) {
    return <>{children}</>;
  }

  return (
    <div className="relative inline-block">
      <span 
        className="cursor-pointer hover:text-blue-600 transition-colors"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </span>
      
      {isHovering && (
        <div 
          className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[300px] min-h-[200px] -top-2 left-full ml-2"
          onMouseEnter={handlePopupMouseEnter}
          onMouseLeave={handlePopupMouseLeave}
        >
          <div className="text-sm font-medium text-gray-700 mb-2 border-b border-gray-100 pb-2">
            📍 {venue}
          </div>
          <div 
            ref={mapRef}
            className="w-full h-48 rounded bg-gray-100 flex items-center justify-center"
          >
            {!mapLoaded ? (
              <div className="text-gray-500 text-sm">Loading map...</div>
            ) : (
              <div className="w-full h-full rounded"></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HoverMap;