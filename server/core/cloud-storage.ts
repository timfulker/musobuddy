// cloud-storage.ts - Fixed uploadInvoiceToCloud function

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import type { Invoice, UserSettings, Contract } from '@shared/schema';

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
    
    // Generate PDF using the existing PDF generator
    const { generateInvoicePDF } = await import('./pdf-generator');
    const pdfBuffer = await generateInvoicePDF(invoice, userSettings);
    
    console.log(`📄 PDF generated, size: ${pdfBuffer.length} bytes`);
    
    // Create storage key with date folder structure
    const invoiceDate = new Date(invoice.createdAt || new Date());
    const dateFolder = invoiceDate.toISOString().split('T')[0]; // 2025-08-04
    const filename = `${invoice.invoiceNumber}.pdf`;
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

export async function uploadContractToCloud(
  contract: Contract,
  userSettings: UserSettings | null,
  signatureDetails?: { signedAt: Date; signatureName?: string; clientIpAddress?: string }
): Promise<{ success: boolean; url?: string; key?: string; error?: string }> {
  try {
    console.log(`☁️ Uploading contract #${contract.id} to cloud storage...`);
    
    // Generate PDF using the existing PDF generator
    const { generateContractPDF } = await import('./pdf-generator');
    const pdfBuffer = await generateContractPDF(contract, userSettings, signatureDetails);
    
    console.log(`📄 Contract PDF generated, size: ${pdfBuffer.length} bytes`);
    
    // Create storage key with date folder structure
    const contractDate = new Date(contract.createdAt || new Date());
    const dateFolder = contractDate.toISOString().split('T')[0]; // 2025-08-04
    const filename = `${contract.contractNumber?.replace(/[^a-zA-Z0-9-_]/g, '-') || contract.id}.pdf`;
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
        'contract-number': contract.contractNumber || 'Unknown',
        'client-name': contract.clientName || 'Unknown',
        'uploaded-at': new Date().toISOString(),
        'signed': signatureDetails ? 'true' : 'false'
      }
    });
    
    await r2Client.send(uploadCommand);
    
    console.log(`✅ Contract PDF uploaded successfully to R2: ${storageKey}`);
    
    // Use direct Cloudflare R2 public URL (no expiration)
    const publicUrl = `https://pub-446248abf8164fb99bee2fc3dc3c513c.r2.dev/${storageKey}`;
    
    console.log(`🔗 Direct R2 public URL: ${publicUrl}`);
    
    return {
      success: true,
      url: publicUrl, // Direct public URL that never expires
      key: storageKey
    };
    
  } catch (error: any) {
    console.error('❌ Failed to upload contract to cloud storage:', error);
    return {
      success: false,
      error: error.message || 'Upload failed'
    };
  }
}

export async function uploadContractSigningPage(
  contract: Contract,
  userSettings: UserSettings | null
): Promise<{ success: boolean; url?: string; storageKey?: string; error?: string }> {
  try {
    console.log(`📝 Creating signing page for contract #${contract.id}...`);
    
    // Generate contract signing page HTML
    const signingPageHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Contract Signing - ${contract.contractNumber}</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .contract-info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .signing-form { border: 2px solid #e9ecef; padding: 30px; border-radius: 8px; }
        .signature-field { margin: 20px 0; }
        .signature-field input { width: 100%; padding: 10px; font-size: 16px; border: 1px solid #ccc; border-radius: 4px; }
        .submit-btn { background: #28a745; color: white; padding: 15px 30px; border: none; border-radius: 4px; font-size: 16px; cursor: pointer; width: 100%; }
        .submit-btn:hover { background: #218838; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Contract Signing</h1>
        <h2>${contract.contractNumber}</h2>
    </div>
    
    <div class="contract-info">
        <h3>Contract Details</h3>
        <p><strong>Client:</strong> ${contract.clientName}</p>
        <p><strong>Event Date:</strong> ${contract.eventDate}</p>
        <p><strong>Event Time:</strong> ${contract.eventTime || 'TBC'}</p>
        <p><strong>Fee:</strong> £${contract.fee}</p>
        <p><strong>Venue:</strong> ${contract.eventVenue || 'TBC'}</p>
    </div>
    
    <div class="signing-form">
        <h3>Digital Signature</h3>
        <form action="/api/contracts/${contract.id}/sign" method="POST">
            <div class="signature-field">
                <label for="clientSignature">Full Name (Digital Signature):</label>
                <input type="text" id="clientSignature" name="clientSignature" required 
                       placeholder="Type your full name to sign digitally">
            </div>
            <div class="signature-field">
                <label for="clientEmail">Email Address:</label>
                <input type="email" id="clientEmail" name="clientEmail" 
                       placeholder="your@email.com" value="${contract.clientEmail || ''}">
            </div>
            <div class="signature-field">
                <label for="clientPhone">Phone Number:</label>
                <input type="tel" id="clientPhone" name="clientPhone" 
                       placeholder="+44 7xxx xxx xxx" value="${contract.clientPhone || ''}">
            </div>
            <button type="submit" class="submit-btn">
                ✍️ Sign Contract Digitally
            </button>
        </form>
    </div>
    
    <p style="text-align: center; margin-top: 30px; color: #666; font-size: 14px;">
        By signing this contract, you agree to the terms and conditions outlined above.
        <br>This signature is legally binding and equivalent to a handwritten signature.
    </p>
</body>
</html>`;
    
    // Create storage key for signing page
    const contractDate = new Date(contract.createdAt || new Date());
    const dateFolder = contractDate.toISOString().split('T')[0];
    const filename = `${contract.contractNumber?.replace(/[^a-zA-Z0-9-_]/g, '-') || contract.id}-signing.html`;
    const storageKey = `contracts/signing/${dateFolder}/${filename}`;
    
    console.log(`🔑 Signing page storage key: ${storageKey}`);
    
    // Upload HTML to R2
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME || 'musobuddy-storage',
      Key: storageKey,
      Body: signingPageHtml,
      ContentType: 'text/html',
      ContentDisposition: `inline; filename="${filename}"`,
      Metadata: {
        'contract-id': contract.id.toString(),
        'contract-number': contract.contractNumber || 'Unknown',
        'page-type': 'signing-page',
        'uploaded-at': new Date().toISOString()
      }
    });
    
    await r2Client.send(uploadCommand);
    
    console.log(`✅ Contract signing page uploaded successfully to R2: ${storageKey}`);
    
    // Use direct Cloudflare R2 public URL
    const publicUrl = `https://pub-446248abf8164fb99bee2fc3dc3c513c.r2.dev/${storageKey}`;
    
    console.log(`🔗 Signing page URL: ${publicUrl}`);
    
    return {
      success: true,
      url: publicUrl,
      storageKey: storageKey
    };
    
  } catch (error: any) {
    console.error('❌ Failed to upload contract signing page:', error);
    return {
      success: false,
      error: error.message || 'Upload failed'
    };
  }
}