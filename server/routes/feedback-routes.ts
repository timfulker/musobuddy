import type { Express } from "express";
import { authenticateWithFirebase, type AuthenticatedRequest } from '../middleware/firebase-auth';
import { feedbackStorage } from '../storage/feedback-storage';
import { UserStorage } from '../storage/user-storage';
import type { InsertFeedback } from '../../shared/schema';

const userStorage = new UserStorage();

export function registerFeedbackRoutes(app: Express) {
  console.log('💬 Setting up feedback routes...');

  // Get all feedback
  app.get('/api/feedback', authenticateWithFirebase, async (req, res) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Check if user is admin to determine what feedback to return
      const user = await userStorage.getUser(userId);
      const isAdmin = user?.isAdmin || false;

      const feedback = await feedbackStorage.getFeedback(userId, isAdmin);
      
      res.json(feedback);

    } catch (error) {
      console.error('❌ Error fetching feedback:', error);
      res.status(500).json({ error: 'Failed to fetch feedback' });
    }
  });

  // Create new feedback
  app.post('/api/feedback', authenticateWithFirebase, async (req, res) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Verify user is beta tester or admin
      const user = await userStorage.getUser(userId);
      if (!user?.isBetaTester && !user?.isAdmin) {
        return res.status(403).json({ error: 'Beta tester access required' });
      }

      const { type, title, description, priority, page } = req.body;
      
      // Validate required fields
      if (!type || !title || !description) {
        return res.status(400).json({ error: 'Type, title, and description are required' });
      }

      const feedbackData: InsertFeedback = {
        userId,
        type,
        title,
        description,
        priority: priority || 'medium',
        page: page || null,
        status: 'open'
      };

      const newFeedback = await feedbackStorage.createFeedback(feedbackData);
      
      res.json({
        message: 'Feedback submitted successfully',
        feedback: newFeedback
      });

    } catch (error) {
      console.error('❌ Error creating feedback:', error);
      res.status(500).json({ error: 'Failed to create feedback' });
    }
  });

  // Update feedback status (admin only)
  app.patch('/api/feedback/:id/status', authenticateWithFirebase, async (req, res) => {
    try {
      const userId = req.user?.id;
      const feedbackId = req.params.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Check if user is admin
      const user = await userStorage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { status, adminNotes } = req.body;
      
      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }

      const updatedFeedback = await feedbackStorage.updateFeedbackStatus(
        feedbackId, 
        status, 
        adminNotes
      );
      
      res.json({
        message: 'Feedback status updated successfully',
        feedback: updatedFeedback
      });

    } catch (error) {
      console.error('❌ Error updating feedback status:', error);
      res.status(500).json({ error: 'Failed to update feedback status' });
    }
  });

  console.log('✅ Feedback routes configured');
}