/**
 * Test calendar re-import with timezone fix
 * This will clear existing imported data and re-import to test the fix
 */

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function testCalendarReimport() {
  console.log('🔧 Starting calendar re-import test...');
  
  try {
    // Clear existing imported bookings
    const deleteResult = await sql`
      DELETE FROM bookings 
      WHERE user_id = '43963086' 
      AND notes LIKE '%Imported from%'
    `;
    
    console.log(`🗑️ Cleared ${deleteResult.length} existing imported bookings`);
    
    // Verify the specific July bookings are gone
    const remainingBookings = await sql`
      SELECT client_name, event_date, venue
      FROM bookings 
      WHERE user_id = '43963086' 
      AND event_date >= '2025-07-17' 
      AND event_date <= '2025-07-20'
      ORDER BY event_date
    `;
    
    console.log(`📅 Remaining bookings in July 17-20 range: ${remainingBookings.length}`);
    
    console.log('✅ Ready for re-import test');
    console.log('👉 Now go to the calendar page and re-import your Google Calendar file');
    console.log('🔍 The July 18 "Solo" booking should appear on July 18 (not July 19)');
    
  } catch (error) {
    console.error('❌ Error during re-import preparation:', error);
  }
}

testCalendarReimport();