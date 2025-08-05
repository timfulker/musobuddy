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
  userSettings: UserSettings | null
): Promise<{ success: boolean; url?: string; key?: string; error?: string }> {
  try {
    console.log(`☁️ Uploading contract #${contract.id} to cloud storage...`);
    
    // Generate PDF using the working contract PDF generator
    const { generateWorkingContractPDF } = await import('../working-contract-pdf');
    const pdfBuffer = await generateWorkingContractPDF(contract, userSettings);
    
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
    
    // Generate HTML signing page
    const signingPageHtml = generateContractSigningPage(contract, userSettings);
    
    // Create storage key for signing page
    const contractDate = new Date(contract.createdAt || new Date());
    const dateFolder = contractDate.toISOString().split('T')[0];
    const securityToken = nanoid(16);
    const filename = `${contract.contractNumber.replace(/[^a-zA-Z0-9-]/g, '_')}-signing-${securityToken}.html`;
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
        'contract-number': contract.contractNumber,
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
        <div class="terms-section">
          <h4>Terms & Conditions</h4>
          <p>This is a legally binding performance contract. By signing, you agree to the performance date, time, venue, and fee as specified above.</p>
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
          </div>
        </div>
        
        <div class="terms-section professional-terms">
          <h4>📋 TERMS & CONDITIONS</h4>
          <div class="terms-grid">
            <div class="term-item">
              <strong>1. Payment Terms:</strong>
              <p>${contract.paymentInstructions || 'Payment due as per agreement. Late payments may incur additional charges.'}</p>
            </div>
            <div class="term-item">
              <strong>2. Cancellation Policy:</strong>
              <p>Cancellations must be made at least 48 hours in advance. Late cancellations may be subject to charges.</p>
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
        .contract-section { flex: 2; background: white; border-radius: 8px; padding: 20px; overflow-y: auto; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .signing-section { flex: 1; background: #e8f4fd; padding: 25px; border-radius: 8px; border: 2px solid #1e3a8a; height: fit-content; min-width: 350px; }
        .contract-section h4 { color: #1e3a8a; margin-top: 0; border-bottom: 2px solid #e9ecef; padding-bottom: 8px; }
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
            <h3>Contract Details</h3>
            ${generateContractSections(contract, userSettings)}
        </div>
        
        <div class="signing-section">
            <h3>Electronic Signature</h3>
            <p>Please review the contract details and agree to the terms by signing below.</p>
            
            <a href="${contract.cloudStorageUrl || `https://pub-446248abf8164fb99bee2fc3dc3c513c.r2.dev/contracts/${contract.contractNumber.replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`}" target="_blank" class="pdf-link">📄 View Full Contract PDF</a>
        
        <form id="signingForm" action="https://f19aba74-886b-4308-a2de-cc9ba5e94af8-00-2ux7uy3ch9t9f.janeway.replit.dev/api/contracts/sign/${contract.id}" method="POST">
            <label for="clientName">Full Name:</label>
            <input type="text" id="clientName" name="clientName" required style="width: 100%; padding: 8px; margin: 10px 0;">
            
            <label for="signature">Digital Signature:</label>
            <div class="signature-pad" id="signaturePad">
                <p style="text-align: center; color: #666; margin-top: 60px;">Click here to sign</p>
            </div>
            <input type="hidden" id="clientSignature" name="clientSignature">
            <input type="hidden" name="clientIP" value="0.0.0.0">
            
            <button type="submit" class="btn">Sign Contract</button>
        </form>
    </div>
    
    <script>
        let signatureCaptured = false;
        let isSubmitting = false;
        
        // Signature pad click handler
        document.getElementById('signaturePad').onclick = function() {
            const name = document.getElementById('clientName').value;
            if (!name.trim()) {
                alert('Please enter your full name first');
                return;
            }
            
            // Simple signature capture - mark as signed
            signatureCaptured = true;
            this.innerHTML = '<p style="text-align: center; color: #28a745; margin-top: 50px;">✓ Signed by: ' + name + '</p>';
            this.style.borderColor = '#28a745';
            this.style.background = '#f8fff9';
            
            // Set signature data
            document.getElementById('clientSignature').value = 'Digital signature: ' + name + ' - ' + new Date().toISOString();
        };
        
        // Form submission handler
        document.getElementById('signingForm').onsubmit = function(e) {
            e.preventDefault();
            
            if (isSubmitting) {
                return false;
            }
            
            const name = document.getElementById('clientName').value;
            if (!name.trim()) {
                alert('Please enter your full name');
                return false;
            }
            
            if (!signatureCaptured) {
                alert('Please click in the signature box to sign the contract');
                return false;
            }
            
            // Disable submit button and show loading
            isSubmitting = true;
            const submitBtn = document.querySelector('.btn');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Signing Contract...';
            submitBtn.style.background = '#6c757d';
            
            // Submit the form
            this.submit();
        };
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