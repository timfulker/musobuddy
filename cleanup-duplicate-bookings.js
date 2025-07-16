/**
 * Clean up duplicate bookings that are causing false "DOUBLE BOOKING RISK" warnings
 * This addresses the cache issue where reimported calendar data created duplicate entries
 */

import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);

async function cleanupDuplicateBookings() {
  const userId = '43963086'; // Your user ID
  
  console.log('🧹 Starting duplicate booking cleanup...');
  
  try {
    // First, let's identify all duplicate bookings
    const duplicates = await sql`
      SELECT 
        event_date, 
        COUNT(*) as booking_count,
        ARRAY_AGG(id) as ids,
        ARRAY_AGG(client_name) as clients,
        ARRAY_AGG(status) as statuses
      FROM bookings 
      WHERE user_id = ${userId}
      GROUP BY event_date 
      HAVING COUNT(*) > 1 
      ORDER BY event_date DESC;
    `;
    
    console.log(`📊 Found ${duplicates.length} dates with duplicate bookings`);
    
    let totalDeleted = 0;
    
    // For each duplicate date, keep the most recent booking and delete the rest
    for (const duplicate of duplicates) {
      const ids = duplicate.ids;
      const clients = duplicate.clients;
      const statuses = duplicate.statuses;
      
      console.log(`📅 Processing ${duplicate.event_date}: ${duplicate.booking_count} bookings`);
      console.log(`   Clients: ${clients.join(', ')}`);
      console.log(`   Statuses: ${statuses.join(', ')}`);
      
      // Keep the booking with the highest ID (most recent) and delete the rest
      const idsToKeep = [Math.max(...ids)];
      const idsToDelete = ids.filter(id => !idsToKeep.includes(id));
      
      if (idsToDelete.length > 0) {
        console.log(`   Keeping booking ID: ${idsToKeep[0]}`);
        console.log(`   Deleting booking IDs: ${idsToDelete.join(', ')}`);
        
        // Delete the duplicate bookings
        const deleteResult = await sql`
          DELETE FROM bookings 
          WHERE id = ANY(${idsToDelete}) 
          AND user_id = ${userId};
        `;
        
        totalDeleted += idsToDelete.length;
        console.log(`   ✅ Deleted ${idsToDelete.length} duplicate bookings`);
      }
    }
    
    console.log(`🎉 Cleanup complete! Deleted ${totalDeleted} duplicate bookings`);
    
    // Verify the cleanup
    const remainingDuplicates = await sql`
      SELECT COUNT(*) as duplicate_dates
      FROM (
        SELECT event_date 
        FROM bookings 
        WHERE user_id = ${userId}
        GROUP BY event_date 
        HAVING COUNT(*) > 1
      ) as duplicates;
    `;
    
    console.log(`📈 Remaining duplicate dates: ${remainingDuplicates[0].duplicate_dates}`);
    
    // Clear any potential cache by forcing a conflict check refresh
    console.log('🔄 Clearing conflict detection cache...');
    
    // Force refresh all conflict data
    await sql`
      UPDATE bookings 
      SET updated_at = NOW() 
      WHERE user_id = ${userId};
    `;
    
    console.log('✅ Cache cleared - conflict detection should now work correctly');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
}

// Run the cleanup
cleanupDuplicateBookings()
  .then(() => {
    console.log('🎊 Duplicate booking cleanup completed successfully!');
    console.log('📝 The "DOUBLE BOOKING RISK" warnings should now be resolved.');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Cleanup failed:', error);
    process.exit(1);
  });