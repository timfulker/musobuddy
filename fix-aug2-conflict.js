/**
 * Fix August 2, 2025 conflict detection - proper date handling
 */
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';
import { enquiries, bookings } from './shared/schema.ts';

const client = neon(process.env.DATABASE_URL);
const db = drizzle(client);

async function fixAug2Conflict() {
  try {
    console.log('🔍 Fixing August 2, 2025 conflict detection...');
    
    // Get all data for August 2, 2025 using SQL LIKE pattern
    const aug2EnquiriesQuery = await db.execute(
      sql`SELECT * FROM enquiries WHERE event_date::text LIKE '%2025-08-02%'`
    );
    
    const aug2BookingsQuery = await db.execute(
      sql`SELECT * FROM bookings WHERE event_date::text LIKE '%2025-08-02%'`
    );
    
    console.log('\n📝 ENQUIRIES ON AUG 2:');
    aug2EnquiriesQuery.rows.forEach(row => {
      console.log(`   ID: ${row.id}, Client: ${row.client_name}, Date: ${row.event_date}, Conflicts: ${row.has_conflicts}`);
    });
    
    console.log('\n📅 BOOKINGS ON AUG 2:');
    aug2BookingsQuery.rows.forEach(row => {
      console.log(`   ID: ${row.id}, Client: ${row.client_name}, Date: ${row.event_date}, Time: ${row.event_time}`);
    });
    
    // Now fix the conflict detection for enquiry 402 (tim)
    if (aug2EnquiriesQuery.rows.length > 0 && aug2BookingsQuery.rows.length > 0) {
      console.log('\n🔧 FIXING CONFLICT DETECTION...');
      
      // Find the enquiry that should have conflicts
      const enquiryToFix = aug2EnquiriesQuery.rows.find(row => row.client_name === 'tim');
      if (enquiryToFix) {
        console.log(`   Found enquiry to fix: ${enquiryToFix.id} (${enquiryToFix.client_name})`);
        
        // Count conflicts manually
        const conflictCount = aug2BookingsQuery.rows.length + (aug2EnquiriesQuery.rows.length - 1);
        const conflicts = [
          ...aug2BookingsQuery.rows.map(b => ({
            type: 'booking',
            id: b.id,
            clientName: b.client_name || 'Unknown client',
            eventTime: b.event_time,
            status: 'confirmed',
            venue: b.venue || 'Unknown venue'
          })),
          ...aug2EnquiriesQuery.rows
            .filter(e => e.id !== enquiryToFix.id)
            .map(e => ({
              type: 'enquiry',
              id: e.id,
              clientName: e.client_name,
              eventTime: e.event_time,
              status: e.status,
              venue: e.venue || 'Unknown venue'
            }))
        ];
        
        console.log(`   Updating with ${conflictCount} conflicts`);
        
        // Update the enquiry with conflict information
        await db.execute(
          sql`UPDATE enquiries 
              SET has_conflicts = true, 
                  conflict_count = ${conflictCount}, 
                  conflict_details = ${JSON.stringify(conflicts)}
              WHERE id = ${enquiryToFix.id}`
        );
        
        console.log(`   ✅ Updated enquiry ${enquiryToFix.id} with conflict information`);
      }
    }
    
    console.log('\n✅ Fix completed!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixAug2Conflict();