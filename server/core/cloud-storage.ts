import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Contract, Invoice, UserSettings } from '@shared/schema';
import { generateContractPDF, generateInvoicePDF } from './pdf-generator';

// Cloudflare R2 configuration
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'musobuddy-storage';

// Check if cloud storage is configured
export function isCloudStorageConfigured(): boolean {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME
  );
}

// Upload file to Cloudflare R2 with public access
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
      Metadata: {
        'public-access': 'true'
      }
    });

    await r2Client.send(command);

    // Now that public access is enabled, use direct public URLs for all files
    let publicUrl;
    if (contentType === 'text/html') {
      // Use direct public URL for HTML signing pages since public access is enabled
      publicUrl = `https://pub-446248abf8164fb99bee2fc3dc3c513c.r2.dev/${key}`;
      console.log(`✅ Public URL generated for signing page: ${key}`);
    } else {
      // For PDFs, use the correct public URL format
      publicUrl = `https://pub-446248abf8164fb99bee2fc3dc3c513c.r2.dev/${key}`;
      console.log(`✅ File uploaded to cloud storage: ${key}`);
    }

    console.log(`🔗 Access URL: ${publicUrl}`);
    return { success: true, url: publicUrl };
  } catch (error) {
    console.error('❌ Cloud storage upload failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Upload contract PDF to cloud storage
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
    console.log('📤 Uploading contract PDF to cloud storage:', contract.contractNumber);

    // Generate PDF
    const pdfBuffer = await generateContractPDF(contract, userSettings, signatureDetails);

    // Create storage key for PDF
    const timestamp = new Date().toISOString().split('T')[0];
    const sanitizedContractNumber = contract.contractNumber.replace(/[^a-zA-Z0-9-_]/g, '-');
    const signed = signatureDetails ? '-signed' : '';
    const key = `contracts/${timestamp}/${sanitizedContractNumber}${signed}.pdf`;

    // Upload to cloud
    const result = await uploadFileToCloudflare(key, pdfBuffer, 'application/pdf');

    if (result.success) {
      console.log('✅ Contract PDF uploaded successfully to cloud storage');
      return { success: true, url: result.url, key };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('❌ Error uploading contract PDF to cloud:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Upload invoice PDF to cloud storage (COPIED FROM CONTRACT ARCHITECTURE)
export async function uploadInvoiceToCloud(
  invoice: Invoice,
  userSettings: UserSettings | null
): Promise<{ success: boolean; url?: string; key?: string; error?: string }> {
  try {
    console.log('📤 Uploading invoice PDF to cloud storage:', invoice.invoiceNumber);

    // Generate PDF
    const pdfBuffer = await generateInvoicePDF(invoice, userSettings);

    // Create storage key for PDF
    const timestamp = new Date().toISOString().split('T')[0];
    const sanitizedInvoiceNumber = invoice.invoiceNumber.replace(/[^a-zA-Z0-9-_]/g, '-');
    const key = `invoices/${timestamp}/${sanitizedInvoiceNumber}.pdf`;

    // Upload to cloud
    const result = await uploadFileToCloudflare(key, pdfBuffer, 'application/pdf');

    if (result.success) {
      console.log('✅ Invoice PDF uploaded successfully to cloud storage');
      return { success: true, url: result.url, key };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('❌ Error uploading invoice PDF to cloud:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Upload invoice PDF to cloud storage
export async function uploadInvoiceToCloud(
  invoice: Invoice,
  contract: Contract | null,
  userSettings: UserSettings | null
): Promise<{ success: boolean; url?: string; key?: string; error?: string }> {
  try {
    console.log('📤 Uploading invoice PDF to cloud storage:', invoice.invoiceNumber);

    // Generate PDF
    const pdfBuffer = await generateInvoicePDF(invoice, contract, userSettings);

    // Create storage key
    const timestamp = new Date().toISOString().split('T')[0];
    const key = `invoices/${timestamp}/${invoice.invoiceNumber}.pdf`;

    // Upload to cloud
    const result = await uploadFileToCloudflare(key, pdfBuffer, 'application/pdf');

    if (result.success) {
      console.log('✅ Invoice PDF uploaded successfully to cloud storage');
      return { success: true, url: result.url, key };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('❌ Error uploading invoice PDF to cloud:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Generate HTML for contract signing page - FIXED with proper URL handling
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

  // CRITICAL: Use app server for API calls, cloud storage for documents
  // Dynamic URL based on environment
  const APP_SERVER_URL = process.env.NODE_ENV === 'production' 
    ? 'https://musobuddy.replit.app' 
    : 'http://localhost:5000';
  const contractId = contract.id;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign Contract - ${contract.contractNumber}</title>
  <style>
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      line-height: 1.6; 
      color: #333; 
      max-width: 800px; 
      margin: 0 auto; 
      padding: 20px; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
    }
    .container {
      background: white;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }
    .header { 
      text-align: center; 
      margin-bottom: 30px; 
      padding: 20px; 
      background: #f8fafc; 
      border-radius: 8px; 
    }
    .title { 
      color: #2563eb; 
      font-size: 28px; 
      margin-bottom: 10px; 
      font-weight: bold;
    }
    .contract-details { 
      background: #fff; 
      padding: 20px; 
      border: 1px solid #e2e8f0; 
      border-radius: 8px; 
      margin: 20px 0; 
    }
    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin: 20px 0;
    }
    @media (max-width: 600px) {
      .detail-grid { grid-template-columns: 1fr; }
    }
    .detail-item {
      background: #f8fafc;
      padding: 15px;
      border-radius: 6px;
      border-left: 4px solid #3b82f6;
    }
    .detail-label { 
      font-weight: bold; 
      color: #64748b; 
      display: block;
      margin-bottom: 5px;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .detail-value { 
      color: #1e293b; 
      font-size: 16px;
      font-weight: 500;
    }
    .fee-highlight { 
      background: #f0f9ff; 
      padding: 20px; 
      border-radius: 8px; 
      margin: 20px 0; 
      border-left: 4px solid #3b82f6; 
      text-align: center;
    }
    .signing-section { 
      background: #f9fafb; 
      padding: 30px; 
      border-radius: 8px; 
      margin: 30px 0; 
      text-align: center; 
    }
    .form-group {
      margin: 15px 0;
      text-align: left;
    }
    .form-group label {
      display: block;
      margin-bottom: 8px;
      color: #374151;
      font-weight: 500;
      font-size: 16px;
    }
    .form-group input {
      width: 100%;
      padding: 12px;
      border: 2px solid #d1d5db;
      border-radius: 6px;
      font-size: 16px;
      box-sizing: border-box;
      transition: border-color 0.3s;
    }
    .form-group input:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
    .sign-button { 
      background: #2563eb; 
      color: white; 
      padding: 16px 32px; 
      border: none; 
      border-radius: 8px; 
      font-size: 18px; 
      font-weight: bold;
      cursor: pointer; 
      margin: 20px 10px; 
      transition: all 0.3s;
    }
    .sign-button:hover:not(:disabled) { 
      background: #1d4ed8; 
      transform: translateY(-2px);
    }
    .sign-button:disabled {
      background: #9ca3af;
      cursor: not-allowed;
      transform: none;
    }
    .download-button { 
      background: #059669; 
      color: white; 
      padding: 15px 30px; 
      border: none; 
      border-radius: 8px; 
      font-size: 16px; 
      cursor: pointer; 
      text-decoration: none; 
      display: inline-block; 
      margin: 20px 10px; 
      transition: all 0.3s;
    }
    .download-button:hover { 
      background: #047857; 
      transform: translateY(-2px);
    }
    .footer { 
      text-align: center; 
      margin-top: 40px; 
      padding-top: 20px; 
      border-top: 1px solid #e2e8f0; 
      color: #64748b; 
      font-size: 14px; 
    }
    .success-message {
      display: none;
      background: #d1fae5;
      color: #065f46;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      border: 1px solid #10b981;
    }
    .error-message {
      display: none;
      background: #fee2e2;
      color: #dc2626;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      border: 1px solid #f87171;
    }
    .loading {
      display: none;
      text-align: center;
      color: #6b7280;
      margin: 20px 0;
    }
    .cloud-notice {
      background: #e0f2fe;
      border: 1px solid #0891b2;
      border-radius: 8px;
      padding: 12px;
      margin: 20px 0;
      font-size: 14px;
      color: #0f4f5c;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title">📝 Performance Contract</div>
      <div style="font-size: 18px; color: #64748b;">${contract.contractNumber}</div>
      <div style="font-size: 16px; color: #64748b; margin-top: 10px;">From ${businessName}</div>
    </div>

    <div class="cloud-notice">
      <strong>☁️ Cloud Hosted:</strong> This contract signing page is hosted independently on cloud storage and will remain accessible even if the main app is offline.
    </div>

    <div class="contract-details">
      <h3 style="color: #1e293b; margin-top: 0;">Event Details</h3>

      <div class="detail-grid">
        <div class="detail-item">
          <span class="detail-label">Client Name</span>
          <div class="detail-value">${contract.clientName}</div>
        </div>

        <div class="detail-item">
          <span class="detail-label">Performance Date</span>
          <div class="detail-value">${formatDate(contract.eventDate)}</div>
        </div>

        <div class="detail-item">
          <span class="detail-label">Time</span>
          <div class="detail-value">${contract.eventTime || 'TBC'}</div>
        </div>

        <div class="detail-item">
          <span class="detail-label">Venue</span>
          <div class="detail-value">${contract.venue}</div>
        </div>
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
      <p>Please review the contract details above and complete the form below to sign digitally.</p>

      <form id="signingForm" style="margin-top: 30px;">
        <div class="form-group">
          <label for="signatureName">Full Name (Digital Signature) *</label>
          <input 
            type="text" 
            id="signatureName" 
            name="signatureName"
            value="${contract.clientName}" 
            required
            placeholder="Enter your full name as it appears on the contract"
          />
        </div>

        <div class="form-group">
          <label for="clientPhone">Phone Number (Optional)</label>
          <input 
            type="tel" 
            id="clientPhone" 
            name="clientPhone"
            value="${contract.clientPhone || ''}"
            placeholder="Your contact phone number"
          />
        </div>

        <div class="form-group">
          <label for="clientAddress">Your Address (Optional)</label>
          <input 
            type="text" 
            id="clientAddress" 
            name="clientAddress"
            value="${contract.clientAddress || ''}"
            placeholder="Your full address"
          />
        </div>

        <div class="form-group">
          <label for="venueAddress">Event Venue Address (Optional)</label>
          <input 
            type="text" 
            id="venueAddress" 
            name="venueAddress"
            value="${contract.venueAddress || ''}"
            placeholder="Full address of the event venue"
          />
        </div>

        <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: left;">
          <p style="margin: 0; color: #92400e; font-size: 0.95rem;">
            <strong>Legal Notice:</strong> By clicking "Sign Contract" below, you agree to all terms and conditions outlined in this performance contract. This constitutes a legally binding digital signature.
          </p>
        </div>

        <button type="submit" class="sign-button" id="signButton">
          ✍️ Sign Contract
        </button>
      </form>

      <div style="margin-top: 20px;">
        <a href="${APP_SERVER_URL}/api/contracts/${contractId}/download" class="download-button">
          📄 Download PDF Copy
        </a>
      </div>

      <div class="loading" id="loadingMessage">
        <p>⏳ Processing your signature...</p>
      </div>

      <div class="error-message" id="errorMessage">
        <h4 style="margin-top: 0;">❌ Signature Error</h4>
        <p id="errorText">There was an error processing your signature. Please try again.</p>
      </div>

      <div class="success-message" id="successMessage">
        <h4 style="margin-top: 0;">✅ Contract Signed Successfully!</h4>
        <p>Thank you! Your signature has been recorded and both parties will receive confirmation emails.</p>
      </div>
    </div>

    <div class="footer">
      <p>This contract signing page is hosted independently for your convenience.</p>
      <p>Powered by MusoBuddy – less admin, more music</p>
    </div>
  </div>

  <script>
    console.log('🔍 Contract signing page loaded for contract ID: ${contractId}');
    console.log('🌐 Page hosted on cloud storage, API calls to app server');

    document.getElementById('signingForm').addEventListener('submit', async function(e) {
      e.preventDefault();

      const signatureName = document.getElementById('signatureName').value.trim();
      const signButton = document.getElementById('signButton');
      const loadingMessage = document.getElementById('loadingMessage');
      const errorMessage = document.getElementById('errorMessage');
      const successMessage = document.getElementById('successMessage');

      console.log('📝 Starting contract signing process...');

      // Reset messages
      errorMessage.style.display = 'none';
      successMessage.style.display = 'none';

      // Validation
      if (!signatureName) {
        alert('Please enter your full name to sign the contract.');
        return;
      }

      // Show loading
      signButton.disabled = true;
      loadingMessage.style.display = 'block';

      // Collect form data
      const formData = {
        signatureName: signatureName,
        clientPhone: document.getElementById('clientPhone').value.trim() || null,
        clientAddress: document.getElementById('clientAddress').value.trim() || null,
        venueAddress: document.getElementById('venueAddress').value.trim() || null
      };

      console.log('📤 Sending signing request with data:', formData);

      try {
        // API call to app server (not cloud storage)
        const apiUrl = '${APP_SERVER_URL}/api/contracts/sign/${contractId}';
        console.log('🔗 Using API URL:', apiUrl);

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(formData)
        });

        console.log('📥 Response status:', response.status);

        let result;
        const responseText = await response.text();
        console.log('📥 Raw response preview:', responseText.substring(0, 200) + '...');

        try {
          result = JSON.parse(responseText);
        } catch (parseError) {
          console.error('❌ JSON parse error:', parseError);
          throw new Error('Server returned invalid response. Please try again.');
        }

        loadingMessage.style.display = 'none';

        if (response.ok && result.success) {
          console.log('✅ Contract signed successfully!');
          successMessage.style.display = 'block';
          document.getElementById('signingForm').style.display = 'none';

          // Show download option after successful signing
          setTimeout(() => {
            const downloadBtn = document.createElement('a');
            downloadBtn.href = '${APP_SERVER_URL}/api/contracts/${contractId}/download';
            downloadBtn.className = 'download-button';
            downloadBtn.style.display = 'inline-block';
            downloadBtn.style.textDecoration = 'none';
            downloadBtn.innerHTML = '📄 Download Signed Contract';
            successMessage.appendChild(document.createElement('br'));
            successMessage.appendChild(downloadBtn);
          }, 2000);

        } else if (result.alreadySigned) {
          console.log('⚠️ Contract already signed');
          errorMessage.style.display = 'block';
          document.getElementById('errorText').innerHTML = 
            '<strong>This contract has already been signed.</strong><br>' + 
            'Signed on: ' + new Date(result.signedAt).toLocaleString('en-GB') + '<br>' +
            'Signed by: ' + result.signedBy;
          document.getElementById('signingForm').style.display = 'none';

        } else {
          throw new Error(result.message || 'Failed to sign contract');
        }

      } catch (error) {
        console.error('❌ Signing error:', error);
        loadingMessage.style.display = 'none';
        errorMessage.style.display = 'block';
        document.getElementById('errorText').textContent = 
          error.message || 'Network error. Please check your connection and try again.';
      } finally {
        signButton.disabled = false;
      }
    });
  </script>
</body>
</html>`;
}

// Upload contract signing page to cloud storage
export async function uploadContractSigningPage(
  contract: Contract,
  userSettings: UserSettings | null
): Promise<{ success: boolean; url?: string; storageKey?: string; error?: string }> {
  try {
    console.log('📤 Creating cloud-hosted contract signing page for:', contract.contractNumber);

    // Generate HTML content with proper URL interpolation
    const htmlContent = generateContractSigningPageHTML(contract, userSettings);
    const htmlBuffer = Buffer.from(htmlContent, 'utf-8');

    // Create storage key for HTML signing page
    const timestamp = new Date().toISOString().split('T')[0];
    const sanitizedContractNumber = contract.contractNumber.replace(/[^a-zA-Z0-9-_]/g, '-');
    const key = `signing-pages/${timestamp}/${sanitizedContractNumber}-${contract.id}.html`;

    // Upload HTML to cloud
    const result = await uploadFileToCloudflare(key, htmlBuffer, 'text/html');

    if (result.success) {
      console.log('✅ Contract signing page uploaded successfully to cloud storage');
      console.log('🔗 Cloud-hosted signing page URL:', result.url);
      return { success: true, url: result.url, storageKey: key };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('❌ Error creating cloud-hosted contract signing page:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Regenerate contract signing URL (for cloud-hosted pages)
export async function regenerateContractSigningUrl(storageKey: string): Promise<string | null> {
  try {
    console.log('🔄 Regenerating cloud signing URL for:', storageKey);

    if (!isCloudStorageConfigured()) {
      console.warn('⚠️ Cloud storage not configured for URL regeneration');
      return null;
    }

    // For public bucket, just reconstruct the URL
    const publicUrl = `https://pub-${process.env.R2_ACCOUNT_ID}.r2.dev/${storageKey}`;

    console.log('✅ Cloud signing URL regenerated:', publicUrl);
    return publicUrl;
  } catch (error) {
    console.error('❌ Error regenerating cloud signing URL:', error);
    return null;
  }
}