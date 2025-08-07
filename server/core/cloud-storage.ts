// cloud-storage.ts - Fixed uploadInvoiceToCloud function

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { nanoid } from 'nanoid';
import type { Invoice, Contract, UserSettings } from '@shared/schema';

// Initialize R2 client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

export async function uploadInvoiceToCloud(
  invoice: Invoice,
  userSettings: UserSettings | null
): Promise<{ success: boolean; url?: string; key?: string; error?: string }> {
  try {
    console.log(`☁️ Uploading invoice #${invoice.id} to cloud storage...`);
    
    // Generate PDF using the dedicated invoice PDF generator
    const { generateInvoicePDF } = await import('./invoice-pdf-generator.js');
    const pdfBuffer = await generateInvoicePDF(invoice, userSettings);
    
    console.log(`📄 PDF generated, size: ${pdfBuffer.length} bytes`);
    
    // Create storage key with date folder structure and random token for security
    const invoiceDate = new Date(invoice.createdAt || new Date());
    const dateFolder = invoiceDate.toISOString().split('T')[0]; // 2025-08-04
    
    // Generate cryptographically secure random token to prevent URL guessing
    const securityToken = nanoid(16); // 16-character URL-safe random string
    const filename = `${invoice.invoiceNumber}-${securityToken}.pdf`;
    const storageKey = `invoices/${dateFolder}/${filename}`;
    
    console.log(`🔑 Storage key: ${storageKey}`);
    
    // Upload to R2
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME || 'musobuddy-storage',
      Key: storageKey,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
      ContentDisposition: `inline; filename="${filename}"`,
      Metadata: {
        'invoice-id': invoice.id.toString(),
        'invoice-number': invoice.invoiceNumber,
        'client-name': invoice.clientName || 'Unknown',
        'uploaded-at': new Date().toISOString()
      }
    });
    
    await r2Client.send(uploadCommand);
    
    console.log(`✅ Invoice PDF uploaded successfully to R2: ${storageKey}`);
    
    // Use direct Cloudflare R2 public URL (no expiration)
    const publicUrl = `https://pub-446248abf8164fb99bee2fc3dc3c513c.r2.dev/${storageKey}`;
    
    console.log(`🔗 Direct R2 public URL: ${publicUrl}`);
    
    return {
      success: true,
      url: publicUrl, // Direct public URL that never expires
      key: storageKey
    };
    
  } catch (error: any) {
    console.error('❌ Failed to upload invoice to cloud storage:', error);
    return {
      success: false,
      error: error.message || 'Upload failed'
    };
  }
}

// Alternative direct URL generation (if you prefer signed URLs)
export async function generateDirectInvoiceUrl(invoice: Invoice): Promise<string | null> {
  try {
    if (!invoice.cloudStorageKey) {
      return null;
    }
    
    // Generate signed URL for direct access
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    
    const getCommand = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME || 'musobuddy-storage',
      Key: invoice.cloudStorageKey,
    });
    
    const signedUrl = await getSignedUrl(r2Client, getCommand, { 
      expiresIn: 604800 // 7 days
    });
    
    return signedUrl;
    
  } catch (error: any) {
    console.error('❌ Failed to generate signed URL:', error);
    return null;
  }
}

