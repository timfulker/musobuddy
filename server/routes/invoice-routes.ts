import { type Express } from "express";
import { storage } from "../core/storage";
import { EmailService } from "../core/services";
import { requireAuth } from '../middleware/auth';
import { requireSubscriptionOrAdmin } from '../core/subscription-middleware';
import Stripe from 'stripe';
import { generateInvoicePDF } from '../core/invoice-pdf-generator';
import { uploadInvoiceToCloud } from '../core/cloud-storage';

// FORCE TEST MODE for now - always use test keys until we're ready for live payments
const isProduction = false; // Explicitly force test mode
const stripeKey = process.env.STRIPE_TEST_SECRET_KEY || process.env.STRIPE_SECRET_KEY;

console.log(`🔧 FORCED Stripe mode: TEST (Override enabled)`);
console.log(`🔑 Using Stripe key: ${stripeKey?.substring(0, 12)}... (${stripeKey?.startsWith('sk_test') ? 'TEST' : 'LIVE'})`);
console.log(`🧪 Test key available: ${!!process.env.STRIPE_TEST_SECRET_KEY}, Live key available: ${!!process.env.STRIPE_SECRET_KEY}`);

if (!stripeKey) {
  throw new Error('Missing required Stripe secret key');
}

// Verify we're using test key
if (!stripeKey.startsWith('sk_test')) {
  console.error('❌ CRITICAL: Not using test key!');
  throw new Error('STRIPE TEST KEY REQUIRED FOR DEVELOPMENT');
}

const stripe = new Stripe(stripeKey, {
  apiVersion: "2025-07-30.basil",
});

