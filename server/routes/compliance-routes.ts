import { type Express, type Response } from "express";
import multer from "multer";
import { storage } from "../core/storage";
import { authenticateWithSupabase, type SupabaseAuthenticatedRequest } from '../middleware/supabase-auth';
import { generalApiRateLimit } from '../middleware/rateLimiting';
import { asyncHandler } from '../middleware/errorHandler';

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow PDF, DOC, and DOCX files for compliance documents
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, and DOCX files are allowed.'));
    }
  }
});

export function registerComplianceRoutes(app: Express) {
  console.log('📋 Setting up compliance routes...');

  // Get all compliance documents for authenticated user
  app.get('/api/compliance', authenticateWithSupabase, asyncHandler(async (req: SupabaseAuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const complianceDocuments = await storage.getComplianceDocuments(userId);
      res.json(complianceDocuments || []);
      
    } catch (error) {
      console.error('❌ Failed to fetch compliance documents:', error);
      res.status(500).json({ error: 'Failed to fetch compliance documents' });
    }
  }));

  // Upload compliance document
  app.post('/api/compliance/upload', 
    authenticateWithSupabase,
    generalApiRateLimit,
    upload.single('documentFile'),
    asyncHandler(async (req: SupabaseAuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const file = req.file;
        const { type, name, expiryDate, status } = req.body;

        if (!file && !req.body.documentUrl) {
          return res.status(400).json({ error: 'File or document URL is required' });
        }

        console.log('📄 Processing compliance document upload:', {
          userId,
          type,
          name,
          fileSize: file?.size,
          fileName: file?.originalname
        });

        let documentUrl = req.body.documentUrl || '';

        // If file is uploaded, handle file storage
        if (file) {
          // For now, we'll store the file metadata only
          // In a full implementation, you'd upload to cloud storage here
          documentUrl = `uploaded-${Date.now()}-${file.originalname}`;
          
          // TODO: Implement actual file storage to cloud service
          console.log('📁 File upload simulated - implement cloud storage integration');
        }

        // Create compliance document record
        const complianceData = {
          userId,
          type: type || 'other',
          name: name || file?.originalname || 'Unnamed Document',
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          status: status || 'valid',
          documentUrl
        };

        const newDocument = await storage.createComplianceDocument(complianceData);
        
        console.log(`✅ Created compliance document #${newDocument.id} for user ${userId}`);
        res.status(201).json(newDocument);
        
      } catch (error: any) {
        console.error('❌ Failed to upload compliance document:', error);
        res.status(500).json({ 
          error: 'Failed to upload compliance document',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    })
  );

  // Update compliance document
  app.patch('/api/compliance/:id', 
    authenticateWithSupabase,
    generalApiRateLimit,
    asyncHandler(async (req: SupabaseAuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const documentId = parseInt(req.params.id);
        
        // Verify ownership
        const existingDocument = await storage.getComplianceDocument(documentId);
        if (!existingDocument || existingDocument.userId !== userId) {
          return res.status(404).json({ error: 'Compliance document not found' });
        }

        const updatedDocument = await storage.updateComplianceDocument(documentId, req.body, userId);
        console.log(`✅ Updated compliance document #${documentId} for user ${userId}`);
        
        res.json(updatedDocument);
        
      } catch (error) {
        console.error('❌ Failed to update compliance document:', error);
        res.status(500).json({ error: 'Failed to update compliance document' });
      }
    })
  );

  // Delete compliance document
  app.delete('/api/compliance/:id', 
    authenticateWithSupabase,
    generalApiRateLimit,
    asyncHandler(async (req: SupabaseAuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const documentId = parseInt(req.params.id);
        
        // Verify ownership
        const existingDocument = await storage.getComplianceDocument(documentId);
        if (!existingDocument || existingDocument.userId !== userId) {
          return res.status(404).json({ error: 'Compliance document not found' });
        }

        await storage.deleteComplianceDocument(documentId, userId);
        console.log(`✅ Deleted compliance document #${documentId} for user ${userId}`);
        
        res.json({ success: true });
        
      } catch (error) {
        console.error('❌ Failed to delete compliance document:', error);
        res.status(500).json({ error: 'Failed to delete compliance document' });
      }
    })
  );

  console.log('✅ Compliance routes configured');
}