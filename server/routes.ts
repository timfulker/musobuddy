import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertEnquirySchema, insertContractSchema, insertInvoiceSchema, insertBookingSchema, insertComplianceDocumentSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
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

  // Contract PDF download route
  app.get('/api/contracts/:id/pdf', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const contractId = parseInt(req.params.id);
      
      const contract = await storage.getContract(contractId, userId);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      
      const userSettings = await storage.getUserSettings(userId);
      const { generateContractPDF } = await import('./pdf-generator');
      
      const signatureDetails = contract.signedAt ? {
        signedAt: contract.signedAt,
        signatureName: contract.clientName, // We'll store this properly later
        clientIpAddress: 'Digital signature'
      } : undefined;
      
      const pdfBuffer = await generateContractPDF(contract, userSettings, signatureDetails);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Contract-${contract.contractNumber}.pdf"`);
      res.send(pdfBuffer);
      
    } catch (error) {
      console.error("Error generating contract PDF:", error);
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  });

  // Public contract PDF download (for clients)
  app.get('/api/contracts/public/:id/pdf', async (req, res) => {
    try {
      const contractId = parseInt(req.params.id);
      
      const contract = await storage.getContractById(contractId);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      
      // Only allow PDF download for signed contracts
      if (contract.status !== 'signed') {
        return res.status(403).json({ message: "Contract must be signed to download PDF" });
      }
      
      const userSettings = await storage.getUserSettings(contract.userId);
      const { generateContractPDF } = await import('./pdf-generator');
      
      const signatureDetails = contract.signedAt ? {
        signedAt: contract.signedAt,
        signatureName: contract.clientName,
        clientIpAddress: 'Digital signature'
      } : undefined;
      
      const pdfBuffer = await generateContractPDF(contract, userSettings, signatureDetails);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Contract-${contract.contractNumber}.pdf"`);
      res.send(pdfBuffer);
      
    } catch (error) {
      console.error("Error generating public contract PDF:", error);
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  });

  // Invoice PDF download route
  app.get('/api/invoices/:id/pdf', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const invoiceId = parseInt(req.params.id);
      
      const invoice = await storage.getInvoice(invoiceId, userId);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Get related contract for client details
      let contract = null;
      if (invoice.contractId) {
        contract = await storage.getContract(invoice.contractId, userId);
      }
      
      const userSettings = await storage.getUserSettings(userId);
      const { generateInvoicePDF } = await import('./pdf-generator');
      
      const pdfBuffer = await generateInvoicePDF(invoice, contract, userSettings);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Invoice-${invoice.invoiceNumber}.pdf"`);
      res.send(pdfBuffer);
      
    } catch (error) {
      console.error("Error generating invoice PDF:", error);
      res.status(500).json({ message: "Failed to generate PDF" });
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

  app.post('/api/invoices', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log("Received invoice data:", req.body);
      
      // Prepare the invoice data with all required fields
      const invoiceData = {
        userId,
        invoiceNumber: req.body.invoiceNumber,
        contractId: parseInt(req.body.contractId.toString()),
        clientName: req.body.clientName,
        businessAddress: req.body.businessAddress || null,
        amount: req.body.amount.toString(),
        dueDate: new Date(req.body.dueDate),
        performanceDate: req.body.performanceDate ? new Date(req.body.performanceDate) : null,
        performanceFee: req.body.performanceFee || "0",
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

  // Update invoice
  app.patch('/api/invoices/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const invoiceId = parseInt(req.params.id);
      
      const updatedInvoice = await storage.updateInvoice(invoiceId, req.body, userId);
      if (!updatedInvoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      res.json(updatedInvoice);
    } catch (error) {
      console.error("Error updating invoice:", error);
      res.status(500).json({ message: "Failed to update invoice" });
    }
  });

  // Test endpoint for debugging
  app.post('/api/test-email', async (req: any, res) => {
    console.log('TEST EMAIL ENDPOINT REACHED');
    res.json({ success: true, message: 'Test endpoint working' });
  });

  // Send invoice email
  app.post('/api/invoices/send-email', isAuthenticated, async (req: any, res) => {
    try {
      console.log('=== INVOICE EMAIL SEND REQUEST ===');
      console.log('Request body:', req.body);
      const userId = req.user.claims.sub;
      const { invoiceId } = req.body;
      
      // Get the invoice details
      const invoice = await storage.getInvoice(invoiceId, userId);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      // Get related contract for client email
      let contract = null;
      if (invoice.contractId) {
        contract = await storage.getContract(invoice.contractId, userId);
      }

      // Get user settings for business details
      const userSettings = await storage.getUserSettings(userId);

      if (!contract?.clientEmail) {
        return res.status(400).json({ message: "Client email not found. Please add client email to the contract." });
      }

      // First update invoice status to sent
      const updatedInvoice = await storage.updateInvoice(invoiceId, { status: "sent" }, userId);
      if (!updatedInvoice) {
        return res.status(404).json({ message: "Failed to update invoice status" });
      }

      // Import SendGrid functions
      const { sendEmail } = await import('./sendgrid');
      
      // Smart email handling - use authenticated domain for sending, Gmail for replies
      const userBusinessEmail = userSettings?.businessEmail;
      const fromName = userSettings?.emailFromName || userSettings?.businessName || 'MusoBuddy User';
      
      // Always use authenticated domain for FROM to avoid SPF issues
      const fromEmail = 'noreply@musobuddy.com';
      
      // If user has Gmail (or other non-authenticated domain), use it as reply-to
      const replyToEmail = userBusinessEmail && !userBusinessEmail.includes('@musobuddy.com') ? userBusinessEmail : null;
      
      console.log('=== EMAIL DETAILS ===');
      console.log('To:', contract.clientEmail);
      console.log('From:', `${fromName} <${fromEmail}>`);
      console.log('Reply-To:', replyToEmail);
      console.log('Subject:', `Invoice ${updatedInvoice.invoiceNumber} from ${fromName}`);
      
      const emailData: any = {
        to: contract.clientEmail,
        from: `${fromName} <${fromEmail}>`,
        subject: `Invoice ${updatedInvoice.invoiceNumber} from ${fromName}`,
        html: `<h1>Invoice ${updatedInvoice.invoiceNumber}</h1><p>Amount: £${updatedInvoice.amount}</p><p>Due Date: ${new Date(updatedInvoice.dueDate).toLocaleDateString('en-GB')}</p>`,
        text: `Invoice ${updatedInvoice.invoiceNumber}. Amount: £${updatedInvoice.amount}. Due date: ${new Date(updatedInvoice.dueDate).toLocaleDateString('en-GB')}.`
      };
      
      // Add reply-to if user has Gmail or other external email
      if (replyToEmail) {
        emailData.replyTo = replyToEmail;
      }
      
      const emailSent = await sendEmail(emailData);

      if (emailSent) {
        console.log(`Invoice ${updatedInvoice.invoiceNumber} sent successfully to ${contract.clientEmail}`);
        res.json({ 
          message: "Invoice sent successfully via email",
          debug: {
            invoiceId: invoiceId,
            clientEmail: contract.clientEmail,
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
            clientEmail: contract.clientEmail,
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
      const { sendEmail, generateContractHtml } = await import('./sendgrid');
      
      // Generate HTML content
      const htmlContent = generateContractHtml(contract, userSettings);
      
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
        subject: `Performance Contract ${contract.contractNumber} from ${fromName}`,
        html: htmlContent,
        text: `Please find attached your performance contract ${contract.contractNumber}. Event date: ${new Date(contract.eventDate).toLocaleDateString('en-GB')}. Fee: £${contract.fee}.`
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
      
      // Only return contracts that are sent (ready for signing)
      if (contract.status !== 'sent') {
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
      
      // Generate PDF and send confirmation emails with attachments
      try {
        const userSettings = await storage.getUserSettings(contract.userId);
        const { sendEmail } = await import('./sendgrid');
        const { generateContractPDF } = await import('./pdf-generator');
        
        const fromEmail = userSettings?.businessEmail || 'noreply@musobuddy.com';
        const fromName = userSettings?.emailFromName || userSettings?.businessName || 'MusoBuddy';
        
        // Generate signed contract PDF
        const signatureDetails = {
          signedAt: new Date(),
          signatureName: signatureName.trim(),
          clientIpAddress: clientIP
        };
        
        const pdfBuffer = await generateContractPDF(signedContract, userSettings, signatureDetails);
        const pdfBase64 = pdfBuffer.toString('base64');
        
        // Email to client with PDF attachment
        await sendEmail({
          to: contract.clientEmail,
          from: `${fromName} <${fromEmail}>`,
          subject: `Contract ${contract.contractNumber} Successfully Signed - Copy Attached`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #4CAF50;">Contract Signed Successfully ✓</h2>
              <p>Dear ${contract.clientName},</p>
              <p>Your performance contract <strong>${contract.contractNumber}</strong> has been successfully signed.</p>
              
              <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #333;">Event Details</h3>
                <ul style="list-style: none; padding: 0;">
                  <li><strong>Date:</strong> ${new Date(contract.eventDate).toLocaleDateString('en-GB')}</li>
                  <li><strong>Time:</strong> ${contract.eventTime}</li>
                  <li><strong>Venue:</strong> ${contract.venue}</li>
                  <li><strong>Fee:</strong> £${contract.fee}</li>
                </ul>
              </div>
              
              <p style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; border-left: 4px solid #4CAF50;">
                📎 <strong>Your signed contract is attached as a PDF for your records.</strong>
              </p>
              
              <p>We look forward to performing at your event!</p>
              <p>Best regards,<br><strong>${userSettings?.businessName || 'MusoBuddy'}</strong></p>
            </div>
          `,
          text: `Contract ${contract.contractNumber} has been successfully signed. Event: ${new Date(contract.eventDate).toLocaleDateString('en-GB')} at ${contract.venue}. Signed contract PDF is attached.`,
          attachments: [{
            content: pdfBase64,
            filename: `Contract-${contract.contractNumber}-Signed.pdf`,
            type: 'application/pdf',
            disposition: 'attachment'
          }]
        });
        
        // Email to performer (business owner) with PDF attachment
        if (userSettings?.businessEmail) {
          await sendEmail({
            to: userSettings.businessEmail,
            from: `${fromName} <${fromEmail}>`,
            subject: `Contract ${contract.contractNumber} Signed by Client - Copy Attached`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #4CAF50;">Contract Signed! ✓</h2>
                <p>Great news! Contract <strong>${contract.contractNumber}</strong> has been signed by ${contract.clientName}.</p>
                
                <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #333;">Event Details</h3>
                  <ul style="list-style: none; padding: 0;">
                    <li><strong>Date:</strong> ${new Date(contract.eventDate).toLocaleDateString('en-GB')}</li>
                    <li><strong>Time:</strong> ${contract.eventTime}</li>
                    <li><strong>Venue:</strong> ${contract.venue}</li>
                    <li><strong>Fee:</strong> £${contract.fee}</li>
                  </ul>
                </div>
                
                <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; border-left: 4px solid #2196F3;">
                  <p style="margin: 0;"><strong>Signature Details:</strong></p>
                  <p style="margin: 5px 0;">Signed by: ${signatureName}</p>
                  <p style="margin: 5px 0;">Time: ${new Date().toLocaleString('en-GB')}</p>
                </div>
                
                <p style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; border-left: 4px solid #4CAF50;">
                  📎 <strong>The signed contract PDF is attached for your records.</strong>
                </p>
              </div>
            `,
            text: `Contract ${contract.contractNumber} signed by ${signatureName} on ${new Date().toLocaleString('en-GB')}. Signed contract PDF is attached.`,
            attachments: [{
              content: pdfBase64,
              filename: `Contract-${contract.contractNumber}-Signed.pdf`,
              type: 'application/pdf',
              disposition: 'attachment'
            }]
          });
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

  // SendGrid Email Webhook (for leads@musobuddy.com)
  app.post('/api/webhook/sendgrid', async (req, res) => {
    try {
      const { handleSendGridWebhook } = await import('./email-webhook');
      await handleSendGridWebhook(req, res);
    } catch (error) {
      console.error("Error in SendGrid webhook:", error);
      res.status(500).json({ message: "Failed to process SendGrid webhook" });
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

  const httpServer = createServer(app);
  return httpServer;
}
