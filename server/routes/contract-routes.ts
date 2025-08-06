import { type Express } from "express";
import { storage } from "../core/storage";
import { EmailService } from "../core/services";
import { contractSigningRateLimit } from '../middleware/rateLimiting';
import { validateBody, sanitizeInput, schemas } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';
import { requireSubscriptionOrAdmin } from '../core/subscription-middleware';

export function registerContractRoutes(app: Express) {
  console.log('📋 Setting up contract routes...');

  // Get all contracts for authenticated user (requires subscription)
  app.get('/api/contracts', requireAuth, requireSubscriptionOrAdmin, async (req: any, res) => {
    try {
      const userId = req.user.userId;
      const contracts = await storage.getContracts(userId);
      console.log(`✅ Retrieved ${contracts.length} contracts for user ${userId}`);
      res.json(contracts);
    } catch (error) {
      console.error('❌ Failed to fetch contracts:', error);
      res.status(500).json({ error: 'Failed to fetch contracts' });
    }
  });

  // FIXED: Add missing R2 URL endpoint that was causing 404 errors
  app.get('/api/contracts/:id/r2-url', requireAuth, async (req: any, res) => {
    try {
      const contractId = parseInt(req.params.id);
      const userId = req.user.userId;
      
      if (isNaN(contractId)) {
        return res.status(400).json({ error: 'Invalid contract ID' });
      }

      const contract = await storage.getContract(contractId);
      if (!contract) {
        return res.status(404).json({ error: 'Contract not found' });
      }

      if (contract.userId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Generate R2 URL for contract
      try {
        const userSettings = await storage.getSettings(userId);
        const { uploadContractToCloud } = await import('../core/cloud-storage');
        
        // Check if contract already has a cloud URL
        if (contract.cloudStorageUrl) {
          return res.json({ 
            success: true, 
            url: contract.cloudStorageUrl,
            key: contract.cloudStorageKey 
          });
        }

        // Generate new cloud URL
        const uploadResult = await uploadContractToCloud(contract, userSettings);
        
        if (!uploadResult.success) {
          console.error('❌ Failed to upload contract to R2:', uploadResult.error);
          return res.status(500).json({ error: 'Failed to upload contract to cloud storage' });
        }

        // Update contract with new cloud URL
        await storage.updateContract(contractId, {
          cloudStorageUrl: uploadResult.url,
          cloudStorageKey: uploadResult.key
        }, userId);

        console.log(`✅ Generated R2 URL for contract ${contractId}: ${uploadResult.url}`);
        res.json({ 
          success: true, 
          url: uploadResult.url,
          key: uploadResult.key 
        });

      } catch (cloudError) {
        console.error('❌ Cloud storage error:', cloudError);
        res.status(500).json({ error: 'Failed to generate cloud storage URL' });
      }

    } catch (error: any) {
      console.error('❌ R2 URL generation failed:', error);
      res.status(500).json({ 
        error: 'Failed to generate R2 URL',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Create new contract
  app.post('/api/contracts', 
    requireAuth, 
    asyncHandler(async (req: any, res: any) => {
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
        userId: req.user.userId,
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
      console.log(`✅ Created contract #${newContract.id} for user ${req.user.userId}`);
      
      // Generate signing page URL
      try {
        const signingPageUrl = `/sign/${newContract.id}`;
        const updatedContract = await storage.updateContract(newContract.id, {
          signingPageUrl: signingPageUrl
        }, req.user.userId);
        res.json(updatedContract);
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
  app.post('/api/contracts/send-email', requireAuth, async (req: any, res) => {
    try {
      const { contractId, customMessage } = req.body;
      const parsedContractId = parseInt(contractId);
      
      const contract = await storage.getContract(parsedContractId);
      if (!contract) {
        return res.status(404).json({ error: 'Contract not found' });
      }
      
      if (contract.userId !== req.user.userId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const userSettings = await storage.getSettings(req.user.userId);
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
        updatedAt: new Date()
      });
      
      if (!contract.clientEmail) {
        return res.json({ 
          success: true, 
          message: 'Contract uploaded successfully (email skipped - no client email provided)',
          contractUrl: uploadResult.url 
        });
      }
      
      const subject = `Contract ready for signing - ${contract.contractNumber}`;
      await emailService.sendContractEmail(contract, userSettings, subject, uploadResult.url || '', customMessage);
      
      res.json({ success: true, message: 'Contract sent successfully' });
      
    } catch (error) {
      console.error('❌ Failed to send contract:', error);
      res.status(500).json({ error: 'Failed to send contract' });
    }
  });

  // CRITICAL: Contract signing endpoint for R2-hosted signing pages
  app.post('/api/contracts/sign/:id', async (req: any, res) => {
    try {
      const contractId = parseInt(req.params.id);
      if (isNaN(contractId)) {
        return res.status(400).json({ error: 'Invalid contract ID' });
      }

      const { clientSignature, clientIP, clientPhone, clientAddress, venueAddress } = req.body;

      if (!clientSignature || !clientIP) {
        return res.status(400).json({ error: 'Missing required signing information' });
      }

      console.log(`🖊️ Processing contract signing for contract #${contractId}`);

      // Get the contract
      const contract = await storage.getContract(contractId);
      if (!contract) {
        return res.status(404).json({ error: 'Contract not found' });
      }

      // Check if already signed
      if (contract.status === 'signed') {
        return res.json({ 
          success: false, 
          alreadySigned: true, 
          message: 'This contract has already been signed.' 
        });
      }

      // Update contract with signing information
      const signingData: any = {
        status: 'signed' as const,
        clientSignature,
        clientIpAddress: clientIP,
        signedAt: new Date(),
        updatedAt: new Date()
      };

      // Add optional fields if provided
      if (clientPhone) signingData.clientPhone = clientPhone;
      if (clientAddress) signingData.clientAddress = clientAddress;
      if (venueAddress) signingData.venueAddress = venueAddress;

      const signedContract = await storage.updateContract(contractId, signingData, contract.userId);
      
      if (!signedContract) {
        throw new Error('Failed to update contract status');
      }

      console.log(`✅ Contract #${contractId} signed successfully by ${clientSignature}`);

      // Get user settings for email notification
      const userSettings = await storage.getSettings(contract.userId);
      
      // Generate signed PDF and upload to cloud storage
      const { uploadContractToCloud } = await import('../core/cloud-storage');
      const uploadResult = await uploadContractToCloud(signedContract, userSettings);
      
      if (uploadResult.success) {
        // Update contract with signed PDF URL
        await storage.updateContract(contractId, {
          cloudStorageUrl: uploadResult.url,
          cloudStorageKey: uploadResult.key
        }, contract.userId);
        
        console.log(`📄 Signed contract PDF uploaded: ${uploadResult.url}`);
      }

      // Send confirmation emails
      if (userSettings && signedContract.clientEmail) {
        try {
          const EmailService = (await import('../core/services')).EmailService;
          const emailService = new EmailService();
          
          const subject = `Contract Signed - ${signedContract.contractNumber}`;
          const message = `The contract has been successfully signed and is now legally binding.`;
          
          await emailService.sendContractConfirmationEmails(
            signedContract, 
            userSettings, 
            subject, 
            uploadResult.url || '',
            message
          );
          
          console.log(`📧 Contract signing confirmation emails sent`);
        } catch (emailError) {
          console.warn('⚠️ Failed to send confirmation emails:', emailError);
        }
      }

      res.json({ 
        success: true, 
        message: 'Contract signed successfully',
        cloudUrl: uploadResult.url
      });

    } catch (error: any) {
      console.error('❌ Contract signing failed:', error);
      res.status(500).json({ 
        error: 'Failed to sign contract',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Get individual contract
  app.get('/api/contracts/:id', requireAuth, async (req: any, res) => {
    try {
      const contractId = parseInt(req.params.id);
      if (isNaN(contractId)) {
        return res.status(400).json({ error: 'Invalid contract ID' });
      }
      
      const userId = req.user.userId;
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
  app.patch('/api/contracts/:id', requireAuth, async (req: any, res) => {
    try {
      const contractId = parseInt(req.params.id);
      const updatedContract = await storage.updateContract(contractId, req.body, req.user.userId);
      if (!updatedContract) {
        return res.status(404).json({ error: 'Contract not found' });
      }
      console.log(`✅ Updated contract #${contractId} for user ${req.user.userId}`);
      res.json(updatedContract);
    } catch (error) {
      console.error('❌ Failed to update contract:', error);
      res.status(500).json({ error: 'Failed to update contract' });
    }
  });

  // Delete contract
  app.delete('/api/contracts/:id', requireAuth, async (req: any, res) => {
    try {
      const contractId = parseInt(req.params.id);
      await storage.deleteContract(contractId, req.user.userId);
      console.log(`✅ Deleted contract #${contractId} for user ${req.user.userId}`);
      res.json({ success: true });
    } catch (error) {
      console.error('❌ Failed to delete contract:', error);
      res.status(500).json({ error: 'Failed to delete contract' });
    }
  });

  // Bulk delete contracts
  app.post('/api/contracts/bulk-delete', requireAuth, async (req: any, res) => {
    try {
      const { contractIds } = req.body;
      const userId = req.user.userId;
      
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
        storage.deleteContract(contractId, userId)
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

  console.log('✅ Contract routes configured');
}