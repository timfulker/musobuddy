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
    const { generateInvoicePDF } = await import('./invoice-pdf-generator');
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
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign Contract - ${contract.contractNumber}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; line-height: 1.6; background: #f5f5f5; }
        .header { text-align: center; margin-bottom: 30px; padding: 20px; background: #1e3a8a; color: white; border-radius: 8px; }
        .contract-details { background: white; padding: 25px; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .contract-details h4 { color: #1e3a8a; margin-top: 0; border-bottom: 2px solid #e9ecef; padding-bottom: 8px; }
        .signing-section { background: #e8f4fd; padding: 25px; border-radius: 8px; border: 2px solid #1e3a8a; }
        .btn { background: #1e3a8a; color: white; padding: 15px 30px; border: none; border-radius: 6px; cursor: pointer; font-size: 18px; font-weight: bold; }
        .btn:hover { background: #1e40af; transform: translateY(-1px); }
        .signature-pad { border: 2px dashed #1e3a8a; height: 150px; margin: 10px 0; background: white; border-radius: 4px; display: flex; align-items: center; justify-content: center; }
        input[type="text"] { padding: 12px; border: 2px solid #ddd; border-radius: 6px; font-size: 16px; }
        input[type="text"]:focus { border-color: #1e3a8a; outline: none; }
        .pdf-link { display: inline-block; margin: 10px 0; padding: 10px 15px; background: #6c757d; color: white; text-decoration: none; border-radius: 6px; }
        .pdf-link:hover { background: #5a6268; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Contract Signing</h1>
        <h2>${contract.contractNumber}</h2>
        <p>From: ${businessName}</p>
    </div>
    
    <div class="contract-details">
        <h3>Contract Details</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
            <div>
                <h4>Client Information</h4>
                <p><strong>Name:</strong> ${contract.clientName}</p>
                ${contract.clientEmail ? `<p><strong>Email:</strong> ${contract.clientEmail}</p>` : ''}
                ${contract.clientPhone ? `<p><strong>Phone:</strong> ${contract.clientPhone}</p>` : ''}
                ${contract.clientAddress ? `<p><strong>Address:</strong> ${contract.clientAddress}</p>` : ''}
            </div>
            <div>
                <h4>Event Information</h4>
                <p><strong>Date:</strong> ${new Date(contract.eventDate).toLocaleDateString()}</p>
                ${contract.eventTime ? `<p><strong>Time:</strong> ${contract.eventTime}</p>` : ''}
                ${contract.eventEndTime ? `<p><strong>End Time:</strong> ${contract.eventEndTime}</p>` : ''}
                <p><strong>Venue:</strong> ${contract.venue || 'TBD'}</p>
                ${contract.venueAddress ? `<p><strong>Venue Address:</strong> ${contract.venueAddress}</p>` : ''}
            </div>
        </div>
        
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <h4>Financial Terms</h4>
            <p><strong>Total Fee:</strong> £${contract.fee}</p>
            ${contract.deposit ? `<p><strong>Deposit Required:</strong> £${contract.deposit}</p>` : ''}
            ${contract.paymentInstructions ? `<p><strong>Payment Instructions:</strong> ${contract.paymentInstructions}</p>` : ''}
        </div>
        
        ${contract.equipmentRequirements || contract.specialRequirements ? `
        <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <h4>Requirements & Notes</h4>
            ${contract.equipmentRequirements ? `<p><strong>Equipment:</strong> ${contract.equipmentRequirements}</p>` : ''}
            ${contract.specialRequirements ? `<p><strong>Special Requirements:</strong> ${contract.specialRequirements}</p>` : ''}
        </div>
        ` : ''}
        
        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107;">
            <h4>Terms & Conditions</h4>
            <p><strong>Performer:</strong> ${businessName}</p>
            <p>By signing this contract, both parties agree to the terms outlined above. This contract is legally binding once signed by both parties.</p>
            <p><strong>Cancellation Policy:</strong> Any cancellations must be made in writing with reasonable notice.</p>
            <p><strong>Force Majeure:</strong> Neither party shall be liable for failure to perform due to circumstances beyond their control.</p>
        </div>
    </div>
    
    <div class="signing-section">
        <h3>Electronic Signature</h3>
        <p>Please review all contract details above carefully. By signing below, you agree to the terms and conditions of this contract.</p>
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