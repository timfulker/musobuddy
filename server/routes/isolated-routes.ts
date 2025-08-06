import { type Express } from "express";
import { storage } from "../core/storage";
import { EmailService } from "../core/services";
import { requireAuth } from '../middleware/auth';

export function registerIsolatedRoutes(app: Express) {
  console.log('🔗 Setting up isolated routes for cloud compatibility...');

  // FIXED: Add missing isolated contract email endpoint
  app.post('/api/isolated/contracts/send-email', requireAuth, async (req: any, res) => {
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
      
      const userId = req.user?.userId;
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
      
      // Generate signing page and upload to R2
      const { uploadContractSigningPageToR2 } = await import('../contract-signing-page-generator');
      const signingPageResult = await uploadContractSigningPageToR2(updatedContract, userSettings);
      
      if (!signingPageResult.success) {
        console.error('❌ Failed to upload signing page to R2:', signingPageResult.error);
        return res.status(500).json({ error: 'Failed to generate contract signing page' });
      }
      
      // Update contract status with signing page URL
      await storage.updateContract(parsedContractId, {
        status: 'sent',
        signingPageUrl: signingPageResult.url,
        signingPageKey: signingPageResult.key,
        updatedAt: new Date()
      });
      
      // Send email using EmailService with SIGNING PAGE URL (not PDF URL)
      const emailService = new EmailService();
      const subject = `Contract ready for signing - ${contract.contractNumber}`;
      
      try {
        await emailService.sendContractEmail(updatedContract, userSettings, subject, signingPageResult.url, customMessage || '');
        console.log(`✅ Contract email sent successfully for contract ${contractId}`);
        
        res.json({ 
          success: true, 
          message: 'Contract sent successfully',
          contractUrl: signingPageResult.url,
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
  });

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
      const userId = req.user?.userId;
      
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
      const { generateContractPDF } = await import('../unified-contract-pdf');
      
      const signatureDetails = contract.status === 'signed' ? {
        signedAt: new Date(contract.signedAt || contract.updatedAt || new Date()),
        signatureName: contract.clientSignature || 'Digital Signature',
        clientIpAddress: contract.clientIpAddress || undefined
      } : undefined;
      
      const pdfBuffer = await generateContractPDF(contract, userSettings, signatureDetails);
      
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