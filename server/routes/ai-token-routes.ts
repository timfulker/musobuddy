import { Router } from 'express';
import type { Express } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getTokenUsageForUI } from '../utils/ai-token-manager.js';

export function registerTokenRoutes(app: Express): void {
  console.log('🤖 Setting up AI token management routes...');

  // Get token usage for UI display
  app.get('/api/token-usage', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const usage = await getTokenUsageForUI(userId);
      res.json(usage);
    } catch (error: any) {
      console.error('Error fetching token usage:', error);
      res.status(500).json({ error: 'Failed to fetch token usage' });
    }
  });

  console.log('✅ AI token routes configured');
}