import { useState } from 'react';
import AddressAutocomplete from './AddressAutocomplete';
import LoadInMap from './LoadInMap';
import { getStaticMapUrl, getStreetViewUrl, formatCoordinates } from '@/lib/mapUtils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, Clock, Image } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface AddressData {
  address: string;
  lat: number;
  lng: number;
  placeId?: string;
}

interface TravelTimeData {
  distanceText?: string;
  distanceMeters?: number;
  durationText?: string;
  durationSec?: number;
  durationInTrafficText?: string;
  durationInTrafficSec?: number;
}

export default function GoogleMapsTest() {
  const [selectedAddress, setSelectedAddress] = useState<AddressData | null>(null);
  const [travelTime, setTravelTime] = useState<TravelTimeData | null>(null);
  const [isLoadingTravel, setIsLoadingTravel] = useState(false);
  const [travelError, setTravelError] = useState<string | null>(null);

  // Sample load-in pins for demonstration
  const samplePins = selectedAddress ? [
    {
      lat: selectedAddress.lat + 0.001,
      lng: selectedAddress.lng + 0.001,
      type: "stage" as const,
      note: "Stage Door - Loading entrance",
      id: "stage-1"
    },
    {
      lat: selectedAddress.lat - 0.001,
      lng: selectedAddress.lng + 0.002,
      type: "parking" as const,
      note: "Equipment parking area",
      id: "parking-1"
    },
    {
      lat: selectedAddress.lat + 0.002,
      lng: selectedAddress.lng - 0.001,
      type: "foh" as const,
      note: "Front of house entrance",
      id: "foh-1"
    },
    {
      lat: selectedAddress.lat - 0.002,
      lng: selectedAddress.lng - 0.002,
      type: "greenroom" as const,
      note: "Green room / artist entrance",
      id: "greenroom-1"
    }
  ] : [];

  const handleAddressSelect = (addressData: AddressData) => {
    setSelectedAddress(addressData);
    setTravelTime(null);
    setTravelError(null);
    console.log('📍 Address selected:', addressData);
  };

  const calculateTravelTime = async () => {
    if (!selectedAddress) return;

    setIsLoadingTravel(true);
    setTravelError(null);

    try {
      // Example: Calculate travel time from London Eye to selected venue
      const londonEye = { lat: 51.5033, lng: -0.1196 };
      
      const result = await apiRequest('/api/maps/travel-time', {
        method: 'POST',
        body: {
          origin: londonEye,
          destination: { lat: selectedAddress.lat, lng: selectedAddress.lng },
          departureTimeIso: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour from now
        }
      }) as TravelTimeData;

      setTravelTime(result);
      console.log('🚗 Travel time calculated:', result);
    } catch (error) {
      console.error('Travel time error:', error);
      setTravelError('Failed to calculate travel time');
    } finally {
      setIsLoadingTravel(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Google Maps Integration Test</h1>
        <p className="text-gray-600">Test all Google Maps functionality for MusoBuddy</p>
      </div>

      {/* Address Autocomplete Test */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Address Autocomplete
          </CardTitle>
          <CardDescription>
            Type an address to test geocoding and place selection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AddressAutocomplete
            onSelect={handleAddressSelect}
            placeholder="Search for a venue address..."
            className="w-full p-3 border rounded-lg"
          />
          
          {selectedAddress && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-800 mb-2">Selected Address:</h4>
              <p className="text-sm">{selectedAddress.address}</p>
              <p className="text-xs text-gray-600 mt-1">
                Coordinates: {formatCoordinates(selectedAddress.lat, selectedAddress.lng)}
              </p>
              {selectedAddress.placeId && (
                <Badge variant="secondary" className="mt-2">
                  Place ID: {selectedAddress.placeId}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Travel Time Test */}
      {selectedAddress && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="w-5 h-5" />
              Travel Time Calculation
            </CardTitle>
            <CardDescription>
              Calculate travel time with live traffic data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={calculateTravelTime} 
              disabled={isLoadingTravel}
              className="w-full"
            >
              {isLoadingTravel ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <Navigation className="w-4 h-4 mr-2" />
                  Calculate Travel Time from London Eye
                </>
              )}
            </Button>

            {travelError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                {travelError}
              </div>
            )}

            {travelTime && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">Travel Information:</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Distance:</span> {travelTime.distanceText}
                  </div>
                  <div>
                    <span className="font-medium">Duration:</span> {travelTime.durationText}
                  </div>
                  {travelTime.durationInTrafficText && (
                    <div className="col-span-2">
                      <span className="font-medium">With Traffic:</span> {travelTime.durationInTrafficText}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Interactive Map with Load-in Pins */}
      {selectedAddress && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Load-in Pins Map
            </CardTitle>
            <CardDescription>
              Interactive map showing venue load-in points
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoadInMap
              center={{ lat: selectedAddress.lat, lng: selectedAddress.lng }}
              pins={samplePins}
              zoom={16}
              height={400}
              onPinClick={(pin) => {
                console.log('📍 Pin clicked:', pin);
                alert(`${pin.type.toUpperCase()}: ${pin.note}`);
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Static Map Previews */}
      {selectedAddress && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="w-5 h-5" />
              Static Map Previews
            </CardTitle>
            <CardDescription>
              Static map and street view images for PDFs and previews
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Static Map</h4>
                <img 
                  src={getStaticMapUrl(selectedAddress.lat, selectedAddress.lng, 'V')}
                  alt="Static map preview"
                  className="w-full rounded-lg border"
                  onError={(e) => {
                    e.currentTarget.src = 'https://via.placeholder.com/600x320/e5e7eb/6b7280?text=Map+Preview+Unavailable';
                  }}
                />
              </div>
              <div>
                <h4 className="font-semibold mb-2">Street View</h4>
                <img 
                  src={getStreetViewUrl(selectedAddress.lat, selectedAddress.lng)}
                  alt="Street view preview"
                  className="w-full rounded-lg border"
                  onError={(e) => {
                    e.currentTarget.src = 'https://via.placeholder.com/600x320/e5e7eb/6b7280?text=Street+View+Unavailable';
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* API Status */}
      <Card>
        <CardHeader>
          <CardTitle>API Configuration Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Browser API Key:</span>
              <Badge variant={import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY ? "default" : "destructive"}>
                {import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY ? "Configured" : "Missing"}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>Server Health:</span>
              <Badge variant="outline">
                Check /api/health/maps
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}