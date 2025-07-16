/**
 * Quick check for new enquiry after DMARC test
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { bookings } from './shared/schema.ts';
import { desc } from 'drizzle-orm';

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

async function quickCheck() {
  try {
    console.log('🔍 Checking for latest bookings...');
    
    const latestBookings = await db
      .select()
      .from(bookings)
      .orderBy(desc(bookings.createdAt))
      .limit(5);

    console.log(`📊 Found ${latestBookings.length} recent bookings:`);
    
    latestBookings.forEach((booking, index) => {
      console.log(`${index + 1}. ID: ${booking.id}`);
      console.log(`   Title: ${booking.title}`);
      console.log(`   Client: ${booking.clientName} (${booking.clientEmail})`);
      console.log(`   Event Date: ${booking.eventDate}`);
      console.log(`   Venue: ${booking.venue}`);
      console.log(`   Event Type: ${booking.eventType}`);
      console.log(`   Gig Type: ${booking.gigType}`);
      console.log(`   Phone: ${booking.clientPhone}`);
      console.log(`   Value: ${booking.estimatedValue}`);
      console.log(`   Apply Link: ${booking.applyNowLink}`);
      console.log(`   Created: ${booking.createdAt}`);
      console.log(`   ---`);
    });
    
  } catch (error) {
    console.error('❌ Error checking bookings:', error);
  }
}

quickCheck().then(() => {
  console.log('✅ Check completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Check failed:', error);
  process.exit(1);
});