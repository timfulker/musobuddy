import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import Mailgun from 'mailgun.js';
import FormData from 'form-data';

export class EmailService {
  private mailgun: any;

  constructor() {
    if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN) {
      console.warn('⚠️ Mailgun not configured - email features will be disabled');
      return;
    }

    const mailgun = new Mailgun(FormData);
    this.mailgun = mailgun.client({
      username: 'api',
      key: process.env.MAILGUN_API_KEY || '',
      url: 'https://api.eu.mailgun.net'
    });
  }

  async sendEmail(emailData: any) {
    if (!this.mailgun) {
      console.log('📧 Mailgun not configured, skipping email');
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const domain = process.env.MAILGUN_DOMAIN;
      
      const messageData: any = {
        from: emailData.from || `MusoBuddy <noreply@${domain}>`,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html
      };

      if (emailData.attachments) {
        messageData.attachment = emailData.attachments;
      }

      console.log(`📧 Sending email: ${emailData.subject}`);
      const result = await this.mailgun.messages.create(domain, messageData);
      
      return {
        success: true,
        messageId: result.id,
        status: result.status || 'sent'
      };
    } catch (error: any) {
      console.error('❌ Failed to send email:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email'
      };
    }
  }

  // Contract PDF generation - will be rebuilt from scratch
  async generateContractPDF(contract: any, userSettings: any): Promise<Buffer> {
    throw new Error('Contract PDF generation system needs to be rebuilt');
  }

  // Invoice PDF generation method (working and isolated)
  async generateInvoicePDF(invoice: any, userSettings: any): Promise<Buffer> {
    try {
      console.log('🚀 Calling dedicated invoice PDF generator...');
      
      const { generateInvoicePDF: originalGenerateInvoicePDF } = await import('./invoice-pdf-generator');
      console.log('✅ Invoice PDF generator imported successfully');
      
      console.log('🎯 Calling generateInvoicePDF...');
      const result = await originalGenerateInvoicePDF(invoice, userSettings);
      console.log('✅ Invoice PDF generation completed, buffer size:', result.length);
      
      return result;
    } catch (error: any) {
      console.error('💥 CRITICAL ERROR in generateInvoicePDF:', error);
      throw new Error(`Invoice PDF generation failed: ${error.message}`);
    }
  }

  // Email template for contract signing
  generateContractEmailHTML(contract: any, userSettings: any, signingUrl: string, customMessage?: string) {
    return `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <h2>Contract Ready for Signing</h2>
        <p>Dear ${contract.clientName},</p>
        ${customMessage ? `<p>${customMessage}</p>` : ''}
        <p>Your contract is ready for review and signing.</p>
        
        <div style="background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px;">
          <h3>Event Details:</h3>
          <p><strong>Date:</strong> ${new Date(contract.eventDate).toDateString()}</p>
          <p><strong>Time:</strong> ${contract.eventTime || 'TBC'}</p>
          <p><strong>Venue:</strong> ${contract.venue}</p>
          <p><strong>Fee:</strong> £${contract.fee}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${signingUrl}" style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Review and Sign Contract
          </a>
        </div>
        
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