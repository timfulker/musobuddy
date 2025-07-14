import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Contract, Invoice, UserSettings } from '@shared/schema';
import { generateContractPDF, generateInvoicePDF } from './pdf-generator';

// Cloud storage configuration
const STORAGE_CONFIG = {
  region: 'auto', // Cloudflare R2 uses 'auto'
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true, // Required for R2 compatibility
};

const BUCKET_NAME = process.env.R2_BUCKET_NAME;

// Initialize S3 client for Cloudflare R2
let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client(STORAGE_CONFIG);
  }
  return s3Client;
}

interface CloudStorageResult {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
}

/**
 * Upload contract PDF to cloud storage
 */
export async function uploadContractToCloud(
  contract: Contract,
  userSettings: UserSettings | null,
  signatureDetails?: {
    signedAt: Date;
    signatureName?: string;
    clientIpAddress?: string;
  }
): Promise<CloudStorageResult> {
  try {
    console.log('☁️ Uploading contract to cloud storage:', contract.contractNumber);
    
    // Check if cloud storage is configured
    if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_ACCOUNT_ID || !process.env.R2_BUCKET_NAME) {
      console.log('⚠️ Cloud storage not configured, skipping upload');
      console.log('Missing:', {
        accessKey: !process.env.R2_ACCESS_KEY_ID ? 'R2_ACCESS_KEY_ID' : 'OK',
        secretKey: !process.env.R2_SECRET_ACCESS_KEY ? 'R2_SECRET_ACCESS_KEY' : 'OK',
        accountId: !process.env.R2_ACCOUNT_ID ? 'R2_ACCOUNT_ID' : 'OK',
        bucketName: !process.env.R2_BUCKET_NAME ? 'R2_BUCKET_NAME' : 'OK',
      });
      return {
        success: false,
        error: 'Cloud storage not configured',
      };
    }
    
    // Generate PDF buffer
    const pdfBuffer = await generateContractPDF(contract, userSettings, signatureDetails);
    
    // Create storage key with user ID for organization
    const userId = contract.userId || 'unknown';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const key = `users/${userId}/contracts/${contract.contractNumber}-${timestamp}.pdf`;
    
    // Upload to cloud storage
    const client = getS3Client();
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
      ContentDisposition: `attachment; filename="${contract.contractNumber}.pdf"`,
    });
    
    await client.send(command);
    
    // Generate public URL
    const publicUrl = `${STORAGE_CONFIG.endpoint}/${BUCKET_NAME}/${key}`;
    
    console.log('✅ Contract uploaded to cloud storage successfully');
    console.log('🔗 Public URL:', publicUrl);
    
    return {
      success: true,
      url: publicUrl,
      key: key,
    };
  } catch (error) {
    console.error('❌ Error uploading contract to cloud storage:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Upload invoice PDF to cloud storage
 */
export async function uploadInvoiceToCloud(
  invoice: Invoice,
  contract: Contract | null,
  userSettings: UserSettings | null
): Promise<CloudStorageResult> {
  try {
    console.log('☁️ Uploading invoice to cloud storage:', invoice.invoiceNumber);
    
    // Check if cloud storage is configured
    if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_ACCOUNT_ID || !process.env.R2_BUCKET_NAME) {
      console.log('⚠️ Cloud storage not configured, skipping upload');
      console.log('Missing:', {
        accessKey: !process.env.R2_ACCESS_KEY_ID ? 'R2_ACCESS_KEY_ID' : 'OK',
        secretKey: !process.env.R2_SECRET_ACCESS_KEY ? 'R2_SECRET_ACCESS_KEY' : 'OK',
        accountId: !process.env.R2_ACCOUNT_ID ? 'R2_ACCOUNT_ID' : 'OK',
        bucketName: !process.env.R2_BUCKET_NAME ? 'R2_BUCKET_NAME' : 'OK',
      });
      return {
        success: false,
        error: 'Cloud storage not configured',
      };
    }
    
    // Generate PDF buffer
    const pdfBuffer = await generateInvoicePDF(invoice, contract, userSettings);
    
    // Create storage key with user ID for organization
    const userId = invoice.userId || 'unknown';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const key = `users/${userId}/invoices/${invoice.invoiceNumber}-${timestamp}.pdf`;
    
    // Upload to cloud storage
    const client = getS3Client();
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
      ContentDisposition: `attachment; filename="${invoice.invoiceNumber}.pdf"`,
    });
    
    await client.send(command);
    
    // Generate public URL
    const publicUrl = `${STORAGE_CONFIG.endpoint}/${BUCKET_NAME}/${key}`;
    
    console.log('✅ Invoice uploaded to cloud storage successfully');
    console.log('🔗 Public URL:', publicUrl);
    
    return {
      success: true,
      url: publicUrl,
      key: key,
    };
  } catch (error) {
    console.error('❌ Error uploading invoice to cloud storage:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Delete document from cloud storage
 */
export async function deleteFromCloud(key: string): Promise<boolean> {
  try {
    if (!process.env.R2_ACCESS_KEY_ID) {
      return false;
    }
    
    const client = getS3Client();
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    
    await client.send(command);
    console.log('🗑️ Deleted from cloud storage:', key);
    return true;
  } catch (error) {
    console.error('❌ Error deleting from cloud storage:', error);
    return false;
  }
}

/**
 * Check if cloud storage is configured and available
 */
export function isCloudStorageConfigured(): boolean {
  return !!(
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_ENDPOINT &&
    process.env.R2_BUCKET_NAME
  );
}

/**
 * Get cloud storage configuration status
 */
export function getCloudStorageStatus(): {
  configured: boolean;
  endpoint?: string;
  bucket?: string;
  missingVars?: string[];
} {
  const requiredVars = [
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_ENDPOINT',
    'R2_BUCKET_NAME',
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  return {
    configured: missingVars.length === 0,
    endpoint: process.env.R2_ENDPOINT,
    bucket: process.env.R2_BUCKET_NAME,
    missingVars: missingVars.length > 0 ? missingVars : undefined,
  };
}