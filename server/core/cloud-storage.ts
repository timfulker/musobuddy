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
    
    // Generate PDF using the dedicated contract PDF generator
    const { generateContractPDF } = await import('./contract-pdf-generator');
    const pdfBuffer = await generateContractPDF(contract, userSettings);
    
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
  
  // Simple contract sections for signing page
  function generateContractSections(contract: any, userSettings: any) {
    const businessName = userSettings?.businessName || 'MusoBuddy';
    
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
  }
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign Contract - ${contract.contractNumber}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; line-height: 1.6; background: #f5f5f5; height: 100vh; display: flex; flex-direction: column; }
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
            
            <a href="/api/contracts/${contract.id}/pdf" target="_blank" class="pdf-link">📄 View Full Contract PDF</a>
        
        <form id="signingForm" action="/api/contracts/sign/${contract.id}" method="POST">
            <label for="clientName">Full Name:</label>
            <input type="text" id="clientName" name="clientName" required style="width: 100%; padding: 8px; margin: 10px 0;">
            
            <label for="signature">Digital Signature:</label>
            <div class="signature-pad" id="signaturePad">
                <p style="text-align: center; color: #666; margin-top: 60px;">Click here to sign</p>
            </div>
            <input type="hidden" id="signatureData" name="signatureData">
            
            <button type="submit" class="btn">Sign Contract</button>
        </form>
    </div>
    
    <script>
        // Simple signature capture (you could enhance with a proper signature library)
        document.getElementById('signingForm').onsubmit = function(e) {
            const name = document.getElementById('clientName').value;
            if (!name.trim()) {
                alert('Please enter your full name');
                e.preventDefault();
                return false;
            }
            
            // Set signature data (simplified - in production you'd capture actual signature)
            document.getElementById('signatureData').value = 'Digital signature: ' + name + ' - ' + new Date().toISOString();
            return true;
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