import { type Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { isAuthenticated, isAdmin } from "./auth";
import { mailgunService, cloudStorageService, contractParserService } from "./services";
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
        const userSettings = await storage.getSettings(req.user.id);
        const { url, key } = await cloudStorageService.uploadContractSigningPage(contract, userSettings);
        
        // Update contract with cloud storage info
        const updatedContract = await storage.updateContract(contract.id, {
          cloudStorageUrl: url,
          cloudStorageKey: key,
          signingUrlCreatedAt: new Date()
        });
        
        console.log('Contract created with cloud storage:', contract.id);
        console.log('Signing URL:', url);
        res.json(updatedContract);
      } catch (storageError) {
        console.error('Cloud storage error:', storageError);
        console.log('Contract created without cloud storage - using local signing');
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
        });
        
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
      });
      
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

  app.get('/api/contracts/public/:id', async (req, res) => {
    try {
      const contract = await storage.getContract(parseInt(req.params.id));
      if (!contract || contract.status === 'signed') {
        return res.json({ message: 'Contract not available for signing' });
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
                signature: signatureName,
                clientPhone: clientPhone || null,
                clientAddress: clientAddress || null,
                agreedToTerms: true,
                signedAt: new Date().toISOString(),
                ipAddress: 'Contract Signing Page'
            };
            
            // Disable form during submission
            const form = document.getElementById('signingForm');
            form.innerHTML = '<div style="text-align:center;padding:30px;"><h3>Processing signature...</h3></div>';
            
            fetch('https://musobuddy.replit.app/api/contracts/sign/${contract.id}', {
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
                } else {
                    throw new Error(data.error || 'Unknown error');
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

  // Handle preflight requests for contract signing
  app.options('/api/contracts/sign/:id', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.status(200).end();
  });

  app.post('/api/contracts/sign/:id', async (req, res) => {
    // Add CORS headers for R2 signing pages
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    
    console.log('🚨 CONTRACT SIGNING ENDPOINT CALLED! ID:', req.params.id);
    console.log('🚨 Request body:', JSON.stringify(req.body, null, 2));
    
    try {
      const contractId = parseInt(req.params.id);
      const { signature, clientPhone, clientAddress, agreedToTerms, signedAt, ipAddress } = req.body;
      
      console.log('📝 Contract signing request:', {
        contractId,
        signature,
        clientPhone: clientPhone || 'Not provided',
        clientAddress: clientAddress || 'Not provided',
        agreedToTerms
      });
      
      // Prepare update data
      const updateData: any = {
        status: 'signed',
        signedAt: new Date(signedAt || new Date()),
        clientSignature: signature
      };
      
      // Include optional client details if provided
      if (clientPhone && clientPhone.trim()) {
        updateData.clientPhone = clientPhone.trim();
      }
      if (clientAddress && clientAddress.trim()) {
        updateData.clientAddress = clientAddress.trim();
      }
      
      console.log('📝 Updating contract with data:', updateData);
      
      // Update contract status to signed
      const updatedContract = await storage.updateContract(contractId, updateData);
      
      // WEBHOOK: Automatically update related booking status
      if (updatedContract) {
        try {
          const webhookResult = await webhookService.handleContractSigned(contractId, updatedContract);
          console.log('🎯 Contract signing webhook result:', webhookResult);
        } catch (webhookError) {
          console.error('❌ Webhook notification failed:', webhookError);
          // Don't fail the contract signing if webhook fails
        }
      }
      
      // RESTORED ORIGINAL WORKING CONFIRMATION EMAIL SYSTEM
      console.log('🔥 CONTRACT SIGNING: Sending confirmation emails to both parties...');
      try {
        // Import the working sendEmail function from the original system
        const { sendEmail } = await import('./mailgun-email-restored');
        const userSettings = await storage.getSettings(updatedContract.userId);
        
        // Get email settings
        const fromName = userSettings?.businessName || userSettings?.emailFromName || 'MusoBuddy';
        const fromEmail = 'noreply@mg.musobuddy.com';
        const replyToEmail = userSettings?.emailAddress || userSettings?.businessEmail || null;
        const finalSignatureName = signature || updatedContract.clientName;
        const clientIP = ipAddress || 'Contract Signing Page';
        
        // Generate contract URLs for email links
        const contractViewUrl = `https://musobuddy.replit.app/api/contracts/public/${contractId}`;
        const contractDownloadUrl = `https://musobuddy.replit.app/api/contracts/${contractId}/download`;
        
        // EMAIL TO CLIENT: Confirmation with professional styling
        const clientEmailData: any = {
          to: updatedContract.clientEmail,
          from: `${fromName} <${fromEmail}>`,
          subject: `Contract ${updatedContract.contractNumber} - Signed Successfully ✓`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #4CAF50; margin-bottom: 20px;">Contract Signed Successfully ✓</h2>
              
              <p>Dear ${updatedContract.clientName},</p>
              <p>Your performance contract <strong>${updatedContract.contractNumber}</strong> has been successfully signed!</p>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #333;">Event Details</h3>
                <p><strong>Date:</strong> ${new Date(updatedContract.eventDate).toLocaleDateString('en-GB')}</p>
                <p><strong>Time:</strong> ${updatedContract.eventTime}</p>
                <p><strong>Venue:</strong> ${updatedContract.venue}</p>
                <p><strong>Fee:</strong> £${updatedContract.fee}</p>
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
          text: `Contract ${updatedContract.contractNumber} successfully signed by ${finalSignatureName.trim()}. Event: ${new Date(updatedContract.eventDate).toLocaleDateString('en-GB')} at ${updatedContract.venue}. View: ${contractViewUrl} Download: ${contractDownloadUrl}`
        };
        
        // Add reply-to if user has external email
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
        
        // EMAIL TO PERFORMER: Business owner notification with multiple fallback sources
        const performerEmail = userSettings?.businessEmail || 
                             userSettings?.email || 
                             userSettings?.emailAddress || 
                             'timfulker@gmail.com'; // Fallback to known email
        
        if (performerEmail) {
          const performerEmailData: any = {
            to: performerEmail,
            from: `${fromName} <${fromEmail}>`,
            subject: `Contract ${updatedContract.contractNumber} Signed by Client ✓`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #4CAF50; margin-bottom: 20px;">Contract Signed! ✓</h2>
                
                <p>Great news! Contract <strong>${updatedContract.contractNumber}</strong> has been signed by ${updatedContract.clientName}.</p>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #333;">Event Details</h3>
                  <p><strong>Date:</strong> ${new Date(updatedContract.eventDate).toLocaleDateString('en-GB')}</p>
                  <p><strong>Time:</strong> ${updatedContract.eventTime}</p>
                  <p><strong>Venue:</strong> ${updatedContract.venue}</p>
                  <p><strong>Fee:</strong> £${updatedContract.fee}</p>
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
            text: `Contract ${updatedContract.contractNumber} signed by ${finalSignatureName.trim()} on ${new Date().toLocaleString('en-GB')}. View: ${contractViewUrl} Download: ${contractDownloadUrl}`
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
          console.warn('⚠️ No performer email available - checked businessEmail, email, and emailAddress');
          console.warn('UserSettings:', userSettings);
        }
      } catch (emailError) {
        console.error("❌ CRITICAL ERROR: Failed to send confirmation emails:", emailError);
        console.error("Email error details:", {
          message: emailError?.message,
          stack: emailError?.stack,
          name: emailError?.name,
          status: emailError?.status,
          type: emailError?.type
        });
        // Don't fail the signing process if email fails
      }
      
      res.json({ success: true, contract: updatedContract });
    } catch (error) {
      console.error('Contract signing error:', error);
      res.status(500).json({ error: 'Failed to sign contract' });
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