import React, { useState, useEffect, useRef } from 'react';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { apiRequest } from '@/lib/queryClient';
import { MapPin, Loader2, X, Map, Eye, EyeOff } from 'lucide-react';

interface What3WordsInputProps {
  value: string;
  onChange: (value: string) => void;
  onLocationFound?: (coords: { lat: number; lng: number }, address: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

interface W3WSuggestion {
  words: string;
  nearestPlace: string;
  country: string;
  distanceToFocus?: number;
}

export function What3WordsInput({
  value,
  onChange,
  onLocationFound,
  placeholder = '///what.three.words',
  disabled = false,
  className = ''
}: What3WordsInputProps) {
  const [suggestions, setSuggestions] = useState<W3WSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [locationDetails, setLocationDetails] = useState<string>('');
  const [showMap, setShowMap] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Fetch suggestions with debounce
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Only search if input starts with /// or has at least 2 characters
    if (!value || value.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Clean input - ensure it starts with ///
    const cleanValue = value.startsWith('///') ? value : `///${value.replace(/^\/+/, '')}`;
    
    debounceTimer.current = setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await apiRequest(`/api/what3words/autosuggest?input=${encodeURIComponent(cleanValue.slice(3))}`);
        const data = await response.json();
        
        if (data.suggestions) {
          setSuggestions(data.suggestions);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
        }
      } catch (err) {
        console.error('Error fetching what3words suggestions:', err);
        setError('Unable to fetch suggestions');
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300); // 300ms debounce

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [value]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Convert what3words to coordinates when a valid address is selected
  const convertToCoordinates = async (words: string) => {
    try {
      const response = await apiRequest(`/api/what3words/convert-to-coordinates?words=${encodeURIComponent(words)}`);
      const data = await response.json();
      
      if (data.coordinates) {
        const coords = { lat: data.coordinates.lat, lng: data.coordinates.lng };
        const details = `///${data.words}, ${data.nearestPlace}`;
        
        // Store coordinates and details for map display
        setCoordinates(coords);
        setLocationDetails(details);
        setShowMap(true); // Auto-show map when location is found
        
        // Call the original callback if provided
        if (onLocationFound) {
          onLocationFound(coords, details);
        }
      }
    } catch (err) {
      console.error('Error converting what3words to coordinates:', err);
      setError('Unable to find location for this what3words address');
    }
  };

  const handleSuggestionClick = (suggestion: W3WSuggestion) => {
    const fullAddress = `///${suggestion.words}`;
    onChange(fullAddress);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    convertToCoordinates(suggestion.words);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;
    
    // Auto-add /// prefix if user types words without it
    if (newValue && !newValue.startsWith('/')) {
      newValue = `///${newValue}`;
    }
    
    onChange(newValue);
  };

  const clearInput = () => {
    onChange('');
    setSuggestions([]);
    setShowSuggestions(false);
    setError(null);
    setCoordinates(null);
    setLocationDetails('');
    setShowMap(false);
    inputRef.current?.focus();
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <MapPin className="h-4 w-4 text-gray-400" />
        </div>
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-10 pr-10"
        />
        {value && (
          <button
            type="button"
            onClick={clearInput}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        )}
        {isLoading && (
          <div className="absolute right-10 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          </div>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.words}
              type="button"
              className={`w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0 ${
                index === selectedIndex ? 'bg-gray-50' : ''
              }`}
              onClick={() => handleSuggestionClick(suggestion)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    ///{suggestion.words}
                  </div>
                  <div className="text-sm text-gray-500">
                    {suggestion.nearestPlace}, {suggestion.country}
                    {suggestion.distanceToFocus && (
                      <span className="ml-2">
                        ({suggestion.distanceToFocus.toFixed(1)} km away)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="absolute w-full mt-1 px-3 py-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Help text */}
      <p className="mt-1 text-xs text-gray-500">
        Enter a 3-word address for precise location (e.g., ///filled.count.soap)
      </p>

      {/* Map Preview */}
      {coordinates && (
        <Card className="mt-3 border-blue-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Map className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-900">Location Preview</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMap(!showMap)}
                className="h-8 px-2 text-xs"
              >
                {showMap ? (
                  <>
                    <EyeOff className="h-3 w-3 mr-1" />
                    Hide Map
                  </>
                ) : (
                  <>
                    <Eye className="h-3 w-3 mr-1" />
                    Show Map
                  </>
                )}
              </Button>
            </div>
            
            <div className="text-sm text-gray-600 mb-3">
              <div className="font-medium">{locationDetails}</div>
              <div className="text-xs mt-1">
                📍 {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
              </div>
            </div>

            {showMap && (
              <div className="relative">
                <LoadScript 
                  googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}
                  libraries={['places']}
                >
                  <GoogleMap
                    mapContainerStyle={{
                      width: '100%',
                      height: '200px',
                      borderRadius: '8px'
                    }}
                    center={coordinates}
                    zoom={16}
                    options={{
                      zoomControl: true,
                      streetViewControl: false,
                      fullscreenControl: false,
                      mapTypeControl: false,
                    }}
                  >
                    <Marker
                      position={coordinates}
                      title={locationDetails}
                      icon={{
                        path: google.maps.SymbolPath.CIRCLE,
                        fillColor: '#dc2626',
                        fillOpacity: 1,
                        strokeColor: '#ffffff',
                        strokeWeight: 2,
                        scale: 8,
                      }}
                    />
                  </GoogleMap>
                </LoadScript>
                <div className="mt-2 text-xs text-center text-gray-500">
                  📍 Precise what3words location
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}