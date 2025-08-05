import { type Express } from "express";
import { storage } from "../core/storage";
import { validateBody, validateQuery, schemas, sanitizeInput } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { generalApiRateLimit } from '../middleware/rateLimiting';
import { requireAuth } from '../auth/clean-auth-system';

export function registerBookingRoutes(app: Express) {
  console.log('📅 Setting up booking routes...');

  // Get all bookings for authenticated user
  app.get('/api/bookings', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.userId;
      const bookings = await storage.getBookings(userId);
      console.log(`✅ Retrieved ${bookings.length} bookings for user ${userId}`);
      res.json(bookings);
    } catch (error) {
      console.error('❌ Failed to fetch bookings:', error);
      res.status(500).json({ error: 'Failed to fetch bookings' });
    }
  });

  // Create new booking
  app.post('/api/bookings', 
    requireAuth,
    generalApiRateLimit,
    sanitizeInput,
    validateBody(schemas.createBooking),
    asyncHandler(async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      
      const bookingData = {
        userId,
        clientName: req.body.clientName,
        clientEmail: req.body.clientEmail || null,
        clientPhone: req.body.clientPhone || null,
        venue: req.body.venue || null,
        venueAddress: req.body.venueAddress || null,
        eventDate: req.body.eventDate,
        eventTime: req.body.eventTime || null,
        eventEndTime: req.body.eventEndTime || null,
        fee: req.body.fee || null,
        deposit: req.body.deposit || "0.00",
        status: req.body.status || 'new',
        notes: req.body.notes || null,
        gigType: req.body.gigType || null,
        equipmentRequirements: req.body.equipmentRequirements || null,
        specialRequirements: req.body.specialRequirements || null
      };
      
      const newBooking = await storage.createBooking(bookingData);
      console.log(`✅ Created booking #${newBooking.id} for user ${userId}`);
      res.json(newBooking);
      
    } catch (error: any) {
      console.error('❌ Failed to create booking:', error);
      res.status(500).json({ 
        error: 'Failed to create booking',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }));

  // Update booking
  app.patch('/api/bookings/:id', requireAuth, async (req: any, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      const userId = req.user.userId;
      
      // Verify ownership
      const existingBooking = await storage.getBooking(bookingId);
      if (!existingBooking || existingBooking.userId !== userId) {
        return res.status(404).json({ error: 'Booking not found' });
      }
      
      const updatedBooking = await storage.updateBooking(bookingId, req.body);
      console.log(`✅ Updated booking #${bookingId} for user ${userId}`);
      res.json(updatedBooking);
      
    } catch (error) {
      console.error('❌ Failed to update booking:', error);
      res.status(500).json({ error: 'Failed to update booking' });
    }
  });

  // Delete booking
  app.delete('/api/bookings/:id', requireAuth, async (req: any, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      const userId = req.user.userId;
      
      // Verify ownership
      const existingBooking = await storage.getBooking(bookingId);
      if (!existingBooking || existingBooking.userId !== userId) {
        return res.status(404).json({ error: 'Booking not found' });
      }
      
      await storage.deleteBooking(bookingId);
      console.log(`✅ Deleted booking #${bookingId} for user ${userId}`);
      res.json({ success: true });
      
    } catch (error) {
      console.error('❌ Failed to delete booking:', error);
      res.status(500).json({ error: 'Failed to delete booking' });
    }
  });

  // Get individual booking
  app.get('/api/bookings/:id', requireAuth, async (req: any, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      const userId = req.user.userId;
      
      const booking = await storage.getBooking(bookingId);
      if (!booking || booking.userId !== userId) {
        return res.status(404).json({ error: 'Booking not found' });
      }
      
      res.json(booking);
      
    } catch (error) {
      console.error('❌ Failed to fetch booking:', error);
      res.status(500).json({ error: 'Failed to fetch booking' });
    }
  });

  // Bulk delete bookings
  app.post('/api/bookings/bulk-delete', requireAuth, async (req: any, res) => {
    try {
      const { bookingIds } = req.body;
      const userId = req.user.userId;
      
      if (!bookingIds || !Array.isArray(bookingIds) || bookingIds.length === 0) {
        return res.status(400).json({ error: 'Booking IDs array is required' });
      }
      
      // Verify all bookings belong to the authenticated user
      const verificationPromises = bookingIds.map(async (bookingId: number) => {
        const booking = await storage.getBooking(bookingId);
        if (!booking) {
          throw new Error(`Booking #${bookingId} not found`);
        }
        if (booking.userId !== userId) {
          throw new Error(`Access denied to booking #${bookingId}`);
        }
        return booking;
      });
      
      try {
        await Promise.all(verificationPromises);
      } catch (verificationError: any) {
        return res.status(403).json({ error: verificationError.message });
      }
      
      const deletePromises = bookingIds.map((bookingId: number) => 
        storage.deleteBooking(bookingId)
      );
      
      await Promise.all(deletePromises);
      
      res.json({ 
        success: true, 
        deletedCount: bookingIds.length,
        message: `Successfully deleted ${bookingIds.length} booking${bookingIds.length !== 1 ? 's' : ''}` 
      });
      
    } catch (error: any) {
      console.error('❌ Bulk delete failed:', error);
      res.status(500).json({ 
        error: 'Failed to delete bookings', 
        details: error.message 
      });
    }
  });

  console.log('✅ Booking routes configured');
}