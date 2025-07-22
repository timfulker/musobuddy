import { type Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { isAuthenticated, isAdmin } from "./auth";
import { mailgunService, cloudStorageService, contractParserService } from "./services";
import { webhookService } from "./webhook-service";
import multer from "multer";
import path from "path";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, and DOCX files are allowed'));
    }
  }
});

export async function registerRoutes(app: Express) {
  const server = createServer(app);

  // ===== BOOKING ROUTES =====
  app.get('/api/bookings', isAuthenticated, async (req: any, res) => {
    try {
      const bookings = await storage.getBookings(req.user.id);
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch bookings' });
    }
  });

  app.post('/api/bookings', isAuthenticated, async (req: any, res) => {
    try {
      const booking = await storage.createBooking({ ...req.body, userId: req.user.id });
      res.json(booking);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create booking' });
    }
  });

  app.patch('/api/bookings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const booking = await storage.updateBooking(parseInt(req.params.id), req.body);
      res.json(booking);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update booking' });
    }
  });

  app.delete('/api/bookings/:id', isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteBooking(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete booking' });
    }
  });

  // ===== CONTRACT ROUTES =====
  app.get('/api/contracts', isAuthenticated, async (req: any, res) => {
    try {
      const contracts = await storage.getContracts(req.user.id);
      res.json(contracts);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch contracts' });
    }
  });

  app.post('/api/contracts', isAuthenticated, async (req: any, res) => {
    try {
      const contractData = { ...req.body, userId: req.user.id };
      const contract = await storage.createContract(contractData);
      
      // Generate signing page and upload to cloud storage
      try {
        const userSettings = await storage.getSettings(req.user.id);
        const { url, key } = await cloudStorageService.uploadContractSigningPage(contract, userSettings);
        
        // Update contract with cloud storage info
        const updatedContract = await storage.updateContract(contract.id, {
          cloudStorageUrl: url,
          cloudStorageKey: key,
          signingUrlCreatedAt: new Date()
        });
        
        console.log('Contract created with cloud storage:', contract.id);
        console.log('Signing URL:', url);
        res.json(updatedContract);
      } catch (storageError) {
        console.error('Cloud storage error:', storageError);
        console.log('Contract created without cloud storage - using local signing');
        res.json(contract);
      }
    } catch (error) {
      console.error('Contract creation error:', error);
      res.status(500).json({ error: 'Failed to create contract' });
    }
  });

  app.post('/api/contracts/send-email', isAuthenticated, async (req: any, res) => {
    try {
      console.log('📧 Contract email route called with body:', req.body);
      
      // FIXED: Frontend sends 'customMessage', not 'subject'
      const { contractId, customMessage } = req.body;
      
      if (!contractId) {
        return res.status(400).json({ error: 'Contract ID is required' });
      }
      
      const contract = await storage.getContract(contractId);
      
      if (!contract) {
        console.log('❌ Contract not found:', contractId);
        return res.status(404).json({ error: 'Contract not found' });
      }
      
      if (!contract.clientEmail) {
        console.log('❌ No client email for contract:', contractId);
        return res.status(400).json({ error: 'Contract has no client email address' });
      }
      
      const userSettings = await storage.getSettings(req.user.id);
      
      // CRITICAL: Always use R2 cloud storage URL, never app server
      let signingUrl = contract.cloudStorageUrl;
      
      // If no cloud storage URL exists, create one NOW
      if (!signingUrl) {
        console.log('🔗 No cloud storage URL found, creating one now...');
        const { url, key } = await cloudStorageService.uploadContractSigningPage(contract, userSettings);
        
        // Update contract with cloud storage info
        await storage.updateContract(contract.id, {
          cloudStorageUrl: url,
          cloudStorageKey: key,
          signingUrlCreatedAt: new Date()
        });
        
        signingUrl = url;
        console.log('✅ Created R2 signing URL:', url);
      }
      
      console.log('📧 Sending contract email:', {
        contractId,
        clientEmail: contract.clientEmail,
        signingUrl,
        hasCustomMessage: !!customMessage
      });
      
      // FIXED: Pass customMessage as subject parameter
      const emailSubject = customMessage || `Contract ready for signing - ${contract.contractNumber}`;
      
      await mailgunService.sendContractEmail(contract, userSettings, emailSubject, signingUrl);
      
      // Update contract status to 'sent' when email is successfully sent
      await storage.updateContract(contractId, {
        status: 'sent',
        sentAt: new Date()
      });
      
      console.log('✅ Contract email sent successfully for contract:', contractId);
      res.json({ success: true });
      
    } catch (error: any) {
      console.error('❌ Contract email error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        contractId: req.body?.contractId
      });
      
      res.status(500).json({ 
        error: 'Failed to send contract email',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Debug route to test Mailgun configuration
  app.post('/api/debug/mailgun-test', isAuthenticated, async (req: any, res) => {
    try {
      console.log('🔧 Testing Mailgun configuration...');
      
      // Check environment variables
      const config = {
        hasApiKey: !!process.env.MAILGUN_API_KEY,
        apiKeyPrefix: process.env.MAILGUN_API_KEY?.substring(0, 10) + '...',
        hasPublicKey: !!process.env.MAILGUN_PUBLIC_KEY,
        domain: 'mg.musobuddy.com'
      };
      
      console.log('🔧 Mailgun config:', config);
      
      if (!process.env.MAILGUN_API_KEY) {
        return res.status(500).json({ 
          error: 'Mailgun API key not configured',
          config 
        });
      }
      
      // Try to send a simple test email
      const testEmail = {
        from: 'MusoBuddy <noreply@mg.musobuddy.com>',
        to: req.user.email || 'test@example.com', // Send to current user
        subject: 'MusoBuddy Email Test',
        html: '<h1>Test Email</h1><p>If you receive this, Mailgun is working correctly!</p>'
      };
      
      console.log('📧 Sending test email to:', testEmail.to);
      
      const result = await mailgunService.mailgun.messages.create('mg.musobuddy.com', testEmail);
      
      console.log('✅ Test email sent successfully:', result.id);
      
      res.json({ 
        success: true, 
        messageId: result.id,
        config,
        testEmail: testEmail.to
      });
      
    } catch (error: any) {
      console.error('❌ Mailgun test failed:', error);
      
      res.status(500).json({ 
        error: 'Mailgun test failed',
        details: error.message,
        status: error.status,
        config: {
          hasApiKey: !!process.env.MAILGUN_API_KEY,
          domain: 'mg.musobuddy.com'
        }
      });
    }
  });

  app.get('/api/contracts/public/:id', async (req, res) => {
    try {
      const contract = await storage.getContract(parseInt(req.params.id));
      if (!contract || contract.status === 'signed') {
        return res.json({ message: 'Contract not available for signing' });
      }
      
      // Return contract signing page HTML
      const userSettings = await storage.getSettings(contract.userId);
      const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Contract Signing - ${contract.contractNumber}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .contract-details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .sign-button { background: #6366f1; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; }
    </style>
</head>
<body>
    <h1>Performance Contract</h1>
    <h2>${contract.contractNumber}</h2>
    
    <div class="contract-details">
        <h3>Event Details</h3>
        <p><strong>Client:</strong> ${contract.clientName}</p>
        <p><strong>Date:</strong> ${new Date(contract.eventDate).toDateString()}</p>
        <p><strong>Time:</strong> ${contract.eventTime}</p>
        <p><strong>Venue:</strong> ${contract.venue}</p>
        <p><strong>Fee:</strong> £${contract.fee}</p>
    </div>
    
    <div style="text-align: center; margin: 40px 0;">
        <button class="sign-button" onclick="signContract()">Sign Contract</button>
    </div>
    
    <script>
        function signContract() {
            if (confirm('By signing this contract, you agree to all terms. Continue?')) {
                fetch('/api/contracts/sign/${contract.id}', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ signature: '${contract.clientName}' })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        document.body.innerHTML = '<div style="text-align:center;padding:50px;"><h2>✅ Contract Signed Successfully</h2></div>';
                    }
                });
            }
        }
    </script>
</body>
</html>`;
      
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error) {
      res.status(500).json({ error: 'Failed to load contract' });
    }
  });

  app.post('/api/contracts/sign/:id', async (req, res) => {
    try {
      const contractId = parseInt(req.params.id);
      const { signature } = req.body;
      
      // Update contract status to signed
      const updatedContract = await storage.updateContract(contractId, {
        status: 'signed',
        signedAt: new Date(),
        clientSignature: signature
      });
      
      // WEBHOOK: Automatically update related booking status
      if (updatedContract) {
        try {
          const webhookResult = await webhookService.handleContractSigned(contractId, updatedContract);
          console.log('🎯 Contract signing webhook result:', webhookResult);
        } catch (webhookError) {
          console.error('❌ Webhook notification failed:', webhookError);
          // Don't fail the contract signing if webhook fails
        }
      }
      
      res.json({ success: true, contract: updatedContract });
    } catch (error) {
      console.error('Contract signing error:', error);
      res.status(500).json({ error: 'Failed to sign contract' });
    }
  });

  // Contract import and parsing routes
  app.post('/api/contracts/import-pdf', isAuthenticated, upload.single('contract'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Extract text from PDF (simplified - would need proper PDF parser)
      const contractText = req.file.buffer.toString('utf-8');
      
      // Parse with AI
      const extractedData = await contractParserService.parseContractWithAI(contractText);
      
      res.json({
        success: true,
        extractedData,
        message: 'Contract parsed successfully'
      });
    } catch (error) {
      console.error('Contract import error:', error);
      res.status(500).json({ 
        error: 'Failed to parse contract',
        message: 'Please check if the PDF contains clear, readable text'
      });
    }
  });

  app.post('/api/contracts/debug-text-extraction', isAuthenticated, async (req: any, res) => {
    try {
      const { text } = req.body;
      const extractedData = await contractParserService.parseContractWithAI(text);
      res.json({ extractedData });
    } catch (error) {
      res.status(500).json({ error: 'AI parsing failed' });
    }
  });

  // Contract deletion routes
  app.delete('/api/contracts/:id', isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteContract(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error('Contract deletion error:', error);
      res.status(500).json({ error: 'Failed to delete contract' });
    }
  });

  app.post('/api/contracts/bulk-delete', isAuthenticated, async (req: any, res) => {
    try {
      const { contractIds } = req.body;
      
      if (!Array.isArray(contractIds) || contractIds.length === 0) {
        return res.status(400).json({ error: 'Contract IDs array is required' });
      }

      // Delete contracts one by one
      for (const id of contractIds) {
        await storage.deleteContract(parseInt(id));
      }
      
      res.json({ success: true, deletedCount: contractIds.length });
    } catch (error) {
      console.error('Bulk contract deletion error:', error);
      res.status(500).json({ error: 'Failed to delete contracts' });
    }
  });

  // ===== WEBHOOK TEST ROUTE =====
  app.post('/api/webhook/test', isAuthenticated, async (req, res) => {
    try {
      const result = await webhookService.testWebhook();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Webhook test failed' });
    }
  });

  // ===== INVOICE ROUTES =====
  app.get('/api/invoices', isAuthenticated, async (req: any, res) => {
    try {
      const invoices = await storage.getInvoices(req.user.id);
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch invoices' });
    }
  });

  app.post('/api/invoices', isAuthenticated, async (req: any, res) => {
    try {
      const invoiceData = { ...req.body, userId: req.user.id };
      const invoice = await storage.createInvoice(invoiceData);
      res.json(invoice);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create invoice' });
    }
  });

  app.patch('/api/invoices/:id', isAuthenticated, async (req: any, res) => {
    try {
      const invoice = await storage.updateInvoice(parseInt(req.params.id), req.body);
      res.json(invoice);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update invoice' });
    }
  });

  app.post('/api/invoices/send-email', isAuthenticated, async (req: any, res) => {
    try {
      const { invoiceId, subject } = req.body;
      const invoice = await storage.getInvoice(invoiceId);
      
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      
      // Generate PDF and upload to cloud storage
      const userSettings = await storage.getSettings(req.user.id);
      const { url } = await cloudStorageService.uploadInvoiceToCloud(invoice, userSettings);
      
      // Send email with PDF link
      await mailgunService.sendInvoiceEmail(invoice, userSettings, url, subject);
      
      // Update invoice status
      await storage.updateInvoice(invoice.id, { status: 'sent', sentAt: new Date() });
      
      res.json({ success: true });
    } catch (error) {
      console.error('Invoice email error:', error);
      res.status(500).json({ error: 'Failed to send invoice email' });
    }
  });

  // Invoice deletion routes
  app.delete('/api/invoices/:id', isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteInvoice(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error('Invoice deletion error:', error);
      res.status(500).json({ error: 'Failed to delete invoice' });
    }
  });

  app.post('/api/invoices/bulk-delete', isAuthenticated, async (req: any, res) => {
    try {
      const { invoiceIds } = req.body;
      
      if (!Array.isArray(invoiceIds) || invoiceIds.length === 0) {
        return res.status(400).json({ error: 'Invoice IDs array is required' });
      }

      // Delete invoices one by one
      for (const id of invoiceIds) {
        await storage.deleteInvoice(parseInt(id));
      }
      
      res.json({ success: true, deletedCount: invoiceIds.length });
    } catch (error) {
      console.error('Bulk invoice deletion error:', error);
      res.status(500).json({ error: 'Failed to delete invoices' });
    }
  });

  // ===== SETTINGS ROUTES =====
  app.get('/api/settings', isAuthenticated, async (req: any, res) => {
    try {
      const settings = await storage.getSettings(req.user.id);
      res.json(settings || {});
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  });

  app.post('/api/settings', isAuthenticated, async (req: any, res) => {
    try {
      const settings = await storage.updateSettings(req.user.id, req.body);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update settings' });
    }
  });

  // ===== COMPLIANCE ROUTES =====
  app.get('/api/compliance', isAuthenticated, async (req: any, res) => {
    try {
      const compliance = await storage.getCompliance(req.user.id);
      res.json(compliance);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch compliance' });
    }
  });

  app.post('/api/compliance', isAuthenticated, async (req: any, res) => {
    try {
      const compliance = await storage.createCompliance({ ...req.body, userId: req.user.id });
      res.json(compliance);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create compliance' });
    }
  });

  // ===== ADMIN ROUTES =====
  app.get('/api/admin/stats', isAdmin, async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  app.get('/api/admin/users', isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  app.get('/api/admin/bookings', isAdmin, async (req, res) => {
    try {
      const bookings = await storage.getAllBookings();
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch bookings' });
    }
  });

  // ===== DEBUG ROUTES =====
  app.get('/api/debug-data-counts', async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get debug data' });
    }
  });

  return server;
}