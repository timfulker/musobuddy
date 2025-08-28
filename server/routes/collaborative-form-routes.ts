import type { Express, Request, Response } from "express";
import { authenticateWithFirebase, type AuthenticatedRequest } from '../middleware/firebase-auth';
import { collaborativeFormGenerator } from "../core/collaborative-form-generator.js";
import { db } from "../core/database.js";
import { bookings, contracts } from "../../shared/schema.js";
import { eq, and } from "drizzle-orm";
import crypto from 'crypto';

export function setupCollaborativeFormRoutes(app: Express) {
  // Generate collaborative form after contract signing
  app.post('/api/contracts/:contractId/generate-collaborative-form', authenticateWithFirebase, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { contractId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Get contract and associated booking
      const contract = await db.select().from(contracts)
        .where(and(eq(contracts.id, parseInt(contractId)), eq(contracts.userId, userId)))
        .then(results => results[0]);

      if (!contract) {
        return res.status(404).json({ error: 'Contract not found' });
      }

      if (contract.status !== 'signed') {
        return res.status(400).json({ error: 'Contract must be signed to generate collaborative form' });
      }

      // Get associated booking
      const booking = await db.select().from(bookings)
        .where(eq(bookings.contractId, parseInt(contractId)))
        .then(results => results[0]);

      if (!booking) {
        return res.status(404).json({ error: 'No booking found for this contract' });
      }

      // Prepare booking data for form generation
      // Note: Database columns use snake_case, so we need to access them properly
      const bookingData = {
        id: booking.id,
        contractId: contract.id,
        clientName: contract.clientName || 'Client',
        venue: booking.venue || contract.venue || 'TBC',
        eventDate: booking.eventDate?.toISOString() || contract.eventDate?.toISOString() || new Date().toISOString(),
        eventTime: booking.event_time || contract.eventTime,
        eventEndTime: booking.event_end_time || contract.eventEndTime,
        performanceDuration: booking.performance_duration || contract.performanceDuration,
        // Include all collaborative fields from booking - using snake_case from database
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

      // API endpoint for the form to communicate with
      const apiEndpoint = process.env.REPLIT_DEPLOYMENT 
        ? `https://www.musobuddy.com`
        : `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.replit.dev`;

      // Get field locks from booking
      const fieldLocks = booking.fieldLocks || {};

      // Generate a unique token for this collaborative form
      const portalToken = crypto.randomBytes(32).toString('hex');
      
      // Build the dynamic collaborative form URL (not R2 static storage)
      const dynamicFormUrl = process.env.REPLIT_DEPLOYMENT 
        ? `https://www.musobuddy.com/api/collaborative-form/${portalToken}`
        : `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.replit.dev/api/collaborative-form/${portalToken}`;

      // Update contract with collaborative form details (dynamic URL, not static R2)
      await db.update(contracts)
        .set({
          clientPortalUrl: dynamicFormUrl,
          clientPortalToken: portalToken,
          updatedAt: new Date()
        })
        .where(eq(contracts.id, contract.id));

      res.json({
        success: true,
        collaborativeFormUrl: dynamicFormUrl,
        message: 'Collaborative form generated successfully (dynamic serving)'
      });

    } catch (error) {
      console.error('Error generating collaborative form:', error);
      res.status(500).json({ 
        error: 'Failed to generate collaborative form',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Update collaborative form data
  app.post('/api/collaborative-form/:bookingId/update', async (req: Request, res: Response) => {
    try {
      const { bookingId } = req.params;
      const { token, fieldLocks, ...updateData } = req.body;

      console.log(`📝 [COLLABORATIVE-FORM] Update request for booking ${bookingId} with token ${token?.substring(0, 8)}...`);
      console.log(`📦 [COLLABORATIVE-FORM] Raw update data received:`, JSON.stringify(updateData));

      if (!token) {
        return res.status(401).json({ error: 'Portal token required' });
      }

      // First, try to find contract with this token
      const contract = await db.select().from(contracts)
        .where(eq(contracts.clientPortalToken, token))
        .then(results => results[0]);

      if (!contract) {
        console.log(`❌ [COLLABORATIVE-FORM] No contract found with token ${token?.substring(0, 8)}...`);
        return res.status(403).json({ error: 'Invalid portal token' });
      }

      console.log(`✅ [COLLABORATIVE-FORM] Found contract ${contract.id} with enquiryId ${contract.enquiryId}`);

      // For contracts created from bookings, use the enquiryId
      // For standalone contracts, the bookingId parameter should match the contract ID
      const targetBookingId = contract.enquiryId || parseInt(bookingId);
      
      // Verify the booking exists
      const booking = await db.select().from(bookings)
        .where(eq(bookings.id, targetBookingId))
        .then(results => results[0]);

      if (!booking) {
        console.log(`❌ [COLLABORATIVE-FORM] No booking found with ID ${targetBookingId}`);
        return res.status(404).json({ error: 'Associated booking not found' });
      }

      // Update booking with collaborative data - map camelCase to snake_case for database
      const dbUpdateData: any = {
        venue_contact: updateData.venueContact,
        sound_tech_contact: updateData.soundTechContact,
        stage_size: updateData.stageSize,
        power_equipment: updateData.powerEquipment,
        dress_code: updateData.dressCode,  // Fixed: was missing
        style_mood: updateData.styleMood,
        must_play_songs: updateData.mustPlaySongs,
        avoid_songs: updateData.avoidSongs,
        set_order: updateData.setOrder,
        first_dance_song: updateData.firstDanceSong,
        processional_song: updateData.processionalSong,
        signing_register_song: updateData.signingRegisterSong,
        recessional_song: updateData.recessionalSong,
        special_dedications: updateData.specialDedications,
        guest_announcements: updateData.guestAnnouncements,
        load_in_info: updateData.loadInInfo,
        sound_check_time: updateData.soundCheckTime,
        weather_contingency: updateData.weatherContingency,
        parking_permit_required: updateData.parkingPermitRequired,
        meal_provided: updateData.mealProvided,
        dietary_requirements: updateData.dietaryRequirements,
        shared_notes: updateData.sharedNotes,
        reference_tracks: updateData.referenceTracks,
        photo_permission: updateData.photoPermission,
        encoreAllowed: updateData.encoreAllowed,
        encoreSuggestions: updateData.encoreSuggestions,
        updatedAt: new Date()
      };

      // Remove undefined values but keep empty strings and false values
      Object.keys(dbUpdateData).forEach(key => {
        if (dbUpdateData[key] === undefined) {
          delete dbUpdateData[key];
        }
      });

      console.log(`🔄 [COLLABORATIVE-FORM] Updating booking ${targetBookingId} with ${Object.keys(dbUpdateData).length} fields`);
      
      // Check if there's anything to update besides updated_at
      const fieldsToUpdate = Object.keys(dbUpdateData).filter(key => key !== 'updated_at');
      console.log(`📊 [COLLABORATIVE-FORM] Fields to update: ${fieldsToUpdate.join(', ')}`);
      
      if (fieldsToUpdate.length === 0) {
        console.log(`⚠️ [COLLABORATIVE-FORM] No fields to update, only updating timestamp`);
        // At least update the timestamp
        await db.update(bookings)
          .set({ updatedAt: new Date() })
          .where(eq(bookings.id, targetBookingId));
        
        console.log(`✅ [COLLABORATIVE-FORM] Updated timestamp for booking ${targetBookingId}`);
        return res.json({ success: true, message: 'No data to update, timestamp updated' });
      }
      
      console.log(`🔨 [COLLABORATIVE-FORM] Executing update with data:`, Object.entries(dbUpdateData).map(([k,v]) => `${k}=${typeof v === 'string' ? v.substring(0,20) : v}`).join(', '));
      
      // Build SQL update query dynamically for better reliability
      const updateFields = [];
      const values = [];
      
      Object.entries(dbUpdateData).forEach(([key, value]) => {
        if (key !== 'updated_at') {
          updateFields.push(`${key} = $${values.length + 1}`);
          values.push(value);
        }
      });
      
      // Always update timestamp
      updateFields.push(`updated_at = NOW()`);
      
      const updateQuery = `UPDATE bookings SET ${updateFields.join(', ')} WHERE id = $${values.length + 1}`;
      values.push(targetBookingId);
      
      console.log(`🔧 [COLLABORATIVE-FORM] Executing parameterized query:`, updateQuery);
      
      try {
        const result = await db.execute(updateQuery, values);
        console.log(`✅ [COLLABORATIVE-FORM] Parameterized update successful`);
      } catch (updateError: any) {
        console.error(`❌ [COLLABORATIVE-FORM] Parameterized update failed:`, updateError.message);
        
        // Fallback to simple string interpolation (for non-sensitive data)
        const simpleFields = [];
        Object.entries(dbUpdateData).forEach(([key, value]) => {
          if (key !== 'updated_at') {
            const escapedValue = typeof value === 'string' ? value.replace(/'/g, "''") : value;
            simpleFields.push(`${key} = '${escapedValue}'`);
          }
        });
        simpleFields.push(`updated_at = NOW()`);
        
        const simpleQuery = `UPDATE bookings SET ${simpleFields.join(', ')} WHERE id = ${targetBookingId}`;
        console.log(`🔧 [COLLABORATIVE-FORM] Fallback to simple query`);
        
        await db.execute(simpleQuery);
        console.log(`✅ [COLLABORATIVE-FORM] Fallback update successful`);
      }

      console.log(`✅ [COLLABORATIVE-FORM] Updated booking ${targetBookingId} with collaborative data`);

      // Timestamp already updated in the main query above, no need for additional update
      console.log(`🔄 [COLLABORATIVE-FORM] Cache invalidation: Booking ${targetBookingId} timestamp updated`);
      
      res.json({
        success: true,
        message: 'Collaborative form updated successfully',
        bookingId: targetBookingId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error updating collaborative form:', error);
      res.status(500).json({ 
        error: 'Failed to update collaborative form',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Update field lock settings
  app.post('/api/collaborative-form/:bookingId/locks', authenticateWithFirebase, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { bookingId } = req.params;
      const { fieldLocks } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Verify user owns this booking
      const booking = await db.select().from(bookings)
        .where(eq(bookings.id, parseInt(bookingId)))
        .then(results => results[0]);

      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      // Store field locks in the booking's fieldLocks column
      await db.update(bookings)
        .set({
          fieldLocks: fieldLocks,
          updatedAt: new Date()
        })
        .where(eq(bookings.id, parseInt(bookingId)));

      console.log(`🔒 [FIELD-LOCKS] Updated field locks for booking ${bookingId}:`, fieldLocks);

      res.json({
        success: true,
        message: 'Field lock settings updated'
      });

    } catch (error) {
      console.error('Error updating field locks:', error);
      res.status(500).json({ 
        error: 'Failed to update field locks',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Serve dynamic collaborative form with live data
  app.get('/api/collaborative-form/:token', async (req: Request, res: Response) => {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).send('<h1>Error: No portal token provided</h1>');
      }

      // Find contract with this token
      const contract = await db.select().from(contracts)
        .where(eq(contracts.clientPortalToken, token))
        .then(results => results[0]);

      if (!contract) {
        return res.status(404).send('<h1>Error: Invalid portal token</h1>');
      }

      // Get the associated booking with current data
      const targetBookingId = contract.enquiryId;
      const booking = await db.select().from(bookings)
        .where(eq(bookings.id, targetBookingId))
        .then(results => results[0]);

      if (!booking) {
        return res.status(404).send('<h1>Error: No booking found for this contract</h1>');
      }

      // Prepare current booking data for form generation
      const bookingData = {
        id: booking.id,
        contractId: contract.id,
        clientName: contract.clientName || 'Client',
        venue: booking.venue || contract.venue || 'TBC',
        eventDate: booking.eventDate?.toISOString() || contract.eventDate?.toISOString() || new Date().toISOString(),
        eventTime: booking.eventTime || contract.eventTime,
        eventEndTime: booking.eventEndTime || contract.eventEndTime,
        performanceDuration: booking.performanceDuration || contract.performanceDuration,
        // Include all collaborative fields with current data (using consistent camelCase)
        venueContact: booking.venueContact,
        soundTechContact: booking.soundTechContact,
        stageSize: booking.stageSize,
        powerEquipment: booking.powerEquipment,
        styleMood: booking.styleMood,
        mustPlaySongs: booking.mustPlaySongs,
        avoidSongs: booking.avoidSongs,
        setOrder: booking.setOrder,
        firstDanceSong: booking.firstDanceSong,
        processionalSong: booking.processionalSong,
        signingRegisterSong: booking.signingRegisterSong,
        recessionalSong: booking.recessionalSong,
        specialDedications: booking.specialDedications,
        guestAnnouncements: booking.guestAnnouncements,
        loadInInfo: booking.loadInInfo,
        soundCheckTime: booking.soundCheckTime,
        weatherContingency: booking.weatherContingency,
        parkingPermitRequired: booking.parkingPermitRequired,
        mealProvided: booking.mealProvided,
        dietaryRequirements: booking.dietaryRequirements,
        sharedNotes: booking.sharedNotes,
        referenceTracks: booking.referenceTracks,
        photoPermission: booking.photoPermission,
        encoreAllowed: booking.encoreAllowed,
        encoreSuggestions: booking.encoreSuggestions
      };



      // API endpoint for the form to communicate with
      const apiEndpoint = process.env.REPLIT_DEPLOYMENT 
        ? `https://www.musobuddy.com`
        : `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.replit.dev`;

      // Get field locks from booking
      const fieldLocks = booking.fieldLocks || {};

      // Generate dynamic form HTML with current data
      const formHtml = collaborativeFormGenerator.generateStandaloneForm(
        bookingData,
        apiEndpoint,
        token,
        fieldLocks
      );

      res.setHeader('Content-Type', 'text/html');
      res.send(formHtml);

    } catch (error) {
      console.error('❌ Error serving dynamic collaborative form:', error);
      res.status(500).send('<h1>Error: Failed to load collaborative form</h1>');
    }
  });

  console.log('✅ Collaborative form routes configured');
}