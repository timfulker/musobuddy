import { Router } from 'express';
import { authenticate, type AuthenticatedRequest } from '../middleware/supabase-only-auth';
import { storage } from '../core/storage';
import { emailService } from '../core/email-provider-abstraction';

const router = Router();

/**
 * Get all unresolved email failures for the authenticated user
 */
router.get('/email-failures', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;

    const failures = await storage.getUnresolvedEmailFailures(userId);

    res.json({ success: true, failures });
  } catch (error: any) {
    console.error('Error fetching email failures:', error);
    res.status(500).json({
      error: 'Failed to fetch email failures',
      details: error.message
    });
  }
});

/**
 * Get count of unresolved email failures for badge display
 */
router.get('/email-failures/count', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;

    const count = await storage.getUnresolvedEmailFailuresCount(userId);

    res.json({ success: true, count });
  } catch (error: any) {
    console.error('Error fetching email failures count:', error);
    res.status(500).json({
      error: 'Failed to fetch email failures count',
      details: error.message
    });
  }
});

/**
 * Get specific email failure by ID
 */
router.get('/email-failures/:id', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const failureId = parseInt(req.params.id);

    const failure = await storage.getEmailFailureById(failureId);

    if (!failure) {
      return res.status(404).json({ error: 'Email failure not found' });
    }

    // Verify this failure belongs to the user
    if (failure.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json({ success: true, failure });
  } catch (error: any) {
    console.error('Error fetching email failure:', error);
    res.status(500).json({
      error: 'Failed to fetch email failure',
      details: error.message
    });
  }
});

/**
 * Mark email failure as resolved
 */
router.post('/email-failures/:id/resolve', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const failureId = parseInt(req.params.id);
    const { actionTaken } = req.body;

    // Verify this failure belongs to the user
    const failure = await storage.getEmailFailureById(failureId);
    if (!failure) {
      return res.status(404).json({ error: 'Email failure not found' });
    }

    if (failure.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updated = await storage.markEmailFailureAsResolved(failureId, actionTaken);

    res.json({ success: true, failure: updated });
  } catch (error: any) {
    console.error('Error resolving email failure:', error);
    res.status(500).json({
      error: 'Failed to resolve email failure',
      details: error.message
    });
  }
});

/**
 * Retry sending failed email
 */
router.post('/email-failures/:id/retry', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const failureId = parseInt(req.params.id);

    // Get the failure record
    const failure = await storage.getEmailFailureById(failureId);
    if (!failure) {
      return res.status(404).json({ error: 'Email failure not found' });
    }

    // Verify this failure belongs to the user
    if (failure.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Check if already resolved
    if (failure.resolved) {
      return res.status(400).json({ error: 'This failure has already been resolved' });
    }

    // Check retry count
    if (failure.retryCount >= 3) {
      return res.status(400).json({
        error: 'Maximum retry attempts reached',
        details: 'This email has already been retried 3 times'
      });
    }

    // Check if email is suppressed
    const { bounceHandler } = await import('../core/bounce-handler');
    const suppressionCheck = await bounceHandler.isEmailSuppressed(failure.recipientEmail);
    if (suppressionCheck.suppressed) {
      return res.status(400).json({
        error: 'Email is suppressed',
        details: `This email cannot be sent because it is suppressed due to: ${suppressionCheck.reason}`
      });
    }

    // Get user settings for from email
    const userSettings = await storage.getUserSettings(userId);
    const fromEmail = userSettings?.businessContactEmail || `${userId}@musobuddy.com`;
    const fromName = userSettings?.emailFromName || userSettings?.businessName || 'MusoBuddy';

    // Attempt to re-send the email
    try {
      // Reconstruct email data from failure record
      const emailData: any = {
        to: failure.recipientEmail,
        from: fromEmail,
        fromName: fromName,
        subject: failure.subject || 'Re: Your Booking',
        html: `<p>This is a retry of a previously failed email.</p>`,
      };

      // If there's a booking, fetch it and resend the appropriate email
      if (failure.bookingId) {
        const booking = await storage.getBooking(failure.bookingId);
        if (booking) {
          // Determine what type of email to resend based on emailType
          switch (failure.emailType) {
            case 'contract':
              // TODO: Implement contract resend
              emailData.subject = `Contract for ${booking.eventDate}`;
              emailData.html = `<p>Please find your contract attached.</p>`;
              break;
            case 'invoice':
              // TODO: Implement invoice resend
              emailData.subject = `Invoice for ${booking.eventDate}`;
              emailData.html = `<p>Please find your invoice attached.</p>`;
              break;
            default:
              emailData.subject = `Re: ${booking.clientName || 'Your Booking'}`;
              emailData.html = `<p>This is a follow-up email regarding your booking.</p>`;
          }
        }
      }

      // Send the email
      const result = await emailService.sendEmail(emailData);

      if (result.success) {
        // Mark as resolved since retry succeeded
        await storage.markEmailFailureAsResolved(failureId, 'Successfully retried and delivered');

        res.json({
          success: true,
          message: 'Email successfully resent',
          messageId: result.messageId
        });
      } else {
        // Increment retry count but don't resolve
        await storage.incrementEmailFailureRetry(failureId);

        res.status(500).json({
          success: false,
          error: 'Failed to resend email',
          details: result.error,
          retryCount: failure.retryCount + 1
        });
      }

    } catch (sendError: any) {
      // Increment retry count
      await storage.incrementEmailFailureRetry(failureId);

      res.status(500).json({
        success: false,
        error: 'Failed to resend email',
        details: sendError.message,
        retryCount: failure.retryCount + 1
      });
    }

  } catch (error: any) {
    console.error('Error retrying email:', error);
    res.status(500).json({
      error: 'Failed to retry email',
      details: error.message
    });
  }
});

/**
 * Delete email failure record (for cleanup)
 */
router.delete('/email-failures/:id', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const failureId = parseInt(req.params.id);

    // Verify this failure belongs to the user
    const failure = await storage.getEmailFailureById(failureId);
    if (!failure) {
      return res.status(404).json({ error: 'Email failure not found' });
    }

    if (failure.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await storage.deleteEmailFailure(failureId);

    res.json({ success: true, message: 'Email failure record deleted' });
  } catch (error: any) {
    console.error('Error deleting email failure:', error);
    res.status(500).json({
      error: 'Failed to delete email failure',
      details: error.message
    });
  }
});

export { router as emailFailureRoutes };
