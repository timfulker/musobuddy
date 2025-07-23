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
  // Contract signing page (PUBLIC)
  app.get('/contracts/sign/:id', async (req, res) => {
    try {
      console.log('🎯 CONTRACT SIGNING ROUTE HIT:', req.params.id);
      const contractId = parseInt(req.params.id);
      
      if (isNaN(contractId)) {
        return res.status(400).send('<h1>Invalid Contract ID</h1>');
      }
      
      // Check if contract exists
      const contract = await storage.getContractById(contractId);
      if (!contract) {
        return res.status(404).send('<h1>Contract Not Found</h1>');
      }
      
      // CRITICAL: If already signed, show "already signed" page
      if (contract.status === 'signed') {
        const alreadySignedHtml = generateAlreadySignedPage(contract);
        return res.send(alreadySignedHtml);
      }
      
      // Get user settings for branding
      const userSettings = await storage.getSettings(contract.userId);
      
      // Generate contract signing page
      const signingPageHTML = generateContractSigningPage(contract, userSettings);
      res.send(signingPageHTML);
      
    } catch (error: any) {
      console.error('❌ Contract signing page error:', error);
      res.status(500).send('<h1>Server Error</h1><p>Unable to load contract signing page.</p>');
    }
  });

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
      
      // Sign contract
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
      
      // Upload to cloud storage and send confirmation emails
      try {
        const userSettings = await storage.getSettings(contract.userId);
        
        const { uploadContractToCloud } = await import('./cloud-storage');
        const cloudResult = await uploadContractToCloud(signedContract, userSettings, signatureDetails);
        
        if (cloudResult.success && cloudResult.url) {
          await storage.updateContract(contractId, {
            cloudStorageUrl: cloudResult.url,
            cloudStorageKey: cloudResult.key,
            signingUrlCreatedAt: new Date()
          }, contract.userId);
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

  // ===== BOOKING ROUTES =====
  app.get('/api/bookings', isAuthenticated, async (req: any, res) => {
    try {
      const bookings = await storage.getBookings(req.user.id);
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch bookings' });
    }
  });

  app.post('/api/bookings', isAuthenticated, async (req: any, res) => {
    try {
      const booking = await storage.createBooking({ ...req.body, userId: req.user.id });
      res.json(booking);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create booking' });
    }
  });

  app.patch('/api/bookings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const booking = await storage.updateBooking(parseInt(req.params.id), req.body);
      res.json(booking);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update booking' });
    }
  });

  app.delete('/api/bookings/:id', isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteBooking(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete booking' });
    }
  });

  // ===== CONTRACT ROUTES =====
  app.get('/api/contracts', isAuthenticated, async (req: any, res) => {
    try {
      const contracts = await storage.getContracts(req.user.id);
      res.json(contracts);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch contracts' });
    }
  });

  app.post('/api/contracts', isAuthenticated, async (req: any, res) => {
    try {
      // Sanitize numeric fields - convert empty strings to null
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
      
      const contract = await storage.createContract(sanitizedData);
      
      // Generate signing page and upload to cloud storage
      try {
        console.log('🔍 Starting cloud storage upload for contract:', contract.id);
        const userSettings = await storage.getSettings(req.user.id);
        console.log('✅ User settings retrieved for user:', req.user.id);
        
        console.log('🔍 Calling cloudStorageService.uploadContractSigningPage...');
        const { url, key } = await cloudStorageService.uploadContractSigningPage(contract, userSettings);
        console.log('✅ Cloud storage upload successful!');
        console.log('📄 Generated URL:', url);
        console.log('🔑 Storage key:', key);
        
        // Update contract with cloud storage info
        console.log('🔄 Updating contract with cloud storage info...');
        const updatedContract = await storage.updateContract(contract.id, {
          cloudStorageUrl: url,
          cloudStorageKey: key,
          signingUrlCreatedAt: new Date()
        }, req.user.id);
        
        console.log('✅ Contract created with cloud storage:', contract.id);
        console.log('🔗 Cloudflare signing URL:', url);
        res.json(updatedContract);
      } catch (storageError) {
        console.error('❌ CRITICAL: Cloud storage upload failed:', storageError);
        console.error('❌ Error stack:', storageError.stack);
        console.error('❌ Contract will be created without cloud storage');
        // Still return the contract but without cloud storage
        res.json(contract);
      }
    } catch (error) {
      console.error('Contract creation error:', error);
      res.status(500).json({ error: 'Failed to create contract' });
    }
  });

  app.post('/api/contracts/send-email', isAuthenticated, async (req: any, res) => {
    try {
      console.log('📧 Contract email route called with body:', req.body);
      
      // FIXED: Frontend sends 'customMessage', not 'subject'
      const { contractId, customMessage } = req.body;
      
      if (!contractId) {
        return res.status(400).json({ error: 'Contract ID is required' });
      }
      
      const contract = await storage.getContract(contractId);
      
      if (!contract) {
        console.log('❌ Contract not found:', contractId);
        return res.status(404).json({ error: 'Contract not found' });
      }
      
      if (!contract.clientEmail) {
        console.log('❌ No client email for contract:', contractId);
        return res.status(400).json({ error: 'Contract has no client email address' });
      }
      
      const userSettings = await storage.getSettings(req.user.id);
      
      // CRITICAL: Always use R2 cloud storage URL, never app server
      let signingUrl = contract.cloudStorageUrl;
      
      // If no cloud storage URL exists, create one NOW
      if (!signingUrl) {
        console.log('🔗 No cloud storage URL found, creating one now...');
        const { url, key } = await cloudStorageService.uploadContractSigningPage(contract, userSettings);
        
        // Update contract with cloud storage info
        await storage.updateContract(contract.id, {
          cloudStorageUrl: url,
          cloudStorageKey: key,
          signingUrlCreatedAt: new Date()
        }, req.user.id);
        
        signingUrl = url;
        console.log('✅ Created R2 signing URL:', url);
      }
      
      console.log('📧 Sending contract email:', {
        contractId,
        clientEmail: contract.clientEmail,
        signingUrl,
        hasCustomMessage: !!customMessage
      });
      
      // FIXED: Pass customMessage as subject parameter
      const emailSubject = customMessage || `Contract ready for signing - ${contract.contractNumber}`;
      
      const emailResult = await mailgunService.sendContractEmail(contract, userSettings, emailSubject, signingUrl);
      
      // Update contract status to 'sent' when email is successfully sent
      await storage.updateContract(contractId, {
        status: 'sent',
        sentAt: new Date()
      }, req.user.id);
      
      console.log('✅ Contract email sent successfully for contract:', contractId);
      res.json({ 
        success: true,
        message: 'Contract email sent successfully via Mailgun',
        recipient: contract.clientEmail,
        messageId: emailResult?.id || 'No ID returned',
        signingUrl: signingUrl
      });
      
    } catch (error: any) {
      console.error('❌ Contract email error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        contractId: req.body?.contractId
      });
      
      res.status(500).json({ 
        error: 'Failed to send contract email',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Debug route to test Mailgun configuration
  app.post('/api/debug/mailgun-test', isAuthenticated, async (req: any, res) => {
    try {
      console.log('🔧 Testing Mailgun configuration...');
      
      // Check environment variables
      const config = {
        hasApiKey: !!process.env.MAILGUN_API_KEY,
        apiKeyPrefix: process.env.MAILGUN_API_KEY?.substring(0, 10) + '...',
        hasPublicKey: !!process.env.MAILGUN_PUBLIC_KEY,
        domain: 'mg.musobuddy.com'
      };
      
      console.log('🔧 Mailgun config:', config);
      
      if (!process.env.MAILGUN_API_KEY) {
        return res.status(500).json({ 
          error: 'Mailgun API key not configured',
          config 
        });
      }
      
      // Try to send a simple test email
      const testEmail = {
        from: 'MusoBuddy <noreply@mg.musobuddy.com>',
        to: req.user.email || 'test@example.com', // Send to current user
        subject: 'MusoBuddy Email Test',
        html: '<h1>Test Email</h1><p>If you receive this, Mailgun is working correctly!</p>'
      };
      
      console.log('📧 Sending test email to:', testEmail.to);
      
      const result = await mailgunService.mailgun.messages.create('mg.musobuddy.com', testEmail);
      
      console.log('✅ Test email sent successfully:', result.id);
      
      res.json({ 
        success: true, 
        messageId: result.id,
        config,
        testEmail: testEmail.to
      });
      
    } catch (error: any) {
      console.error('❌ Mailgun test failed:', error);
      
      res.status(500).json({ 
        error: 'Mailgun test failed',
        details: error.message,
        status: error.status,
        config: {
          hasApiKey: !!process.env.MAILGUN_API_KEY,
          domain: 'mg.musobuddy.com'
        }
      });
    }
  });

  // Contract signing page route (user-friendly URL)
  app.get('/contracts/sign/:id', async (req, res) => {
    console.log('🎯 CONTRACT SIGNING ROUTE HIT:', req.params.id);
    try {
      const contract = await storage.getContract(parseInt(req.params.id));
      if (!contract) {
        return res.status(404).json({ message: 'Contract not found' });
      }
      
      // If contract is already signed, show "Already Signed" page instead of signing form
      if (contract.status === 'signed') {
        const alreadySignedHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Contract Already Signed - ${contract.contractNumber}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; text-align: center; }
        .success-message { background: #d4edda; color: #155724; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #c3e6cb; }
        .contract-details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: left; }
        .download-button { background: #28a745; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; text-decoration: none; display: inline-block; margin: 10px; }
    </style>
</head>
<body>
    <h1>✅ Contract Already Signed</h1>
    <h2>${contract.contractNumber}</h2>
    
    <div class="success-message">
        <h3>This contract has already been signed successfully!</h3>
        <p><strong>Signed by:</strong> ${contract.clientSignature || contract.clientName}</p>
        <p><strong>Signed on:</strong> ${contract.signedAt ? new Date(contract.signedAt).toLocaleString('en-GB') : 'Recently'}</p>
    </div>
    
    <div class="contract-details">
        <h3>Event Details</h3>
        <p><strong>Client:</strong> ${contract.clientName}</p>
        <p><strong>Date:</strong> ${new Date(contract.eventDate).toLocaleDateString('en-GB')}</p>
        <p><strong>Time:</strong> ${contract.eventTime} ${contract.eventEndTime ? '- ' + contract.eventEndTime : ''}</p>
        <p><strong>Venue:</strong> ${contract.venue}</p>
        <p><strong>Performance Fee:</strong> £${contract.fee}</p>
    </div>
    
    <div style="margin: 30px 0;">
        <a href="/api/contracts/${contract.id}/download" class="download-button">📄 Download Signed Contract</a>
    </div>
    
    <p style="color: #6c757d; font-size: 14px; margin-top: 40px;">
        If you need any assistance, please contact us directly.
    </p>
</body>
</html>`;
        
        res.setHeader('Content-Type', 'text/html');
        return res.send(alreadySignedHtml);
      }
      
      // Return contract signing page HTML
      const userSettings = await storage.getSettings(contract.userId);
      const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Contract Signing - ${contract.contractNumber}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .contract-details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .sign-button { background: #6366f1; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; }
    </style>
</head>
<body>
    <h1>Performance Contract</h1>
    <h2>${contract.contractNumber}</h2>
    
    <div class="contract-details">
        <h3>Event Details</h3>
        <p><strong>Client:</strong> ${contract.clientName}</p>
        <p><strong>Date:</strong> ${new Date(contract.eventDate).toDateString()}</p>
        <p><strong>Time:</strong> ${contract.eventTime} ${contract.eventEndTime ? '- ' + contract.eventEndTime : ''}</p>
        <p><strong>Venue:</strong> ${contract.venue}</p>
        <p><strong>Performance Fee:</strong> £${contract.fee}</p>
    </div>
    
    <div class="terms-section" style="margin: 30px 0; padding: 20px; background: #f9f9f9; border-radius: 6px;">
        <h3>Terms & Conditions</h3>
        <ol style="margin: 15px 0; padding-left: 25px;">
            <li>Payment is due on the date of performance unless otherwise agreed.</li>
            <li>All equipment is provided by the performer unless specified otherwise.</li>
            <li>The venue must provide safe access to electricity and ensure security.</li>
            <li>No recording or transmission without written consent from the performer.</li>
        </ol>
    </div>
    
    <form id="signingForm" style="margin: 30px 0; padding: 20px; background: #fff; border: 2px solid #e5e5e5; border-radius: 8px;">
        <h3>Complete Contract Details & Sign</h3>
        <div style="margin: 15px 0;">
            <label style="display: block; font-weight: bold; margin-bottom: 5px;">Full Name (for signature):</label>
            <input type="text" id="signatureName" value="${contract.clientName}" required 
                   style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" />
        </div>
        <div style="margin: 15px 0;">
            <label style="display: block; font-weight: bold; margin-bottom: 5px;">Phone Number:</label>
            <input type="tel" id="clientPhone" value="${contract.clientPhone || ''}" placeholder="07123 456789" 
                   ${contract.clientPhone ? 'readonly style="background-color: #f9f9f9; width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;"' : 'style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;"'} />
        </div>
        <div style="margin: 15px 0;">
            <label style="display: block; font-weight: bold; margin-bottom: 5px;">Address:</label>
            <textarea id="clientAddress" rows="3" placeholder="Full address including postcode"
                      ${contract.clientAddress ? 'readonly style="background-color: #f9f9f9; width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;"' : 'style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;"'}>${contract.clientAddress || ''}</textarea>
        </div>
        <div style="margin: 20px 0;">
            <label style="display: flex; align-items: center; cursor: pointer;">
                <input type="checkbox" id="agreeTerms" required style="margin-right: 10px;" />
                <span>I agree to all terms and conditions stated in this contract</span>
            </label>
        </div>
        <div style="text-align: center;">
            <button type="submit" class="sign-button">Sign Contract</button>
        </div>
    </form>
    
    <script>
        document.getElementById('signingForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const signatureName = document.getElementById('signatureName').value.trim();
            const agreeTerms = document.getElementById('agreeTerms').checked;
            
            if (!signatureName) {
                alert('Please enter your full name for signature');
                return;
            }
            
            if (!agreeTerms) {
                alert('Please agree to the terms and conditions');
                return;
            }
            
            // Collect optional fields
            const clientPhone = document.getElementById('clientPhone') ? document.getElementById('clientPhone').value.trim() : '';
            const clientAddress = document.getElementById('clientAddress') ? document.getElementById('clientAddress').value.trim() : '';
            
            const signatureData = {
                signatureName: signatureName,
                clientPhone: clientPhone || null,
                clientAddress: clientAddress || null,
                agreedToTerms: true,
                signedAt: new Date().toISOString(),
                ipAddress: 'Contract Signing Page'
            };
            
            // Disable form during submission
            const form = document.getElementById('signingForm');
            form.innerHTML = '<div style="text-align:center;padding:30px;"><h3>Processing signature...</h3></div>';
            
            fetch('/api/contracts/sign/${contract.id}', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(signatureData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    document.body.innerHTML = \`
                        <div style="text-align:center;padding:50px;font-family:Arial,sans-serif;">
                            <h1 style="color:#28a745;">✅ Contract Signed Successfully</h1>
                            <h2>${contract.contractNumber}</h2>
                            <p style="font-size:18px;margin:30px 0;">Thank you, \${signatureName}!</p>
                            <p>Your contract has been successfully signed and saved.</p>
                            <p>You will receive a confirmation email shortly.</p>
                            <div style="margin:40px 0;padding:20px;background:#f8f9fa;border-radius:8px;">
                                <h3>Event Summary</h3>
                                <p><strong>Date:</strong> ${new Date(contract.eventDate).toDateString()}</p>
                                <p><strong>Time:</strong> ${contract.eventTime}</p>
                                <p><strong>Venue:</strong> ${contract.venue}</p>
                                <p><strong>Fee:</strong> £${contract.fee}</p>
                            </div>
                        </div>
                    \`;
                } else if (data.alreadySigned) {
                    // CRITICAL FIX: Handle already signed contracts properly
                    document.body.innerHTML = \`
                        <div style="text-align:center;padding:50px;font-family:Arial,sans-serif;">
                            <h1 style="color:#ffc107;">✅ Contract Already Signed</h1>
                            <h2>${contract.contractNumber}</h2>
                            <div style="background:#fff3cd;color:#856404;padding:20px;border-radius:8px;margin:30px auto;max-width:500px;border:1px solid #ffeeba;">
                                <h3>This contract has already been signed</h3>
                                <p><strong>Signed by:</strong> \${data.signedBy}</p>
                                <p><strong>Signed on:</strong> \${new Date(data.signedAt).toLocaleString('en-GB')}</p>
                            </div>
                            <a href="/api/contracts/${contract.id}/download" style="background:#28a745;color:white;padding:12px 24px;border:none;border-radius:6px;text-decoration:none;display:inline-block;">📄 Download Signed Contract</a>
                        </div>
                    \`;
                } else {
                    throw new Error(data.message || 'Unknown error');
                }
            })
            .catch(error => {
                console.error('Signing error:', error);
                document.body.innerHTML = \`
                    <div style="text-align:center;padding:50px;font-family:Arial,sans-serif;">
                        <h2 style="color:#dc3545;">❌ Signing Failed</h2>
                        <p>There was an issue processing your signature.</p>
                        <p>Please try again or contact support.</p>
                        <button onclick="location.reload()" style="background:#6366f1;color:white;padding:12px 24px;border:none;border-radius:6px;cursor:pointer;">Try Again</button>
                    </div>
                \`;
            });
        });
    </script>
</body>
</html>`;
      
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error) {
      res.status(500).json({ error: 'Failed to load contract' });
    }
  });

  app.get('/api/contracts/public/:id', async (req, res) => {
    try {
      const contract = await storage.getContract(parseInt(req.params.id));
      if (!contract) {
        return res.status(404).json({ message: 'Contract not found' });
      }
      
      // If contract is already signed, show "Already Signed" page instead of signing form
      if (contract.status === 'signed') {
        const alreadySignedHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Contract Already Signed - ${contract.contractNumber}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; text-align: center; }
        .success-message { background: #d4edda; color: #155724; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #c3e6cb; }
        .contract-details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: left; }
        .download-button { background: #28a745; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; text-decoration: none; display: inline-block; margin: 10px; }
    </style>
</head>
<body>
    <h1>✅ Contract Already Signed</h1>
    <h2>${contract.contractNumber}</h2>
    
    <div class="success-message">
        <h3>This contract has already been signed successfully!</h3>
        <p><strong>Signed by:</strong> ${contract.clientSignature || contract.clientName}</p>
        <p><strong>Signed on:</strong> ${contract.signedAt ? new Date(contract.signedAt).toLocaleString('en-GB') : 'Recently'}</p>
    </div>
    
    <div class="contract-details">
        <h3>Event Details</h3>
        <p><strong>Client:</strong> ${contract.clientName}</p>
        <p><strong>Date:</strong> ${new Date(contract.eventDate).toLocaleDateString('en-GB')}</p>
        <p><strong>Time:</strong> ${contract.eventTime} ${contract.eventEndTime ? '- ' + contract.eventEndTime : ''}</p>
        <p><strong>Venue:</strong> ${contract.venue}</p>
        <p><strong>Performance Fee:</strong> £${contract.fee}</p>
    </div>
    
    <div style="margin: 30px 0;">
        <a href="/api/contracts/${contract.id}/download" class="download-button">📄 Download Signed Contract</a>
    </div>
    
    <p style="color: #6c757d; font-size: 14px; margin-top: 40px;">
        If you need any assistance, please contact us directly.
    </p>
</body>
</html>`;
        
        res.setHeader('Content-Type', 'text/html');
        return res.send(alreadySignedHtml);
      }
      
      // Return contract signing page HTML
      const userSettings = await storage.getSettings(contract.userId);
      const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Contract Signing - ${contract.contractNumber}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .contract-details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .sign-button { background: #6366f1; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; }
    </style>
</head>
<body>
    <h1>Performance Contract</h1>
    <h2>${contract.contractNumber}</h2>
    
    <div class="contract-details">
        <h3>Event Details</h3>
        <p><strong>Client:</strong> ${contract.clientName}</p>
        <p><strong>Date:</strong> ${new Date(contract.eventDate).toDateString()}</p>
        <p><strong>Time:</strong> ${contract.eventTime} ${contract.eventEndTime ? '- ' + contract.eventEndTime : ''}</p>
        <p><strong>Venue:</strong> ${contract.venue}</p>
        <p><strong>Performance Fee:</strong> £${contract.fee}</p>
    </div>
    
    <div class="terms-section" style="margin: 30px 0; padding: 20px; background: #f9f9f9; border-radius: 6px;">
        <h3>Terms & Conditions</h3>
        <ol style="margin: 15px 0; padding-left: 25px;">
            <li>Payment is due on the date of performance unless otherwise agreed.</li>
            <li>All equipment is provided by the performer unless specified otherwise.</li>
            <li>The venue must provide safe access to electricity and ensure security.</li>
            <li>No recording or transmission without written consent from the performer.</li>
        </ol>
    </div>
    
    <form id="signingForm" style="margin: 30px 0; padding: 20px; background: #fff; border: 2px solid #e5e5e5; border-radius: 8px;">
        <h3>Complete Contract Details & Sign</h3>
        <div style="margin: 15px 0;">
            <label style="display: block; font-weight: bold; margin-bottom: 5px;">Full Name (for signature):</label>
            <input type="text" id="signatureName" value="${contract.clientName}" required 
                   style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" />
        </div>
        <div style="margin: 15px 0;">
            <label style="display: block; font-weight: bold; margin-bottom: 5px;">Phone Number:</label>
            <input type="tel" id="clientPhone" value="${contract.clientPhone || ''}" placeholder="07123 456789" 
                   ${contract.clientPhone ? 'readonly style="background-color: #f9f9f9; width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;"' : 'style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;"'} />
        </div>
        <div style="margin: 15px 0;">
            <label style="display: block; font-weight: bold; margin-bottom: 5px;">Address:</label>
            <textarea id="clientAddress" rows="3" placeholder="Full address including postcode"
                      ${contract.clientAddress ? 'readonly style="background-color: #f9f9f9; width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;"' : 'style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;"'}>${contract.clientAddress || ''}</textarea>
        </div>
        <div style="margin: 20px 0;">
            <label style="display: flex; align-items: center; cursor: pointer;">
                <input type="checkbox" id="agreeTerms" required style="margin-right: 10px;" />
                <span>I agree to all terms and conditions stated in this contract</span>
            </label>
        </div>
        <div style="text-align: center;">
            <button type="submit" class="sign-button">Sign Contract</button>
        </div>
    </form>
    
    <script>
        document.getElementById('signingForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const signatureName = document.getElementById('signatureName').value.trim();
            const agreeTerms = document.getElementById('agreeTerms').checked;
            
            if (!signatureName) {
                alert('Please enter your full name for signature');
                return;
            }
            
            if (!agreeTerms) {
                alert('Please agree to the terms and conditions');
                return;
            }
            
            // Collect optional fields
            const clientPhone = document.getElementById('clientPhone') ? document.getElementById('clientPhone').value.trim() : '';
            const clientAddress = document.getElementById('clientAddress') ? document.getElementById('clientAddress').value.trim() : '';
            
            const signatureData = {
                signatureName: signatureName,
                clientPhone: clientPhone || null,
                clientAddress: clientAddress || null,
                agreedToTerms: true,
                signedAt: new Date().toISOString(),
                ipAddress: 'Contract Signing Page'
            };
            
            // Disable form during submission
            const form = document.getElementById('signingForm');
            form.innerHTML = '<div style="text-align:center;padding:30px;"><h3>Processing signature...</h3></div>';
            
            fetch('/api/contracts/sign/${contract.id}', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(signatureData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    document.body.innerHTML = \`
                        <div style="text-align:center;padding:50px;font-family:Arial,sans-serif;">
                            <h1 style="color:#28a745;">✅ Contract Signed Successfully</h1>
                            <h2>${contract.contractNumber}</h2>
                            <p style="font-size:18px;margin:30px 0;">Thank you, \${signatureName}!</p>
                            <p>Your contract has been successfully signed and saved.</p>
                            <p>You will receive a confirmation email shortly.</p>
                            <div style="margin:40px 0;padding:20px;background:#f8f9fa;border-radius:8px;">
                                <h3>Event Summary</h3>
                                <p><strong>Date:</strong> ${new Date(contract.eventDate).toDateString()}</p>
                                <p><strong>Time:</strong> ${contract.eventTime}</p>
                                <p><strong>Venue:</strong> ${contract.venue}</p>
                                <p><strong>Fee:</strong> £${contract.fee}</p>
                            </div>
                        </div>
                    \`;
                } else if (data.alreadySigned) {
                    // CRITICAL FIX: Handle already signed contracts properly
                    document.body.innerHTML = \`
                        <div style="text-align:center;padding:50px;font-family:Arial,sans-serif;">
                            <h1 style="color:#ffc107;">✅ Contract Already Signed</h1>
                            <h2>${contract.contractNumber}</h2>
                            <div style="background:#fff3cd;color:#856404;padding:20px;border-radius:8px;margin:30px auto;max-width:500px;border:1px solid #ffeeba;">
                                <h3>This contract has already been signed</h3>
                                <p><strong>Signed by:</strong> \${data.signedBy}</p>
                                <p><strong>Signed on:</strong> \${new Date(data.signedAt).toLocaleString('en-GB')}</p>
                            </div>
                            <a href="/api/contracts/${contract.id}/download" style="background:#28a745;color:white;padding:12px 24px;border:none;border-radius:6px;text-decoration:none;display:inline-block;">📄 Download Signed Contract</a>
                        </div>
                    \`;
                } else {
                    throw new Error(data.message || 'Unknown error');
                }
            })
            .catch(error => {
                console.error('Signing error:', error);
                document.body.innerHTML = \`
                    <div style="text-align:center;padding:50px;font-family:Arial,sans-serif;">
                        <h2 style="color:#dc3545;">❌ Signing Failed</h2>
                        <p>There was an issue processing your signature.</p>
                        <p>Please try again or contact support.</p>
                        <button onclick="location.reload()" style="background:#6366f1;color:white;padding:12px 24px;border:none;border-radius:6px;cursor:pointer;">Try Again</button>
                    </div>
                \`;
            });
        });
    </script>
</body>
</html>`;
      
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error) {
      res.status(500).json({ error: 'Failed to load contract' });
    }
  });


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
      
      // CRITICAL FIX: Update contract with signature first
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
      
      // CRITICAL FIX: Generate signed contract PDF and upload to cloud storage
      try {
        console.log('🔥 CONTRACT SIGNING: Uploading signed contract to cloud storage...');
        const userSettings = await storage.getSettings(contract.userId);
        
        const { uploadContractToCloud } = await import('./cloud-storage');
        const cloudResult = await uploadContractToCloud(signedContract, userSettings, signatureDetails);
        
        if (cloudResult.success && cloudResult.url) {
          await storage.updateContract(contractId, {
            cloudStorageUrl: cloudResult.url,
            cloudStorageKey: cloudResult.key,
            signingUrlCreatedAt: new Date()
          }, contract.userId);
          
          console.log('✅ CONTRACT SIGNING: Signed contract uploaded to cloud storage:', cloudResult.url);
        }
      } catch (cloudError) {
        console.error('❌ CONTRACT SIGNING: Cloud storage upload failed:', cloudError);
      }
      
      // Update booking status
      if (contract.enquiryId) {
        await storage.updateBooking(contract.enquiryId, { 
          contractSigned: true,
          status: 'confirmed'
        }, contract.userId);
      }
      
      // **DEBUG: Re-fetch the contract to verify status update**
      const updatedContract = await storage.getContractById(contractId);
      console.log('🔥 CONTRACT SIGNING: DEBUG - Contract status after signing:', updatedContract?.status);
      console.log('🔥 CONTRACT SIGNING: DEBUG - Contract signedAt after signing:', updatedContract?.signedAt);
      
      // **CRITICAL FIX: Enhanced email confirmation with better error handling**
      try {
        console.log('🔥 CONTRACT SIGNING: Attempting to retrieve user settings for userId:', contract.userId);
        
        // **FIX: Use the correct function name**
        const userSettings = await storage.getSettings(contract.userId);
        console.log('🔥 CONTRACT SIGNING: User settings retrieved successfully:', !!userSettings);
        
        console.log('🔥 CONTRACT SIGNING: Importing sendEmail function...');
        const { sendEmail } = await import('./mailgun-email-restored');
        console.log('🔥 CONTRACT SIGNING: sendEmail function imported successfully');
        
        console.log('🔥 CONTRACT SIGNING: Starting confirmation email process');
        console.log('🔥 CONTRACT SIGNING: User settings:', userSettings);
        console.log('🔥 CONTRACT SIGNING: Contract data:', {
          id: contract.id,
          contractNumber: contract.contractNumber,
          clientName: contract.clientName,
          clientEmail: contract.clientEmail,
          eventDate: contract.eventDate,
          eventTime: contract.eventTime,
          venue: contract.venue,
          fee: contract.fee,
          userId: contract.userId
        });
        
        // Generate contract URLs - prioritize CloudFlare for signed contracts
        const currentDomain = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
        const contractDownloadUrl = `https://${currentDomain}/api/contracts/${signedContract.id}/download`;
        
        // CRITICAL FIX: Use CloudFlare URL for viewing signed contracts, not app server
        const contractViewUrl = signedContract.cloudStorageUrl || `https://${currentDomain}/view-contract/${signedContract.id}`;
        
        console.log('🔥 CONTRACT SIGNING: Domain configuration:', {
          REPLIT_DOMAINS: process.env.REPLIT_DOMAINS,
          currentDomain,
          contractDownloadUrl,
          contractViewUrl
        });
        
        // Smart email handling - use authenticated domain for sending, Gmail for replies
        const userBusinessEmail = userSettings?.businessEmail;
        const fromName = userSettings?.emailFromName || userSettings?.businessName || 'MusoBuddy User';
        
        // Always use authenticated domain for FROM to avoid SPF issues
        const fromEmail = 'noreply@mg.musobuddy.com';
        
        // If user has Gmail (or other non-authenticated domain), use it as reply-to
        const replyToEmail = userBusinessEmail && !userBusinessEmail.includes('@musobuddy.com') ? userBusinessEmail : null;
        
        console.log('=== CONTRACT SIGNING CONFIRMATION EMAIL ===');
        console.log('To:', contract.clientEmail);
        console.log('From:', `${fromName} <${fromEmail}>`);
        console.log('Reply-To:', replyToEmail);
        console.log('Contract download URL:', contractDownloadUrl);
        console.log('Contract view URL:', contractViewUrl);
        console.log('User settings:', userSettings);
        console.log('Performer email:', userSettings?.businessEmail);
        
        // Email to client with download link
        const clientEmailData: any = {
          to: contract.clientEmail,
          from: `${fromName} <${fromEmail}>`,
          subject: `Contract ${contract.contractNumber} Successfully Signed ✓`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #4CAF50; margin-bottom: 20px;">Contract Signed Successfully ✓</h2>
              
              <p>Dear ${contract.clientName},</p>
              <p>Your performance contract <strong>${contract.contractNumber}</strong> has been successfully signed!</p>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #333;">Event Details</h3>
                <p><strong>Date:</strong> ${new Date(contract.eventDate).toLocaleDateString('en-GB')}</p>
                <p><strong>Time:</strong> ${contract.eventTime}</p>
                <p><strong>Venue:</strong> ${contract.venue}</p>
                <p><strong>Fee:</strong> £${contract.fee}</p>
                <p><strong>Signed by:</strong> ${finalSignatureName.trim()}</p>
                <p><strong>Signed on:</strong> ${new Date().toLocaleString('en-GB')}</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${contractViewUrl}" style="background: #1e40af; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 18px; border: none; box-shadow: 0 3px 6px rgba(0,0,0,0.2); text-transform: uppercase; letter-spacing: 0.5px;">📄 View Contract Online</a>
              </div>
              
              <p style="color: #6B7280; font-size: 14px;">
                Your signed contract is ready for download at any time. We look forward to performing at your event!
              </p>
              
              <p>Best regards,<br><strong>${userSettings?.businessName || fromName}</strong></p>
              
              <p style="text-align: center; color: #6B7280; font-size: 12px; margin-top: 30px;">
                <small>Powered by MusoBuddy – less admin, more music</small>
              </p>
            </div>
          `,
          text: `Contract ${contract.contractNumber} successfully signed by ${finalSignatureName.trim()}. Event: ${new Date(contract.eventDate).toLocaleDateString('en-GB')} at ${contract.venue}. View: ${contractViewUrl} Download: ${contractDownloadUrl}`
        };
        
        // Add reply-to if user has Gmail or other external email
        if (replyToEmail) {
          clientEmailData.replyTo = replyToEmail;
        }
        
        console.log('🔥 CONTRACT SIGNING: Sending client confirmation email...');
        console.log('🔥 CONTRACT SIGNING: Client email data:', {
          to: clientEmailData.to,
          from: clientEmailData.from,
          subject: clientEmailData.subject,
          hasReplyTo: !!clientEmailData.replyTo
        });
        const clientEmailResult = await sendEmail(clientEmailData);
        console.log('🔥 CONTRACT SIGNING: Client email result:', clientEmailResult);
        
        // Enhanced logging for debugging confirmation email issues
        if (!clientEmailResult) {
          console.error('❌ CLIENT CONFIRMATION EMAIL FAILED TO SEND');
          console.error('Email data that failed:', JSON.stringify(clientEmailData, null, 2));
        } else {
          console.log('✅ CLIENT CONFIRMATION EMAIL SENT SUCCESSFULLY');
        }
        
        // Email to performer (business owner) with download link
        // Try multiple email sources for performer notification
        const performerEmail = userSettings?.businessEmail || 
                             userSettings?.email || 
                             (req.user?.claims?.email);
        
        if (performerEmail) {
          const performerEmailData: any = {
            to: performerEmail,
            from: `${fromName} <${fromEmail}>`,
            subject: `Contract ${contract.contractNumber} Signed by Client ✓`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #4CAF50; margin-bottom: 20px;">Contract Signed! ✓</h2>
                
                <p>Great news! Contract <strong>${contract.contractNumber}</strong> has been signed by ${contract.clientName}.</p>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #333;">Event Details</h3>
                  <p><strong>Date:</strong> ${new Date(contract.eventDate).toLocaleDateString('en-GB')}</p>
                  <p><strong>Time:</strong> ${contract.eventTime}</p>
                  <p><strong>Venue:</strong> ${contract.venue}</p>
                  <p><strong>Fee:</strong> £${contract.fee}</p>
                </div>
                
                <div style="background: #e3f2fd; padding: 15px; border-radius: 5px; border-left: 4px solid #2196F3; margin: 20px 0;">
                  <p style="margin: 0;"><strong>Signature Details:</strong></p>
                  <p style="margin: 5px 0;">Signed by: ${finalSignatureName.trim()}</p>
                  <p style="margin: 5px 0;">Time: ${new Date().toLocaleString('en-GB')}</p>
                  <p style="margin: 5px 0;">IP: ${clientIP}</p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${contractViewUrl}" style="background: #1e40af; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 18px; border: none; box-shadow: 0 3px 6px rgba(0,0,0,0.2); text-transform: uppercase; letter-spacing: 0.5px;">📄 View Contract Online</a>
                </div>
                
                <p style="background: #e8f5e8; padding: 15px; border-radius: 5px; border-left: 4px solid #4CAF50;">
                  📋 <strong>The signed contract is ready for download when needed.</strong>
                </p>
                
                <p style="text-align: center; color: #6B7280; font-size: 12px; margin-top: 30px;">
                  <small>Powered by MusoBuddy – less admin, more music</small>
                </p>
              </div>
            `,
            text: `Contract ${contract.contractNumber} signed by ${finalSignatureName.trim()} on ${new Date().toLocaleString('en-GB')}. View: ${contractViewUrl} Download: ${contractDownloadUrl}`
          };
          
          // Add reply-to for performer email too
          if (replyToEmail) {
            performerEmailData.replyTo = replyToEmail;
          }
          
          console.log('🔥 CONTRACT SIGNING: Sending performer confirmation email...');
          console.log('🔥 CONTRACT SIGNING: Performer email data:', {
            to: performerEmailData.to,
            from: performerEmailData.from,
            subject: performerEmailData.subject,
            hasReplyTo: !!performerEmailData.replyTo
          });
          const performerEmailResult = await sendEmail(performerEmailData);
          console.log('🔥 CONTRACT SIGNING: Performer email result:', performerEmailResult);
          
          // Enhanced logging for debugging performer confirmation email issues
          if (!performerEmailResult) {
            console.error('❌ PERFORMER CONFIRMATION EMAIL FAILED TO SEND');
            console.error('Email data that failed:', JSON.stringify(performerEmailData, null, 2));
          } else {
            console.log('✅ PERFORMER CONFIRMATION EMAIL SENT SUCCESSFULLY');
          }
        } else {
          console.warn('⚠️ No performer email available - checked businessEmail, email, and user claims');
          console.warn('UserSettings:', userSettings);
          console.warn('User claims:', req.user?.claims);
        }
      } catch (emailError) {
        console.error("❌ CRITICAL ERROR: Failed to send confirmation emails:", emailError);
        console.error("Email error details:", {
          message: emailError.message,
          stack: emailError.stack,
          name: emailError.name,
          status: emailError.status,
          type: emailError.type
        });
        // Don't fail the signing process if email fails
      }
      
      // Send final response after all processing is complete
      res.json({ 
        success: true,
        message: "Contract signed successfully",
        contract: signedContract,
        signedAt: signatureDetails.signedAt,
        signedBy: finalSignatureName.trim()
      });
      
    } catch (error) {
      console.error("Error signing contract:", error);
      res.status(500).json({ message: "Failed to sign contract" });
    }
  });

  // Contract status check route for signing pages
  app.get('/api/contracts/:id/status', async (req, res) => {
    try {
      const contractId = parseInt(req.params.id);
      const contract = await storage.getContractById(contractId);
      
      if (!contract) {
        return res.status(404).json({ error: 'Contract not found' });
      }
      
      res.json({ 
        status: contract.status,
        signed: contract.status === 'signed',
        signedAt: contract.signedAt 
      });
    } catch (error) {
      console.error('Error checking contract status:', error);
      res.status(500).json({ error: 'Failed to check contract status' });
    }
  });

  // Contract import and parsing routes
  app.post('/api/contracts/import-pdf', isAuthenticated, upload.single('contract'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Extract text from PDF (simplified - would need proper PDF parser)
      const contractText = req.file.buffer.toString('utf-8');
      
      // Parse with AI
      const extractedData = await contractParserService.parseContractWithAI(contractText);
      
      res.json({
        success: true,
        extractedData,
        message: 'Contract parsed successfully'
      });
    } catch (error) {
      console.error('Contract import error:', error);
      res.status(500).json({ 
        error: 'Failed to parse contract',
        message: 'Please check if the PDF contains clear, readable text'
      });
    }
  });

  app.post('/api/contracts/debug-text-extraction', isAuthenticated, async (req: any, res) => {
    try {
      const { text } = req.body;
      const extractedData = await contractParserService.parseContractWithAI(text);
      res.json({ extractedData });
    } catch (error) {
      res.status(500).json({ error: 'AI parsing failed' });
    }
  });

  // Contract PDF download route with HTML option
  app.get('/api/contracts/:id/download', isAuthenticated, async (req: any, res) => {
    try {
      const contractId = parseInt(req.params.id);
      const userId = req.user.id;
      const useHTML = req.query.pdfkit !== 'true'; // Use HTML by default, ?pdfkit=true for old system
      
      console.log('📄 Contract PDF download request:', { contractId, userId, useHTML });
      
      // Get contract and verify ownership
      const contract = await storage.getContract(contractId, userId);
      if (!contract) {
        return res.status(404).json({ error: 'Contract not found' });
      }
      
      // Get user settings for PDF generation
      const userSettings = await storage.getSettings(userId);
      
      let pdfBuffer: Buffer;
      
      // Use the original working PDFKit system (Andy Urquhart template)
      console.log('📄 Generating professional contract with original working system...');
      pdfBuffer = await mailgunService.generateContractPDF(contract, userSettings);
      console.log('✅ Professional contract PDF generated, size:', pdfBuffer.length, 'bytes');
      
      // Set proper headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Contract-${contract.contractNumber || contract.id}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length.toString());
      
      // Send the PDF buffer
      res.send(pdfBuffer);
      
    } catch (error) {
      console.error('❌ Contract PDF download error:', error);
      res.status(500).json({ error: 'Failed to generate contract PDF' });
    }
  });

  // Contract deletion routes
  app.delete('/api/contracts/:id', isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteContract(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error('Contract deletion error:', error);
      res.status(500).json({ error: 'Failed to delete contract' });
    }
  });

  app.post('/api/contracts/bulk-delete', isAuthenticated, async (req: any, res) => {
    try {
      const { contractIds } = req.body;
      
      if (!Array.isArray(contractIds) || contractIds.length === 0) {
        return res.status(400).json({ error: 'Contract IDs array is required' });
      }

      // Delete contracts one by one
      for (const id of contractIds) {
        await storage.deleteContract(parseInt(id));
      }
      
      res.json({ success: true, deletedCount: contractIds.length });
    } catch (error) {
      console.error('Bulk contract deletion error:', error);
      res.status(500).json({ error: 'Failed to delete contracts' });
    }
  });

  // ===== WEBHOOK TEST ROUTE =====
  app.post('/api/webhook/test', isAuthenticated, async (req, res) => {
    try {
      const result = await webhookService.testWebhook();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Webhook test failed' });
    }
  });

  // ===== INVOICE ROUTES =====
  app.get('/api/invoices', isAuthenticated, async (req: any, res) => {
    try {
      const invoices = await storage.getInvoices(req.user.id);
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch invoices' });
    }
  });

  app.post('/api/invoices', isAuthenticated, async (req: any, res) => {
    try {
      const invoiceData = { ...req.body, userId: req.user.id };
      const invoice = await storage.createInvoice(invoiceData);
      res.json(invoice);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create invoice' });
    }
  });

  app.patch('/api/invoices/:id', isAuthenticated, async (req: any, res) => {
    try {
      const invoice = await storage.updateInvoice(parseInt(req.params.id), req.body);
      res.json(invoice);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update invoice' });
    }
  });

  app.post('/api/invoices/send-email', isAuthenticated, async (req: any, res) => {
    try {
      const { invoiceId, subject } = req.body;
      const invoice = await storage.getInvoice(invoiceId);
      
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      
      // Generate PDF and upload to cloud storage
      const userSettings = await storage.getSettings(req.user.id);
      const { url } = await cloudStorageService.uploadInvoiceToCloud(invoice, userSettings);
      
      // Send email with PDF link
      await mailgunService.sendInvoiceEmail(invoice, userSettings, url, subject);
      
      // Update invoice status
      await storage.updateInvoice(invoice.id, { status: 'sent', sentAt: new Date() });
      
      res.json({ success: true });
    } catch (error) {
      console.error('Invoice email error:', error);
      res.status(500).json({ error: 'Failed to send invoice email' });
    }
  });

  // Invoice deletion routes
  app.delete('/api/invoices/:id', isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteInvoice(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error('Invoice deletion error:', error);
      res.status(500).json({ error: 'Failed to delete invoice' });
    }
  });

  app.post('/api/invoices/bulk-delete', isAuthenticated, async (req: any, res) => {
    try {
      const { invoiceIds } = req.body;
      
      if (!Array.isArray(invoiceIds) || invoiceIds.length === 0) {
        return res.status(400).json({ error: 'Invoice IDs array is required' });
      }

      // Delete invoices one by one
      for (const id of invoiceIds) {
        await storage.deleteInvoice(parseInt(id));
      }
      
      res.json({ success: true, deletedCount: invoiceIds.length });
    } catch (error) {
      console.error('Bulk invoice deletion error:', error);
      res.status(500).json({ error: 'Failed to delete invoices' });
    }
  });

  // ===== SETTINGS ROUTES =====
  app.get('/api/settings', isAuthenticated, async (req: any, res) => {
    try {
      const settings = await storage.getSettings(req.user.id);
      res.json(settings || {});
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  });

  app.post('/api/settings', isAuthenticated, async (req: any, res) => {
    try {
      const settings = await storage.updateSettings(req.user.id, req.body);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update settings' });
    }
  });

  // ===== COMPLIANCE ROUTES =====
  app.get('/api/compliance', isAuthenticated, async (req: any, res) => {
    try {
      const compliance = await storage.getCompliance(req.user.id);
      res.json(compliance);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch compliance' });
    }
  });

  app.post('/api/compliance', isAuthenticated, async (req: any, res) => {
    try {
      const compliance = await storage.createCompliance({ ...req.body, userId: req.user.id });
      res.json(compliance);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create compliance' });
    }
  });

  // ===== ADMIN ROUTES =====
  app.get('/api/admin/stats', isAdmin, async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  app.get('/api/admin/users', isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  app.get('/api/admin/bookings', isAdmin, async (req, res) => {
    try {
      const bookings = await storage.getAllBookings();
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch bookings' });
    }
  });

  // Admin user management routes
  app.post('/api/admin/users', isAdmin, async (req: any, res) => {
    try {
      const { firstName, lastName, email, password, tier, isAdmin } = req.body;
      
      // Basic validation
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }
      
      const newUser = await storage.createUser({
        firstName,
        lastName,
        email,
        password,
        tier: tier || 'free',
        isAdmin: isAdmin || false
      });
      
      res.json(newUser);
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({ error: 'Failed to create user' });
    }
  });

  app.patch('/api/admin/users/:userId/tier', isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { tier } = req.body;
      
      const updatedUser = await storage.updateUser(userId, { tier });
      res.json(updatedUser);
    } catch (error) {
      console.error('Update user tier error:', error);
      res.status(500).json({ error: 'Failed to update user tier' });
    }
  });

  app.patch('/api/admin/users/:userId/toggle-admin', isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      
      // Get current user to toggle admin status
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const updatedUser = await storage.updateUser(userId, { 
        isAdmin: !user.isAdmin 
      });
      
      res.json(updatedUser);
    } catch (error) {
      console.error('Toggle admin status error:', error);
      res.status(500).json({ error: 'Failed to toggle admin status' });
    }
  });

  app.post('/api/admin/users/:userId/send-credentials', isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({ error: 'Password is required' });
      }
      
      // Update user password
      const updatedUser = await storage.updateUserPassword(userId, password);
      
      // In a real implementation, you'd send an email here
      // For now, just return success
      res.json({ 
        message: 'Password updated successfully',
        user: updatedUser 
      });
    } catch (error) {
      console.error('Send credentials error:', error);
      res.status(500).json({ error: 'Failed to update password' });
    }
  });

  app.delete('/api/admin/users/:userId', isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      
      await storage.deleteUser(userId);
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  });

  // ===== DEBUG ROUTES =====
  app.get('/api/debug-data-counts', async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get debug data' });
    }
  });

  // Test original contract PDF generation
  app.post('/api/test-original-pdf', async (req, res) => {
    try {
      console.log('🧪 Testing original PDF generation...');
      const { generateContractPDF } = await import('./pdf-generator-original');
      
      const testContract = {
        contractNumber: '(10/08/2025 - Andy Urquahart)',
        clientName: 'Andy Urquahart',
        clientEmail: 'timfulker@gmail.com',
        clientAddress: '59, Gloucester Rd',
        clientPhone: '07764190034',
        eventDate: '2025-08-10',
        eventTime: '20:00',
        venue: 'home',
        fee: '50.00'
      };
      
      const pdfBuffer = await generateContractPDF(testContract, null);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="test-contract.pdf"');
      res.send(pdfBuffer);
      
    } catch (error: any) {
      console.error('❌ PDF test failed:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return server;
}

// CRITICAL HELPER FUNCTIONS ADDED - Missing Functions that routes.ts calls

/**
 * Generate HTML page for already signed contracts
 */
function generateAlreadySignedPage(contract: any): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Contract Already Signed</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                margin: 0;
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .container {
                max-width: 600px;
                background: white;
                padding: 40px;
                border-radius: 10px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                text-align: center;
            }
            .success-icon {
                font-size: 64px;
                color: #10b981;
                margin-bottom: 20px;
            }
            h1 {
                color: #065f46;
                margin-bottom: 20px;
                font-size: 32px;
            }
            .contract-info {
                background: #f9fafb;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
                text-align: left;
            }
            .info-row {
                margin: 10px 0;
                padding: 5px 0;
            }
            .info-row strong {
                color: #374151;
                display: inline-block;
                width: 120px;
            }
            .download-btn {
                display: inline-block;
                background: #059669;
                color: white;
                padding: 15px 30px;
                text-decoration: none;
                border-radius: 5px;
                font-weight: bold;
                margin: 20px 10px;
                transition: background 0.3s;
            }
            .download-btn:hover {
                background: #047857;
            }
            .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                font-size: 14px;
                color: #6b7280;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="success-icon">✅</div>
            <h1>Contract Already Signed</h1>
            <p>This performance contract has already been signed and is now legally binding.</p>
            
            <div class="contract-info">
                <div class="info-row">
                    <strong>Contract:</strong> ${contract.contractNumber}
                </div>
                <div class="info-row">
                    <strong>Client:</strong> ${contract.clientName}
                </div>
                <div class="info-row">
                    <strong>Event Date:</strong> ${new Date(contract.eventDate).toLocaleDateString('en-GB')}
                </div>
                <div class="info-row">
                    <strong>Venue:</strong> ${contract.venue}
                </div>
                <div class="info-row">
                    <strong>Signed On:</strong> ${contract.signedAt ? new Date(contract.signedAt).toLocaleString('en-GB') : 'Recently'}
                </div>
            </div>
            
            ${contract.cloudStorageUrl ? 
                `<a href="${contract.cloudStorageUrl}" class="download-btn">📄 Download Signed Contract</a>` :
                `<a href="/api/contracts/${contract.id}/download" class="download-btn">📄 Download Signed Contract</a>`
            }
            
            <div class="footer">
                <p>If you need assistance, please contact the performer directly.</p>
                <p>Powered by MusoBuddy – less admin, more music</p>
            </div>
        </div>
    </body>
    </html>
  `;
}

/**
 * Generate HTML contract signing page
 */
function generateContractSigningPage(contract: any, userSettings: any): string {
  const businessName = userSettings?.businessName || 'MusoBuddy';
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sign Contract - ${businessName}</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                margin: 0;
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
            }
            .container {
                max-width: 800px;
                margin: 0 auto;
                background: white;
                padding: 40px;
                border-radius: 10px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            }
            .header {
                text-align: center;
                margin-bottom: 40px;
                border-bottom: 2px solid #e5e7eb;
                padding-bottom: 20px;
            }
            .header h1 {
                color: #1f2937;
                margin: 0;
                font-size: 32px;
            }
            .header p {
                color: #6b7280;
                font-size: 18px;
                margin: 10px 0 0 0;
            }
            .contract-details {
                background: #f9fafb;
                padding: 30px;
                border-radius: 8px;
                margin: 30px 0;
            }
            .contract-details h2 {
                color: #374151;
                margin-top: 0;
                margin-bottom: 20px;
                font-size: 24px;
            }
            .detail-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
                margin-bottom: 20px;
            }
            @media (max-width: 600px) {
                .detail-grid {
                    grid-template-columns: 1fr;
                }
            }
            .detail-item {
                background: white;
                padding: 15px;
                border-radius: 5px;
                border-left: 4px solid #059669;
            }
            .detail-item strong {
                color: #374151;
                display: block;
                margin-bottom: 5px;
                font-size: 14px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .detail-item span {
                color: #1f2937;
                font-size: 16px;
                font-weight: 500;
            }
            .signing-form {
                background: #fff;
                padding: 30px;
                border-radius: 8px;
                border: 2px solid #e5e7eb;
                margin: 30px 0;
            }
            .signing-form h3 {
                color: #1f2937;
                margin-top: 0;
                margin-bottom: 25px;
                font-size: 22px;
            }
            .form-group {
                margin-bottom: 20px;
            }
            .form-group label {
                display: block;
                margin-bottom: 8px;
                color: #374151;
                font-weight: 500;
                font-size: 16px;
            }
            .form-group input {
                width: 100%;
                padding: 12px;
                border: 2px solid #d1d5db;
                border-radius: 5px;
                font-size: 16px;
                transition: border-color 0.3s;
                box-sizing: border-box;
            }
            .form-group input:focus {
                outline: none;
                border-color: #059669;
                box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1);
            }
            .sign-button {
                width: 100%;
                background: #059669;
                color: white;
                padding: 15px;
                border: none;
                border-radius: 5px;
                font-size: 18px;
                font-weight: bold;
                cursor: pointer;
                transition: background 0.3s;
                margin-top: 20px;
            }
            .sign-button:hover:not(:disabled) {
                background: #047857;
            }
            .sign-button:disabled {
                background: #9ca3af;
                cursor: not-allowed;
            }
            .loading {
                display: none;
                text-align: center;
                margin: 20px 0;
            }
            .success-message {
                display: none;
                background: #d1fae5;
                color: #065f46;
                padding: 20px;
                border-radius: 5px;
                margin: 20px 0;
                text-align: center;
                border: 1px solid #10b981;
            }
            .error-message {
                display: none;
                background: #fee2e2;
                color: #dc2626;
                padding: 20px;
                border-radius: 5px;
                margin: 20px 0;
                text-align: center;
                border: 1px solid #f87171;
            }
            .footer {
                text-align: center;
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                color: #6b7280;
                font-size: 14px;
            }
            .required {
                color: #dc2626;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📝 Performance Contract</h1>
                <p>Please review and sign the contract below</p>
            </div>

            <div class="contract-details">
                <h2>📋 Event Details</h2>
                <div class="detail-grid">
                    <div class="detail-item">
                        <strong>Contract Number</strong>
                        <span>${contract.contractNumber}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Performance Date</strong>
                        <span>${new Date(contract.eventDate).toLocaleDateString('en-GB')}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Event Time</strong>
                        <span>${contract.eventTime}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Venue</strong>
                        <span>${contract.venue}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Performance Fee</strong>
                        <span>£${contract.fee}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Client Name</strong>
                        <span>${contract.clientName}</span>
                    </div>
                </div>
            </div>

            <div class="signing-form">
                <h3>✍️ Digital Signature</h3>
                <form id="contractForm">
                    <div class="form-group">
                        <label for="signatureName">Full Name <span class="required">*</span></label>
                        <input type="text" id="signatureName" name="signatureName" value="${contract.clientName}" required>
                        <small style="color: #6b7280;">This will serve as your legal digital signature</small>
                    </div>
                    
                    <div class="form-group">
                        <label for="clientPhone">Phone Number (optional)</label>
                        <input type="tel" id="clientPhone" name="clientPhone" value="${contract.clientPhone || ''}">
                    </div>
                    
                    <div class="form-group">
                        <label for="clientAddress">Client Address (optional)</label>
                        <input type="text" id="clientAddress" name="clientAddress" value="${contract.clientAddress || ''}">
                    </div>
                    
                    <div class="form-group">
                        <label for="venueAddress">Venue Address (optional)</label>
                        <input type="text" id="venueAddress" name="venueAddress" value="${contract.venueAddress || ''}">
                    </div>
                    
                    <button type="submit" class="sign-button" id="signButton">
                        🖋️ Sign Contract
                    </button>
                </form>
            </div>

            <div class="loading" id="loadingMessage">
                <p>📝 Processing your signature...</p>
            </div>

            <div class="success-message" id="successMessage">
                <h3>✅ Contract Signed Successfully!</h3>
                <p>Both parties have been notified. You will receive a confirmation email shortly.</p>
            </div>

            <div class="error-message" id="errorMessage">
                <h3>❌ Signing Failed</h3>
                <p id="errorText">Please try again.</p>
            </div>

            <div class="footer">
                <p>By signing this contract, you agree to all terms and conditions.</p>
                <p>Powered by ${businessName} via MusoBuddy</p>
            </div>
        </div>

        <script>
            document.getElementById('contractForm').addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const signButton = document.getElementById('signButton');
                const loadingMessage = document.getElementById('loadingMessage');
                const successMessage = document.getElementById('successMessage');
                const errorMessage = document.getElementById('errorMessage');
                
                // Reset messages
                successMessage.style.display = 'none';
                errorMessage.style.display = 'none';
                
                // Show loading
                signButton.disabled = true;
                loadingMessage.style.display = 'block';
                
                try {
                    const formData = {
                        signatureName: document.getElementById('signatureName').value.trim(),
                        clientName: '${contract.clientName}',
                        clientPhone: document.getElementById('clientPhone').value.trim(),
                        clientAddress: document.getElementById('clientAddress').value.trim(),
                        venueAddress: document.getElementById('venueAddress').value.trim()
                    };
                    
                    const response = await fetch('/api/contracts/sign/${contract.id}', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(formData)
                    });
                    
                    const result = await response.json();
                    
                    loadingMessage.style.display = 'none';
                    
                    if (response.ok && result.success) {
                        successMessage.style.display = 'block';
                        // Hide the form
                        document.querySelector('.signing-form').style.display = 'none';
                    } else {
                        if (result.alreadySigned) {
                            // Handle already signed contract
                            errorMessage.style.display = 'block';
                            document.getElementById('errorText').innerHTML = 
                                '<strong>This contract has already been signed.</strong><br>' + 
                                'Signed on: ' + new Date(result.signedAt).toLocaleString('en-GB') + '<br>' +
                                'Signed by: ' + result.signedBy;
                        } else {
                            errorMessage.style.display = 'block';
                            document.getElementById('errorText').textContent = result.message || 'An error occurred while signing the contract.';
                        }
                        signButton.disabled = false;
                    }
                } catch (error) {
                    loadingMessage.style.display = 'none';
                    errorMessage.style.display = 'block';
                    document.getElementById('errorText').textContent = 'Network error. Please check your connection and try again.';
                    signButton.disabled = false;
                }
            });
        </script>
    </body>
    </html>
  `;
}

// DUPLICATE FUNCTION REMOVAL - These functions already exist above
// Remove duplicate generateAlreadySignedPage function
function generateAlreadySignedPage_DUPLICATE(contract: any): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Contract Already Signed</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                margin: 0;
                padding: 20px;
                background-color: #f8fafc;
                color: #1f2937;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background: white;
                border-radius: 12px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                overflow: hidden;
            }
            .header {
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
                padding: 40px 30px;
                text-align: center;
            }
            .content {
                padding: 40px 30px;
            }
            .success-icon {
                font-size: 4rem;
                margin-bottom: 20px;
            }
            .title {
                font-size: 2rem;
                font-weight: 700;
                margin: 0 0 10px 0;
            }
            .subtitle {
                font-size: 1.1rem;
                opacity: 0.9;
                margin: 0;
            }
            .info-box {
                background-color: #f0fdf4;
                border: 1px solid #bbf7d0;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
            }
            .download-btn {
                display: inline-block;
                background: linear-gradient(135deg, #059669 0%, #047857 100%);
                color: white;
                padding: 16px 32px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
                font-size: 1.1rem;
                text-align: center;
                transition: transform 0.2s;
                margin: 20px 0;
            }
            .download-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(5, 150, 105, 0.3);
            }
            .footer {
                text-align: center;
                color: #6b7280;
                font-size: 0.9rem;
                border-top: 1px solid #e5e7eb;
                padding: 20px 30px;
                background-color: #f9fafb;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="success-icon">✅</div>
                <h1 class="title">Already Signed!</h1>
                <p class="subtitle">This contract has been successfully signed</p>
            </div>
            
            <div class="content">
                <div class="info-box">
                    <h3 style="margin-top: 0; color: #065f46;">Contract Details:</h3>
                    <p><strong>Contract:</strong> ${contract.contractNumber}</p>
                    <p><strong>Client:</strong> ${contract.clientName}</p>
                    <p><strong>Event Date:</strong> ${new Date(contract.eventDate).toLocaleDateString('en-GB')}</p>
                    <p><strong>Venue:</strong> ${contract.venue}</p>
                    ${contract.signedAt ? `<p><strong>Signed:</strong> ${new Date(contract.signedAt).toLocaleString('en-GB')}</p>` : ''}
                </div>
                
                <p>This performance contract has already been signed and is legally binding. Both parties have been notified via email.</p>
                
                <div style="text-align: center;">
                    <a href="/api/contracts/${contract.id}/download" class="download-btn">
                        📄 Download Signed Contract
                    </a>
                </div>
                
                <p style="margin-top: 30px; font-size: 0.9rem; color: #6b7280;">
                    If you need a copy of the signed contract, use the download button above or check your email for the confirmation message sent when the contract was signed.
                </p>
            </div>
            
            <div class="footer">
                <p>Powered by MusoBuddy – less admin, more music</p>
            </div>
        </div>
    </body>
    </html>
  `;
}

// Remove duplicate generateContractSigningPage function
function generateContractSigningPage_DUPLICATE(contract: any, userSettings: any): string {
  const businessName = userSettings?.businessName || 'MusoBuddy';
  const today = new Date().toLocaleDateString('en-GB');
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sign Contract - ${contract.contractNumber}</title>
        <style>
            * {
                box-sizing: border-box;
            }
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                margin: 0;
                padding: 20px;
                background-color: #f8fafc;
                color: #1f2937;
            }
            .container {
                max-width: 800px;
                margin: 0 auto;
                background: white;
                border-radius: 12px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                overflow: hidden;
            }
            .header {
                background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
                color: white;
                padding: 30px;
                text-align: center;
            }
            .content {
                padding: 30px;
            }
            .contract-details {
                background-color: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
            }
            .form-group {
                margin: 20px 0;
            }
            label {
                display: block;
                font-weight: 600;
                margin-bottom: 8px;
                color: #374151;
            }
            input, textarea {
                width: 100%;
                padding: 12px 16px;
                border: 1px solid #d1d5db;
                border-radius: 8px;
                font-size: 16px;
                transition: border-color 0.2s;
            }
            input:focus, textarea:focus {
                outline: none;
                border-color: #6366f1;
                box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
            }
            .sign-btn {
                background: linear-gradient(135deg, #059669 0%, #047857 100%);
                color: white;
                padding: 16px 32px;
                border: none;
                border-radius: 8px;
                font-size: 18px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                width: 100%;
                margin-top: 20px;
            }
            .sign-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(5, 150, 105, 0.3);
            }
            .sign-btn:disabled {
                background: #9ca3af;
                cursor: not-allowed;
                transform: none;
                box-shadow: none;
            }
            .loading {
                display: none;
                text-align: center;
                color: #6b7280;
                margin: 20px 0;
            }
            .error {
                background-color: #fef2f2;
                border: 1px solid #fecaca;
                color: #dc2626;
                padding: 12px 16px;
                border-radius: 8px;
                margin: 20px 0;
                display: none;
            }
            .success {
                background-color: #f0fdf4;
                border: 1px solid #bbf7d0;
                color: #059669;
                padding: 12px 16px;
                border-radius: 8px;
                margin: 20px 0;
                display: none;
            }
            .footer {
                text-align: center;
                color: #6b7280;
                font-size: 0.9rem;
                border-top: 1px solid #e5e7eb;
                padding: 20px 30px;
                background-color: #f9fafb;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0 0 10px 0; font-size: 2rem;">📄 Contract Signature</h1>
                <p style="margin: 0; font-size: 1.1rem; opacity: 0.9;">Please review and sign your performance contract</p>
            </div>
            
            <div class="content">
                <div class="contract-details">
                    <h3 style="margin-top: 0; color: #374151;">Contract Details:</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                        <div>
                            <p><strong>Contract:</strong> ${contract.contractNumber}</p>
                            <p><strong>Event Date:</strong> ${new Date(contract.eventDate).toLocaleDateString('en-GB')}</p>
                            <p><strong>Event Time:</strong> ${contract.eventTime}</p>
                        </div>
                        <div>
                            <p><strong>Venue:</strong> ${contract.venue}</p>
                            <p><strong>Performance Fee:</strong> £${contract.fee}</p>
                            <p><strong>Today's Date:</strong> ${today}</p>
                        </div>
                    </div>
                </div>
                
                <form id="signatureForm">
                    <div class="form-group">
                        <label for="signatureName">Your Full Name (Digital Signature) *</label>
                        <input 
                            type="text" 
                            id="signatureName" 
                            name="signatureName" 
                            placeholder="Enter your full name as it appears on the contract"
                            value="${contract.clientName || ''}"
                            required
                        />
                    </div>
                    
                    <div class="form-group">
                        <label for="clientPhone">Phone Number (Optional)</label>
                        <input 
                            type="tel" 
                            id="clientPhone" 
                            name="clientPhone" 
                            placeholder="Your contact phone number"
                            value="${contract.clientPhone || ''}"
                        />
                    </div>
                    
                    <div class="form-group">
                        <label for="clientAddress">Your Address (Optional)</label>
                        <textarea 
                            id="clientAddress" 
                            name="clientAddress" 
                            rows="2" 
                            placeholder="Your full address"
                        >${contract.clientAddress || ''}</textarea>
                    </div>
                    
                    <div class="form-group">
                        <label for="venueAddress">Event Venue Address (Optional)</label>
                        <textarea 
                            id="venueAddress" 
                            name="venueAddress" 
                            rows="2" 
                            placeholder="Full address of the event venue"
                        >${contract.venueAddress || ''}</textarea>
                    </div>
                    
                    <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 20px 0;">
                        <p style="margin: 0; color: #92400e; font-size: 0.95rem;">
                            <strong>Legal Notice:</strong> By clicking "Sign Contract" below, you agree to all terms and conditions outlined in this performance contract. This constitutes a legally binding digital signature.
                        </p>
                    </div>
                    
                    <button type="submit" class="sign-btn" id="signButton">
                        ✍️ Sign Contract
                    </button>
                </form>
                
                <div class="loading" id="loadingMessage">
                    <p>⏳ Processing your signature...</p>
                </div>
                
                <div class="error" id="errorMessage"></div>
                <div class="success" id="successMessage"></div>
            </div>
            
            <div class="footer">
                <p>Secured by ${businessName} • Powered by MusoBuddy</p>
            </div>
        </div>

        <script>
            document.getElementById('signatureForm').addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const signButton = document.getElementById('signButton');
                const loadingMessage = document.getElementById('loadingMessage');
                const errorMessage = document.getElementById('errorMessage');
                const successMessage = document.getElementById('successMessage');
                
                // Reset states
                errorMessage.style.display = 'none';
                successMessage.style.display = 'none';
                signButton.disabled = true;
                loadingMessage.style.display = 'block';
                
                const formData = new FormData(e.target);
                const signatureData = {
                    signatureName: formData.get('signatureName'),
                    clientPhone: formData.get('clientPhone'),
                    clientAddress: formData.get('clientAddress'),
                    venueAddress: formData.get('venueAddress')
                };
                
                try {
                    const response = await fetch('/api/contracts/sign/${contract.id}', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(signatureData)
                    });
                    
                    const result = await response.json();
                    
                    if (response.ok && result.success) {
                        successMessage.textContent = result.message || 'Contract signed successfully!';
                        successMessage.style.display = 'block';
                        
                        // Hide form after successful signing
                        document.getElementById('signatureForm').style.display = 'none';
                        
                        // Show download option
                        setTimeout(() => {
                            const downloadBtn = document.createElement('a');
                            downloadBtn.href = '/api/contracts/${contract.id}/download';
                            downloadBtn.className = 'sign-btn';
                            downloadBtn.style.display = 'inline-block';
                            downloadBtn.style.textDecoration = 'none';
                            downloadBtn.innerHTML = '📄 Download Signed Contract';
                            successMessage.appendChild(document.createElement('br'));
                            successMessage.appendChild(downloadBtn);
                        }, 2000);
                        
                    } else if (result.alreadySigned) {
                        // Handle case where contract is already signed
                        errorMessage.textContent = 'This contract has already been signed. Please check your email for the signed copy.';
                        errorMessage.style.display = 'block';
                        document.getElementById('signatureForm').style.display = 'none';
                        
                        // Show download button for already signed contract
                        const downloadBtn = document.createElement('a');
                        downloadBtn.href = '/api/contracts/${contract.id}/download';
                        downloadBtn.className = 'sign-btn';
                        downloadBtn.style.display = 'inline-block';
                        downloadBtn.style.textDecoration = 'none';
                        downloadBtn.style.background = '#6b7280';
                        downloadBtn.innerHTML = '📄 Download Signed Contract';
                        errorMessage.appendChild(document.createElement('br'));
                        errorMessage.appendChild(downloadBtn);
                        
                    } else {
                        throw new Error(result.message || 'Failed to sign contract');
                    }
                    
                } catch (error) {
                    console.error('Signing error:', error);
                    errorMessage.textContent = error.message || 'An error occurred while signing the contract. Please try again.';
                    errorMessage.style.display = 'block';
                } finally {
                    loadingMessage.style.display = 'none';
                    signButton.disabled = false;
                }
            });
        </script>
    </body>
    </html>
  `;
}