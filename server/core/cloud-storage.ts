// cloud-storage.ts - Fixed uploadInvoiceToCloud function

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import type { Invoice, UserSettings } from '@shared/schema';

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
    
    // CRITICAL FIX: Return the correct URL format
    // This should match the PDF serving route: /invoices/:dateFolder/:filename
    const publicUrl = `invoices/${dateFolder}/${filename}`;
    
    return {
      success: true,
      url: publicUrl, // Returns: invoices/2025-08-04/INV-263.pdf
      key: storageKey  // Same as url in this case
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

// Utility to check if cloud storage is properly configured
export function isCloudStorageConfigured(): boolean {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME
  );
}