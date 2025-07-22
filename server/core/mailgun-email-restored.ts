import formData from 'form-data';
import Mailgun from 'mailgun.js';
import type { Contract, Invoice, UserSettings } from '@shared/schema';
import { generateContractPDF, generateInvoicePDF } from './pdf-generator';
import { uploadContractToCloud, uploadInvoiceToCloud, isCloudStorageConfigured } from './cloud-storage';
import { storage } from './storage';

// Initialize Mailgun client
const mailgun = new Mailgun(formData);

// Email interface for type safety
interface EmailData {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
  cc?: string; // Add CC support
  attachments?: Array<{
    content: string;
    filename: string;
    type: string;
    disposition: string;
  }>;
}

// Send email function
export async function sendEmail(emailData: EmailData): Promise<boolean> {
  try {
    // Debug environment variables
    console.log('🔍 Checking Mailgun environment variables...');
    console.log('MAILGUN_API_KEY exists:', !!process.env.MAILGUN_API_KEY);
    console.log('MAILGUN_DOMAIN:', process.env.MAILGUN_DOMAIN);
    
    // Check for required environment variables
    if (!process.env.MAILGUN_API_KEY) {
      console.error('❌ MAILGUN_API_KEY environment variable is required');
      return false;
    }

    // Use custom domain for production email sending
    const domain = 'mg.musobuddy.com'; // Force custom domain instead of sandbox
    console.log('🌐 Using domain:', domain);
    
    // Create Mailgun client with EU endpoint (mg.musobuddy.com is on EU)
    const mg = mailgun.client({
      username: 'api',
      key: process.env.MAILGUN_API_KEY,
      url: 'https://api.eu.mailgun.net' // EU endpoint for mg.musobuddy.com
    });
    
    console.log('🔑 Mailgun client initialized with key:', process.env.MAILGUN_API_KEY ? 'Present' : 'Missing');

    // Prepare message data
    const messageData: any = {
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
      text: emailData.text || '',
      html: emailData.html || ''
    };

    // Add reply-to if specified
    if (emailData.replyTo) {
      messageData['h:Reply-To'] = emailData.replyTo;
    }

    // Add CC if specified
    if (emailData.cc) {
      messageData.cc = emailData.cc;
    }

    // Add attachments if specified
    if (emailData.attachments && emailData.attachments.length > 0) {
      messageData.attachment = emailData.attachments.map(att => ({
        data: Buffer.from(att.content, 'base64'),
        filename: att.filename,
        contentType: att.type
      }));
    }

    // Send email
    const result = await mg.messages.create(domain, messageData);
    
    console.log('✅ Email sent successfully:', result.id);
    console.log('📧 From:', emailData.from);
    console.log('📧 To:', emailData.to);
    console.log('📧 CC:', emailData.cc || 'None');
    console.log('📧 Subject:', emailData.subject);
    
    return true;
    
  } catch (error: any) {
    console.error('❌ Failed to send email:', error.message);
    console.error('Error details:', error);
    console.error('Error status:', error.status);
    console.error('Error type:', error.type);
    console.error('Full error object:', JSON.stringify(error, null, 2));
    return false;
  }
}

/**
 * Enhanced contract email sending with hybrid approach
 * - Generates PDF and uploads to cloud storage for permanent access
 * - Attaches PDF to email for immediate access
 * - Includes both attachment and static backup link
 */
