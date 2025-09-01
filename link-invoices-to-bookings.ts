import { db } from './server/core/database';
import { invoices, bookings } from './shared/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';

(async () => {
  try {
    console.log('🔍 Finding invoices without booking IDs...');
    
    // Get all invoices without booking IDs
    const unlinkedInvoices = await db.select()
      .from(invoices)
      .where(isNull(invoices.bookingId));
    
    console.log(`Found ${unlinkedInvoices.length} invoices without booking IDs`);
    
    let linkedCount = 0;
    
    for (const invoice of unlinkedInvoices) {
      // Try to find matching booking by client name and event date
      const matchingBookings = await db.select()
        .from(bookings)
        .where(and(
          eq(bookings.clientName, invoice.clientName),
          eq(bookings.userId, invoice.userId)
        ));
      
      if (matchingBookings.length === 1) {
        // Perfect match - only one booking for this client
        const booking = matchingBookings[0];
        
        // Check if dates are close (within 7 days)
        if (invoice.eventDate && booking.eventDate) {
          const invoiceDate = new Date(invoice.eventDate);
          const bookingDate = new Date(booking.eventDate);
          const daysDiff = Math.abs((invoiceDate.getTime() - bookingDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysDiff <= 7) {
            console.log(`✅ Linking invoice ${invoice.invoiceNumber} to booking ${booking.id} (${booking.title})`);
            await db.update(invoices)
              .set({ bookingId: booking.id })
              .where(eq(invoices.id, invoice.id));
            linkedCount++;
          } else {
            console.log(`⚠️ Invoice ${invoice.invoiceNumber}: Found booking but dates differ by ${daysDiff.toFixed(0)} days`);
          }
        } else if (!invoice.eventDate) {
          // No event date on invoice, link anyway if only one booking
          console.log(`✅ Linking invoice ${invoice.invoiceNumber} to booking ${booking.id} (no invoice date to verify)`);
          await db.update(invoices)
            .set({ bookingId: booking.id })
            .where(eq(invoices.id, invoice.id));
          linkedCount++;
        }
      } else if (matchingBookings.length > 1) {
        // Multiple bookings for this client - try to match by date
        if (invoice.eventDate) {
          const invoiceDate = new Date(invoice.eventDate);
          let bestMatch = null;
          let bestDiff = Infinity;
          
          for (const booking of matchingBookings) {
            if (booking.eventDate) {
              const bookingDate = new Date(booking.eventDate);
              const daysDiff = Math.abs((invoiceDate.getTime() - bookingDate.getTime()) / (1000 * 60 * 60 * 24));
              
              if (daysDiff < bestDiff) {
                bestDiff = daysDiff;
                bestMatch = booking;
              }
            }
          }
          
          if (bestMatch && bestDiff <= 7) {
            console.log(`✅ Linking invoice ${invoice.invoiceNumber} to booking ${bestMatch.id} (best date match)`);
            await db.update(invoices)
              .set({ bookingId: bestMatch.id })
              .where(eq(invoices.id, invoice.id));
            linkedCount++;
          } else {
            console.log(`⚠️ Invoice ${invoice.invoiceNumber}: ${matchingBookings.length} bookings found but no close date match`);
          }
        } else {
          console.log(`⚠️ Invoice ${invoice.invoiceNumber}: ${matchingBookings.length} bookings found but invoice has no date`);
        }
      } else {
        console.log(`❌ Invoice ${invoice.invoiceNumber}: No matching bookings found for client "${invoice.clientName}"`);
      }
    }
    
    console.log(`\n✅ Successfully linked ${linkedCount} invoices to their bookings`);
    console.log(`❌ ${unlinkedInvoices.length - linkedCount} invoices remain unlinked`);
    
    // Special case: Link invoice TFSAX-0287 to booking 7671 manually
    const specificInvoice = await db.select()
      .from(invoices)
      .where(eq(invoices.invoiceNumber, 'TFSAX-0287'));
    
    if (specificInvoice.length > 0 && !specificInvoice[0].bookingId) {
      console.log('\n🔧 Manually linking invoice TFSAX-0287 to booking 7671...');
      await db.update(invoices)
        .set({ bookingId: 7671 })
        .where(eq(invoices.invoiceNumber, 'TFSAX-0287'));
      console.log('✅ Manual link completed');
    }
    
  } catch (error: any) {
    console.error('Error:', error.message);
  }
  process.exit(0);
})();