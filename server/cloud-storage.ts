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
 * Generic file upload to Cloudflare R2
 */
export async function uploadFileToCloudflare(
  fileBuffer: Buffer,
  key: string,
  contentType: string
): Promise<CloudStorageResult> {
  try {
    console.log('☁️ Uploading file to cloud storage:', key);
    
    // Check if cloud storage is configured
    if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_ACCOUNT_ID || !process.env.R2_BUCKET_NAME) {
      console.log('⚠️ Cloud storage not configured, skipping upload');
      return {
        success: false,
        error: 'Cloud storage not configured',
      };
    }
    
    const client = getS3Client();
    
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
    });
    
    await client.send(command);
    
    // Generate a signed URL for accessing the file
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    
    const signedUrl = await getSignedUrl(client, getCommand, { 
      expiresIn: 7 * 24 * 60 * 60 // 7 days in seconds
    });
    
    console.log('✅ File uploaded successfully:', key);
    
    return {
      success: true,
      url: signedUrl,
      key: key,
    };
  } catch (error) {
    console.error('❌ Failed to upload file to cloud storage:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
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
    
    // Generate presigned URL for secure access (valid for 7 days)
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    
    const presignedUrl = await getSignedUrl(client, getCommand, { 
      expiresIn: 7 * 24 * 60 * 60 // 7 days in seconds
    });
    
    console.log('✅ Contract uploaded to cloud storage successfully');
    console.log('🔗 Presigned URL:', presignedUrl);
    
    return {
      success: true,
      url: presignedUrl,
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
    
    // Generate presigned URL for secure access (valid for 7 days)
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    
    const presignedUrl = await getSignedUrl(client, getCommand, { 
      expiresIn: 7 * 24 * 60 * 60 // 7 days in seconds
    });
    
    console.log('✅ Invoice uploaded to cloud storage successfully');
    console.log('🔗 Presigned URL:', presignedUrl);
    
    return {
      success: true,
      url: presignedUrl,
      key: key,
    };
  } catch (error) {
    console.error('❌ Error uploading invoice to cloud storage:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      name: error.name,
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      bucket: BUCKET_NAME,
      hasCredentials: {
        accessKey: !!process.env.R2_ACCESS_KEY_ID,
        secretKey: !!process.env.R2_SECRET_ACCESS_KEY,
        accountId: !!process.env.R2_ACCOUNT_ID,
        bucketName: !!process.env.R2_BUCKET_NAME,
      }
    });
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
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_BUCKET_NAME
  );
}

/**
 * Upload arbitrary file to cloud storage
 */
export async function uploadToCloudStorage(
  fileBuffer: Buffer,
  storageKey: string,
  contentType?: string
): Promise<string> {
  try {
    console.log('☁️ Uploading file to cloud storage:', storageKey);
    
    // Check if cloud storage is configured
    if (!isCloudStorageConfigured()) {
      throw new Error('Cloud storage not configured');
    }
    
    const client = getS3Client();
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: storageKey,
      Body: fileBuffer,
      ContentType: contentType || 'application/octet-stream',
    });
    
    await client.send(command);
    
    // Generate presigned URL for secure access (valid for 7 days)
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: storageKey,
    });
    
    const presignedUrl = await getSignedUrl(client, getCommand, { 
      expiresIn: 7 * 24 * 60 * 60 // 7 days in seconds
    });
    
    console.log('✅ File uploaded to cloud storage successfully');
    return presignedUrl;
    
  } catch (error) {
    console.error('❌ Error uploading file to cloud storage:', error);
    throw error;
  }
}

/**
 * Regenerate fresh presigned URL for existing cloud-hosted signing page
 * This solves the 7-day expiry problem for reminder periods > 7 days
 */
export async function regenerateContractSigningUrl(storageKey: string): Promise<string | null> {
  try {
    console.log('🔄 Regenerating fresh presigned URL for:', storageKey);
    
    // Check if cloud storage is configured
    if (!isCloudStorageConfigured()) {
      console.log('⚠️ Cloud storage not configured, cannot regenerate URL');
      return null;
    }
    
    const client = getS3Client();
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: storageKey,
    });
    
    // Generate fresh presigned URL (valid for another 7 days)
    const presignedUrl = await getSignedUrl(client, getCommand, { 
      expiresIn: 7 * 24 * 60 * 60 // 7 days (maximum allowed)
    });
    
    console.log('✅ Fresh presigned URL generated');
    return presignedUrl;
    
  } catch (error) {
    console.error('❌ Error regenerating presigned URL:', error);
    return null;
  }
}

