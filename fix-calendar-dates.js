/**
 * Fix calendar dates - resolve timezone offset issues from Google Calendar import
 * 
 * ISSUE: Calendar import stored dates with timezone conversion causing
 * events to appear 1 day later than expected in calendar view
 * 
 * SOLUTION: Recalculate all imported booking dates to use local timezone
 * without UTC offset that causes display issues
 */

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function fixCalendarDates() {
  console.log('🔧 Starting calendar date fix...');
  
  try {
    // Get all bookings that were imported from calendar (have "Imported from" in notes)
    const importedBookings = await sql`
      SELECT id, client_name, event_date, venue, notes, created_at
      FROM bookings 
      WHERE user_id = '43963086' 
      AND notes LIKE '%Imported from%'
      ORDER BY event_date
    `;
    
    console.log(`📅 Found ${importedBookings.length} imported calendar bookings`);
    
    let fixed = 0;
    
    for (const booking of importedBookings) {
      // Get the current date
      const currentDate = new Date(booking.event_date);
      
      // Create a local date without timezone conversion
      // This ensures the date displays correctly in the calendar
      const localDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(), 
        currentDate.getDate(),
        currentDate.getHours(),
        currentDate.getMinutes(),
        currentDate.getSeconds()
      );
      
      // Only update if the date is different (has timezone offset)
      if (currentDate.getTime() !== localDate.getTime()) {
        await sql`
          UPDATE bookings 
          SET event_date = ${localDate}
          WHERE id = ${booking.id}
        `;
        
        console.log(`✅ Fixed: ${booking.client_name} - ${booking.event_date} → ${localDate.toISOString()}`);
        fixed++;
      }
    }
    
    console.log(`🎉 Fixed ${fixed} calendar dates`);
    
    // Verify the fix by checking the July 18-19 bookings
    const julyBookings = await sql`
      SELECT client_name, event_date, venue
      FROM bookings 
      WHERE user_id = '43963086' 
      AND event_date >= '2025-07-17' 
      AND event_date <= '2025-07-20'
      ORDER BY event_date
    `;
    
    console.log('\n📋 July 18-19 bookings after fix:');
    julyBookings.forEach(booking => {
      console.log(`  - ${booking.client_name}: ${booking.event_date} at ${booking.venue}`);
    });
    
  } catch (error) {
    console.error('❌ Error fixing calendar dates:', error);
  }
}

// Run the fix
fixCalendarDates();