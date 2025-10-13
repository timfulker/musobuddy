import { db } from './server/core/database';
import { bookings, users } from './shared/schema';
import { eq, and, gte, lt } from 'drizzle-orm';

async function deleteTodaysBookings() {
  console.log('Finding and deleting bookings added today for timfulker@gmail.com...\n');
  
  // Get user ID for timfulker@gmail.com
  const user = await db.select().from(users).where(eq(users.email, 'timfulker@gmail.com')).limit(1);
  if (user.length === 0) {
    console.log('User timfulker@gmail.com not found');
    process.exit(1);
  }
  
  const userId = user[0].id;
  console.log('User ID:', userId);
  
  // Get today's date range (start and end of today)
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  
  console.log('Looking for bookings created between:');
  console.log('Start:', startOfToday.toISOString());
  console.log('End:', startOfTomorrow.toISOString());
  
  // Find bookings created today
  const todaysBookings = await db.select().from(bookings).where(
    and(
      eq(bookings.userId, userId),
      gte(bookings.createdAt, startOfToday),
      lt(bookings.createdAt, startOfTomorrow)
    )
  );
  
  console.log(`\nFound ${todaysBookings.length} bookings created today:`);
  
  if (todaysBookings.length === 0) {
    console.log('No bookings to delete');
    process.exit(0);
  }
  
  // Show details of bookings to be deleted
  todaysBookings.forEach((booking, index) => {
    console.log(`${index + 1}. ID: ${booking.id}, Client: ${booking.clientName}, Event Date: ${booking.eventDate}, Created: ${booking.createdAt?.toISOString()}`);
  });
  
  // Delete the bookings
  console.log(`\nDeleting ${todaysBookings.length} bookings...`);
  
  const deleteResult = await db.delete(bookings).where(
    and(
      eq(bookings.userId, userId),
      gte(bookings.createdAt, startOfToday),
      lt(bookings.createdAt, startOfTomorrow)
    )
  );
  
  console.log('Delete result:', deleteResult);
  console.log(`✅ Successfully deleted ${todaysBookings.length} bookings created today for timfulker@gmail.com`);
  
  process.exit(0);
}

deleteTodaysBookings().catch(console.error);