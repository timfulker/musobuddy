/**
 * Debug August 2, 2025 conflict detection issue
 */
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import { enquiries, bookings } from './shared/schema.ts';

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

async function debugAug2Conflict() {
  try {
    console.log('🔍 Debugging August 2, 2025 conflict detection...');
    
    // Try different date formats
    const dateStrings = [
      '2025-08-02',
      'Sat Aug 02 2025 00:00:00 GMT+0000 (Coordinated Universal Time)',
      new Date('2025-08-02').toISOString(),
      new Date('2025-08-02')
    ];
    
    for (const dateStr of dateStrings) {
      console.log(`\n📅 Checking date format: ${dateStr}`);
      
      const aug2Enquiries = await db.select().from(enquiries).where(eq(enquiries.eventDate, dateStr));
      const aug2Bookings = await db.select().from(bookings).where(eq(bookings.eventDate, dateStr));
      
      console.log(`   Enquiries found: ${aug2Enquiries.length}`);
      console.log(`   Bookings found: ${aug2Bookings.length}`);
      
      aug2Enquiries.forEach(e => {
        console.log(`   📝 Enquiry ${e.id}: ${e.clientName} (${e.eventDate}) - Conflicts: ${e.hasConflicts}`);
      });
      
      aug2Bookings.forEach(b => {
        console.log(`   📅 Booking ${b.id}: ${b.clientName} (${b.eventDate}) - Time: ${b.eventTime}`);
      });
    }
    
    // Get ALL enquiries and bookings to see what's in the database
    console.log('\n🔍 ALL ENQUIRIES WITH DATES:');
    const allEnquiries = await db.select().from(enquiries);
    allEnquiries.forEach(e => {
      if (e.eventDate) {
        const dateStr = e.eventDate.toString();
        if (dateStr.includes('Aug') || dateStr.includes('2025-08')) {
          console.log(`   ${e.id}: ${e.clientName} - ${e.eventDate} (${typeof e.eventDate})`);
        }
      }
    });
    
    console.log('\n🔍 ALL BOOKINGS WITH DATES:');
    const allBookings = await db.select().from(bookings);
    allBookings.forEach(b => {
      if (b.eventDate) {
        const dateStr = b.eventDate.toString();
        if (dateStr.includes('Aug') || dateStr.includes('2025-08')) {
          console.log(`   ${b.id}: ${b.clientName} - ${b.eventDate} (${typeof b.eventDate})`);
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugAug2Conflict();