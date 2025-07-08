import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertEnquirySchema, insertContractSchema, insertInvoiceSchema, insertBookingSchema, insertComplianceDocumentSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Webhook route moved to index.ts to prevent conflicts

  // Auth middleware
  await setupAuth(app);



  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard stats
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getDashboardStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Public quick-add endpoint for mobile access (no auth required) - MUST BE FIRST
  app.post('/api/enquiries/quick-add', async (req: any, res) => {
    try {
      console.log("Quick-add endpoint hit with data:", req.body);
      // For quick-add, we need to associate with the account owner
      // In a real app, this would be configurable or have a different approach
      const userId = "43963086"; // Your user ID from auth logs
      const data = { ...req.body, userId };
      
      // Convert eventDate string to Date if present
      if (data.eventDate && typeof data.eventDate === 'string') {
        data.eventDate = new Date(data.eventDate);
      }
      
      const enquiryData = insertEnquirySchema.parse(data);
      const enquiry = await storage.createEnquiry(enquiryData);
      console.log("Quick-add enquiry created:", enquiry);
      res.status(201).json(enquiry);
    } catch (error) {
      console.error("Error creating enquiry via quick-add:", error);
      res.status(500).json({ message: "Failed to create enquiry", error: error.message });
    }
  });

  // Enquiry routes
  app.get('/api/enquiries', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const enquiries = await storage.getEnquiries(userId);
      res.json(enquiries);
    } catch (error) {
      console.error("Error fetching enquiries:", error);
      res.status(500).json({ message: "Failed to fetch enquiries" });
    }
  });

  app.get('/api/enquiries/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const enquiry = await storage.getEnquiry(id, userId);
      if (!enquiry) {
        return res.status(404).json({ message: "Enquiry not found" });
      }
      res.json(enquiry);
    } catch (error) {
      console.error("Error fetching enquiry:", error);
      res.status(500).json({ message: "Failed to fetch enquiry" });
    }
  });

  app.post('/api/enquiries', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = { ...req.body, userId };
      
      // Convert eventDate string to Date if present
      if (data.eventDate && typeof data.eventDate === 'string') {
        data.eventDate = new Date(data.eventDate);
      }
      
      const enquiryData = insertEnquirySchema.parse(data);
      const enquiry = await storage.createEnquiry(enquiryData);
      res.status(201).json(enquiry);
    } catch (error) {
      console.error("Error creating enquiry:", error);
      res.status(500).json({ message: "Failed to create enquiry" });
    }
  });

  app.patch('/api/enquiries/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const updates = req.body;
      const enquiry = await storage.updateEnquiry(id, updates, userId);
      if (!enquiry) {
        return res.status(404).json({ message: "Enquiry not found" });
      }
      res.json(enquiry);
    } catch (error) {
      console.error("Error updating enquiry:", error);
      res.status(500).json({ message: "Failed to update enquiry" });
    }
  });

  app.delete('/api/enquiries/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const success = await storage.deleteEnquiry(id, userId);
      if (!success) {
        return res.status(404).json({ message: "Enquiry not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting enquiry:", error);
      res.status(500).json({ message: "Failed to delete enquiry" });
    }
  });

  // Public contract download route (for signed contracts)
  app.get('/api/contracts/:id/download', async (req, res) => {
    console.log('Public contract download request for contract:', req.params.id);
    
    try {
      const contractId = parseInt(req.params.id);
      
      const contract = await storage.getContractById(contractId);
      if (!contract) {
        console.log('Contract not found:', contractId);
        return res.status(404).json({ message: "Contract not found" });
      }
      
      // Only allow downloading signed contracts
      if (contract.status !== 'signed') {
        console.log('Contract not signed:', contractId, contract.status);
        return res.status(403).json({ message: "Contract must be signed before downloading" });
      }
      
      const userSettings = await storage.getUserSettings(contract.userId);
      
      console.log('Starting PDF generation for contract:', contract.contractNumber);
      
      
      const { generateContractPDF } = await import('./pdf-generator');
      
      const signatureDetails = {
        signedAt: contract.signedAt!,
        signatureName: contract.clientName,
        clientIpAddress: 'Digital signature'
      };
      
      const pdfBuffer = await generateContractPDF(contract, userSettings, signatureDetails);
      
      
      console.log('PDF generated successfully:', contract.contractNumber);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Contract-${contract.contractNumber}-Signed.pdf"`);
      res.send(pdfBuffer);
      
    } catch (error) {
      console.error("Error generating contract PDF:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to generate PDF" });
      }
    }
  });

  // Contract PDF download route (authenticated)
  app.get('/api/contracts/:id/pdf', isAuthenticated, async (req: any, res) => {
    console.log('Authenticated PDF download request for contract:', req.params.id);
    
    try {
      const userId = req.user.claims.sub;
      const contractId = parseInt(req.params.id);
      
      const contract = await storage.getContract(contractId, userId);
      if (!contract) {
        console.log('Contract not found:', contractId);
        return res.status(404).json({ message: "Contract not found" });
      }
      
      const userSettings = await storage.getUserSettings(userId);
      
      console.log('Starting PDF generation for contract:', contract.contractNumber);
      
      
      const { generateContractPDF } = await import('./pdf-generator');
      
      const signatureDetails = contract.signedAt ? {
        signedAt: contract.signedAt,
        signatureName: contract.clientName,
        clientIpAddress: 'Digital signature'
      } : undefined;
      
      const pdfBuffer = await generateContractPDF(contract, userSettings, signatureDetails);
      
      
      console.log('PDF generated successfully:', contract.contractNumber);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Contract-${contract.contractNumber}.pdf"`);
      res.send(pdfBuffer);
      
    } catch (error) {
      console.error("Error generating contract PDF:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to generate PDF" });
      }
    }
  });

  // Public contract PDF download (for clients)
  app.get('/api/contracts/public/:id/pdf', async (req, res) => {
    console.log('Public PDF download request for contract:', req.params.id);
    
    try {
      const contractId = parseInt(req.params.id);
      
      const contract = await storage.getContractById(contractId);
      if (!contract) {
        console.log('Contract not found:', contractId);
        return res.status(404).json({ message: "Contract not found" });
      }
      
      // Only allow PDF download for signed contracts
      if (contract.status !== 'signed') {
        console.log('Contract not signed:', contractId, contract.status);
        return res.status(403).json({ message: "Contract must be signed to download PDF" });
      }
      
      const userSettings = await storage.getUserSettings(contract.userId);
      
      console.log('Starting PDF generation for contract:', contract.contractNumber);
      
      
      const { generateContractPDF } = await import('./pdf-generator');
      
      const signatureDetails = contract.signedAt ? {
        signedAt: contract.signedAt,
        signatureName: contract.clientName,
        clientIpAddress: 'Digital signature'
      } : undefined;
      
      const pdfBuffer = await generateContractPDF(contract, userSettings, signatureDetails);
      
      
      console.log('PDF generated successfully:', contract.contractNumber);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Contract-${contract.contractNumber}.pdf"`);
      res.send(pdfBuffer);
      
    } catch (error) {
      console.error("Error generating public contract PDF:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to generate PDF" });
      }
    }
  });

  // Invoice PDF download route (authenticated)
  app.get('/api/invoices/:id/pdf', isAuthenticated, async (req: any, res) => {
    console.log('PDF download request for invoice:', req.params.id);
    
    try {
      const userId = req.user.claims.sub;
      const invoiceId = parseInt(req.params.id);
      
      const invoice = await storage.getInvoice(invoiceId, userId);
      if (!invoice) {
        console.log('Invoice not found:', invoiceId);
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Get related contract for client details
      let contract = null;
      if (invoice.contractId) {
        contract = await storage.getContract(invoice.contractId, userId);
      }
      
      const userSettings = await storage.getUserSettings(userId);
      
      console.log('Starting PDF generation for invoice:', invoice.invoiceNumber);
      
      
      const { generateInvoicePDF } = await import('./pdf-generator');
      const pdfBuffer = await generateInvoicePDF(invoice, contract, userSettings);
      
      
      console.log('PDF generated successfully:', invoice.invoiceNumber);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Invoice-${invoice.invoiceNumber}.pdf"`);
      res.send(pdfBuffer);
      
    } catch (error) {
      console.error("Error generating invoice PDF:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to generate PDF" });
      }
    }
  });

  // Public invoice view (no authentication required)
  app.get('/api/invoices/:id/view', async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      
      // Get invoice with basic validation - no user restriction for public view
      const invoice = await storage.getInvoiceById(invoiceId);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      res.json(invoice);
    } catch (error) {
      console.error('Error fetching invoice for view:', error);
      res.status(500).json({ message: "Failed to fetch invoice" });
    }
  });

  // Public invoice download (generates PDF)
  app.get('/api/invoices/:id/download', async (req, res) => {
    console.log('Public PDF download request for invoice:', req.params.id);
    
    try {
      const invoiceId = parseInt(req.params.id);
      
      // Get invoice and related data
      const invoice = await storage.getInvoiceById(invoiceId);
      if (!invoice) {
        console.log('Invoice not found:', invoiceId);
        return res.status(404).json({ message: "Invoice not found" });
      }

      // Get user settings and contract if available
      const userSettings = await storage.getUserSettings(invoice.userId);
      let contract = null;
      if (invoice.contractId) {
        contract = await storage.getContractById(invoice.contractId);
      }

      // Generate PDF with simple approach
      const { generateInvoicePDF } = await import('./pdf-generator');
      const pdfBuffer = await generateInvoicePDF(invoice, contract, userSettings);

      // Send PDF as download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Invoice-${invoice.invoiceNumber}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Error generating invoice PDF:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to generate invoice PDF" });
      }
    }
  });

  // Contract routes
  app.get('/api/contracts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const contracts = await storage.getContracts(userId);
      res.json(contracts);
    } catch (error) {
      console.error("Error fetching contracts:", error);
      res.status(500).json({ message: "Failed to fetch contracts" });
    }
  });

  app.delete('/api/contracts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const contractId = parseInt(req.params.id);
      
      const success = await storage.deleteContract(contractId, userId);
      if (success) {
        res.json({ message: "Contract deleted successfully" });
      } else {
        res.status(404).json({ message: "Contract not found" });
      }
    } catch (error) {
      console.error("Error deleting contract:", error);
      res.status(500).json({ message: "Failed to delete contract" });
    }
  });

  app.post('/api/contracts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = { ...req.body, userId };
      
      // Convert eventDate string to Date if present
      if (data.eventDate && typeof data.eventDate === 'string') {
        data.eventDate = new Date(data.eventDate);
      }
      
      const contractData = insertContractSchema.parse(data);
      const contract = await storage.createContract(contractData);
      res.status(201).json(contract);
    } catch (error) {
      console.error("Error creating contract:", error);
      res.status(500).json({ message: "Failed to create contract" });
    }
  });

  // Invoice route logging (disabled for production)
  // app.use('/api/invoices*', (req, res, next) => {
  //   console.log(`=== INVOICE ROUTE: ${req.method} ${req.originalUrl} ===`);
  //   next();
  // });

  // Test route to verify invoice routes work




  // Invoice routes
  app.get('/api/invoices', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const invoices = await storage.getInvoices(userId);
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.delete('/api/invoices/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const invoiceId = parseInt(req.params.id);
      
      const success = await storage.deleteInvoice(invoiceId, userId);
      if (success) {
        res.json({ message: "Invoice deleted successfully" });
      } else {
        res.status(404).json({ message: "Invoice not found" });
      }
    } catch (error) {
      console.error("Error deleting invoice:", error);
      res.status(500).json({ message: "Failed to delete invoice" });
    }
  });



  app.post('/api/invoices', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log("Received invoice data:", req.body);
      
      // Prepare the invoice data with all required fields
      const invoiceData = {
        userId,
        // invoiceNumber is auto-generated in storage layer - don't include it
        contractId: req.body.contractId ? parseInt(req.body.contractId.toString()) : null,
        clientName: req.body.clientName,
        clientEmail: req.body.clientEmail || null,
        clientAddress: req.body.clientAddress || null,
        venueAddress: req.body.venueAddress || null,
        amount: req.body.amount.toString(),
        dueDate: new Date(req.body.dueDate),
        performanceDate: req.body.performanceDate ? new Date(req.body.performanceDate) : null,
        performanceFee: req.body.performanceFee || req.body.amount.toString(),
        depositPaid: req.body.depositPaid || "0",
        status: "draft",
      };
      
      console.log("Processed invoice data:", invoiceData);
      
      // Validate against schema
      console.log("Validating invoice data...");
      const validatedData = insertInvoiceSchema.parse(invoiceData);
      console.log("Validation successful:", validatedData);
      
      const invoice = await storage.createInvoice(validatedData);
      console.log("Invoice created successfully:", invoice);
      res.status(201).json(invoice);
    } catch (error: any) {
      console.error("Error creating invoice:", error);
      if (error.name === 'ZodError') {
        console.error("Validation errors:", error.errors);
        console.error("Full error details:", JSON.stringify(error, null, 2));
        res.status(400).json({ message: "Validation failed", errors: error.errors });
      } else {
        console.error("Other error:", error.message, error.stack);
        res.status(500).json({ message: "Failed to create invoice", error: error.message });
      }
    }
  });



  // Debug route to check user session
  app.get('/api/debug-user', isAuthenticated, (req: any, res) => {
    console.log('DEBUG USER ROUTE REACHED');
    res.json({
      user: req.user,
      userId: req.userId,
      isAuthenticated: req.isAuthenticated(),
      sessionID: req.sessionID
    });
  });

  // Update invoice
  app.patch('/api/invoices/:id', isAuthenticated, async (req: any, res) => {
    console.log('=== INVOICE UPDATE REQUEST RECEIVED ===');
    try {
      const userId = req.userId || req.user?.id; // Use the properly stored user ID
      const invoiceId = parseInt(req.params.id);
      
      console.log('Invoice ID:', invoiceId, 'User ID:', userId);
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      
      if (!userId) {
        console.log('ERROR: No user ID available');
        return res.status(401).json({ message: "User ID not available" });
      }
      console.log('User ID:', userId);
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      
      // First, let's verify the invoice exists and belongs to the user
      const existingInvoice = await storage.getInvoice(invoiceId, userId);
      if (!existingInvoice) {
        console.log('Invoice not found or does not belong to user');
        return res.status(404).json({ message: "Invoice not found" });
      }
      console.log('Existing invoice found:', existingInvoice.invoiceNumber);
      
      // Process the update data with minimal validation to isolate the issue
      const updateData = { ...req.body };
      
      // Basic validation - only check what's absolutely required
      if (!updateData.clientName) {
        console.log('Missing client name');
        return res.status(400).json({ message: "Client name is required" });
      }
      if (!updateData.amount) {
        console.log('Missing amount');
        return res.status(400).json({ message: "Amount is required" });
      }
      
      if (updateData.dueDate && typeof updateData.dueDate === 'string') {
        updateData.dueDate = new Date(updateData.dueDate);
      }
      if (updateData.performanceDate && typeof updateData.performanceDate === 'string') {
        updateData.performanceDate = new Date(updateData.performanceDate);
      }
      
      // Ensure decimal fields are properly formatted
      if (updateData.amount && typeof updateData.amount === 'string') {
        updateData.amount = updateData.amount;  // Keep as string for Drizzle decimal handling
      }
      if (updateData.performanceFee && typeof updateData.performanceFee === 'string') {
        updateData.performanceFee = updateData.performanceFee;
      }
      if (updateData.depositPaid && typeof updateData.depositPaid === 'string') {
        updateData.depositPaid = updateData.depositPaid;
      }
      
      // Handle empty strings and null values properly for optional fields
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        } else if (updateData[key] === '' && (key === 'clientEmail' || key === 'clientAddress' || key === 'venueAddress' || key === 'performanceDate' || key === 'performanceFee' || key === 'depositPaid')) {
          updateData[key] = null; // Set optional fields to null instead of empty string
        }
      });
      
      // Don't allow updates to system-generated fields
      delete updateData.id;
      delete updateData.invoiceNumber;
      delete updateData.createdAt;
      delete updateData.updatedAt;
      
      console.log('About to call storage.updateInvoice with:', { invoiceId, userId, updateData });
      
      const updatedInvoice = await storage.updateInvoice(invoiceId, updateData, userId);
      console.log('Storage returned:', updatedInvoice ? 'Success' : 'Not found');
      
      if (!updatedInvoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      res.json(updatedInvoice);
    } catch (error) {
      console.error("=== INVOICE UPDATE ERROR ===");
      console.error("Error message:", error.message);
      console.error("Error name:", error.name);
      console.error("Error code:", error.code);
      console.error("Error stack:", error.stack);
      console.error("Invoice ID:", invoiceId);
      console.error("User ID:", userId);
      console.error("Request body:", JSON.stringify(req.body, null, 2));
      res.status(500).json({ message: "Failed to update invoice", error: error.message, details: error.stack });
    }
  });

  // Debug endpoint without authentication to test raw update
  app.post('/api/debug-invoice-update', async (req: any, res) => {
    try {
      console.log('=== DEBUG INVOICE UPDATE ===');
      
      const testData = {
        contractId: null,
        clientName: "Pat Davis Updated",
        clientEmail: "timfulker@gmail.com",
        clientAddress: "291, Alder Road, Poole",
        venueAddress: "Langham House, Rode, Frome BA11 6PS",
        amount: "300.00",
        dueDate: new Date("2025-07-05T00:00:00.000Z"),
        performanceDate: new Date("2025-07-05T00:00:00.000Z"),
        performanceFee: "300.00",
        depositPaid: "0.00"
      };
      
      console.log('Test data:', JSON.stringify(testData, null, 2));
      
      const result = await storage.updateInvoice(47, testData, '43963086');
      console.log('Debug update result:', result);
      
      res.json({ success: true, result });
    } catch (error) {
      console.error('=== DEBUG UPDATE ERROR ===');
      console.error('Error message:', error.message);
      console.error('Error name:', error.name);
      console.error('Error code:', error.code);
      console.error('Error stack:', error.stack);
      res.status(500).json({ error: error.message, stack: error.stack });
    }
  });

  // Test endpoint for debugging invoice updates
  app.post('/api/test-invoice-update', async (req: any, res) => {
    try {
      console.log('TEST INVOICE UPDATE ENDPOINT REACHED');
      
      // Test 1: Basic database read
      const existingInvoice = await storage.getInvoice(47, '43963086');
      console.log('Existing invoice:', existingInvoice?.invoiceNumber);
      
      if (!existingInvoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      
      // Test 2: Simple field update
      const simpleData = {
        clientName: 'Test Client Updated'
      };
      
      const result = await storage.updateInvoice(47, simpleData, '43963086');
      console.log('Simple update result:', result?.invoiceNumber);
      
      res.json({ success: true, result });
    } catch (error) {
      console.error('Test update error:', error);
      res.status(500).json({ error: error.message, stack: error.stack });
    }
  });



  // Send invoice email
  app.post('/api/invoices/send-email', isAuthenticated, async (req: any, res) => {
    try {

      const userId = req.user.claims.sub;
      const { invoiceId } = req.body;
      
      // Get the invoice details
      const invoice = await storage.getInvoice(invoiceId, userId);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      // Get client email from invoice or related contract
      let clientEmail = invoice.clientEmail;
      let contract = null;
      
      if (!clientEmail && invoice.contractId) {
        contract = await storage.getContract(invoice.contractId, userId);
        clientEmail = contract?.clientEmail;
      }

      // Get user settings for business details
      const userSettings = await storage.getUserSettings(userId);

      if (!clientEmail) {
        return res.status(400).json({ message: "Client email not found. Please add client email to the invoice or contract." });
      }

      // First update invoice status to sent
      const updatedInvoice = await storage.updateInvoice(invoiceId, { status: "sent" }, userId);
      if (!updatedInvoice) {
        return res.status(404).json({ message: "Failed to update invoice status" });
      }

      // Import SendGrid
      const { sendEmail } = await import('./sendgrid');
      
      // Generate invoice view link
      const currentDomain = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
      const invoiceViewUrl = `https://${currentDomain}/view-invoice/${updatedInvoice.id}`;
      const invoiceDownloadUrl = `https://${currentDomain}/api/invoices/${updatedInvoice.id}/download`;
      
      console.log('=== SENDING INVOICE EMAIL WITH LINK ===');
      console.log('Invoice view URL:', invoiceViewUrl);
      console.log('Invoice download URL:', invoiceDownloadUrl);
      
      // Smart email handling - use authenticated domain for sending, Gmail for replies
      const userBusinessEmail = userSettings?.businessEmail;
      const fromName = userSettings?.emailFromName || userSettings?.businessName || 'MusoBuddy User';
      
      // Always use authenticated domain for FROM to avoid SPF issues
      const fromEmail = 'noreply@musobuddy.com';
      
      // If user has Gmail (or other non-authenticated domain), use it as reply-to
      const replyToEmail = userBusinessEmail && !userBusinessEmail.includes('@musobuddy.com') ? userBusinessEmail : null;
      
      console.log('=== EMAIL DETAILS ===');
      console.log('To:', clientEmail);
      console.log('From:', `${fromName} <${fromEmail}>`);
      console.log('Reply-To:', replyToEmail);
      console.log('Subject:', `Invoice ${updatedInvoice.invoiceNumber} from ${fromName}`);
      
      const emailData: any = {
        to: clientEmail,
        from: `${fromName} <${fromEmail}>`,
        subject: `Invoice ${updatedInvoice.invoiceNumber} from ${fromName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #0EA5E9; margin-bottom: 20px;">Invoice ${updatedInvoice.invoiceNumber}</h1>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <p><strong>Amount:</strong> £${updatedInvoice.amount}</p>
              <p><strong>Due Date:</strong> ${new Date(updatedInvoice.dueDate).toLocaleDateString('en-GB')}</p>
              <p><strong>Client:</strong> ${updatedInvoice.clientName}</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${invoiceViewUrl}" style="background: #0EA5E9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Invoice Online</a>
            </div>
            <div style="text-align: center; margin: 20px 0;">
              <a href="${invoiceDownloadUrl}" style="background: #6B7280; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; font-size: 14px; display: inline-block;">Download PDF</a>
            </div>
            <p>Thank you for your business!</p>
            <p style="text-align: center; color: #6B7280; font-size: 12px; margin-top: 30px;">
              <small>Powered by MusoBuddy – less admin, more music</small>
            </p>
          </div>
        `,
        text: `Invoice ${updatedInvoice.invoiceNumber}. Amount: £${updatedInvoice.amount}. Due date: ${new Date(updatedInvoice.dueDate).toLocaleDateString('en-GB')}. View your invoice online: ${invoiceViewUrl} or download PDF: ${invoiceDownloadUrl}`
      };
      
      // Add reply-to if user has Gmail or other external email
      if (replyToEmail) {
        emailData.replyTo = replyToEmail;
      }
      
      const emailSent = await sendEmail(emailData);

      if (emailSent) {
        console.log(`Invoice ${updatedInvoice.invoiceNumber} sent successfully to ${clientEmail}`);
        res.json({ 
          message: "Invoice sent successfully via email",
          debug: {
            invoiceId: invoiceId,
            clientEmail: clientEmail,
            invoiceNumber: updatedInvoice.invoiceNumber,
            emailSent: true
          }
        });
      } else {
        // If email failed, revert status back to draft
        await storage.updateInvoice(invoiceId, { status: "draft" }, userId);
        res.status(500).json({ 
          message: "Failed to send email. Please check your email settings.",
          debug: {
            invoiceId: invoiceId,
            clientEmail: clientEmail,
            invoiceNumber: updatedInvoice.invoiceNumber,
            emailSent: false
          }
        });
      }
    } catch (error: any) {
      console.error("Error sending invoice email:", error);
      res.status(500).json({ 
        message: "Failed to send invoice email", 
        error: error.message || "Unknown error",
        debug: { invoiceId: req.body.invoiceId }
      });
    }
  });

  // Send contract email
  app.post('/api/contracts/send-email', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { contractId } = req.body;
      
      // Get the contract details
      const contract = await storage.getContract(contractId, userId);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      // Get user settings for business details
      const userSettings = await storage.getUserSettings(userId);

      if (!contract?.clientEmail) {
        return res.status(400).json({ message: "Client email not found. Please add client email to the contract." });
      }

      // Import SendGrid functions
      const { sendEmail } = await import('./sendgrid');
      
      // Generate contract signing link instead of PDF attachment
      const currentDomain = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
      const contractSignUrl = `https://${currentDomain}/sign-contract/${contract.id}`;
      const contractViewUrl = `https://${currentDomain}/view-contract/${contract.id}`;
      
      console.log('=== SENDING CONTRACT EMAIL WITH SIGNING LINK ===');
      console.log('Contract sign URL:', contractSignUrl);
      console.log('Contract view URL:', contractViewUrl);
      
      // Smart email handling - use authenticated domain for sending, Gmail for replies
      const userBusinessEmail = userSettings?.businessEmail;
      const fromName = userSettings?.emailFromName || userSettings?.businessName || 'MusoBuddy User';
      
      // Always use authenticated domain for FROM to avoid SPF issues
      const fromEmail = 'noreply@musobuddy.com';
      
      // If user has Gmail (or other non-authenticated domain), use it as reply-to
      const replyToEmail = userBusinessEmail && !userBusinessEmail.includes('@musobuddy.com') ? userBusinessEmail : null;
      
      console.log('=== CONTRACT EMAIL DETAILS ===');
      console.log('To:', contract.clientEmail);
      console.log('From:', `${fromName} <${fromEmail}>`);
      console.log('Reply-To:', replyToEmail);
      console.log('Subject:', `Performance Contract ${contract.contractNumber} from ${fromName}`);
      
      const emailData: any = {
        to: contract.clientEmail,
        from: `${fromName} <${fromEmail}>`,
        subject: `Performance Contract ${contract.contractNumber} from ${fromName} - Please Sign`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #0EA5E9; margin-bottom: 20px;">Performance Contract ${contract.contractNumber}</h1>
            
            <p>Dear ${contract.clientName},</p>
            <p>Please find your performance contract ready for signing.</p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #333;">Event Details</h3>
              <p><strong>Date:</strong> ${new Date(contract.eventDate).toLocaleDateString('en-GB')}</p>
              <p><strong>Time:</strong> ${contract.eventTime}</p>
              <p><strong>Venue:</strong> ${contract.venue}</p>
              <p><strong>Fee:</strong> £${contract.fee}</p>
              <p><strong>Deposit:</strong> £${contract.deposit}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${contractSignUrl}" style="background: #0EA5E9; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">Sign Contract Online</a>
            </div>
            
            <div style="text-align: center; margin: 20px 0;">
              <a href="${contractViewUrl}" style="background: #6B7280; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; font-size: 14px; display: inline-block;">View Contract Details</a>
            </div>
            
            <p style="color: #6B7280; font-size: 14px;">
              By clicking "Sign Contract Online" you'll be taken to a secure page where you can review and digitally sign the contract. No downloads or printing required.
            </p>
            
            <p>Thank you for choosing our services!</p>
            <p>Best regards,<br><strong>${userSettings?.businessName || fromName}</strong></p>
            
            <p style="text-align: center; color: #6B7280; font-size: 12px; margin-top: 30px;">
              <small>Powered by MusoBuddy – less admin, more music</small>
            </p>
          </div>
        `,
        text: `Performance Contract ${contract.contractNumber}. Event: ${new Date(contract.eventDate).toLocaleDateString('en-GB')} at ${contract.venue}. Fee: £${contract.fee}. Sign online: ${contractSignUrl}`
      };
      
      // Add reply-to if user has Gmail or other external email
      if (replyToEmail) {
        emailData.replyTo = replyToEmail;
      }
      
      const emailSent = await sendEmail(emailData);

      if (emailSent) {
        // Update contract status to sent
        await storage.updateContract(contractId, { status: "sent" }, userId);
        console.log(`Contract ${contract.contractNumber} sent successfully to ${contract.clientEmail}`);
        res.json({ message: "Contract sent successfully via email" });
      } else {
        res.status(500).json({ message: "Failed to send email. Please check your email settings." });
      }
    } catch (error) {
      console.error("Error sending contract email:", error);
      res.status(500).json({ message: "Failed to send contract email" });
    }
  });

  // Public contract routes for signing (no authentication required)
  app.get('/api/contracts/public/:id', async (req, res) => {
    try {
      const contractId = parseInt(req.params.id);
      
      // Get contract without user authentication
      const contract = await storage.getContractById(contractId);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      
      // Only return contracts that are sent (ready for signing) or already signed (for confirmation)
      if (contract.status !== 'sent' && contract.status !== 'signed') {
        return res.status(404).json({ message: "Contract not available for signing" });
      }
      
      res.json(contract);
    } catch (error) {
      console.error("Error fetching public contract:", error);
      res.status(500).json({ message: "Failed to fetch contract" });
    }
  });

  app.get('/api/settings/public/:userId', async (req, res) => {
    try {
      const userId = req.params.userId;
      const settings = await storage.getUserSettings(userId);
      
      // Return only business-facing settings for contract display
      const publicSettings = settings ? {
        businessName: settings.businessName,
        businessEmail: settings.businessEmail,
        businessAddress: settings.businessAddress,
        phone: settings.phone,
        website: settings.website
      } : null;
      
      res.json(publicSettings);
    } catch (error) {
      console.error("Error fetching public settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.post('/api/contracts/sign/:id', async (req, res) => {
    try {
      const contractId = parseInt(req.params.id);
      const { signatureName } = req.body;
      
      if (!signatureName || !signatureName.trim()) {
        return res.status(400).json({ message: "Signature name is required" });
      }
      
      // Get contract
      const contract = await storage.getContractById(contractId);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      
      if (contract.status !== 'sent') {
        return res.status(400).json({ message: "Contract is not available for signing" });
      }
      
      // Get client IP for audit trail
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
      
      // Update contract with signature
      const signedContract = await storage.signContract(contractId, {
        signatureName: signatureName.trim(),
        clientIP,
        signedAt: new Date()
      });
      
      if (!signedContract) {
        return res.status(500).json({ message: "Failed to sign contract" });
      }
      
      // Send confirmation emails with download links (no PDF generation)
      try {
        const userSettings = await storage.getUserSettings(contract.userId);
        const { sendEmail } = await import('./sendgrid');
        
        // Generate contract download links
        const currentDomain = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
        const contractDownloadUrl = `https://${currentDomain}/api/contracts/${signedContract.id}/download`;
        const contractViewUrl = `https://${currentDomain}/view-contract/${signedContract.id}`;
        
        // Smart email handling - use authenticated domain for sending, Gmail for replies
        const userBusinessEmail = userSettings?.businessEmail;
        const fromName = userSettings?.emailFromName || userSettings?.businessName || 'MusoBuddy User';
        
        // Always use authenticated domain for FROM to avoid SPF issues
        const fromEmail = 'noreply@musobuddy.com';
        
        // If user has Gmail (or other non-authenticated domain), use it as reply-to
        const replyToEmail = userBusinessEmail && !userBusinessEmail.includes('@musobuddy.com') ? userBusinessEmail : null;
        
        console.log('=== CONTRACT SIGNING CONFIRMATION EMAIL ===');
        console.log('To:', contract.clientEmail);
        console.log('From:', `${fromName} <${fromEmail}>`);
        console.log('Reply-To:', replyToEmail);
        console.log('Contract download URL:', contractDownloadUrl);
        console.log('Contract view URL:', contractViewUrl);
        
        // Email to client with download link
        const clientEmailData: any = {
          to: contract.clientEmail,
          from: `${fromName} <${fromEmail}>`,
          subject: `Contract ${contract.contractNumber} Successfully Signed ✓`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #4CAF50; margin-bottom: 20px;">Contract Signed Successfully ✓</h2>
              
              <p>Dear ${contract.clientName},</p>
              <p>Your performance contract <strong>${contract.contractNumber}</strong> has been successfully signed!</p>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #333;">Event Details</h3>
                <p><strong>Date:</strong> ${new Date(contract.eventDate).toLocaleDateString('en-GB')}</p>
                <p><strong>Time:</strong> ${contract.eventTime}</p>
                <p><strong>Venue:</strong> ${contract.venue}</p>
                <p><strong>Fee:</strong> £${contract.fee}</p>
                <p><strong>Signed by:</strong> ${signatureName.trim()}</p>
                <p><strong>Signed on:</strong> ${new Date().toLocaleString('en-GB')}</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${contractViewUrl}" style="background: #0EA5E9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin-right: 10px;">View Signed Contract</a>
                <a href="${contractDownloadUrl}" style="background: #6B7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Download PDF</a>
              </div>
              
              <p style="color: #6B7280; font-size: 14px;">
                Your signed contract is ready for download at any time. We look forward to performing at your event!
              </p>
              
              <p>Best regards,<br><strong>${userSettings?.businessName || fromName}</strong></p>
              
              <p style="text-align: center; color: #6B7280; font-size: 12px; margin-top: 30px;">
                <small>Powered by MusoBuddy – less admin, more music</small>
              </p>
            </div>
          `,
          text: `Contract ${contract.contractNumber} successfully signed by ${signatureName.trim()}. Event: ${new Date(contract.eventDate).toLocaleDateString('en-GB')} at ${contract.venue}. View: ${contractViewUrl} Download: ${contractDownloadUrl}`
        };
        
        // Add reply-to if user has Gmail or other external email
        if (replyToEmail) {
          clientEmailData.replyTo = replyToEmail;
        }
        
        await sendEmail(clientEmailData);
        
        // Email to performer (business owner) with download link
        if (userSettings?.businessEmail) {
          const performerEmailData: any = {
            to: userSettings.businessEmail,
            from: `${fromName} <${fromEmail}>`,
            subject: `Contract ${contract.contractNumber} Signed by Client ✓`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #4CAF50; margin-bottom: 20px;">Contract Signed! ✓</h2>
                
                <p>Great news! Contract <strong>${contract.contractNumber}</strong> has been signed by ${contract.clientName}.</p>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #333;">Event Details</h3>
                  <p><strong>Date:</strong> ${new Date(contract.eventDate).toLocaleDateString('en-GB')}</p>
                  <p><strong>Time:</strong> ${contract.eventTime}</p>
                  <p><strong>Venue:</strong> ${contract.venue}</p>
                  <p><strong>Fee:</strong> £${contract.fee}</p>
                </div>
                
                <div style="background: #e3f2fd; padding: 15px; border-radius: 5px; border-left: 4px solid #2196F3; margin: 20px 0;">
                  <p style="margin: 0;"><strong>Signature Details:</strong></p>
                  <p style="margin: 5px 0;">Signed by: ${signatureName.trim()}</p>
                  <p style="margin: 5px 0;">Time: ${new Date().toLocaleString('en-GB')}</p>
                  <p style="margin: 5px 0;">IP: ${clientIP}</p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${contractViewUrl}" style="background: #0EA5E9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin-right: 10px;">View Signed Contract</a>
                  <a href="${contractDownloadUrl}" style="background: #6B7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Download PDF</a>
                </div>
                
                <p style="background: #e8f5e8; padding: 15px; border-radius: 5px; border-left: 4px solid #4CAF50;">
                  📋 <strong>The signed contract is ready for download when needed.</strong>
                </p>
                
                <p style="text-align: center; color: #6B7280; font-size: 12px; margin-top: 30px;">
                  <small>Powered by MusoBuddy – less admin, more music</small>
                </p>
              </div>
            `,
            text: `Contract ${contract.contractNumber} signed by ${signatureName.trim()} on ${new Date().toLocaleString('en-GB')}. View: ${contractViewUrl} Download: ${contractDownloadUrl}`
          };
          
          // Add reply-to for performer email too
          if (replyToEmail) {
            performerEmailData.replyTo = replyToEmail;
          }
          
          await sendEmail(performerEmailData);
        }
      } catch (emailError) {
        console.error("Error sending confirmation emails:", emailError);
        // Don't fail the signing process if email fails
      }
      
      res.json({ 
        message: "Contract signed successfully",
        contract: signedContract 
      });
      
    } catch (error) {
      console.error("Error signing contract:", error);
      res.status(500).json({ message: "Failed to sign contract" });
    }
  });

  // Invoice management routes
  app.post('/api/invoices/:id/mark-paid', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const invoiceId = parseInt(req.params.id);
      const { paidDate } = req.body;
      
      const { invoiceManager } = await import('./invoice-manager');
      const success = await invoiceManager.markInvoiceAsPaid(invoiceId, userId, paidDate ? new Date(paidDate) : undefined);
      
      if (success) {
        res.json({ message: "Invoice marked as paid successfully" });
      } else {
        res.status(404).json({ message: "Invoice not found or could not be updated" });
      }
    } catch (error) {
      console.error("Error marking invoice as paid:", error);
      res.status(500).json({ message: "Failed to mark invoice as paid" });
    }
  });

  app.post('/api/invoices/:id/send-reminder', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const invoiceId = parseInt(req.params.id);
      
      const { invoiceManager } = await import('./invoice-manager');
      const success = await invoiceManager.generateOverdueReminder(invoiceId, userId);
      
      if (success) {
        res.json({ message: "Overdue reminder sent successfully" });
      } else {
        res.status(400).json({ message: "Could not send reminder. Invoice may not be overdue or client email missing." });
      }
    } catch (error) {
      console.error("Error sending overdue reminder:", error);
      res.status(500).json({ message: "Failed to send overdue reminder" });
    }
  });

  app.post('/api/invoices/check-overdue', isAuthenticated, async (req: any, res) => {
    try {
      const { invoiceManager } = await import('./invoice-manager');
      await invoiceManager.updateOverdueInvoices();
      res.json({ message: "Overdue invoices updated successfully" });
    } catch (error) {
      console.error("Error checking overdue invoices:", error);
      res.status(500).json({ message: "Failed to update overdue invoices" });
    }
  });

  // Email enquiry intake route (manual testing)
  app.post('/api/enquiries/email-intake', async (req, res) => {
    try {
      const { from, subject, body, receivedAt } = req.body;
      
      // Extract key information from email
      const { parseEmailEnquiry } = await import('./email-parser');
      const enquiryData = await parseEmailEnquiry(from, subject, body);
      
      // Create enquiry with extracted data
      const enquiry = await storage.createEnquiry({
        title: enquiryData.title,
        clientName: enquiryData.clientName,
        clientEmail: enquiryData.clientEmail || null,
        clientPhone: enquiryData.clientPhone || null,
        eventDate: enquiryData.eventDate || new Date(),
        venue: enquiryData.venue || null,
        notes: enquiryData.message,
        userId: "43963086", // Main account owner
        status: 'new',
      });
      
      res.json({ message: "Email enquiry processed successfully", enquiry });
    } catch (error) {
      console.error("Error processing email enquiry:", error);
      res.status(500).json({ message: "Failed to process email enquiry" });
    }
  });



  // Manual test endpoint for email processing
  app.post('/api/webhook/test', async (req, res) => {
    console.log('🧪 MANUAL TEST: Simulating email webhook...');
    try {
      const testEmailData = {
        to: 'leads@musobuddy.com',
        from: 'test@example.com',
        subject: 'Test Wedding Enquiry',
        text: `Hi, I'm looking to book a musician for my wedding on September 20th, 2025.
        
Event Details:
- Date: September 20th, 2025
- Venue: Grand Hotel, Manchester
- Contact: Jane Smith
- Phone: 07123 456789
- Email: jane.smith@email.com

Please let me know availability and pricing.

Best regards,
Jane`
      };
      
      const { handleSendGridWebhook } = await import('./email-webhook');
      
      // Create a mock request object
      const mockReq = {
        body: testEmailData,
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        method: 'POST',
        url: '/api/webhook/test'
      };
      
      await handleSendGridWebhook(mockReq as any, res);
    } catch (error) {
      console.error("Error in test webhook:", error);
      res.status(500).json({ message: "Test webhook failed", error: error.message });
    }
  });

  // Catch-all webhook routes for different possible SendGrid configurations
  app.post('/api/webhook/parse', async (req, res) => {
    console.log('🔥 WEBHOOK HIT! Email received via /api/webhook/parse');
    console.log('Request from IP:', req.ip);
    try {
      const { handleSendGridWebhook } = await import('./email-webhook');
      await handleSendGridWebhook(req, res);
    } catch (error) {
      console.error("Error in parse webhook:", error);
      res.status(500).json({ message: "Failed to process webhook" });
    }
  });

  app.post('/api/parse', async (req, res) => {
    console.log('🔥 WEBHOOK HIT! Email received via /api/parse');
    console.log('Request from IP:', req.ip);
    try {
      const { handleSendGridWebhook } = await import('./email-webhook');
      await handleSendGridWebhook(req, res);
    } catch (error) {
      console.error("Error in root parse webhook:", error);
      res.status(500).json({ message: "Failed to process webhook" });
    }
  });

  // Alternative webhook endpoint with different path (in case of URL issues)
  app.all('/api/webhook/sendgrid-alt', async (req, res) => {
    if (req.method === 'GET') {
      console.log('GET request to alternative webhook endpoint');
      res.json({ 
        status: 'active', 
        message: 'Alternative SendGrid webhook endpoint is accessible',
        timestamp: new Date().toISOString(),
        path: '/api/webhook/sendgrid-alt',
        method: 'Ready for POST requests',
        recommendedUrl: 'https://musobuddy.replit.app/api/webhook/sendgrid-alt'
      });
    } else if (req.method === 'POST') {
      console.log('🔥 ALTERNATIVE WEBHOOK HIT! Email received via /api/webhook/sendgrid-alt');
      console.log('Request IP:', req.ip);
      console.log('User-Agent:', req.headers['user-agent']);
      console.log('Content-Type:', req.headers['content-type']);
      try {
        const { handleSendGridWebhook } = await import('./email-webhook');
        await handleSendGridWebhook(req, res);
      } catch (error) {
        console.error("Error in alternative SendGrid webhook:", error);
        res.status(500).json({ message: "Failed to process SendGrid webhook" });
      }
    } else {
      res.status(405).json({ message: 'Method not allowed' });
    }
  });

  // Global catch-all for any webhook attempts
  app.use((req, res, next) => {
    if (req.url.includes('webhook') || req.url.includes('parse')) {
      console.log(`📧 Webhook attempt detected: ${req.method} ${req.url}`);
      console.log(`Headers:`, req.headers);
      console.log(`Body:`, req.body);
    }
    next();
  });

  // Working webhook endpoint for SendGrid
  app.all('/api/webhook/email', async (req, res) => {
    console.log(`📧 EMAIL WEBHOOK: ${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    
    if (req.method === 'GET') {
      res.json({ 
        status: 'active', 
        message: 'Email webhook endpoint is working',
        timestamp: new Date().toISOString(),
        url: 'https://musobuddy.replit.app/api/webhook/email'
      });
    } else if (req.method === 'POST') {
      console.log('🔥 EMAIL WEBHOOK HIT! Processing email...');
      try {
        const { handleSendGridWebhook } = await import('./email-webhook');
        await handleSendGridWebhook(req, res);
      } catch (error) {
        console.error("Error in email webhook:", error);
        res.status(500).json({ message: "Failed to process email webhook" });
      }
    } else {
      res.status(405).json({ message: 'Method not allowed' });
    }
  });

  // Mailgun Email Webhook (alternative)
  app.post('/api/webhook/mailgun', async (req, res) => {
    try {
      const { handleMailgunWebhook } = await import('./email-webhook');
      await handleMailgunWebhook(req, res);
    } catch (error) {
      console.error("Error in Mailgun webhook:", error);
      res.status(500).json({ message: "Failed to process Mailgun webhook" });
    }
  });

  // Booking routes
  app.get('/api/bookings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bookings = await storage.getBookings(userId);
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.get('/api/bookings/upcoming', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bookings = await storage.getUpcomingBookings(userId);
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching upcoming bookings:", error);
      res.status(500).json({ message: "Failed to fetch upcoming bookings" });
    }
  });

  app.post('/api/bookings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = { ...req.body, userId };
      
      // Convert eventDate string to Date if present
      if (data.eventDate && typeof data.eventDate === 'string') {
        data.eventDate = new Date(data.eventDate);
      }
      
      const bookingData = insertBookingSchema.parse(data);
      const booking = await storage.createBooking(bookingData);
      res.status(201).json(booking);
    } catch (error) {
      console.error("Error creating booking:", error);
      res.status(500).json({ message: "Failed to create booking" });
    }
  });

  // Compliance document routes
  app.get('/api/compliance', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const documents = await storage.getComplianceDocuments(userId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching compliance documents:", error);
      res.status(500).json({ message: "Failed to fetch compliance documents" });
    }
  });

  app.post('/api/compliance', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const documentData = insertComplianceDocumentSchema.parse({ ...req.body, userId });
      const document = await storage.createComplianceDocument(documentData);
      res.status(201).json(document);
    } catch (error) {
      console.error("Error creating compliance document:", error);
      res.status(500).json({ message: "Failed to create compliance document" });
    }
  });

  // User settings routes
  app.get('/api/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const settings = await storage.getUserSettings(userId);
      res.json(settings || {});
    } catch (error) {
      console.error("Error fetching user settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.post('/api/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log("Saving settings for user:", userId);
      console.log("Request body:", req.body);
      
      const settingsData = { ...req.body, userId };
      console.log("Settings data to save:", settingsData);
      
      const settings = await storage.upsertUserSettings(settingsData);
      console.log("Settings saved successfully:", settings);
      res.json(settings);
    } catch (error) {
      console.error("Error saving user settings:", error);
      console.error("Error details:", error.message);
      console.error("Error stack:", error.stack);
      res.status(500).json({ message: "Failed to save settings" });
    }
  });

  // Catch-all route to log any unmatched requests
  app.use('*', (req, res, next) => {
    console.log(`=== UNMATCHED ROUTE: ${req.method} ${req.originalUrl} ===`);
    next();
  });

  const httpServer = createServer(app);
  return httpServer;
}
