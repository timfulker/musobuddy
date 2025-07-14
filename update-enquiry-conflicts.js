/**
 * Update all existing enquiries with conflict detection
 */
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import { enquiries, bookings } from './shared/schema.ts';

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

async function detectConflicts(enquiryDate, enquiryTime, excludeId = null) {
  console.log(`🔍 Checking conflicts for ${enquiryDate} at ${enquiryTime}`);
  
  // Get all enquiries and bookings for the same date
  const existingEnquiries = await db
    .select()
    .from(enquiries)
    .where(eq(enquiries.eventDate, enquiryDate));
  
  const existingBookings = await db
    .select()
    .from(bookings)
    .where(eq(bookings.eventDate, enquiryDate));
  
  let conflicts = [];
  
  // Check enquiry conflicts
  for (const existingEnquiry of existingEnquiries) {
    if (excludeId && existingEnquiry.id === excludeId) continue;
    
    const conflict = {
      type: 'enquiry',
      id: existingEnquiry.id,
      clientName: existingEnquiry.clientName,
      eventTime: existingEnquiry.eventTime,
      status: existingEnquiry.status,
      venue: existingEnquiry.venue || 'Unknown venue'
    };
    
    conflicts.push(conflict);
  }
  
  // Check booking conflicts
  for (const booking of existingBookings) {
    const conflict = {
      type: 'booking',
      id: booking.id,
      clientName: booking.clientName || 'Unknown client',
      eventTime: booking.eventTime,
      status: 'confirmed',
      venue: booking.venue || 'Unknown venue'
    };
    
    conflicts.push(conflict);
  }
  
  console.log(`📊 Found ${conflicts.length} potential conflicts`);
  
  return {
    hasConflicts: conflicts.length > 0,
    conflictCount: conflicts.length,
    conflicts: conflicts
  };
}

async function updateEnquiryConflicts() {
  try {
    console.log('🚀 Starting conflict detection update for all enquiries...');
    
    // Get all enquiries
    const allEnquiries = await db.select().from(enquiries);
    console.log(`📋 Found ${allEnquiries.length} enquiries to process`);
    
    for (const enquiry of allEnquiries) {
      if (!enquiry.eventDate) {
        console.log(`⏭️  Skipping enquiry ${enquiry.id} - no event date`);
        continue;
      }
      
      console.log(`\n🔄 Processing enquiry ${enquiry.id} (${enquiry.clientName}) - ${enquiry.eventDate}`);
      
      const conflictResult = await detectConflicts(
        enquiry.eventDate,
        enquiry.eventTime,
        enquiry.id // Exclude self from conflict check
      );
      
      // Update enquiry with conflict information
      await db
        .update(enquiries)
        .set({
          hasConflicts: conflictResult.hasConflicts,
          conflictCount: conflictResult.conflictCount,
          conflictDetails: JSON.stringify(conflictResult.conflicts)
        })
        .where(eq(enquiries.id, enquiry.id));
      
      console.log(`✅ Updated enquiry ${enquiry.id}: ${conflictResult.hasConflicts ? 'HAS CONFLICTS' : 'NO CONFLICTS'} (${conflictResult.conflictCount} conflicts)`);
    }
    
    console.log('\n🎉 Conflict detection update completed successfully!');
    
    // Summary
    const updatedEnquiries = await db.select().from(enquiries);
    const withConflicts = updatedEnquiries.filter(e => e.hasConflicts);
    const withoutConflicts = updatedEnquiries.filter(e => !e.hasConflicts);
    
    console.log('\n📊 SUMMARY:');
    console.log(`   Total enquiries: ${updatedEnquiries.length}`);
    console.log(`   With conflicts: ${withConflicts.length}`);
    console.log(`   Without conflicts: ${withoutConflicts.length}`);
    
    if (withConflicts.length > 0) {
      console.log('\n⚠️  ENQUIRIES WITH CONFLICTS:');
      withConflicts.forEach(e => {
        console.log(`   - ${e.clientName} (${e.eventDate}) - ${e.conflictCount} conflicts`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error updating enquiry conflicts:', error);
  }
}

// Run the update
updateEnquiryConflicts();