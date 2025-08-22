import type { Express, Request, Response } from "express";
import { db } from "../core/database.js";
import { bookings } from "../../shared/schema.js";
import { eq, and } from "drizzle-orm";
import crypto from 'crypto';

export function setupBookingCollaborationRoutes(app: Express) {
  // Verify collaboration token and return booking access info
  app.get('/api/booking-collaboration/:bookingId/verify', async (req: Request, res: Response) => {
    try {
      const { bookingId } = req.params;
      const token = req.query.token as string;

      if (!token) {
        return res.status(400).json({ error: 'Collaboration token required' });
      }

      console.log(`🔐 [COLLABORATION] Verifying token for booking ${bookingId}: ${token.substring(0, 8)}...`);

      // Find booking with matching collaboration token
      const booking = await db.select().from(bookings)
        .where(and(
          eq(bookings.id, parseInt(bookingId)),
          eq(bookings.collaborationToken, token)
        ))
        .then(results => results[0]);

      if (!booking) {
        console.log(`❌ [COLLABORATION] Invalid token or booking not found for booking ${bookingId}`);
        return res.status(403).json({ error: 'Invalid collaboration link' });
      }

      console.log(`✅ [COLLABORATION] Valid collaboration access for booking ${bookingId} - client: ${booking.clientName}`);

      // Return limited client info for the collaboration page
      res.json({
        bookingId: booking.id,
        clientName: booking.clientName,
        eventDate: booking.eventDate,
        venue: booking.venue,
        eventType: booking.eventType,
        isCollaborationAccess: true
      });

    } catch (error: any) {
      console.error('❌ [COLLABORATION] Token verification failed:', error);
      res.status(500).json({ error: 'Failed to verify collaboration access' });
    }
  });

  // Generate collaboration token for a booking (called during contract signing)
  app.post('/api/booking-collaboration/:bookingId/generate-token', async (req: Request, res: Response) => {
    try {
      const { bookingId } = req.params;
      const { userId } = req.body; // User ID from contract signing process

      if (!userId) {
        return res.status(400).json({ error: 'User ID required' });
      }

      console.log(`🔑 [COLLABORATION] Generating token for booking ${bookingId} by user ${userId}`);

      // Verify booking belongs to the user
      const booking = await db.select().from(bookings)
        .where(and(
          eq(bookings.id, parseInt(bookingId)),
          eq(bookings.userId, userId)
        ))
        .then(results => results[0]);

      if (!booking) {
        console.log(`❌ [COLLABORATION] Booking ${bookingId} not found for user ${userId}`);
        return res.status(404).json({ error: 'Booking not found' });
      }

      // Generate new collaboration token
      const collaborationToken = crypto.randomBytes(32).toString('hex');
      
      // Update booking with collaboration token
      await db.update(bookings)
        .set({
          collaborationToken,
          collaborationTokenGeneratedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(bookings.id, parseInt(bookingId)));

      console.log(`✅ [COLLABORATION] Generated token for booking ${bookingId}: ${collaborationToken.substring(0, 8)}...`);

      // Generate collaboration URL
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://musobuddy.replit.app' 
        : `https://${process.env.REPL_SLUG || 'musobuddy'}.${process.env.REPL_OWNER || 'timfulkermusic'}.replit.dev`;
      
      const collaborationUrl = `${baseUrl}/booking/${bookingId}/collaborate?token=${collaborationToken}`;

      res.json({
        success: true,
        collaborationToken,
        collaborationUrl,
        bookingId: parseInt(bookingId)
      });

    } catch (error: any) {
      console.error('❌ [COLLABORATION] Token generation failed:', error);
      res.status(500).json({ error: 'Failed to generate collaboration token' });
    }
  });
}