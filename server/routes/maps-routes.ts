import type { Express, Request, Response } from "express";
import { authenticate, type AuthenticatedRequest } from '../middleware/supabase-only-auth';
import { storage } from '../core/storage';

export function registerMapsRoutes(app: Express) {
  console.log('🗺️ Setting up Google Maps routes...');
  
  // Health check endpoint
  app.get('/api/health/maps', (_req, res) => {
    res.json({ 
      ok: true, 
      hasServerKey: !!process.env.GOOGLE_MAPS_SERVER_KEY,
      hasBrowserKey: !!process.env.VITE_GOOGLE_MAPS_BROWSER_KEY,
      timestamp: new Date().toISOString()
    });
  });

  // Places search endpoint using new Places API Text Search
  app.post('/api/maps/places-search', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { query } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Valid query string required' });
      }

      if (!process.env.GOOGLE_MAPS_SERVER_KEY) {
        return res.status(500).json({ error: 'Google Maps server key not configured' });
      }

      console.log(`🗺️ Places text search (NEW API): ${query}`);

      // Use new Places API Text Search
      const placesUrl = 'https://places.googleapis.com/v1/places:searchText';
      
      const requestBody = {
        textQuery: query,
        locationBias: {
          circle: {
            center: {
              latitude: 51.5074,
              longitude: -0.1278
            },
            radius: 50000.0
          }
        },

        maxResultCount: 5,
        languageCode: 'en'
      };

      const response = await fetch(placesUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': process.env.GOOGLE_MAPS_SERVER_KEY,
          'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.id'
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (!response.ok) {
        console.log(`❌ Places text search failed:`, data);
        return res.status(400).json({ 
          error: 'Places search failed', 
          details: data.error?.message || 'Search request failed'
        });
      }

      // Transform new API response to match our expected format
      const suggestions = (data.places || []).map((place: any) => ({
        name: place.displayName?.text || '',
        formatted_address: place.formattedAddress || '',
        lat: place.location?.latitude || 0,
        lng: place.location?.longitude || 0,
        placeId: place.id || ''
      }));

      console.log(`✅ Found ${suggestions.length} places for: ${query} (NEW API)`);
      res.json({ suggestions });

    } catch (error) {
      console.error('Places search error:', error);
      res.status(500).json({ 
        error: 'Places search failed',
        message: (error as Error).message 
      });
    }
  });

  // Place Details endpoint using new Places API
  app.post('/api/maps/place-details', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { placeId } = req.body;
      
      if (!placeId || typeof placeId !== 'string') {
        return res.status(400).json({ error: 'Valid place ID required' });
      }

      if (!process.env.GOOGLE_MAPS_SERVER_KEY) {
        return res.status(500).json({ error: 'Google Maps server key not configured' });
      }

      console.log(`🗺️ Fetching place details (NEW API): ${placeId}`);

      // Use new Places API Get Place Details
      const placesUrl = `https://places.googleapis.com/v1/places/${placeId}`;

      const response = await fetch(placesUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': process.env.GOOGLE_MAPS_SERVER_KEY,
          'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,nationalPhoneNumber,internationalPhoneNumber,websiteUri,regularOpeningHours,photos,editorialSummary,rating,userRatingCount'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        console.log(`❌ Place details failed:`, data);
        return res.status(400).json({ 
          error: 'Place details failed', 
          details: data.error?.message || 'Request failed'
        });
      }

      // Transform response for frontend use
      const placeDetails = {
        placeId: data.id || placeId,
        name: data.displayName?.text || '',
        formattedAddress: data.formattedAddress || '',
        location: {
          lat: data.location?.latitude || 0,
          lng: data.location?.longitude || 0
        },
        contactInfo: {
          phoneNumber: data.nationalPhoneNumber || data.internationalPhoneNumber || '',
          website: data.websiteUri || ''
        },
        businessInfo: {
          openingHours: data.regularOpeningHours?.weekdayDescriptions || [],
          rating: data.rating || null,
          ratingCount: data.userRatingCount || 0,
          description: data.editorialSummary?.text || ''
        },
        photos: (data.photos || []).slice(0, 3).map((photo: any) => ({
          reference: photo.name,
          width: photo.widthPx,
          height: photo.heightPx
        }))
      };

      console.log(`✅ Retrieved details for: ${placeDetails.name}`);
      res.json(placeDetails);

    } catch (error) {
      console.error('Place details error:', error);
      res.status(500).json({ 
        error: 'Place details failed',
        message: (error as Error).message 
      });
    }
  });
  
  // Simple geocoding endpoint
  app.post('/api/maps/geocode', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { address } = req.body;
      
      if (!address || typeof address !== 'string') {
        return res.status(400).json({ error: 'Valid address string required' });
      }

      if (!process.env.GOOGLE_MAPS_SERVER_KEY) {
        return res.status(500).json({ error: 'Google Maps server key not configured' });
      }

      console.log(`🗺️ Geocoding: ${address}`);

      // Call Google Geocoding API
      const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${process.env.GOOGLE_MAPS_SERVER_KEY}`;
      
      const response = await fetch(googleUrl);
      const data = await response.json();

      if (data.status !== 'OK' || !data.results?.length) {
        console.log(`❌ Geocoding failed for: ${address}, status: ${data.status}`);
        return res.status(404).json({ 
          error: 'Address not found', 
          details: data.status 
        });
      }

      const result = data.results[0];
      const location = result.geometry.location;

      const geocodeResult = {
        formattedAddress: result.formatted_address,
        lat: location.lat,
        lng: location.lng,
        placeId: result.place_id,
        address: address
      };

      console.log(`✅ Geocoded: ${address} → ${geocodeResult.formattedAddress}`);
      res.json(geocodeResult);

    } catch (error) {
      console.error('Geocoding error:', error);
      res.status(500).json({ 
        error: 'Geocoding failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Travel time endpoint
  app.post('/api/maps/travel-time', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { origin, destination, departureTime } = req.body;
      
      if (!origin || !destination) {
        return res.status(400).json({ error: 'Origin and destination required' });
      }

      if (!process.env.GOOGLE_MAPS_SERVER_KEY) {
        return res.status(500).json({ error: 'Google Maps server key not configured' });
      }
      
      // Get user's distance unit preference
      const userSettings = await storage.getSettings(req.user!.id);
      const distanceUnits = userSettings?.distanceUnits || 'miles';

      // Format origins and destinations for Google API
      const formatLocation = (loc: any) => {
        if (typeof loc === 'string') return encodeURIComponent(loc);
        if (loc.lat && loc.lng) return `${loc.lat},${loc.lng}`;
        throw new Error('Invalid location format');
      };

      const origins = formatLocation(origin);
      const destinations = formatLocation(destination);
      const departure = departureTime ? `&departure_time=${Math.floor(new Date(departureTime).getTime() / 1000)}` : '&departure_time=now';

      const googleUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origins}&destinations=${destinations}&mode=driving&traffic_model=best_guess${departure}&key=${process.env.GOOGLE_MAPS_SERVER_KEY}`;
      
      console.log(`🚗 Calculating travel time: ${origin} → ${destination}`);
      
      const response = await fetch(googleUrl);
      const data = await response.json();

      if (data.status !== 'OK') {
        return res.status(502).json({ error: 'Travel time calculation failed', details: data.status });
      }

      const element = data.rows?.[0]?.elements?.[0];
      if (!element || element.status !== 'OK') {
        return res.status(502).json({ error: 'No route found', details: element?.status });
      }

      // Convert distance from meters to user's preferred unit
      const distanceInMeters = element.distance?.value || 0;
      const distanceInMiles = (distanceInMeters * 0.000621371).toFixed(1);
      const distanceInKm = (distanceInMeters / 1000).toFixed(1);
      
      // Use user's preference for distance display
      const displayDistance = distanceUnits === 'km' 
        ? `${distanceInKm} km` 
        : `${distanceInMiles} miles`;
      
      const result = {
        distance: displayDistance,  // User's preferred unit
        distanceValue: distanceInMeters,
        distanceInMiles: parseFloat(distanceInMiles),
        distanceInKm: parseFloat(distanceInKm),
        distanceUnits: distanceUnits,  // Include the units for frontend
        duration: element.duration?.text,
        durationValue: element.duration?.value,
        durationInTraffic: element.duration_in_traffic?.text,
        durationInTrafficValue: element.duration_in_traffic?.value
      };

      console.log(`✅ Travel time: ${result.durationInTraffic || result.duration}, Distance: ${displayDistance}`);
      res.json(result);

    } catch (error) {
      console.error('Travel time error:', error);
      res.status(500).json({ 
        error: 'Travel time calculation failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Distance calculation endpoint (legacy compatibility)
  app.post('/api/maps/distance', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { origin, destination } = req.body;
      
      if (!origin || !destination) {
        return res.status(400).json({ error: 'Origin and destination required' });
      }

      if (!process.env.GOOGLE_MAPS_SERVER_KEY) {
        return res.status(500).json({ error: 'Google Maps server key not configured' });
      }
      
      // Get user's distance unit preference
      const userSettings = await storage.getSettings(req.user!.id);
      const distanceUnits = userSettings?.distanceUnits || 'miles';

      // Format locations for Google API
      const formatLocation = (loc: any) => {
        if (typeof loc === 'string') return encodeURIComponent(loc);
        if (loc.lat && loc.lng) return `${loc.lat},${loc.lng}`;
        throw new Error('Invalid location format');
      };

      const origins = formatLocation(origin);
      const destinations = formatLocation(destination);

      const googleUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origins}&destinations=${destinations}&mode=driving&key=${process.env.GOOGLE_MAPS_SERVER_KEY}`;
      
      console.log(`📏 Calculating distance: ${origin} → ${destination}`);
      
      const response = await fetch(googleUrl);
      const data = await response.json();

      if (data.status !== 'OK') {
        return res.status(502).json({ error: 'Distance calculation failed', details: data.status });
      }

      const element = data.rows?.[0]?.elements?.[0];
      if (!element || element.status !== 'OK') {
        return res.status(502).json({ error: 'No route found', details: element?.status });
      }

      // Convert distance from meters to user's preferred unit
      const distanceInMeters = element.distance?.value || 0;
      const distanceInMiles = distanceInMeters * 0.000621371;
      const distanceInKm = distanceInMeters / 1000;
      
      // Use user's preference for distance display
      const displayDistance = distanceUnits === 'km' 
        ? `${distanceInKm.toFixed(1)} km` 
        : `${distanceInMiles.toFixed(1)} miles`;
      
      const result = {
        distance: displayDistance,
        distanceValue: distanceInMeters,
        distanceInMiles: distanceInMiles,
        distanceInKm: distanceInKm,
        distanceUnits: distanceUnits,
        duration: element.duration?.text,
        durationValue: element.duration?.value
      };

      console.log(`✅ Distance calculated: ${displayDistance}`);
      res.json(result);

    } catch (error) {
      console.error('Distance calculation error:', error);
      res.status(500).json({ 
        error: 'Distance calculation failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  console.log('✅ Google Maps routes configured');
}