// CONTRACT CLOUD STORAGE FUNCTIONS
export async function uploadContractToCloud(
  contract: Contract,
  userSettings: UserSettings | null,
  signatureDetails?: {
    signedAt: Date;
    signatureName: string;
    clientIpAddress: string;
  }
): Promise<{ success: boolean; url?: string; key?: string; error?: string }> {
  try {
    console.log(`☁️ Uploading contract #${contract.id} to cloud storage...`);
    
    // Generate PDF using the UNIFIED contract PDF generator with signature data
    console.log('📥 Importing UNIFIED contract PDF generator...');
    const { generateContractPDF } = await import('../unified-contract-pdf');
    console.log('📄 Generating contract PDF with UNIFIED generator...');
    const pdfBuffer = await generateContractPDF(contract, userSettings, signatureDetails);
    
    console.log(`📄 Contract PDF generated, size: ${pdfBuffer.length} bytes`);
    
    // Create storage key with date folder structure and random token for security
    const contractDate = new Date(contract.createdAt || new Date());
    const dateFolder = contractDate.toISOString().split('T')[0]; // 2025-08-04
    
    // Generate cryptographically secure random token to prevent URL guessing
    const securityToken = nanoid(16); // 16-character URL-safe random string
    const filename = `${contract.contractNumber.replace(/[^a-zA-Z0-9-]/g, '_')}-${securityToken}.pdf`;
    const storageKey = `contracts/${dateFolder}/${filename}`;
    
    console.log(`🔑 Contract storage key: ${storageKey}`);
    
    // Upload to R2
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME || 'musobuddy-storage',
      Key: storageKey,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
      ContentDisposition: `inline; filename="${filename}"`,
      Metadata: {
        'contract-id': contract.id.toString(),
        'contract-number': contract.contractNumber,
        'client-name': contract.clientName || 'Unknown',
        'uploaded-at': new Date().toISOString()
      }
    });
    
    await r2Client.send(uploadCommand);
    
    console.log(`✅ Contract PDF uploaded successfully to R2: ${storageKey}`);
    
    // Use direct Cloudflare R2 public URL (no expiration)
    const publicUrl = `https://pub-446248abf8164fb99bee2fc3dc3c513c.r2.dev/${storageKey}`;
    
    console.log(`🔗 Direct contract R2 public URL: ${publicUrl}`);
    
    return {
      success: true,
      url: publicUrl, // Direct public URL that never expires
      key: storageKey
    };
    
  } catch (error: any) {
    console.error('❌ Failed to upload contract to cloud storage:', error);
    return {
      success: false,
      error: error.message || 'Contract upload failed'
    };
  }
}

export async function uploadContractSigningPage(
  contract: Contract,
  userSettings: UserSettings | null
): Promise<{ success: boolean; url?: string; key?: string; error?: string }> {
  try {
    console.log(`☁️ Creating signing page for contract #${contract.id}...`);
    console.log(`📋 Contract data for signing page:`, {
      id: contract.id,
      clientPhone: contract.clientPhone,
      clientAddress: contract.clientAddress,
      venueAddress: contract.venueAddress,
      template: contract.template,
      setlist: contract.setlist?.substring(0, 50),
      riderNotes: contract.riderNotes?.substring(0, 50)
    });
    
    // Generate HTML signing page
    const signingPageHtml = generateContractSigningPage(contract, userSettings);
    
    // Create storage key for signing page
    const contractDate = new Date(contract.createdAt || new Date());
    const dateFolder = contractDate.toISOString().split('T')[0];
    const securityToken = nanoid(16);
    const contractNumber = contract.contractNumber || contract.contract_number || `contract-${contract.id}`;
    const filename = `${contractNumber.replace(/[^a-zA-Z0-9-]/g, '_')}-signing-${securityToken}.html`;
    const storageKey = `contract-signing/${dateFolder}/${filename}`;
    
    console.log(`🔑 Signing page storage key: ${storageKey}`);
    
    // Upload signing page to R2
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME || 'musobuddy-storage',
      Key: storageKey,
      Body: Buffer.from(signingPageHtml, 'utf-8'),
      ContentType: 'text/html',
      Metadata: {
        'contract-id': contract.id.toString(),
        'contract-number': contractNumber,
        'type': 'signing-page',
        'uploaded-at': new Date().toISOString()
      }
    });
    
    await r2Client.send(uploadCommand);
    
    const publicUrl = `https://pub-446248abf8164fb99bee2fc3dc3c513c.r2.dev/${storageKey}`;
    
    console.log(`✅ Contract signing page uploaded: ${publicUrl}`);
    
    return {
      success: true,
      url: publicUrl,
      key: storageKey
    };
    
  } catch (error: any) {
    console.error('❌ Failed to upload contract signing page:', error);
    return {
      success: false,
      error: error.message || 'Signing page upload failed'
    };
  }
}

