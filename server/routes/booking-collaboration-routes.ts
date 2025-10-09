import type { Express, Request, Response } from "express";
import { db } from "../core/database.js";
import { bookings } from "../../shared/schema.js";
import { eq, and } from "drizzle-orm";
import crypto from 'crypto';
import { storage } from "../core/storage.js";

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

      // Get booking using storage (which uses Supabase with payment_terms columns)
      const booking = await storage.getBooking(parseInt(bookingId));

      if (!booking || booking.collaborationToken !== token) {
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

  // Get booking details for collaboration (authenticated via token)
  app.get('/api/booking-collaboration/:bookingId/details', async (req: Request, res: Response) => {
    try {
      const { bookingId } = req.params;
      const token = req.query.token as string;

      if (!token) {
        return res.status(400).json({ error: 'Collaboration token required' });
      }

      console.log(`🔐 [COLLABORATION] Getting booking details for ${bookingId} with token: ${token.substring(0, 8)}...`);

      // Verify token first (select only needed fields to avoid payment_terms column issue)
      const verification = await db.select({
        id: bookings.id,
        collaborationToken: bookings.collaborationToken
      }).from(bookings)
        .where(and(
          eq(bookings.id, parseInt(bookingId)),
          eq(bookings.collaborationToken, token)
        ))
        .then(results => results[0]);

      if (!verification) {
        console.log(`❌ [COLLABORATION] Invalid token or booking not found for booking ${bookingId}`);
        return res.status(403).json({ error: 'Invalid collaboration link' });
      }

      // Get full booking details using storage (which uses Supabase with payment_terms)
      const booking = await storage.getBooking(parseInt(bookingId));

      if (!booking) {
        console.log(`❌ [COLLABORATION] Booking ${bookingId} not found`);
        return res.status(404).json({ error: 'Booking not found' });
      }

      console.log(`✅ [COLLABORATION] Returning booking details for collaboration: ${booking.clientName}`);

      // Return full booking details for collaborative editing (includes payment terms from booking)
      res.json(booking);

    } catch (error: any) {
      console.error('❌ [COLLABORATION] Failed to get booking details:', error);
      res.status(500).json({ error: 'Failed to load booking details' });
    }
  });

  // Update booking via collaboration (authenticated via token)
  app.patch('/api/booking-collaboration/:bookingId/update', async (req: Request, res: Response) => {
    try {
      const { bookingId } = req.params;
      const token = req.query.token as string;
      const updates = req.body;

      if (!token) {
        return res.status(400).json({ error: 'Collaboration token required' });
      }

      console.log(`🔐 [COLLABORATION] Updating booking ${bookingId} via collaboration token`);

      // Verify collaboration token
      const booking = await db.select().from(bookings)
        .where(and(
          eq(bookings.id, parseInt(bookingId)),
          eq(bookings.collaborationToken, token)
        ))
        .then(results => results[0]);

      if (!booking) {
        console.log(`❌ [COLLABORATION] Invalid token for booking update: ${bookingId}`);
        return res.status(403).json({ error: 'Invalid collaboration link' });
      }

      // Only allow updating specific collaborative fields
      const allowedFields = [
        // Technical Details
        'venueContact',
        'soundTechContact',
        'soundCheckTime',
        'powerEquipment',
        'stageSize',
        'specialGuests',
        // Music Preferences
        'musicPreferences',
        'styleMood',
        'setOrder',
        'mustPlaySongs',
        'avoidSongs',
        // Special Moments (Wedding Events)
        'firstDanceSong',
        'processionalSong',
        'signingRegisterSong',
        'recessionalSong',
        // Logistics & Extras
        'loadInInfo',
        'weatherContingency',
        'dietaryRequirements',
        'referenceTracks',
        'sharedNotes',
        // Payment Terms (single source of truth)
        'paymentTerms',
        'dueDate',
        'paymentTermsCustomized',
        // Legacy fields for backward compatibility
        'equipmentRequirements',
        'equipmentProvided',
        'whatsIncluded',
        'referenceTracksExamples'
      ];

      // Filter updates to only include allowed fields
      const filteredUpdates: any = {};
      for (const field of allowedFields) {
        if (field in updates) {
          filteredUpdates[field] = updates[field];
        }
      }

      console.log('📝 [COLLABORATION] Filtered updates:', filteredUpdates);

      // Add all fields that can be updated directly
      const dbUpdates: any = {
        updatedAt: new Date()
      };
      
      const directFields = [
        'venueContact', 'soundTechContact', 'soundCheckTime', 'powerEquipment', 'stageSize', 'specialGuests',
        'musicPreferences', 'styleMood', 'setOrder', 'mustPlaySongs', 'avoidSongs', 'firstDanceSong', 'processionalSong',
        'signingRegisterSong', 'recessionalSong', 'loadInInfo', 'weatherContingency', 'dietaryRequirements',
        'referenceTracks', 'sharedNotes', 'equipmentRequirements', 'equipmentProvided', 'whatsIncluded',
        'referenceTracksExamples'
      ];
      
      for (const field of directFields) {
        if (field in filteredUpdates) {
          dbUpdates[field] = filteredUpdates[field];
        }
      }

      // Update the booking with collaborative fields only
      const updatedBooking = await db.update(bookings)
        .set(dbUpdates)
        .where(eq(bookings.id, parseInt(bookingId)))
        .returning()
        .then(results => results[0]);

      console.log(`✅ [COLLABORATION] Booking updated successfully: ${booking.clientName}`);

      res.json(updatedBooking);

    } catch (error: any) {
      console.error('❌ [COLLABORATION] Failed to update booking:', error);
      res.status(500).json({ error: 'Failed to update booking' });
    }
  });
}