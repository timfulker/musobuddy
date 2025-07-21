import { type Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { isAuthenticated, isAdmin } from "./auth";
import { mailgunService, cloudStorageService, contractParserService } from "./services";
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
      const userSettings = await storage.getSettings(req.user.id);
      const { url, key } = await cloudStorageService.uploadContractSigningPage(contract, userSettings);
      
      // Update contract with cloud storage info
      const updatedContract = await storage.updateContract(contract.id, {
        cloudStorageUrl: url,
        cloudStorageKey: key,
        signingUrlCreatedAt: new Date()
      });
      
      res.json(updatedContract);
    } catch (error) {
      console.error('Contract creation error:', error);
      res.status(500).json({ error: 'Failed to create contract' });
    }
  });

  app.post('/api/contracts/send-email', isAuthenticated, async (req: any, res) => {
    try {
      const { contractId, subject } = req.body;
      const contract = await storage.getContract(contractId);
      
      if (!contract) {
        return res.status(404).json({ error: 'Contract not found' });
      }
      
      const userSettings = await storage.getSettings(req.user.id);
      await mailgunService.sendContractEmail(contract, userSettings, subject);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Contract email error:', error);
      res.status(500).json({ error: 'Failed to send contract email' });
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
      
      const updatedContract = await storage.updateContract(contractId, {
        status: 'signed',
        signedAt: new Date(),
        clientSignature: signature
      });
      
      res.json({ success: true, contract: updatedContract });
    } catch (error) {
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