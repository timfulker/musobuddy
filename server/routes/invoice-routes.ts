import { type Express } from "express";
import { storage } from "../core/storage";
import { EmailService } from "../core/services";
import { requireAuth } from '../middleware/auth';

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

  // Get all invoices for authenticated user
  app.get('/api/invoices', requireAuth, async (req: any, res) => {
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

  // Create new invoice
  app.post('/api/invoices', requireAuth, async (req: any, res) => {
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
      
      // Generate PDF immediately
      try {
        const userSettings = await storage.getSettings(userId);
        const { uploadInvoiceToCloud } = await import('../core/cloud-storage');
        const { url, key } = await uploadInvoiceToCloud(newInvoice, userSettings);
        
        const updatedInvoice = await storage.updateInvoice(newInvoice.id, {
          cloudStorageUrl: url,
          cloudStorageKey: key
        });
        
        res.json(updatedInvoice);
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
      
      const existingInvoice = await storage.getInvoices(userId);
      const invoiceToUpdate = existingInvoice.find(inv => inv.id === invoiceId);
      
      if (!invoiceToUpdate) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      
      const updatedInvoice = await storage.updateInvoice(invoiceId, req.body);
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
      
      await storage.deleteInvoice(invoiceId);
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
      
      const userSettings = await storage.getUserSettings(userId);
      if (!userSettings) {
        return res.status(404).json({ error: 'User settings not found' });
      }
      
      // Generate R2 URL if not already done
      let pdfUrl = invoice.cloudStorageUrl;
      if (!pdfUrl) {
        const { generateInvoicePDF } = await import('../core/invoice-pdf-generator');
        const { uploadToCloudflareR2 } = await import('../core/cloud-storage');
        
        const pdfBuffer = await generateInvoicePDF(invoice, userSettings);
        const date = new Date();
        const dateFolder = date.toISOString().split('T')[0];
        const cloudStorageKey = `invoices/${dateFolder}/${invoice.invoiceNumber}.pdf`;
        
        const uploadResult = await uploadToCloudflareR2(pdfBuffer, cloudStorageKey, 'application/pdf');
        
        if (uploadResult.success && uploadResult.url) {
          await storage.updateInvoice(parsedInvoiceId, {
            cloudStorageUrl: uploadResult.url,
            cloudStorageKey: uploadResult.key || cloudStorageKey
          });
          pdfUrl = uploadResult.url;
        } else {
          throw new Error('Failed to upload invoice to cloud storage');
        }
      }
      
      // Update invoice status to sent
      await storage.updateInvoice(parsedInvoiceId, {
        status: 'sent',
        updatedAt: new Date()
      });
      
      // Send email
      const emailService = new EmailService();
      const subject = `Invoice ${invoice.invoiceNumber} - Payment Due`;
      
      // Use direct PDF URL from R2
      await emailService.sendInvoiceEmail(invoice, userSettings, subject, pdfUrl, customMessage);
      
      res.json({ success: true, message: 'Invoice sent successfully' });
      
    } catch (error: any) {
      console.error('❌ Failed to send invoice:', error);
      res.status(500).json({ 
        error: 'Failed to send invoice',
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
      console.error('❌ Failed to get invoice:', error);
      res.status(500).json({ 
        error: 'Failed to get invoice',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Get invoice PDF
  app.get('/api/invoices/:id/pdf', requireAuth, async (req: any, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const userId = req.user.userId;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice || invoice.userId !== userId) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      
      const userSettings = await storage.getUserSettings(userId);
      const { generateInvoicePDF } = await import('../core/invoice-pdf-generator.js');
      const pdfBuffer = await generateInvoicePDF(invoice, userSettings);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="Invoice-${invoice.invoiceNumber}.pdf"`);
      res.send(pdfBuffer);
      
    } catch (error) {
      console.error('❌ Failed to generate invoice PDF:', error);
      res.status(500).json({ error: 'Failed to generate invoice PDF' });
    }
  });

  // Download invoice PDF
  app.get('/api/invoices/:id/download', requireAuth, async (req: any, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const userId = req.user.userId;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice || invoice.userId !== userId) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      
      const userSettings = await storage.getUserSettings(userId);
      const { generateInvoicePDF } = await import('../core/invoice-pdf-generator.js');
      const pdfBuffer = await generateInvoicePDF(invoice, userSettings);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Invoice-${invoice.invoiceNumber}.pdf"`);
      res.send(pdfBuffer);
      
    } catch (error) {
      console.error('❌ Failed to download invoice PDF:', error);
      res.status(500).json({ error: 'Failed to download invoice PDF' });
    }
  });

  // Regenerate invoice
  app.post('/api/invoices/:id/regenerate', requireAuth, async (req: any, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const userId = req.user.userId;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice || invoice.userId !== userId) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      
      const userSettings = await storage.getUserSettings(userId);
      const { uploadInvoiceToCloud } = await import('../core/cloud-storage');
      const { url: freshUrl, key } = await uploadInvoiceToCloud(invoice, userSettings);
      
      const updatedInvoice = await storage.updateInvoice(invoiceId, {
        cloudStorageUrl: freshUrl,
        cloudStorageKey: key,
        updatedAt: new Date()
      });
      
      res.json({ 
        success: true, 
        message: 'Invoice regenerated successfully',
        cloudStorageUrl: freshUrl,
        invoice: updatedInvoice
      });
      
    } catch (error: any) {
      console.error('❌ Failed to regenerate invoice:', error);
      res.status(500).json({ 
        error: 'Failed to regenerate invoice',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  console.log('✅ Invoice routes configured');
}