export async function sendContractEmail(
  contract: Contract,
  userSettings: UserSettings | null,
  customMessage?: string,
  signatureDetails?: {
    signedAt: Date;
    signatureName?: string;
    clientIpAddress?: string;
  }
): Promise<boolean> {
  try {
    console.log('📧 Sending contract email with cloud storage signing page:', contract.contractNumber);
    
    // Generate PDF buffer
    const pdfBuffer = await generateContractPDF(contract, userSettings, signatureDetails);
    
    const isSignedContract = !!signatureDetails;
    let cloudSigningUrl = '';
    
    // For unsigned contracts, create or regenerate cloud storage signing page
    if (!isSignedContract) {
      try {
        console.log('🔍 Attempting to handle cloud storage signing page...');
        const { uploadContractSigningPage, regenerateContractSigningUrl, isCloudStorageConfigured } = await import('./cloud-storage');
        
        if (!isCloudStorageConfigured()) {
          throw new Error('Cloud storage not configured - missing environment variables');
        }
        
        // Check if we need to regenerate URL (for reminders sent > 7 days after initial send)
        const shouldRegenerateUrl = contract.cloudStorageKey && 
                                  contract.signingUrlCreatedAt &&
                                  (Date.now() - contract.signingUrlCreatedAt.getTime()) > (6 * 24 * 60 * 60 * 1000); // 6 days for safety
        
        if (shouldRegenerateUrl) {
          console.log('🔄 Regenerating fresh signing URL for reminder (>6 days old)...');
          cloudSigningUrl = await regenerateContractSigningUrl(contract.cloudStorageKey!);
          if (cloudSigningUrl) {
            console.log('✅ SUCCESS: Fresh signing URL generated for reminder');
            console.log('🔗 Regenerated URL:', cloudSigningUrl);
          } else {
            throw new Error('Failed to regenerate signing URL');
          }
        } else {
          console.log('🔧 Cloud storage configured, uploading new signing page...');
          const uploadResult = await uploadContractSigningPage(contract, userSettings);
          cloudSigningUrl = uploadResult.url;
          console.log('✅ SUCCESS: Contract signing page uploaded to cloud storage');
          console.log('🔗 Cloud signing URL:', cloudSigningUrl);
          
          // Update contract with cloud storage metadata
          if (uploadResult.storageKey) {
            const { storage } = await import('./storage');
            await storage.updateContract(contract.id, {
              cloudStorageUrl: cloudSigningUrl,
              cloudStorageKey: uploadResult.storageKey,
              signingUrlCreatedAt: new Date()
            }, contract.userId);
            console.log('✅ Contract updated with cloud storage metadata');
          }
        }
        
        // Verify the URL starts with expected cloud storage domain
        if (!cloudSigningUrl.includes('r2.cloudflarestorage.com')) {
          console.log('⚠️ WARNING: Cloud URL does not appear to be from cloud storage:', cloudSigningUrl);
        }
        
      } catch (error) {
        console.error('❌ FAILED to handle contract signing page:', error);
        console.error('🔧 Error details:', error.message);
        // Fallback to app-based signing page
        cloudSigningUrl = `https://musobuddy.replit.app/sign-contract/${contract.id}`;
        console.log('🔄 Using app-based signing page as fallback:', cloudSigningUrl);
      }
    }
    
    // Prepare email content
    const businessName = userSettings?.businessName || 'MusoBuddy';
    const fromName = userSettings?.emailFromName || businessName;
    const fromEmail = `${fromName} <noreply@mg.musobuddy.com>`;
    const replyToEmail = userSettings?.emailAddress || 'noreply@mg.musobuddy.com';
    
    const subject = isSignedContract 
      ? `Contract Signed - ${contract.contractNumber}`
      : `Contract for ${contract.clientName} - ${contract.contractNumber}`;
    
    // Generate email HTML with cloud storage signing URL
    const emailHtml = generateContractEmailHtml(
      contract,
      userSettings,
      customMessage,
      isSignedContract,
      cloudSigningUrl
    );
    
    // Create email with PDF attachment
    const emailData: EmailData = {
      to: contract.clientEmail,
      from: fromEmail,
      subject: subject,
      html: emailHtml,
      replyTo: replyToEmail,
      attachments: [
        {
          content: pdfBuffer.toString('base64'),
          filename: `${contract.contractNumber}.pdf`,
          type: 'application/pdf',
          disposition: 'attachment'
        }
      ]
    };
    
    // Send email
    const success = await sendEmail(emailData);
    
    if (success) {
      console.log('✅ Contract email sent successfully with attachment');
      console.log('📎 PDF attached to email for client access');
      console.log('☁️ Cloud signing page available at:', cloudSigningUrl);
    }
    
    return success;
    
  } catch (error) {
    console.error('❌ Error sending contract email:', error);
    return false;
  }
}

/**
 * Enhanced invoice email sending with hybrid approach
 */
