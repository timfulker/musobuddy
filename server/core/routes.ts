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
      
      // CRITICAL: Upload signed contract to cloud storage and send confirmation emails
      try {
        const userSettings = await storage.getSettings(contract.userId);
        
        const { uploadContractToCloud } = await import('./cloud-storage');
        const cloudResult = await uploadContractToCloud(signedContract, userSettings, signatureDetails);
        
        if (cloudResult.success && cloudResult.url) {
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

  // Contract status check route for signing pages (PUBLIC)
  app.get('/api/contracts/:id/status', async (req, res) => {
    try {
      const contractId = parseInt(req.params.id);
      const contract = await storage.getContractById(contractId);
      
      if (!contract) {
        return res.status(404).json({ error: 'Contract not found' });
      }
      
      res.json({
        id: contract.id,
        status: contract.status,
        signedAt: contract.signedAt,
        clientName: contract.clientName
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to check contract status' });
    }
  });

  return server;
}

// Helper function to generate "already signed" page
function generateAlreadySignedPage(contract: any): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contract Already Signed</title>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      max-width: 600px; 
      margin: 50px auto; 
      padding: 20px; 
      text-align: center; 
      background: #f8f9fa;
    }
    .container { 
      background: white; 
      padding: 40px; 
      border-radius: 10px; 
      box-shadow: 0 4px 6px rgba(0,0,0,0.1); 
    }
    .success { color: #28a745; font-size: 48px; margin-bottom: 20px; }
    h1 { color: #333; margin-bottom: 20px; }
    p { color: #666; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="container">
    <div class="success">✅</div>
    <h1>Contract Already Signed</h1>
    <p>This contract has already been signed by <strong>${contract.clientName}</strong>.</p>
    <p>Signed on: ${new Date(contract.signedAt).toLocaleString()}</p>
    <p>Contract: ${contract.contractNumber}</p>
  </div>
</body>
</html>`;
}

// Helper function to generate contract signing page
function generateContractSigningPage(contract: any, userSettings: any): string {
  const businessName = userSettings?.businessName || 'MusoBuddy';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign Contract - ${contract.contractNumber}</title>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      max-width: 800px; 
      margin: 0 auto; 
      padding: 20px; 
      background: #f8f9fa;
    }
    .container { 
      background: white; 
      padding: 40px; 
      border-radius: 10px; 
      box-shadow: 0 4px 6px rgba(0,0,0,0.1); 
    }
    h1 { color: #333; text-align: center; }
    .form-group { margin: 20px 0; }
    label { display: block; margin-bottom: 5px; font-weight: bold; }
    input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
    button { 
      background: #007bff; 
      color: white; 
      padding: 12px 30px; 
      border: none; 
      border-radius: 5px; 
      cursor: pointer; 
      font-size: 16px;
    }
    button:hover { background: #0056b3; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Sign Contract: ${contract.contractNumber}</h1>
    <p><strong>Client:</strong> ${contract.clientName}</p>
    <p><strong>Event Date:</strong> ${new Date(contract.eventDate).toLocaleDateString()}</p>
    <p><strong>Venue:</strong> ${contract.venue}</p>
    <p><strong>Fee:</strong> £${contract.fee}</p>
    
    <form id="signingForm">
      <div class="form-group">
        <label for="signatureName">Full Name (Digital Signature) *</label>
        <input type="text" id="signatureName" name="signatureName" value="${contract.clientName}" required>
      </div>
      
      <div class="form-group">
        <label for="clientPhone">Phone Number</label>
        <input type="tel" id="clientPhone" name="clientPhone" value="${contract.clientPhone || ''}">
      </div>
      
      <button type="submit">Sign Contract</button>
    </form>
  </div>
  
  <script>
    document.getElementById('signingForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);
      
      try {
        const response = await fetch('/api/contracts/sign/${contract.id}', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
          alert('Contract signed successfully! Both parties have been notified.');
          location.reload();
        } else {
          alert(result.message || 'Error signing contract');
        }
      } catch (error) {
        alert('Error signing contract. Please try again.');
      }
    });
  </script>
</body>
</html>`;
}