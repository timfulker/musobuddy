import formData from 'form-data';
import Mailgun from 'mailgun.js';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import PDFDocument from 'pdfkit';
import Anthropic from '@anthropic-ai/sdk';

// Restored original working Mailgun configuration from before rebuild
export class MailgunService {
  private mailgun: any;
  
  constructor() {
    const mg = new Mailgun(formData);
    this.mailgun = mg.client({
      username: 'api',
      key: process.env.MAILGUN_API_KEY || '',
      url: 'https://api.eu.mailgun.net',
      public_key: process.env.MAILGUN_PUBLIC_KEY || ''
    });
  }

  async sendContractEmail(contract: any, userSettings: any, subject: string, signingUrl?: string) {
    const domain = 'mg.musobuddy.com';
    
    console.log('📧 Sending contract email with PDF attachment');
    console.log('📧 Config check:', {
      domain,
      to: contract.clientEmail,
      apiKeyExists: !!process.env.MAILGUN_API_KEY,
      contractId: contract.id
    });
    
    try {
      // Generate PDF attachment using PDFKit (Chrome-free!)
      console.log('📄 Generating PDF...');
      const pdfBuffer = await this.generateContractPDF(contract, userSettings);
      console.log('✅ PDF generated successfully, size:', pdfBuffer.length);
      
      // Use working format from pre-rebuild version (messageData.attachment format)
      const messageData: any = {
        from: `MusoBuddy <noreply@${domain}>`,
        to: contract.clientEmail,
        subject: subject || `Contract ready for signing - ${contract.contractNumber}`,
        html: this.generateContractEmailHTML(contract, userSettings, signingUrl),
        attachment: [{
          data: pdfBuffer,
          filename: `Contract-${contract.contractNumber}.pdf`,
          contentType: 'application/pdf'
        }]
      };

      console.log('📧 Sending email via Mailgun...');
      console.log('📧 Message data:', {
        from: messageData.from,
        to: messageData.to,
        subject: messageData.subject,
        hasAttachment: !!messageData.attachment,
        attachmentCount: messageData.attachment?.length || 0
      });
      
      const result = await this.mailgun.messages.create(domain, messageData);
      console.log('✅ Contract email with PDF sent successfully:', result.id);
      console.log('📧 Mailgun response:', result);
      return result;
      
    } catch (error: any) {
      console.error('❌ Contract email error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        status: error.status,
        details: error.details,
        type: error.type,
        stack: error.stack
      });
      console.error('❌ Full error object:', JSON.stringify(error, null, 2));
      throw error;
    }
  }

  async sendInvoiceEmail(invoice: any, userSettings: any, pdfUrl: string, subject: string) {
    const domain = 'mg.musobuddy.com';
    
    const emailData = {
      from: `MusoBuddy <noreply@${domain}>`,
      to: invoice.clientEmail,
      subject: subject || `Invoice ${invoice.invoiceNumber}`,
      html: this.generateInvoiceEmailHTML(invoice, userSettings, pdfUrl)
    };

    return await this.mailgun.messages.create(domain, emailData);
  }

  // CRITICAL MISSING METHOD: Generic email sending for confirmation emails
  async sendEmail(emailData: any): Promise<boolean> {
    const domain = 'mg.musobuddy.com';
    
    try {
      console.log('📧 Sending generic email via Mailgun...');
      console.log('📧 Email data:', {
        from: emailData.from,
        to: emailData.to,
        subject: emailData.subject,
        hasHtml: !!emailData.html
      });
      
      const result = await this.mailgun.messages.create(domain, {
        from: emailData.from,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html || '',
        text: emailData.text || ''
      });
      
      console.log('✅ Generic email sent successfully:', result.id);
      return true;
      
    } catch (error: any) {
      console.error('❌ Failed to send generic email:', error);
      console.error('Error details:', error.message);
      return false;
    }
  }

  // AUTOMATIC PROFESSIONAL CONTRACT PDF GENERATION
  async generateContractPDF(contract: any, userSettings: any): Promise<Buffer> {
    try {
      console.log('🚀 STARTING PDF GENERATION WITH NEW TEMPLATE...');
      console.log('📊 Contract data:', JSON.stringify({
        id: contract.id,
        clientName: contract.clientName,
        eventDate: contract.eventDate,
        fee: contract.fee
      }, null, 2));
      
      console.log('📥 Testing PROFESSIONAL contract template...');
      const { generateContractPDF: originalGenerateContractPDF } = await import('./pdf-generator-original.js');
      console.log('✅ Professional Template imported successfully');
      
      console.log('🎯 Calling ORIGINAL working generateContractPDF...');
      const result = await originalGenerateContractPDF(contract, userSettings);
      console.log('✅ ORIGINAL generateContractPDF completed, buffer size:', result.length);
      
      return result;
    } catch (error: any) {
      console.error('💥 CRITICAL ERROR in generateContractPDF:', error);
      console.error('💥 Error message:', error.message);
      console.error('💥 Error stack:', error.stack);
      
      // Don't let it fall back silently - throw the error
      throw new Error(`PDF generation failed: ${error.message}`);
    }
  }




  // REMOVED OLD HTML CONTRACT GENERATION - Now uses PDFKit template exclusively

  generateContractEmailHTML(contract: any, userSettings: any, signingUrl?: string) {
    // Use the R2 URL that was uploaded - contracts must be permanently accessible
    const finalSigningUrl = signingUrl || `${process.env.REPL_URL || 'https://musobuddy.replit.app'}/api/contracts/public/${contract.id}`;
    
    return `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <h2>Contract Ready for Signing</h2>
        <p>Dear ${contract.clientName},</p>
        <p>Your contract is ready for review and signing.</p>
        
        <div style="background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px;">
          <h3>Event Details:</h3>
          <p><strong>Date:</strong> ${new Date(contract.eventDate).toDateString()}</p>
          <p><strong>Time:</strong> ${contract.eventTime || 'TBC'}</p>
          <p><strong>Venue:</strong> ${contract.venue}</p>
          <p><strong>Fee:</strong> £${contract.fee}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${finalSigningUrl}" style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Review and Sign Contract
          </a>
        </div>
        
        <p><strong>Note:</strong> A PDF copy of the contract is attached to this email for your records.</p>
        
        <p>Best regards,<br>
        ${userSettings?.businessName || 'MusoBuddy'}</p>
      </div>
    `;
  }

  generateInvoiceEmailHTML(invoice: any, userSettings: any, pdfUrl: string) {
    return `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <h2>Invoice ${invoice.invoiceNumber}</h2>
        <p>Dear ${invoice.clientName},</p>
        <p>Please find your invoice attached.</p>
        
        <div style="background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px;">
          <h3>Invoice Details:</h3>
          <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
          <p><strong>Performance Date:</strong> ${new Date(invoice.performanceDate).toDateString()}</p>
          <p><strong>Fee:</strong> £${invoice.performanceFee}</p>
          <p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toDateString()}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${pdfUrl}" style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Download Invoice PDF
          </a>
        </div>
        
        <p>Best regards,<br>
        ${userSettings?.businessName || 'MusoBuddy'}</p>
      </div>
    `;
  }
}

