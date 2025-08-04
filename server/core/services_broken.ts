import formData from 'form-data';
import Mailgun from 'mailgun.js';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import PDFDocument from 'pdfkit';
import Anthropic from '@anthropic-ai/sdk';
import { ENV } from './environment';

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

  async sendContractEmail(contract: any, userSettings: any, subject: string, signingUrl?: string, customMessage?: string) {
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
        html: this.generateContractEmailHTML(contract, userSettings, signingUrl, customMessage),
        attachment: [{
          data: pdfBuffer,
          filename: `Contract-${contract.contractNumber}.pdf`,
          contentType: 'application/pdf'
        }],
        // Email deliverability improvements - additive only
        'h:Reply-To': userSettings?.businessEmail || `noreply@${domain}`,
        'h:X-Mailgun-Variables': JSON.stringify({
          email_type: 'contract',
          contract_id: contract.id,
          user_id: contract.userId
        }),
        'o:tracking': 'yes',
        'o:tracking-clicks': 'yes',
        'o:tracking-opens': 'yes',
        'o:dkim': 'yes'
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
    
    console.log('📧 Sending invoice email with PDF attachment');
    console.log('📧 Config check:', {
      domain,
      to: invoice.clientEmail,
      apiKeyExists: !!process.env.MAILGUN_API_KEY,
      invoiceId: invoice.id
    });
    
    try {
      // Generate PDF attachment using PDFKit
      console.log('📄 Generating invoice PDF...');
      const pdfBuffer = await this.generateInvoicePDF(invoice, userSettings);
      console.log('✅ Invoice PDF generated successfully, size:', pdfBuffer.length);
      
      const messageData = {
        from: `MusoBuddy <noreply@${domain}>`,
        to: invoice.clientEmail,
        subject: subject || `Invoice ${invoice.invoiceNumber}`,
        html: this.generateInvoiceEmailHTML(invoice, userSettings, pdfUrl),
        attachment: [{
          data: pdfBuffer,
          filename: `Invoice-${invoice.invoiceNumber}.pdf`,
          contentType: 'application/pdf'
        }],
        // Email deliverability improvements
        'h:Reply-To': userSettings?.businessEmail || `noreply@${domain}`,
        'h:X-Mailgun-Variables': JSON.stringify({
          email_type: 'invoice',
          invoice_id: invoice.id,
          user_id: invoice.userId
        }),
        'o:tracking': 'yes',
        'o:tracking-clicks': 'yes',
        'o:tracking-opens': 'yes',
        'o:dkim': 'yes'
      };

      console.log('📧 Sending invoice email via Mailgun...');
      console.log('📧 Message data:', {
        from: messageData.from,
        to: messageData.to,
        subject: messageData.subject,
        hasAttachment: !!messageData.attachment,
        attachmentCount: messageData.attachment?.length || 0
      });
      
      const result = await this.mailgun.messages.create(domain, messageData);
      console.log('✅ Invoice email with PDF sent successfully:', result.id);
      console.log('📧 Mailgun response:', result);
      return result;
      
    } catch (error: any) {
      console.error('❌ Invoice email error:', error);
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

  // Generate professional email signature
  generateEmailSignature(userSettings: any): string {
    const businessName = userSettings?.businessName || 'MusoBuddy';
    const businessEmail = userSettings?.businessEmail || userSettings?.email;
    const businessPhone = userSettings?.businessPhone;
    
    let signature = `<br><br>Best regards,<br><strong>${businessName}</strong>`;
    
    if (businessEmail) {
      signature += `<br>Email: <a href="mailto:${businessEmail}">${businessEmail}</a>`;
    }
    
    if (businessPhone) {
      signature += `<br>Phone: ${businessPhone}`;
    }
    
    signature += `<br><br><small>This email was sent via MusoBuddy - Professional Gig Management</small>`;
    
    return signature;
  }

  // Convert HTML to plain text for deliverability
  htmlToPlainText(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<p[^>]*>/gi, '')
      .replace(/<strong>(.*?)<\/strong>/gi, '$1')
      .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '$2 ($1)')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }

  // CRITICAL MISSING METHOD: Generic email sending for confirmation emails (now using return type that matches routes.ts)

  // Enhanced sendEmail method with full deliverability features
  async sendEmail(emailData: any): Promise<any> {
    const domain = 'mg.musobuddy.com';
    
    try {
      const messageData: any = {
        from: emailData.from,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html || '',
        text: emailData.text || '',
        // Enhanced deliverability improvements
        'o:tracking': 'yes',
        'o:tracking-clicks': 'yes',
        'o:tracking-opens': 'yes',
        'o:dkim': 'yes',
        'o:tag': [emailData.emailType || 'general']
      };
      
      // Add professional headers
      if (emailData.replyTo) {
        messageData['h:Reply-To'] = emailData.replyTo;
      }
      
      // Add custom headers if provided
      if (emailData.headers) {
        Object.entries(emailData.headers).forEach(([key, value]) => {
          messageData[`h:${key}`] = value;
        });
      }
      
      // Add tracking variables if provided
      if (emailData.tracking) {
        Object.entries(emailData.tracking).forEach(([key, value]) => {
          messageData[key.startsWith('v:') ? key : `v:${key}`] = value;
        });
      }
      
      // Legacy tracking for existing functionality
      if (emailData.emailType || emailData.userId) {
        messageData['h:X-Mailgun-Variables'] = JSON.stringify({
          email_type: emailData.emailType || 'template',
          user_id: emailData.userId,
          timestamp: new Date().toISOString()
        });
      }
      
      console.log(`📧 Sending enhanced ${emailData.emailType || 'general'} email with DKIM signing and tracking`);
      
      const result = await this.mailgun.messages.create(domain, messageData);
      
      // Return structured response that matches expected format
      return {
        success: true,
        messageId: result.id,
        status: result.status || 'sent',
        message: result.message || 'Email sent successfully'
      };
    } catch (error: any) {
      console.error('❌ Failed to send enhanced email:', error);
      
      // Return structured error response instead of throwing
      return {
        success: false,
        error: error.message || 'Failed to send email',
        details: error.details || null
      };
    }
  }

  // Contract PDF generation - will be rebuilt
  async generateContractPDF(contract: any, userSettings: any): Promise<Buffer> {
    throw new Error('Contract PDF generation system needs to be rebuilt');
  }

  // Invoice PDF generation method
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
      console.error('💥 Error message:', error.message);
      console.error('💥 Error stack:', error.stack);
      
      throw new Error(`Invoice PDF generation failed: ${error.message}`);
    }
  }