export async function sendInvoiceEmail(
  invoice: Invoice,
  contract: Contract | null,
  userSettings: UserSettings | null,
  customMessage?: string
): Promise<boolean> {
  try {
    console.log('📧 Sending invoice email with hybrid approach:', invoice.invoiceNumber);
    
    // Generate PDF buffer
    const pdfBuffer = await generateInvoicePDF(invoice, contract, userSettings);
    
    // Upload to cloud storage first (if configured) for hybrid reliability
    let cloudStorageUrl: string | null = null;
    if (isCloudStorageConfigured()) {
      console.log('☁️ Uploading invoice to cloud storage...');
      const cloudResult = await uploadInvoiceToCloud(invoice, contract, userSettings);
      
      if (cloudResult.success) {
        cloudStorageUrl = cloudResult.url!;
        
        // Update invoice with cloud storage URL
        await storage.updateInvoiceCloudStorage(
          invoice.id,
          cloudResult.url!,
          cloudResult.key!,
          invoice.userId
        );
        console.log('✅ Invoice uploaded to cloud storage successfully');
      } else {
        console.warn('⚠️ Cloud storage upload failed:', cloudResult.error);
      }
    } else {
      console.log('📎 Cloud storage not configured, using attachment-only approach');
    }
    
    // Prepare email content
    const businessName = userSettings?.businessName || 'MusoBuddy';
    const fromName = userSettings?.emailFromName || businessName;
    const fromEmail = `${fromName} <noreply@mg.musobuddy.com>`;
    const replyToEmail = userSettings?.emailAddress || 'noreply@mg.musobuddy.com';
    
    const subject = `Invoice ${invoice.invoiceNumber} - Payment Due`;
    
    // Generate email HTML with hybrid approach
    const emailHtml = generateInvoiceEmailHtml(
      invoice,
      contract,
      userSettings,
      cloudStorageUrl,
      customMessage
    );
    
    // Create email with PDF attachment
    const emailData: EmailData = {
      to: invoice.clientEmail,
      from: fromEmail,
      subject: subject,
      html: emailHtml,
      replyTo: replyToEmail,
      cc: invoice.ccEmail || undefined, // Add CC support
      attachments: [
        {
          content: pdfBuffer.toString('base64'),
          filename: `${invoice.invoiceNumber}.pdf`,
          type: 'application/pdf',
          disposition: 'attachment'
        }
      ]
    };
    
    // Send email
    const success = await sendEmail(emailData);
    
    if (success) {
      console.log('✅ Invoice email sent successfully with attachment');
      console.log('📎 PDF attached to email for client access');
    }
    
    return success;
    
  } catch (error) {
    console.error('❌ Error sending invoice email:', error);
    return false;
  }
}

/**
 * Generate HTML for contract email with hybrid approach
 */
