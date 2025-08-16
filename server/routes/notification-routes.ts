import type { Express, Request, Response } from "express";
import { requireAuth } from '../middleware/auth';
import { storage } from "../core/storage";

export function registerNotificationRoutes(app: Express) {
  console.log('🔔 Setting up notification routes...');

  // Get notification counts for badges
  app.get('/api/notifications/counts', requireAuth, async (req: any, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      console.log(`🔍 [NOTIFICATION-COUNTS] User ID from token: ${userId}, Email: ${req.user?.email}, Environment: ${process.env.NODE_ENV}`);

      // Get all notification counts in parallel for efficiency
      const [
        newBookings,
        unparseableMessages, 
        overdueInvoices,
        expiringDocuments,
        unreadClientMessages
      ] = await Promise.all([
        storage.getNewBookingsCount(userId),
        storage.getUnparseableMessagesCount(userId),
        storage.getOverdueInvoicesCount(userId),
        storage.getExpiringDocumentsCount(userId),
        storage.getUnreadMessageNotificationsCount(userId)
      ]);

      const totalCount = newBookings + unparseableMessages + overdueInvoices + expiringDocuments + unreadClientMessages;

      res.json({
        counts: {
          newBookings,
          unparseableMessages,
          overdueInvoices,
          expiringDocuments,
          clientMessages: unreadClientMessages,
          total: totalCount
        }
      });

    } catch (error) {
      console.error('❌ Error fetching notification counts:', error);
      res.status(500).json({ error: 'Failed to fetch notification counts' });
    }
  });

  // Get detailed notifications (for dropdown/list view)
  app.get('/api/notifications', requireAuth, async (req: any, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // This could be expanded to return actual notification objects
      // For now, just return the counts with descriptions
      const [
        newBookings,
        unparseableMessages,
        overdueInvoices,
        expiringDocuments
      ] = await Promise.all([
        storage.getNewBookingsCount(userId),
        storage.getUnparseableMessagesCount(userId), 
        storage.getOverdueInvoicesCount(userId),
        storage.getExpiringDocumentsCount(userId)
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

      if (expiringDocuments > 0) {
        notifications.push({
          type: 'expiring_documents',
          count: expiringDocuments,
          message: `${expiringDocuments} document${expiringDocuments > 1 ? 's' : ''} expiring soon`,
          link: '/compliance',
          priority: 'medium'
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
  app.get('/api/notifications/messages', requireAuth, async (req: any, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      console.log(`🔍 [MESSAGES] User ID from token: ${userId}, Email: ${req.user?.email}, Environment: ${process.env.NODE_ENV}`);

      // Get all message notifications for this user
      const messages = await storage.getMessageNotifications(userId);
      console.log(`🔍 [MESSAGES] Found ${messages.length} messages for user ${userId}`);
      
      res.json(messages);

    } catch (error) {
      console.error('❌ Error fetching client messages:', error);
      res.status(500).json({ error: 'Failed to fetch client messages' });
    }
  });

  console.log('✅ Notification routes configured');
}