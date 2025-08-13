#!/usr/bin/env node

/**
 * Migration Script: Unify Booking Forms
 * 
 * This script ensures all existing bookings (over 1000) can be edited
 * using the new booking form by migrating any missing fields.
 * 
 * The goal is to eliminate the BookingDetailsDialog and have all bookings
 * use the new-booking form for both creation and editing.
 */

import { db } from '../server/core/database';
import { bookings } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function migrateBookings() {
  console.log('🚀 Starting booking migration to unified form structure...');
  
  try {
    // Get all bookings
    const allBookings = await db.select().from(bookings);
    console.log(`📊 Found ${allBookings.length} bookings to process`);
    
    let migrated = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const booking of allBookings) {
      try {
        // Check if booking needs migration
        // New form expects certain fields that might be missing in old bookings
        const needsMigration = !booking.eventTime && !booking.eventEndTime;
        
        if (needsMigration) {
          // Migrate time fields from old format if they exist
          const updates: any = {};
          
          // Ensure collaborative fields are initialized (they can be null but should exist)
          if (booking.venueContact === undefined) updates.venueContact = null;
          if (booking.soundTechContact === undefined) updates.soundTechContact = null;
          if (booking.stageSize === undefined) updates.stageSize = null;
          if (booking.powerEquipment === undefined) updates.powerEquipment = null;
          if (booking.styleMood === undefined) updates.styleMood = null;
          if (booking.mustPlaySongs === undefined) updates.mustPlaySongs = null;
          if (booking.avoidSongs === undefined) updates.avoidSongs = null;
          if (booking.setOrder === undefined) updates.setOrder = null;
          if (booking.firstDanceSong === undefined) updates.firstDanceSong = null;
          if (booking.processionalSong === undefined) updates.processionalSong = null;
          if (booking.signingRegisterSong === undefined) updates.signingRegisterSong = null;
          if (booking.recessionalSong === undefined) updates.recessionalSong = null;
          if (booking.specialDedications === undefined) updates.specialDedications = null;
          if (booking.guestAnnouncements === undefined) updates.guestAnnouncements = null;
          if (booking.loadInInfo === undefined) updates.loadInInfo = null;
          if (booking.soundCheckTime === undefined) updates.soundCheckTime = null;
          if (booking.weatherContingency === undefined) updates.weatherContingency = null;
          if (booking.parkingPermitRequired === undefined) updates.parkingPermitRequired = false;
          if (booking.mealProvided === undefined) updates.mealProvided = false;
          if (booking.dietaryRequirements === undefined) updates.dietaryRequirements = null;
          if (booking.sharedNotes === undefined) updates.sharedNotes = null;
          if (booking.referenceTracks === undefined) updates.referenceTracks = null;
          if (booking.photoPermission === undefined) updates.photoPermission = true;
          if (booking.encoreAllowed === undefined) updates.encoreAllowed = true;
          if (booking.encoreSuggestions === undefined) updates.encoreSuggestions = null;
          if (booking.what3words === undefined) updates.what3words = null;
          
          // Ensure contact fields exist
          if (booking.contactPhone === undefined) updates.contactPhone = null;
          if (booking.dressCode === undefined) updates.dressCode = null;
          if (booking.parkingInfo === undefined) updates.parkingInfo = null;
          if (booking.venueContactInfo === undefined) updates.venueContactInfo = null;
          
          // Ensure event fields exist
          if (booking.performanceDuration === undefined) updates.performanceDuration = null;
          if (booking.styles === undefined) updates.styles = null;
          if (booking.equipmentProvided === undefined) updates.equipmentProvided = null;
          if (booking.whatsIncluded === undefined) updates.whatsIncluded = null;
          
          // Only update if there are changes
          if (Object.keys(updates).length > 0) {
            await db.update(bookings)
              .set({
                ...updates,
                updatedAt: new Date()
              })
              .where(eq(bookings.id, booking.id));
            
            console.log(`✅ Migrated booking #${booking.id} (${booking.clientName || booking.title})`);
            migrated++;
          } else {
            skipped++;
          }
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`❌ Error migrating booking #${booking.id}:`, error);
        errors++;
      }
    }
    
    console.log('\n📈 Migration Summary:');
    console.log(`✅ Migrated: ${migrated} bookings`);
    console.log(`⏭️ Skipped: ${skipped} bookings (already compatible)`);
    console.log(`❌ Errors: ${errors} bookings`);
    console.log('\n✨ Migration complete!');
    
    process.exit(0);
  } catch (error) {
    console.error('💥 Fatal error during migration:', error);
    process.exit(1);
  }
}

// Run the migration
migrateBookings();