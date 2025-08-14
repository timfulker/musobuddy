import { type Express, type Request, type Response } from "express";
import { storage } from "../core/storage";
import { clientPortalService } from "../core/client-portal";
import { asyncHandler } from '../middleware/errorHandler';

export function registerClientPortalRoutes(app: Express) {
  console.log('🎵 Setting up client portal routes...');

  // Get client portal data
  app.get('/api/client-portal/:contractId', asyncHandler(async (req: Request, res: Response) => {
    const contractId = parseInt(req.params.contractId);
    const token = req.query.token as string;

    if (!token) {
      return res.status(400).json({ error: 'Access token required' });
    }

    try {
      // Get contract with portal token verification
      const contract = await storage.getContract(contractId);
      if (!contract) {
        return res.status(404).json({ error: 'Contract not found' });
      }

      // Verify portal token
      if (!contract.client_portal_token || !clientPortalService.verifyPortalToken(token, contract.client_portal_token)) {
        return res.status(403).json({ error: 'Invalid access token' });
      }

      // Get associated booking data for collaborative fields
      let bookingData = null;
      if (contract.enquiry_id) {
        const booking = await storage.getBooking(contract.enquiry_id);
        if (booking) {
          bookingData = {
            venueContact: booking.venue_contact,
            soundTechContact: booking.sound_tech_contact,
            stageSize: booking.stage_size,
            powerEquipment: booking.power_equipment,
            dressCode: booking.dress_code,
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
            encoreSuggestions: booking.encore_suggestions,
            updatedAt: booking.updated_at
          };
        }
      }

      res.json({
        contract: {
          id: contract.id,
          contractNumber: contract.contract_number,
          clientName: contract.client_name,
          venue: contract.venue,
          eventDate: contract.event_date,
          eventTime: contract.event_time,
          eventEndTime: contract.event_end_time,
          performanceDuration: contract.performance_duration,
          status: contract.status
        },
        clientData: bookingData
      });

    } catch (error: any) {
      console.error('❌ Error fetching client portal data:', error);
      res.status(500).json({ error: 'Failed to load portal data' });
    }
  }));

  // Update client portal data
  app.post('/api/client-portal/:contractId/update', asyncHandler(async (req: Request, res: Response) => {
    const contractId = parseInt(req.params.contractId);
    const { token, ...updates } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Access token required' });
    }

    try {
      // Get contract and verify token
      const contract = await storage.getContract(contractId);
      if (!contract) {
        return res.status(404).json({ error: 'Contract not found' });
      }

      if (!contract.client_portal_token || !clientPortalService.verifyPortalToken(token, contract.client_portal_token)) {
        return res.status(403).json({ error: 'Invalid access token' });
      }

      // Update associated booking with collaborative data
      if (contract.enquiryId) {
        const bookingUpdates = {
          venue_contact: updates.venueContact,
          sound_tech_contact: updates.soundTechContact,
          stage_size: updates.stageSize,
          power_equipment: updates.powerEquipment,
          dress_code: updates.dressCode,
          style_mood: updates.styleMood,
          must_play_songs: updates.mustPlaySongs,
          avoid_songs: updates.avoidSongs,
          set_order: updates.setOrder,
          first_dance_song: updates.firstDanceSong,
          processional_song: updates.processionalSong,
          signing_register_song: updates.signingRegisterSong,
          recessional_song: updates.recessionalSong,
          special_dedications: updates.specialDedications,
          guest_announcements: updates.guestAnnouncements,
          load_in_info: updates.loadInInfo,
          sound_check_time: updates.soundCheckTime,
          weather_contingency: updates.weatherContingency,
          parking_permit_required: updates.parkingPermitRequired,
          meal_provided: updates.mealProvided,
          dietary_requirements: updates.dietaryRequirements,
          shared_notes: updates.sharedNotes,
          reference_tracks: updates.referenceTracks,
          photo_permission: updates.photoPermission,
          encore_allowed: updates.encoreAllowed,
          encore_suggestions: updates.encoreSuggestions,
          updated_at: new Date()
        };

        // Remove undefined values
        Object.keys(bookingUpdates).forEach(key => {
          if (bookingUpdates[key] === undefined) {
            delete bookingUpdates[key];
          }
        });

        await storage.updateBooking(contract.enquiryId, bookingUpdates, contract.userId);

        console.log(`✅ Client portal data updated for contract #${contractId} by ${contract.clientName}`);
        
        // TODO: Send notification to performer about client updates
        
        res.json({ 
          success: true, 
          message: 'Your event details have been updated successfully!' 
        });
      } else {
        res.status(400).json({ error: 'No associated booking found for this contract' });
      }

    } catch (error: any) {
      console.error('❌ Error updating client portal data:', error);
      res.status(500).json({ error: 'Failed to update portal data' });
    }
  }));

  console.log('✅ Client portal routes configured');
}