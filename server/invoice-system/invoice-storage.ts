// ⚠️  COMPLETELY ISOLATED INVOICE STORAGE ⚠️
// This file handles all invoice storage with NO dependencies on main storage system
// Last Updated: August 4, 2025

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { IsolatedInvoice, IsolatedUserSettings } from './invoice-generator.js';

// Isolated S3 client for invoice system only
const s3Client = new S3Client({
  region: 'auto',
  endpoint: 'https://f19aba74886b4308a2decc9ba5e94af8.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = 'musobuddy-storage';

export async function uploadInvoicePDF(
  invoice: IsolatedInvoice,
  userSettings: IsolatedUserSettings | null,
  generatePDF: (invoice: IsolatedInvoice, settings: IsolatedUserSettings | null) => Promise<Buffer>
): Promise<{ success: boolean; url?: string; key?: string; error?: string }> {
  try {
    console.log(`☁️ ISOLATED INVOICE: Uploading #${invoice.id} to cloud storage...`);
    
    // Generate PDF using isolated generator
    const pdfBuffer = await generatePDF(invoice, userSettings);
    console.log(`📄 ISOLATED INVOICE: PDF generated, size: ${pdfBuffer.length} bytes`);
    
    // Create storage key for invoice
    const key = `invoices/invoice-${invoice.invoiceNumber}-${Date.now()}.pdf`;
    
    // Upload to R2
    const uploadCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
      ContentDisposition: `inline; filename="invoice-${invoice.invoiceNumber}.pdf"`,
      Metadata: {
        'invoice-id': invoice.id?.toString() || 'unknown',
        'invoice-number': invoice.invoiceNumber,
        'generated-at': new Date().toISOString(),
      }
    });
    
    await s3Client.send(uploadCommand);
    console.log(`✅ ISOLATED INVOICE: Uploaded to cloud storage with key: ${key}`);
    
    // Generate public URL
    const publicUrl = `https://pub-b4c1b0e5e5e0436b92b70dddfca12e3b.r2.dev/${key}`;
    
    return {
      success: true,
      url: publicUrl,
      key: key
    };
    
  } catch (error) {
    console.error('❌ ISOLATED INVOICE: Upload failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    };
  }
}

export async function getInvoicePDFUrl(storageKey: string): Promise<string | null> {
  try {
    // For public URLs, return direct access
    if (storageKey.startsWith('http')) {
      return storageKey;
    }
    
    // Generate signed URL for private access
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: storageKey,
    });
    
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    return signedUrl;
    
  } catch (error) {
    console.error('❌ ISOLATED INVOICE: Failed to get PDF URL:', error);
    return null;
  }
}