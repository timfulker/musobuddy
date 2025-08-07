import { type Express } from "express";
import { storage } from "../core/storage";
import { EmailService } from "../core/services";
import { requireAuth } from '../middleware/auth';
import { requireSubscriptionOrAdmin } from '../core/subscription-middleware';

export function registerInvoiceRoutes(app: Express) {
  console.log('💰 Setting up invoice routes...');

  // Public invoice view
  app.get('/view/invoices/:id', async (req: any, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      console.log(`📄 Public invoice view request for ID: ${invoiceId}`);
      
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice) {
        return res.status(404).send(`
          <html>
            <head><title>Invoice Not Found</title></head>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h1>Invoice Not Found</h1>
              <p>The requested invoice could not be found.</p>
            </body>
          </html>
        `);
      }
      
      // Redirect to Cloudflare R2 URL if available
      if (invoice.cloudStorageUrl) {
        console.log(`📄 Redirecting to R2: ${invoice.cloudStorageUrl}`);
        return res.redirect(invoice.cloudStorageUrl);
      }
      
      // Fallback: Generate PDF on demand
      console.log('⚠️ No R2 URL, generating PDF on demand...');
      const userSettings = await storage.getSettings(invoice.userId);
      const { generateInvoicePDF } = await import('../core/invoice-pdf-generator');
      const pdfBuffer = await generateInvoicePDF(invoice, userSettings);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="Invoice-${invoice.invoiceNumber}.pdf"`);
      res.send(pdfBuffer);
      
    } catch (error) {
      console.error('❌ Failed to view invoice:', error);
      res.status(500).send(`
        <html>
          <head><title>Invoice Error</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1>Error Loading Invoice</h1>
            <p>We're working to resolve this issue. Please try again later.</p>
          </body>
        </html>
      `);
    }
  });

  // Get all invoices for authenticated user (requires subscription)
  app.get('/api/invoices', requireAuth, requireSubscriptionOrAdmin, async (req: any, res) => {
    try {
      const userId = req.user.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const invoices = await storage.getInvoices(userId);
      console.log(`✅ Retrieved ${invoices.length} invoices for user ${userId}`);
      res.json(invoices);
    } catch (error) {
      console.error('❌ Failed to fetch invoices:', error);
      res.status(500).json({ error: 'Failed to fetch invoices' });
    }
  });

  // Create new invoice (requires subscription)
  app.post('/api/invoices', requireAuth, requireSubscriptionOrAdmin, async (req: any, res) => {
    try {
      const userId = req.user.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      if (!req.body.clientName || !req.body.amount || !req.body.dueDate) {
        return res.status(400).json({ 
          error: 'Missing required fields: clientName, amount, and dueDate are required' 
        });
      }

      // Generate sequential invoice number
      let invoiceNumber = req.body.invoiceNumber;
      
      if (!invoiceNumber) {
        const userSettings = await storage.getSettings(userId);
        const nextNumber = userSettings?.nextInvoiceNumber || 1;
        
        invoiceNumber = `INV-${String(nextNumber).padStart(3, '0')}`;
        
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
        eventDate: req.body.performanceDate ? new Date(req.body.performanceDate) : null,
        fee: req.body.performanceFee || req.body.fee || null,
        depositPaid: req.body.depositPaid || "0",
        amount: req.body.amount,
        dueDate: new Date(req.body.dueDate),
        status: req.body.status || 'draft'
      };
      
      const newInvoice = await storage.createInvoice(invoiceData);
      
      // Generate PDF and upload to cloud immediately
      try {
        const userSettings = await storage.getSettings(userId);
        const { uploadInvoiceToCloud } = await import('../core/cloud-storage');
        const uploadResult = await uploadInvoiceToCloud(newInvoice, userSettings);
        
        if (uploadResult.success && uploadResult.url) {
          const updatedInvoice = await storage.updateInvoice(newInvoice.id, {
            cloudStorageUrl: uploadResult.url,
            cloudStorageKey: uploadResult.key
          }, userId);
          
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
  app.patch('/api/invoices/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.userId;
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
      
      const updatedInvoice = await storage.updateInvoice(invoiceId, req.body, userId);
      res.json(updatedInvoice);
      
    } catch (error: any) {
      console.error('❌ Update invoice error:', error);
      res.status(500).json({ 
        error: 'Failed to update invoice',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Delete invoice
  app.delete('/api/invoices/:id', requireAuth, async (req: any, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const userId = req.user.userId;
      
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
      
      await storage.deleteInvoice(invoiceId, userId);
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

  // Bulk delete invoices
  app.post('/api/invoices/bulk-delete', requireAuth, async (req: any, res) => {
    try {
      const { invoiceIds } = req.body;
      const userId = req.user.userId;
      
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
          
          const invoice = await storage.getInvoice(invoiceId);
          if (!invoice) {
            errors.push({ id: invoiceId, error: 'Not found' });
            continue;
          }
          
          if (invoice.userId !== userId) {
            errors.push({ id: invoiceId, error: 'Access denied' });
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

  // Send invoice via email
  app.post('/api/invoices/send-email', requireAuth, async (req: any, res) => {
    try {
      const { invoiceId, customMessage } = req.body;
      const parsedInvoiceId = parseInt(invoiceId);
      const userId = req.user.userId;
      
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
          await storage.updateInvoice(parsedInvoiceId, {
            cloudStorageUrl: uploadResult.url,
            cloudStorageKey: uploadResult.key
          }, userId);
          pdfUrl = uploadResult.url;
        } else {
          throw new Error('Failed to upload invoice to cloud storage');
        }
      }
      
      // Update invoice status to sent
      await storage.updateInvoice(parsedInvoiceId, {
        status: 'sent',
        updatedAt: new Date()
      }, userId);
      
      // Send email
      const emailService = new EmailService();
      const subject = `Invoice ${invoice.invoiceNumber} - Payment Due`;
      
      try {
        // Generate invoice email HTML using the service method
        const emailHtml = emailService.generateInvoiceEmailHTML(invoice, userSettings, pdfUrl);
        
        // Add custom message if provided
        const finalEmailHtml = customMessage ? 
          emailHtml.replace('<p>Please find your invoice attached.</p>', 
                           `<p>${customMessage}</p><p>Please find your invoice attached.</p>`) : 
          emailHtml;
        
        // Send email using the general sendEmail method
        const emailResult = await emailService.sendEmail({
          to: invoice.clientEmail,
          subject: subject,
          html: finalEmailHtml
        });
        
        if (emailResult.success) {
          console.log(`✅ Invoice email sent successfully for invoice ${invoiceId}`);
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
  app.post('/api/invoices/:id/mark-paid', requireAuth, async (req: any, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const userId = req.user.userId;
      
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
  app.get('/api/invoices/:id/view', requireAuth, async (req: any, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const userId = req.user.userId;
      
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

  console.log('✅ Invoice routes configured');
}