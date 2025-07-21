import formData from 'form-data';
import Mailgun from 'mailgun.js';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import puppeteer from 'puppeteer';
import Anthropic from '@anthropic-ai/sdk';

// Mailgun Service
export class MailgunService {
  private mailgun: any;
  
  constructor() {
    const mg = new Mailgun(formData);
    this.mailgun = mg.client({
      username: 'api',
      key: process.env.MAILGUN_API_KEY || '',
      url: 'https://api.eu.mailgun.net'
    });
  }

  async sendContractEmail(contract: any, userSettings: any, subject: string, signingUrl?: string) {
    const domain = 'mg.musobuddy.com';
    
    const emailData = {
      from: `MusoBuddy <noreply@${domain}>`,
      to: contract.clientEmail,
      subject: subject || `Contract ready for signing - ${contract.contractNumber}`,
      html: this.generateContractEmailHTML(contract, userSettings, signingUrl)
    };

    return await this.mailgun.messages.create(domain, emailData);
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

  private generateContractEmailHTML(contract: any, userSettings: any, signingUrl?: string) {
    const finalSigningUrl = signingUrl || `${process.env.REPL_URL || 'https://musobuddy.replit.app'}/api/contracts/sign/${contract.id}`;
    
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
        
        <p>Best regards,<br>
        ${userSettings?.businessName || 'MusoBuddy'}</p>
      </div>
    `;
  }

  private generateInvoiceEmailHTML(invoice: any, userSettings: any, pdfUrl: string) {
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
    
    await this.s3.send(new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: htmlContent,
      ContentType: 'text/html'
    }));

    const accountId = process.env.R2_ACCOUNT_ID;
    const url = `https://${this.bucketName}.${accountId}.r2.cloudflarestorage.com/${key}`;
    return { url, key };
  }

  async uploadInvoiceToCloud(invoice: any, userSettings: any): Promise<{url: string, key: string}> {
    const pdfBuffer = await this.generateInvoicePDF(invoice, userSettings);
    const key = `invoices/${invoice.id}-${Date.now()}.pdf`;
    
    await this.s3.send(new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: pdfBuffer,
      ContentType: 'application/pdf'
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
                fetch('/api/contracts/sign/${contract.id}', {
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
                    alert('Error signing contract. Please try again.');
                });
            }
        }
    </script>
</body>
</html>
    `;
  }

  private async generateInvoicePDF(invoice: any, userSettings: any): Promise<Buffer> {
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      const html = this.generateInvoiceHTML(invoice, userSettings);
      
      await page.setContent(html);
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' }
      });
      
      return pdfBuffer;
    } finally {
      await browser.close();
    }
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