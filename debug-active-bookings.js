/**
 * Debug active bookings to understand why it shows zero
 */

import { db } from './server/db.ts';
import { bookings } from './shared/schema.ts';
import { eq, gte, and } from 'drizzle-orm';

async function debugActiveBookings() {
  try {
    const now = new Date();
    console.log('Current date:', now.toISOString());
    console.log('Current date (local):', now.toLocaleString());
    
    // Get all bookings with their statuses
    const allBookings = await db.select().from(bookings).limit(20);
    console.log(`\nTotal bookings found: ${allBookings.length}`);
    
    if (allBookings.length > 0) {
      console.log('\nFirst 10 bookings:');
      allBookings.slice(0, 10).forEach(booking => {
        const eventDate = booking.eventDate ? new Date(booking.eventDate) : null;
        const isFuture = eventDate && eventDate >= now;
        console.log(`ID: ${booking.id}, Status: ${booking.status}, Event Date: ${eventDate?.toDateString()}, Future: ${isFuture}, Title: ${booking.title}`);
      });
    }
    
    // Check confirmed bookings
    const confirmedBookings = await db.select().from(bookings).where(eq(bookings.status, 'confirmed'));
    console.log(`\nConfirmed bookings: ${confirmedBookings.length}`);
    
    // Check future confirmed bookings (what "Active Bookings" counts)
    const futureConfirmed = await db.select().from(bookings).where(and(eq(bookings.status, 'confirmed'), gte(bookings.eventDate, now)));
    console.log(`\nFuture confirmed bookings (Active Bookings): ${futureConfirmed.length}`);
    
    if (futureConfirmed.length > 0) {
      futureConfirmed.forEach(booking => {
        console.log(`ID: ${booking.id}, Event Date: ${new Date(booking.eventDate).toDateString()}, Title: ${booking.title}`);
      });
    }
    
    // Check status distribution
    const statusCounts = {};
    allBookings.forEach(booking => {
      statusCounts[booking.status] = (statusCounts[booking.status] || 0) + 1;
    });
    console.log('\nStatus distribution:', statusCounts);
    
    // Check upcoming bookings (any status, future events)
    const upcomingBookings = await db.select().from(bookings).where(gte(bookings.eventDate, now));
    console.log(`\nUpcoming bookings (any status): ${upcomingBookings.length}`);
    
    if (upcomingBookings.length > 0) {
      console.log('Upcoming bookings:');
      upcomingBookings.forEach(booking => {
        const eventDate = new Date(booking.eventDate);
        console.log(`ID: ${booking.id}, Status: ${booking.status}, Event Date: ${eventDate.toDateString()}, Title: ${booking.title}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

debugActiveBookings();