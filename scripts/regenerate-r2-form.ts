import { db } from "../server/core/database";
import { bookings, contracts } from "../shared/schema";
import { eq, and } from "drizzle-orm";
import { collaborativeFormGenerator } from "../server/core/collaborative-form-generator";

async function regenerateR2Form() {
  try {
    console.log("🔄 REGENERATING R2 COLLABORATIVE FORM\n");
    console.log("=".repeat(50) + "\n");
    
    // Get contract #852
    const [contract] = await db.select().from(contracts).where(eq(contracts.id, 852));
    
    if (!contract) {
      console.error("❌ Contract #852 not found!");
      process.exit(1);
    }
    
    console.log("📋 Contract #852:");
    console.log(`  - Client: ${contract.clientName}`);
    console.log(`  - Enquiry ID: ${contract.enquiryId}`);
    console.log(`  - Current Portal URL: ${contract.clientPortalUrl}\n`);
    
    // Get booking #7594
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, 7594));
    
    if (!booking) {
      console.error("❌ Booking #7594 not found!");
      process.exit(1);
    }
    
    console.log("📅 Booking #7594:");
    console.log(`  - Client: ${booking.clientName}`);
    console.log(`  - Venue: ${booking.venue}`);
    
    // Prepare booking data for form generation
    const bookingData = {
      id: booking.id,
      contractId: contract.id,
      clientName: contract.clientName || 'Client',
      venue: booking.venue || contract.venue || 'TBC',
      eventDate: booking.eventDate?.toISOString() || contract.eventDate?.toISOString() || new Date().toISOString(),
      eventTime: booking.eventTime || contract.eventTime,
      eventEndTime: booking.eventEndTime || contract.eventEndTime,
      performanceDuration: booking.performanceDuration || contract.performanceDuration,
      // Include all collaborative fields
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
    
    // API endpoint for the form
    const apiEndpoint = process.env.NODE_ENV === 'production' 
      ? 'https://musobuddy.replit.app'
      : 'https://musobuddy.replit.app'; // Using production URL for R2 forms
    
    console.log("\n🔨 Generating new R2 form with corrected endpoint...");
    console.log(`  - Will use endpoint: ${apiEndpoint}/api/collaborative-form/${booking.id}/update`);
    
    // Upload the form to R2
    const result = await collaborativeFormGenerator.uploadCollaborativeForm(
      bookingData,
      apiEndpoint,
      {},  // fieldLocks
      contract.clientPortalToken || ''  // existingToken
    );
    
    const url = result?.url;
    
    if (!url) {
      console.error("❌ Failed to generate form - no URL returned");
      console.log("Result:", result);
      process.exit(1);
    }
    
    console.log(`\n✅ New R2 form generated: ${url}`);
    
    // Update contract with new URL
    await db.update(contracts)
      .set({ 
        clientPortalUrl: url,
        updatedAt: new Date()
      })
      .where(eq(contracts.id, 852));
    
    console.log("✅ Contract #852 updated with new portal URL");
    console.log("\n🎉 SUCCESS! The R2 form has been regenerated with the correct endpoint.");
    console.log("📝 The form will now save to: /api/collaborative-form/7594/update");
    console.log("🔗 New portal URL:", url);
    
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

regenerateR2Form();