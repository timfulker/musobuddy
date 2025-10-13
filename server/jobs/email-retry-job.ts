/**
 * Email Retry Job
 * Automatically retries failed emails (soft bounces) that haven't exceeded retry limit
 */

import { storage } from '../core/storage';
import { emailService } from '../core/email-provider-abstraction';
import { bounceHandler } from '../core/bounce-handler';

export async function retryFailedEmails() {
  console.log('🔄 [EMAIL-RETRY] Starting email retry job...');

  try {
    // Get all unresolved email failures that are soft bounces
    const allFailures = await storage.getAllEmailFailures({
      failureType: 'soft_bounce',
      limit: 100 // Process up to 100 at a time
    });

    // Filter for failures that haven't exceeded retry limit and aren't resolved
    const failuresToRetry = allFailures.filter(failure =>
      !failure.resolved && failure.retryCount < 3
    );

    if (failuresToRetry.length === 0) {
      console.log('✅ [EMAIL-RETRY] No emails need retrying');
      return;
    }

    console.log(`📧 [EMAIL-RETRY] Found ${failuresToRetry.length} emails to retry`);

    let successful = 0;
    let failed = 0;
    let skipped = 0;

    for (const failure of failuresToRetry) {
      try {
        // Check if email is suppressed
        const suppressionCheck = await bounceHandler.isEmailSuppressed(failure.recipientEmail);
        if (suppressionCheck.suppressed) {
          console.log(`⏭️ [EMAIL-RETRY] Skipping suppressed email: ${failure.recipientEmail}`);
          skipped++;
          continue;
        }

        // Get user settings for from email
        const userSettings = await storage.getUserSettings(failure.userId);
        const fromEmail = userSettings?.businessContactEmail || `${failure.userId}@musobuddy.com`;
        const fromName = userSettings?.emailFromName || userSettings?.businessName || 'MusoBuddy';

        // Prepare email data
        const emailData: any = {
          to: failure.recipientEmail,
          from: fromEmail,
          fromName: fromName,
          subject: failure.subject || 'Re: Your Booking',
          html: `<p>This is an automated retry of a previously failed email.</p>`,
        };

        // If there's a booking, try to reconstruct the original email
        if (failure.bookingId) {
          const booking = await storage.getBooking(failure.bookingId);
          if (booking) {
            // Customize based on email type
            switch (failure.emailType) {
              case 'contract':
                emailData.subject = `Contract for ${booking.eventDate ? new Date(booking.eventDate).toLocaleDateString('en-GB', { timeZone: 'UTC' }) : 'your booking'}`;
                emailData.html = `<p>Please find your contract for ${booking.clientName || 'your booking'}.</p>`;
                break;
              case 'invoice':
                emailData.subject = `Invoice for ${booking.eventDate ? new Date(booking.eventDate).toLocaleDateString('en-GB', { timeZone: 'UTC' }) : 'your booking'}`;
                emailData.html = `<p>Please find your invoice for ${booking.clientName || 'your booking'}.</p>`;
                break;
              default:
                emailData.subject = `Re: ${booking.clientName || 'Your Booking'}`;
                emailData.html = `<p>This is a follow-up regarding your booking on ${booking.eventDate ? new Date(booking.eventDate).toLocaleDateString('en-GB', { timeZone: 'UTC' }) : 'TBD'}.</p>`;
            }
          }
        }

        // Attempt to send
        const result = await emailService.sendEmail(emailData);

        if (result.success) {
          // Mark as resolved since retry succeeded
          await storage.markEmailFailureAsResolved(
            failure.id,
            `Automatically retried and delivered successfully on ${new Date().toISOString()}`
          );
          console.log(`✅ [EMAIL-RETRY] Successfully resent to ${failure.recipientEmail}`);
          successful++;
        } else {
          // Increment retry count
          await storage.incrementEmailFailureRetry(failure.id);
          console.log(`❌ [EMAIL-RETRY] Failed to resend to ${failure.recipientEmail}: ${result.error}`);
          failed++;
        }

      } catch (error: any) {
        console.error(`❌ [EMAIL-RETRY] Error retrying failure #${failure.id}:`, error.message);
        // Increment retry count even on error
        await storage.incrementEmailFailureRetry(failure.id);
        failed++;
      }

      // Add small delay between sends to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`📊 [EMAIL-RETRY] Job complete: ${successful} successful, ${failed} failed, ${skipped} skipped`);

  } catch (error: any) {
    console.error('❌ [EMAIL-RETRY] Email retry job failed:', error.message);
  }
}

/**
 * Start the email retry scheduler
 * Runs every 4 hours
 */
export function startEmailRetryScheduler() {
  console.log('⏰ [EMAIL-RETRY] Starting email retry scheduler (runs every 4 hours)');

  // Run immediately on startup
  retryFailedEmails().catch(error => {
    console.error('❌ [EMAIL-RETRY] Initial retry job failed:', error);
  });

  // Then run every 4 hours
  setInterval(() => {
    retryFailedEmails().catch(error => {
      console.error('❌ [EMAIL-RETRY] Scheduled retry job failed:', error);
    });
  }, 4 * 60 * 60 * 1000); // 4 hours in milliseconds
}
