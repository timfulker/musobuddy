/**
 * Clean calendar for fresh re-import
 * Removes all imported calendar entries while preserving manual bookings
 */

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function cleanCalendarForReimport() {
  try {
    console.log('🧹 Starting calendar cleanup for fresh import...');
    
    // Get count of imported entries
    const importedCount = await sql`
      SELECT COUNT(*) as count 
      FROM bookings 
      WHERE user_id = '43963086' 
      AND notes LIKE '%Imported from ics calendar%'
    `;
    
    console.log(`📊 Found ${importedCount[0].count} imported calendar entries`);
    
    if (importedCount[0].count === 0) {
      console.log('✅ No imported entries to clean');
      return;
    }
    
    // Delete only imported calendar entries
    const deleted = await sql`
      DELETE FROM bookings 
      WHERE user_id = '43963086' 
      AND notes LIKE '%Imported from ics calendar%'
    `;
    
    console.log(`🗑️ Deleted ${deleted.length} imported calendar entries`);
    
    // Verify cleanup
    const remaining = await sql`
      SELECT COUNT(*) as count 
      FROM bookings 
      WHERE user_id = '43963086'
    `;
    
    console.log(`✅ Cleanup complete. ${remaining[0].count} entries remaining (manual bookings preserved)`);
    console.log('🎯 Ready for fresh Google Calendar import with correct timezone handling');
    
  } catch (error) {
    console.error('❌ Error during calendar cleanup:', error);
  }
}

cleanCalendarForReimport();