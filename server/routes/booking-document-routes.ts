import { Request, Response, Router } from 'express';
import multer from 'multer';
import { nanoid } from 'nanoid';
import { db } from '../core/database';
import { bookings, bookingDocuments } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { uploadToCloudflareR2 } from '../core/cloud-storage';
import { authenticateWithFirebase, type AuthenticatedRequest } from '../middleware/firebase-auth';

const router = Router();

// Configure multer for file upload with 10MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    fieldSize: 10 * 1024 * 1024, // 10MB field size limit
  },
  fileFilter: (req, file, cb) => {
    console.log('📄 File upload filter - mimetype:', file.mimetype);
    // Only allow PDF files
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed') as any);
    }
  }
});

// Get all documents for a booking
router.get('/api/bookings/:bookingId/documents', authenticateWithFirebase, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { bookingId } = req.params;
    const userId = (req as any).user?.userId || (req.session as any)?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // Verify the booking belongs to the user
    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, parseInt(bookingId)))
      .limit(1);
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    if (booking.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Get all documents for this booking
    const documents = await db
      .select()
      .from(bookingDocuments)
      .where(eq(bookingDocuments.bookingId, parseInt(bookingId)))
      .orderBy(bookingDocuments.uploadedAt);
    
    res.json({
      success: true,
      documents
    });
    
  } catch (error: any) {
    console.error('❌ Error fetching booking documents:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to fetch documents' 
    });
  }
});

// Upload document for a booking
router.post('/api/bookings/:bookingId/documents', 
  authenticateWithFirebase,  // Use Firebase auth middleware
  upload.single('document'), 
  async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    const { documentType = 'other' } = req.body;
    const userId = (req as any).user?.userId || (req.session as any)?.userId;
    
    console.log(`📄 Processing upload - userId: ${userId}, bookingId: ${bookingId}, type: ${documentType}`);
    console.log(`📄 File received:`, req.file ? `${req.file.originalname} (${req.file.size} bytes)` : 'No file');
    
    if (!userId) {
      console.error('❌ Upload failed: Not authenticated after checking all sources');
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    if (!req.file) {
      console.error('❌ Upload failed: No file provided');
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Verify the booking belongs to the user
    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, parseInt(bookingId)))
      .limit(1);
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    if (booking.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Check document limit (max 5 per booking)
    const existingDocuments = await db
      .select()
      .from(bookingDocuments)
      .where(eq(bookingDocuments.bookingId, parseInt(bookingId)));
    
    if (existingDocuments.length >= 5) {
      return res.status(400).json({ error: 'Maximum of 5 documents allowed per booking' });
    }
    
    console.log(`📄 Uploading document for booking ${bookingId}...`);
    
    // Create storage key with date folder structure
    const uploadDate = new Date();
    const dateFolder = uploadDate.toISOString().split('T')[0];
    const securityToken = nanoid(16);
    const originalName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `booking-${bookingId}-${documentType}-${securityToken}-${originalName}`;
    const storageKey = `booking-documents/${dateFolder}/${filename}`;
    
    // Upload to R2
    const uploadResult = await uploadToCloudflareR2(
      req.file.buffer,
      storageKey,
      'application/pdf',
      {
        'booking-id': bookingId,
        'user-id': userId,
        'document-type': documentType,
        'original-name': req.file.originalname,
        'upload-date': uploadDate.toISOString()
      }
    );
    
    if (!uploadResult.success) {
      console.error('❌ Failed to upload document to R2:', uploadResult.error);
      return res.status(500).json({ error: 'Failed to upload document' });
    }
    
    // Save document to database
    const [newDocument] = await db
      .insert(bookingDocuments)
      .values({
        bookingId: parseInt(bookingId),
        userId,
        documentType,
        documentName: req.file.originalname,
        documentUrl: uploadResult.url!,
        documentKey: uploadResult.key!,
      })
      .returning();
    
    console.log(`✅ Document uploaded successfully for booking ${bookingId}`);
    
    res.json({
      success: true,
      document: newDocument
    });
    
  } catch (error: any) {
    console.error('❌ Error uploading booking document:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to upload document' 
    });
  }
});

// Get document info for a booking
router.get('/api/bookings/:bookingId/document', authenticateWithFirebase, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { bookingId } = req.params;
    const userId = (req as any).user?.userId || (req.session as any)?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // Get booking with document info
    const [booking] = await db
      .select({
        documentUrl: bookings.documentUrl,
        documentName: bookings.documentName,
        documentUploadedAt: bookings.documentUploadedAt,
        userId: bookings.userId
      })
      .from(bookings)
      .where(eq(bookings.id, parseInt(bookingId)))
      .limit(1);
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    if (booking.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    if (!booking.documentUrl) {
      return res.status(404).json({ error: 'No document uploaded for this booking' });
    }
    
    res.json({
      success: true,
      documentUrl: booking.documentUrl,
      documentName: booking.documentName,
      uploadedAt: booking.documentUploadedAt
    });
    
  } catch (error: any) {
    console.error('❌ Error fetching booking document:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to fetch document' 
    });
  }
});

// Delete document from a booking
router.delete('/api/bookings/:bookingId/document', authenticateWithFirebase, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { bookingId } = req.params;
    const userId = (req as any).user?.userId || (req.session as any)?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // Verify the booking belongs to the user
    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, parseInt(bookingId)))
      .limit(1);
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    if (booking.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Clear document fields from the booking
    await db
      .update(bookings)
      .set({
        documentUrl: null,
        documentKey: null,
        documentName: null,
        documentUploadedAt: null,
        updatedAt: new Date()
      })
      .where(eq(bookings.id, parseInt(bookingId)));
    
    console.log(`✅ Document removed from booking ${bookingId}`);
    
    res.json({
      success: true,
      message: 'Document removed successfully'
    });
    
  } catch (error: any) {
    console.error('❌ Error deleting booking document:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to delete document' 
    });
  }
});

// Delete a specific document
router.delete('/api/documents/:documentId', authenticateWithFirebase, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { documentId } = req.params;
    const userId = (req as any).user?.userId || (req.session as any)?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // Get the document to verify ownership
    const [document] = await db
      .select()
      .from(bookingDocuments)
      .where(eq(bookingDocuments.id, parseInt(documentId)))
      .limit(1);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    if (document.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Delete the document from database
    await db
      .delete(bookingDocuments)
      .where(eq(bookingDocuments.id, parseInt(documentId)));
    
    console.log(`✅ Document ${documentId} deleted successfully`);
    
    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
    
  } catch (error: any) {
    console.error('❌ Error deleting document:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to delete document' 
    });
  }
});

// Error handling middleware for multer
router.use((error: any, req: Request, res: Response, next: any) => {
  if (error instanceof multer.MulterError) {
    console.error('❌ Multer error:', error.message);
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
    return res.status(400).json({ error: error.message });
  } else if (error) {
    console.error('❌ Upload error:', error.message);
    return res.status(400).json({ error: error.message || 'Upload failed' });
  }
  next();
});

export default router;