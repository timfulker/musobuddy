/**
 * Find ghost data - deleted records that still exist in the database
 */

import { db } from './server/db.ts';
import { sql } from 'drizzle-orm';

async function findGhostData() {
  try {
    console.log('👻 SEARCHING FOR GHOST DATA...');
    
    // Check for records with missing or invalid client information
    const ghostBookings = await db.execute(
      sql`SELECT id, client_name, client_email, event_date, event_time, venue, status, created_at 
          FROM bookings 
          WHERE client_name IS NULL 
          OR client_name = '' 
          OR client_name = 'Unknown'
          OR client_email IS NULL
          OR client_email = ''
          OR client_email = 'unknown@example.com'
          ORDER BY created_at DESC`
    );
    
    console.log(`\n📝 GHOST BOOKINGS (missing client info): ${ghostBookings.rows.length}`);
    if (ghostBookings.rows.length > 0) {
      ghostBookings.rows.forEach(row => {
        console.log(`   ID: ${row.id}, Client: "${row.client_name}", Email: "${row.client_email}", Date: ${row.event_date}, Status: ${row.status}`);
      });
    }
    
    // Check for records with missing venue or date
    const incompleteBookings = await db.execute(
      sql`SELECT id, client_name, client_email, event_date, event_time, venue, status, created_at 
          FROM bookings 
          WHERE venue IS NULL 
          OR venue = '' 
          OR venue = 'Unknown venue'
          OR event_date IS NULL
          ORDER BY created_at DESC`
    );
    
    console.log(`\n📝 INCOMPLETE BOOKINGS (missing venue/date): ${incompleteBookings.rows.length}`);
    if (incompleteBookings.rows.length > 0) {
      incompleteBookings.rows.forEach(row => {
        console.log(`   ID: ${row.id}, Client: "${row.client_name}", Venue: "${row.venue}", Date: ${row.event_date}, Status: ${row.status}`);
      });
    }
    
    // Check for duplicate bookings (same date/venue/time)
    const duplicateBookings = await db.execute(
      sql`SELECT event_date, event_time, venue, COUNT(*) as count, 
                 STRING_AGG(CAST(id AS TEXT), ', ') as ids,
                 STRING_AGG(client_name, ', ') as clients
          FROM bookings 
          WHERE event_date IS NOT NULL 
          AND venue IS NOT NULL 
          AND venue != ''
          GROUP BY event_date, event_time, venue 
          HAVING COUNT(*) > 1
          ORDER BY event_date DESC`
    );
    
    console.log(`\n📅 DUPLICATE BOOKINGS (same date/time/venue): ${duplicateBookings.rows.length}`);
    if (duplicateBookings.rows.length > 0) {
      duplicateBookings.rows.forEach(row => {
        console.log(`   Date: ${row.event_date}, Time: ${row.event_time}, Venue: "${row.venue}", Count: ${row.count}, IDs: [${row.ids}], Clients: [${row.clients}]`);
      });
    }
    
    // Check for very old bookings that might be causing conflicts
    const oldBookings = await db.execute(
      sql`SELECT id, client_name, event_date, event_time, venue, status, created_at 
          FROM bookings 
          WHERE created_at < '2025-01-01' 
          OR event_date < '2025-01-01'
          ORDER BY created_at ASC`
    );
    
    console.log(`\n🕰️ OLD BOOKINGS (before 2025): ${oldBookings.rows.length}`);
    if (oldBookings.rows.length > 0) {
      oldBookings.rows.forEach(row => {
        console.log(`   ID: ${row.id}, Client: "${row.client_name}", Event: ${row.event_date}, Created: ${row.created_at}, Status: ${row.status}`);
      });
    }
    
    // Check for bookings that might be calendar import artifacts
    const calendarImports = await db.execute(
      sql`SELECT id, client_name, event_date, event_time, venue, status, created_at, contract_id
          FROM bookings 
          WHERE contract_id IS NULL
          AND client_name IS NOT NULL
          AND client_name != ''
          ORDER BY created_at DESC`
    );
    
    console.log(`\n📥 CALENDAR IMPORT ARTIFACTS (no contract link): ${calendarImports.rows.length}`);
    if (calendarImports.rows.length > 0) {
      calendarImports.rows.forEach(row => {
        console.log(`   ID: ${row.id}, Client: "${row.client_name}", Date: ${row.event_date}, Time: ${row.event_time}, Venue: "${row.venue}", Status: ${row.status}`);
      });
    }
    
    // Check for potential ghost data causing conflicts
    const conflictingBookings = await db.execute(
      sql`SELECT b1.id as id1, b1.client_name as client1, b1.event_date, b1.event_time, b1.venue,
                 b2.id as id2, b2.client_name as client2, b2.status as status2
          FROM bookings b1
          JOIN bookings b2 ON DATE(b1.event_date) = DATE(b2.event_date) 
          WHERE b1.id != b2.id 
          AND b1.venue IS NOT NULL
          AND b2.venue IS NOT NULL
          ORDER BY b1.event_date DESC`
    );
    
    console.log(`\n⚠️ CONFLICTING BOOKINGS (same date): ${conflictingBookings.rows.length}`);
    if (conflictingBookings.rows.length > 0) {
      conflictingBookings.rows.forEach(row => {
        console.log(`   Conflict: ID ${row.id1} "${row.client1}" vs ID ${row.id2} "${row.client2}" on ${row.event_date} at ${row.venue}`);
      });
    }
    
    console.log('\n✅ Ghost data search completed');
    
  } catch (error) {
    console.error('❌ Error searching for ghost data:', error);
  }
}

findGhostData();