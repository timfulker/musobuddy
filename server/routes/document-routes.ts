import { Router } from 'express';
import multer from 'multer';
import { storage } from '../core/storage';
import { uploadDocumentToR2, deleteDocumentFromR2, generateDocumentDownloadUrl } from '../core/document-storage';
import { insertBookingDocumentSchema, uploadDocumentSchema } from '../../shared/document-schemas';
import { authenticate, type AuthenticatedRequest } from '../middleware/supabase-only-auth';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common document types
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/gif'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'));
    }
  }
});

// Get documents for a booking
router.get('/bookings/:bookingId/documents', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const bookingId = parseInt(req.params.bookingId);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (isNaN(bookingId)) {
      return res.status(400).json({ error: 'Invalid booking ID' });
    }

    // Verify user owns the booking
    const booking = await storage.getBookingByIdAndUser(bookingId, userId);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const documents = await storage.getBookingDocuments(bookingId, userId);
    res.json(documents);

  } catch (error: any) {
    console.error('❌ Error fetching booking documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Upload document for a booking
router.post('/bookings/:bookingId/documents/upload', authenticate, upload.single('document'), async (req: AuthenticatedRequest, res) => {
  try {
    const bookingId = parseInt(req.params.bookingId);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (isNaN(bookingId)) {
      return res.status(400).json({ error: 'Invalid booking ID' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Verify user owns the booking
    const booking = await storage.getBookingByIdAndUser(bookingId, userId);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Validate request body
    const validationResult = uploadDocumentSchema.safeParse({
      bookingId,
      documentType: req.body.documentType || 'other'
    });

    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Invalid request data',
        details: validationResult.error.errors
      });
    }

    // Upload file to Cloudflare R2
    const uploadResult = await uploadDocumentToR2(
      userId,
      bookingId,
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    if (!uploadResult.success) {
      return res.status(500).json({ 
        error: uploadResult.error || 'Failed to upload document'
      });
    }

    // Save document record to database
    const documentData = {
      bookingId,
      userId,
      documentType: validationResult.data.documentType,
      documentName: req.file.originalname,
      documentUrl: uploadResult.documentUrl!,
      documentKey: uploadResult.documentKey!,
    };

    const document = await storage.addBookingDocument(documentData);
    
    console.log(`✅ Document uploaded successfully for booking ${bookingId}: ${req.file.originalname}`);
    res.status(201).json(document);

  } catch (error: any) {
    console.error('❌ Error uploading document:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// Delete a document
router.delete('/bookings/:bookingId/documents/:documentId', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const bookingId = parseInt(req.params.bookingId);
    const documentId = parseInt(req.params.documentId);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (isNaN(bookingId) || isNaN(documentId)) {
      return res.status(400).json({ error: 'Invalid booking or document ID' });
    }

    // Verify user owns the booking
    const booking = await storage.getBookingByIdAndUser(bookingId, userId);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Get document details before deletion
    const document = await storage.getBookingDocument(documentId, userId);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Verify document belongs to this booking
    if (document.bookingId !== bookingId) {
      return res.status(400).json({ error: 'Document does not belong to this booking' });
    }

    // Delete from Cloudflare R2
    const deletedFromCloud = await deleteDocumentFromR2(document.documentKey);
    if (!deletedFromCloud) {
      console.warn(`⚠️ Failed to delete document from R2: ${document.documentKey}`);
    }

    // Delete from database
    const deletedFromDb = await storage.deleteBookingDocument(documentId, userId);
    if (!deletedFromDb) {
      return res.status(500).json({ error: 'Failed to delete document from database' });
    }

    console.log(`✅ Document deleted successfully: ${document.documentName}`);
    res.json({ success: true, message: 'Document deleted successfully' });

  } catch (error: any) {
    console.error('❌ Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// Download/view a document
router.get('/bookings/:bookingId/documents/:documentId/download', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const bookingId = parseInt(req.params.bookingId);
    const documentId = parseInt(req.params.documentId);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (isNaN(bookingId) || isNaN(documentId)) {
      return res.status(400).json({ error: 'Invalid booking or document ID' });
    }

    // Verify user owns the booking
    const booking = await storage.getBookingByIdAndUser(bookingId, userId);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Get document details
    const document = await storage.getBookingDocument(documentId, userId);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Verify document belongs to this booking
    if (document.bookingId !== bookingId) {
      return res.status(400).json({ error: 'Document does not belong to this booking' });
    }

    // Generate signed download URL
    const downloadUrl = await generateDocumentDownloadUrl(document.documentKey);
    if (!downloadUrl) {
      return res.status(500).json({ error: 'Failed to generate download URL' });
    }

    res.json({ 
      downloadUrl,
      documentName: document.documentName,
      documentType: document.documentType
    });

  } catch (error: any) {
    console.error('❌ Error generating download URL:', error);
    res.status(500).json({ error: 'Failed to generate download URL' });
  }
});

export default router;