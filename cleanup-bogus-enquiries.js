/**
 * Clean up bogus/test enquiries to prepare for proper conflict detection
 * This removes fake entries so the system can properly process real incoming enquiries
 */

import { db } from './server/db.ts';
import { bookings } from './shared/schema.ts';
import { and, or, like, isNull, ne, eq } from 'drizzle-orm';

async function cleanupBogusEnquiries() {
  console.log('🧹 Starting cleanup of bogus enquiries...');
  
  try {
    // Get all bookings to analyze
    const allBookings = await db.select().from(bookings);
    console.log(`📊 Found ${allBookings.length} total bookings`);
    
    // Identify bogus enquiries by common patterns
    const bogusPatterns = [
      'Test',
      'test',
      'Demo',
      'demo',
      'Sample',
      'sample',
      'Example',
      'example',
      'Fake',
      'fake',
      'Lorem',
      'lorem',
      'Placeholder',
      'placeholder',
      'Unknown',
      'unknown',
      'temp',
      'Temp',
      'Debug',
      'debug'
    ];
    
    // Find bogus enquiries
    const bogusEnquiries = allBookings.filter(booking => {
      // Check client name
      if (booking.clientName) {
        const hasBogusPatter = bogusPatterns.some(pattern => 
          booking.clientName.toLowerCase().includes(pattern.toLowerCase())
        );
        if (hasBogusPatter) return true;
      }
      
      // Check title
      if (booking.title) {
        const hasBogusPatter = bogusPatterns.some(pattern => 
          booking.title.toLowerCase().includes(pattern.toLowerCase())
        );
        if (hasBogusPatter) return true;
      }
      
      // Check for obviously fake emails
      if (booking.clientEmail && (
        booking.clientEmail.includes('example.com') ||
        booking.clientEmail.includes('test.com') ||
        booking.clientEmail.includes('fake.com') ||
        booking.clientEmail.includes('demo.com') ||
        booking.clientEmail === 'unknown@example.com'
      )) {
        return true;
      }
      
      // Check for empty/minimal data
      if (!booking.clientName || !booking.eventDate || !booking.eventType) {
        return true;
      }
      
      return false;
    });
    
    console.log(`🚫 Found ${bogusEnquiries.length} bogus enquiries to remove:`);
    bogusEnquiries.forEach(enquiry => {
      console.log(`   - ${enquiry.clientName} - ${enquiry.title} - ${enquiry.eventDate}`);
    });
    
    // Remove bogus enquiries
    if (bogusEnquiries.length > 0) {
      const idsToDelete = bogusEnquiries.map(e => e.id);
      
      // Delete in batches to avoid overwhelming the database
      const batchSize = 10;
      for (let i = 0; i < idsToDelete.length; i += batchSize) {
        const batch = idsToDelete.slice(i, i + batchSize);
        await db.delete(bookings).where(
          or(...batch.map(id => eq(bookings.id, id)))
        );
        console.log(`✅ Deleted batch ${Math.floor(i/batchSize) + 1}`);
      }
      
      console.log(`🎉 Successfully removed ${bogusEnquiries.length} bogus enquiries`);
    } else {
      console.log('✅ No bogus enquiries found to remove');
    }
    
    // Show remaining enquiries
    const remainingBookings = await db.select().from(bookings);
    console.log(`📈 Remaining enquiries: ${remainingBookings.length}`);
    
    console.log('\n🔍 Remaining enquiries:');
    remainingBookings.forEach(booking => {
      console.log(`   ✓ ${booking.clientName} - ${booking.eventType} - ${booking.eventDate} - ${booking.status}`);
    });
    
    console.log('\n🎯 Conflict detection system is now ready for real enquiries!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
}

// Run the cleanup
cleanupBogusEnquiries()
  .then(() => {
    console.log('🏁 Cleanup completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Cleanup failed:', error);
    process.exit(1);
  });