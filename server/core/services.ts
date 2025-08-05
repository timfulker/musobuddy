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
    
    console.log('🔧 Mailgun client config:', {
      domain: process.env.MAILGUN_DOMAIN,
      keyPrefix: process.env.MAILGUN_API_KEY?.substring(0, 8) + '...',
      endpoint: 'EU'
    });
    
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
      // CRITICAL WORKAROUND: Force correct production domain since ENV is set to sandbox
      const domain = 'mg.musobuddy.com';
      
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
      console.log(`📧 From: ${messageData.from}`);  
      console.log(`📧 To: ${messageData.to}`);
      console.log(`📧 Domain: ${domain} (FORCED PRODUCTION OVERRIDE)`);
      
      const result = await this.mailgun.messages.create(domain, messageData);
      
      return {
        success: true,
        messageId: result.id,
        status: result.status || 'sent'
      };
    } catch (error: any) {
      console.error('❌ Failed to send email - FULL ERROR:', error);
      console.error('❌ Error details:', {
        message: error.message,
        status: error.status,
        details: error.details,
        type: error.type,
        stack: error.stack?.substring(0, 200)
      });
      return {
        success: false,
        error: error.message || 'Failed to send email'
      };
    }
  }

  // Contract PDF generation using professional template
  async generateContractPDF(contract: any, userSettings: any): Promise<Buffer> {
    try {
      console.log('🚀 Calling professional contract PDF generator...');
      
      const { generateContractPDF: professionalGenerateContractPDF } = await import('./contract-pdf-generator');
      console.log('✅ Professional contract PDF generator imported successfully');
      
      console.log('🎯 Generating professional contract PDF...');
      const result = await professionalGenerateContractPDF(contract, userSettings);
      console.log('✅ Professional contract PDF generation completed, buffer size:', result.length);
      
      return result;
    } catch (error: any) {
      console.error('💥 CRITICAL ERROR in generateContractPDF:', error);
      throw new Error(`Contract PDF generation failed: ${error.message}`);
    }
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

  // Send contract email with R2 URL
  async sendContractEmail(contract: any, userSettings: any, subject: string, contractUrl: string, customMessage?: string) {
    if (!this.mailgun) {
      console.log('📧 Mailgun not configured, skipping contract email');
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Contract Ready for Signing</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1e3a8a;">Contract Ready for Your Signature</h2>
            
            <p>Dear ${contract.clientName},</p>
            
            ${customMessage ? `<p>${customMessage}</p>` : ''}
            
            <p>Your contract for the event on ${new Date(contract.eventDate).toLocaleDateString('en-GB')} is ready for signing.</p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Event Details:</h3>
              <p><strong>Date:</strong> ${new Date(contract.eventDate).toLocaleDateString('en-GB')}</p>
              <p><strong>Time:</strong> ${contract.eventTime} - ${contract.eventEndTime}</p>
              <p><strong>Venue:</strong> ${contract.venue}</p>
              <p><strong>Fee:</strong> £${contract.fee}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${contractUrl}" 
                 style="background: #1e3a8a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                View & Sign Contract
              </a>
            </div>
            
            <p>Please review and sign the contract at your earliest convenience.</p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="font-size: 14px; color: #666;">
              Best regards,<br>
              ${userSettings?.businessName || 'MusoBuddy Team'}<br>
              ${userSettings?.businessEmail || ''}
            </p>
          </div>
        </body>
        </html>
      `;

      const emailData = {
        to: contract.clientEmail,
        subject: subject,
        html: emailHtml
        // Remove custom 'from' field - use same working logic as invoices
      };

      return await this.sendEmail(emailData);
    } catch (error: any) {
      console.error('❌ Failed to send contract email:', error);
      return { success: false, error: error.message };
    }
  }
}