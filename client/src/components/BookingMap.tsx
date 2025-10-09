import React, { useEffect, useRef, useState } from 'react';

interface BookingMapProps {
  venue: string;
  className?: string;
  mapStaticUrl?: string | null; // Cached static map URL
  mapLatitude?: number | null;
  mapLongitude?: number | null;
  onMapGenerated?: (staticUrl: string, lat: number, lng: number) => void; // Callback when map is generated
}

// Simple in-memory cache for geocoded locations to reduce API costs
const locationCache = new Map<string, google.maps.LatLngLiteral>();

const BookingMap: React.FC<BookingMapProps> = ({ 
  venue, 
  className = "", 
  mapStaticUrl, 
  mapLatitude, 
  mapLongitude, 
  onMapGenerated 
}) => {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);

  // Debug logging
  console.log('🗺️ BookingMap render:', { 
    venue, 
    hasStaticUrl: !!mapStaticUrl,
    hasCachedCoords: !!(mapLatitude && mapLongitude),
    apiKey: import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY ? 'SET' : 'NOT SET' 
  });

  // If we have a cached static map URL, use it instead of the dynamic map
  if (mapStaticUrl) {
    return (
      <div className={className}>
        <img 
          src={mapStaticUrl} 
          alt={`Map of ${venue}`}
          className="w-full h-full object-cover rounded-lg"
          style={{ maxHeight: '300px' }}
        />
      </div>
    );
  }

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
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setMapLoaded(true);
    script.onerror = () => setError('Failed to load Google Maps');
    document.head.appendChild(script);
  };

  const createMap = async () => {
    if (!mapLoaded || !mapRef.current || !venue) return;

    try {
      // Check cache first to avoid unnecessary API calls
      const cacheKey = venue.toLowerCase().trim();
      const cachedLocation = locationCache.get(cacheKey);

      if (cachedLocation) {
        // Use cached location
        const map = new google.maps.Map(mapRef.current, {
          center: cachedLocation,
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

        new google.maps.Marker({
          position: cachedLocation,
          map: map,
          title: venue,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#4F46E5',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2
          }
        });

        mapInstance.current = map;
        
        // Generate static map URL for caching (from cached location)
        if (onMapGenerated) {
          const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?` +
            `center=${cachedLocation.lat},${cachedLocation.lng}&` +
            `zoom=15&` +
            `size=600x300&` +
            `maptype=roadmap&` +
            `markers=color:blue%7C${cachedLocation.lat},${cachedLocation.lng}&` +
            `key=${import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY}`;
          
          onMapGenerated(staticMapUrl, cachedLocation.lat, cachedLocation.lng);
        }
        return;
      }

      // If not cached, geocode the address with multiple fallback strategies
      const geocoder = new google.maps.Geocoder();
      
      console.log('🗺️ Attempting to geocode:', venue);
      
      // First attempt with exact venue string
      geocoder.geocode({ address: venue }, (results, status) => {
        if (status === 'OK' && results && results[0] && mapRef.current) {
          console.log('🗺️ Geocoding successful on first attempt');
          const location = results[0].geometry.location.toJSON();
          
          // Cache the result
          locationCache.set(cacheKey, location);
          
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

          new google.maps.Marker({
            position: location,
            map: map,
            title: venue,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: '#4F46E5',
              fillOpacity: 1,
              strokeColor: '#FFFFFF',
              strokeWeight: 2
            }
          });

          mapInstance.current = map;
          
          // Generate static map URL for caching
          if (onMapGenerated) {
            const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?` +
              `center=${location.lat},${location.lng}&` +
              `zoom=15&` +
              `size=600x300&` +
              `maptype=roadmap&` +
              `markers=color:blue%7C${location.lat},${location.lng}&` +
              `key=${import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY}`;
            
            onMapGenerated(staticMapUrl, location.lat, location.lng);
          }
        } else {
          console.log('🗺️ First geocoding attempt failed, trying fallback strategies');
          
          // Try fallback strategies if the exact address fails
          // Strategy 1: Try adding ", UK" to improve geocoding
          const venueWithCountry = `${venue}, UK`;
          geocoder.geocode({ address: venueWithCountry }, (results2, status2) => {
            if (status2 === 'OK' && results2 && results2[0] && mapRef.current) {
              console.log('🗺️ Geocoding successful with UK suffix');
              const location = results2[0].geometry.location.toJSON();
              locationCache.set(cacheKey, location);
              
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

              new google.maps.Marker({
                position: location,
                map: map,
                title: venue,
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 10,
                  fillColor: '#4F46E5',
                  fillOpacity: 1,
                  strokeColor: '#FFFFFF',
                  strokeWeight: 2
                }
              });

              mapInstance.current = map;
            } else {
              console.log('🗺️ All geocoding attempts failed:', status, status2);
              setError('Unable to find location on map');
            }
          });
        }
      });
    } catch (error) {
      console.error('Error creating map:', error);
      setError('Error loading map');
    }
  };

  useEffect(() => {
    if (!venue) return;
    
    loadGoogleMaps();
  }, [venue]);

  useEffect(() => {
    if (mapLoaded && venue) {
      createMap();
    }
  }, [mapLoaded, venue]);

  if (!venue) {
    return null;
  }

  if (error) {
    return (
      <div className={`bg-gray-100 border border-gray-200 rounded-lg p-4 text-center ${className}`}>
        <div className="text-gray-500 text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-100 border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
        <div className="text-sm font-medium text-gray-700 flex items-center">
          <span className="mr-2">📍</span>
          {venue}
        </div>
      </div>
      <div 
        ref={mapRef}
        className="w-full h-64 bg-gray-100 flex items-center justify-center"
      >
        {!mapLoaded ? (
          <div className="text-gray-500 text-sm">Loading map...</div>
        ) : (
          <div className="w-full h-full"></div>
        )}
      </div>
    </div>
  );
};

export default BookingMap;