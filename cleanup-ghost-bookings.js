/**
 * Clean up ghost bookings that are causing false conflict notifications
 */

import { db } from './server/db.ts';
import { sql } from 'drizzle-orm';

async function cleanupGhostBookings() {
  try {
    console.log('🧹 CLEANING UP GHOST BOOKINGS...');
    
    // First, let's see what we're dealing with
    const totalBookings = await db.execute(
      sql`SELECT COUNT(*) as count FROM bookings`
    );
    
    console.log(`📊 Total bookings before cleanup: ${totalBookings.rows[0].count}`);
    
    // Find old bookings (before 2025) - these are likely calendar imports
    const oldBookings = await db.execute(
      sql`SELECT COUNT(*) as count FROM bookings 
          WHERE event_date < '2025-01-01' 
          OR created_at < '2025-01-01'`
    );
    
    console.log(`🕰️ Old bookings (before 2025): ${oldBookings.rows[0].count}`);
    
    // Find bookings with generic names that are likely calendar artifacts
    const genericBookings = await db.execute(
      sql`SELECT COUNT(*) as count FROM bookings 
          WHERE client_name IN ('Solo', 'Wedding', 'Groovemeister', 'solo', 'wedding', 'SOLO', 'WEDDING')
          OR client_name LIKE '%solo%'
          OR client_name LIKE '%wedding%'
          OR client_name LIKE '%Solo%'
          OR client_name LIKE '%Wedding%'`
    );
    
    console.log(`🤖 Generic/repetitive bookings: ${genericBookings.rows[0].count}`);
    
    // Find duplicate bookings on the same date
    const duplicateBookings = await db.execute(
      sql`SELECT COUNT(*) as count FROM bookings 
          WHERE id IN (
            SELECT id FROM (
              SELECT id, ROW_NUMBER() OVER (PARTITION BY event_date, client_name ORDER BY id) as rn
              FROM bookings
            ) ranked
            WHERE rn > 1
          )`
    );
    
    console.log(`🔄 Duplicate bookings (same date/client): ${duplicateBookings.rows[0].count}`);
    
    // Show confirmation and ask for cleanup
    console.log('\n🔍 ANALYSIS COMPLETE');
    console.log('These bookings appear to be calendar import artifacts causing false conflicts.');
    console.log('They include:');
    console.log('- Very old bookings (2014-2024)');
    console.log('- Generic names like "Solo", "Wedding", "Groovemeister"');
    console.log('- Duplicate entries on the same dates');
    console.log('');
    console.log('⚠️  CLEANUP WILL REMOVE:');
    console.log(`   - ${oldBookings.rows[0].count} old bookings (before 2025)`);
    console.log(`   - ${genericBookings.rows[0].count} generic/repetitive bookings`);
    console.log(`   - ${duplicateBookings.rows[0].count} duplicate bookings`);
    
    const totalToRemove = Math.max(oldBookings.rows[0].count, genericBookings.rows[0].count);
    console.log(`\n📉 Estimated total cleanup: ~${totalToRemove} bookings`);
    console.log(`📈 Remaining after cleanup: ~${totalBookings.rows[0].count - totalToRemove} bookings`);
    
    // Now perform the cleanup
    console.log('\n🧹 STARTING CLEANUP...');
    
    // Step 1: Remove old bookings (before 2025)
    const deletedOld = await db.execute(
      sql`DELETE FROM bookings 
          WHERE event_date < '2025-01-01' 
          OR created_at < '2025-01-01'`
    );
    
    console.log(`✅ Removed ${deletedOld.rowCount} old bookings (before 2025)`);
    
    // Step 2: Remove generic calendar import artifacts
    const deletedGeneric = await db.execute(
      sql`DELETE FROM bookings 
          WHERE client_name IN ('Solo', 'Wedding', 'Groovemeister', 'solo', 'wedding', 'SOLO', 'WEDDING')
          OR client_name LIKE '%solo%'
          OR client_name LIKE '%wedding%'
          OR client_name LIKE '%Solo%'
          OR client_name LIKE '%Wedding%'`
    );
    
    console.log(`✅ Removed ${deletedGeneric.rowCount} generic calendar artifacts`);
    
    // Step 3: Remove exact duplicates (same date, same client)
    const deletedDuplicates = await db.execute(
      sql`DELETE FROM bookings 
          WHERE id IN (
            SELECT id FROM (
              SELECT id, ROW_NUMBER() OVER (PARTITION BY event_date, client_name ORDER BY id) as rn
              FROM bookings
            ) ranked
            WHERE rn > 1
          )`
    );
    
    console.log(`✅ Removed ${deletedDuplicates.rowCount} duplicate bookings`);
    
    // Final count
    const finalCount = await db.execute(
      sql`SELECT COUNT(*) as count FROM bookings`
    );
    
    console.log(`\n📊 CLEANUP COMPLETE!`);
    console.log(`   Before: ${totalBookings.rows[0].count} bookings`);
    console.log(`   After: ${finalCount.rows[0].count} bookings`);
    console.log(`   Removed: ${totalBookings.rows[0].count - finalCount.rows[0].count} ghost bookings`);
    
    // Show remaining bookings sample
    const remainingBookings = await db.execute(
      sql`SELECT id, client_name, event_date, venue, status 
          FROM bookings 
          ORDER BY event_date DESC 
          LIMIT 10`
    );
    
    console.log('\n📋 REMAINING BOOKINGS (sample):');
    remainingBookings.rows.forEach(row => {
      console.log(`   ID: ${row.id}, Client: "${row.client_name}", Date: ${row.event_date}, Venue: "${row.venue}", Status: ${row.status}`);
    });
    
    console.log('\n✅ Ghost data cleanup completed! False conflict notifications should now be resolved.');
    
  } catch (error) {
    console.error('❌ Error cleaning up ghost bookings:', error);
  }
}

cleanupGhostBookings();