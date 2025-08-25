import type { Express } from "express";
import { authenticateWithFirebase, type AuthenticatedRequest } from '../middleware/firebase-auth';

export function registerFeedbackRoutes(app: Express) {
  console.log('💬 Setting up feedback routes...');

  // Get all feedback
  app.get('/api/feedback', authenticateWithFirebase, async (req, res) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // For now, return empty array since feedback storage isn't implemented yet
      const feedback = [];
      
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

      const feedbackData = req.body;
      
      // For now, return success without actually storing
      res.json({ 
        message: 'Feedback functionality in development',
        feedbackData
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

      const { status, adminNotes } = req.body;
      
      // For now, return success without actually updating
      res.json({ 
        message: 'Feedback status update functionality in development',
        feedbackId,
        status,
        adminNotes
      });

    } catch (error) {
      console.error('❌ Error updating feedback status:', error);
      res.status(500).json({ error: 'Failed to update feedback status' });
    }
  });

  console.log('✅ Feedback routes configured');
}