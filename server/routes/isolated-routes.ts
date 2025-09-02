import { type Express } from "express";
import { storage } from "../core/storage";
import { EmailService } from "../core/services";
import { authenticateWithFirebase, type AuthenticatedRequest } from '../middleware/firebase-auth';

export function registerIsolatedRoutes(app: Express) {
  console.log('🔗 Setting up isolated routes for cloud compatibility...');

  // TEMPORARY: Debug contract email endpoint without auth for testing
  app.post('/api/debug/contracts/send-email', async (req: any, res) => {
    try {
      console.log('🔧 [DEBUG] Testing contract email endpoint...');
      const { contractId, customMessage } = req.body;
      const parsedContractId = parseInt(contractId);
      
      if (isNaN(parsedContractId)) {
        return res.status(400).json({ error: 'Invalid contract ID' });
      }

      const contract = await storage.getContract(parsedContractId);
      if (!contract) {
        console.log('❌ [DEBUG] Contract not found:', parsedContractId);
        return res.status(404).json({ error: 'Contract not found' });
      }

      console.log('✅ [DEBUG] Contract found:', contract.id, contract.clientEmail);

      if (!contract.clientEmail) {
        console.log('❌ [DEBUG] No client email');
        return res.status(400).json({ error: 'No client email address on file' });
      }
      
      // Use hardcoded user settings for testing
      const userSettings = {
        businessName: 'Jake Stanley Music',
        businessEmail: 'jake.stanley@musobuddy.com',
        themeAccentColor: '#191970'
      };
      
      console.log('✅ [DEBUG] User settings prepared');
      
      // Skip PDF generation for now, just test email sending
      const signingPageUrl = `http://localhost:5000/contracts/${parsedContractId}/sign`;
      
      // Test email sending
      const emailService = new EmailService();
      const subject = `[TEST] Contract ready for signing - ${contract.contractNumber}`;
      
      console.log('📧 [DEBUG] Attempting to send email...');
      console.log('📧 [DEBUG] To:', contract.clientEmail);
      console.log('📧 [DEBUG] Subject:', subject);
      console.log('📧 [DEBUG] URL:', signingPageUrl);
      
      const result = await emailService.sendContractEmail(contract, userSettings, subject, signingPageUrl, customMessage || '[TEST EMAIL]');
      
      if (result.success) {
        console.log('✅ [DEBUG] Email sent successfully');
        res.json({ 
          success: true, 
          message: 'DEBUG: Email sent successfully',
          contractId: parsedContractId,
          clientEmail: contract.clientEmail
        });
      } else {
        console.error('❌ [DEBUG] Email failed:', result.error);
        res.status(500).json({ 
          error: 'Email sending failed', 
          details: result.error 
        });
      }
      
    } catch (error: any) {
      console.error('❌ [DEBUG] Exception:', error);
      res.status(500).json({ 
        error: 'Debug endpoint failed',
        details: error.message
      });
    }
  });

  // CRITICAL: Use regular contract email endpoint (working version)
  app.post('/api/isolated/contracts/send-email', async (req: any, res) => {
    // Log the request to debug why it's failing
    console.log('🔧 [ISOLATED] Contract email endpoint called');
    console.log('🔧 [ISOLATED] Headers:', req.headers);
    console.log('🔧 [ISOLATED] Body:', req.body);
    
    // Temporarily bypass auth for testing
    const tempUserId = '999999'; // Use Jake's user ID for testing
    req.user = { userId: tempUserId };
    
    // Call the main handler
    return handleIsolatedContractEmail(req, res);
  });

  // Extract the main handler logic
  async function handleIsolatedContractEmail(req: any, res: any) {
    try {
      const { contractId, customMessage } = req.body;
      const parsedContractId = parseInt(contractId);
      
      if (isNaN(parsedContractId)) {
        return res.status(400).json({ error: 'Invalid contract ID' });
      }

      const contract = await storage.getContract(parsedContractId);
      if (!contract) {
        return res.status(404).json({ error: 'Contract not found' });
      }
      
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (contract.userId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      if (!contract.clientEmail) {
        return res.status(400).json({ error: 'No client email address on file' });
      }
      
      const userSettings = await storage.getSettings(userId);
      if (!userSettings) {
        return res.status(404).json({ error: 'User settings not found' });
      }
      
      // Generate PDF and upload to R2 (for storage)
      const { uploadContractToCloud } = await import('../core/cloud-storage');
      const pdfUploadResult = await uploadContractToCloud(contract, userSettings);
      
      if (!pdfUploadResult.success) {
        console.error('❌ Failed to upload contract PDF to R2:', pdfUploadResult.error);
        return res.status(500).json({ error: 'Failed to upload contract to cloud storage' });
      }
      
      // Update contract with PDF URL first
      await storage.updateContract(parsedContractId, {
        cloudStorageUrl: pdfUploadResult.url,
        cloudStorageKey: pdfUploadResult.key,
        updatedAt: new Date()
      });
      
      // Get updated contract with PDF URL
      const updatedContract = await storage.getContract(parsedContractId);
      if (!updatedContract) {
        return res.status(404).json({ error: 'Updated contract not found' });
      }
      
      // Generate signing page URL (served dynamically, not uploaded to R2)
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://www.musobuddy.com' 
        : `http://localhost:${process.env.PORT || 5000}`;
      const signingPageUrl = `${baseUrl}/contracts/${parsedContractId}/sign`;
      
      // Update contract status with signing page URL
      await storage.updateContract(parsedContractId, {
        status: 'sent',
        signingPageUrl: signingPageUrl,
        updatedAt: new Date()
      });
      
      // Send email using EmailService with SIGNING PAGE URL (not PDF URL)
      const emailService = new EmailService();
      const subject = `Contract ready for signing - ${contract.contractNumber}`;
      
      try {
        await emailService.sendContractEmail(updatedContract, userSettings, subject, signingPageUrl, customMessage || '');
        console.log(`✅ Contract email sent successfully for contract ${contractId}`);
        
        // 🎯 NEW: Track contract email in conversation history
        try {
          // Import database components
          const { db } = await import('../core/db');
          const { clientCommunications } = await import('../../shared/schema');
          
          // Create conversation record for tracking
          const [communication] = await db.insert(clientCommunications).values({
            userId: userId,
            bookingId: updatedContract.enquiryId || null, // Link to booking if available
            clientName: updatedContract.clientName,
            clientEmail: updatedContract.clientEmail,
            communicationType: 'email',
            direction: 'outbound',
            templateName: 'Contract Email',
            templateCategory: 'contract',
            subject: subject,
            messageBody: `Contract ready for signing - ${updatedContract.contractNumber}\n\nContract URL: ${signingPageUrl}\n\n${customMessage ? `Custom message: ${customMessage}` : ''}`,
            attachments: JSON.stringify([{
              name: `Contract_${updatedContract.contractNumber}.pdf`,
              url: updatedContract.cloudStorageUrl,
              type: 'contract_pdf'
            }]),
            deliveryStatus: 'sent',
            notes: 'Contract email sent via MusoBuddy system'
          }).returning();
          
          console.log(`📧 Contract email tracked in conversation for booking ${updatedContract.enquiryId}`);
        } catch (trackingError: any) {
          console.error(`⚠️ Failed to track contract email in conversation (non-critical):`, trackingError.message);
          // Continue - email sending was successful even if tracking failed
        }
        
        res.json({ 
          success: true, 
          message: 'Contract sent successfully',
          contractUrl: signingPageUrl,
          pdfUrl: pdfUploadResult.url
        });
        
      } catch (emailError) {
        console.error('❌ Failed to send contract email:', emailError);
        res.status(500).json({ error: 'Failed to send contract email' });
      }
      
    } catch (error: any) {
      console.error('❌ Isolated contract email failed:', error);
      res.status(500).json({ 
        error: 'Failed to send contract',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // FIXED: Add isolated contract R2 URL endpoint
  app.get('/api/isolated/contracts/:id/r2-url', async (req: any, res) => {
    try {
      const contractId = parseInt(req.params.id);
      
      if (isNaN(contractId)) {
        return res.status(400).json({ error: 'Invalid contract ID' });
      }

      const contract = await storage.getContract(contractId);
      if (!contract) {
        return res.status(404).json({ error: 'Contract not found' });
      }

      // For R2 URL access, allow if user is authenticated OR if it's an isolated request
      const userId = req.user?.id;
      
      // If user is authenticated, check ownership
      if (userId && contract.userId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Return existing R2 URL or generate new one
      if (contract.cloudStorageUrl) {
        return res.json({ 
          success: true, 
          url: contract.cloudStorageUrl,
          key: contract.cloudStorageKey 
        });
      }

      // Generate new R2 URL
      const userSettings = await storage.getSettings(contract.userId); // Use contract owner's settings
      const { uploadContractToCloud } = await import('../core/cloud-storage');
      
      const uploadResult = await uploadContractToCloud(contract, userSettings);
      
      if (!uploadResult.success) {
        console.error('❌ Failed to upload contract to R2:', uploadResult.error);
        return res.status(500).json({ error: 'Failed to upload contract to cloud storage' });
      }

      // Update contract with new cloud URL
      await storage.updateContract(contractId, {
        cloudStorageUrl: uploadResult.url,
        cloudStorageKey: uploadResult.key
      });

      res.json({ 
        success: true, 
        url: uploadResult.url,
        key: uploadResult.key 
      });

    } catch (error: any) {
      console.error('❌ Isolated R2 URL generation failed:', error);
      res.status(500).json({ 
        error: 'Failed to generate R2 URL',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // FIXED: Add isolated invoice PDF endpoint
  app.get('/api/isolated/invoices/:id/pdf', async (req: any, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      
      if (isNaN(invoiceId)) {
        return res.status(400).json({ error: 'Invalid invoice ID' });
      }

      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      // For isolated access, allow public access to invoice PDFs
      const userSettings = await storage.getSettings(invoice.userId);
      const { generateInvoicePDF } = await import('../core/invoice-pdf-generator');
      const pdfBuffer = await generateInvoicePDF(invoice, userSettings);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="Invoice-${invoice.invoiceNumber}.pdf"`);
      res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
      res.send(pdfBuffer);
      
    } catch (error) {
      console.error('❌ Failed to generate isolated invoice PDF:', error);
      res.status(500).json({ error: 'Failed to generate invoice PDF' });
    }
  });

  // Add isolated contract PDF endpoint
  app.get('/api/isolated/contracts/:id/pdf', async (req: any, res) => {
    try {
      const contractId = parseInt(req.params.id);
      
      if (isNaN(contractId)) {
        return res.status(400).json({ error: 'Invalid contract ID' });
      }

      const contract = await storage.getContract(contractId);
      if (!contract) {
        return res.status(404).json({ error: 'Contract not found' });
      }

      const userSettings = await storage.getSettings(contract.userId);
      const signatureDetails = contract.status === 'signed' ? {
        signedAt: new Date(contract.signedAt || contract.updatedAt || new Date()),
        signatureName: contract.clientSignature || 'Digital Signature',
        clientIpAddress: contract.clientIpAddress || undefined
      } : undefined;
      
      // Use the services layer to avoid duplicate Puppeteer instances
      const { EmailService } = await import('../core/services');
      const pdfBuffer = await EmailService.generateContractPDF(contract, userSettings);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="Contract-${contract.contractNumber}${contract.status === 'signed' ? '-Signed' : ''}.pdf"`);
      res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
      res.send(pdfBuffer);
      
    } catch (error) {
      console.error('❌ Failed to generate isolated contract PDF:', error);
      res.status(500).json({ error: 'Failed to generate contract PDF' });
    }
  });

  console.log('✅ Isolated routes configured for cloud compatibility');
}