function generateContractEmailHtml(
  contract: Contract,
  userSettings: UserSettings | null,
  customMessage?: string,
  isSignedContract: boolean = false,
  cloudSigningUrl?: string
): string {
  const businessName = userSettings?.businessName || 'MusoBuddy';
  const signInstructions = isSignedContract ? '' : `
    <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
      <h3 style="color: #1e40af; margin-top: 0;">📝 Action Required</h3>
      <p style="margin: 10px 0;">Please review and sign this contract to confirm your booking.</p>
      <div style="text-align: center; margin: 20px 0;">
        <a href="${cloudSigningUrl || `https://musobuddy.replit.app/sign-contract/${contract.id}`}" 
           style="background-color: #1e40af; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 18px; border: none; box-shadow: 0 3px 6px rgba(0,0,0,0.2); text-transform: uppercase; letter-spacing: 0.5px;">
          📝 Sign Contract Online
        </a>
      </div>
      <p style="margin: 10px 0; font-size: 12px; color: #6b7280; text-align: center;">
        ${cloudSigningUrl ? '☁️ Signing page hosted independently - works even if app is offline' : '🔗 Signing page hosted on app'}
      </p>
    </div>
  `;
  
  const customMessageHtml = customMessage ? `
    <div style="background-color: #f0f9ff; padding: 15px; border-radius: 6px; margin: 20px 0;">
      <h4 style="color: #1e40af; margin-top: 0;">Personal Message:</h4>
      <p style="margin: 0; white-space: pre-wrap;">${customMessage}</p>
    </div>
  ` : '';
  
  const attachmentHtml = `
    <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0; border: 1px solid #e2e8f0;">
      <p style="margin: 0; color: #64748b;">📎 Your contract is attached as a PDF to this email.</p>
    </div>
  `;
  
  return `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">Contract from ${businessName}</h2>
        
        <p>Dear ${contract.clientName},</p>
        
        ${isSignedContract ? 
          `<p>Thank you for signing the contract! Your booking is now confirmed.</p>` : 
          `<p>Please find attached your contract for the performance on ${new Date(contract.eventDate).toLocaleDateString('en-GB')}.</p>`
        }
        
        ${customMessageHtml}
        ${signInstructions}
        
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #374151; margin-top: 0;">📋 Event Details</h3>
          <p><strong>Date:</strong> ${new Date(contract.eventDate).toLocaleDateString('en-GB')}</p>
          <p><strong>Time:</strong> ${contract.eventTime}</p>
          <p><strong>Venue:</strong> ${contract.venue}</p>
          <p><strong>Fee:</strong> £${contract.fee}</p>
        </div>
        
        ${attachmentHtml}
        
        <p>If you have any questions, please don't hesitate to contact me.</p>
        
        <p>Best regards,<br>
        ${businessName}</p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="font-size: 12px; color: #6b7280; text-align: center;">
          Powered by MusoBuddy – less admin, more music
        </p>
      </body>
    </html>
  `;
}

/**
 * Generate HTML for invoice email with hybrid approach
 */
function generateInvoiceEmailHtml(
  invoice: Invoice,
  contract: Contract | null,
  userSettings: UserSettings | null,
  cloudStorageUrl?: string | null,
  customMessage?: string
): string {
  const businessName = userSettings?.businessName || 'MusoBuddy';
  
  // Invoice emails: attachment-only approach (no cloud link needed)
  const attachmentHtml = `
    <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0; border: 1px solid #e2e8f0;">
      <p style="margin: 0; color: #64748b;">📎 Your invoice is attached as a PDF to this email.</p>
    </div>
  `;
  
  return `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">Invoice from ${businessName}</h2>
        
        <p>Dear ${invoice.clientName},</p>
        
        ${customMessage ? `<div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <p style="margin: 0; color: #92400e; font-style: italic;">${customMessage.replace(/\n/g, '<br>')}</p>
        </div>` : ''}
        
        <p>Please find attached your invoice for the performance services.</p>
        
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #374151; margin-top: 0;">💰 Payment Details</h3>
          <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
          <p><strong>Amount Due:</strong> £${invoice.amount}</p>
          <p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString('en-GB')}</p>
          ${invoice.performanceDate ? `<p><strong>Performance Date:</strong> ${new Date(invoice.performanceDate).toLocaleDateString('en-GB')}</p>` : ''}
        </div>
        
        ${attachmentHtml}
        
        <p>Payment can be made via bank transfer to the account details shown on the invoice.</p>
        
        <p>Thank you for your business!</p>
        
        <p>Best regards,<br>
        ${businessName}</p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="font-size: 12px; color: #6b7280; text-align: center;">
          Powered by MusoBuddy – less admin, more music
        </p>
      </body>
    </html>
  `;
}

/**
 * CRITICAL FIX: Send confirmation emails after contract is signed
 * This function was missing and causing the email system to fail
 */
export async function sendContractConfirmationEmails(
  contract: Contract,
  userSettings: UserSettings | null
): Promise<boolean> {
  try {
    console.log('📧 CONFIRMATION: Sending confirmation emails for signed contract:', contract.contractNumber);
    
    // Generate signed contract PDF with signature details
    const signatureDetails = {
      signedAt: contract.signedAt ? new Date(contract.signedAt) : new Date(),
      signatureName: contract.clientName,
      clientIpAddress: 'contract-signing-page'
    };
    
    const pdfBuffer = await generateContractPDF(contract, userSettings, signatureDetails);
    
    // Upload signed contract to cloud storage for permanent access
    let cloudDownloadUrl: string | null = null;
    if (isCloudStorageConfigured()) {
      console.log('☁️ CONFIRMATION: Uploading signed contract to cloud storage...');
      const cloudResult = await uploadContractToCloud(contract, userSettings, signatureDetails);
      
      if (cloudResult.success && cloudResult.url) {
        cloudDownloadUrl = cloudResult.url;
        console.log('✅ CONFIRMATION: Signed contract uploaded to cloud storage:', cloudDownloadUrl);
        
        // Update contract with cloud storage URL
        await storage.updateContract(contract.id, {
          cloudStorageUrl: cloudResult.url,
          cloudStorageKey: cloudResult.key,
          signingUrlCreatedAt: new Date()
        }, contract.userId);
      } else {
        console.warn('⚠️ CONFIRMATION: Cloud storage upload failed:', cloudResult.error);
      }
    }
    
    // Prepare email settings
    const businessName = userSettings?.businessName || 'MusoBuddy';
    const fromName = userSettings?.emailFromName || businessName;
    const fromEmail = `${fromName} <noreply@mg.musobuddy.com>`;
    const replyToEmail = userSettings?.businessEmail || 'noreply@mg.musobuddy.com';
    
    // Generate app-based download URL as fallback
    const appDownloadUrl = `https://musobuddy.replit.app/api/contracts/${contract.id}/download`;
    const finalDownloadUrl = cloudDownloadUrl || appDownloadUrl;
    
    console.log('🔗 CONFIRMATION: Download URL for emails:', finalDownloadUrl);
    
    // EMAIL 1: Send confirmation to CLIENT
    const clientEmailHtml = generateClientConfirmationHtml(
      contract,
      userSettings,
      finalDownloadUrl,
      signatureDetails
    );
    
    const clientEmailData: EmailData = {
      to: contract.clientEmail,
      from: fromEmail,
      subject: `Contract Signed Successfully - ${contract.contractNumber}`,
      html: clientEmailHtml,
      replyTo: replyToEmail,
      attachments: [
        {
          content: pdfBuffer.toString('base64'),
          filename: `Contract-${contract.contractNumber}-Signed.pdf`,
          type: 'application/pdf',
          disposition: 'attachment'
        }
      ]
    };
    
    console.log('📧 CONFIRMATION: Sending email to client:', contract.clientEmail);
    const clientEmailSuccess = await sendEmail(clientEmailData);
    
    if (!clientEmailSuccess) {
      console.error('❌ CONFIRMATION: Failed to send client confirmation email');
    } else {
      console.log('✅ CONFIRMATION: Client confirmation email sent successfully');
    }
    
    // EMAIL 2: Send notification to PERFORMER
    const performerEmail = userSettings?.businessEmail || replyToEmail;
    
    if (performerEmail && performerEmail !== 'noreply@mg.musobuddy.com') {
      const performerEmailHtml = generatePerformerConfirmationHtml(
        contract,
        userSettings,
        finalDownloadUrl,
        signatureDetails
      );
      
      const performerEmailData: EmailData = {
        to: performerEmail,
        from: fromEmail,
        subject: `Contract Signed by Client - ${contract.contractNumber}`,
        html: performerEmailHtml,
        replyTo: replyToEmail,
        attachments: [
          {
            content: pdfBuffer.toString('base64'),
            filename: `Contract-${contract.contractNumber}-Signed.pdf`,
            type: 'application/pdf',
            disposition: 'attachment'
          }
        ]
      };
      
      console.log('📧 CONFIRMATION: Sending email to performer:', performerEmail);
      const performerEmailSuccess = await sendEmail(performerEmailData);
      
      if (!performerEmailSuccess) {
        console.error('❌ CONFIRMATION: Failed to send performer confirmation email');
      } else {
        console.log('✅ CONFIRMATION: Performer confirmation email sent successfully');
      }
      
      return clientEmailSuccess && performerEmailSuccess;
    } else {
      console.warn('⚠️ CONFIRMATION: No performer email configured, only sending client confirmation');
      return clientEmailSuccess;
    }
    
  } catch (error) {
    console.error('❌ CONFIRMATION: Error sending confirmation emails:', error);
    return false;
  }
}

