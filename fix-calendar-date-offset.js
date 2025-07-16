/**
 * Fix calendar date offset issue - shift all imported events back one day
 * This addresses the Google Calendar import issue where events are 1 day later than expected
 */

import { db } from './server/db.ts';
import { bookings } from './shared/schema.ts';
import { eq, isNotNull } from 'drizzle-orm';

async function fixCalendarDateOffset() {
  console.log('🔧 Starting calendar date offset fix...');
  
  try {
    // Get all bookings with event dates
    const allBookings = await db
      .select()
      .from(bookings)
      .where(isNotNull(bookings.eventDate));
    
    console.log(`📅 Found ${allBookings.length} bookings with event dates`);
    
    let updatedCount = 0;
    
    for (const booking of allBookings) {
      const currentDate = new Date(booking.eventDate);
      
      // Shift the date back by 1 day
      const correctedDate = new Date(currentDate);
      correctedDate.setDate(correctedDate.getDate() - 1);
      
      console.log(`📅 Booking ${booking.id}: ${booking.title}`);
      console.log(`   Before: ${currentDate.toISOString().split('T')[0]}`);
      console.log(`   After:  ${correctedDate.toISOString().split('T')[0]}`);
      
      // Update the booking with the corrected date
      await db
        .update(bookings)
        .set({
          eventDate: correctedDate,
          updatedAt: new Date()
        })
        .where(eq(bookings.id, booking.id));
      
      updatedCount++;
    }
    
    console.log(`✅ Successfully corrected ${updatedCount} event dates`);
    
    // Verify the changes
    const verificationSample = await db
      .select({
        id: bookings.id,
        title: bookings.title,
        eventDate: bookings.eventDate
      })
      .from(bookings)
      .where(isNotNull(bookings.eventDate))
      .limit(5);
    
    console.log('📋 Sample of corrected dates:');
    verificationSample.forEach(booking => {
      console.log(`   ${booking.id}: ${booking.title} - ${booking.eventDate?.toISOString().split('T')[0]}`);
    });
    
  } catch (error) {
    console.error('❌ Error fixing calendar date offset:', error);
    throw error;
  }
}

// Execute the fix
fixCalendarDateOffset()
  .then(() => {
    console.log('🎉 Calendar date offset fix completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Calendar date offset fix failed:', error);
    process.exit(1);
  });