export function registerInvoiceRoutes(app: Express) {
  console.log('💰 Setting up invoice routes...');

  // Public invoice viewing endpoint - no authentication required
  app.get('/api/public/invoice/:token', async (req: any, res) => {
    try {
      const { token } = req.params;
      console.log(`🔍 Looking up public invoice with token: ${token}`);
      
      const invoice = await storage.getInvoiceByToken(token);
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      
      // Get user settings for business info
      const userSettings = await storage.getSettings(invoice.userId);
      
      // Return only necessary public information
      const publicInvoice = {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        clientName: invoice.clientName,
        amount: invoice.amount,
        dueDate: invoice.dueDate,
        status: invoice.status,
        cloudStorageUrl: invoice.cloudStorageUrl,
        businessName: userSettings?.businessName || 'MusoBuddy User',
        businessEmail: userSettings?.businessEmail
      };
      
      console.log(`✅ Retrieved public invoice ${invoice.invoiceNumber} for client ${invoice.clientName}`);
      res.json(publicInvoice);
    } catch (error) {
      console.error('❌ Failed to fetch public invoice:', error);
      res.status(500).json({ error: 'Failed to load invoice' });
    }
  });

  // Public payment endpoint - creates Stripe payment link for clients
  app.post('/api/public/invoice/:token/pay', async (req: any, res) => {
    try {
      const { token } = req.params;
      console.log(`💳 Creating payment link for invoice token: ${token}`);
      
      const invoice = await storage.getInvoiceByToken(token);
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      if (invoice.status === 'paid') {
        return res.status(400).json({ error: 'Invoice already paid' });
      }

      console.log(`💳 Creating payment with key type: ${stripeKey?.startsWith('sk_test') ? 'TEST' : 'LIVE'}`);
      console.log(`🔧 Full key used: ${stripeKey}`);
      console.log(`💰 Amount: £${invoice.amount} (${Math.round(parseFloat(invoice.amount) * 100)} pence)`);
      
      // Create Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'gbp',
            product_data: {
              name: `Invoice ${invoice.invoiceNumber}`,
              description: `Payment for ${invoice.clientName}`,
            },
            unit_amount: Math.round(parseFloat(invoice.amount) * 100), // Convert to pence
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${req.headers.origin}/payment-success?invoice=${invoice.invoiceNumber}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin}/invoice/${token}`,
        metadata: {
          invoiceId: invoice.id.toString(),
          invoiceToken: token,
        },
      });

      console.log(`✅ Created payment session for invoice ${invoice.invoiceNumber}: ${session.id}`);
      res.json({ paymentUrl: session.url });
    } catch (error) {
      console.error('❌ Failed to create payment link:', error);
      res.status(500).json({ error: 'Failed to create payment link' });
    }
  });

  // Stripe webhook handler for payment completion
  app.post('/api/stripe/webhook', async (req: any, res) => {
    try {
      const sig = req.headers['stripe-signature'];
      let event;

      try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || '');
      } catch (err: any) {
        console.error('❌ Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as any;
        const invoiceId = session.metadata?.invoiceId;
        
        if (invoiceId) {
          console.log(`💰 Payment completed for invoice ID: ${invoiceId}`);
          
          // Mark invoice as paid and regenerate PDF
          const invoice = await storage.getInvoice(parseInt(invoiceId));
          if (invoice) {
            // Update invoice status in database
            const updatedInvoice = await storage.updateInvoice(parseInt(invoiceId), invoice.userId, {
              status: 'paid',
              paidAt: new Date(),
            });
            
            console.log(`💳 Regenerating PDF for paid invoice #${invoiceId}`);
            
            // Regenerate PDF with PAID status and re-upload to cloud
            try {
              const userSettings = await storage.getSettings(invoice.userId);
              if (userSettings) {
                const paidInvoiceData = { ...invoice, status: 'paid', paidAt: new Date() };
                
                // Generate and upload updated PDF to cloud storage with PAID status
                const uploadResult = await uploadInvoiceToCloud(paidInvoiceData, userSettings);
                
                if (uploadResult.success) {
                  console.log(`✅ PDF regenerated and uploaded with PAID status: ${uploadResult.url}`);
                  
                  // Send payment confirmation email with link to paid invoice
                  if (invoice.clientEmail) {
                    const emailService = new EmailService();
                    await emailService.sendInvoice(paidInvoiceData, userSettings, 'Payment confirmed - thank you for your payment!');
                    console.log(`✅ Payment confirmation email sent for invoice #${invoiceId}`);
                  }
                } else {
                  console.error('❌ Failed to upload paid invoice PDF:', uploadResult.error);
                }
              }
            } catch (pdfError) {
              console.error('⚠️ Failed to regenerate PDF or send email:', pdfError);
            }
          }
          
          console.log(`✅ Invoice ${invoiceId} marked as paid`);
        }
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error('❌ Stripe webhook error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // REMOVED: MusoBuddy invoice view endpoint - files are viewed directly on R2
  // Security is handled through random tokens in the R2 URL paths

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
          res.json(finalInvoice);
        } else {
          console.warn('⚠️ PDF regeneration failed, returning invoice with database updates only:', uploadResult.error);
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
  app.delete('/api/invoices/:id', requireAuth, async (req: any, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const userId = req.user.userId;
      
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
    
    // Call the original auth middleware
    requireAuth(req, res, next);
  }, async (req: any, res) => {
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

  // Regenerate invoice PDF with current theme settings
  app.post('/api/invoices/:id/regenerate', requireAuth, async (req: any, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const userId = req.user.userId;
      
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

  // Create Stripe payment link for invoice
  app.post('/api/invoices/:id/create-payment-link', requireAuth, async (req: any, res) => {
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
      
      if (invoice.status === 'paid') {
        return res.status(400).json({ error: 'Invoice is already paid' });
      }
      
      // Create Stripe payment link
      const paymentLink = await stripe.paymentLinks.create({
        line_items: [
          {
            price_data: {
              currency: 'gbp',
              product_data: {
                name: `Invoice ${invoice.invoiceNumber}`,
                description: `Payment for ${invoice.clientName} - ${invoice.invoiceNumber}`,
              },
              unit_amount: Math.round(parseFloat(invoice.amount) * 100), // Convert to pence
            },
            quantity: 1,
          },
        ],
        metadata: {
          invoiceId: invoiceId.toString(),
          userId: userId.toString(),
          invoiceNumber: invoice.invoiceNumber,
        },
        after_completion: {
          type: 'redirect',
          redirect: {
            url: `${process.env.REPLIT_DEV_DOMAIN || 'https://www.musobuddy.com'}/payment-success?invoice=${invoice.invoiceNumber}`,
          },
        },
      });
      
      // Update invoice with payment link
      await storage.updateInvoice(invoiceId, userId, {
        stripePaymentLinkId: paymentLink.id,
        stripePaymentUrl: paymentLink.url,
      });
      
      console.log(`✅ Created Stripe payment link for invoice #${invoiceId}: ${paymentLink.url}`);
      res.json({ 
        success: true, 
        paymentUrl: paymentLink.url,
        paymentLinkId: paymentLink.id
      });
      
    } catch (error: any) {
      console.error('❌ Failed to create payment link:', error);
      res.status(500).json({ 
        error: 'Failed to create payment link',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });



  console.log('✅ Invoice routes configured');
}