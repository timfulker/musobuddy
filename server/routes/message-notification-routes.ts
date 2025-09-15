import { Router } from 'express';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth';
import { storage } from '../core/storage';

const router = Router();

// Get all message notifications for user
router.get('/notifications/messages', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const isRead = req.query.isRead !== undefined ? req.query.isRead === 'true' : undefined;
    
    const notifications = await storage.getMessageNotifications(userId, isRead);
    
    res.json(notifications);
  } catch (error: any) {
    console.error('Error fetching message notifications:', error);
    res.status(500).json({ 
      error: 'Failed to fetch message notifications',
      details: error.message 
    });
  }
});

// Get unread count for badge display
router.get('/notifications/messages/count', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    
    const unreadNotifications = await storage.getMessageNotifications(userId, false);
    const count = unreadNotifications.length;
    
    res.json({ count });
  } catch (error: any) {
    console.error('Error fetching unread message count:', error);
    res.status(500).json({ 
      error: 'Failed to fetch unread message count',
      details: error.message 
    });
  }
});

// Mark notification as read
router.patch('/notifications/messages/:id/read', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const notificationId = parseInt(req.params.id);
    
    const updatedNotification = await storage.markMessageNotificationAsRead(notificationId);
    
    if (!updatedNotification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json({ success: true, notification: updatedNotification });
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ 
      error: 'Failed to mark notification as read',
      details: error.message 
    });
  }
});

// Dismiss notification (hide from messages view but keep data for conversation)
router.patch('/notifications/messages/:id/dismiss', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const notificationId = parseInt(req.params.id);
    
    const updatedNotification = await storage.dismissMessageNotification(notificationId);
    
    if (!updatedNotification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json({ success: true, notification: updatedNotification });
  } catch (error: any) {
    console.error('Error dismissing notification:', error);
    res.status(500).json({ 
      error: 'Failed to dismiss notification',
      details: error.message 
    });
  }
});

// Delete notification
router.delete('/notifications/messages/:id', authenticateWithSupabase, async (req: SupabaseAuthenticatedRequest, res) => {
  try {
    const notificationId = parseInt(req.params.id);
    
    const deletedNotification = await storage.deleteMessageNotification(notificationId);
    
    if (!deletedNotification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ 
      error: 'Failed to delete notification',
      details: error.message 
    });
  }
});

export { router as messageNotificationRoutes };