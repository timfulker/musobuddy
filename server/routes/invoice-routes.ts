import { type Express } from "express";
import { storage } from "../core/storage";
import { EmailService } from "../core/services";
import { authenticate, type AuthenticatedRequest } from '../middleware/supabase-only-auth';
import { safeDbCall, developmentFallbacks } from '../utils/development-helpers';
import { requireSubscriptionOrAdmin } from '../core/subscription-middleware';
import { generateInvoicePDF } from '../core/invoice-pdf-generator';
import { uploadInvoiceToCloud } from '../core/cloud-storage';

export function registerInvoiceRoutes(app: Express) {
  console.log('💰 Setting up invoice routes...');

  // Public invoice viewing endpoint - no authentication required
  app.get('/api/public/invoice/:token', async (req: AuthenticatedRequest, res) => {
    try {
      const { token } = req.params;
      console.log(`🔍 Looking up public invoice with token: ${token}`);
      
      const invoice = await safeDbCall(() => storage.getInvoiceByToken(token), null, 'getInvoiceByToken');
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      
      // Get user settings for business info
      const userSettings = await safeDbCall(() => storage.getSettings(invoice.userId), null, 'getSettings');
      
      // Return only necessary public information including bank details
      const publicInvoice = {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        clientName: invoice.clientName,
        amount: invoice.amount,
        dueDate: invoice.dueDate,
        status: invoice.status,
        cloudStorageUrl: invoice.cloudStorageUrl,
        businessName: userSettings?.businessName || 'MusoBuddy User',
        businessEmail: userSettings?.businessEmail,
        bankDetails: userSettings?.bankDetails ? JSON.parse(userSettings.bankDetails) : null
      };
      
      console.log(`✅ Retrieved public invoice ${invoice.invoiceNumber} for client ${invoice.clientName}`);
      res.json(publicInvoice);
    } catch (error) {
      console.error('❌ Failed to fetch public invoice:', error);
      res.status(500).json({ error: 'Failed to load invoice' });
    }
  });

  // Manual payment status update endpoint (for bank transfer payments)
  app.post('/api/invoice/:id/mark-paid', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const userId = req.user.id;
      
      // Verify invoice ownership
      const invoice = await safeDbCall(() => storage.getInvoice(invoiceId), null, 'getInvoice');
      if (!invoice || invoice.userId !== userId) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      if (invoice.status === 'paid') {
        return res.status(400).json({ error: 'Invoice already marked as paid' });
      }

      console.log(`✅ Manually marking invoice ${invoice.invoiceNumber} as paid`);
      
      // Mark invoice as paid
      await safeDbCall(() => storage.updateInvoice(invoiceId, userId, { status: 'paid' }), null, 'updateInvoice');
      
      // Get user settings for PDF generation
      const userSettings = await safeDbCall(() => storage.getSettings(userId), null, 'getSettings');
      if (userSettings) {
        // Regenerate PDF with PAID status
        const paidInvoiceData = { ...invoice, status: 'paid', paidAt: new Date() };
        
        // Upload updated PDF to cloud storage
        const uploadResult = await uploadInvoiceToCloud(paidInvoiceData, userSettings);
        
        if (uploadResult.success) {
          console.log(`✅ PDF regenerated and uploaded with PAID status: ${uploadResult.url}`);
        }
      }
      
      console.log(`✅ Invoice ${invoice.invoiceNumber} marked as paid successfully`);
      res.json({ success: true, message: 'Invoice marked as paid' });
    } catch (error: any) {
      console.error('❌ Error marking invoice as paid:', error);
      res.status(500).json({ error: 'Failed to update invoice status' });
    }
  });



  // REMOVED: MusoBuddy invoice view endpoint - files are viewed directly on R2
  // Security is handled through random tokens in the R2 URL paths

  // Get all invoices for authenticated user
  app.get('/api/invoices', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const invoices = await safeDbCall(() => storage.getInvoices(userId), [], 'getInvoices');
      console.log(`✅ Retrieved ${invoices.length} invoices for user ${userId}`);
      res.json(invoices);
    } catch (error) {
      console.error('❌ Failed to fetch invoices:', error);
      // Return development fallback
      res.json(developmentFallbacks.invoices);
    }
  });

  // Create new invoice
  app.post('/api/invoices', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      if (!req.body.clientName || !req.body.amount || !req.body.dueDate) {
        return res.status(400).json({ 
          error: 'Missing required fields: clientName, amount, and dueDate are required' 
        });
      }

      // Generate sequential invoice number with custom prefix
      let invoiceNumber = req.body.invoiceNumber;
      
      if (!invoiceNumber) {
        const userSettings = await storage.getSettings(userId);
        const nextNumber = userSettings?.nextInvoiceNumber || 1;
        
        // Use custom prefix if set, otherwise generate from business name or user email
        let prefix = userSettings?.invoicePrefix;
        
        if (!prefix) {
          // Auto-generate prefix from business name or email
          if (userSettings?.businessName) {
            // Take first letters of business name (e.g., "Jake Stanley Music" -> "JSM")
            prefix = userSettings.businessName
              .split(' ')
              .map((word: string) => word[0])
              .join('')
              .toUpperCase()
              .slice(0, 3);
          } else {
            // Use first 3 letters of email username
            const email = req.user?.email || '';
            prefix = email.split('@')[0].slice(0, 3).toUpperCase();
          }
          
          // If still no prefix, use a random 3-letter code
          if (!prefix || prefix.length < 2) {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            prefix = Array(3).fill(0).map(() => chars[Math.floor(Math.random() * 26)]).join('');
          }
        }
        
        // Create professional invoice number with custom prefix
        invoiceNumber = `${prefix}-${String(nextNumber).padStart(4, '0')}`;
        
        // Update next number for future invoices
        await storage.updateSettings(userId, {
          nextInvoiceNumber: nextNumber + 1
        });
      }

      const invoiceData = {
        userId: userId,
        invoiceNumber,
        contractId: req.body.contractId || null,
        bookingId: req.body.bookingId || null,
        clientName: req.body.clientName,
        clientEmail: req.body.clientEmail || null,
        ccEmail: req.body.ccEmail || null,
        clientAddress: req.body.clientAddress || null,
        venueAddress: req.body.venueAddress || null,
        eventDate: req.body.eventDate ? new Date(req.body.eventDate) : null,
        fee: req.body.performanceFee ? String(req.body.performanceFee) : (req.body.fee ? String(req.body.fee) : null),
        depositPaid: req.body.depositPaid ? String(req.body.depositPaid) : "0",
        amount: String(req.body.amount),
        dueDate: new Date(req.body.dueDate),
        status: req.body.status || 'draft',
        performanceDuration: req.body.performanceDuration || null,
        gigType: req.body.gigType || null,
        invoiceType: req.body.invoiceType || 'performance',
        description: req.body.description || null
      };
      
      const newInvoice = await storage.createInvoice(invoiceData);
      
      // Generate PDF and upload to cloud immediately
      try {
        const userSettings = await storage.getSettings(userId);
        const { uploadInvoiceToCloud } = await import('../core/cloud-storage');
        const uploadResult = await uploadInvoiceToCloud(newInvoice, userSettings);
        
        if (uploadResult.success && uploadResult.url) {
          const updatedInvoice = await storage.updateInvoice(newInvoice.id, userId, {
            cloudStorageUrl: uploadResult.url,
            cloudStorageKey: uploadResult.key
          });
          
          res.json(updatedInvoice);
        } else {
          console.warn('⚠️ PDF upload failed:', uploadResult.error);
          res.json(newInvoice);
        }
      } catch (pdfError) {
        console.error('⚠️ PDF generation failed:', pdfError);
        res.json(newInvoice);
      }
      
    } catch (error: any) {
      console.error('❌ Failed to create invoice:', error);
      res.status(500).json({ 
        error: 'Failed to create invoice',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Update invoice
  app.patch('/api/invoices/:id', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const invoiceId = parseInt(req.params.id);
      if (!invoiceId) {
        return res.status(400).json({ error: 'Invalid invoice ID' });
      }
      
      const existingInvoice = await storage.getInvoice(invoiceId);
      
      if (!existingInvoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      
      if (existingInvoice.userId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const updatedInvoice = await storage.updateInvoice(invoiceId, userId, req.body);
      
      // Regenerate PDF with updated data and upload to cloud
      try {
        console.log(`🔄 Regenerating PDF for updated invoice #${invoiceId}...`);
        const userSettings = await storage.getSettings(userId);
        const { uploadInvoiceToCloud } = await import('../core/cloud-storage');
        const uploadResult = await uploadInvoiceToCloud(updatedInvoice, userSettings);
        
        if (uploadResult.success && uploadResult.url) {
          const finalInvoice = await storage.updateInvoice(invoiceId, userId, {
            cloudStorageUrl: uploadResult.url,
            cloudStorageKey: uploadResult.key
          });
          
          console.log(`✅ Invoice #${invoiceId} PDF regenerated with updated data`);
          
          // 🚫 INVOICES ARE IMMUTABLE: No sync from invoice updates back to booking
          // Invoices are financial documents and cannot propagate changes back to bookings.
          console.log(`⚖️ Invoice immutability enforced - invoice ${invoiceId} updates will not affect linked bookings`);
          
          res.json(finalInvoice);
        } else {
          console.warn('⚠️ PDF regeneration failed, returning invoice with database updates only:', uploadResult.error);
          
          // 🚫 INVOICES ARE IMMUTABLE: No sync from invoice updates back to booking
          // Invoices are financial documents and cannot propagate changes back to bookings.
          console.log(`⚖️ Invoice immutability enforced - invoice ${invoiceId} updates will not affect linked bookings`);
          
          res.json(updatedInvoice);
        }
      } catch (pdfError) {
        console.error('⚠️ PDF regeneration failed:', pdfError);
        res.json(updatedInvoice);
      }
      
    } catch (error: any) {
      console.error('❌ Update invoice error:', error);
      res.status(500).json({ 
        error: 'Failed to update invoice',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Delete invoice
  app.delete('/api/invoices/:id', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const userId = req.user.id;
      
      console.log(`🗑️ Delete request for invoice #${invoiceId} by user ${userId}`);
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      if (isNaN(invoiceId)) {
        return res.status(400).json({ error: 'Invalid invoice ID' });
      }
      
      // Use getInvoiceByIdAndUser to check both existence and ownership in one query
      const invoice = await storage.getInvoiceByIdAndUser(invoiceId, userId);
      if (!invoice) {
        // Check if invoice exists at all (for better error message)
        const existingInvoice = await storage.getInvoice(invoiceId);
        if (!existingInvoice) {
          console.log(`❌ Invoice #${invoiceId} does not exist`);
          return res.status(404).json({ error: `Invoice #${invoiceId} not found` });
        } else {
          console.log(`❌ Invoice #${invoiceId} belongs to different user`);
          return res.status(403).json({ error: 'Access denied - invoice belongs to another user' });
        }
      }
      
      const deleted = await storage.deleteInvoice(invoiceId, userId);
      if (!deleted) {
        console.log(`⚠️ Invoice #${invoiceId} may have already been deleted`);
        return res.status(404).json({ error: 'Invoice already deleted or not found' });
      }
      
      console.log(`✅ Deleted invoice #${invoiceId} for user ${userId}`);
      res.json({ success: true });
      
    } catch (error: any) {
      console.error('❌ Failed to delete invoice:', error);
      res.status(500).json({ 
        error: 'Failed to delete invoice',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Get invoice PDF
  app.get('/api/invoices/:id/pdf', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const userId = req.user.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      if (isNaN(invoiceId)) {
        return res.status(400).json({ error: 'Invalid invoice ID' });
      }

      const invoice = await storage.getInvoiceByIdAndUser(invoiceId, userId);
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      const userSettings = await storage.getSettings(userId);
      console.log('📄 Generating PDF for invoice:', invoice.invoiceNumber);
      console.log('📋 User settings invoice clauses:', userSettings?.invoiceClauses);
      console.log('📝 User custom invoice clauses:', userSettings?.customInvoiceClauses);
      
      const { generateInvoicePDF } = await import('../core/invoice-pdf-generator');
      const pdfBuffer = await generateInvoicePDF(invoice, userSettings);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="Invoice-${invoice.invoiceNumber}.pdf"`);
      res.setHeader('Cache-Control', 'no-cache'); // Don't cache to ensure fresh clauses
      res.send(pdfBuffer);
      
    } catch (error) {
      console.error('❌ Failed to generate invoice PDF:', error);
      res.status(500).json({ error: 'Failed to generate invoice PDF' });
    }
  });

  // Download invoice PDF
  app.get('/api/invoices/:id/download', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const userId = req.user.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      if (isNaN(invoiceId)) {
        return res.status(400).json({ error: 'Invalid invoice ID' });
      }

      const invoice = await storage.getInvoiceByIdAndUser(invoiceId, userId);
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      const userSettings = await storage.getSettings(userId);
      const { generateInvoicePDF } = await import('../core/invoice-pdf-generator');
      const pdfBuffer = await generateInvoicePDF(invoice, userSettings);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Invoice-${invoice.invoiceNumber}.pdf"`);
      res.send(pdfBuffer);
      
    } catch (error) {
      console.error('❌ Failed to download invoice PDF:', error);
      res.status(500).json({ error: 'Failed to download invoice PDF' });
    }
  });

  // Bulk delete invoices
  app.post('/api/invoices/bulk-delete', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { invoiceIds } = req.body;
      const userId = req.user.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      if (!Array.isArray(invoiceIds) || invoiceIds.length === 0) {
        return res.status(400).json({ error: 'Invoice IDs array is required' });
      }
      
      let deletedCount = 0;
      const errors: any[] = [];
      
      for (const id of invoiceIds) {
        try {
          const invoiceId = parseInt(id);
          if (isNaN(invoiceId)) {
            errors.push({ id, error: 'Invalid ID format' });
            continue;
          }
          
          // Use getInvoiceByIdAndUser to check both existence and ownership
          const invoice = await storage.getInvoiceByIdAndUser(invoiceId, userId);
          if (!invoice) {
            // Check if invoice exists at all for better error message
            const existingInvoice = await storage.getInvoice(invoiceId);
            if (!existingInvoice) {
              errors.push({ id: invoiceId, error: 'Not found' });
            } else {
              errors.push({ id: invoiceId, error: 'Access denied' });
            }
            continue;
          }
          
          await storage.deleteInvoice(invoiceId, userId);
          deletedCount++;
        } catch (error: any) {
          errors.push({ id, error: error.message });
        }
      }
      
      console.log(`✅ Bulk deleted ${deletedCount} invoices for user ${userId}`);
      res.json({ 
        success: true, 
        deletedCount,
        errors: errors.length > 0 ? errors : undefined
      });
      
    } catch (error: any) {
      console.error('❌ Failed to bulk delete invoices:', error);
      res.status(500).json({ 
        error: 'Failed to bulk delete invoices',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Send invoice via email (with enhanced mobile debugging)
  app.post('/api/invoices/send-email', (req: any, res, next) => {
    console.log('🚨 MOBILE DEBUG - Invoice send request received');
    console.log('🚨 Authorization header:', req.headers.authorization ? 'Present' : 'Missing');
    console.log('🚨 X-Auth-Token header:', req.headers['x-auth-token'] ? 'Present' : 'Missing');
    console.log('🚨 All headers:', Object.keys(req.headers));
    
    // Call the Supabase auth middleware
    authenticate(req, res, next);
  }, async (req: SupabaseAuthenticatedRequest, res) => {
    try {
      const { invoiceId, customMessage } = req.body;
      const parsedInvoiceId = parseInt(invoiceId);
      const userId = req.user.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      if (isNaN(parsedInvoiceId)) {
        return res.status(400).json({ error: 'Invalid invoice ID' });
      }
      
      const invoice = await storage.getInvoice(parsedInvoiceId);
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      
      if (invoice.userId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      if (!invoice.clientEmail) {
        return res.status(400).json({ error: 'No client email address on file' });
      }
      
      const userSettings = await storage.getSettings(userId);
      if (!userSettings) {
        return res.status(404).json({ error: 'User settings not found' });
      }
      
      // Generate R2 URL if not already done
      let pdfUrl = invoice.cloudStorageUrl;
      if (!pdfUrl) {
        const { uploadInvoiceToCloud } = await import('../core/cloud-storage');
        const uploadResult = await uploadInvoiceToCloud(invoice, userSettings);
        
        if (uploadResult.success && uploadResult.url) {
          await storage.updateInvoice(parsedInvoiceId, userId, {
            cloudStorageUrl: uploadResult.url,
            cloudStorageKey: uploadResult.key
          });
          pdfUrl = uploadResult.url;
        } else {
          throw new Error('Failed to upload invoice to cloud storage');
        }
      }
      
      // Update invoice status to sent
      await storage.updateInvoice(parsedInvoiceId, userId, {
        status: 'sent',
        updatedAt: new Date()
      });
      
      // Send email
      const emailService = new EmailService();
      const subject = `Invoice ${invoice.invoiceNumber} - Payment Due`;
      
      try {
        // SECURITY: Use direct R2 URL with random token for security through obscurity
        console.log(`🔗 Using direct R2 URL for invoice email: ${pdfUrl}`);
        
        // Generate invoice email HTML using the service method
        const emailHtml = emailService.generateInvoiceEmailHTML(invoice, userSettings, pdfUrl);
        
        // Add custom message if provided
        const finalEmailHtml = customMessage ? 
          emailHtml.replace('<p>Please find your invoice attached.</p>', 
                           `<p>${customMessage}</p><p>Please find your invoice attached.</p>`) : 
          emailHtml;
        
        // Build email data with optional CC for invoices
        const emailData: any = {
          to: invoice.clientEmail,
          subject: subject,
          html: finalEmailHtml
        };

        // Add CC recipient if specified (invoices only - contracts remain single-recipient)
        if (invoice.ccEmail && invoice.ccEmail.trim()) {
          emailData.cc = invoice.ccEmail.trim();
          console.log(`📧 Including CC recipient: ${emailData.cc}`);
        }

        // Send email using the general sendEmail method
        const emailResult = await emailService.sendEmail(emailData);
        
        if (emailResult.success) {
          console.log(`✅ Invoice email sent successfully for invoice ${invoiceId}`);
          
          // 🎯 Track invoice email in conversation history
          try {
            // Import database components
            const { db } = await import('../core/db');
            const { clientCommunications } = await import('../../shared/schema');
            
            console.log(`📧 Attempting to track invoice email for booking ${invoice.bookingId}`);
            console.log(`📧 Invoice details:`, {
              userId: userId,
              bookingId: invoice.bookingId,
              clientName: invoice.clientName,
              clientEmail: invoice.clientEmail,
              invoiceNumber: invoice.invoiceNumber
            });
            
            // Create conversation record for tracking
            const [communication] = await db.insert(clientCommunications).values({
              userId: userId,
              bookingId: invoice.bookingId || null,
              clientName: invoice.clientName,
              clientEmail: invoice.clientEmail,
              communicationType: 'email',
              direction: 'outbound',
              templateName: 'Invoice Email',
              templateCategory: 'invoice',
              subject: `Invoice ${invoice.invoiceNumber} - ${invoice.businessName || 'MusoBuddy'}`,
              messageBody: `Invoice sent - ${invoice.invoiceNumber}\n\nAmount Due: £${invoice.totalAmount}\nDue Date: ${new Date(invoice.dueDate).toLocaleDateString()}\n\nInvoice URL: ${invoice.cloudStorageUrl}\n\n${customMessage ? `Custom message: ${customMessage}` : ''}`,
              attachments: JSON.stringify([{
                name: `Invoice_${invoice.invoiceNumber}.pdf`,
                url: invoice.cloudStorageUrl,
                type: 'invoice_pdf'
              }]),
              deliveryStatus: 'sent',
              notes: 'Invoice email sent via MusoBuddy system'
            }).returning();
            
            console.log(`✅ Invoice email tracked successfully! Communication ID: ${communication.id} for booking ${invoice.bookingId}`);
          } catch (trackingError: any) {
            console.error(`❌ CRITICAL: Failed to track invoice email in conversation:`, {
              error: trackingError.message,
              stack: trackingError.stack,
              invoiceId: invoice.id,
              bookingId: invoice.bookingId,
              userId: userId
            });
            // Continue - email sending was successful even if tracking failed
          }
          
          res.json({ success: true, message: 'Invoice sent successfully' });
        } else {
          console.error('❌ Failed to send invoice email:', emailResult.error);
          res.status(500).json({ error: 'Failed to send invoice email' });
        }
        
      } catch (emailError) {
        console.error('❌ Failed to send invoice email:', emailError);
        res.status(500).json({ error: 'Failed to send invoice email' });
      }
      
    } catch (error: any) {
      console.error('❌ Failed to send invoice:', error);
      res.status(500).json({ 
        error: 'Failed to send invoice',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Mark invoice as paid
  app.post('/api/invoices/:id/mark-paid', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const userId = req.user.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      if (isNaN(invoiceId)) {
        return res.status(400).json({ error: 'Invalid invoice ID' });
      }
      
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      
      if (invoice.userId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const updatedInvoice = await storage.markInvoiceAsPaid(invoiceId, userId);
      console.log(`✅ Marked invoice #${invoiceId} as paid for user ${userId}`);
      res.json(updatedInvoice);
      
    } catch (error: any) {
      console.error('❌ Failed to mark invoice as paid:', error);
      res.status(500).json({ 
        error: 'Failed to mark invoice as paid',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Get individual invoice for viewing
  app.get('/api/invoices/:id/view', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const userId = req.user.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      if (isNaN(invoiceId)) {
        return res.status(400).json({ error: 'Invalid invoice ID' });
      }
      
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      
      if (invoice.userId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      res.json(invoice);
      
    } catch (error: any) {
      console.error('❌ Failed to view invoice:', error);
      res.status(500).json({ 
        error: 'Failed to view invoice',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Regenerate invoice PDF with current theme settings
  app.post('/api/invoices/:id/regenerate', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const userId = req.user.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      if (isNaN(invoiceId)) {
        return res.status(400).json({ error: 'Invalid invoice ID' });
      }
      
      console.log(`🔄 Regenerating PDF for invoice #${invoiceId} with current theme settings...`);
      
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      
      if (invoice.userId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Get current user settings (this will have the latest theme colors)
      const userSettings = await storage.getSettings(userId);
      console.log(`🎨 Regenerating with theme color: ${userSettings?.themeAccentColor || 'default'}`);
      
      // Regenerate PDF and upload to cloud with current theme
      const { uploadInvoiceToCloud } = await import('../core/cloud-storage');
      const uploadResult = await uploadInvoiceToCloud(invoice, userSettings);
      
      if (uploadResult.success && uploadResult.url) {
        const updatedInvoice = await storage.updateInvoice(invoiceId, userId, {
          cloudStorageUrl: uploadResult.url,
          cloudStorageKey: uploadResult.key,
          updatedAt: new Date()
        });
        
        console.log(`✅ Invoice #${invoiceId} PDF regenerated with current theme colors`);
        res.json({ 
          success: true, 
          message: 'Invoice PDF regenerated with current theme colors',
          invoice: updatedInvoice,
          newUrl: uploadResult.url
        });
      } else {
        throw new Error(`PDF regeneration failed: ${uploadResult.error}`);
      }
      
    } catch (error: any) {
      console.error('❌ Failed to regenerate invoice PDF:', error);
      res.status(500).json({ 
        error: 'Failed to regenerate invoice PDF',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });





  console.log('✅ Invoice routes configured');
}