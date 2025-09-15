import type { Express, Request, Response } from "express";
import { authenticate, type AuthenticatedRequest } from '../middleware/simple-auth';
import { collaborativeFormGenerator } from "../core/collaborative-form-generator.js";
import { db } from "../core/database.js";
import { bookings, contracts } from "../../shared/schema.js";
import { eq } from "drizzle-orm";

export function setupRegeneratePortalRoutes(app: Express) {
  // Regenerate collaborative form with latest data
  app.post('/api/contracts/:contractId/regenerate-portal', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { contractId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Get contract
      const contract = await db.select().from(contracts)
        .where(eq(contracts.id, parseInt(contractId)))
        .then(results => results[0]);

      if (!contract || contract.userId !== userId) {
        return res.status(404).json({ error: 'Contract not found' });
      }

      if (!contract.clientPortalToken) {
        return res.status(400).json({ error: 'No portal exists for this contract' });
      }

      // Get associated booking with latest data
      const booking = await db.select().from(bookings)
        .where(eq(bookings.contractId, parseInt(contractId)))
        .then(results => results[0]);

      if (!booking) {
        return res.status(404).json({ error: 'No booking found for this contract' });
      }

      // Prepare booking data with correct field mapping (snake_case to camelCase)
      const bookingData = {
        id: booking.id,
        contractId: contract.id,
        clientName: contract.clientName || 'Client',
        venue: booking.venue || contract.venue || 'TBC',
        eventDate: booking.eventDate?.toISOString() || contract.eventDate?.toISOString() || new Date().toISOString(),
        eventTime: booking.event_time || contract.eventTime,
        eventEndTime: booking.event_end_time || contract.eventEndTime,
        performanceDuration: booking.performance_duration || contract.performanceDuration,
        // Map all collaborative fields from snake_case database columns
        venueContact: booking.venue_contact,
        soundTechContact: booking.sound_tech_contact,
        stageSize: booking.stage_size,
        powerEquipment: booking.power_equipment,
        styleMood: booking.style_mood,
        mustPlaySongs: booking.must_play_songs,
        avoidSongs: booking.avoid_songs,
        setOrder: booking.set_order,
        firstDanceSong: booking.first_dance_song,
        processionalSong: booking.processional_song,
        signingRegisterSong: booking.signing_register_song,
        recessionalSong: booking.recessional_song,
        specialDedications: booking.special_dedications,
        guestAnnouncements: booking.guest_announcements,
        loadInInfo: booking.load_in_info,
        soundCheckTime: booking.sound_check_time,
        weatherContingency: booking.weather_contingency,
        parkingPermitRequired: booking.parking_permit_required,
        mealProvided: booking.meal_provided,
        dietaryRequirements: booking.dietary_requirements,
        sharedNotes: booking.shared_notes,
        referenceTracks: booking.reference_tracks,
        photoPermission: booking.photo_permission,
        encoreAllowed: booking.encore_allowed,
        encoreSuggestions: booking.encore_suggestions
      };

      // Build the dynamic collaborative form URL (not R2 static storage)
      const dynamicFormUrl = process.env.REPLIT_DEPLOYMENT 
        ? `https://www.musobuddy.com/api/collaborative-form/${contract.clientPortalToken}`
        : `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.replit.dev/api/collaborative-form/${contract.clientPortalToken}`;

      // No need to re-upload - the dynamic endpoint will always serve fresh data
      console.log(`✅ [PORTAL-REGENERATE] Portal URL updated for contract ${contractId} (dynamic serving)`);

      res.json({
        success: true,
        collaborativeFormUrl: dynamicFormUrl,
        message: 'Portal URL updated with dynamic serving'
      });

    } catch (error) {
      console.error('Error regenerating portal:', error);
      res.status(500).json({ 
        error: 'Failed to regenerate portal',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  console.log('✅ Portal regeneration routes configured');
}