// Generate HTML signing page for contracts
function generateContractSigningPage(contract: Contract, userSettings: UserSettings | null): string {
  const businessName = userSettings?.businessName || 'MusoBuddy';
  const templateName = contract.template || 'professional';
  
  console.log(`🎨 SIGNING PAGE: Using template "${templateName}" for contract #${contract.id}`);
  
  // Template-aware contract sections for signing page
  function generateContractSections(contract: any, userSettings: any) {
    const businessName = userSettings?.businessName || 'MusoBuddy';
    
    const isBasic = templateName === 'basic';
    
    if (isBasic) {
      // Basic template content
      return `
        <div class="info-grid">
          <div class="info-section">
            <h4>Event Details</h4>
            <p><strong>Client:</strong> ${contract.clientName}</p>
            <p><strong>Date:</strong> ${contract.eventDate}</p>
            <p><strong>Time:</strong> ${contract.eventTime}</p>
            <p><strong>Venue:</strong> ${contract.venue}</p>
          </div>
          <div class="info-section">
            <h4>Performer</h4>
            <p><strong>Name:</strong> ${businessName}</p>
            <p><strong>Fee:</strong> £${contract.fee}</p>
          </div>
        </div>
        ${contract.setlist ? `
        <div class="info-section" style="margin-top: 20px;">
          <h4>Setlist</h4>
          <div style="white-space: pre-wrap; font-family: monospace; background: #f8f9fa; padding: 10px; border-radius: 4px;">
${contract.setlist}
          </div>
        </div>
        ` : ''}
        
        ${contract.riderNotes ? `
        <div class="info-section" style="margin-top: 20px;">
          <h4>Rider & Requirements</h4>
          <div style="white-space: pre-wrap; background: #f8f9fa; padding: 10px; border-radius: 4px;">
${contract.riderNotes}
          </div>
        </div>
        ` : ''}
        
        <div class="terms-section" style="margin-top: 20px; max-height: 300px; overflow-y: auto;">
          <h4>Terms & Conditions</h4>
          <p><strong>1. Agreement:</strong> This is a legally binding performance contract. By signing, you agree to the performance date, time, venue, and fee as specified above.</p>
          <p><strong>2. Payment:</strong> ${contract.paymentInstructions || 'Payment due as agreed. Late payments may incur charges.'}</p>
          <p><strong>3. Cancellation:</strong> ${contract.cancellationPolicy || 'Cancellations must be made at least 48 hours in advance.'}</p>
          <p><strong>4. Equipment:</strong> ${contract.equipmentRequirements || 'Standard equipment provided by performer unless specified.'}</p>
          <p><strong>5. Liability:</strong> Both parties maintain appropriate insurance. Performer not liable for venue-related incidents.</p>
          ${contract.additionalTerms ? `<p><strong>6. Additional Terms:</strong> ${contract.additionalTerms}</p>` : ''}
        </div>
      `;
    } else {
      // Professional template content with detailed sections
      return `
        <div class="professional-header">
          <div class="parties-section">
            <div class="party-box performer-box">
              <h4>🎵 PERFORMER</h4>
              <div class="party-details">
                <strong>${businessName}</strong><br>
                ${userSettings?.businessEmail || ''}<br>
                ${userSettings?.businessPhone || ''}<br>
                ${userSettings?.businessAddress || ''}
              </div>
            </div>
            <div class="party-box client-box">
              <h4>👤 CLIENT</h4>
              <div class="party-details">
                <strong>${contract.clientName}</strong><br>
                ${contract.clientEmail || ''}<br>
                ${contract.clientPhone || ''}<br>
                ${contract.clientAddress || ''}
              </div>
            </div>
          </div>
        </div>
        
        <div class="performance-details">
          <h4>🎪 PERFORMANCE DETAILS</h4>
          <div class="detail-grid">
            <div><strong>Event Date:</strong> ${contract.eventDate}</div>
            <div><strong>Start Time:</strong> ${contract.eventTime || 'TBD'}</div>
            <div><strong>End Time:</strong> ${contract.eventEndTime || 'TBD'}</div>
            <div><strong>Venue:</strong> ${contract.venue}</div>
            <div><strong>Venue Address:</strong> ${contract.venueAddress || 'See above'}</div>
            <div><strong>Performance Fee:</strong> £${contract.fee}</div>
            ${contract.deposit && contract.deposit !== '0.00' ? `<div><strong>Deposit:</strong> £${contract.deposit}</div>` : ''}
            ${contract.travelExpenses && contract.travelExpenses !== '0.00' ? `<div><strong>Travel Expenses:</strong> £${contract.travelExpenses}</div>` : ''}
          </div>
        </div>
        
        ${contract.setlist ? `
        <div class="performance-details" style="margin-top: 20px;">
          <h4>🎵 SETLIST</h4>
          <div style="white-space: pre-wrap; font-family: monospace; background: white; padding: 15px; border-radius: 8px;">
${contract.setlist}
          </div>
        </div>
        ` : ''}
        
        ${contract.riderNotes ? `
        <div class="performance-details" style="margin-top: 20px;">
          <h4>📝 RIDER & TECHNICAL REQUIREMENTS</h4>
          <div style="white-space: pre-wrap; background: white; padding: 15px; border-radius: 8px;">
${contract.riderNotes}
          </div>
        </div>
        ` : ''}
        
        <div class="terms-section professional-terms" style="max-height: 400px; overflow-y: auto;">
          <h4>📋 TERMS & CONDITIONS</h4>
          <div class="terms-grid">
            <div class="term-item">
              <strong>1. Payment Terms:</strong>
              <p>${contract.paymentInstructions || 'Payment due as per agreement. Late payments may incur additional charges.'}</p>
            </div>
            <div class="term-item">
              <strong>2. Cancellation Policy:</strong>
              <p>${contract.cancellationPolicy || 'Cancellations must be made at least 48 hours in advance. Late cancellations may be subject to charges.'}</p>
            </div>
            <div class="term-item">
              <strong>3. Equipment Requirements:</strong>
              <p>${contract.equipmentRequirements || 'Standard performance equipment will be provided by performer unless otherwise specified.'}</p>
            </div>
            <div class="term-item">
              <strong>4. Special Requirements:</strong>
              <p>${contract.specialRequirements || 'No special requirements specified.'}</p>
            </div>
            <div class="term-item">
              <strong>5. Performance Standards:</strong>
              <p>The performer agrees to deliver a professional performance to industry standards.</p>
            </div>
            <div class="term-item">
              <strong>6. Liability & Insurance:</strong>
              <p>Both parties maintain appropriate insurance coverage. Performer not liable for venue-related incidents.</p>
            </div>
            <div class="term-item">
              <strong>7. Force Majeure:</strong>
              <p>Neither party shall be liable for failure to perform due to circumstances beyond reasonable control including but not limited to acts of God, natural disasters, war, or government regulations.</p>
            </div>
            <div class="term-item">
              <strong>8. Governing Law:</strong>
              <p>This contract shall be governed by and construed in accordance with the laws of England and Wales.</p>
            </div>
            ${contract.additionalTerms ? `
            <div class="term-item" style="grid-column: 1 / -1;">
              <strong>9. Additional Terms:</strong>
              <p>${contract.additionalTerms}</p>
            </div>
            ` : ''}
          </div>
        </div>
      `;
    }
  }
  
  const templateStyles = templateName === 'basic' ? `
    /* Basic Template Styles */
    .header { background: #8b5cf6; }
    .signing-section { background: #f3f4f6; border-color: #8b5cf6; }
    .btn { background: #8b5cf6; }
    .btn:hover { background: #7c3aed; }
    .contract-section h4 { color: #8b5cf6; }
    .signature-pad { border-color: #8b5cf6; }
    input[type="text"]:focus { border-color: #8b5cf6; }
  ` : `
    /* Professional Template Styles */
    .professional-header { margin-bottom: 30px; }
    .parties-section { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; }
    .party-box { background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border: 2px solid #3b82f6; border-radius: 12px; padding: 20px; }
    .party-box h4 { margin: 0 0 15px 0; font-size: 16px; color: #3b82f6; font-weight: bold; }
    .party-details { font-size: 14px; line-height: 1.6; }
    .performance-details { background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 25px; }
    .performance-details h4 { color: #3b82f6; margin-top: 0; font-size: 18px; }
    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
    .detail-grid > div { padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
    .professional-terms { background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; }
    .professional-terms h4 { color: #3b82f6; margin-top: 0; font-size: 18px; }
    .terms-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .term-item { background: white; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
    .term-item strong { color: #1e40af; font-size: 14px; }
    .term-item p { margin: 8px 0 0 0; font-size: 13px; line-height: 1.5; }
  `;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign Contract - ${contract.contractNumber}</title>
    <style>
        body { font-family: 'Inter', Arial, sans-serif; margin: 0; padding: 0; line-height: 1.6; background: #f5f5f5; height: 100vh; display: flex; flex-direction: column; }
        .header { text-align: center; padding: 15px; background: #1e3a8a; color: white; flex-shrink: 0; }
        .main-container { display: flex; flex: 1; gap: 20px; padding: 20px; max-height: calc(100vh - 120px); }
        .contract-section { flex: 2; background: white; border-radius: 8px; padding: 20px; overflow-y: auto; box-shadow: 0 2px 4px rgba(0,0,0,0.1); max-height: calc(100vh - 160px); }
        .signing-section { flex: 1; background: #e8f4fd; padding: 25px; border-radius: 8px; border: 2px solid #1e3a8a; height: fit-content; min-width: 350px; max-height: calc(100vh - 160px); overflow-y: auto; }
        .contract-section h4 { color: #1e3a8a; margin-top: 20px; margin-bottom: 15px; border-bottom: 2px solid #e9ecef; padding-bottom: 8px; }
        .contract-section h4:first-child { margin-top: 0; }
        .btn { background: #1e3a8a; color: white; padding: 15px 30px; border: none; border-radius: 6px; cursor: pointer; font-size: 18px; font-weight: bold; width: 100%; }
        .btn:hover { background: #1e40af; transform: translateY(-1px); }
        .signature-pad { border: 2px dashed #1e3a8a; height: 120px; margin: 10px 0; background: white; border-radius: 4px; display: flex; align-items: center; justify-content: center; }
        input[type="text"] { padding: 12px; border: 2px solid #ddd; border-radius: 6px; font-size: 16px; width: 100%; box-sizing: border-box; }
        input[type="text"]:focus { border-color: #1e3a8a; outline: none; }
        .pdf-link { display: inline-block; margin: 10px 0; padding: 10px 15px; background: #6c757d; color: white; text-decoration: none; border-radius: 6px; width: 100%; text-align: center; box-sizing: border-box; }
        .pdf-link:hover { background: #5a6268; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
        .info-section { background: #f8f9fa; padding: 15px; border-radius: 8px; }
        ${templateStyles}
        .terms-section { background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin-top: 20px; }
        @media (max-width: 768px) {
            .main-container { flex-direction: column; }
            .info-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Contract Signing - ${contract.contractNumber}</h1>
        <p>From: ${businessName}</p>
    </div>
    
    <div class="main-container">
        <div class="contract-section">
            <h3 style="margin-top: 0; color: #1e3a8a; border-bottom: 3px solid #1e3a8a; padding-bottom: 10px;">Full Contract Details</h3>
            ${generateContractSections(contract, userSettings)}
        
        <div class="signing-section">
            <h3>Sign Contract</h3>
            <p>Please review the contract details and agree to the terms by signing below.</p>
            
            ${contract.status === 'signed' ? `<a href="${contract.cloudStorageUrl || 'https://pub-446248abf8164fb99bee2fc3dc3c513c.r2.dev/contracts/' + contract.contractNumber.replace(/[^a-zA-Z0-9-]/g, '_') + '.pdf'}" target="_blank" class="pdf-link">📄 View Signed Contract PDF</a>` : ''}
        
        <form id="signingForm">
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h4>Client Information</h4>
                <p style="font-size: 0.9rem; color: #666; margin-bottom: 15px;">Fields marked with a blue border must be completed before signing</p>
                
                <label for="clientName">Full Name:</label>
                <input type="text" id="clientName" name="clientName" value="${contract.clientName || ''}" required style="width: 100%; padding: 12px; margin: 10px 0; border: 2px solid #ddd; border-radius: 6px;">
                
                <label for="clientPhone" style="color: #2563eb;">Phone Number (Required):</label>
                <input type="tel" id="clientPhone" name="clientPhone" value="${contract.clientPhone || ''}" placeholder="e.g., 07123 456789" required style="width: 100%; padding: 12px; margin: 10px 0; border: 2px solid #2563eb; border-radius: 6px; background-color: #eff6ff;">
                
                <label for="clientAddress" style="color: #2563eb;">Address (Required):</label>
                <textarea id="clientAddress" name="clientAddress" rows="3" placeholder="e.g., 123 Main Street, London, SW1A 1AA" required style="width: 100%; padding: 12px; margin: 10px 0; border: 2px solid #2563eb; border-radius: 6px; background-color: #eff6ff; resize: vertical;">${contract.clientAddress || ''}</textarea>
                
                <label for="venueAddress" style="color: #2563eb;">Venue Address (Required):</label>
                <textarea id="venueAddress" name="venueAddress" rows="3" placeholder="e.g., The Grand Hotel, 456 Event Street, London, EC1A 1BB" required style="width: 100%; padding: 12px; margin: 10px 0; border: 2px solid #2563eb; border-radius: 6px; background-color: #eff6ff; resize: vertical;">${contract.venueAddress || ''}</textarea>
            </div>
            
            <input type="hidden" id="clientSignature" name="clientSignature">
            <input type="hidden" name="clientIP" id="clientIP" value="0.0.0.0">
            
            <button type="submit" class="btn" style="background: #2563eb;">Sign Contract</button>
        </form>
    </div>
    
    <script>
        var contractSigned = false;
        
        // CRITICAL FIX: Detect API URL based on current domain
        function getApiUrl() {
            var currentHost = window.location.hostname;
            
            console.log('🔍 CORS-FIXED: Current hostname:', currentHost);
            
            // Always use the full URL with the correct Replit domain
            var replitDomain = 'https://f19aba74-886b-4308-a2de-cc9ba5e94af8-00-2ux7uy3ch9t9f.janeway.replit.dev';
            var apiUrl = replitDomain + '/api/contracts/sign/${contract.id}';
            console.log('🔍 CORS-FIXED: Using API URL:', apiUrl);
            return apiUrl;
        }
        
        // Enhanced signature validation function (no signature pad needed)
        function validateSignature() {
            var clientNameValue = document.getElementById('clientName').value.trim();
            if (!clientNameValue) {
                alert('Please enter your full name');
                document.getElementById('clientName').focus();
                return false;
            }
            
            if (clientNameValue.length < 2) {
                alert('Please enter your full name (at least 2 characters)');
                document.getElementById('clientName').focus();
                return false;
            }
            
            // Set signature data
            document.getElementById('clientSignature').value = clientNameValue;
            console.log('✅ CORS-FIXED: Signature validated for:', clientNameValue);
            return true;
        }
        
        // CRITICAL FIX: Enhanced form submission with proper CORS handling
        function handleSign(event) {
            event.preventDefault(); // Prevent traditional form submission
            
            if (contractSigned) {
                console.log('⚠️ CORS-FIXED: Contract already signed, preventing double submission');
                return false;
            }
            
            // Validation
            var clientNameValue = document.getElementById('clientName').value.trim();
            var phoneValue = document.getElementById('clientPhone').value.trim();
            var addressValue = document.getElementById('clientAddress').value.trim();
            var venueAddressValue = document.getElementById('venueAddress').value.trim();
            
            if (!validateSignature()) {
                return false;
            }
            
            // Check required fields (those marked with blue borders)
            var requiredFields = [];
            if (!phoneValue && document.getElementById('clientPhone').hasAttribute('required')) requiredFields.push('Phone Number');
            if (!addressValue && document.getElementById('clientAddress').hasAttribute('required')) requiredFields.push('Address');
            if (!venueAddressValue && document.getElementById('venueAddress').hasAttribute('required')) requiredFields.push('Venue Address');
            
            if (requiredFields.length > 0) {
                alert('Please complete the following required fields: ' + requiredFields.join(', '));
                return false;
            }
            
            // Show loading state
            var submitBtn = document.querySelector('.btn');
            var originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Signing Contract...';
            submitBtn.style.background = '#6b7280';
            
            // Get real IP address or use fallback
            var ipInput = document.querySelector('input[name="clientIP"]');
            var clientIP = ipInput ? ipInput.value : '127.0.0.1';
            
            // Prepare request data
            var requestData = {
                clientSignature: clientNameValue,
                clientIP: clientIP,
                clientPhone: phoneValue || undefined,
                clientAddress: addressValue || undefined,
                venueAddress: venueAddressValue || undefined
            };
            
            var apiUrl = getApiUrl();
            console.log('📡 CORS-FIXED: Sending signing request to:', apiUrl);
            
            // CRITICAL FIX: Enhanced fetch with proper CORS configuration using promises
            fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Cache-Control': 'no-cache',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    mode: 'cors', // Enable CORS
                    credentials: 'omit', // Don't send credentials for cross-origin signing
                    body: JSON.stringify(requestData)
                }).then(function(response) {
                    console.log('📡 CORS-FIXED: Response status:', response.status);
                    
                    if (!response.ok) {
                        console.error('❌ CORS-FIXED: Response not OK:', response.status, response.statusText);
                        throw new Error('Server error: ' + response.status + ' ' + response.statusText);
                    }
                    
                    return response.json();
                }).then(function(result) {
                console.log('✅ CORS-FIXED: Success response:', result);
                
                if (result.success) {
                    // SUCCESS: Contract signed successfully
                    console.log('✅ Contract signed successfully');
                    
                    // Update signature box with success
                    var signatureBox = document.getElementById('signature-box');
                    if (signatureBox) {
                        signatureBox.innerHTML = '✓ Signed by: ' + clientNameValue;
                        signatureBox.style.color = '#10b981';
                        signatureBox.style.textAlign = 'center';
                        signatureBox.style.fontWeight = 'bold';
                        signatureBox.style.border = '2px dashed #10b981';
                        signatureBox.style.background = '#f0fdf4';
                    }
                    
                    contractSigned = true;
                    submitBtn.textContent = 'Contract Signed ✓';
                    submitBtn.style.background = '#10b981';
                    
                    // CRITICAL: Add PDF download button after successful signing
                    console.log('🔍 DEBUG: Checking for PDF button creation. cloudUrl:', result.cloudUrl);
                    var signingSection = document.querySelector('.signing-section');
                    console.log('🔍 DEBUG: Signing section found:', !!signingSection);
                    
                    if (signingSection) {
                        var pdfButton = document.createElement('a');
                        pdfButton.href = result.cloudUrl || '#';
                        pdfButton.target = '_blank';
                        pdfButton.className = 'pdf-link';
                        pdfButton.innerHTML = '📄 View Signed Contract PDF';
                        pdfButton.style.marginTop = '20px';
                        pdfButton.style.display = 'block';
                        
                        // Insert PDF button before the form
                        var form = document.getElementById('signingForm');
                        if (form) {
                            signingSection.insertBefore(pdfButton, form);
                            console.log('✅ PDF download button added successfully');
                        } else {
                            signingSection.appendChild(pdfButton);
                            console.log('✅ PDF download button appended to signing section');
                        }
                    } else {
                        console.error('❌ Could not find signing section for PDF button');
                    }
                    
                    // Show success message
                    alert('✅ Contract Successfully Signed!\\n\\nYour contract has been digitally signed and confirmation emails have been sent to both parties.\\n\\nThank you for your business!');
                    
                    // Optional: Redirect or update UI further
                    if (result.cloudUrl) {
                        console.log('📄 CORS-FIXED: Signed contract available at:', result.cloudUrl);
                    }
                    
                } else if (result.alreadySigned) {
                    // ALREADY SIGNED: Show polite message instead of error
                    console.log('ℹ️ Contract already signed - showing polite message');
                    
                    // Update signature box with already signed message
                    var signatureBox = document.getElementById('signature-box');
                    if (signatureBox) {
                        signatureBox.innerHTML = '✓ Contract Already Signed';
                        signatureBox.style.color = '#0891b2';
                        signatureBox.style.textAlign = 'center';
                        signatureBox.style.fontWeight = 'bold';
                        signatureBox.style.border = '2px dashed #0891b2';
                        signatureBox.style.background = '#f0f9ff';
                    }
                    
                    // Update submit button with already signed message
                    submitBtn.textContent = 'Already Signed ✓';
                    submitBtn.style.background = '#0891b2';
                    submitBtn.disabled = true;
                    
                    // Show polite message
                    alert(result.message || 'This contract has already been signed.\\n\\nThank you for your confirmation!');
                    
                } else {
                    // ERROR: Show error message
                    throw new Error(result.error || 'Contract signing failed');
                }
            }).catch(function(error) {
                console.error('Error during contract signing:', error);
                
                // Reset button state
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                submitBtn.style.background = '';
                
                alert('Error: ' + error.message + ' Please try again.');
            });
            
            return false; // Always prevent traditional form submission
        }
        
        // No signature pad needed - simplified signing process
        
        // Enhanced form validation with real-time feedback
        function setupFormValidation() {
            var requiredFields = document.querySelectorAll('input[required], textarea[required]');
            
            requiredFields.forEach(field => {
                field.addEventListener('blur', function() {
                    if (this.value.trim()) {
                        this.style.borderColor = '#10b981'; // Green for completed
                        this.style.backgroundColor = '#ecfdf5';
                    } else {
                        this.style.borderColor = '#ef4444'; // Red for missing
                        this.style.backgroundColor = '#fef2f2';
                    }
                });
                
                field.addEventListener('input', function() {
                    if (this.value.trim()) {
                        this.style.borderColor = '#10b981';
                        this.style.backgroundColor = '#ecfdf5';
                    } else {
                        this.style.borderColor = '#2563eb'; // Back to blue for required
                        this.style.backgroundColor = '#eff6ff';
                    }
                });
            });
        }
        
        // Initialize page
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🔥 CORS-FIXED: Contract signing page loaded with enhanced JavaScript');
            console.log('🔥 CORS-FIXED: Current URL:', window.location.href);
            console.log('🔥 CORS-FIXED: Expected API URL:', getApiUrl());
            
            // Check if required fields are present
            console.log('📋 Field check:', {
                hasPhoneField: !!document.getElementById('clientPhone'),
                hasAddressField: !!document.getElementById('clientAddress'),
                hasVenueAddressField: !!document.getElementById('venueAddress'),
                phoneRequired: document.getElementById('clientPhone')?.hasAttribute('required'),
                addressRequired: document.getElementById('clientAddress')?.hasAttribute('required'),
                venueRequired: document.getElementById('venueAddress')?.hasAttribute('required')
            });
            
            setupFormValidation();
            
            // Set up form submission handler
            var form = document.getElementById('signingForm');
            if (form) {
                console.log('✅ Form found, adding submit handler');
                form.addEventListener('submit', handleSign);
            } else {
                console.error('❌ Form not found!');
            
            // Pre-populate client IP (optional)
            fetch('https://api.ipify.org?format=json')
                .then(function(response) { return response.json(); })
                .then(function(data) {
                    var ipInput = document.querySelector('input[name="clientIP"]');
                    if (ipInput && data.ip) {
                        ipInput.value = data.ip;
                        console.log('🔍 CORS-FIXED: Client IP detected:', data.ip);
                    }
                })
                .catch(function(error) {
                    console.log('⚠️ CORS-FIXED: Could not detect client IP:', error);
                });
        });
    </script>
</body>
</html>
  `;
}

// Utility to check if cloud storage is properly configured
export function isCloudStorageConfigured(): boolean {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME
  );
}