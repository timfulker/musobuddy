/**
 * Debug current conflict status to understand why notifications appear
 */

import { db } from './server/db.js';
import { sql } from 'drizzle-orm';

async function debugCurrentConflicts() {
  try {
    console.log('🔍 DEBUGGING CURRENT CONFLICTS...');
    
    // Check enquiries with conflicts
    const enquiriesWithConflicts = await db.execute(
      sql`SELECT id, client_name, event_date, event_time, venue, has_conflicts, conflict_count, status 
          FROM enquiries 
          WHERE has_conflicts = true 
          ORDER BY event_date DESC`
    );
    
    console.log(`\n📝 ENQUIRIES WITH CONFLICTS: ${enquiriesWithConflicts.rows.length}`);
    if (enquiriesWithConflicts.rows.length > 0) {
      enquiriesWithConflicts.rows.forEach(row => {
        console.log(`   ID: ${row.id}, Client: ${row.client_name}, Date: ${row.event_date}, Time: ${row.event_time}, Venue: ${row.venue}, Conflicts: ${row.conflict_count}, Status: ${row.status}`);
      });
    }
    
    // Check for today's date conflicts
    const today = new Date().toISOString().split('T')[0];
    const todayConflicts = await db.execute(
      sql`SELECT id, client_name, event_date, event_time, venue, has_conflicts, conflict_count, status 
          FROM enquiries 
          WHERE event_date::text LIKE ${today + '%'} 
          ORDER BY event_time`
    );
    
    console.log(`\n📅 TODAY'S ENQUIRIES (${today}): ${todayConflicts.rows.length}`);
    if (todayConflicts.rows.length > 0) {
      todayConflicts.rows.forEach(row => {
        console.log(`   ID: ${row.id}, Client: ${row.client_name}, Time: ${row.event_time}, Venue: ${row.venue}, Conflicts: ${row.has_conflicts}, Status: ${row.status}`);
      });
    }
    
    // Check for upcoming conflicts (next 7 days)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekStr = nextWeek.toISOString().split('T')[0];
    
    const upcomingConflicts = await db.execute(
      sql`SELECT id, client_name, event_date, event_time, venue, has_conflicts, conflict_count, status 
          FROM enquiries 
          WHERE event_date >= ${today} 
          AND event_date <= ${nextWeekStr}
          AND has_conflicts = true
          ORDER BY event_date, event_time`
    );
    
    console.log(`\n⏰ UPCOMING CONFLICTS (next 7 days): ${upcomingConflicts.rows.length}`);
    if (upcomingConflicts.rows.length > 0) {
      upcomingConflicts.rows.forEach(row => {
        console.log(`   ID: ${row.id}, Client: ${row.client_name}, Date: ${row.event_date}, Time: ${row.event_time}, Venue: ${row.venue}, Conflicts: ${row.conflict_count}, Status: ${row.status}`);
      });
    }
    
    // Check for bookings on the same dates
    const conflictDates = upcomingConflicts.rows.map(row => row.event_date);
    if (conflictDates.length > 0) {
      console.log('\n🔍 CHECKING CORRESPONDING BOOKINGS...');
      for (const date of conflictDates) {
        const bookingsOnDate = await db.execute(
          sql`SELECT id, client_name, event_date, event_time, venue, status 
              FROM bookings 
              WHERE event_date::text LIKE ${date + '%'} 
              ORDER BY event_time`
        );
        
        if (bookingsOnDate.rows.length > 0) {
          console.log(`   📅 ${date}: ${bookingsOnDate.rows.length} bookings`);
          bookingsOnDate.rows.forEach(booking => {
            console.log(`      - Booking ID: ${booking.id}, Client: ${booking.client_name}, Time: ${booking.event_time}, Venue: ${booking.venue}, Status: ${booking.status}`);
          });
        }
      }
    }
    
    console.log('\n✅ Conflict debugging completed');
    
  } catch (error) {
    console.error('❌ Error debugging conflicts:', error);
  }
}

debugCurrentConflicts();