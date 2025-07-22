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

  // AUTOMATIC PROFESSIONAL CONTRACT PDF GENERATION
  async generateContractPDF(contract: any, userSettings: any): Promise<Buffer> {
    // Use the exact Andy Urquahart format
    const { generateAndyUrquhartContract } = await import('./contract-template');
    return generateAndyUrquhartContract(contract, userSettings);
  }




  generateContractHTML(contract: any, userSettings: any): string {
    const formatDate = (date: any) => {
      if (!date) return 'Not specified';
      const d = new Date(date);
      return d.toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
    };

    const formatTime = (time: any) => {
      if (!time) return 'Not specified';
      return time;
    };

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Times New Roman', serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 40px; }
    .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #333; padding-bottom: 20px; }
    .section { margin: 30px 0; }
    .section-title { font-weight: bold; font-size: 16px; margin-bottom: 10px; text-decoration: underline; }
    .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
    .detail-box { border: 1px solid #ccc; padding: 15px; background: #f9f9f9; }
    .signature-section { margin-top: 60px; display: grid; grid-template-columns: 1fr 1fr; gap: 60px; }
    .signature-box { border-top: 2px solid #333; padding-top: 10px; text-align: center; }
    .terms { font-size: 12px; line-height: 1.4; }
    .contract-number { color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>MUSIC PERFORMANCE CONTRACT</h1>
    <p class="contract-number">Contract #${contract.contractNumber || contract.id}</p>
  </div>

  <div class="section">
    <div class="section-title">PERFORMANCE DETAILS</div>
    <div class="details-grid">
      <div class="detail-box">
        <strong>Event Date:</strong><br>
        ${formatDate(contract.eventDate)}
      </div>
      <div class="detail-box">
        <strong>Performance Time:</strong><br>
        ${formatTime(contract.eventTime)} - ${formatTime(contract.eventEndTime)}
      </div>
      <div class="detail-box">
        <strong>Venue:</strong><br>
        ${contract.venue || 'Not specified'}
      </div>
      <div class="detail-box">
        <strong>Venue Address:</strong><br>
        ${contract.venueAddress || 'Not specified'}
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">CLIENT INFORMATION</div>
    <div class="details-grid">
      <div class="detail-box">
        <strong>Client Name:</strong><br>
        ${contract.clientName || 'Not specified'}
      </div>
      <div class="detail-box">
        <strong>Email:</strong><br>
        ${contract.clientEmail || 'Not specified'}
      </div>
      <div class="detail-box">
        <strong>Phone:</strong><br>
        ${contract.clientPhone || 'Not specified'}
      </div>
      <div class="detail-box">
        <strong>Address:</strong><br>
        ${contract.clientAddress || 'Not specified'}
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">FINANCIAL TERMS</div>
    <div class="detail-box">
      <strong>Performance Fee:</strong> £${contract.fee || '0.00'}<br>
      <strong>Payment Terms:</strong> ${contract.paymentTerms || 'Due on performance date'}
    </div>
  </div>

  <div class="section">
    <div class="section-title">TECHNICAL REQUIREMENTS</div>
    <div class="detail-box">
      <strong>Equipment Requirements:</strong><br>
      ${contract.equipmentRequirements || 'Standard setup - microphone and suitable power supply'}
    </div>
    <div class="detail-box">
      <strong>Special Requirements:</strong><br>
      ${contract.specialRequirements || 'None specified'}
    </div>
  </div>

  <div class="section terms">
    <div class="section-title">TERMS AND CONDITIONS</div>
    <p>1. This agreement is between ${userSettings?.firstName || 'Tim'} ${userSettings?.lastName || 'Fulker'} (the "Performer") and ${contract.clientName || 'the Client'} for musical entertainment services.</p>
    <p>2. The Performer agrees to provide live musical entertainment at the specified venue, date, and time.</p>
    <p>3. Payment is due as specified above. Late payments may incur additional charges.</p>
    <p>4. Cancellation by the Client within 7 days of the event date will result in full payment being due.</p>
    <p>5. The Performer reserves the right to use a suitable substitute in case of illness or emergency.</p>
    <p>6. This contract represents the entire agreement between parties and supersedes all prior negotiations.</p>
  </div>

  <div class="signature-section">
    <div class="signature-box">
      <strong>Performer</strong><br>
      ${userSettings?.firstName || 'Tim'} ${userSettings?.lastName || 'Fulker'}<br>
      Date: _________________
    </div>
    <div class="signature-box">
      <strong>Client</strong><br>
      ${contract.clientName || 'Client Name'}<br>
      Date: _________________
    </div>
  </div>
</body>
</html>`;
  }

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
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Contract Signing - ${contract.contractNumber}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 40px; }
        .contract-details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .sign-button { background: #6366f1; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; }
        .terms { margin: 30px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Performance Contract</h1>
        <h2>${contract.contractNumber}</h2>
    </div>

    <div class="contract-details">
        <h3>Event Details</h3>
        <p><strong>Client:</strong> ${contract.clientName}</p>
        <p><strong>Date:</strong> ${new Date(contract.eventDate).toDateString()}</p>
        <p><strong>Time:</strong> ${contract.eventTime} - ${contract.eventEndTime || 'TBC'}</p>
        <p><strong>Venue:</strong> ${contract.venue}</p>
        <p><strong>Performance Fee:</strong> £${contract.fee}</p>
    </div>

    <div class="terms">
        <h3>Terms & Conditions</h3>
        <p>1. Payment is due on the date of performance unless otherwise agreed.</p>
        <p>2. All equipment is provided by the performer unless specified otherwise.</p>
        <p>3. The venue must provide safe access to electricity and ensure security.</p>
        <p>4. No recording or transmission without written consent from the performer.</p>
    </div>

    <div style="text-align: center; margin: 40px 0;">
        <button class="sign-button" onclick="signContract()">Sign Contract</button>
    </div>

    <script>
        function signContract() {
            if (confirm('By signing this contract, you agree to all terms and conditions. Continue?')) {
                fetch('https://musobuddy.replit.app/api/contracts/sign/${contract.id}', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ signature: '${contract.clientName}', signedAt: new Date().toISOString() })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        document.body.innerHTML = '<div style="text-align:center;padding:50px;"><h2>✅ Contract Signed Successfully</h2><p>Thank you for signing the contract. You will receive a confirmation email shortly.</p></div>';
                    } else {
                        alert('Error signing contract. Please try again.');
                    }
                })
                .catch(error => {
                    console.error('Signing error:', error);
                    alert('Error signing contract. Please try again.');
                });
            }
        }
    </script>
</body>
</html>
    `;
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