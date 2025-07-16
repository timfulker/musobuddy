/**
 * Clean duplicate calendar bookings that may have been created during re-import
 */

import { neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { bookings } from './shared/schema.ts';
import { eq, and, sql } from 'drizzle-orm';

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function cleanDuplicateBookings() {
  console.log('🔍 Analyzing booking duplicates...');
  
  try {
    // First, let's see what we have
    const allBookings = await db
      .select()
      .from(bookings)
      .orderBy(bookings.eventDate, bookings.eventTime);
    
    console.log(`📊 Total bookings: ${allBookings.length}`);
    
    // Group by potential duplicate criteria
    const groupedByDateTime = {};
    
    allBookings.forEach(booking => {
      const key = `${booking.eventDate}_${booking.eventTime}_${booking.title}`;
      if (!groupedByDateTime[key]) {
        groupedByDateTime[key] = [];
      }
      groupedByDateTime[key].push(booking);
    });
    
    // Find duplicates
    const duplicates = Object.entries(groupedByDateTime)
      .filter(([key, bookings]) => bookings.length > 1);
    
    console.log(`🔍 Found ${duplicates.length} potential duplicate groups:`);
    
    let totalDuplicatesToRemove = 0;
    
    for (const [key, duplicateBookings] of duplicates) {
      console.log(`\n📅 ${key}:`);
      duplicateBookings.forEach((booking, index) => {
        console.log(`  ${index + 1}. ID: ${booking.id}, Title: ${booking.title}, Client: ${booking.clientName}`);
      });
      
      // Keep the first one, mark others for removal
      const toRemove = duplicateBookings.slice(1);
      totalDuplicatesToRemove += toRemove.length;
      
      // Remove duplicates
      for (const duplicate of toRemove) {
        console.log(`  ❌ Removing duplicate ID: ${duplicate.id}`);
        await db.delete(bookings).where(eq(bookings.id, duplicate.id));
      }
    }
    
    console.log(`\n✅ Cleaned up ${totalDuplicatesToRemove} duplicate bookings`);
    
    // Show final count
    const finalCount = await db
      .select({ count: sql`count(*)` })
      .from(bookings);
    
    console.log(`📊 Final booking count: ${finalCount[0].count}`);
    
  } catch (error) {
    console.error('❌ Error cleaning duplicates:', error);
  } finally {
    await pool.end();
  }
}

cleanDuplicateBookings();