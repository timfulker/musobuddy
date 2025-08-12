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