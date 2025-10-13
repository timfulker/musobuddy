import type { Express, Request, Response } from "express";
import { authenticate, type AuthenticatedRequest } from '../middleware/supabase-only-auth';
import { storage } from "../core/storage";
import { safeDbCall, developmentFallbacks } from '../utils/development-helpers';
import rateLimit from 'express-rate-limit';

// Rate limiting for notification endpoints to prevent request storms
const notificationRateLimit = rateLimit({
  windowMs: 10 * 1000, // 10 seconds
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    error: 'Too many notification requests, please try again later.',
    retryAfter: 10
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting in development for easier debugging
    return process.env.NODE_ENV !== 'production';
  }
});

export function registerNotificationRoutes(app: Express) {
  console.log('🔔 Setting up notification routes...');

  // Get notification counts for badges
  app.get('/api/notifications/counts', notificationRateLimit, authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      console.log(`🔍 [NOTIFICATION-COUNTS] User ID from token: ${userId}, Email: ${req.user?.email}, Environment: ${process.env.NODE_ENV}`);

      // Get all notification counts in parallel for efficiency with development fallbacks
      const [
        newBookings,
        reviewMessages,  // Changed to count review messages only once
        overdueInvoices,
        unreadClientMessages,
        failedEmails
      ] = await Promise.all([
        safeDbCall(() => storage.getNewBookingsCount(userId), 0, 'getNewBookingsCount'),
        safeDbCall(() => storage.getUnparseableMessagesCount(userId), 0, 'getUnparseableMessagesCount'), // These are the review messages
        safeDbCall(() => storage.getOverdueInvoicesCount(userId), 0, 'getOverdueInvoicesCount'),
        safeDbCall(() => storage.getUnreadMessageNotificationsCount(userId), 0, 'getUnreadMessageNotificationsCount'),
        safeDbCall(() => storage.getUnresolvedEmailFailuresCount(userId), 0, 'getUnresolvedEmailFailuresCount')
      ]);

      // Ensure all values are numbers to prevent string concatenation
      const numNewBookings = parseInt(newBookings) || 0;
      const numReviewMessages = parseInt(reviewMessages) || 0;
      const numUnreadClientMessages = parseInt(unreadClientMessages) || 0;
      const numOverdueInvoices = parseInt(overdueInvoices) || 0;
      const numFailedEmails = parseInt(failedEmails) || 0;

      const totalMessages = numUnreadClientMessages + numReviewMessages;
      const totalCount = numNewBookings + numReviewMessages + numOverdueInvoices + numUnreadClientMessages + numFailedEmails;

      console.log(`📊 [NOTIFICATION-COUNTS] For user ${userId}:`, {
        newBookings: numNewBookings,
        reviewMessages: numReviewMessages,
        unreadClientMessages: numUnreadClientMessages,
        failedEmails: numFailedEmails,
        totalMessages,
        overdueInvoices: numOverdueInvoices
      });

      res.json({
        counts: {
          newBookings: numNewBookings,
          unparseableMessages: numReviewMessages, // For backward compatibility
          overdueInvoices: numOverdueInvoices,
          clientMessages: numUnreadClientMessages,
          reviewMessages: numReviewMessages,
          failedEmails: numFailedEmails,
          totalMessages: totalMessages, // Combined count for sidebar badge
          total: totalCount
        }
      });

    } catch (error) {
      console.error('❌ Error fetching notification counts:', error);
      res.status(500).json({ error: 'Failed to fetch notification counts' });
    }
  });

  // Get detailed notifications (for dropdown/list view)
  app.get('/api/notifications', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // This could be expanded to return actual notification objects
      // For now, just return the counts with descriptions
      const [
        newBookings,
        unparseableMessages,
        overdueInvoices
      ] = await Promise.all([
        storage.getNewBookingsCount(userId),
        storage.getUnparseableMessagesCount(userId), 
        storage.getOverdueInvoicesCount(userId)
      ]);

      const notifications = [];

      if (newBookings > 0) {
        notifications.push({
          type: 'new_bookings',
          count: newBookings,
          message: `${newBookings} new booking${newBookings > 1 ? 's' : ''} received`,
          link: '/bookings',
          priority: 'high'
        });
      }

      if (unparseableMessages > 0) {
        notifications.push({
          type: 'unparseable_messages',
          count: unparseableMessages,
          message: `${unparseableMessages} message${unparseableMessages > 1 ? 's' : ''} need review`,
          link: '/review-messages',
          priority: 'medium'
        });
      }

      if (overdueInvoices > 0) {
        notifications.push({
          type: 'overdue_invoices',
          count: overdueInvoices,
          message: `${overdueInvoices} overdue invoice${overdueInvoices > 1 ? 's' : ''}`,
          link: '/invoices',
          priority: 'high'
        });
      }


      res.json({
        notifications,
        totalCount: notifications.reduce((sum, n) => sum + n.count, 0)
      });

    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  });

  // Get client messages specifically for the Messages page
  app.get('/api/notifications/messages', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      console.log(`🔍 [MESSAGES] User ID from token: ${userId}, Email: ${req.user?.email}, Environment: ${process.env.NODE_ENV}`);

      // Get all message notifications for this user with development fallback
      const messages = await safeDbCall(
        () => storage.getMessageNotifications(userId),
        [],
        'getMessageNotifications'
      );
      console.log(`🔍 [MESSAGES] Found ${messages.length} messages for user ${userId}`);

      if (messages.length > 0) {
        console.log(`🔍 [MESSAGES] Sample message:`, {
          id: messages[0].id,
          bookingId: messages[0].bookingId,
          senderEmail: messages[0].senderEmail,
          messageUrl: messages[0].messageUrl,
          subject: messages[0].subject,
          clientName: messages[0].clientName
        });
      }

      res.json(messages);

    } catch (error) {
      console.error('❌ Error fetching client messages:', error);
      res.status(500).json({ error: 'Failed to fetch client messages' });
    }
  });

  // Get failed emails specifically for the Failed Emails page
  app.get('/api/notifications/failed-emails', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      console.log(`🔍 [FAILED-EMAILS] User ID from token: ${userId}, Email: ${req.user?.email}`);

      // Get all unresolved email failures for this user with development fallback
      const failedEmails = await safeDbCall(
        () => storage.getUnresolvedEmailFailures(userId),
        [],
        'getUnresolvedEmailFailures'
      );
      console.log(`🔍 [FAILED-EMAILS] Found ${failedEmails.length} failed emails for user ${userId}`);

      if (failedEmails.length > 0) {
        console.log(`🔍 [FAILED-EMAILS] Sample failure:`, {
          id: failedEmails[0].id,
          bookingId: failedEmails[0].bookingId,
          recipientEmail: failedEmails[0].recipientEmail,
          failureType: failedEmails[0].failureType,
          emailType: failedEmails[0].emailType,
          priority: failedEmails[0].priority
        });
      }

      res.json(failedEmails);

    } catch (error) {
      console.error('❌ Error fetching failed emails:', error);
      res.status(500).json({ error: 'Failed to fetch failed emails' });
    }
  });

  // Mark a failed email as resolved
  app.post('/api/notifications/failed-emails/:id/resolve', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const failureId = parseInt(req.params.id);
      const { actionTaken } = req.body;

      console.log(`✅ [FAILED-EMAILS] User ${userId} resolving failure #${failureId}`);

      // Verify the failure belongs to this user
      const failure = await storage.getEmailFailureById(failureId);
      if (!failure) {
        return res.status(404).json({ error: 'Email failure not found' });
      }

      if (failure.userId !== userId) {
        return res.status(403).json({ error: 'Not authorized to resolve this failure' });
      }

      // Mark as resolved
      const updated = await storage.markEmailFailureAsResolved(failureId, actionTaken);

      console.log(`✅ [FAILED-EMAILS] Failure #${failureId} marked as resolved`);

      res.json(updated);

    } catch (error) {
      console.error('❌ Error resolving failed email:', error);
      res.status(500).json({ error: 'Failed to resolve email failure' });
    }
  });

  console.log('✅ Notification routes configured');
}