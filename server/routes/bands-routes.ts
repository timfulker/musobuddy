import { type Express } from "express";
import { storage } from "../core/storage";
import { authenticate, type AuthenticatedRequest } from '../middleware/supabase-only-auth';
import { asyncHandler } from '../middleware/errorHandler';
import { generalApiRateLimit } from '../middleware/rateLimiting';
import { requireSubscriptionOrAdmin } from '../core/subscription-middleware';
import { z } from 'zod';

// Band schemas
const createBandSchema = z.object({
  name: z.string().min(1, "Band name is required"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex code"),
  isDefault: z.boolean().optional(),
  displayOrder: z.number().optional(),
});

const updateBandSchema = createBandSchema.partial();

export function registerBandsRoutes(app: Express) {
  console.log('🎸 Setting up bands routes...');

  // Get all bands for authenticated user
  app.get('/api/bands', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const bands = await storage.getBandsByUserId(userId);
    console.log(`✅ Retrieved ${bands.length} bands for user ${userId}`);
    res.json(bands);
  }));

  // Create a new band
  app.post('/api/bands',
    authenticate,
    requireSubscriptionOrAdmin,
    generalApiRateLimit,
    asyncHandler(async (req: AuthenticatedRequest, res) => {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const parsed = createBandSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const newBand = await storage.createBand({
        userId,
        ...parsed.data,
      });

      console.log(`✅ Created band "${newBand.name}" for user ${userId}`);
      res.json(newBand);
    })
  );

  // Update a band
  app.patch('/api/bands/:bandId',
    authenticate,
    requireSubscriptionOrAdmin,
    generalApiRateLimit,
    asyncHandler(async (req: AuthenticatedRequest, res) => {
      const userId = req.user?.id;
      const bandId = parseInt(req.params.bandId);

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (isNaN(bandId)) {
        return res.status(400).json({ error: 'Invalid band ID' });
      }

      const parsed = updateBandSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      // Verify ownership
      const band = await storage.getBandById(bandId, userId);
      if (!band) {
        return res.status(404).json({ error: 'Band not found' });
      }

      const updatedBand = await storage.updateBand(bandId, userId, parsed.data);
      console.log(`✅ Updated band ${bandId} for user ${userId}`);
      res.json(updatedBand);
    })
  );

  // Delete a band
  app.delete('/api/bands/:bandId',
    authenticate,
    requireSubscriptionOrAdmin,
    asyncHandler(async (req: AuthenticatedRequest, res) => {
      const userId = req.user?.id;
      const bandId = parseInt(req.params.bandId);

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (isNaN(bandId)) {
        return res.status(400).json({ error: 'Invalid band ID' });
      }

      // Verify ownership
      const band = await storage.getBandById(bandId, userId);
      if (!band) {
        return res.status(404).json({ error: 'Band not found' });
      }

      // Don't allow deleting the default band
      if (band.isDefault) {
        return res.status(400).json({ error: 'Cannot delete the default band' });
      }

      await storage.deleteBand(bandId, userId);
      console.log(`✅ Deleted band ${bandId} for user ${userId}`);
      res.json({ success: true });
    })
  );

  // Assign a band to a booking
  app.patch('/api/bookings/:bookingId/band',
    authenticate,
    requireSubscriptionOrAdmin,
    asyncHandler(async (req: AuthenticatedRequest, res) => {
      const userId = req.user?.id;
      const bookingId = parseInt(req.params.bookingId);
      const { bandId } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (isNaN(bookingId)) {
        return res.status(400).json({ error: 'Invalid booking ID' });
      }

      // Verify band ownership if bandId is provided
      if (bandId !== null && bandId !== undefined) {
        const band = await storage.getBandById(bandId, userId);
        if (!band) {
          return res.status(404).json({ error: 'Band not found' });
        }
      }

      // Update the booking with the band
      await storage.updateBooking(bookingId, userId, { bandId });
      console.log(`✅ Assigned band ${bandId} to booking ${bookingId}`);
      res.json({ success: true });
    })
  );
}