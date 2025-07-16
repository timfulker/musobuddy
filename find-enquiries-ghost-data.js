/**
 * Find ghost data in the enquiries table that might be causing conflicts
 */

import { db } from './server/db.ts';
import { sql } from 'drizzle-orm';

async function findEnquiriesGhostData() {
  try {
    console.log('👻 SEARCHING FOR GHOST DATA IN ENQUIRIES TABLE...');
    
    // Check if enquiries table exists and has data
    const enquiriesCount = await db.execute(
      sql`SELECT COUNT(*) as count FROM enquiries`
    );
    
    console.log(`\n📊 TOTAL ENQUIRIES: ${enquiriesCount.rows[0].count}`);
    
    // Check for ghost enquiries with missing client info
    const ghostEnquiries = await db.execute(
      sql`SELECT id, client_name, client_email, event_date, event_time, venue, status, has_conflicts, conflict_count, created_at 
          FROM enquiries 
          WHERE client_name IS NULL 
          OR client_name = '' 
          OR client_name = 'Unknown'
          OR client_email IS NULL
          OR client_email = ''
          OR client_email = 'unknown@example.com'
          ORDER BY created_at DESC`
    );
    
    console.log(`\n📝 GHOST ENQUIRIES (missing client info): ${ghostEnquiries.rows.length}`);
    if (ghostEnquiries.rows.length > 0) {
      ghostEnquiries.rows.forEach(row => {
        console.log(`   ID: ${row.id}, Client: "${row.client_name}", Email: "${row.client_email}", Date: ${row.event_date}, Conflicts: ${row.has_conflicts}`);
      });
    }
    
    // Check for enquiries with conflicts flagged
    const enquiriesWithConflicts = await db.execute(
      sql`SELECT id, client_name, client_email, event_date, event_time, venue, status, has_conflicts, conflict_count, created_at 
          FROM enquiries 
          WHERE has_conflicts = true
          ORDER BY event_date DESC`
    );
    
    console.log(`\n⚠️ ENQUIRIES WITH CONFLICTS FLAGGED: ${enquiriesWithConflicts.rows.length}`);
    if (enquiriesWithConflicts.rows.length > 0) {
      enquiriesWithConflicts.rows.forEach(row => {
        console.log(`   ID: ${row.id}, Client: "${row.client_name}", Date: ${row.event_date}, Time: ${row.event_time}, Venue: "${row.venue}", Conflicts: ${row.conflict_count}, Status: ${row.status}`);
      });
    }
    
    // Check for old enquiries that should have been deleted
    const oldEnquiries = await db.execute(
      sql`SELECT id, client_name, event_date, event_time, venue, status, has_conflicts, conflict_count, created_at 
          FROM enquiries 
          WHERE created_at < '2025-01-01' 
          OR event_date < '2025-01-01'
          ORDER BY created_at ASC`
    );
    
    console.log(`\n🕰️ OLD ENQUIRIES (before 2025): ${oldEnquiries.rows.length}`);
    if (oldEnquiries.rows.length > 0) {
      oldEnquiries.rows.forEach(row => {
        console.log(`   ID: ${row.id}, Client: "${row.client_name}", Event: ${row.event_date}, Created: ${row.created_at}, Status: ${row.status}, Conflicts: ${row.has_conflicts}`);
      });
    }
    
    // Check for enquiries that might be duplicates of bookings
    const duplicateEnquiries = await db.execute(
      sql`SELECT e.id as enquiry_id, e.client_name as enquiry_client, e.event_date as enquiry_date, e.venue as enquiry_venue,
                 b.id as booking_id, b.client_name as booking_client, b.event_date as booking_date, b.venue as booking_venue
          FROM enquiries e
          JOIN bookings b ON DATE(e.event_date) = DATE(b.event_date)
          WHERE e.client_name IS NOT NULL 
          AND b.client_name IS NOT NULL
          AND e.venue IS NOT NULL
          AND b.venue IS NOT NULL
          ORDER BY e.event_date DESC`
    );
    
    console.log(`\n🔄 ENQUIRIES DUPLICATING BOOKINGS (same date): ${duplicateEnquiries.rows.length}`);
    if (duplicateEnquiries.rows.length > 0) {
      duplicateEnquiries.rows.forEach(row => {
        console.log(`   Enquiry ID: ${row.enquiry_id} "${row.enquiry_client}" vs Booking ID: ${row.booking_id} "${row.booking_client}" on ${row.enquiry_date}`);
      });
    }
    
    // Check for enquiries with missing venue or date
    const incompleteEnquiries = await db.execute(
      sql`SELECT id, client_name, client_email, event_date, event_time, venue, status, has_conflicts, conflict_count, created_at 
          FROM enquiries 
          WHERE venue IS NULL 
          OR venue = '' 
          OR venue = 'Unknown venue'
          OR event_date IS NULL
          ORDER BY created_at DESC`
    );
    
    console.log(`\n📝 INCOMPLETE ENQUIRIES (missing venue/date): ${incompleteEnquiries.rows.length}`);
    if (incompleteEnquiries.rows.length > 0) {
      incompleteEnquiries.rows.forEach(row => {
        console.log(`   ID: ${row.id}, Client: "${row.client_name}", Venue: "${row.venue}", Date: ${row.event_date}, Conflicts: ${row.has_conflicts}`);
      });
    }
    
    // Check for enquiries that might be calendar import artifacts in wrong table
    const calendarImportEnquiries = await db.execute(
      sql`SELECT id, client_name, event_date, event_time, venue, status, created_at, estimated_value, gig_type, has_conflicts
          FROM enquiries 
          WHERE (estimated_value IS NULL OR estimated_value = '')
          AND (gig_type IS NULL OR gig_type = '')
          AND client_name IS NOT NULL
          AND client_name != ''
          ORDER BY created_at DESC`
    );
    
    console.log(`\n📥 CALENDAR IMPORT ARTIFACTS IN ENQUIRIES: ${calendarImportEnquiries.rows.length}`);
    if (calendarImportEnquiries.rows.length > 0) {
      calendarImportEnquiries.rows.forEach(row => {
        console.log(`   ID: ${row.id}, Client: "${row.client_name}", Date: ${row.event_date}, Time: ${row.event_time}, Venue: "${row.venue}", Conflicts: ${row.has_conflicts}`);
      });
    }
    
    console.log('\n✅ Enquiries ghost data search completed');
    
  } catch (error) {
    console.error('❌ Error searching for ghost data in enquiries:', error);
  }
}

findEnquiriesGhostData();