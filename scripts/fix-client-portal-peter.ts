import { db } from "../server/core/database";
import { bookings, contracts } from "../shared/schema";
import { eq } from "drizzle-orm";

async function fixClientPortalForPeter() {
  try {
    console.log("🔧 Fixing client portal for Peter Jones...\n");
    
    // Check current state of contract 852
    const [contract] = await db.select().from(contracts).where(eq(contracts.id, 852));
    
    if (!contract) {
      console.error("❌ Contract #852 not found!");
      process.exit(1);
    }
    
    console.log("📋 Current contract state:");
    console.log(`  - Contract ID: ${contract.id}`);
    console.log(`  - Client: ${contract.clientName}`);
    console.log(`  - Current Enquiry ID: ${contract.enquiryId || 'NULL (no booking linked)'}`);
    
    // Check if booking 7594 exists
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, 7594));
    
    if (!booking) {
      console.error("❌ Booking #7594 not found!");
      process.exit(1);
    }
    
    console.log("\n📋 Found booking #7594:");
    console.log(`  - Client: ${booking.clientName}`);
    console.log(`  - Venue: ${booking.venue || 'TBC'}`);
    
    // Link contract 852 to booking 7594
    console.log("\n🔗 Linking contract #852 to booking #7594...");
    await db.update(contracts)
      .set({ 
        enquiryId: 7594,
        updatedAt: new Date()
      })
      .where(eq(contracts.id, 852));
    
    console.log("✅ Contract updated successfully!");
    
    // Verify the fix
    const [verifiedContract] = await db.select().from(contracts).where(eq(contracts.id, 852));
    
    console.log("\n🎉 FIX COMPLETE!");
    console.log("📊 Final state:");
    console.log(`  - Contract #852 (${verifiedContract.clientName}) now linked to booking #7594`);
    console.log(`  - Contract enquiry_id: ${verifiedContract.enquiryId}`);
    console.log("\n✨ Peter Jones's client portal should now save data correctly to booking #7594!");
    
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

fixClientPortalForPeter();