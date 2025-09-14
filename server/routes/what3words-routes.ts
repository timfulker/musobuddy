import type { Express, Request, Response } from 'express';
import { authenticateWithSupabase, type SupabaseAuthenticatedRequest } from '../middleware/supabase-auth';

const WHAT3WORDS_API_KEY = process.env.WHAT3WORDS_API_KEY;
const W3W_BASE_URL = 'https://api.what3words.com/v3';

export function setupWhat3WordsRoutes(app: Express) {
  // Auto-suggest endpoint for what3words
  app.get('/api/what3words/autosuggest', authenticateWithSupabase, async (req: SupabaseAuthenticatedRequest, res: Response) => {
    try {
      const { input, focus } = req.query;
      
      if (!input) {
        return res.status(400).json({ error: 'Input parameter is required' });
      }

      if (!WHAT3WORDS_API_KEY) {
        console.error('❌ what3words API key not configured');
        return res.status(500).json({ error: 'what3words service not configured' });
      }

      // Build query parameters
      const params = new URLSearchParams({
        key: WHAT3WORDS_API_KEY,
        input: input as string,
        language: 'en',
        'n-results': '5',
        'clip-to-country': 'GB', // Focus on UK for initial launch
      });

      // Add focus coordinates if provided (helps with relevance)
      if (focus) {
        params.append('focus', focus as string);
      }

      const response = await fetch(`${W3W_BASE_URL}/autosuggest?${params}`);
      const data = await response.json();

      if (!response.ok) {
        console.error('what3words API error:', data);
        return res.status(response.status).json({ 
          error: data.error?.message || 'Failed to fetch suggestions' 
        });
      }

      // Return simplified suggestions for frontend
      const suggestions = data.suggestions?.map((s: any) => ({
        words: s.words,
        nearestPlace: s.nearestPlace,
        country: s.country,
        distanceToFocus: s.distanceToFocusKm,
      })) || [];

      res.json({ suggestions });
    } catch (error) {
      console.error('Error in what3words autosuggest:', error);
      res.status(500).json({ error: 'Failed to fetch what3words suggestions' });
    }
  });

  // Convert what3words to coordinates
  app.get('/api/what3words/convert-to-coordinates', authenticateWithSupabase, async (req: SupabaseAuthenticatedRequest, res: Response) => {
    try {
      const { words } = req.query;
      
      if (!words) {
        return res.status(400).json({ error: 'Words parameter is required' });
      }

      if (!WHAT3WORDS_API_KEY) {
        console.error('❌ what3words API key not configured');
        return res.status(500).json({ error: 'what3words service not configured' });
      }

      const params = new URLSearchParams({
        key: WHAT3WORDS_API_KEY,
        words: words as string,
        format: 'json',
      });

      const response = await fetch(`${W3W_BASE_URL}/convert-to-coordinates?${params}`);
      const data = await response.json();

      if (!response.ok) {
        console.error('what3words API error:', data);
        return res.status(response.status).json({ 
          error: data.error?.message || 'Failed to convert what3words address' 
        });
      }

      // Return location data
      res.json({
        words: data.words,
        coordinates: data.coordinates,
        nearestPlace: data.nearestPlace,
        country: data.country,
        map: data.map,
      });
    } catch (error) {
      console.error('Error converting what3words:', error);
      res.status(500).json({ error: 'Failed to convert what3words address' });
    }
  });

  // Convert coordinates to what3words
  app.get('/api/what3words/convert-to-3wa', authenticateWithSupabase, async (req: SupabaseAuthenticatedRequest, res: Response) => {
    try {
      const { lat, lng } = req.query;
      
      if (!lat || !lng) {
        return res.status(400).json({ error: 'Latitude and longitude are required' });
      }

      if (!WHAT3WORDS_API_KEY) {
        console.error('❌ what3words API key not configured');
        return res.status(500).json({ error: 'what3words service not configured' });
      }

      const params = new URLSearchParams({
        key: WHAT3WORDS_API_KEY,
        coordinates: `${lat},${lng}`,
        format: 'json',
        language: 'en',
      });

      const response = await fetch(`${W3W_BASE_URL}/convert-to-3wa?${params}`);
      const data = await response.json();

      if (!response.ok) {
        console.error('what3words API error:', data);
        return res.status(response.status).json({ 
          error: data.error?.message || 'Failed to convert coordinates' 
        });
      }

      res.json({
        words: data.words,
        nearestPlace: data.nearestPlace,
        country: data.country,
        map: data.map,
      });
    } catch (error) {
      console.error('Error converting to what3words:', error);
      res.status(500).json({ error: 'Failed to convert to what3words address' });
    }
  });

  console.log('✅ what3words routes configured');
}