// Cloud Storage Service (Cloudflare R2)
export class CloudStorageService {
  private s3: S3Client;
  private bucketName: string;

  constructor() {
    this.bucketName = process.env.R2_BUCKET_NAME || 'musobuddy';
    
    const accountId = process.env.R2_ACCOUNT_ID;
    if (!accountId) {
      throw new Error('R2_ACCOUNT_ID is required for Cloudflare R2');
    }
    
    this.s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || ''
      }
    });
  }

  async uploadContractSigningPage(contract: any, userSettings: any): Promise<{url: string, key: string}> {
    const htmlContent = this.generateContractHTML(contract, userSettings);
    const key = `contracts/signing/${contract.id}-${Date.now()}.html`;
    
    // Upload to R2 with public access
    await this.s3.send(new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: htmlContent,
      ContentType: 'text/html',
      CacheControl: 'public, max-age=31536000',
      ACL: 'public-read'
    }));

    // Use the R2 public development URL
    const url = `https://pub-446248abf8164fb99bee2fc3dc3c513c.r2.dev/${key}`;
    return { url, key };
  }

  async uploadInvoiceToCloud(invoice: any, userSettings: any): Promise<{url: string, key: string}> {
    // Generate HTML invoice instead of PDF
    const htmlContent = this.generateInvoiceHTML(invoice, userSettings);
    const key = `invoices/${invoice.id}-${Date.now()}.html`;
    
    await this.s3.send(new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: htmlContent,
      ContentType: 'text/html'
    }));

    const url = await getSignedUrl(this.s3, new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key
    }), { expiresIn: 86400 * 30 }); // 30 days

    return { url, key };
  }

  private generateContractHTML(contract: any, userSettings: any): string {
    // RESTORED ORIGINAL WORKING CONTRACT SIGNING PAGE from pre-rebuild system
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
            color: #374151;
            margin-bottom: 15px;
        }
        
        .terms-content h4 {
            color: #374151;
            margin: 20px 0 10px 0;
            font-size: 1.1rem;
        }
        
        .terms-content p {
            margin-bottom: 10px;
            text-align: justify;
        }
        
        .terms-content ul {
            margin-left: 20px;
            margin-bottom: 15px;
        }
        
        .terms-content li {
            margin-bottom: 5px;
        }
        
        .signing-section {
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }
        
        .signing-section h2 {
            color: #1e293b;
            margin-bottom: 20px;
            font-size: 1.5rem;
        }
        
        .form-group {
            margin-bottom: 20px;
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
        
        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
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
                    <div class="detail-value">£${contract.deposit || '0'}</div>
                </div>
            </div>
        </div>
        
        <div class="signing-section" id="signing-section" style="display: ${isAlreadySigned ? 'none' : 'block'};">
            <h2>Complete Required Information & Sign</h2>
            <p style="margin-bottom: 30px; color: #64748b;">
                Please complete any missing required fields and provide your digital signature to confirm acceptance.
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
                    <input type="text" id="typedSignature" class="form-input" value="${contract.clientName}" placeholder="Type your full name here" style="font-family: 'Brush Script MT', cursive, serif; font-size: 1.5rem; text-align: center; padding: 20px;">
                    <p style="font-size: 0.9rem; color: #64748b; margin-top: 10px; text-align: center;">
                        Your signature will be formatted in a stylized font for the contract
                    </p>
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
    </div>
    
    <script>
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



  private generateInvoiceHTML(invoice: any, userSettings: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; }
        .header { text-align: center; margin-bottom: 40px; }
        .invoice-details { margin: 30px 0; }
        .table { width: 100%; border-collapse: collapse; }
        .table th, .table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        .total { background: #f8f9fa; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h1>INVOICE</h1>
        <h2>${invoice.invoiceNumber}</h2>
    </div>

    <div class="invoice-details">
        <p><strong>Bill To:</strong><br>
        ${invoice.clientName}<br>
        ${invoice.clientAddress || ''}</p>
        
        <p><strong>Invoice Date:</strong> ${new Date(invoice.createdAt).toDateString()}</p>
        <p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toDateString()}</p>
        <p><strong>Performance Date:</strong> ${new Date(invoice.performanceDate).toDateString()}</p>
        <p><strong>Venue:</strong> ${invoice.venue}</p>
    </div>

    <table class="table">
        <thead>
            <tr>
                <th>Description</th>
                <th>Amount</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Musical Performance</td>
                <td>£${invoice.performanceFee}</td>
            </tr>
            <tr class="total">
                <td><strong>Total Due</strong></td>
                <td><strong>£${invoice.performanceFee}</strong></td>
            </tr>
        </tbody>
    </table>

    <div style="margin-top: 40px;">
        <h3>Payment Instructions</h3>
        <p>Please remit payment by the due date above.</p>
        <p>Thank you for your business!</p>
    </div>
</body>
</html>
    `;
  }
}

// AI Contract Parser Service
export class ContractParserService {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || ''
    });
  }

  async parseContractWithAI(contractText: string): Promise<any> {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('Anthropic API key not configured');
    }

    const prompt = `Extract booking information from this Musicians Union contract text. Focus on the HIRER (client) details, NOT the musician.

Contract text:
${contractText}

Extract in JSON format:
{
  "clientName": "hirer's name",
  "clientEmail": "hirer's email", 
  "clientPhone": "hirer's phone",
  "venue": "venue name",
  "venueAddress": "venue address",
  "eventDate": "YYYY-MM-DD",
  "eventTime": "HH:MM",
  "eventEndTime": "HH:MM", 
  "fee": "numeric amount only",
  "equipmentRequirements": "equipment details",
  "specialRequirements": "special requirements"
}

Rules:
- Extract the HIRER/CLIENT information, not the musician (Tim Fulker)
- For fee, return only the numeric amount (e.g., 220, not "£220")
- If information is not found, use null
- For clientName, look for "Print Name" in the hirer section or names in "between X and Tim Fulker"`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const content = response.content[0];
      if (content.type === 'text') {
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }
      
      throw new Error('No valid JSON found in AI response');
    } catch (error) {
      console.error('AI parsing failed:', error);
      throw error;
    }
  }
}

// Service instances
export const mailgunService = new MailgunService();
export const cloudStorageService = new CloudStorageService();
export const contractParserService = new ContractParserService();