/**
 * Generate HTML for client confirmation email
 */
function generateClientConfirmationHtml(
  contract: Contract,
  userSettings: UserSettings | null,
  downloadUrl: string,
  signatureDetails: any
): string {
  const businessName = userSettings?.businessName || 'MusoBuddy';
  
  return `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #d1fae5; border: 1px solid #10b981; border-radius: 8px; padding: 20px; margin-bottom: 20px; text-align: center;">
          <h2 style="color: #065f46; margin-top: 0;">✅ Contract Signed Successfully!</h2>
          <p style="color: #047857; font-size: 18px; margin: 0;">Thank you for signing your performance contract.</p>
        </div>
        
        <p>Dear ${contract.clientName},</p>
        
        <p>Your performance contract <strong>${contract.contractNumber}</strong> has been successfully signed and is now legally binding.</p>
        
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #374151; margin-top: 0;">📋 Event Details Confirmed</h3>
          <p><strong>Date:</strong> ${new Date(contract.eventDate).toLocaleDateString('en-GB')}</p>
          <p><strong>Time:</strong> ${contract.eventTime}</p>
          <p><strong>Venue:</strong> ${contract.venue}</p>
          <p><strong>Performance Fee:</strong> £${contract.fee}</p>
          <p><strong>Signed on:</strong> ${signatureDetails.signedAt.toLocaleString('en-GB')}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${downloadUrl}" 
             style="background-color: #059669; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 18px;">
            📄 Download Signed Contract
          </a>
        </div>
        
        <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #92400e;">
            <strong>Important:</strong> Please save a copy of your signed contract for your records. 
            This document contains all the terms and conditions for your event.
          </p>
        </div>
        
        <p>A copy of the signed contract is also attached to this email.</p>
        
        <p>We look forward to performing at your event! If you have any questions, please don't hesitate to contact us.</p>
        
        <p>Best regards,<br>
        <strong>${businessName}</strong></p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="font-size: 12px; color: #6b7280; text-align: center;">
          Powered by MusoBuddy – less admin, more music
        </p>
      </body>
    </html>
  `;
}

