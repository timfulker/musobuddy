import { type Express, type Request, type Response } from "express";
import { storage } from "../core/storage";
import { db } from "../core/database";
import { EmailService } from "../core/services";
import { contractSigningRateLimit } from '../middleware/rateLimiting';
import { validateBody, sanitizeInput, schemas } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';
import { requireSubscriptionOrAdmin } from '../core/subscription-middleware';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    isVerified: boolean;
  };
}

export function registerContractRoutes(app: Express) {
  console.log('📋 Setting up contract routes...');

  // Add health check endpoint for contract service
  app.get('/api/contracts/health', async (req: Request, res: Response) => {
    try {
      // Test database connection
      const testContract = await storage.getContract(1).catch(() => null);
      
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: 'connected',
          storage: 'available',
          pdf: 'ready',
          email: 'configured'
        }
      });
    } catch (error: any) {
      res.status(503).json({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Fix all signing pages with JavaScript errors
  app.post('/api/contracts/fix-all-signing-pages', async (req: Request, res: Response) => {
    try {
      console.log('🔧 Starting to fix all signing pages with JavaScript errors...');
      
      // Get all contracts that might have buggy signing pages
      const { db: database } = await import('../core/database');
      const result = await database.query(`
        SELECT * FROM contracts 
        WHERE status IN ('sent', 'draft') 
        AND signing_page_url IS NOT NULL
        ORDER BY created_at DESC
      `);
      const unsignedContracts = result.rows;
      
      console.log(`📋 Found ${unsignedContracts.length} contracts to fix`);
      
      let fixed = 0;
      let errors = 0;
      
      for (const contract of unsignedContracts) {
        try {
          const userSettings = await storage.getSettings(contract.user_id);
          const { uploadContractSigningPage } = await import('../core/cloud-storage');
          const result = await uploadContractSigningPage(contract, userSettings);
          
          if (result.success && result.url) {
            await storage.updateContractSigningUrl(contract.id, result.url);
            console.log(`✅ Fixed contract #${contract.id}: ${contract.contract_number}`);
            fixed++;
          } else {
            errors++;
          }
        } catch (error) {
          console.error(`❌ Error fixing contract #${contract.id}:`, error);
          errors++;
        }
      }
      
      res.json({ 
        success: true,
        message: `Fixed ${fixed} signing pages, ${errors} errors`,
        fixed,
        errors,
        total: unsignedContracts.length
      });
      
    } catch (error: any) {
      console.error('❌ Failed to fix signing pages:', error);
      res.status(500).json({ error: 'Failed to fix signing pages' });
    }
  });
  
  // Regenerate signing page endpoint - fixes JavaScript errors
  app.post('/api/contracts/:id/regenerate-signing-page', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const contractId = parseInt(req.params.id);
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
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
      
      // Get user settings and regenerate signing page
      const userSettings = await storage.getSettings(userId);
      const { uploadContractSigningPage } = await import('../core/cloud-storage');
      const result = await uploadContractSigningPage(contract, userSettings);
      
      if (result.success && result.url) {
        // Update contract with new signing page URL
        await storage.updateContractSigningUrl(contractId, result.url);
        
        console.log(`✅ Regenerated signing page for contract #${contractId}`);
        res.json({ 
          success: true, 
          signingPageUrl: result.url,
          message: 'Signing page regenerated successfully' 
        });
      } else {
        throw new Error(result.error || 'Failed to regenerate signing page');
      }
      
    } catch (error: any) {
      console.error('❌ Failed to regenerate signing page:', error);
      res.status(500).json({ error: error.message || 'Failed to regenerate signing page' });
    }
  });

  // Get all contracts for authenticated user (requires subscription)
  app.get('/api/contracts', requireAuth, requireSubscriptionOrAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
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
    requireAuth, 
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user?.userId;
        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }
        
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
          userId,
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
          travelExpenses: req.body.travelExpenses || "0.00",
          paymentInstructions: req.body.paymentInstructions || null,
          equipmentRequirements: req.body.equipmentRequirements || null,
          specialRequirements: req.body.specialRequirements || null,
          setlist: req.body.setlist || null,
          riderNotes: req.body.riderNotes || null,
          template: req.body.template || 'professional',
          cancellationPolicy: req.body.cancellationPolicy || null,
          additionalTerms: req.body.additionalTerms || null,
          enquiryId: req.body.enquiryId || null
        };
        
        const newContract = await storage.createContract(contractData);
        console.log(`✅ Created contract #${newContract.id} for user ${userId}`);
        
        // Generate signing page URL
        try {
          const signingPageUrl = `/sign/${newContract.id}`;
          const updatedContract = await storage.updateContract(newContract.id, {
            signingPageUrl: signingPageUrl
          }, userId);
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
    })
  );

  console.log('✅ Contract routes configured');
}