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
      
      const { generateContractPDF: professionalGenerateContractPDF } = await import('../unified-contract-pdf');
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

  // Send contract confirmation emails with SIGNED contract links
  async sendContractConfirmationEmails(contract: any, userSettings: any): Promise<boolean> {
    try {
      console.log('📧 Starting contract confirmation email process...');
      console.log('📧 Contract status:', contract.status);
      console.log('📧 Contract cloud URL:', contract.cloudStorageUrl ? 'Present' : 'Missing');
      
      // CRITICAL FIX: Ensure we have the signed contract URL
      let signedContractUrl = contract.cloudStorageUrl;
      
      // If no cloud URL, try to generate one (this should have been done during signing)
      if (!signedContractUrl) {
        console.log('⚠️ No cloud URL found, attempting to generate signed contract URL...');
        
        try {
          // Get the updated contract from database (in case it was updated after signing)
          const { storage } = await import('./storage');
          const updatedContract = await storage.getContract(contract.id);
          
          if (updatedContract?.cloudStorageUrl) {
            signedContractUrl = updatedContract.cloudStorageUrl;
            console.log('✅ Found updated cloud URL:', signedContractUrl);
          } else {
            // Last resort: use public contract view endpoint
            signedContractUrl = `https://musobuddy.replit.app/view/contracts/${contract.id}`;
            console.log('⚠️ Using fallback public view URL:', signedContractUrl);
          }
        } catch (error) {
          console.error('❌ Error getting updated contract URL:', error);
          signedContractUrl = `https://musobuddy.replit.app/view/contracts/${contract.id}`;
        }
      }
      
      console.log('📧 Using signed contract URL for emails:', signedContractUrl);
      
      // Email to client
      const clientEmailData = {
        to: contract.clientEmail,
        subject: `Contract ${contract.contractNumber} Successfully Signed ✓`,
        html: this.generateContractConfirmationEmailHTML(contract, userSettings, 'client', signedContractUrl)
      };
      
      console.log('📧 Sending confirmation email to client:', contract.clientEmail);
      const clientResult = await this.sendEmail(clientEmailData);
      
      if (!clientResult.success) {
        console.error('❌ Failed to send client confirmation email:', clientResult.error);
      } else {
        console.log('✅ Client confirmation email sent successfully');
      }
      
      // Email to musician
      const musicianEmailData = {
        to: userSettings?.businessEmail || 'support@musobuddy.com',
        subject: `Contract Signed: ${contract.contractNumber} ✓`,
        html: this.generateContractConfirmationEmailHTML(contract, userSettings, 'musician', signedContractUrl)
      };
      
      console.log('📧 Sending confirmation email to musician:', userSettings?.businessEmail);
      const musicianResult = await this.sendEmail(musicianEmailData);
      
      if (!musicianResult.success) {
        console.error('❌ Failed to send musician confirmation email:', musicianResult.error);
      } else {
        console.log('✅ Musician confirmation email sent successfully');
      }
      
      const overallSuccess = clientResult.success && musicianResult.success;
      console.log(`📧 Email confirmation process completed. Success: ${overallSuccess}`);
      
      return overallSuccess;
    } catch (error: any) {
      console.error('❌ Failed to send contract confirmation emails:', error);
      return false;
    }
  }

  // FIXED: Generate contract confirmation email HTML with signed contract URL
  generateContractConfirmationEmailHTML(contract: any, userSettings: any, recipient: 'client' | 'musician', signedContractUrl: string): string {
    const businessName = userSettings?.businessName || 'MusoBuddy';
    const isClient = recipient === 'client';
    
    console.log('📧 Generating confirmation email HTML for:', recipient);
    console.log('📧 Using signed contract URL:', signedContractUrl);
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Contract Successfully Signed</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #4CAF50; color: white; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
            <h2 style="margin: 0;">✅ Contract Successfully Signed</h2>
          </div>
          
          <p>Dear ${isClient ? contract.clientName : businessName},</p>
          
          <p>Great news! The performance contract <strong>${contract.contractNumber}</strong> has been successfully signed and is now legally binding.</p>
          
          <div style="background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #4CAF50;">
            <h3 style="color: #2c3e50; margin-top: 0;">Event Details:</h3>
            <p><strong>Date:</strong> ${new Date(contract.eventDate).toLocaleDateString('en-GB')}</p>
            <p><strong>Time:</strong> ${contract.eventTime}</p>
            <p><strong>Venue:</strong> ${contract.venue}</p>
            <p><strong>Performance Fee:</strong> £${contract.fee}</p>
            ${contract.deposit && parseFloat(contract.deposit) > 0 ? `<p><strong>Deposit:</strong> £${contract.deposit}</p>` : ''}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${signedContractUrl}" 
               style="background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;" target="_blank">
              📋 Download Signed Contract (PDF)
            </a>
          </div>
          
          <p>Best regards,<br>
          ${isClient ? businessName : 'MusoBuddy Team'}</p>
        </div>
      </body>
      </html>
    `;
  }

  // Generate email signature for templates
  generateEmailSignature(userSettings: any): string {
    const businessName = userSettings?.businessName || 'MusoBuddy';
    const businessEmail = userSettings?.businessEmail || '';
    const businessPhone = userSettings?.businessPhone || '';
    const businessAddress = userSettings?.businessAddress || '';
    
    return `
      <br><br>
      <div style="border-top: 1px solid #ddd; margin-top: 20px; padding-top: 20px; color: #666; font-size: 14px;">
        <strong>${businessName}</strong><br>
        ${businessEmail ? `Email: ${businessEmail}<br>` : ''}
        ${businessPhone ? `Phone: ${businessPhone}<br>` : ''}
        ${businessAddress ? `${businessAddress}<br>` : ''}
        <br>
        <em>Powered by MusoBuddy - Music Business Management</em>
      </div>
    `;
  }

  // Convert HTML to plain text for email
  htmlToPlainText(html: string): string {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }
}