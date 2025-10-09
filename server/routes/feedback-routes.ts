import type { Express } from "express";
import { authenticate, type AuthenticatedRequest } from '../middleware/supabase-only-auth';
import { feedbackStorage } from '../storage/feedback-storage';
import { UserStorage } from '../storage/user-storage';
import type { InsertFeedback } from '../../shared/schema';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';

const userStorage = new UserStorage();

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), 'uploads', 'feedback');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${randomUUID()}`;
    const fileExt = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${fileExt}`);
  }
});

const fileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, PDFs, and documents are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files per upload
  }
});

export function registerFeedbackRoutes(app: Express) {
  console.log('💬 Setting up feedback routes...');

  // Serve uploaded feedback attachments
  app.get('/uploads/feedback/:filename', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Verify user is beta tester or admin
      const user = await userStorage.getUser(userId);
      if (!user?.isBetaTester && !user?.isAdmin) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const filename = req.params.filename;
      const filePath = path.join(uploadDir, filename);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Set appropriate content type based on file extension
      const ext = path.extname(filename).toLowerCase();
      const contentTypes: { [key: string]: string } = {
        '.pdf': 'application/pdf',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.txt': 'text/plain',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      };

      const contentType = contentTypes[ext] || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);

      // Send the file
      res.sendFile(filePath);

    } catch (error) {
      console.error('❌ Error serving feedback attachment:', error);
      res.status(500).json({
        error: 'Failed to load attachment',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get all feedback
  app.get('/api/feedback', authenticate, async (req: AuthenticatedRequest, res) => {
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
  app.post('/api/feedback', authenticate, async (req: AuthenticatedRequest, res) => {
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

      const { type, title, description, priority, page, attachments } = req.body;
      
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
        attachments: attachments || null,
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
  app.patch('/api/feedback/:id/status', authenticate, async (req, res) => {
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

      // Handle delete request via special status
      if (status === 'DELETE_FEEDBACK_ITEM' && adminNotes === 'ADMIN_DELETE_REQUEST') {
        console.log('🗑️ Delete feedback request via special status');
        console.log('🎯 Feedback ID to delete:', feedbackId);
        
        try {
          const deletedFeedback = await feedbackStorage.deleteFeedback(feedbackId);
          console.log('✅ Feedback deleted successfully:', deletedFeedback);
          
          return res.json({
            message: 'Feedback deleted successfully',
            feedback: deletedFeedback
          });
        } catch (error) {
          console.error('❌ Error deleting feedback:', error);
          return res.status(500).json({ error: 'Failed to delete feedback' });
        }
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

  // Delete feedback (admin only)
  app.delete('/api/feedback/:id', authenticate, async (req, res) => {
    try {
      console.log('🗑️ Delete feedback request started');
      console.log('🔐 Auth header:', req.headers.authorization ? 'Present' : 'Missing');
      
      const userId = req.user?.id;
      const feedbackId = req.params.id;
      
      console.log('👤 User ID from auth:', userId);
      console.log('🎯 Feedback ID to delete:', feedbackId);
      
      if (!userId) {
        console.log('❌ No user ID found in request');
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Check if user is admin
      const user = await userStorage.getUser(userId);
      console.log('👤 User data:', { email: user?.email, isAdmin: user?.isAdmin });
      
      if (!user?.isAdmin) {
        console.log('❌ User is not admin');
        return res.status(403).json({ error: 'Admin access required' });
      }

      // Delete the feedback
      console.log('🗑️ Attempting to delete feedback...');
      const deletedFeedback = await feedbackStorage.deleteFeedback(feedbackId);
      console.log('✅ Feedback deleted successfully:', deletedFeedback);
      
      res.json({
        message: 'Feedback deleted successfully',
        feedback: deletedFeedback
      });

    } catch (error) {
      console.error('❌ Error deleting feedback:', error);
      res.status(500).json({ error: 'Failed to delete feedback' });
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

  // Upload attachments endpoint
  app.post('/api/feedback/upload', authenticate, upload.array('attachments', 5), async (req: AuthenticatedRequest, res) => {
    try {
      console.log('📎 File upload request started');
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Verify user is beta tester or admin
      const user = await userStorage.getUser(userId);
      if (!user?.isBetaTester && !user?.isAdmin) {
        // Delete uploaded files
        if (req.files && Array.isArray(req.files)) {
          req.files.forEach((file: any) => {
            fs.unlinkSync(file.path);
          });
        }
        return res.status(403).json({ error: 'Beta tester access required' });
      }

      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      // Build URLs for uploaded files
      const baseUrl = process.env.NODE_ENV === 'production'
        ? `https://${req.get('host')}`
        : `http://localhost:${process.env.PORT || 5001}`;

      const fileUrls = req.files.map((file: any) => {
        const relativePath = `/uploads/feedback/${file.filename}`;
        return `${baseUrl}${relativePath}`;
      });

      console.log('✅ Files uploaded successfully:', fileUrls);

      res.json({
        message: 'Files uploaded successfully',
        urls: fileUrls
      });

    } catch (error) {
      console.error('❌ Error uploading files:', error);

      // Clean up uploaded files on error
      if (req.files && Array.isArray(req.files)) {
        req.files.forEach((file: any) => {
          try {
            fs.unlinkSync(file.path);
          } catch (e) {
            // Ignore cleanup errors
          }
        });
      }

      res.status(500).json({
        error: 'Failed to upload files',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  console.log('✅ Feedback routes configured');
}