/**
 * Upload contract signing page to cloud storage
 * Creates a standalone HTML page that works independently of the app
 * Note: URLs expire after 7 days (AWS/R2 limit). Use regenerateContractSigningUrl() for longer reminder periods.
 */
export async function uploadContractSigningPage(
  contract: Contract,
  userSettings: UserSettings | null
): Promise<{ url: string; storageKey: string }> {
  try {
    console.log('☁️ Creating cloud-hosted contract signing page:', contract.contractNumber);
    
    // Check if cloud storage is configured
    if (!isCloudStorageConfigured()) {
      throw new Error('Cloud storage not configured');
    }
    
    // Generate the standalone HTML signing page
    const signingPageHtml = generateContractSigningPageHtml(contract, userSettings);
    
    // Create storage key for the signing page
    const userId = contract.userId || 'unknown';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const key = `users/${userId}/contract-signing/${contract.id}-${timestamp}.html`;
    
    // Upload HTML page to cloud storage
    const client = getS3Client();
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: signingPageHtml,
      ContentType: 'text/html',
      CacheControl: 'no-cache', // Prevent caching for signing pages
    });
    
    await client.send(command);
    
    // Generate presigned URL for public access (valid for 7 days - AWS/R2 maximum)
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    
    const presignedUrl = await getSignedUrl(client, getCommand, { 
      expiresIn: 7 * 24 * 60 * 60 // 7 days (maximum allowed) for contract signing
    });
    
    console.log('✅ Contract signing page uploaded to cloud storage');
    console.log('🔗 Presigned URL:', presignedUrl);
    
    return {
      url: presignedUrl,
      storageKey: key
    };
    
  } catch (error) {
    console.error('❌ Error uploading contract signing page:', error);
    throw error;
  }
}

/**
 * Generate standalone HTML contract signing page
 */
