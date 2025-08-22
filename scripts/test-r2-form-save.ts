import { db } from "../server/core/database";
import { bookings, contracts } from "../shared/schema";
import { eq } from "drizzle-orm";

async function testR2FormSave() {
  try {
    console.log("🧪 TESTING R2 COLLABORATIVE FORM SAVE\n");
    console.log("=".repeat(50) + "\n");
    
    // Get contract #852 to get the portal token
    const [contract] = await db.select().from(contracts).where(eq(contracts.id, 852));
    
    if (!contract || !contract.clientPortalToken) {
      console.error("❌ Contract #852 or portal token not found!");
      process.exit(1);
    }
    
    console.log("📋 Contract #852:");
    console.log(`  - Portal Token: ${contract.clientPortalToken.substring(0, 20)}...`);
    console.log(`  - Enquiry ID: ${contract.enquiryId}`);
    console.log(`  - Portal URL: ${contract.clientPortalUrl}\n`);
    
    // Simulate an R2 form save
    const testData = {
      token: contract.clientPortalToken,
      venueContact: "Test Venue Manager - 01234 567890",
      soundTechContact: "Test Sound Tech - 07777 888999",
      sharedNotes: "Test note from R2 form at " + new Date().toISOString(),
      dressCode: "Black Tie",
      loadInInfo: "Main entrance, parking available"
    };
    
    console.log("📤 Simulating R2 form save with test data...\n");
    
    // Make the API call
    const response = await fetch(`http://localhost:5000/api/collaborative-form/7594/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log("✅ API Response:", result);
      
      // Check if the booking was actually updated
      const [updatedBooking] = await db.select().from(bookings).where(eq(bookings.id, 7594));
      
      console.log("\n📅 Booking #7594 after update:");
      console.log(`  - Venue Contact: ${updatedBooking.venue_contact || 'Not set'}`);
      console.log(`  - Sound Tech Contact: ${updatedBooking.sound_tech_contact || 'Not set'}`);
      console.log(`  - Shared Notes: ${updatedBooking.shared_notes || 'Not set'}`);
      console.log(`  - Dress Code: ${updatedBooking.dress_code || 'Not set'}`);
      console.log(`  - Load In Info: ${updatedBooking.load_in_info || 'Not set'}`);
      
      if (updatedBooking.shared_notes?.includes("Test note from R2 form")) {
        console.log("\n🎉 SUCCESS! R2 form saves are working correctly!");
        console.log("The collaborative data is being saved to booking #7594");
      } else {
        console.log("\n⚠️ WARNING: Data may not have saved correctly");
      }
    } else {
      console.error("❌ API Error:", result);
    }
    
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

testR2FormSave();