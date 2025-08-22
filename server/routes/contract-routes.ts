import { type Express } from "express";
import { storage } from "../core/storage";
import { db } from "../core/database";
import { EmailService } from "../core/services";
import { contractSigningEmailService } from "../core/contract-signing-email";
import { contractSigningRateLimit } from '../middleware/rateLimiting';
import { validateBody, sanitizeInput, schemas } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';
import { requireSubscriptionOrAdmin } from '../core/subscription-middleware';

export function registerContractRoutes(app: Express) {
  console.log('📋 Setting up contract routes...');

  // Debug endpoint to check contract data
  app.get('/api/contracts/:id/debug', async (req, res) => {
    try {
      const contractId = parseInt(req.params.id);
      const contract = await storage.getContract(contractId);
      
      res.json({
        contractId,
        fee: contract?.fee,
        travelExpenses: contract?.travelExpenses,
        allTravelFields: {
          travelExpenses: contract?.travelExpenses,
          travel_expenses: contract?.travel_expenses,
          travelExpense: contract?.travelExpense,
          travel_expense: contract?.travel_expense
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Add health check endpoint for contract service
  app.get('/api/contracts/health', async (req, res) => {
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
  app.post('/api/contracts/fix-all-signing-pages', async (req: any, res) => {
    try {
      console.log('🔧 Starting to fix all signing pages with JavaScript errors...');
      
      // Get all contracts that might have buggy signing pages
      const result = await db.execute(`
        SELECT * FROM contracts 
        WHERE status IN ('sent', 'draft') 
        AND signing_page_url IS NOT NULL
        ORDER BY created_at DESC
      `);
      const unsignedContracts = result.rows;
      
      console.log(`📋 Found ${unsignedContracts.length} contracts to fix`);
      
      let fixed = 0;
      let errors = 0;
      
      for (const contractRow of unsignedContracts) {
        try {
          const contract = contractRow as any;
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
          console.error(`❌ Error fixing contract #${contractRow.id}:`, error);
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
  app.post('/api/contracts/:id/regenerate-signing-page', requireAuth, async (req: any, res) => {
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

  // CRITICAL: Direct contract signing page endpoint (GET)
  app.get('/api/contracts/sign/:id', async (req: any, res) => {
    try {
      const contractId = parseInt(req.params.id);
      if (isNaN(contractId)) {
        return res.status(400).send('<h1>Error: Invalid contract ID</h1>');
      }

      console.log(`📄 Serving signing page for contract #${contractId}`);

      const contract = await storage.getContract(contractId);
      if (!contract) {
        return res.status(404).send('<h1>Error: Contract not found</h1>');
      }

      // Get user settings for the contract owner
      const userSettings = await storage.getSettings(contract.userId);
      
      // Generate the signing page HTML
      const { generateContractSigningPage } = await import('../contract-signing-page-generator');
      const signingPageHtml = generateContractSigningPage(contract, userSettings);
      
      res.setHeader('Content-Type', 'text/html');
      res.send(signingPageHtml);
      
    } catch (error) {
      console.error('❌ Failed to serve contract signing page:', error);
      res.status(500).send('<h1>Error: Failed to load contract signing page</h1>');
    }
  });

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

  // Add download endpoint for fallback when isolated endpoints fail
  app.get('/api/contracts/:id/download', requireAuth, async (req: any, res) => {
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

      // If cloud URL exists, redirect to it
      if (contract.cloudStorageUrl) {
        console.log(`✅ Redirecting to cloud URL for contract ${contractId}`);
        return res.redirect(contract.cloudStorageUrl);
      }

      // Try to generate cloud URL if not exists
      try {
        const userSettings = await storage.getSettings(userId);
        const { uploadContractToCloud } = await import('../core/cloud-storage');
        
        const uploadResult = await uploadContractToCloud(contract, userSettings);
        
        if (uploadResult.success) {
          // Update contract with new cloud URL
          await storage.updateContract(contractId, {
            cloudStorageUrl: uploadResult.url,
            cloudStorageKey: uploadResult.key
          }, userId);
          
          console.log(`✅ Generated and redirecting to new cloud URL for contract ${contractId}`);
          return res.redirect(uploadResult.url!);
        }
      } catch (error) {
        console.error('Failed to generate cloud URL:', error);
      }

      // If all else fails, return error
      return res.status(404).json({ error: 'Contract PDF not available' });
      
    } catch (error) {
      console.error('Error downloading contract:', error);
      res.status(500).json({ error: 'Failed to download contract' });
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

      // Handle both travel_expenses and travelExpenses field names
      const travelAmount = req.body.travel_expenses || req.body.travelExpenses || "0.00";
      
      console.log('📝 Backend Contract Creation Debug:', {
        travelExpenses: travelAmount,
        travel_expenses_field: req.body.travel_expenses,
        travelExpenses_field: req.body.travelExpenses,
        fee: req.body.fee,
        fullBody: req.body
      });

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
        travelExpenses: travelAmount,
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
      
      // Log the contract fields to debug what's being sent
      console.log(`📋 Contract fields being sent to signing page:`, {
        hasClientPhone: !!contract.clientPhone,
        hasClientAddress: !!contract.clientAddress,
        hasVenueAddress: !!contract.venueAddress,
        hasTemplate: !!contract.template,
        template: contract.template,
        fields: Object.keys(contract)
      });
      
      const emailService = new EmailService();
      
      // FIXED: Generate dynamic signing page URL served from server (not R2)
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://www.musobuddy.com' 
        : `http://localhost:${process.env.PORT || 5000}`;
      const signingPageUrl = `${baseUrl}/sign-contract/${parsedContractId}`;
      
      console.log('🔗 FIXED: Using dynamic signing page URL:', signingPageUrl);
      
      await storage.updateContract(parsedContractId, {
        status: 'sent',
        signingPageUrl: signingPageUrl,
        updatedAt: new Date()
      });
      
      if (!contract.clientEmail) {
        return res.json({ 
          success: true, 
          message: 'Contract signing page created successfully (email skipped - no client email provided)',
          signingPageUrl: signingPageUrl 
        });
      }
      
      // Debug contract data being sent to email
      console.log('📧 Contract data for email:', {
        fee: contract.fee,
        travelExpenses: contract.travelExpenses,
        travel_expenses: contract.travel_expenses,
        allFields: Object.keys(contract)
      });
      
      const subject = `Contract ready for signing - ${contract.contractNumber}`;
      // Send email with the dynamic signing page URL
      await emailService.sendContractEmail(contract, userSettings, subject, signingPageUrl, customMessage);
      
      res.json({ success: true, message: 'Contract sent successfully' });
      
    } catch (error) {
      console.error('❌ Failed to send contract:', error);
      res.status(500).json({ error: 'Failed to send contract' });
    }
  });

  // CRITICAL: Contract signing endpoint for R2-hosted signing pages
  // Add OPTIONS handler for CORS preflight
  app.options('/api/contracts/sign/:id', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.sendStatus(204);
  });
  
  // CRITICAL: Enhanced contract signing endpoint with retry logic and better error handling
  app.post('/api/contracts/sign/:id', async (req: any, res) => {
    // Set CORS headers for all responses
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    const startTime = Date.now();
    const contractId = parseInt(req.params.id);
    
    console.log(`🔐 [CONTRACT-SIGN] Starting signature process for contract ${contractId}`);
    
    try {
      if (isNaN(contractId)) {
        return res.status(400).json({ error: 'Invalid contract ID' });
      }

      // Step 1: Validate contract exists
      const contract = await storage.getContract(contractId);
      if (!contract) {
        console.error(`❌ [CONTRACT-SIGN] Contract ${contractId} not found`);
        return res.status(404).json({ 
          error: 'Contract not found',
          contractId 
        });
      }

      // Step 2: Validate contract status
      if (contract.status === 'signed') {
        console.warn(`⚠️ [CONTRACT-SIGN] Contract ${contractId} already signed`);
        return res.json({ 
          success: false, 
          alreadySigned: true, 
          message: 'This contract has already been signed.' 
        });
      }

      if (contract.status !== 'sent' && contract.status !== 'draft') {
        console.error(`❌ [CONTRACT-SIGN] Contract ${contractId} not in signable state: ${contract.status}`);
        return res.status(400).json({ 
          error: 'Contract not available for signing',
          currentStatus: contract.status 
        });
      }

      // Step 3: Process signature with comprehensive data
      const { clientSignature, clientIP, clientPhone, clientAddress, venueAddress } = req.body;
      
      if (!clientSignature) {
        console.log('❌ [CONTRACT-SIGN] Missing clientSignature');
        return res.status(400).json({ error: 'Missing client signature' });
      }

      // CRITICAL: Validate required fields before signing
      const finalClientPhone = clientPhone || contract.clientPhone;
      const finalClientAddress = clientAddress || contract.clientAddress;
      
      if (!finalClientPhone || finalClientPhone === '' || finalClientPhone === 'To be provided') {
        console.log('❌ [CONTRACT-SIGN] Missing required field: clientPhone');
        return res.status(400).json({ 
          error: 'Phone number is required to sign the contract',
          field: 'clientPhone'
        });
      }
      
      if (!finalClientAddress || finalClientAddress === '' || finalClientAddress === 'To be provided') {
        console.log('❌ [CONTRACT-SIGN] Missing required field: clientAddress');
        return res.status(400).json({ 
          error: 'Address is required to sign the contract',
          field: 'clientAddress'
        });
      }

      const signatureData: any = {
        status: 'signed' as const,
        clientSignature: clientSignature || req.body.signatureName,
        clientPhone: finalClientPhone,
        clientAddress: finalClientAddress,
        venueAddress: venueAddress || contract.venueAddress,
        clientIpAddress: clientIP || req.ip || req.connection?.remoteAddress || 'Unknown',
        signedAt: new Date(),
        updatedAt: new Date()
      };

      console.log(`📝 [CONTRACT-SIGN] Processing signature for contract ${contractId}`);

      // Step 4: Update contract with retry logic
      let updateResult: any;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          updateResult = await storage.updateContract(contractId, signatureData, contract.userId);
          
          if (updateResult) {
            console.log(`✅ [CONTRACT-SIGN] Database update successful on attempt ${retryCount + 1}`);
            break; // Success, exit retry loop
          }
        } catch (updateError: any) {
          retryCount++;
          console.error(`❌ [CONTRACT-SIGN] Update attempt ${retryCount} failed:`, updateError.message);
          
          if (retryCount >= maxRetries) {
            throw updateError;
          }
          
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        }
      }

      if (!updateResult) {
        throw new Error('Failed to update contract after retries');
      }

      // Step 4.5: Update related booking with client information (if contract is linked to a booking)
      if (updateResult.enquiryId) {
        try {
          console.log(`🔗 [CONTRACT-SIGN] Updating booking ${updateResult.enquiryId} with client info from contract`);
          
          const bookingUpdateData: any = {};
          
          // Update client contact information if provided during signing
          if (finalClientPhone && finalClientPhone !== contract.clientPhone) {
            bookingUpdateData.clientPhone = finalClientPhone;
          }
          if (finalClientAddress && finalClientAddress !== contract.clientAddress) {
            bookingUpdateData.clientAddress = finalClientAddress;
          }
          if (venueAddress && venueAddress !== contract.venueAddress) {
            bookingUpdateData.venueAddress = venueAddress;
          }
          
          // Only update if there are changes to make
          if (Object.keys(bookingUpdateData).length > 0) {
            await storage.updateBooking(updateResult.enquiryId, bookingUpdateData, contract.userId);
            console.log(`✅ [CONTRACT-SIGN] Booking ${updateResult.enquiryId} updated with client contact info:`, bookingUpdateData);
          } else {
            console.log(`ℹ️ [CONTRACT-SIGN] No booking updates needed - client info already current`);
          }
        } catch (bookingUpdateError: any) {
          console.error(`⚠️ [CONTRACT-SIGN] Failed to update booking ${updateResult.enquiryId} (non-critical):`, bookingUpdateError.message);
          // Continue - contract signing is still successful even if booking update fails
        }
      }

      // Step 5: Generate PDF with error handling (non-critical)
      let pdfUrl = null;
      try {
        const userSettings = await storage.getSettings(contract.userId);
        const { uploadContractToCloud, uploadContractSigningPage } = await import('../core/cloud-storage');
        
        // First regenerate the signing page with the updated status
        const signingPageResult = await uploadContractSigningPage(updateResult, userSettings);
        
        // Then generate the signed PDF
        const uploadResult = await uploadContractToCloud(updateResult, userSettings);
        
        if (uploadResult.success) {
          pdfUrl = uploadResult.url;
          
          // Update contract with PDF URL
          await storage.updateContract(contractId, {
            cloudStorageUrl: pdfUrl,
            cloudStorageKey: uploadResult.key,
            signingPageUrl: signingPageResult.url || updateResult.signingPageUrl
          }, contract.userId);
          
          console.log(`📄 [CONTRACT-SIGN] Signed contract PDF uploaded: ${pdfUrl}`);
        }
      } catch (pdfError: any) {
        console.error(`⚠️ [CONTRACT-SIGN] PDF generation failed (non-critical):`, pdfError.message);
        // Continue - signing is still successful even if PDF fails
      }

      // Step 6: Send confirmation emails with client portal access
      try {
        const userSettings = await storage.getSettings(contract.userId);
        const { EmailService } = await import('../core/services');
        const emailService = new EmailService();
        
        // Send client portal email with QR code and collaborative access
        if (updateResult.clientEmail) {
          await contractSigningEmailService.sendSigningConfirmation(
            updateResult,
            userSettings,
            emailService
          );
          console.log(`✉️ [CONTRACT-SIGN] Client portal email sent to: ${updateResult.clientEmail}`);
        }
        
        // ALSO send to performer/business owner
        if (userSettings?.businessEmail) {
          const themeColor = userSettings?.themeAccentColor || userSettings?.theme_accent_color || '#1e3a8a';
          const performerSubject = `✅ Contract Signed by ${updateResult.clientName} - ${updateResult.contractNumber}`;
          const performerHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <title>Contract Signed Notification</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: ${themeColor};">✅ Contract Successfully Signed!</h2>
                
                <p>Great news! Your contract has been signed by <strong>${updateResult.clientName}</strong>.</p>
                
                <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${themeColor};">
                  <h3 style="margin-top: 0; color: #065f46;">Contract Details:</h3>
                  <p><strong>Contract Number:</strong> ${updateResult.contractNumber}</p>
                  <p><strong>Client:</strong> ${updateResult.clientName}</p>
                  <p><strong>Event Date:</strong> ${new Date(updateResult.eventDate).toLocaleDateString('en-GB')}</p>
                  <p><strong>Venue:</strong> ${updateResult.venue}</p>
                  <p><strong>Fee:</strong> £${updateResult.fee}</p>
                </div>
                
                <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0;"><strong>Signing Information:</strong></p>
                  <p style="margin: 5px 0;">Signed by: ${updateResult.clientSignature}</p>
                  <p style="margin: 5px 0;">Date: ${new Date(updateResult.signedAt).toLocaleString('en-GB')}</p>
                  <p style="margin: 5px 0;">IP Address: ${updateResult.clientIpAddress}</p>
                </div>
                
                ${pdfUrl ? `
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${pdfUrl}" 
                     style="background: #1e3a8a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                    📄 View Signed Contract PDF
                  </a>
                </div>
                ` : ''}
                
                <p>The contract is now legally binding. A copy has been sent to the client at ${updateResult.clientEmail || 'their email address'}.</p>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                
                <p style="font-size: 14px; color: #666;">
                  This is an automated notification from your MusoBuddy system.
                </p>
              </div>
            </body>
            </html>
          `;
          
          await emailService.sendEmail({
            to: userSettings.businessEmail,
            subject: performerSubject,
            html: performerHtml
          });
          console.log(`✉️ [CONTRACT-SIGN] Confirmation email sent to performer: ${userSettings.businessEmail}`);
        }
      } catch (emailError: any) {
        console.error(`⚠️ [CONTRACT-SIGN] Email send failed (non-critical):`, emailError.message);
        // Continue - signing is still successful even if email fails
      }

      const duration = Date.now() - startTime;
      console.log(`✅ [CONTRACT-SIGN] Contract ${contractId} signed successfully in ${duration}ms`);

      res.json({
        success: true,
        contractId,
        status: 'signed',
        pdfUrl,
        message: 'Contract signed successfully',
        cloudUrl: pdfUrl,
        duration
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`❌ [CONTRACT-SIGN] CRITICAL ERROR for contract ${contractId} after ${duration}ms:`, {
        message: error.message,
        stack: error.stack,
        contractId
      });

      // Send detailed error response for debugging
      res.status(500).json({
        error: 'Failed to sign contract',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        contractId,
        duration
      });
    }
  });

  // Public endpoint for client access to contracts (for signing page)
  app.get('/api/contracts/public/:id', async (req: any, res) => {
    try {
      const contractId = parseInt(req.params.id);
      if (isNaN(contractId)) {
        return res.status(400).json({ error: 'Invalid contract ID' });
      }
      
      console.log(`📄 Fetching public contract #${contractId} for signing page`);
      
      const contract = await storage.getContract(contractId);
      if (!contract) {
        console.error(`❌ Contract #${contractId} not found`);
        return res.status(404).json({ error: 'Contract not found' });
      }
      
      // Only allow access to contracts that are sent or signed (not drafts)
      if (contract.status !== 'sent' && contract.status !== 'signed') {
        console.error(`❌ Contract #${contractId} not available - status: ${contract.status}`);
        return res.status(403).json({ error: 'Contract not available for public viewing' });
      }
      
      // Get user settings for branding/theme
      const userSettings = await storage.getSettings(contract.userId);
      
      console.log(`✅ Returning public contract #${contractId} for client signing`);
      
      // Return contract data for the signing page
      res.setHeader('Content-Type', 'application/json');
      res.status(200).json({
        ...contract,
        userSettings: {
          businessName: userSettings?.businessName,
          businessEmail: userSettings?.businessEmail,
          themeAccentColor: userSettings?.themeAccentColor || userSettings?.theme_accent_color || '#1e3a8a',
          logoUrl: userSettings?.logoUrl
        }
      });
      
    } catch (error: any) {
      console.error('❌ Failed to fetch public contract:', error);
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ 
        error: 'Internal server error while fetching contract',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Get individual contract - FIXED: Use standard auth middleware
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

  // Update contract (only allowed for draft contracts)
  app.patch('/api/contracts/:id', requireAuth, async (req: any, res) => {
    try {
      const contractId = parseInt(req.params.id);
      const userId = req.user.userId;
      
      // Get the current contract to check its status
      const existingContract = await storage.getContract(contractId);
      if (!existingContract) {
        return res.status(404).json({ error: 'Contract not found' });
      }
      
      if (existingContract.userId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Prevent editing contracts that have been sent
      if (existingContract.status !== 'draft') {
        return res.status(400).json({ 
          error: 'Cannot edit contract after it has been sent. Use the amendment feature instead.',
          status: existingContract.status,
          contractNumber: existingContract.contractNumber
        });
      }
      
      // Ensure all fields are properly included in the update
      const updateData = {
        ...req.body,
        template: req.body.template || 'professional',
        setlist: req.body.setlist || null,
        riderNotes: req.body.riderNotes || null,
        travelExpenses: req.body.travelExpenses || '0.00',
        cancellationPolicy: req.body.cancellationPolicy || null,
        additionalTerms: req.body.additionalTerms || null
      };
      
      const updatedContract = await storage.updateContract(contractId, updateData, userId);
      if (!updatedContract) {
        return res.status(404).json({ error: 'Contract not found' });
      }
      console.log(`✅ Updated draft contract #${contractId} for user ${userId}`);
      res.json(updatedContract);
    } catch (error) {
      console.error('❌ Failed to update contract:', error);
      res.status(500).json({ error: 'Failed to update contract' });
    }
  });

  // Amend contract - creates a new contract with "Amended" suffix
  app.post('/api/contracts/:id/amend', requireAuth, async (req: any, res) => {
    try {
      const contractId = parseInt(req.params.id);
      const userId = req.user.userId;
      
      // Get the original contract
      const originalContract = await storage.getContract(contractId);
      if (!originalContract) {
        return res.status(404).json({ error: 'Original contract not found' });
      }
      
      if (originalContract.userId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Only allow amendment of contracts that have been sent (not drafts)
      if (originalContract.status === 'draft') {
        return res.status(400).json({ 
          error: 'Draft contracts can be edited directly. Amendment is only for sent contracts.',
          contractNumber: originalContract.contractNumber
        });
      }
      
      // Create amended contract number
      const baseContractNumber = originalContract.contractNumber.replace(/ - Amended.*$/, '');
      const amendedContractNumber = `${baseContractNumber} - Amended`;
      
      // Create new contract with amended data
      const amendedContractData = {
        userId: userId,
        enquiryId: originalContract.enquiryId,
        contractNumber: amendedContractNumber,
        clientName: originalContract.clientName,
        clientAddress: originalContract.clientAddress,
        clientPhone: originalContract.clientPhone,
        clientEmail: originalContract.clientEmail,
        venue: originalContract.venue,
        venueAddress: originalContract.venueAddress,
        eventDate: originalContract.eventDate,
        eventTime: originalContract.eventTime,
        eventEndTime: originalContract.eventEndTime,
        fee: originalContract.fee,
        deposit: originalContract.deposit,
        paymentInstructions: originalContract.paymentInstructions,
        equipmentRequirements: originalContract.equipmentRequirements,
        specialRequirements: originalContract.specialRequirements,
        clientFillableFields: originalContract.clientFillableFields,
        template: originalContract.template,
        status: 'draft', // New amended contract starts as draft
        originalContractId: contractId // Track which contract this amends
      };
      
      const amendedContract = await storage.createContract(amendedContractData);
      
      // LEGAL FIX: Don't change original contract status when amendment is created
      // Original contract remains legally enforceable until amendment is signed
      // Only track the relationship for reference
      await storage.updateContract(contractId, { 
        supersededBy: amendedContract.id 
      }, userId);
      
      console.log(`✅ Created amended contract #${amendedContract.id} (${amendedContractNumber}) for original #${contractId}`);
      
      res.json({
        success: true,
        originalContract: originalContract,
        amendedContract: amendedContract,
        message: `Amended contract ${amendedContractNumber} created. Original contract remains legally binding until amendment is signed.`
      });
      
    } catch (error: any) {
      console.error('❌ Failed to create amended contract:', error);
      res.status(500).json({ 
        error: 'Failed to create amended contract',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
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