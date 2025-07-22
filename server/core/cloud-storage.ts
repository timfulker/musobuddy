import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Contract, Invoice, UserSettings } from '@shared/schema';
import { generateContractPDF, generateInvoicePDF } from './pdf-generator';

// Cloudflare R2 configuration - using your actual env variable names
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'musobuddy-storage';

// Check if cloud storage is configured - using your actual env variable names
export function isCloudStorageConfigured(): boolean {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME
  );
}

// Generic file upload function
async function uploadFileToCloudflare(
  key: string,
  buffer: Buffer,
  contentType: string = 'application/octet-stream'
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    if (!isCloudStorageConfigured()) {
      return { success: false, error: 'Cloud storage not configured' };
    }

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await r2Client.send(command);

    // Generate signed URL for access
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const signedUrl = await getSignedUrl(r2Client, getCommand, { expiresIn: 7 * 24 * 60 * 60 }); // 7 days

    console.log(`✅ File uploaded to cloud storage: ${key}`);
    return { success: true, url: signedUrl };
  } catch (error) {
    console.error('❌ Cloud storage upload failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Upload contract to cloud storage
export async function uploadContractToCloud(
  contract: Contract,
  userSettings: UserSettings | null,
  signatureDetails?: {
    signedAt: Date;
    signatureName?: string;
    clientIpAddress?: string;
  }
): Promise<{ success: boolean; url?: string; key?: string; error?: string }> {
  try {
    console.log('📤 Uploading contract to cloud storage:', contract.contractNumber);

    // Generate PDF
    const pdfBuffer = await generateContractPDF(contract, userSettings, signatureDetails);
    
    // Create storage key
    const timestamp = new Date().toISOString().split('T')[0];
    const key = `contracts/${timestamp}/${contract.contractNumber}.pdf`;

    // Upload to cloud
    const result = await uploadFileToCloudflare(key, pdfBuffer, 'application/pdf');
    
    if (result.success) {
      console.log('✅ Contract uploaded successfully to cloud storage');
      return { success: true, url: result.url, key };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('❌ Error uploading contract to cloud:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Upload invoice to cloud storage
export async function uploadInvoiceToCloud(
  invoice: Invoice,
  contract: Contract | null,
  userSettings: UserSettings | null
): Promise<{ success: boolean; url?: string; key?: string; error?: string }> {
  try {
    console.log('📤 Uploading invoice to cloud storage:', invoice.invoiceNumber);

    // Generate PDF
    const pdfBuffer = await generateInvoicePDF(invoice, contract, userSettings);
    
    // Create storage key
    const timestamp = new Date().toISOString().split('T')[0];
    const key = `invoices/${timestamp}/${invoice.invoiceNumber}.pdf`;

    // Upload to cloud
    const result = await uploadFileToCloudflare(key, pdfBuffer, 'application/pdf');
    
    if (result.success) {
      console.log('✅ Invoice uploaded successfully to cloud storage');
      return { success: true, url: result.url, key };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('❌ Error uploading invoice to cloud:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Generate HTML for contract signing page
function generateContractSigningPageHTML(
  contract: Contract,
  userSettings: UserSettings | null
): string {
  const businessName = userSettings?.businessName || 'MusoBuddy';
  
  const formatDate = (date: any) => {
    if (!date) return 'Date TBC';
    return new Date(date).toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Contract Signing - ${contract.contractNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; padding: 20px; background: #f8fafc; border-radius: 8px; }
        .title { color: #2563eb; font-size: 28px; margin-bottom: 10px; }
        .contract-details { background: #fff; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
        .detail-label { font-weight: bold; color: #64748b; }
        .detail-value { color: #1e293b; }
        .fee-highlight { background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6; }
        .signing-section { background: #f9fafb; padding: 30px; border-radius: 8px; margin: 30px 0; text-align: center; }
        .sign-button { background: #2563eb; color: white; padding: 15px 30px; border: none; border-radius: 8px; font-size: 18px; cursor: pointer; text-decoration: none; display: inline-block; margin: 20px 10px; }
        .sign-button:hover { background: #1d4ed8; }
        .download-button { background: #059669; color: white; padding: 15px 30px; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; text-decoration: none; display: inline-block; margin: 20px 10px; }
        .download-button:hover { background: #047857; }
        .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 14px; }
        @media (max-width: 600px) {
          .detail-row { flex-direction: column; }
          .sign-button, .download-button { display: block; margin: 10px 0; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">Performance Contract</div>
        <div style="font-size: 18px; color: #64748b;">${contract.contractNumber}</div>
        <div style="font-size: 16px; color: #64748b; margin-top: 10px;">From ${businessName}</div>
      </div>

      <div class="contract-details">
        <h3 style="color: #1e293b; margin-top: 0;">Contract Details</h3>
        
        <div class="detail-row">
          <span class="detail-label">Client Name:</span>
          <span class="detail-value">${contract.clientName}</span>
        </div>
        
        <div class="detail-row">
          <span class="detail-label">Performance Date:</span>
          <span class="detail-value">${formatDate(contract.eventDate)}</span>
        </div>
        
        <div class="detail-row">
          <span class="detail-label">Time:</span>
          <span class="detail-value">${contract.eventTime || 'TBC'}</span>
        </div>
        
        <div class="detail-row">
          <span class="detail-label">Venue:</span>
          <span class="detail-value">${contract.venue}</span>
        </div>
        
        <div class="detail-row">
          <span class="detail-label">Event Type:</span>
          <span class="detail-value">${contract.eventType || 'Performance'}</span>
        </div>
      </div>

      <div class="fee-highlight">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 18px; font-weight: bold;">Performance Fee:</span>
          <span style="font-size: 24px; font-weight: bold; color: #2563eb;">£${contract.fee}</span>
        </div>
      </div>

      <div class="signing-section">
        <h3 style="color: #1e293b; margin-top: 0;">Ready to Confirm Your Booking?</h3>
        <p>Please review the contract details above and click below to sign digitally.</p>
        
        <div style="margin: 30px 0;">
          <button onclick="openSigningForm()" class="sign-button">
            📝 Sign Contract Online
          </button>
          
          <a href="https://musobuddy.replit.app/api/contracts/${contract.id}/download" class="download-button">
            📄 Download PDF
          </a>
        </div>
        
        <div id="signingForm" style="display: none; margin-top: 30px; text-align: left; background: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
          <h4>Digital Signature</h4>
          <div style="margin: 15px 0;">
            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Full Name (as it appears on the contract):</label>
            <input type="text" id="clientName" value="${contract.clientName}" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 4px;">
          </div>
          
          <div style="margin: 15px 0;">
            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Type your signature:</label>
            <input type="text" id="typedSignature" placeholder="Type your full name as your signature" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 4px; font-family: 'Brush Script MT', cursive, serif; font-size: 18px;">
          </div>
          
          <div style="margin: 15px 0;">
            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Phone (optional):</label>
            <input type="tel" id="clientPhone" placeholder="Your contact number" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 4px;">
          </div>
          
          <div style="margin: 20px 0;">
            <label style="display: flex; align-items: center;">
              <input type="checkbox" id="agreeTerms" style="margin-right: 10px;">
              <span>I agree to the terms and conditions of this contract</span>
            </label>
          </div>
          
          <button onclick="submitSignature()" id="submitBtn" class="sign-button" style="width: 100%;">
            ✅ Submit Digital Signature
          </button>
          
          <div id="loading" style="display: none; text-align: center; margin-top: 20px;">
            <p>Processing signature...</p>
          </div>
          
          <div id="successMessage" style="display: none; background: #dcfce7; border: 1px solid #16a34a; color: #166534; padding: 15px; border-radius: 8px; margin-top: 20px;">
            <h4>✅ Contract Signed Successfully!</h4>
            <p>Thank you! Your signature has been recorded and both parties will receive confirmation emails.</p>
          </div>
          
          <div id="errorMessage" style="display: none; background: #fef2f2; border: 1px solid #ef4444; color: #991b1b; padding: 15px; border-radius: 8px; margin-top: 20px;">
            <h4>❌ Signature Error</h4>
            <p id="errorText">There was an error processing your signature. Please try again.</p>
          </div>
        </div>
        
        <p style="font-size: 14px; color: #64748b; margin-top: 20px;">
          By signing, you agree to the terms and conditions outlined in the full contract.
        </p>
      </div>

      <div class="footer">
        <p>This contract signing page is hosted independently for your convenience.</p>
        <p>Powered by MusoBuddy – less admin, more music</p>
      </div>
      
      <script>
        function openSigningForm() {
          document.getElementById('signingForm').style.display = 'block';
          document.querySelector('.sign-button').style.display = 'none';
        }
        
        async function submitSignature() {
          const typedSignature = document.getElementById('typedSignature').value.trim();
          const agreeTerms = document.getElementById('agreeTerms').checked;
          const submitBtn = document.getElementById('submitBtn');
          
          // Validation
          if (!typedSignature) {
            alert('Please type your signature before submitting.');
            return;
          }
          
          if (!agreeTerms) {
            alert('Please agree to the terms and conditions.');
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
            const response = await fetch('/api/contracts/sign/${contract.id}', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                clientName: document.getElementById('clientName').value,
                signature: signatureData,
                contractId: '${contract.id}',
                clientPhone: document.getElementById('clientPhone').value || null
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
        }
        
        // Analytics for signing page access
        if (typeof fetch !== 'undefined') {
          fetch('/api/analytics/signing-page-view', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contractId: '${contract.id}', timestamp: Date.now() })
          }).catch(() => {}); // Silent fail
        }
      </script>
    </body>
    </html>
  `;
}

// Upload contract signing page to cloud storage
export async function uploadContractSigningPage(
  contract: Contract,
  userSettings: UserSettings | null
): Promise<{ success: boolean; url?: string; storageKey?: string; error?: string }> {
  try {
    console.log('📤 Creating contract signing page for:', contract.contractNumber);

    // Generate HTML content
    const htmlContent = generateContractSigningPageHTML(contract, userSettings);
    const htmlBuffer = Buffer.from(htmlContent, 'utf-8');
    
    // Create storage key for HTML signing page
    const timestamp = new Date().toISOString().split('T')[0];
    const key = `signing-pages/${timestamp}/${contract.contractNumber}.html`;

    // Upload HTML to cloud
    const result = await uploadFileToCloudflare(key, htmlBuffer, 'text/html');
    
    if (result.success) {
      console.log('✅ Contract signing page uploaded successfully');
      return { success: true, url: result.url, storageKey: key };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('❌ Error creating contract signing page:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Regenerate contract signing URL
export async function regenerateContractSigningUrl(storageKey: string): Promise<string | null> {
  try {
    console.log('🔄 Regenerating signing URL for:', storageKey);

    if (!isCloudStorageConfigured()) {
      console.warn('⚠️ Cloud storage not configured for URL regeneration');
      return null;
    }

    // Generate fresh signed URL
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: storageKey,
    });

    const signedUrl = await getSignedUrl(r2Client, getCommand, { expiresIn: 7 * 24 * 60 * 60 }); // 7 days

    console.log('✅ Fresh signing URL generated successfully');
    return signedUrl;
  } catch (error) {
    console.error('❌ Error regenerating signing URL:', error);
    return null;
  }
}

// All functions are already exported individually above