function generateContractSigningPageHtml(
  contract: Contract,
  userSettings: UserSettings | null
): string {
  const businessName = userSettings?.businessName || 'MusoBuddy';
  const appUrl = 'https://musobuddy.replit.app';
  
  // Check if contract is already signed
  const isAlreadySigned = contract.status === 'signed';
  const signedDate = isAlreadySigned && contract.signedAt ? new Date(contract.signedAt).toLocaleString('en-GB') : '';
  const signedBy = isAlreadySigned ? contract.clientName : '';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign Contract - ${contract.contractNumber}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #f8fafc;
            color: #1e293b;
            line-height: 1.6;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            margin-bottom: 30px;
            text-align: center;
        }
        
        .header h1 {
            color: #7c3aed;
            margin-bottom: 10px;
            font-size: 2rem;
        }
        
        .header p {
            color: #64748b;
            font-size: 1.1rem;
        }
        
        .contract-details {
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }
        
        .contract-details h2 {
            color: #1e293b;
            margin-bottom: 20px;
            font-size: 1.5rem;
        }
        
        .detail-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .detail-item {
            padding: 15px;
            background: #f8fafc;
            border-radius: 8px;
            border-left: 4px solid #7c3aed;
        }
        
        .detail-label {
            font-weight: 600;
            color: #475569;
            font-size: 0.9rem;
            margin-bottom: 5px;
        }
        
        .detail-value {
            color: #1e293b;
            font-size: 1.1rem;
        }
        
        .terms-section {
            background: #f1f5f9;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        
        .terms-section h3 {
            color: #1e293b;
            margin-bottom: 15px;
        }
        
        .terms-content {
            white-space: pre-wrap;
            font-size: 0.95rem;
            color: #475569;
            max-height: 300px;
            overflow-y: auto;
            padding: 10px;
            background: white;
            border-radius: 6px;
        }
        
        .signing-section {
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            text-align: center;
        }
        
        .signing-form {
            max-width: 400px;
            margin: 0 auto;
        }
        
        .form-group {
            margin-bottom: 20px;
            text-align: left;
        }
        
        .form-label {
            display: block;
            font-weight: 600;
            color: #374151;
            margin-bottom: 8px;
        }
        
        .form-input {
            width: 100%;
            padding: 12px;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            font-size: 1rem;
            transition: border-color 0.2s;
        }
        
        .form-input:focus {
            outline: none;
            border-color: #7c3aed;
            box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
        }
        
        .signature-canvas {
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            cursor: crosshair;
            background: white;
            display: block;
            margin: 0 auto;
        }
        
        .signature-buttons {
            display: flex;
            gap: 10px;
            justify-content: center;
            margin-top: 15px;
        }
        
        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .btn-primary {
            background: #7c3aed;
            color: white;
        }
        
        .btn-primary:hover {
            background: #6d28d9;
        }
        
        .btn-secondary {
            background: #e2e8f0;
            color: #475569;
        }
        
        .btn-secondary:hover {
            background: #cbd5e1;
        }
        
        .btn-success {
            background: #10b981;
            color: white;
            font-size: 1.1rem;
            padding: 15px 30px;
        }
        
        .btn-success:hover {
            background: #059669;
        }
        
        .btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        
        .loading {
            display: none;
            margin-top: 20px;
        }
        
        .success-message {
            display: none;
            background: #d1fae5;
            color: #065f46;
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
        }
        
        .error-message {
            display: none;
            background: #fee2e2;
            color: #991b1b;
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
        }
        
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            color: #64748b;
            font-size: 0.9rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${businessName}</h1>
            <p>Contract Signing - ${contract.contractNumber}</p>
        </div>
        
        <!-- Contract Status Check -->
        <div id="contractStatus" style="display: ${isAlreadySigned ? 'block' : 'none'};">
            <div style="background: #d1fae5; color: #065f46; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
                <h2>✅ Contract Already Signed</h2>
                <p>This contract has already been signed and is now complete.</p>
                <p><strong>Signed on:</strong> <span id="signedDate">${signedDate}</span></p>
                <p><strong>Signed by:</strong> <span id="signedBy">${signedBy}</span></p>
                <div style="margin-top: 20px;">
                    <a href="${appUrl}/api/contracts/${contract.id}/download" style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Download Signed Contract</a>
                </div>
            </div>
        </div>
        
        <div class="contract-details" id="contractDetails" style="display: ${isAlreadySigned ? 'none' : 'block'};">
            <h2>Contract Details</h2>
            
            <div class="detail-grid">
                <div class="detail-item">
                    <div class="detail-label">Client Name</div>
                    <div class="detail-value">${contract.clientName}</div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-label">Event Date</div>
                    <div class="detail-value">${new Date(contract.eventDate).toLocaleDateString('en-GB')}</div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-label">Event Time</div>
                    <div class="detail-value">${contract.eventTime}</div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-label">Venue</div>
                    <div class="detail-value">${contract.venue}</div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-label">Performance Fee</div>
                    <div class="detail-value">£${contract.fee}</div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-label">Deposit</div>
                    <div class="detail-value">£${contract.deposit}</div>
                </div>
            </div>
            
            <div class="terms-section">
                <h3>Terms and Conditions</h3>
                <div class="terms-content">
                    <h4>Payment Terms & Conditions</h4>
                    <p><strong>Payment Due Date:</strong> Full payment of £${contract.fee} becomes due and payable no later than the day of performance. Payment must be received before or immediately upon completion of the performance.</p>
                    <p><strong>Deposit:</strong> ${contract.deposit && parseFloat(contract.deposit) > 0 ? `A deposit of £${contract.deposit} is required and must be paid within 7 days of receipt of this signed contract.` : 'No deposit required.'}</p>
                    <p><strong>Payment Methods:</strong> Cash or bank transfer to the performer's designated account (details provided separately).</p>
                    <p><strong>Late Payment:</strong> Any payment received after the due date may incur a late payment fee of £25 plus interest at 2% per month.</p>
                    
                    <h4>Cancellation & Refund Policy</h4>
                    <p><strong>Client Cancellation:</strong></p>
                    <ul>
                        <li>More than 30 days before event: Any deposit paid will be refunded minus a £50 administration fee</li>
                        <li>30 days or less before event: Full performance fee becomes due regardless of cancellation</li>
                        <li>Same day cancellation: Full fee due plus any additional costs incurred</li>
                    </ul>
                    <p><strong>Performer Cancellation:</strong> In the unlikely event the performer must cancel due to circumstances within their control, all payments will be refunded in full and reasonable assistance will be provided to find a suitable replacement.</p>
                    <p><strong>Rescheduling:</strong> Event may be rescheduled once without penalty if agreed by both parties at least 14 days in advance. Additional rescheduling requests may incur a £25 administrative fee.</p>
                    
                    <h4>Force Majeure</h4>
                    <p>Neither party shall be liable for any failure to perform due to circumstances beyond their reasonable control, including but not limited to: severe weather, natural disasters, government restrictions, venue closure, or serious illness.</p>
                    
                    <h4>Performance Contingencies</h4>
                    <p>The performer will provide appropriate backup equipment where reasonably possible. If performance cannot proceed due to venue-related issues (power failure, noise restrictions, etc.), the full fee remains due.</p>
                    
                    <h4>Professional Performance Standards</h4>
                    <p><strong>Payment Schedule:</strong> The agreed performance fee becomes due and payable on the date of performance of the engagement.</p>
                    <p><strong>Equipment & Instrument Protection:</strong> The equipment and instruments of the performer are not available for use by any other person, except by specific permission of the performer. All musical instruments and equipment remain the exclusive property of the performer.</p>
                    <p><strong>Venue Safety Requirements:</strong> The client shall ensure a safe supply of electricity and the security of the performer and their property at the venue throughout the engagement.</p>
                    <p><strong>Recording & Transmission Policy:</strong> The client shall not make or permit the making of any audio and/or visual recording or transmission of the performer's performance without the prior written consent of the performer.</p>
                    <p><strong>Contract Modifications:</strong> This agreement may not be modified or cancelled except by mutual consent, in writing signed by both parties. Verbal modifications are not binding.</p>
                    <p><strong>Performance Rider:</strong> Any rider attached hereto and signed by both parties shall be deemed incorporated into this agreement.</p>
                    <p><strong>Safe Space Principle:</strong> The client and performer agree to a 'Safe Space' principle to provide a working environment free from harassment and discrimination, maintaining respectful professional standards throughout the engagement.</p>
                    <p><strong>Professional Insurance:</strong> The performer maintains professional liability insurance as required for musical performance engagements.</p>
                    
                    <h4>Payment Instructions</h4>
                    <p>${contract.paymentInstructions || 'Payment instructions will be provided separately.'}</p>
                    
                    <h4>Equipment Requirements</h4>
                    <p>${contract.equipmentRequirements || 'Equipment requirements will be confirmed separately.'}</p>
                    
                    <h4>Special Requirements</h4>
                    <p>${contract.specialRequirements || 'No special requirements specified.'}</p>
                </div>
            </div>
        </div>
        
        <div class="signing-section" id="signing-section" style="display: ${isAlreadySigned ? 'none' : 'block'};">
            <h2>Digital Signature</h2>
            <p style="margin-bottom: 30px; color: #64748b;">
                Please review the contract details above and provide your digital signature below to confirm acceptance.
            </p>
            
            <form class="signing-form" id="signingForm">
                <div class="form-group">
                    <label class="form-label" for="clientName">Full Name *</label>
                    <input type="text" id="clientName" class="form-input" value="${contract.clientName}" required>
                </div>
                
                <!-- Client-fillable fields (highlighted in blue) -->
                <div class="form-group">
                    <label class="form-label" for="clientPhone" style="color: #2563eb;">Phone Number ${!contract.clientPhone ? '(Required)' : '(Optional)'} *</label>
                    <input type="tel" id="clientPhone" class="form-input" value="${contract.clientPhone || ''}" placeholder="e.g., 07123 456789" style="border-color: #2563eb; background-color: #eff6ff;" ${!contract.clientPhone ? 'required' : ''}>
                    <p style="font-size: 0.9rem; color: #2563eb; margin-top: 5px;">${!contract.clientPhone ? 'This field must be completed before signing' : 'This field can be filled by either the musician or client'}</p>
                </div>
                
                <div class="form-group">
                    <label class="form-label" for="clientAddress" style="color: #2563eb;">Address ${!contract.clientAddress ? '(Required)' : '(Optional)'} *</label>
                    <textarea id="clientAddress" class="form-input" rows="3" placeholder="e.g., 123 Main Street, London, SW1A 1AA" style="border-color: #2563eb; background-color: #eff6ff; resize: vertical;" ${!contract.clientAddress ? 'required' : ''}>${contract.clientAddress || ''}</textarea>
                    <p style="font-size: 0.9rem; color: #2563eb; margin-top: 5px;">${!contract.clientAddress ? 'This field must be completed before signing' : 'This field can be filled by either the musician or client'}</p>
                </div>
                
                <div class="form-group">
                    <label class="form-label" for="venueAddress" style="color: #2563eb;">Venue Address ${!contract.venueAddress ? '(Required)' : '(Optional)'} *</label>
                    <textarea id="venueAddress" class="form-input" rows="3" placeholder="e.g., The Grand Hotel, 456 Event Street, London, EC1A 1BB" style="border-color: #2563eb; background-color: #eff6ff; resize: vertical;" ${!contract.venueAddress ? 'required' : ''}>${contract.venueAddress || ''}</textarea>
                    <p style="font-size: 0.9rem; color: #2563eb; margin-top: 5px;">${!contract.venueAddress ? 'This field must be completed before signing' : 'This field can be filled by either the musician or client'}</p>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Digital Signature *</label>
                    
                    <!-- Type Signature Section (Default and Only Option) -->
                    <div id="typeSignatureSection">
                        <input type="text" id="typedSignature" class="form-input" value="${contract.clientName}" placeholder="Type your full name here" style="font-family: 'Brush Script MT', cursive, serif; font-size: 1.5rem; text-align: center; padding: 20px;">
                        <p style="font-size: 0.9rem; color: #64748b; margin-top: 10px; text-align: center;">
                            Your signature will be formatted in a stylized font for the contract
                        </p>
                    </div>
                </div>
                
                <div class="form-group">
                    <button type="submit" class="btn btn-success" id="submitBtn" disabled>
                        Sign Contract
                    </button>
                </div>
            </form>
            
            <div class="loading" id="loading">
                <p>Processing signature...</p>
            </div>
            
            <div class="success-message" id="successMessage">
                <h3>Contract Signed Successfully!</h3>
                <p>Thank you for signing the contract. Both parties will receive confirmation emails shortly.</p>
            </div>
            
            <div class="error-message" id="errorMessage">
                <h3>Error</h3>
                <p id="errorText">There was an error processing your signature. Please try again.</p>
            </div>
        </div>
        
        <div class="legal-footer" style="margin-top: 40px; padding: 20px; background: #f8f9fa; border-radius: 8px; font-size: 0.9rem; color: #64748b;">
            <h4 style="color: #374151; margin-bottom: 15px;">Legal Information & Governing Terms</h4>
            <p><strong>Contract Number:</strong> ${contract.contractNumber}</p>
            <p><strong>Generated:</strong> ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB')}</p>
            <p><strong>Binding Agreement:</strong> This is a legally binding agreement between the parties named above. Both parties acknowledge they have read, understood, and agree to be bound by all terms and conditions set forth herein.</p>
            <p><strong>Governing Law & Jurisdiction:</strong> This contract shall be governed by and construed in accordance with the laws of England and Wales. Any disputes, claims, or legal proceedings arising from or relating to this agreement shall be subject to the exclusive jurisdiction of the courts of England and Wales.</p>
            <p><strong>Digital Signatures:</strong> Digital signatures are legally binding under the Electronic Communications Act 2000 and eIDAS Regulation. Electronic acceptance constitutes agreement to all terms.</p>
            <p><strong>Entire Agreement:</strong> This contract represents the entire agreement between the parties and supersedes all prior negotiations, representations, or agreements. No modification shall be valid unless in writing and signed by both parties.</p>
            <p><strong>Severability:</strong> If any provision of this contract is found to be unenforceable, the remaining provisions shall continue in full force and effect.</p>
            <p><strong>Contract Validity:</strong> This contract remains valid and enforceable regardless of changes in circumstances, location, or contact information of either party.</p>
        </div>
        
        <div class="footer">
            <p>Powered by MusoBuddy – less admin, more music</p>
        </div>
    </div>
    
    <script>
        // Contract status is now embedded directly in HTML - no API call needed

        // Simplified signature functionality - typed signature only
        const submitBtn = document.getElementById('submitBtn');
        const form = document.getElementById('signingForm');
        const typedSignatureInput = document.getElementById('typedSignature');
        
        function updateSubmitButton() {
            const nameField = document.getElementById('clientName');
            const typedSignature = typedSignatureInput.value.trim();
            const clientPhone = document.getElementById('clientPhone').value.trim();
            const clientAddress = document.getElementById('clientAddress').value.trim();
            const venueAddress = document.getElementById('venueAddress').value.trim();
            
            // Check if all required fields are filled
            let canSubmit = nameField.value.trim() !== '' && typedSignature !== '';
            
            // Check client-fillable fields if they're required
            if (!${JSON.stringify(!!contract.clientPhone)} && !clientPhone) canSubmit = false;
            if (!${JSON.stringify(!!contract.clientAddress)} && !clientAddress) canSubmit = false;
            if (!${JSON.stringify(!!contract.venueAddress)} && !venueAddress) canSubmit = false;
            
            submitBtn.disabled = !canSubmit;
        }
        
        document.getElementById('clientName').addEventListener('input', updateSubmitButton);
        document.getElementById('typedSignature').addEventListener('input', updateSubmitButton);
        document.getElementById('clientPhone').addEventListener('input', updateSubmitButton);
        document.getElementById('clientAddress').addEventListener('input', updateSubmitButton);
        document.getElementById('venueAddress').addEventListener('input', updateSubmitButton);
        
        // Initialize submit button state
        updateSubmitButton();
        
        // Contract status is now embedded directly in HTML - no page load check needed

        // Form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const typedSignature = typedSignatureInput.value.trim();
            
            // Validate signature
            if (!typedSignature) {
                alert('Please type your signature before submitting.');
                return;
            }
            
            // Create typed signature canvas
            const typeCanvas = document.createElement('canvas');
            typeCanvas.width = 350;
            typeCanvas.height = 150;
            const typeCtx = typeCanvas.getContext('2d');
            
            // Style the typed signature
            typeCtx.fillStyle = '#1e293b';
            typeCtx.font = '2rem "Brush Script MT", cursive, serif';
            typeCtx.textAlign = 'center';
            typeCtx.textBaseline = 'middle';
            typeCtx.fillText(typedSignature, typeCanvas.width / 2, typeCanvas.height / 2);
            
            const signatureData = typeCanvas.toDataURL();
            
            // Show loading
            document.getElementById('loading').style.display = 'block';
            submitBtn.disabled = true;
            
            try {
                const response = await fetch('${appUrl}/api/contracts/sign/${contract.id}', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        clientName: document.getElementById('clientName').value,
                        signature: signatureData,
                        contractId: '${contract.id}',
                        clientPhone: document.getElementById('clientPhone').value || null,
                        clientAddress: document.getElementById('clientAddress').value || null,
                        venueAddress: document.getElementById('venueAddress').value || null
                    })
                });
                
                if (response.ok) {
                    document.getElementById('successMessage').style.display = 'block';
                    document.getElementById('signingForm').style.display = 'none';
                } else {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to sign contract');
                }
            } catch (error) {
                console.error('Error signing contract:', error);
                document.getElementById('errorMessage').style.display = 'block';
                document.getElementById('errorText').textContent = error.message || 'There was an error processing your signature. Please try again or contact support.';
                submitBtn.disabled = false;
            } finally {
                document.getElementById('loading').style.display = 'none';
            }
        });
    </script>
</body>
</html>`;
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
    'R2_ACCOUNT_ID',
    'R2_BUCKET_NAME',
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  return {
    configured: missingVars.length === 0,
    endpoint: process.env.R2_ACCOUNT_ID ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined,
    bucket: process.env.R2_BUCKET_NAME,
    missingVars: missingVars.length > 0 ? missingVars : undefined,
  };
}