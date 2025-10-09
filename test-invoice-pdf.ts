import { db } from './server/core/database';
import { invoices, bookings } from './shared/schema';
import { eq } from 'drizzle-orm';
import { generateInvoicePDF } from './server/core/invoice-pdf-generator';
import { storage } from './server/core/storage';
import { writeFileSync } from 'fs';

(async () => {
  try {
    console.log('🧪 Testing invoice PDF generation with booking data...\n');
    
    // Get invoice TFSAX-0287
    const invoice = await db.select()
      .from(invoices)
      .where(eq(invoices.invoiceNumber, 'TFSAX-0287'));
    
    if (invoice.length === 0) {
      console.log('❌ Invoice TFSAX-0287 not found');
      process.exit(1);
    }
    
    const inv = invoice[0];
    console.log('📄 Invoice TFSAX-0287:');
    console.log('  Client:', inv.clientName);
    console.log('  BookingId:', inv.bookingId);
    console.log('  Amount:', inv.amount);
    
    // Get the linked booking
    if (inv.bookingId) {
      const booking = await db.select()
        .from(bookings)
        .where(eq(bookings.id, inv.bookingId));
      
      if (booking.length > 0) {
        console.log('\n🎫 Linked Booking:');
        console.log('  Title:', booking[0].title);
        console.log('  Gig Type:', booking[0].gigType);
        console.log('  Performance Duration:', booking[0].performanceDuration);
        console.log('  Venue:', booking[0].venue);
        
        // Get user settings
        const userSettings = await storage.getSettings(inv.userId);
        
        // Generate PDF
        console.log('\n🚀 Generating PDF with booking data...');
        const pdfBuffer = await generateInvoicePDF(inv, userSettings);
        
        // Save to test file
        const testFilePath = '/home/runner/workspace/test-invoice-TFSAX-0287.pdf';
        writeFileSync(testFilePath, pdfBuffer);
        
        console.log(`✅ PDF generated successfully! Saved to: ${testFilePath}`);
        console.log(`   File size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
        
        // The PDF should now include:
        // - Duration: 2 x 45 min sets (from booking)
        // - Event Type: Sax alongside DJ (from booking)
        console.log('\n✨ PDF should now display:');
        console.log('   Duration: 2 x 45 min sets');
        console.log('   Event Type: Sax alongside DJ');
      } else {
        console.log('❌ Booking not found with ID:', inv.bookingId);
      }
    } else {
      console.log('❌ Invoice has no bookingId linked');
    }
    
  } catch (error: any) {
    console.error('Error:', error.message);
    console.error(error.stack);
  }
  process.exit(0);
})();