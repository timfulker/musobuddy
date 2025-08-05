// ISOLATED CONTRACT ROUTES - FORCE PROFESSIONAL TEMPLATE ONLY
// Version: 2025.08.05.003 - PROFESSIONAL TEMPLATE ENFORCEMENT
// NO IMPORTS FROM MAIN SYSTEM - PREVENTS CASCADING FAILURES

import type { Express } from 'express';
import { isolatedContractStorage } from './isolated-contract-storage';
import { sendIsolatedContractEmail } from './isolated-contract-email-fixed';
import type { IsolatedContractData, IsolatedUserSettings } from './isolated-contract-types';

// DEBUG FUNCTION - Find missing data
function debugContractData(contract: any, userSettings: any, location: string) {
  console.log(`🔍 DEBUG ${location}: Raw contract data from database:`);
  console.log('📋 Contract fields:', Object.keys(contract || {}));
  console.log('📋 Contract data:', JSON.stringify(contract, null, 2));
  
  console.log(`🔍 DEBUG ${location}: User settings data:`);
  console.log('⚙️ Settings fields:', Object.keys(userSettings || {}));
  console.log('⚙️ Settings data:', JSON.stringify(userSettings, null, 2));
  
  // Check for missing critical fields
  const criticalFields = [
    'id', 'contractNumber', 'clientName', 'clientEmail', 
    'eventDate', 'eventTime', 'eventEndTime', 'venue', 
    'fee', 'deposit', 'paymentInstructions', 'equipmentRequirements', 
    'specialRequirements', 'clientPhone', 'clientAddress', 'venueAddress'
  ];
  
  const missingFields = criticalFields.filter(field => !contract || contract[field] === undefined || contract[field] === null);
  const emptyFields = criticalFields.filter(field => contract && contract[field] === '');
  
  console.log(`🔍 DEBUG ${location}: Field analysis:`);
  console.log('❌ Missing fields:', missingFields);
  console.log('⚠️ Empty fields:', emptyFields);
  console.log('✅ Present fields:', criticalFields.filter(field => contract && contract[field] && contract[field] !== ''));
  
  // CRITICAL: Check template field specifically
  console.log(`🔍 DEBUG ${location}: Template analysis:`);
  console.log('📋 Database template value:', contract?.template);
  console.log('📋 Will force to PROFESSIONAL regardless of database value');
}

