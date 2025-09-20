import { db } from './server/core/database';
import { invoices, bookings } from './shared/schema';
import { eq } from 'drizzle-orm';

(async () => {
  try {
    // Check invoices with bookingId set
    const invoiceRecords = await db.select({
      invoiceNumber: invoices.invoiceNumber,
      bookingId: invoices.bookingId,
      clientName: invoices.clientName,
      amount: invoices.amount,
      eventDate: invoices.eventDate
    })
    .from(invoices)
    .limit(5);
    
    console.log('Sample invoices:');
    invoiceRecords.forEach(inv => {
      console.log(`  ${inv.invoiceNumber}: bookingId=${inv.bookingId}, client=${inv.clientName}`);
    });
    
    // Check specifically for invoice TFSAX-0287
    const specificInvoice = await db.select()
      .from(invoices)
      .where(eq(invoices.invoiceNumber, 'TFSAX-0287'));
    
    if (specificInvoice.length > 0) {
      console.log('\nInvoice TFSAX-0287 details:');
      console.log('  bookingId:', specificInvoice[0].bookingId);
      console.log('  clientName:', specificInvoice[0].clientName);
      console.log('  amount:', specificInvoice[0].amount);
      console.log('  eventDate:', specificInvoice[0].eventDate);
      
      // If there's a bookingId, fetch the booking
      if (specificInvoice[0].bookingId) {
        const booking = await db.select({
          id: bookings.id,
          gigType: bookings.gigType,
          eventType: bookings.eventType,
          performanceDuration: bookings.performanceDuration,
          clientName: bookings.clientName,
          venue: bookings.venue
        })
        .from(bookings)
        .where(eq(bookings.id, specificInvoice[0].bookingId));
        
        if (booking.length > 0) {
          console.log('\nLinked booking details:');
          console.log('  id:', booking[0].id);
          console.log('  gigType:', booking[0].gigType);
          console.log('  eventType:', booking[0].eventType);
          console.log('  performanceDuration:', booking[0].performanceDuration);
        } else {
          console.log('\nNo booking found with ID:', specificInvoice[0].bookingId);
        }
      } else {
        console.log('\nNo bookingId linked to this invoice');
      }
    } else {
      console.log('\nInvoice TFSAX-0287 not found');
    }
    
    // Check a booking with ID 7671
    const bookingRecord = await db.select({
      id: bookings.id,
      gigType: bookings.gigType,
      eventType: bookings.eventType,
      performanceDuration: bookings.performanceDuration,
      clientName: bookings.clientName
    })
    .from(bookings)
    .where(eq(bookings.id, 7671));
    
    if (bookingRecord.length > 0) {
      console.log('\nBooking 7671 details:');
      console.log('  gigType:', bookingRecord[0].gigType);
      console.log('  eventType:', bookingRecord[0].eventType);
      console.log('  performanceDuration:', bookingRecord[0].performanceDuration);
      console.log('  clientName:', bookingRecord[0].clientName);
    }
    
  } catch (error: any) {
    console.error('Error:', error.message);
  }
  process.exit(0);
})();