/**
 * Generate HTML for performer confirmation email
 */
function generatePerformerConfirmationHtml(
  contract: Contract,
  userSettings: UserSettings | null,
  downloadUrl: string,
  signatureDetails: any
): string {
  const businessName = userSettings?.businessName || 'MusoBuddy';
  
  return `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #d1fae5; border: 1px solid #10b981; border-radius: 8px; padding: 20px; margin-bottom: 20px; text-align: center;">
          <h2 style="color: #065f46; margin-top: 0;">🎉 Great News!</h2>
          <p style="color: #047857; font-size: 18px; margin: 0;">Contract ${contract.contractNumber} has been signed by your client.</p>
        </div>
        
        <p>Hello,</p>
        
        <p>Excellent news! Your client <strong>${contract.clientName}</strong> has just signed the performance contract.</p>
        
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #374151; margin-top: 0;">📋 Confirmed Booking Details</h3>
          <p><strong>Client:</strong> ${contract.clientName}</p>
          <p><strong>Email:</strong> ${contract.clientEmail}</p>
          <p><strong>Date:</strong> ${new Date(contract.eventDate).toLocaleDateString('en-GB')}</p>
          <p><strong>Time:</strong> ${contract.eventTime}</p>
          <p><strong>Venue:</strong> ${contract.venue}</p>
          <p><strong>Performance Fee:</strong> £${contract.fee}</p>
          <p><strong>Signed on:</strong> ${signatureDetails.signedAt.toLocaleString('en-GB')}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${downloadUrl}" 
             style="background-color: #059669; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 18px;">
            📄 Download Signed Contract
          </a>
        </div>
        
        <div style="background-color: #e0f2fe; border: 1px solid #0284c7; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #0c4a6e;">
            <strong>Next Steps:</strong> The booking is now confirmed. You may want to create an invoice for this performance and add the event to your calendar.
          </p>
        </div>
        
        <p>The signed contract is attached to this email for your records.</p>
        
        <p>Best regards,<br>
        <strong>MusoBuddy Notification System</strong></p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="font-size: 12px; color: #6b7280; text-align: center;">
          Powered by MusoBuddy – less admin, more music
        </p>
      </body>
    </html>
  `;
}

// Test function for sandbox testing
export async function testEmailSending(): Promise<void> {
  console.log('🧪 Testing Mailgun email sending...');
  
  const testEmail: EmailData = {
    to: 'test@example.com',
    from: 'MusoBuddy <noreply@sandbox-123.mailgun.org>',
    subject: 'Test Email from MusoBuddy',
    text: 'This is a test email to verify Mailgun integration.',
    html: '<h1>Test Email</h1><p>This is a test email to verify Mailgun integration.</p>'
  };

  const success = await sendEmail(testEmail);
  
  if (success) {
    console.log('✅ Email test passed!');
  } else {
    console.log('❌ Email test failed!');
  }
}

/**
 * CRITICAL FIX: Send confirmation emails after contract is signed
 * This function was missing and causing the email system to fail
 */
