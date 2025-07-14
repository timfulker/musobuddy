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
 * Upload contract signing page to cloud storage
 * Creates a standalone HTML page that works independently of the app
 */
export async function uploadContractSigningPage(
  contract: Contract,
  userSettings: UserSettings | null
): Promise<string> {
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
    
    // Generate presigned URL for public access (valid for 30 days)
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    
    const presignedUrl = await getSignedUrl(client, getCommand, { 
      expiresIn: 30 * 24 * 60 * 60 // 30 days for contract signing
    });
    
    console.log('✅ Contract signing page uploaded to cloud storage');
    console.log('🔗 Presigned URL:', presignedUrl);
    
    return presignedUrl;
    
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
        
        <div class="contract-details">
            <h2>Contract Details</h2>
            
            <div class="detail-grid">
                <div class="detail-item">
                    <div class="detail-label">Client Name</div>
                    <div class="detail-value">${contract.clientName}</div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-label">Event Date</div>
                    <div class="detail-value">${new Date(contract.eventDate).toLocaleDateString()}</div>
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
                    <div class="detail-value">£${contract.performanceFee}</div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-label">Deposit</div>
                    <div class="detail-value">£${contract.deposit}</div>
                </div>
            </div>
            
            <div class="terms-section">
                <h3>Terms and Conditions</h3>
                <div class="terms-content">${contract.terms}</div>
            </div>
        </div>
        
        <div class="signing-section">
            <h2>Digital Signature</h2>
            <p style="margin-bottom: 30px; color: #64748b;">
                Please review the contract details above and provide your digital signature below to confirm acceptance.
            </p>
            
            <form class="signing-form" id="signingForm">
                <div class="form-group">
                    <label class="form-label" for="clientName">Full Name *</label>
                    <input type="text" id="clientName" class="form-input" value="${contract.clientName}" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Digital Signature *</label>
                    <canvas id="signatureCanvas" class="signature-canvas" width="350" height="150"></canvas>
                    <div class="signature-buttons">
                        <button type="button" class="btn btn-secondary" id="clearSignature">Clear</button>
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
        
        <div class="footer">
            <p>Powered by MusoBuddy – less admin, more music</p>
        </div>
    </div>
    
    <script>
        // Signature canvas functionality
        const canvas = document.getElementById('signatureCanvas');
        const ctx = canvas.getContext('2d');
        const clearBtn = document.getElementById('clearSignature');
        const submitBtn = document.getElementById('submitBtn');
        const form = document.getElementById('signingForm');
        
        let isDrawing = false;
        let hasSignature = false;
        
        // Set up canvas
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        
        // Drawing functions
        function startDrawing(e) {
            isDrawing = true;
            draw(e);
        }
        
        function draw(e) {
            if (!isDrawing) return;
            
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x, y);
            
            hasSignature = true;
            updateSubmitButton();
        }
        
        function stopDrawing() {
            if (!isDrawing) return;
            isDrawing = false;
            ctx.beginPath();
        }
        
        // Touch events for mobile
        function getTouchPos(e) {
            const rect = canvas.getBoundingClientRect();
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
            };
        }
        
        function handleTouchStart(e) {
            e.preventDefault();
            const touch = getTouchPos(e);
            isDrawing = true;
            ctx.beginPath();
            ctx.moveTo(touch.x, touch.y);
        }
        
        function handleTouchMove(e) {
            e.preventDefault();
            if (!isDrawing) return;
            
            const touch = getTouchPos(e);
            ctx.lineTo(touch.x, touch.y);
            ctx.stroke();
            
            hasSignature = true;
            updateSubmitButton();
        }
        
        function handleTouchEnd(e) {
            e.preventDefault();
            isDrawing = false;
            ctx.beginPath();
        }
        
        // Event listeners
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseout', stopDrawing);
        
        canvas.addEventListener('touchstart', handleTouchStart);
        canvas.addEventListener('touchmove', handleTouchMove);
        canvas.addEventListener('touchend', handleTouchEnd);
        
        clearBtn.addEventListener('click', () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            hasSignature = false;
            updateSubmitButton();
        });
        
        function updateSubmitButton() {
            const nameField = document.getElementById('clientName');
            const canSubmit = hasSignature && nameField.value.trim() !== '';
            submitBtn.disabled = !canSubmit;
        }
        
        document.getElementById('clientName').addEventListener('input', updateSubmitButton);
        
        // Form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!hasSignature) {
                alert('Please provide your signature before submitting.');
                return;
            }
            
            const formData = new FormData();
            formData.append('clientName', document.getElementById('clientName').value);
            formData.append('signature', canvas.toDataURL());
            formData.append('contractId', '${contract.id}');
            
            // Show loading
            document.getElementById('loading').style.display = 'block';
            submitBtn.disabled = true;
            
            try {
                const response = await fetch('${appUrl}/api/contracts/sign/${contract.id}', {
                    method: 'POST',
                    body: formData
                });
                
                if (response.ok) {
                    document.getElementById('successMessage').style.display = 'block';
                    document.getElementById('signingForm').style.display = 'none';
                } else {
                    throw new Error('Failed to sign contract');
                }
            } catch (error) {
                console.error('Error signing contract:', error);
                document.getElementById('errorMessage').style.display = 'block';
                document.getElementById('errorText').textContent = 'There was an error processing your signature. Please try again or contact support.';
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