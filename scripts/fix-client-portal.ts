import { db } from "../server/core/database";
import { bookings, contracts } from "../shared/schema";
import { eq } from "drizzle-orm";

async function fixClientPortal() {
  try {
    console.log("🔧 Fixing client portal issue...\n");
    
    // Check current state
    const [contract] = await db.select().from(contracts).where(eq(contracts.id, 742));
    
    if (!contract) {
      console.error("❌ Contract #742 not found!");
      process.exit(1);
    }
    
    console.log("📋 Current contract state:");
    console.log(`  - Contract ID: ${contract.id}`);
    console.log(`  - Client: ${contract.clientName}`);
    console.log(`  - Enquiry ID: ${contract.enquiryId || 'NULL (no booking linked)'}`);
    console.log(`  - Portal Token: ${contract.clientPortalToken || 'NULL'}\n`);
    
    if (contract.enquiryId) {
      console.log("✅ Contract already has an enquiry_id. Checking booking...");
      const [existingBooking] = await db.select().from(bookings).where(eq(bookings.id, contract.enquiryId));
      if (existingBooking) {
        console.log("✅ Booking exists! Client portal should work.");
        console.log(`  - Booking ID: ${existingBooking.id}`);
        console.log(`  - Client: ${existingBooking.clientName}`);
        console.log(`  - Venue: ${existingBooking.venue || 'TBC'}`);
        process.exit(0);
      }
    }
    
    // Create new booking
    console.log("📝 Creating new booking record...");
    const [newBooking] = await db.insert(bookings).values({
      userId: contract.userId,
      title: `Event for ${contract.clientName || 'Daniel Fulker'}`,
      clientName: contract.clientName || 'Daniel Fulker',
      venue: 'TBC',
      eventDate: new Date('2025-10-08'),
      eventTime: '21:40',
      status: 'new',
      responseNeeded: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    console.log(`✅ Created booking with ID: ${newBooking.id}`);
    
    // Link contract to booking
    console.log("🔗 Linking contract to booking...");
    await db.update(contracts)
      .set({ 
        enquiryId: newBooking.id,
        updatedAt: new Date()
      })
      .where(eq(contracts.id, 742));
    
    console.log("✅ Contract updated successfully!");
    
    // Verify the fix
    const [verifiedContract] = await db.select().from(contracts).where(eq(contracts.id, 742));
    const [verifiedBooking] = await db.select().from(bookings).where(eq(bookings.id, newBooking.id));
    
    console.log("\n🎉 FIX COMPLETE!");
    console.log("📊 Final state:");
    console.log(`  - Contract #742 enquiry_id: ${verifiedContract.enquiryId}`);
    console.log(`  - Booking #${verifiedBooking.id} created`);
    console.log("\n✨ The client portal should now save data correctly!");
    
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

fixClientPortal();