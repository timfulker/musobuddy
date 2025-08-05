import { type Express } from "express";
import { storage } from "../core/storage";
import { EmailService } from "../core/services";
import { contractSigningRateLimit } from '../middleware/rateLimiting';
import { validateBody, sanitizeInput, schemas } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';

// Enhanced authentication middleware
const isAuthenticated = async (req: any, res: any, next: any) => {
  const sessionUserId = req.session?.userId;
  if (!sessionUserId || (typeof sessionUserId === 'string' && sessionUserId.trim() === '')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const userId = typeof sessionUserId === 'string' ? parseInt(sessionUserId) : sessionUserId;
    const user = await storage.getUserById(userId);
    
    if (!user) {
      req.session.destroy((err: any) => {
        if (err) console.error('Session destroy error:', err);
      });
      return res.status(401).json({ error: 'User account no longer exists' });
    }

    req.user = user;
    next();
    
  } catch (error: any) {
    console.error('❌ Authentication validation error:', error);
    return res.status(500).json({ error: 'Authentication validation failed' });
  }
};

export function registerContractRoutes(app: Express) {
  console.log('📋 Setting up contract routes...');

  // Get all contracts for authenticated user
  app.get('/api/contracts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      const contracts = await storage.getContracts(userId);
      console.log(`✅ Retrieved ${contracts.length} contracts for user ${userId}`);
      res.json(contracts);
    } catch (error) {
      console.error('❌ Failed to fetch contracts:', error);
      res.status(500).json({ error: 'Failed to fetch contracts' });
    }
  });

  // Create new contract
  app.post('/api/contracts', 
    isAuthenticated, 
    validateBody(schemas.createContract), 
    asyncHandler(async (req: any, res) => {
    try {
      const contractNumber = req.body.contractNumber || 
        `(${new Date(req.body.eventDate).toLocaleDateString('en-GB', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric' 
        })} - ${req.body.clientName})`;
      
      if (!req.body.clientName || !req.body.eventDate || !req.body.fee) {
        return res.status(400).json({ 
          error: 'Missing required fields: clientName, eventDate, and fee are required' 
        });
      }

      const contractData = {
        userId: req.session.userId,
        contractNumber,
        clientName: req.body.clientName,
        clientEmail: req.body.clientEmail || null,
        clientAddress: req.body.clientAddress || null,
        clientPhone: req.body.clientPhone || null,
        venue: req.body.venue || null,
        venueAddress: req.body.venueAddress || null,
        eventDate: req.body.eventDate,
        eventTime: req.body.eventTime || "",
        eventEndTime: req.body.eventEndTime || "",
        fee: req.body.fee,
        deposit: req.body.deposit || "0.00",
        paymentInstructions: req.body.paymentInstructions || null,
        equipmentRequirements: req.body.equipmentRequirements || null,
        specialRequirements: req.body.specialRequirements || null,
        enquiryId: req.body.enquiryId || null
      };
      
      const newContract = await storage.createContract(contractData);
      console.log(`✅ Created contract #${newContract.id} for user ${req.session.userId}`);
      
      // Generate signing page
      try {
        const { createSigningPageForContract } = await import('../core/cloud-storage');
        const signingPageResult = await createSigningPageForContract(newContract);
        
        if (signingPageResult.success) {
          const updatedContract = await storage.updateContract(newContract.id, {
            signingPageUrl: signingPageResult.url
          });
          
          res.json(updatedContract);
        } else {
          res.json(newContract);
        }
      } catch (signingError) {
        console.warn('⚠️ Failed to create signing page:', signingError);
        res.json(newContract);
      }
    } catch (error: any) {
      console.error('❌ Failed to create contract:', error);
      
      if (error?.code === '23505') {
        res.status(400).json({ error: 'Duplicate contract number detected' });
      } else if (error?.code === '23502') {
        res.status(400).json({ error: 'Missing required field: ' + (error?.column || 'unknown') });
      } else if (error?.code === '22P02') {
        res.status(400).json({ error: 'Invalid data format in request' });
      } else {
        res.status(500).json({ 
          error: 'Failed to create contract',
          details: error?.message || 'Unknown database error'
        });
      }
    }
  }));

  // Send contract via email
  app.post('/api/contracts/send-email', isAuthenticated, async (req: any, res) => {
    try {
      const { contractId, customMessage } = req.body;
      const parsedContractId = parseInt(contractId);
      
      const contract = await storage.getContract(parsedContractId);
      if (!contract) {
        return res.status(404).json({ error: 'Contract not found' });
      }
      
      const userSettings = await storage.getUserSettings(req.session.userId);
      if (!userSettings) {
        return res.status(404).json({ error: 'User settings not found' });
      }
      
      const emailService = new EmailService();
      const { uploadContractToCloud } = await import('../core/cloud-storage');
      const uploadResult = await uploadContractToCloud(contract, userSettings);
      
      if (!uploadResult.success) {
        console.error('❌ Failed to upload contract to R2:', uploadResult.error);
        return res.status(500).json({ error: 'Failed to upload contract to cloud storage' });
      }
      
      await storage.updateContract(parsedContractId, {
        status: 'sent',
        cloudStorageUrl: uploadResult.url,
        cloudStorageKey: uploadResult.key,
        sentAt: new Date(),
        performerSignature: `Digital signature: ${userSettings?.businessName || 'Performer'} - ${new Date().toISOString()}`,
        performerSignedAt: new Date(),
        performerIpAddress: req.ip || 'Server'
      });
      
      if (!contract.clientEmail) {
        return res.json({ 
          success: true, 
          message: 'Contract uploaded successfully (email skipped - no client email provided)',
          contractUrl: uploadResult.url 
        });
      }
      
      const subject = `Contract ready for signing - ${contract.contractNumber}`;
      await emailService.sendContractEmail(contract, userSettings, subject, uploadResult.url, customMessage);
      
      res.json({ success: true, message: 'Contract sent successfully' });
      
    } catch (error) {
      console.error('❌ Failed to send contract:', error);
      res.status(500).json({ error: 'Failed to send contract' });
    }
  });

  // Get individual contract
  app.get('/api/contracts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const contractId = parseInt(req.params.id);
      if (isNaN(contractId)) {
        return res.status(400).json({ error: 'Invalid contract ID' });
      }
      
      const userId = req.session?.userId;
      const contract = await storage.getContract(contractId);
      if (!contract) {
        return res.status(404).json({ error: 'Contract not found' });
      }
      
      if (contract.userId !== userId) {
        return res.status(403).json({ error: 'Access denied - you do not own this contract' });
      }
      
      res.setHeader('Content-Type', 'application/json');
      res.status(200).json(contract);
      
    } catch (error: any) {
      console.error('❌ Failed to fetch contract:', error);
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ 
        error: 'Internal server error while fetching contract',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Update contract
  app.patch('/api/contracts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const contractId = parseInt(req.params.id);
      const updatedContract = await storage.updateContract(contractId, req.body);
      if (!updatedContract) {
        return res.status(404).json({ error: 'Contract not found' });
      }
      console.log(`✅ Updated contract #${contractId} for user ${req.session.userId}`);
      res.json(updatedContract);
    } catch (error) {
      console.error('❌ Failed to update contract:', error);
      res.status(500).json({ error: 'Failed to update contract' });
    }
  });

  // Delete contract
  app.delete('/api/contracts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const contractId = parseInt(req.params.id);
      await storage.deleteContract(contractId);
      console.log(`✅ Deleted contract #${contractId} for user ${req.session.userId}`);
      res.json({ success: true });
    } catch (error) {
      console.error('❌ Failed to delete contract:', error);
      res.status(500).json({ error: 'Failed to delete contract' });
    }
  });

  // Bulk delete contracts
  app.post('/api/contracts/bulk-delete', isAuthenticated, async (req: any, res) => {
    try {
      const { contractIds } = req.body;
      const userId = req.session.userId;
      
      if (!contractIds || !Array.isArray(contractIds) || contractIds.length === 0) {
        return res.status(400).json({ error: 'Contract IDs array is required' });
      }
      
      // Verify all contracts belong to the authenticated user
      const verificationPromises = contractIds.map(async (contractId: number) => {
        const contract = await storage.getContract(contractId);
        if (!contract) {
          throw new Error(`Contract #${contractId} not found`);
        }
        if (contract.userId !== userId) {
          throw new Error(`Access denied to contract #${contractId}`);
        }
        return contract;
      });
      
      try {
        await Promise.all(verificationPromises);
      } catch (verificationError: any) {
        return res.status(403).json({ error: verificationError.message });
      }
      
      const deletePromises = contractIds.map((contractId: number) => 
        storage.deleteContract(contractId)
      );
      
      await Promise.all(deletePromises);
      
      res.json({ 
        success: true, 
        deletedCount: contractIds.length,
        message: `Successfully deleted ${contractIds.length} contract${contractIds.length !== 1 ? 's' : ''}` 
      });
      
    } catch (error: any) {
      console.error('❌ Bulk delete failed:', error);
      res.status(500).json({ 
        error: 'Failed to delete contracts', 
        details: error.message 
      });
    }
  });

  // Contract signing route with CORS handling
  app.use('/api/contracts/sign', (req, res, next) => {
    const origin = req.headers.origin;
    
    if (origin && (origin.includes('.r2.dev') || origin.includes('musobuddy.replit.app'))) {
      res.header('Access-Control-Allow-Origin', origin);
    } else {
      res.header('Access-Control-Allow-Origin', '*');
    }
    
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Accept, Cache-Control, X-Requested-With');
    res.header('Access-Control-Allow-Credentials', 'false');
    res.header('Access-Control-Max-Age', '3600');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    next();
  });

  app.post('/api/contracts/sign/:id', 
    contractSigningRateLimit,
    sanitizeInput,
    validateBody(schemas.signContract),
    asyncHandler(async (req: any, res) => {
    try {
      const contractId = parseInt(req.params.id);
      const { clientSignature, clientIP, clientPhone, clientAddress, venueAddress } = req.body;
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-cache');
      
      const origin = req.headers.origin;
      if (origin && (origin.includes('.r2.dev') || origin.includes('musobuddy.replit.app'))) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
      }
      
      if (isNaN(contractId)) {
        return res.status(400).json({ success: false, error: 'Invalid contract ID' });
      }
      
      const contract = await storage.getContract(contractId);
      if (!contract) {
        return res.status(404).json({ success: false, error: 'Contract not found' });
      }
      
      if (contract.status === 'signed') {
        return res.status(200).json({
          success: true,
          alreadySigned: true,
          message: 'Contract has already been signed. Thank you!',
          signedAt: contract.signedAt,
          clientSignature: contract.clientSignature
        });
      }
      
      if (!clientSignature || clientSignature.trim().length === 0) {
        return res.status(400).json({ success: false, error: 'Client signature is required' });
      }
      
      const clientIpAddress = clientIP || req.ip || req.connection?.remoteAddress || 'Unknown';
      
      const updateData = {
        status: 'signed' as const,
        clientSignature: clientSignature.trim(),
        clientIpAddress,
        signedAt: new Date()
      };
      
      if (clientPhone && clientPhone.trim()) {
        updateData.clientPhone = clientPhone.trim();
      }
      if (clientAddress && clientAddress.trim()) {
        updateData.clientAddress = clientAddress.trim();
      }
      if (venueAddress && venueAddress.trim()) {
        updateData.venueAddress = venueAddress.trim();
      }
      
      const signedContract = await storage.updateContract(contractId, updateData);
      
      // Upload signed contract to cloud
      const userSettings = await storage.getUserSettings(contract.userId);
      const { uploadContractToCloud } = await import('../core/cloud-storage');
      
      const signatureDetails = {
        signedAt: new Date(signedContract.signedAt || signedContract.updatedAt),
        signatureName: signedContract.clientSignature || 'Digital Signature',
        clientIpAddress: signedContract.clientIpAddress
      };
      
      const uploadResult = await uploadContractToCloud(signedContract, userSettings, signatureDetails);
      
      if (uploadResult.success && uploadResult.url) {
        await storage.updateContract(contractId, {
          cloudStorageUrl: uploadResult.url,
          cloudStorageKey: uploadResult.key
        });
      }
      
      // Send confirmation emails
      try {
        const { sendContractConfirmationEmails } = await import('../core/services');
        await sendContractConfirmationEmails(signedContract, userSettings);
      } catch (emailError) {
        console.warn('⚠️ Email confirmation failed (contract still signed):', emailError);
      }
      
      res.status(200).json({
        success: true,
        message: 'Contract signed successfully!',
        contractId,
        signedAt: signedContract.signedAt,
        clientSignature: signedContract.clientSignature
      });
      
    } catch (error: any) {
      console.error('❌ Contract signing failed:', error);
      
      res.status(500).json({ 
        success: false,
        error: 'Failed to sign contract. Please try again.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }));

  // Public contract view
  app.get('/view/contracts/:id', async (req: any, res) => {
    try {
      const contractId = parseInt(req.params.id);
      const contract = await storage.getContract(contractId);
      if (!contract) {
        return res.status(404).send('Contract not found');
      }
      
      if (contract.cloudStorageUrl) {
        return res.redirect(contract.cloudStorageUrl);
      }
      
      const userSettings = await storage.getUserSettings(contract.userId);
      const { generateContractPDF } = await import('../unified-contract-pdf');
      
      const pdfBuffer = await generateContractPDF(contract, userSettings);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="Contract-${contract.contractNumber}.pdf"`);
      res.send(pdfBuffer);
      
    } catch (error) {
      console.error('❌ Failed to view contract:', error);
      res.status(500).send('Failed to load contract');
    }
  });

  // Public contract PDF route
  app.get('/api/contracts/public/:id/pdf', async (req: any, res) => {
    try {
      const contractId = parseInt(req.params.id);
      const contract = await storage.getContract(contractId);
      if (!contract) {
        return res.status(404).json({ error: 'Contract not found' });
      }
      
      const userSettings = await storage.getUserSettings(contract.userId);
      const { generateContractPDF } = await import('../unified-contract-pdf');
      
      const signatureDetails = contract.status === 'signed' ? {
        signedAt: new Date(contract.signedAt || contract.updatedAt),
        signatureName: contract.clientSignature || 'Digital Signature',
        clientIpAddress: contract.clientIpAddress
      } : undefined;
      
      const pdfBuffer = await generateContractPDF(contract, userSettings, signatureDetails);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="Contract-${contract.contractNumber}${contract.status === 'signed' ? '-Signed' : ''}.pdf"`);
      res.setHeader('Cache-Control', 'private, max-age=3600');
      
      res.send(pdfBuffer);
      
    } catch (error) {
      console.error('❌ Failed to serve public contract PDF:', error);
      res.status(500).json({ error: 'Failed to generate contract PDF' });
    }
  });

  console.log('✅ Contract routes configured');
}