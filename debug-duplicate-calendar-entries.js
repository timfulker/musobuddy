/**
 * Debug and clean up duplicate calendar entries
 * This investigates the calendar import issue that may have caused duplicate conflicts
 */

import { neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import * as schema from './shared/schema.js';
import { eq, and } from 'drizzle-orm';

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });

async function debugDuplicateCalendarEntries() {
  console.log('🔍 Investigating duplicate calendar entries...');
  
  try {
    // Get all bookings grouped by date and time to find duplicates
    const allBookings = await db
      .select()
      .from(schema.bookings)
      .orderBy(schema.bookings.eventDate, schema.bookings.eventTime);
    
    console.log(`📊 Total bookings found: ${allBookings.length}`);
    
    // Group by date and time to find duplicates
    const duplicateGroups = {};
    
    allBookings.forEach(booking => {
      const key = `${booking.eventDate}_${booking.eventTime}`;
      if (!duplicateGroups[key]) {
        duplicateGroups[key] = [];
      }
      duplicateGroups[key].push(booking);
    });
    
    // Find groups with multiple entries
    const duplicates = Object.entries(duplicateGroups)
      .filter(([key, bookings]) => bookings.length > 1)
      .map(([key, bookings]) => ({ key, bookings }));
    
    console.log(`🔍 Found ${duplicates.length} duplicate date/time combinations:`);
    
    duplicates.forEach(({ key, bookings }) => {
      console.log(`\n📅 ${key}:`);
      bookings.forEach(booking => {
        console.log(`  - ID: ${booking.id}, Title: ${booking.title}, Client: ${booking.clientName}`);
      });
    });
    
    // Also check for similar titles on the same date
    const titleDuplicates = {};
    allBookings.forEach(booking => {
      const titleKey = `${booking.eventDate}_${booking.title}`;
      if (!titleDuplicates[titleKey]) {
        titleDuplicates[titleKey] = [];
      }
      titleDuplicates[titleKey].push(booking);
    });
    
    const titleDups = Object.entries(titleDuplicates)
      .filter(([key, bookings]) => bookings.length > 1)
      .map(([key, bookings]) => ({ key, bookings }));
    
    console.log(`\n📝 Found ${titleDups.length} duplicate title combinations:`);
    titleDups.forEach(({ key, bookings }) => {
      console.log(`\n📋 ${key}:`);
      bookings.forEach(booking => {
        console.log(`  - ID: ${booking.id}, Time: ${booking.eventTime}, Venue: ${booking.venue}`);
      });
    });
    
    // Show calendar import source analysis
    console.log('\n🔍 Calendar import source analysis:');
    const sourceCounts = {};
    allBookings.forEach(booking => {
      const source = booking.source || 'unknown';
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    });
    
    Object.entries(sourceCounts).forEach(([source, count]) => {
      console.log(`  - ${source}: ${count} bookings`);
    });
    
    console.log('\n✅ Duplicate analysis complete');
    
  } catch (error) {
    console.error('❌ Error analyzing duplicates:', error);
  }
}

debugDuplicateCalendarEntries();