export async function sendContractConfirmationEmails(
  contract: Contract,
  userSettings: UserSettings | null
): Promise<boolean> {
  try {
    console.log('📧 CONFIRMATION: Sending confirmation emails for signed contract:', contract.contractNumber);
    
    // Generate signed contract PDF with signature details
    const signatureDetails = {
      signedAt: contract.signedAt ? new Date(contract.signedAt) : new Date(),
      signatureName: contract.clientName,
      clientIpAddress: 'contract-signing-page'
    };
    
    const pdfBuffer = await generateContractPDF(contract, userSettings, signatureDetails);
    
    // Upload signed contract to cloud storage for permanent access
    let cloudDownloadUrl: string | null = null;
    if (isCloudStorageConfigured()) {
      console.log('☁️ CONFIRMATION: Uploading signed contract to cloud storage...');
      const cloudResult = await uploadContractToCloud(contract, userSettings, signatureDetails);
      
      if (cloudResult.success && cloudResult.url) {
        cloudDownloadUrl = cloudResult.url;
        console.log('✅ CONFIRMATION: Signed contract uploaded to cloud storage:', cloudDownloadUrl);
        
        // Update contract with cloud storage URL
        await storage.updateContract(contract.id, {
          cloudStorageUrl: cloudResult.url,
          cloudStorageKey: cloudResult.key,
          signingUrlCreatedAt: new Date()
        }, contract.userId);
      } else {
        console.warn('⚠️ CONFIRMATION: Cloud storage upload failed:', cloudResult.error);
      }
    }
    
    // Prepare email settings
    const businessName = userSettings?.businessName || 'MusoBuddy';
    const fromName = userSettings?.emailFromName || businessName;
    const fromEmail = `${fromName} <noreply@mg.musobuddy.com>`;
    const replyToEmail = userSettings?.businessEmail || 'noreply@mg.musobuddy.com';
    
    // Generate app-based download URL as fallback
    const appDownloadUrl = `https://musobuddy.replit.app/api/contracts/${contract.id}/download`;
    const finalDownloadUrl = cloudDownloadUrl || appDownloadUrl;
    
    console.log('🔗 CONFIRMATION: Download URL for emails:', finalDownloadUrl);
    
    // EMAIL 1: Send confirmation to CLIENT
    const clientEmailHtml = generateClientConfirmationHtml(
      contract,
      userSettings,
      finalDownloadUrl,
      signatureDetails
    );
    
    const clientEmailData: EmailData = {
      to: contract.clientEmail,
      from: fromEmail,
      subject: `Contract Signed Successfully - ${contract.contractNumber}`,
      html: clientEmailHtml,
      replyTo: replyToEmail,
      attachments: [
        {
          content: pdfBuffer.toString('base64'),
          filename: `Contract-${contract.contractNumber}-Signed.pdf`,
          type: 'application/pdf',
          disposition: 'attachment'
        }
      ]
    };
    
    console.log('📧 CONFIRMATION: Sending email to client:', contract.clientEmail);
    const clientEmailSuccess = await sendEmail(clientEmailData);
    
    if (!clientEmailSuccess) {
      console.error('❌ CONFIRMATION: Failed to send client confirmation email');
    } else {
      console.log('✅ CONFIRMATION: Client confirmation email sent successfully');
    }
    
    // EMAIL 2: Send notification to PERFORMER
    const performerEmail = userSettings?.businessEmail || replyToEmail;
    
    if (performerEmail && performerEmail !== 'noreply@mg.musobuddy.com') {
      const performerEmailHtml = generatePerformerConfirmationHtml(
        contract,
        userSettings,
        finalDownloadUrl,
        signatureDetails
      );
      
      const performerEmailData: EmailData = {
        to: performerEmail,
        from: fromEmail,
        subject: `Contract Signed by Client - ${contract.contractNumber}`,
        html: performerEmailHtml,
        replyTo: replyToEmail,
        attachments: [
          {
            content: pdfBuffer.toString('base64'),
            filename: `Contract-${contract.contractNumber}-Signed.pdf`,
            type: 'application/pdf',
            disposition: 'attachment'
        }
      ]
      };
      
      console.log('📧 CONFIRMATION: Sending email to performer:', performerEmail);
      const performerEmailSuccess = await sendEmail(performerEmailData);
      
      if (!performerEmailSuccess) {
        console.error('❌ CONFIRMATION: Failed to send performer confirmation email');
      } else {
        console.log('✅ CONFIRMATION: Performer confirmation email sent successfully');
      }
      
      return clientEmailSuccess && performerEmailSuccess;
    } else {
      console.warn('⚠️ CONFIRMATION: No performer email configured, only sending client confirmation');
      return clientEmailSuccess;
    }
    
  } catch (error) {
    console.error('❌ CONFIRMATION: Error sending confirmation emails:', error);
    return false;
  }
}

