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
      console.log('🔄 Feedback submission started');
      const userId = req.user?.id;
      console.log('👤 User ID:', userId);
      
      if (!userId) {
        console.log('❌ No user ID found');
        return res.status(401).json({ error: 'Authentication required' });
      }

      console.log('🔍 Checking user permissions...');
      // Verify user is beta tester or admin
      const user = await userStorage.getUser(userId);
      console.log('👤 User data:', { email: user?.email, isBetaTester: user?.isBetaTester, isAdmin: user?.isAdmin });
      
      if (!user?.isBetaTester && !user?.isAdmin) {
        console.log('❌ User not authorized for feedback');
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

      console.log('📝 Creating feedback with data:', feedbackData);
      const newFeedback = await feedbackStorage.createFeedback(feedbackData);
      console.log('✅ Feedback created successfully:', newFeedback);
      
      res.json({
        message: 'Feedback submitted successfully',
        feedback: newFeedback
      });

    } catch (error) {
      console.error('❌ Error creating feedback:', error);
      console.error('❌ Error details:', error instanceof Error ? error.message : 'Unknown error');
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({ 
        error: 'Failed to create feedback',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
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

  // Test endpoint to check feedback table structure (development only, no auth)
  if (process.env.NODE_ENV === 'development') {
    app.get('/api/feedback/test-table', async (req, res) => {
      try {
        console.log('🧪 Testing feedback table access...');
        // Try a simple query to check table exists
        const result = await feedbackStorage.getFeedback('test-user-id', true);
        console.log('🧪 Feedback table query successful, rows:', result.length);
        res.json({
          message: 'Feedback table accessible',
          rowCount: result.length,
          sampleStructure: result.length > 0 ? Object.keys(result[0]) : 'No existing feedback rows'
        });
      } catch (error) {
        console.error('❌ Feedback table test failed:', error);
        console.error('❌ Error details:', error instanceof Error ? error.message : 'Unknown error');
        console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        res.status(500).json({
          error: 'Feedback table not accessible',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });
  }

  console.log('✅ Feedback routes configured');
}