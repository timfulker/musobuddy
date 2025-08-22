import { db } from "../server/core/database";
import { bookings, contracts } from "../shared/schema";
import { eq, or, and } from "drizzle-orm";

async function auditPortalAlignment() {
  try {
    console.log("🔍 AUDITING CLIENT PORTAL DATA ALIGNMENT\n");
    console.log("=".repeat(50) + "\n");
    
    // 1. Check Contract #852
    console.log("📋 CONTRACT #852 ANALYSIS:");
    console.log("-".repeat(30));
    const [contract852] = await db.select().from(contracts).where(eq(contracts.id, 852));
    
    if (contract852) {
      console.log(`  ID: ${contract852.id}`);
      console.log(`  Client Name: ${contract852.clientName}`);
      console.log(`  Contract Number: ${contract852.contractNumber}`);
      console.log(`  Enquiry ID (→ Booking): ${contract852.enquiryId || 'NULL ❌'}`);
      console.log(`  Portal Token: ${contract852.clientPortalToken ? '✅ Present' : 'NULL ❌'}`);
      console.log(`  Portal URL: ${contract852.clientPortalUrl || 'NULL ❌'}`);
      console.log(`  User ID: ${contract852.userId}`);
      console.log(`  Status: ${contract852.status}`);
    } else {
      console.log("  ❌ Contract #852 NOT FOUND!");
    }
    
    // 2. Check Booking #7594
    console.log("\n📅 BOOKING #7594 ANALYSIS:");
    console.log("-".repeat(30));
    const [booking7594] = await db.select().from(bookings).where(eq(bookings.id, 7594));
    
    if (booking7594) {
      console.log(`  ID: ${booking7594.id}`);
      console.log(`  Client Name: ${booking7594.clientName}`);
      console.log(`  User ID: ${booking7594.userId}`);
      console.log(`  Venue: ${booking7594.venue || 'TBC'}`);
      console.log(`  Event Date: ${booking7594.eventDate}`);
      console.log(`  Status: ${booking7594.status}`);
      
      // Check if any collaborative fields are filled
      const hasCollaborativeData = booking7594.venueContact || 
                                   booking7594.soundTechContact || 
                                   booking7594.sharedNotes ||
                                   booking7594.dressCode ||
                                   booking7594.loadInInfo;
      console.log(`  Collaborative Data: ${hasCollaborativeData ? '✅ Has data' : '⚠️ Empty'}`);
    } else {
      console.log("  ❌ Booking #7594 NOT FOUND!");
    }
    
    // 3. Check for ALL contracts for Peter Jones
    console.log("\n🔎 ALL CONTRACTS FOR 'Peter Jones':");
    console.log("-".repeat(30));
    const peterContracts = await db.select()
      .from(contracts)
      .where(eq(contracts.clientName, 'Peter Jones'));
    
    if (peterContracts.length > 0) {
      peterContracts.forEach(c => {
        console.log(`  Contract #${c.id}:`);
        console.log(`    - Contract Number: ${c.contractNumber}`);
        console.log(`    - Enquiry ID: ${c.enquiryId || 'NULL'}`);
        console.log(`    - Portal Token: ${c.clientPortalToken ? 'Present' : 'NULL'}`);
        console.log(`    - Portal URL: ${c.clientPortalUrl || 'NULL'}`);
        console.log(`    - Status: ${c.status}`);
      });
    } else {
      console.log("  No contracts found for Peter Jones");
    }
    
    // 4. Check for ALL bookings for Peter Jones
    console.log("\n🔎 ALL BOOKINGS FOR 'Peter Jones':");
    console.log("-".repeat(30));
    const peterBookings = await db.select()
      .from(bookings)
      .where(eq(bookings.clientName, 'Peter Jones'));
    
    if (peterBookings.length > 0) {
      peterBookings.forEach(b => {
        console.log(`  Booking #${b.id}:`);
        console.log(`    - Venue: ${b.venue || 'TBC'}`);
        console.log(`    - Event Date: ${b.eventDate}`);
        console.log(`    - Status: ${b.status}`);
        console.log(`    - User ID: ${b.userId}`);
      });
    } else {
      console.log("  No bookings found for Peter Jones");
    }
    
    // 5. Cross-reference: Find contracts pointing to booking 7594
    console.log("\n🔗 CONTRACTS LINKED TO BOOKING #7594:");
    console.log("-".repeat(30));
    const contractsLinkedTo7594 = await db.select()
      .from(contracts)
      .where(eq(contracts.enquiryId, 7594));
    
    if (contractsLinkedTo7594.length > 0) {
      contractsLinkedTo7594.forEach(c => {
        console.log(`  Contract #${c.id} (${c.clientName}) → Booking #7594`);
      });
    } else {
      console.log("  ⚠️ No contracts linked to booking #7594");
    }
    
    // 6. Data Flow Validation
    console.log("\n✅ DATA FLOW VALIDATION:");
    console.log("-".repeat(30));
    
    if (contract852 && booking7594) {
      const namesMatch = contract852.clientName === booking7594.clientName;
      const idsLinked = contract852.enquiryId === 7594;
      const userIdsMatch = contract852.userId === booking7594.userId;
      
      console.log(`  Names Match: ${namesMatch ? '✅' : '❌'} (Contract: "${contract852.clientName}" vs Booking: "${booking7594.clientName}")`);
      console.log(`  IDs Linked: ${idsLinked ? '✅' : '❌'} (Contract.enquiryId=${contract852.enquiryId} → Booking.id=7594)`);
      console.log(`  User IDs Match: ${userIdsMatch ? '✅' : '❌'} (Contract: ${contract852.userId} vs Booking: ${booking7594.userId})`);
      console.log(`  Portal Token: ${contract852.clientPortalToken ? '✅ Present' : '⚠️ Missing - Portal wont work!'}`);
      console.log(`  Portal URL: ${contract852.clientPortalUrl ? '✅ Present' : '⚠️ Missing - No portal link!'}`);
      
      if (!contract852.clientPortalToken || !contract852.clientPortalUrl) {
        console.log("\n  ⚠️ WARNING: Client portal token or URL is missing!");
        console.log("  → Client wont be able to access the portal");
        console.log("  → Need to regenerate the client portal for this contract");
      }
    }
    
    console.log("\n" + "=".repeat(50));
    console.log("🎯 SUMMARY:");
    console.log("-".repeat(30));
    
    // Provide actionable summary
    if (contract852 && booking7594) {
      if (contract852.enquiryId === 7594 && 
          contract852.clientName === booking7594.clientName &&
          contract852.clientPortalToken && 
          contract852.clientPortalUrl) {
        console.log("✅ Everything is properly aligned!");
        console.log("   Contract #852 → Booking #7594 → Client Portal");
      } else {
        console.log("⚠️ Issues found:");
        if (contract852.enquiryId !== 7594) {
          console.log("   - Contract not linked to correct booking");
        }
        if (contract852.clientName !== booking7594.clientName) {
          console.log("   - Name mismatch between contract and booking");
        }
        if (!contract852.clientPortalToken || !contract852.clientPortalUrl) {
          console.log("   - Client portal not generated for this contract");
          console.log("\n📌 ACTION NEEDED: Generate client portal for contract #852");
        }
      }
    }
    
  } catch (error) {
    console.error("❌ Error during audit:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

auditPortalAlignment();