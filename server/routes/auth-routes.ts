import { type Express } from "express";
import { storage } from "../core/storage";
import { authRateLimit, smsRateLimit, emailRateLimit } from '../middleware/rateLimiting';
import { validateBody, sanitizeInput } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { z } from 'zod';

export async function registerAuthRoutes(app: Express) {
  console.log('🔐 Setting up authentication routes...');

  // Add a simple test endpoint to verify routing works
  app.get('/api/auth/test', (req, res) => {
    res.json({ message: 'Auth routes are working', timestamp: new Date().toISOString() });
  });

  // Import authentication logic from auth-rebuilt.ts
  const authModule = await import('../core/auth-rebuilt');
  await authModule.setupAuthRoutes(app);

  console.log('✅ Authentication routes configured');
}