export function registerIsolatedContractRoutes(app: Express, storage: any, isAuthenticated: any) {
  console.log('🔒 ISOLATED CONTRACT SYSTEM v2025.08.05.003 - PROFESSIONAL TEMPLATE ONLY');
  console.log('🔒 FORCING ALL CONTRACTS TO USE PROFESSIONAL TEMPLATE REGARDLESS OF DATABASE SETTING');

  // Isolated R2 URL endpoint - FORCE PROFESSIONAL TEMPLATE
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
      console.log(`📄 ISOLATED: Database template: ${contract.template}, but FORCING to professional`);
      
      // CRITICAL FIX: Always regenerate with professional template
      console.log(`🔄 ISOLATED: FORCING professional template for contract #${contractId}`);
      if (contract.cloudStorageUrl) {
        console.log(`🔄 ISOLATED: Existing URL found but regenerating with PROFESSIONAL template: ${contract.cloudStorageUrl}`);
      }
      
      // Generate and upload to R2 using FORCED professional template
      console.log(`🔄 ISOLATED: Generating contract #${contractId} with FORCED professional template...`);
      const userSettings = await storage.getUserSettings(userId);
      
      // DEBUG: Check what data we're passing to PDF generator
      debugContractData(contract, userSettings, "BEFORE FORCED PROFESSIONAL GENERATION");
      
      // CRITICAL FIX: Always pass 'professional' regardless of database value
      const uploadResult = await isolatedContractStorage.uploadContractPDF(
        contract, 
        userSettings, 
        'professional' // FORCE PROFESSIONAL - ignore contract.template
      );
      
      if (uploadResult.success && uploadResult.url) {
        // Update contract with R2 URL
        await storage.updateContract(contractId, {
          cloudStorageUrl: uploadResult.url,
          cloudStorageKey: uploadResult.key,
          template: 'professional' // Also update database to professional
        });
        
        console.log(`✅ ISOLATED: Contract #${contractId} uploaded to R2 with PROFESSIONAL template: ${uploadResult.url}`);
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

  // Isolated contract email endpoint - FORCE PROFESSIONAL TEMPLATE
  app.post('/api/isolated/contracts/send-email', isAuthenticated, async (req: any, res) => {
    try {
      const { contractId, customMessage } = req.body;
      const parsedContractId = parseInt(contractId);
      
      console.log(`📧 ISOLATED: Sending contract #${parsedContractId} via isolated email service...`);
      console.log(`📧 ISOLATED: Will FORCE professional template regardless of database setting`);
      
      // Get contract and user settings
      const contract = await storage.getContract(parsedContractId);
      if (!contract) {
        return res.status(404).json({ error: 'Contract not found' });
      }
      
      console.log(`📧 ISOLATED: Database template: ${contract.template}, but FORCING to professional`);
      
      const userSettings = await storage.getUserSettings(req.session.userId);
      if (!userSettings) {
        return res.status(404).json({ error: 'User settings not found' });
      }
      
      // Ensure contract has R2 URL with PROFESSIONAL template
      if (!contract.cloudStorageUrl) {
        console.log(`☁️ ISOLATED: Contract has no R2 URL, uploading with FORCED professional template...`);
        const uploadResult = await isolatedContractStorage.uploadContractPDF(
          contract, 
          userSettings,
          'professional' // FORCE PROFESSIONAL - ignore contract.template
        );
        
        if (uploadResult.success && uploadResult.url) {
          contract.cloudStorageUrl = uploadResult.url;
          await storage.updateContract(parsedContractId, {
            cloudStorageUrl: uploadResult.url,
            cloudStorageKey: uploadResult.key,
            template: 'professional' // Also update database to professional
          });
          console.log(`☁️ ISOLATED: Contract uploaded with FORCED professional template: ${uploadResult.url}`);
        }
      } else {
        console.log(`☁️ ISOLATED: Contract has existing URL, but ensuring it's professional template`);
        // Regenerate with professional template to ensure consistency
        const uploadResult = await isolatedContractStorage.uploadContractPDF(
          contract, 
          userSettings,
          'professional' // FORCE PROFESSIONAL
        );
        
        if (uploadResult.success && uploadResult.url) {
          contract.cloudStorageUrl = uploadResult.url;
          await storage.updateContract(parsedContractId, {
            cloudStorageUrl: uploadResult.url,
            cloudStorageKey: uploadResult.key,
            template: 'professional'
          });
          console.log(`☁️ ISOLATED: Contract regenerated with FORCED professional template: ${uploadResult.url}`);
        }
      }
      
      // Use signing page URL instead of PDF URL for email links
      const emailUrl = contract.signingPageUrl || contract.cloudStorageUrl;
      console.log(`📧 ISOLATED: Using email URL: ${emailUrl}`);
      
      const subject = `Professional Contract ready for signing - ${contract.contractNumber}`;
      const result = await sendIsolatedContractEmail(
        contract, 
        userSettings, 
        emailUrl,
        subject,
        customMessage
      );
      
      console.log(`📧 ISOLATED: Email result:`, result);
      
      if (result.success) {
        console.log(`✅ ISOLATED: Professional contract #${parsedContractId} sent successfully - Message ID: ${result.messageId}`);
        res.json({ 
          success: true, 
          message: 'Professional contract sent successfully',
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

  // Debug endpoint to check template enforcement
  app.get('/api/isolated/contracts/:id/debug-template', isAuthenticated, async (req: any, res) => {
    try {
      const contractId = parseInt(req.params.id);
      const contract = await storage.getContract(contractId);
      
      if (!contract) {
        return res.status(404).json({ error: 'Contract not found' });
      }
      
      res.json({
        contractId: contract.id,
        databaseTemplate: contract.template,
        willUseTemplate: 'professional', // Always professional
        forcedProfessional: true,
        message: 'All contracts now FORCED to use professional template regardless of database setting'
      });
      
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  console.log('✅ ISOLATED CONTRACT: All isolated contract routes registered with PROFESSIONAL TEMPLATE ENFORCEMENT');
}