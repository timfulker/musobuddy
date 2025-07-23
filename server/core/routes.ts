import { type Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { isAuthenticated, isAdmin } from "./auth";
import { mailgunService, contractParserService, cloudStorageService } from "./services";
import { webhookService } from "./webhook-service";
import { generateHTMLContractPDF } from "./html-contract-template.js";
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

  // ===== PUBLIC CONTRACT SIGNING ROUTES (MUST BE FIRST - NO AUTHENTICATION) =====
  
  // Contract signing OPTIONS (PUBLIC - for CORS)
  app.options('/api/contracts/sign/:id', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.status(200).end();
  });

  // Contract signing API (PUBLIC)
  app.post('/api/contracts/sign/:id', async (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    
    try {
      console.log('🔥 CONTRACT SIGNING: Starting contract signing process');
      const contractId = parseInt(req.params.id);
      const { signatureName, clientName, signature, clientPhone, clientAddress, venueAddress } = req.body;
      
      const finalSignatureName = signatureName || clientName;
      
      if (!finalSignatureName || !finalSignatureName.trim()) {
        return res.status(400).json({ message: "Signature name is required" });
      }
      
      // Get contract and verify it can be signed
      const contract = await storage.getContractById(contractId);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      
      // CRITICAL FIX: Check if already signed
      if (contract.status === 'signed') {
        console.log('🔥 CONTRACT SIGNING: ERROR - Contract already signed');
        return res.status(400).json({ 
          message: "Contract has already been signed",
          alreadySigned: true,
          signedAt: contract.signedAt,
          signedBy: contract.clientName
        });
      }
      
      if (contract.status !== 'sent') {
        return res.status(400).json({ message: "Contract is not available for signing" });
      }
      
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
      
      // Prepare signature details
      const signatureDetails = {
        signedAt: new Date(),
        signatureName: finalSignatureName.trim(),
        clientIpAddress: clientIP
      };
      
      // Sign contract in database
      const signedContract = await storage.signContract(contractId, {
        signatureName: finalSignatureName.trim(),
        clientIP,
        signedAt: signatureDetails.signedAt,
        clientPhone: clientPhone?.trim(),
        clientAddress: clientAddress?.trim(),
        venueAddress: venueAddress?.trim()
      });
      
      if (!signedContract) {
        return res.status(500).json({ message: "Failed to sign contract" });
      }
      
      // CRITICAL: Upload signed contract to cloud storage and send emails
      try {
        const userSettings = await storage.getSettings(contract.userId);
        
        // Upload signed contract PDF to cloud storage
        const { uploadContractToCloud } = await import('./cloud-storage');
        const cloudResult = await uploadContractToCloud(signedContract, userSettings, signatureDetails);
        
        if (cloudResult.success && cloudResult.url) {
          // Update contract with cloud storage URL for signed PDF
          await storage.updateContract(contractId, {
            cloudStorageUrl: cloudResult.url,
            cloudStorageKey: cloudResult.key,
            signingUrlCreatedAt: new Date()
          });
          console.log('✅ Signed contract uploaded to cloud storage:', cloudResult.url);
        }
        
        // Send confirmation emails
        const { sendContractConfirmationEmails } = await import('./mailgun-email-restored');
        await sendContractConfirmationEmails(signedContract, userSettings);
        
      } catch (emailError: any) {
        console.error('❌ Email/cloud error (contract still signed):', emailError);
      }
      
      return res.json({
        success: true,
        message: "Contract signed successfully! Both parties have been notified.",
        signedAt: signatureDetails.signedAt,
        signedBy: finalSignatureName.trim()
      });
      
    } catch (error: any) {
      console.error('❌ Contract signing error:', error);
      return res.status(500).json({ 
        message: "An error occurred while signing the contract. Please try again." 
      });
    }
  });

  // ===== CONTRACT ROUTES (AUTHENTICATED) =====

  // Get contracts
  app.get('/api/contracts', isAuthenticated, async (req: any, res) => {
    try {
      const contracts = await storage.getContracts(req.user.id);
      res.json(contracts);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch contracts' });
    }
  });

  // Create contract - UPDATED to always use cloud storage
  app.post('/api/contracts', isAuthenticated, async (req: any, res) => {
    try {
      // Sanitize and prepare contract data
      const sanitizedData = { ...req.body, userId: req.user.id };
      
      // Handle numeric fields properly
      if (sanitizedData.fee === '' || sanitizedData.fee === undefined) {
        sanitizedData.fee = '0.00';
      }
      if (sanitizedData.deposit === '' || sanitizedData.deposit === undefined) {
        sanitizedData.deposit = '0.00';
      }
      
      // Handle optional fields - set empty strings to null
      ['venue', 'eventTime', 'eventEndTime', 'clientAddress', 'clientPhone', 'venueAddress'].forEach(field => {
        if (sanitizedData[field] === '') {
          sanitizedData[field] = null;
        }
      });
      
      // Auto-generate contract number if not provided
      if (!sanitizedData.contractNumber || sanitizedData.contractNumber === '') {
        const eventDate = new Date(sanitizedData.eventDate);
        const dateStr = eventDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
        sanitizedData.contractNumber = `(${dateStr} - ${sanitizedData.clientName})`;
      }
      
      // Create contract in database
      const contract = await storage.createContract(sanitizedData);
      console.log('✅ Contract created in database:', contract.id);
      
      // CRITICAL: Always upload to cloud storage for client access
      try {
        const userSettings = await storage.getSettings(req.user.id);
        const { uploadContractToCloud, uploadContractSigningPage } = await import('./cloud-storage');
        
        // Upload draft contract PDF to cloud storage
        console.log('☁️ Uploading draft contract PDF to cloud storage...');
        const contractPdfResult = await uploadContractToCloud(contract, userSettings);
        
        // Upload contract signing page to cloud storage
        console.log('☁️ Uploading contract signing page to cloud storage...');
        const signingPageResult = await uploadContractSigningPage(contract, userSettings);
        
        // Update contract with cloud storage URLs
        const updateData: any = {};
        
        if (contractPdfResult.success && contractPdfResult.url) {
          updateData.cloudStorageUrl = contractPdfResult.url;
          updateData.cloudStorageKey = contractPdfResult.key;
          console.log('📄 Contract PDF uploaded to cloud:', contractPdfResult.url);
        }
        
        if (signingPageResult.success && signingPageResult.url) {
          updateData.signingPageUrl = signingPageResult.url;
          updateData.signingPageKey = signingPageResult.storageKey;
          updateData.signingUrlCreatedAt = new Date();
          console.log('📝 Signing page uploaded to cloud:', signingPageResult.url);
        }
        
        if (Object.keys(updateData).length > 0) {
          const updatedContract = await storage.updateContract(contract.id, updateData, req.user.id);
          console.log('✅ Contract updated with cloud storage URLs');
          res.json(updatedContract);
        } else {
          console.warn('⚠️ No cloud storage URLs to update');
          res.json(contract);
        }
        
      } catch (storageError: any) {
        console.error('❌ CRITICAL: Cloud storage upload failed:', storageError);
        console.error('❌ Contract will be created without cloud storage');
        res.json(contract); // Still return the contract
      }
    } catch (error) {
      console.error('Contract creation error:', error);
      res.status(500).json({ error: 'Failed to create contract' });
    }
  });

  return server;
}