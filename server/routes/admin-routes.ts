/**
 * Admin routes for bulk re-processing and system maintenance
 */

import { Router } from 'express';
import { storage } from '../core/storage';

const router = Router();

// Bulk re-process bookings endpoint
router.post('/api/admin/reprocess-bookings', async (req, res) => {
  try {
    const { bookingIds, dateRange, allProblematic } = req.body;
    
    console.log('🔄 [ADMIN] Starting bulk re-processing of bookings');
    
    let bookingsToProcess = [];
    
    if (bookingIds && Array.isArray(bookingIds)) {
      // Re-process specific booking IDs
      console.log(`🔄 [ADMIN] Re-processing specific bookings: ${bookingIds.join(', ')}`);
      for (const id of bookingIds) {
        const booking = await storage.getBooking(id);
        if (booking) bookingsToProcess.push(booking);
      }
    } else if (dateRange) {
      // Re-process bookings in date range
      const { startDate, endDate } = dateRange;
      console.log(`🔄 [ADMIN] Re-processing bookings from ${startDate} to ${endDate}`);
      const allBookings = await storage.getAllBookings();
      bookingsToProcess = allBookings.filter(booking => {
        const createdAt = new Date(booking.createdAt);
        return createdAt >= new Date(startDate) && createdAt <= new Date(endDate);
      });
    } else if (allProblematic) {
      // Re-process all problematic bookings (generic titles, missing data, etc.)
      console.log('🔄 [ADMIN] Re-processing all problematic bookings');
      const allBookings = await storage.getAllBookings();
      bookingsToProcess = allBookings.filter(booking => {
        return (
          booking.title === 'Event' || 
          booking.title === 'Booking' ||
          booking.title?.startsWith('Inquiry') ||
          !booking.venue ||
          !booking.eventDate ||
          (booking.clientName === 'Encore Musicians' && !booking.applyNowLink)
        );
      });
    }
    
    console.log(`🔄 [ADMIN] Found ${bookingsToProcess.length} bookings to re-process`);
    
    const results = {
      total: bookingsToProcess.length,
      processed: 0,
      failed: 0,
      improved: 0,
      errors: []
    };
    
    // Process each booking
    for (const booking of bookingsToProcess) {
      try {
        console.log(`🔄 [ADMIN] Re-processing booking #${booking.id}: "${booking.title}"`);
        
        // Skip if no original email content
        if (!booking.notes || booking.notes.trim().length < 10) {
          console.log(`⚠️ [ADMIN] Skipping booking #${booking.id} - no email content in notes`);
          results.failed++;
          results.errors.push(`Booking #${booking.id}: No email content available`);
          continue;
        }
        
        // Store original data for comparison
        const originalData = {
          title: booking.title,
          venue: booking.venue,
          eventDate: booking.eventDate,
          eventTime: booking.eventTime,
          clientEmail: booking.clientEmail,
          clientPhone: booking.clientPhone,
          fee: booking.fee,
          applyNowLink: booking.applyNowLink
        };
        
        // Re-parse the email content using the same AI system
        const { parseBookingMessage } = await import('../ai/booking-message-parser');
        const { cleanEncoreTitle } = await import('../core/booking-formatter');
        
        // Extract email data from the original notes
        const emailBody = booking.notes;
        const fromField = `${booking.clientName} <${booking.clientEmail}>`;
        
        console.log(`🤖 [ADMIN] Running AI re-parsing for booking #${booking.id}`);
        const parsedData = await parseBookingMessage(emailBody, fromField, null, booking.userId);
        
        // Apply title cleanup for Encore bookings
        const cleanedTitle = cleanEncoreTitle(parsedData.eventTitle || parsedData.title || booking.title);
        
        // Build updated booking data, keeping existing data if AI didn't find better info
        const updatedData = {
          title: parsedData.eventTitle || parsedData.title || cleanedTitle || booking.title,
          venue: parsedData.venue || booking.venue,
          venueAddress: parsedData.venueAddress || booking.venueAddress,
          eventDate: parsedData.eventDate || booking.eventDate,
          eventTime: parsedData.eventTime || booking.eventTime,
          eventEndTime: parsedData.eventEndTime || booking.eventEndTime,
          clientEmail: parsedData.clientEmail || booking.clientEmail,
          clientPhone: parsedData.clientPhone || booking.clientPhone,
          fee: parsedData.fee || booking.fee,
          deposit: parsedData.deposit || booking.deposit,
          gigType: parsedData.eventType || booking.gigType,
          specialRequirements: parsedData.specialRequirements || booking.specialRequirements,
          applyNowLink: parsedData.applyNowLink || booking.applyNowLink,
          // Keep original notes and other fields unchanged
          notes: booking.notes,
          status: booking.status,
          createdAt: booking.createdAt
        };
        
        // Check if we actually improved the data
        let hasImprovement = false;
        const improvements = [];
        
        if (updatedData.title !== originalData.title && updatedData.title !== 'Event') {
          hasImprovement = true;
          improvements.push(`Title: "${originalData.title}" → "${updatedData.title}"`);
        }
        
        if (updatedData.venue !== originalData.venue && updatedData.venue) {
          hasImprovement = true;
          improvements.push(`Venue: "${originalData.venue || 'None'}" → "${updatedData.venue}"`);
        }
        
        if (updatedData.eventDate !== originalData.eventDate && updatedData.eventDate) {
          hasImprovement = true;
          improvements.push(`Event Date: "${originalData.eventDate || 'None'}" → "${updatedData.eventDate}"`);
        }
        
        if (updatedData.applyNowLink !== originalData.applyNowLink && updatedData.applyNowLink) {
          hasImprovement = true;
          improvements.push(`Apply Now Link: Added`);
        }
        
        if (updatedData.fee !== originalData.fee && updatedData.fee) {
          hasImprovement = true;
          improvements.push(`Fee: "${originalData.fee || 'None'}" → "${updatedData.fee}"`);
        }
        
        if (hasImprovement) {
          // Update the booking with improved data
          await storage.updateBooking(booking.id, updatedData);
          console.log(`✅ [ADMIN] Improved booking #${booking.id}:`, improvements);
          results.improved++;
        } else {
          console.log(`ℹ️ [ADMIN] No improvements found for booking #${booking.id}`);
        }
        
        results.processed++;
        
        // Small delay to prevent API rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error: any) {
        console.error(`❌ [ADMIN] Failed to re-process booking #${booking.id}:`, error);
        results.failed++;
        results.errors.push(`Booking #${booking.id}: ${error.message}`);
      }
    }
    
    console.log(`🎉 [ADMIN] Bulk re-processing complete:`, results);
    
    res.json({
      success: true,
      message: 'Bulk re-processing completed',
      results
    });
    
  } catch (error: any) {
    console.error('❌ [ADMIN] Bulk re-processing failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get list of problematic bookings for review
router.get('/api/admin/problematic-bookings', async (req, res) => {
  try {
    const allBookings = await storage.getAllBookings();
    
    const problematicBookings = allBookings.filter(booking => {
      return (
        booking.title === 'Event' || 
        booking.title === 'Booking' ||
        booking.title?.startsWith('Inquiry') ||
        !booking.venue ||
        !booking.eventDate ||
        (booking.clientName === 'Encore Musicians' && !booking.applyNowLink)
      );
    }).map(booking => ({
      id: booking.id,
      title: booking.title,
      clientName: booking.clientName,
      clientEmail: booking.clientEmail,
      venue: booking.venue,
      eventDate: booking.eventDate,
      createdAt: booking.createdAt,
      issues: []
    }));
    
    // Identify specific issues for each booking
    problematicBookings.forEach(booking => {
      if (booking.title === 'Event' || booking.title === 'Booking') {
        booking.issues.push('Generic title');
      }
      if (!booking.venue) {
        booking.issues.push('Missing venue');
      }
      if (!booking.eventDate) {
        booking.issues.push('Missing event date');
      }
      if (booking.clientName === 'Encore Musicians' && !booking.applyNowLink) {
        booking.issues.push('Missing Encore apply link');
      }
    });
    
    res.json({
      success: true,
      count: problematicBookings.length,
      bookings: problematicBookings
    });
    
  } catch (error: any) {
    console.error('❌ [ADMIN] Failed to get problematic bookings:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Export the registration function for the routes/index.ts file
export async function registerAdminRoutes(app: any) {
  app.use(router);
}

export default router;