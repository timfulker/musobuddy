import type { Express, Request, Response } from "express";
import { requireAuth } from '../middleware/auth';

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

  // Places search endpoint using classic Places Autocomplete API
  app.post('/api/maps/places-search', requireAuth, async (req: Request, res: Response) => {
    try {
      const { query } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Valid query string required' });
      }

      if (!process.env.GOOGLE_MAPS_SERVER_KEY) {
        return res.status(500).json({ error: 'Google Maps server key not configured' });
      }

      console.log(`🗺️ Places autocomplete search: ${query}`);

      // Use classic Places Autocomplete API
      const placesUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&types=establishment|geocode&location=51.5074,-0.1278&radius=50000&key=${process.env.GOOGLE_MAPS_SERVER_KEY}`;

      const response = await fetch(placesUrl);
      const data = await response.json();

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        console.log(`❌ Places autocomplete failed: ${data.status}`, data.error_message);
        return res.status(400).json({ 
          error: 'Places search failed', 
          details: data.error_message || data.status
        });
      }

      // Get details for each prediction to get coordinates
      const suggestions = [];
      
      for (const prediction of (data.predictions || []).slice(0, 5)) {
        // For each prediction, get the full place details including coordinates
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=name,formatted_address,geometry&key=${process.env.GOOGLE_MAPS_SERVER_KEY}`;
        
        try {
          const detailsResponse = await fetch(detailsUrl);
          const detailsData = await detailsResponse.json();
          
          if (detailsData.status === 'OK' && detailsData.result) {
            const place = detailsData.result;
            suggestions.push({
              name: place.name || prediction.structured_formatting?.main_text || '',
              formatted_address: place.formatted_address || prediction.description || '',
              lat: place.geometry?.location?.lat || 0,
              lng: place.geometry?.location?.lng || 0,
              placeId: prediction.place_id || ''
            });
          }
        } catch (err) {
          console.warn(`Failed to get details for place ${prediction.place_id}:`, err);
          // Still add the prediction without coordinates as fallback
          suggestions.push({
            name: prediction.structured_formatting?.main_text || '',
            formatted_address: prediction.description || '',
            lat: 0,
            lng: 0,
            placeId: prediction.place_id || ''
          });
        }
      }

      console.log(`✅ Found ${suggestions.length} places for: ${query}`);
      res.json({ suggestions });

    } catch (error) {
      console.error('Places search error:', error);
      res.status(500).json({ 
        error: 'Places search failed',
        message: (error as Error).message 
      });
    }
  });
  
  // Simple geocoding endpoint
  app.post('/api/maps/geocode', requireAuth, async (req: Request, res: Response) => {
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
  app.post('/api/maps/travel-time', requireAuth, async (req: Request, res: Response) => {
    try {
      const { origin, destination, departureTime } = req.body;
      
      if (!origin || !destination) {
        return res.status(400).json({ error: 'Origin and destination required' });
      }

      if (!process.env.GOOGLE_MAPS_SERVER_KEY) {
        return res.status(500).json({ error: 'Google Maps server key not configured' });
      }

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

      const result = {
        distance: element.distance?.text,
        distanceValue: element.distance?.value,
        duration: element.duration?.text,
        durationValue: element.duration?.value,
        durationInTraffic: element.duration_in_traffic?.text,
        durationInTrafficValue: element.duration_in_traffic?.value
      };

      console.log(`✅ Travel time: ${result.durationInTraffic || result.duration}`);
      res.json(result);

    } catch (error) {
      console.error('Travel time error:', error);
      res.status(500).json({ 
        error: 'Travel time calculation failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  console.log('✅ Google Maps routes configured');
}