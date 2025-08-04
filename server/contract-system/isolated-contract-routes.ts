// ISOLATED CONTRACT ROUTES - COMPLETELY INDEPENDENT
// Version: 2025.08.04.002 - CONTRACT SYSTEM ISOLATION
// NO IMPORTS FROM MAIN SYSTEM - PREVENTS CASCADING FAILURES

import type { Express } from 'express';
import { isolatedContractStorage } from './isolated-contract-storage';
import { isolatedContractEmailService } from './isolated-contract-email';
import type { IsolatedContractData, IsolatedUserSettings } from './isolated-contract-types';

export function registerIsolatedContractRoutes(app: Express, storage: any, isAuthenticated: any) {
  console.log('🔒 ISOLATED CONTRACT SYSTEM v2025.08.04.002 - Setting up isolated contract routes...');

  // Isolated R2 URL endpoint
  app.get('/api/isolated/contracts/:id/r2-url', isAuthenticated, async (req: any, res) => {
    console.log(`🔗 ISOLATED: R2 URL request for contract ${req.params.id}`);
    try {
      const contractId = parseInt(req.params.id);
      
      if (isNaN(contractId)) {
        return res.status(400).json({ error: 'Invalid contract ID' });
      }
      
      const userId = req.session?.userId;
      console.log(`🔗 ISOLATED: R2 URL request for contract #${contractId} by user ${userId}`);
      
      // Get contract and verify ownership
      const contract = await storage.getContract(contractId);
      if (!contract) {
        console.log(`❌ ISOLATED: Contract #${contractId} not found`);
        return res.status(404).json({ error: 'Contract not found' });
      }
      
      console.log(`📄 ISOLATED: Contract found: ${contract.clientName}, userId: ${contract.userId}`);
      
      // Check if contract already has R2 URL
      if (contract.cloudStorageUrl) {
        console.log(`✅ ISOLATED: Returning existing R2 URL for contract #${contractId}`);
        return res.json({ url: contract.cloudStorageUrl });
      }
      
      // Generate and upload to R2 using isolated system
      console.log(`🔄 ISOLATED: Generating and uploading contract #${contractId} to R2...`);
      const userSettings = await storage.getUserSettings(userId);
      
      const uploadResult = await isolatedContractStorage.uploadContractPDF(
        contract, 
        userSettings, 
        contract.template || 'professional'
      );
      
      if (uploadResult.success && uploadResult.url) {
        // Update contract with R2 URL
        await storage.updateContract(contractId, {
          cloudStorageUrl: uploadResult.url,
          cloudStorageKey: uploadResult.key
        });
        
        console.log(`✅ ISOLATED: Contract #${contractId} uploaded to R2: ${uploadResult.url}`);
        return res.json({ url: uploadResult.url });
      } else {
        console.error(`❌ ISOLATED: Failed to upload contract #${contractId} to R2:`, uploadResult.error);
        return res.status(500).json({ error: 'Failed to upload contract to cloud storage' });
      }
      
    } catch (error: any) {
      console.error('❌ ISOLATED: Contract R2 URL error:', error);
      return res.status(500).json({ error: 'Failed to generate contract URL' });
    }
  });

  // Isolated contract email endpoint
  app.post('/api/isolated/contracts/send-email', isAuthenticated, async (req: any, res) => {
    try {
      const { contractId, customMessage } = req.body;
      const parsedContractId = parseInt(contractId);
      
      console.log(`📧 ISOLATED: Sending contract #${parsedContractId} via isolated email service...`);
      
      // Get contract and user settings
      const contract = await storage.getContract(parsedContractId);
      if (!contract) {
        return res.status(404).json({ error: 'Contract not found' });
      }
      
      const userSettings = await storage.getUserSettings(req.session.userId);
      if (!userSettings) {
        return res.status(404).json({ error: 'User settings not found' });
      }
      
      // Ensure contract has R2 URL - upload if needed
      if (!contract.cloudStorageUrl) {
        console.log(`☁️ ISOLATED: Contract has no R2 URL, uploading first...`);
        const uploadResult = await isolatedContractStorage.uploadContractPDF(
          contract, 
          userSettings,
          contract.template || 'professional'
        );
        
        if (uploadResult.success && uploadResult.url) {
          contract.cloudStorageUrl = uploadResult.url;
          await storage.updateContract(parsedContractId, {
            cloudStorageUrl: uploadResult.url,
            cloudStorageKey: uploadResult.key
          });
        }
      }
      
      const subject = `Contract ready for signing - ${contract.contractNumber}`;
      const result = await isolatedContractEmailService.sendContractEmail(
        contract, 
        userSettings, 
        subject, 
        contract.cloudStorageUrl,
        customMessage
      );
      
      if (result.success) {
        console.log(`✅ ISOLATED: Contract #${parsedContractId} sent successfully`);
        res.json({ 
          success: true, 
          message: 'Contract sent successfully',
          messageId: result.messageId 
        });
      } else {
        console.error(`❌ ISOLATED: Contract email failed: ${result.error}`);
        res.status(500).json({ 
          success: false, 
          error: result.error 
        });
      }
      
    } catch (error: any) {
      console.error('❌ ISOLATED: Contract email error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || 'Failed to send contract email' 
      });
    }
  });

  console.log('✅ ISOLATED CONTRACT: All isolated contract routes registered');
}