/**
 * Generate HTML for client confirmation email
 */
function generateClientConfirmationHtml(
  contract: Contract,
  userSettings: UserSettings | null,
  downloadUrl: string,
  signatureDetails: any
): string {
  const businessName = userSettings?.businessName || 'MusoBuddy';
  
  return `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #d1fae5; border: 1px solid #10b981; border-radius: 8px; padding: 20px; margin-bottom: 20px; text-align: center;">
          <h2 style="color: #065f46; margin-top: 0;">✅ Contract Signed Successfully!</h2>
          <p style="color: #047857; font-size: 18px; margin: 0;">Thank you for signing your performance contract.</p>
        </div>
        
        <p>Dear ${contract.clientName},</p>
        
        <p>Your performance contract <strong>${contract.contractNumber}</strong> has been successfully signed and is now legally binding.</p>
        
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #374151; margin-top: 0;">📋 Event Details Confirmed</h3>
          <p><strong>Date:</strong> ${new Date(contract.eventDate).toLocaleDateString('en-GB')}</p>
          <p><strong>Time:</strong> ${contract.eventTime}</p>
          <p><strong>Venue:</strong> ${contract.venue}</p>
          <p><strong>Performance Fee:</strong> £${contract.fee}</p>
          <p><strong>Signed on:</strong> ${signatureDetails.signedAt.toLocaleString('en-GB')}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${downloadUrl}" 
             style="background-color: #059669; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 18px;">
            📄 Download Signed Contract
          </a>
        </div>
        
        <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #92400e;">
            <strong>Important:</strong> Please save a copy of your signed contract for your records. 
            This document contains all the terms and conditions for your event.
          </p>
        </div>
        
        <p>A copy of the signed contract is also attached to this email.</p>
        
        <p>We look forward to performing at your event! If you have any questions, please don't hesitate to contact us.</p>
        
        <p>Best regards,<br>
        <strong>${businessName}</strong></p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="font-size: 12px; color: #6b7280; text-align: center;">
          Powered by MusoBuddy – less admin, more music
        </p>
      </body>
    </html>
  `;
}

/**
 * Generate HTML for performer confirmation email
 */
function generatePerformerConfirmationHtml(
  contract: Contract,
  userSettings: UserSettings | null,
  downloadUrl: string,
  signatureDetails: any
): string {
  const businessName = userSettings?.businessName || 'MusoBuddy';
  
  return `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #d1fae5; border: 1px solid #10b981; border-radius: 8px; padding: 20px; margin-bottom: 20px; text-align: center;">
          <h2 style="color: #065f46; margin-top: 0;">🎉 Great News!</h2>
          <p style="color: #047857; font-size: 18px; margin: 0;">Contract ${contract.contractNumber} has been signed by your client.</p>
        </div>
        
        <p>Hello,</p>
        
        <p>Your client <strong>${contract.clientName}</strong> has successfully signed the performance contract.</p>
        
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #374151; margin-top: 0;">📋 Event Details</h3>
          <p><strong>Client:</strong> ${contract.clientName} (${contract.clientEmail})</p>
          <p><strong>Date:</strong> ${new Date(contract.eventDate).toLocaleDateString('en-GB')}</p>
          <p><strong>Time:</strong> ${contract.eventTime}</p>
          <p><strong>Venue:</strong> ${contract.venue}</p>
          <p><strong>Performance Fee:</strong> £${contract.fee}</p>
          <p><strong>Signed on:</strong> ${signatureDetails.signedAt.toLocaleString('en-GB')}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${downloadUrl}" 
             style="background-color: #6366f1; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 18px;">
            📄 Download Signed Contract
          </a>
        </div>
        
        <div style="background-color: #dbeafe; border: 1px solid #3b82f6; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #1e40af;">
            <strong>Next Steps:</strong> You can now create and send an invoice for this performance. 
            The signed contract is attached and also available for download using the link above.
          </p>
        </div>
        
        <p>Best regards,<br>
        <strong>MusoBuddy</strong></p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="font-size: 12px; color: #6b7280; text-align: center;">
          Powered by MusoBuddy – less admin, more music
        </p>
      </body>
    </html>
  `;
}