import type { Express } from "express";
import { geocode } from "../maps/geocode";
import { travelTime } from "../maps/distance";
import { staticMapUrl, streetViewUrl } from "../maps/staticMap";
import { requireAuth } from '../middleware/auth';
import axios from 'axios';

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
  
  // Geocoding endpoint - requires authentication
  app.post('/api/maps/geocode', requireAuth, geocode);
  
  // Travel time endpoint - requires authentication  
  app.post('/api/maps/travel-time', requireAuth, travelTime);
  
  // Static map image endpoint
  app.get('/api/maps/static-map', requireAuth, async (req, res) => {
    try {
      const { lat, lng, label } = req.query;
      
      if (!lat || !lng) {
        return res.status(400).json({ error: 'lat and lng parameters required' });
      }
      
      if (!process.env.GOOGLE_MAPS_SERVER_KEY) {
        return res.status(500).json({ error: 'Google Maps not configured' });
      }
      
      const mapUrl = staticMapUrl({ 
        lat: parseFloat(lat as string), 
        lng: parseFloat(lng as string), 
        label: label as string 
      });
      
      const response = await axios.get(mapUrl, { responseType: 'stream' });
      res.set('Content-Type', 'image/png');
      response.data.pipe(res);
    } catch (error) {
      console.error('Static map error:', error);
      res.status(500).json({ error: 'Failed to generate static map' });
    }
  });
  
  // Street view image endpoint
  app.get('/api/maps/street-view', requireAuth, async (req, res) => {
    try {
      const { lat, lng } = req.query;
      
      if (!lat || !lng) {
        return res.status(400).json({ error: 'lat and lng parameters required' });
      }
      
      if (!process.env.GOOGLE_MAPS_SERVER_KEY) {
        return res.status(500).json({ error: 'Google Maps not configured' });
      }
      
      const streetUrl = streetViewUrl({ 
        lat: parseFloat(lat as string), 
        lng: parseFloat(lng as string)
      });
      
      const response = await axios.get(streetUrl, { responseType: 'stream' });
      res.set('Content-Type', 'image/jpeg');
      response.data.pipe(res);
    } catch (error) {
      console.error('Street view error:', error);
      res.status(500).json({ error: 'Failed to generate street view' });
    }
  });
  
  console.log('✅ Google Maps routes configured');
}