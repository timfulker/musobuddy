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
      // Use production domain for live emails, development domain for testing
      const domain = process.env.NODE_ENV === 'production' ? 'enquiries.musobuddy.com' : (process.env.MAILGUN_DOMAIN || 'enquiries.musobuddy.com');
      
      const messageData: any = {
        from: emailData.from || `MusoBuddy <noreply@${domain}>`,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html
      };

      // Force HTML-only emails - don't add text version to prevent email clients from preferring text
      // This ensures our beautiful HTML templates are displayed properly
      
      // Set explicit Content-Type headers for HTML emails
      if (emailData.html && !emailData.text) {
        messageData['h:Content-Type'] = 'text/html; charset=UTF-8';
        messageData['h:X-Content-Type-Options'] = 'nosniff';
        console.log('📧 Forcing HTML-only display with explicit headers');
      }

      // Only add text version if explicitly provided (for compatibility)
      if (emailData.text) {
        messageData.text = emailData.text;
        console.log('📧 Adding text version for multipart email');
      }

      // Let Mailgun handle MIME headers automatically for proper multipart emails

      // Add CC support for invoices (contracts remain single-recipient only)
      if (emailData.cc) {
        messageData.cc = emailData.cc;
        console.log(`📧 CC: ${messageData.cc}`);
      }

      // Add BCC support for testing/monitoring purposes
      if (emailData.bcc) {
        messageData.bcc = emailData.bcc;
        console.log(`📧 BCC: ${messageData.bcc}`);
      }

      // Add Reply-To support for booking-specific email routing
      if (emailData.replyTo) {
        messageData['h:Reply-To'] = emailData.replyTo;
        console.log(`📧 Reply-To: ${messageData['h:Reply-To']}`);
      }

      // Handle attachments - for compliance documents, we include links in email content
      // Only attach actual files when provided as Buffer/data
      if (emailData.attachments && emailData.attachments.length > 0) {
        const fileAttachments = emailData.attachments.filter(att => att.data || att.buffer);
        if (fileAttachments.length > 0) {
          messageData.attachment = fileAttachments;
          console.log(`📎 Added ${fileAttachments.length} file attachments to email`);
        }
      }

      // CRITICAL FIX: Add custom headers support for GlockApps testing
      if (emailData.headers) {
        messageData['h:X-Glockapps-Test-ID'] = emailData.headers['X-Glockapps-Test-ID'];
        messageData['h:X-Campaign-ID'] = emailData.headers['X-Campaign-ID'];
        messageData['h:X-Test-ID'] = emailData.headers['X-Test-ID'];
        console.log('📧 Added GlockApps headers:', emailData.headers);
      }

      console.log(`📧 Sending email: ${emailData.subject}`);
      console.log(`📧 From: ${messageData.from}`);  
      console.log(`📧 To: ${messageData.to}`);
      if (messageData.cc) {
        console.log(`📧 CC: ${messageData.cc}`);
      }
      console.log(`📧 HTML length: ${emailData.html?.length || 0}`);
      console.log(`📧 Text length: ${emailData.text?.length || 0}`);
      console.log(`📧 HTML preview: ${emailData.html?.substring(0, 100) || 'none'}...`);
      console.log(`📧 Domain: ${domain} (${process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'DEVELOPMENT'})`);
      
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

  // Contract PDF generation using unified contract generator
  async generateContractPDF(contract: any, userSettings: any, options?: { useAI?: boolean }): Promise<Buffer> {
    try {
      console.log('🎨 Using unified contract PDF generator...');
      
      const { generateContractPDF: unifiedGenerateContractPDF } = await import('../unified-contract-pdf');
      
      const result = await unifiedGenerateContractPDF(contract, userSettings);
      console.log('✅ Unified contract PDF generation completed, buffer size:', result.length);
      
      return result;
    } catch (error: any) {
      console.error('💥 Contract generation failed:', error);
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
    // Get theme color from settings
    const themeColor = userSettings?.themeAccentColor || userSettings?.theme_accent_color || '#059669';
    
    // Calculate contrast for button text (same logic as PDF generation)
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 0, g: 0, b: 0 };
    };

    const getLuminance = (r: number, g: number, b: number) => {
      const rsRGB = r / 255;
      const gsRGB = g / 255;
      const bsRGB = b / 255;
      
      const rLinear = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
      const gLinear = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
      const bLinear = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);
      
      return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
    };

    const rgb = hexToRgb(themeColor);
    const luminance = getLuminance(rgb.r, rgb.g, rgb.b);
    const textColor = luminance > 0.5 ? '#000000' : '#ffffff'; // Black text on light backgrounds, white on dark
    
    // Helper function to safely format date
    const formatDate = (date: any) => {
      if (!date) return 'TBC';
      try {
        const dateObj = new Date(date);
        return isNaN(dateObj.getTime()) ? 'TBC' : dateObj.toDateString();
      } catch {
        return 'TBC';
      }
    };

    // Helper function to safely format fee (with fallback to amount like PDF does)
    const formatFee = (fee: any, amount: any) => {
      // First try fee, then fallback to amount (same logic as PDF)
      const actualFee = fee || amount;
      if (actualFee === null || actualFee === undefined || actualFee === '') return 'TBC';
      const numFee = typeof actualFee === 'string' ? parseFloat(actualFee) : actualFee;
      return isNaN(numFee) ? 'TBC' : numFee.toFixed(2);
    };

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice ${invoice.invoiceNumber}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #374151;
            background-color: #f9fafb;
          }
          
          .email-container {
            max-width: 600px;
            margin: 40px auto;
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          }
          
          .header {
            background: linear-gradient(135deg, ${themeColor} 0%, ${themeColor}dd 100%);
            color: ${textColor};
            padding: 30px;
            text-align: center;
          }
          
          .header h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
            letter-spacing: -0.025em;
          }
          
          .header p {
            font-size: 16px;
            opacity: 0.9;
            font-weight: 500;
          }
          
          .content {
            padding: 40px 30px;
          }
          
          .greeting {
            font-size: 18px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 20px;
          }
          
          .message {
            font-size: 16px;
            color: #6b7280;
            margin-bottom: 30px;
            line-height: 1.7;
          }
          
          .invoice-details {
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 24px;
            margin: 30px 0;
          }
          
          .invoice-details h3 {
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 2px solid ${themeColor};
            display: inline-block;
          }
          
          .detail-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px solid #e5e7eb;
          }
          
          .detail-row:last-child {
            border-bottom: none;
            font-weight: 600;
            font-size: 17px;
            color: #111827;
          }
          
          .detail-label {
            font-weight: 500;
            color: #6b7280;
          }
          
          .detail-value {
            font-weight: 600;
            color: #111827;
          }
          
          .amount-highlight {
            color: ${themeColor};
            font-size: 18px;
          }
          
          .cta-section {
            text-align: center;
            margin: 40px 0;
          }
          
          .download-btn {
            display: inline-block;
            background: linear-gradient(135deg, ${themeColor} 0%, ${themeColor}cc 100%);
            color: ${textColor};
            padding: 16px 32px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            box-shadow: 0 4px 14px 0 rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease;
            letter-spacing: 0.025em;

          }
          
          .download-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px 0 rgba(0, 0, 0, 0.15);
          }
          
          .footer {
            background: #f8fafc;
            padding: 30px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
          }
          
          .signature {
            font-size: 16px;
            color: #374151;
            margin-bottom: 10px;
          }
          
          .business-name {
            font-weight: 600;
            color: #111827;
            font-size: 17px;
          }
          
          .help-text {
            font-size: 14px;
            color: #9ca3af;
            margin-top: 20px;
            line-height: 1.5;
          }
          
          @media (max-width: 600px) {
            .email-container {
              margin: 20px;
              border-radius: 8px;
            }
            
            .header, .content, .footer {
              padding: 20px;
            }
            
            .header h1 {
              font-size: 24px;
            }
            
            .detail-row {
              flex-direction: column;
              align-items: flex-start;
              gap: 4px;
            }
            
            .download-btn {
              padding: 14px 28px;
              font-size: 15px;
              margin: 6px auto;
              display: block;
              width: calc(100% - 12px);
            }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>Invoice ${invoice.invoiceNumber}</h1>
            <p>Payment Due</p>
          </div>
          
          <div class="content">
            <div class="greeting">Dear ${invoice.clientName},</div>
            
            <div class="message">
              Thank you for choosing our services. Please find your invoice details below and download the PDF for your records.
            </div>
            
            <div class="invoice-details">
              <h3>Invoice Details</h3>
              
              <div class="detail-row">
                <span class="detail-label">Invoice Number</span>
                <span class="detail-value">${invoice.invoiceNumber}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Performance Date</span>
                <span class="detail-value">${formatDate(invoice.eventDate)}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Due Date</span>
                <span class="detail-value">${formatDate(invoice.dueDate)}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Total Amount</span>
                <span class="detail-value amount-highlight">£${formatFee(invoice.fee, invoice.amount)}</span>
              </div>
            </div>
            
            <div class="cta-section">
              <a href="${pdfUrl}" class="download-btn">
                📄 Download Invoice PDF
              </a>
            </div>
          </div>
          
          <div class="footer">
            <div class="signature">Best regards,</div>
            <div class="business-name">${userSettings?.businessName || 'MusoBuddy'}</div>
            <div class="help-text">
              If you have any questions about this invoice, please don't hesitate to contact us.
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Send contract email with R2 URL
  async sendContractEmail(contract: any, userSettings: any, subject: string, contractUrl: string, customMessage?: string) {
    // Get theme color from settings
    const themeColor = userSettings?.themeAccentColor || userSettings?.theme_accent_color || '#1e3a8a';
    
    // Calculate total fee including travel expenses
    const baseFee = parseFloat(contract.fee || '0');
    const travelExpenses = parseFloat(contract.travelExpenses || contract.travel_expenses || '0');
    const totalFee = baseFee + travelExpenses;
    
    console.log('📧 Email fee calculation:', {
      baseFee,
      travelExpenses,
      totalFee,
      contractFields: Object.keys(contract)
    });
    
    if (!this.mailgun) {
      console.log('📧 Mailgun not configured, skipping contract email');
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Contract Ready for Signing</title>
    <style>
        /* Email-safe CSS - minimal and compatible */
        body { 
          font-family: Arial, sans-serif; 
          line-height: 1.6; 
          margin: 0; 
          padding: 20px; 
          background-color: #f8f9fa;
          color: #333333;
        }
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .email-header { 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
          text-align: center;
        }
        .email-content { 
          padding: 30px;
          background: white;
        }
        .event-details {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .cta-button {
          display: inline-block;
          background: ${themeColor};
          color: white;
          padding: 15px 30px;
          text-decoration: none;
          border-radius: 5px;
          font-weight: bold;
          margin: 20px 0;
        }
        .cta-section {
          text-align: center;
          margin: 30px 0;
        }
        .signature {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e9ecef;
          color: #6c757d;
          font-size: 14px;
        }
        h1, h2, h3 { margin: 0 0 16px 0; }
        p { margin: 0 0 16px 0; line-height: 1.6; }
        .footer {
          background: #f8f9fa;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #6c757d;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            <h1 style="margin: 0; font-size: 24px; font-weight: 300;">Contract Ready for Signing</h1>
        </div>
        <div class="email-content">
            <p>Dear ${contract.clientName},</p>
            
            ${customMessage ? `<p>${customMessage}</p>` : ''}
            
            <p>Your contract for the event on ${new Date(contract.eventDate).toLocaleDateString('en-GB')} is ready for signing.</p>
            
            <div class="event-details">
              <h3 style="margin-top: 0;">Event Details:</h3>
              <p><strong>Date:</strong> ${new Date(contract.eventDate).toLocaleDateString('en-GB')}</p>
              <p><strong>Time:</strong> ${contract.eventTime} - ${contract.eventEndTime}</p>
              <p><strong>Venue:</strong> ${contract.venue}</p>
              <p><strong>Fee:</strong> £${totalFee.toFixed(2)}</p>
            </div>
            
            <div class="cta-section">
              <a href="${contractUrl}" class="cta-button">
                View & Sign Contract
              </a>
            </div>
            
            <p>Please review and sign the contract at your earliest convenience.</p>
            
            <div class="signature">
                <p><strong>${userSettings?.businessName || 'MusoBuddy'}</strong><br>
                Professional Music Services<br>
                ${userSettings?.businessContactEmail || ''}</p>
            </div>
        </div>
        <div class="footer">
            <p>This email was sent via MusoBuddy Professional Music Management Platform</p>
        </div>
    </div>
</body>
</html>
      `;

      // Create text version for better email client compatibility
      const textVersion = `
${subject}

Dear ${contract.clientName},

${customMessage ? customMessage + '\n\n' : ''}Your contract for the event on ${new Date(contract.eventDate).toLocaleDateString('en-GB')} is ready for signing.

Event Details:
- Date: ${new Date(contract.eventDate).toLocaleDateString('en-GB')}
- Time: ${contract.eventTime} - ${contract.eventEndTime}
- Venue: ${contract.venue}
- Fee: £${totalFee.toFixed(2)}

To view and sign your contract, please visit: ${contractUrl}

Please review and sign the contract at your earliest convenience.

Best regards,
${userSettings?.businessName || 'MusoBuddy'}
Professional Music Services
${userSettings?.businessContactEmail || ''}

---
This email was sent via MusoBuddy Professional Music Management Platform
      `.trim();

      const emailData = {
        to: contract.clientEmail,
        subject: subject,
        html: emailHtml,
        text: textVersion
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
        to: userSettings?.businessContactEmail || 'support@musobuddy.com',
        subject: `Contract Signed: ${contract.contractNumber} ✓`,
        html: this.generateContractConfirmationEmailHTML(contract, userSettings, 'musician', signedContractUrl)
      };
      
      console.log('📧 Sending confirmation email to musician:', userSettings?.businessContactEmail);
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
    const businessContactEmail = userSettings?.businessContactEmail || '';
    const businessPhone = userSettings?.businessPhone || '';
    
    return `
      <br><br>
      <div style="border-top: 1px solid #ddd; margin-top: 20px; padding-top: 20px; color: #666; font-size: 14px;">
        <strong>${businessName}</strong><br>
        ${businessContactEmail ? `Email: ${businessContactEmail}<br>` : ''}
        ${businessPhone ? `Phone: ${businessPhone}<br>` : ''}
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

  // Simple sendEmail method for compatibility with templates
  async sendEmailSimple(toEmail: string, subject: string, body: string, fromEmail?: string, fromName?: string, replyTo?: string) {
    const emailData = {
      to: toEmail,
      subject: subject,
      html: body,
      from: fromEmail && fromName ? `${fromName} <${fromEmail}>` : undefined,
      replyTo: replyTo
    };
    
    const result = await this.sendEmail(emailData);
    return result.success;
  }

  // Send invoice email with payment link
  async sendInvoice(invoice: any, userSettings: any, customMessage?: string) {
    if (!invoice.clientEmail) {
      console.log('📧 No client email provided, skipping invoice email');
      return { success: false, error: 'No client email provided' };
    }

    try {
      const subject = `Invoice ${invoice.invoiceNumber} - ${userSettings?.businessName || 'MusoBuddy'}`;
      const invoiceHtml = this.generateInvoiceEmailHTML(invoice, userSettings, invoice.cloudStorageUrl);
      
      const emailData = {
        to: invoice.clientEmail,
        subject: subject,
        html: customMessage ? `<p>${customMessage}</p>${invoiceHtml}` : invoiceHtml,
        from: userSettings?.businessContactEmail ? 
          `${userSettings.businessName || 'MusoBuddy'} <${userSettings.businessContactEmail}>` : 
          undefined
      };

      console.log(`📧 Sending invoice ${invoice.invoiceNumber} to ${invoice.clientEmail}`);
      const result = await this.sendEmail(emailData);
      
      if (result.success) {
        console.log(`✅ Invoice email sent successfully for ${invoice.invoiceNumber}`);
      } else {
        console.error(`❌ Failed to send invoice email for ${invoice.invoiceNumber}:`, result.error);
      }
      
      return result;
    } catch (error: any) {
      console.error('❌ Error sending invoice email:', error);
      return { success: false, error: error.message };
    }
  }

  async sendPasswordResetEmail(email: string, userName: string, resetUrl: string) {
    try {
      const html = this.generatePasswordResetEmailHTML(userName, resetUrl);
      
      return await this.sendEmail({
        to: email,
        subject: 'Reset Your MusoBuddy Password',
        html: html
      });
    } catch (error: any) {
      console.error('Error sending password reset email:', error);
      return { success: false, error: error.message };
    }
  }

  generatePasswordResetEmailHTML(userName: string, resetUrl: string) {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your MusoBuddy Password</title>
        <style>
          body {
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f8fafc;
            line-height: 1.6;
          }
          
          .email-container {
            max-width: 600px;
            margin: 40px auto;
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            overflow: hidden;
          }
          
          .header {
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
          }
          
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
            letter-spacing: -0.025em;
          }
          
          .header p {
            margin: 8px 0 0 0;
            font-size: 16px;
            opacity: 0.9;
            font-weight: 400;
          }
          
          .content {
            padding: 40px 30px;
          }
          
          .greeting {
            font-size: 18px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 20px;
          }
          
          .message {
            font-size: 16px;
            color: #6b7280;
            margin-bottom: 30px;
            line-height: 1.7;
          }
          
          .cta-section {
            text-align: center;
            margin: 40px 0;
          }
          
          .reset-btn {
            display: inline-block;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: white;
            padding: 16px 32px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            box-shadow: 0 4px 14px 0 rgba(99, 102, 241, 0.3);
            transition: all 0.3s ease;
            letter-spacing: 0.025em;
          }
          
          .reset-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px 0 rgba(99, 102, 241, 0.4);
          }
          
          .security-note {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 8px;
            padding: 20px;
            margin: 30px 0;
          }
          
          .security-note h3 {
            font-size: 16px;
            font-weight: 600;
            color: #92400e;
            margin: 0 0 10px 0;
          }
          
          .security-note p {
            font-size: 14px;
            color: #92400e;
            margin: 0;
            line-height: 1.5;
          }
          
          .footer {
            background: #f8fafc;
            padding: 30px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
          }
          
          .signature {
            font-size: 16px;
            color: #374151;
            margin-bottom: 10px;
          }
          
          .business-name {
            font-weight: 600;
            color: #111827;
            font-size: 17px;
          }
          
          .help-text {
            font-size: 14px;
            color: #9ca3af;
            margin-top: 20px;
            line-height: 1.5;
          }
          
          @media (max-width: 600px) {
            .email-container {
              margin: 20px;
              border-radius: 8px;
            }
            
            .header, .content, .footer {
              padding: 20px;
            }
            
            .header h1 {
              font-size: 24px;
            }
            
            .reset-btn {
              padding: 14px 28px;
              font-size: 15px;
              margin: 6px auto;
              display: block;
              width: calc(100% - 12px);
            }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>Password Reset</h1>
            <p>Secure access to your MusoBuddy account</p>
          </div>
          
          <div class="content">
            <div class="greeting">Hello ${userName},</div>
            <div class="message">
              We received a request to reset the password for your MusoBuddy account. If you made this request, click the button below to set a new password.
            </div>
            
            <div class="cta-section">
              <a href="${resetUrl}" class="reset-btn">Reset My Password</a>
            </div>
            
            <div class="security-note">
              <h3>🔒 Security Note</h3>
              <p>This link will expire in 1 hour for your security. If you didn't request this password reset, you can safely ignore this email.</p>
            </div>
            
            <div class="message">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${resetUrl}" style="color: #6366f1; word-break: break-all;">${resetUrl}</a>
            </div>
          </div>
          
          <div class="footer">
            <div class="signature">Best regards,</div>
            <div class="business-name">The MusoBuddy Team</div>
            <div class="help-text">
              If you have any questions or need assistance, please contact our support team.
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

// Export instance for direct use
export const services = new EmailService();