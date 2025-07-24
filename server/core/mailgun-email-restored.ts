import formData from 'form-data';
import Mailgun from 'mailgun.js';
import type { Contract, Invoice, UserSettings, Booking } from '@shared/schema';
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
  cc?: string;
  attachments?: Array<{
    content: string;
    filename: string;
    type: string;
    disposition: string;
  }>;
}

// ENHANCED: Diagnostic email sending function with detailed logging
export async function sendEmail(emailData: EmailData): Promise<{ success: boolean; messageId?: string; diagnostics?: any }> {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    attempt: 1,
    config: {},
    apiResponse: null,
    errors: []
  };

  try {
    console.log('🔍 === MAILGUN DIAGNOSTIC START ===');
    console.log('📧 Email attempt at:', diagnostics.timestamp);
    console.log('📧 Recipient:', emailData.to);
    console.log('📧 Subject:', emailData.subject);

    // Enhanced environment variable checking
    diagnostics.config = {
      hasApiKey: !!process.env.MAILGUN_API_KEY,
      apiKeyLength: process.env.MAILGUN_API_KEY?.length || 0,
      apiKeyPrefix: process.env.MAILGUN_API_KEY?.substring(0, 8) + '...',
      hasPublicKey: !!process.env.MAILGUN_PUBLIC_KEY,
      domain: 'mg.musobuddy.com',
      nodeEnv: process.env.NODE_ENV
    };

    console.log('🔧 Mailgun configuration check:');
    console.log('   API Key present:', diagnostics.config.hasApiKey);
    console.log('   API Key length:', diagnostics.config.apiKeyLength);
    console.log('   API Key prefix:', diagnostics.config.apiKeyPrefix);
    console.log('   Domain:', diagnostics.config.domain);
    console.log('   Environment:', diagnostics.config.nodeEnv);

    if (!process.env.MAILGUN_API_KEY) {
      throw new Error('MAILGUN_API_KEY environment variable is required');
    }

    if (diagnostics.config.apiKeyLength < 30) {
      console.warn('⚠️ WARNING: API key seems short, might be invalid');
      diagnostics.errors.push('API key length suspicious');
    }

    // CRITICAL: Use EU endpoint for mg.musobuddy.com
    const domain = 'mg.musobuddy.com';
    const mgEndpoint = 'https://api.eu.mailgun.net'; // EU endpoint is critical for mg.musobuddy.com

    console.log('🌐 Using Mailgun endpoint:', mgEndpoint);
    console.log('🌐 Using domain:', domain);

    // Create Mailgun client with EU endpoint
    const mg = mailgun.client({
      username: 'api',
      key: process.env.MAILGUN_API_KEY,
      url: mgEndpoint
    });

    // Enhanced message data preparation
    const messageData: any = {
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
      text: emailData.text || '',
      html: emailData.html || '',
      // ENHANCED: Add tracking parameters
      'o:tracking': 'yes',
      'o:tracking-clicks': 'yes',
      'o:tracking-opens': 'yes'
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
      console.log('📎 Attachments added:', emailData.attachments.length);
    }

    console.log('📤 Sending email via Mailgun...');
    console.log('📤 Message data structure:', {
      from: messageData.from,
      to: messageData.to,
      subject: messageData.subject,
      hasHtml: !!messageData.html,
      hasText: !!messageData.text,
      hasAttachments: !!messageData.attachment,
      tracking: messageData['o:tracking']
    });

    // Send email with enhanced error handling
    const startTime = Date.now();
    const result = await mg.messages.create(domain, messageData);
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    diagnostics.apiResponse = {
      messageId: result.id,
      message: result.message,
      responseTime: responseTime + 'ms',
      status: 'success'
    };

    console.log('✅ === MAILGUN API SUCCESS ===');
    console.log('✅ Message ID:', result.id);
    console.log('✅ API Response:', result.message);
    console.log('✅ Response time:', responseTime + 'ms');
    console.log('✅ From:', emailData.from);
    console.log('✅ To:', emailData.to);
    console.log('✅ Subject:', emailData.subject);

    // CRITICAL: Add delivery expectation warning
    console.log('⏰ DELIVERY EXPECTATION: Email should arrive within 1-5 minutes');
    console.log('🔍 TROUBLESHOOTING: If email doesn\'t arrive:');
    console.log('   1. Check spam/junk folders');
    console.log('   2. Verify recipient email address');
    console.log('   3. Check Mailgun logs at https://app.mailgun.com/app/logs');
    console.log('   4. Verify domain DNS settings (SPF, DKIM)');

    return { 
      success: true, 
      messageId: result.id,
      diagnostics 
    };

  } catch (error: any) {
    const errorTime = Date.now();
    diagnostics.apiResponse = {
      error: error.message,
      status: error.status || 'unknown',
      type: error.type || 'unknown',
      responseTime: 'failed'
    };

    console.error('❌ === MAILGUN API FAILURE ===');
    console.error('❌ Error message:', error.message);
    console.error('❌ Error status:', error.status);
    console.error('❌ Error type:', error.type);
    console.error('❌ Full error:', error);

    if (error.status === 401) {
      console.error('🔑 AUTH ERROR: Invalid API key or domain not verified');
      diagnostics.errors.push('Authentication failed - check API key and domain verification');
    } else if (error.status === 400) {
      console.error('📧 VALIDATION ERROR: Email data invalid');
      diagnostics.errors.push('Email validation failed - check recipient address and content');
    } else if (error.status >= 500) {
      console.error('🔥 MAILGUN SERVER ERROR: Service may be down');
      diagnostics.errors.push('Mailgun server error - service may be temporarily unavailable');
    }

    return { 
      success: false, 
      diagnostics 
    };
  }
}

// CRITICAL: Contract SIGNING email (sends "please sign this contract" with link)
export async function sendContractEmail(
  contract: Contract,
  userSettings: UserSettings | null,
  customMessage?: string,
  signingUrl?: string
): Promise<{ success: boolean; messageId?: string; diagnostics?: any }> {
  try {
    console.log('📧 === CONTRACT SIGNING EMAIL START ===');
    console.log('📧 Contract:', contract.contractNumber);
    console.log('📧 Client:', contract.clientName);
    console.log('📧 Email:', contract.clientEmail);
    console.log('📧 Signing URL:', signingUrl);
    console.log('📧 Contract Status:', contract.status);

    // CRITICAL: This function sends "PLEASE SIGN" emails, NOT confirmation emails
    const isSignedContract = contract.status === 'signed';

    if (isSignedContract) {
      console.log('❌ ERROR: Contract already signed, should not send signing email');
      return { success: false, diagnostics: { error: 'Contract already signed' } };
    }

    // Generate PDF buffer for attachment
    console.log('📄 Generating contract PDF for email attachment...');
    const pdfBuffer = await generateContractPDF(contract, userSettings);
    console.log('📄 PDF generated, size:', pdfBuffer.length, 'bytes');

    // Prepare email settings
    const businessName = userSettings?.businessName || 'MusoBuddy';
    const fromName = userSettings?.emailFromName || businessName;
    const fromEmail = `${fromName} <noreply@mg.musobuddy.com>`;
    const replyToEmail = userSettings?.businessEmail || 'noreply@mg.musobuddy.com';

    // CORRECT subject for signing email
    const subject = customMessage || `Contract ready for signing - ${contract.contractNumber}`;

    console.log('📧 Email configuration:');
    console.log('   From:', fromEmail);
    console.log('   To:', contract.clientEmail);
    console.log('   Reply-to:', replyToEmail);
    console.log('   Subject:', subject);

    // CRITICAL: Generate SIGNING email HTML (not confirmation)
    const emailHtml = generateContractSigningEmailHtml(
      contract,
      userSettings,
      customMessage,
      signingUrl
    );

    // Create email with PDF attachment
    const emailData: EmailData = {
      to: contract.clientEmail || '',
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

    console.log('📧 Sending CONTRACT SIGNING email...');

    // Send email with enhanced diagnostics
    const result = await sendEmail(emailData);

    if (result.success) {
      console.log('✅ === CONTRACT SIGNING EMAIL SUCCESS ===');
      console.log('✅ Message ID:', result.messageId);
      console.log('📎 PDF attached to email');
      console.log('🔗 Signing URL included:', signingUrl);

      // ENHANCED: Add expected delivery time
      const expectedDelivery = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
      console.log('⏰ Expected delivery by:', expectedDelivery.toLocaleTimeString());
    } else {
      console.error('❌ === CONTRACT SIGNING EMAIL FAILURE ===');
      console.error('❌ Diagnostics:', result.diagnostics);
    }

    return result;

  } catch (error: any) {
    console.error('❌ Contract signing email error:', error);
    return { 
      success: false, 
      diagnostics: { error: error?.message || 'Unknown error' } 
    };
  }
}

// CRITICAL: Generate HTML for CONTRACT SIGNING email (not confirmation)
function generateContractSigningEmailHtml(
  contract: Contract,
  userSettings: UserSettings | null,
  customMessage?: string,
  signingUrl?: string
): string {
  const businessName = userSettings?.businessName || 'MusoBuddy';

  // ENHANCED: Add debugging info to email for troubleshooting
  const debugInfo = process.env.NODE_ENV === 'development' ? `
    <!-- DEBUG INFO -->
    <!-- Generated: ${new Date().toISOString()} -->
    <!-- Contract: ${contract.contractNumber} -->
    <!-- Signing URL: ${signingUrl || 'none'} -->
    <!-- Status: ${contract.status} -->
    <!-- Template: CONTRACT SIGNING EMAIL -->
  ` : '';

  // CRITICAL: This is the SIGNING email, not confirmation
  const signInstructions = `
    <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
      <h3 style="color: #1e40af; margin-top: 0;">📝 Action Required</h3>
      <p style="margin: 10px 0; font-size: 16px; font-weight: 500;">Please review and sign this contract to confirm your booking.</p>
      <div style="text-align: center; margin: 25px 0;">
        <a href="${signingUrl || `https://musobuddy.replit.app/contracts/sign/${contract.id}`}" 
           style="background-color: #1e40af; color: #ffffff; padding: 18px 36px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 18px; border: none; box-shadow: 0 4px 8px rgba(0,0,0,0.2); text-transform: uppercase; letter-spacing: 0.5px; transition: all 0.3s;">
          📝 SIGN CONTRACT NOW
        </a>
      </div>
      <p style="margin: 15px 0; font-size: 14px; color: #6b7280; text-align: center;">
        ${signingUrl ? '☁️ Signing page hosted on secure cloud storage' : '🔗 Signing page hosted on our secure servers'}
      </p>
    </div>
  `;

  const customMessageHtml = customMessage ? `
    <div style="background-color: #f0f9ff; padding: 15px; border-radius: 6px; margin: 20px 0;">
      <h4 style="color: #1e40af; margin-top: 0;">Personal Message:</h4>
      <p style="margin: 0; white-space: pre-wrap;">${customMessage}</p>
    </div>
  ` : '';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Contract from ${businessName}</title>
        ${debugInfo}
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">Contract Ready for Signing</h2>

        <p>Dear ${contract.clientName},</p>

        <p>Please find attached your performance contract for the event on ${new Date(contract.eventDate).toLocaleDateString('en-GB')}.</p>

        ${customMessageHtml}
        ${signInstructions}

        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #374151; margin-top: 0;">📋 Event Details</h3>
          <p><strong>Date:</strong> ${new Date(contract.eventDate).toLocaleDateString('en-GB')}</p>
          <p><strong>Time:</strong> ${contract.eventTime}</p>
          <p><strong>Venue:</strong> ${contract.venue}</p>
          <p><strong>Performance Fee:</strong> £${contract.fee}</p>
        </div>

        <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0; border: 1px solid #e2e8f0;">
          <p style="margin: 0; color: #64748b;">📎 Your contract is attached as a PDF to this email for your records.</p>
        </div>

        <div style="background-color: #ecfdf5; padding: 15px; border-radius: 6px; margin: 20px 0; border: 1px solid #10b981;">
          <p style="margin: 0; color: #065f46; font-weight: 500;">
            ✅ <strong>Next Step:</strong> Click the "Sign Contract Now" button above to digitally sign your contract and confirm your booking.
          </p>
        </div>

        <p>If you have any questions, please don't hesitate to contact me.</p>

        <p>Best regards,<br>
        ${businessName}</p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="font-size: 12px; color: #6b7280; text-align: center;">
          Powered by MusoBuddy – less admin, more music<br>
          Email ID: sign-${Date.now()}-${Math.random().toString(36).substr(2, 9)}
        </p>
      </body>
    </html>
  `;
}

// SEPARATE: Send confirmation emails AFTER contract is signed
export async function sendContractConfirmationEmails(
  contract: Contract,
  userSettings: UserSettings | null
): Promise<{ success: boolean; clientSuccess?: boolean; performerSuccess?: boolean; diagnostics?: any }> {
  try {
    console.log('📧 === CONFIRMATION EMAILS START ===');
    console.log('📧 Contract:', contract.contractNumber);
    console.log('📧 Status:', contract.status);

    // CRITICAL: Only send confirmation emails for signed contracts
    if (contract.status !== 'signed') {
      console.log('❌ ERROR: Contract not signed, cannot send confirmation emails');
      return { success: false, diagnostics: { error: 'Contract not signed' } };
    }

    // Generate signed contract PDF
    const signatureDetails = {
      signedAt: contract.signedAt ? new Date(contract.signedAt) : new Date(),
      signatureName: contract.clientName,
      clientIpAddress: 'contract-signing-page'
    };

    const pdfBuffer = await generateContractPDF(contract, userSettings, signatureDetails);

    // Upload signed contract to cloud storage
    let cloudDownloadUrl: string | null = null;
    if (isCloudStorageConfigured()) {
      console.log('☁️ Uploading signed contract to cloud storage...');
      const cloudResult = await uploadContractToCloud(contract, userSettings, signatureDetails);

      if (cloudResult.success && cloudResult.url) {
        cloudDownloadUrl = cloudResult.url;
        console.log('✅ Signed contract uploaded to cloud storage');

        // Update contract with cloud storage URL
        await storage.updateContract(contract.id, {
          cloudStorageUrl: cloudResult.url,
          cloudStorageKey: cloudResult.key,
          signingUrlCreatedAt: new Date()
        }, contract.userId);
      }
    }

    // Prepare email settings
    const businessName = userSettings?.businessName || 'MusoBuddy';
    const fromName = userSettings?.emailFromName || businessName;
    const fromEmail = `${fromName} <noreply@mg.musobuddy.com>`;
    const replyToEmail = userSettings?.businessEmail || 'noreply@mg.musobuddy.com';

    const appDownloadUrl = `https://musobuddy.replit.app/api/contracts/${contract.id}/download`;
    const finalDownloadUrl = cloudDownloadUrl || appDownloadUrl;

    let clientSuccess = false;
    let performerSuccess = false;
    const diagnostics: any = {
      clientEmail: null,
      performerEmail: null
    };

    // EMAIL 1: Send confirmation to CLIENT
    console.log('📧 Sending client confirmation email...');
    const clientEmailHtml = generateClientConfirmationHtml(contract, userSettings, finalDownloadUrl, signatureDetails);

    const clientEmailData: EmailData = {
      to: contract.clientEmail || '',
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

    const clientResult = await sendEmail(clientEmailData);
    clientSuccess = clientResult.success;
    diagnostics.clientEmail = clientResult.diagnostics;

    // EMAIL 2: Send notification to PERFORMER
    const performerEmail = userSettings?.businessEmail || replyToEmail;

    if (performerEmail && performerEmail !== 'noreply@mg.musobuddy.com') {
      console.log('📧 Sending performer notification email...');
      const performerEmailHtml = generatePerformerConfirmationHtml(contract, userSettings, finalDownloadUrl, signatureDetails);

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

      const performerResult = await sendEmail(performerEmailData);
      performerSuccess = performerResult.success;
      diagnostics.performerEmail = performerResult.diagnostics;
    } else {
      console.warn('⚠️ No performer email configured, skipping performer notification');
      performerSuccess = true; // Don't fail if no performer email
    }

    const overallSuccess = clientSuccess && performerSuccess;

    console.log('📧 === CONFIRMATION EMAILS COMPLETE ===');
    console.log('✅ Client email success:', clientSuccess);
    console.log('✅ Performer email success:', performerSuccess);
    console.log('✅ Overall success:', overallSuccess);

    return {
      success: overallSuccess,
      clientSuccess,
      performerSuccess,
      diagnostics
    };

  } catch (error: any) {
    console.error('❌ Confirmation emails error:', error);
    return { 
      success: false, 
      diagnostics: { error: error?.message || 'Unknown error' } 
    };
  }
}

// Helper functions for confirmation emails
function generateClientConfirmationHtml(contract: Contract, userSettings: UserSettings | null, downloadUrl: string, signatureDetails: any): string {
  const businessName = userSettings?.businessName || 'MusoBuddy';

  return `
    <!DOCTYPE html>
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

        <p>A copy of the signed contract is also attached to this email.</p>

        <p>We look forward to performing at your event!</p>

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

function generatePerformerConfirmationHtml(contract: Contract, userSettings: UserSettings | null, downloadUrl: string, signatureDetails: any): string {
  return `
    <!DOCTYPE html>
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

        <p>The signed contract is attached and also available for download using the link above.</p>

        <p>Best regards,<br>
        <strong>MusoBuddy</strong></p>
      </body>
    </html>
  `;
}

// INVOICE EMAIL SENDING - COPIED FROM CONTRACT PATTERN  
export async function sendInvoiceEmail(
  invoice: any,
  userSettings: any,
  subject: string,
  viewUrl: string
): Promise<{ success: boolean; messageId?: string; diagnostics?: any }> {
  try {
    console.log('📧 INVOICE EMAIL: Starting invoice email send');
    console.log('📧 INVOICE EMAIL: Invoice ID:', invoice.id);
    console.log('📧 INVOICE EMAIL: Client email:', invoice.clientEmail);
    console.log('📧 INVOICE EMAIL: View URL:', viewUrl);

    if (!process.env.MAILGUN_API_KEY) {
      console.error('❌ MAILGUN_API_KEY not configured');
      return { success: false, diagnostics: { error: 'Mailgun not configured' } };
    }

    const domain = 'mg.musobuddy.com';
    
    // Determine sender email (use authenticated domain for delivery)
    const senderEmail = `noreply@${domain}`;
    
    // Determine reply-to email (use business email if available)
    const replyToEmail = userSettings?.email || userSettings?.businessEmail || senderEmail;
    
    console.log('📧 INVOICE EMAIL: Sender config:', {
      from: senderEmail,
      replyTo: replyToEmail,
      to: invoice.clientEmail
    });

    const emailData: EmailData = {
      from: `${userSettings?.businessName || 'MusoBuddy'} <${senderEmail}>`,
      to: invoice.clientEmail,
      subject: subject || `Invoice ${invoice.invoiceNumber} - View and Download`,
      html: generateInvoiceEmailHTML(invoice, userSettings, viewUrl),
      replyTo: replyToEmail
    };

    // Add CC email if provided
    if (invoice.ccEmail) {
      emailData.cc = invoice.ccEmail;
      console.log('📧 INVOICE EMAIL: CC recipient:', invoice.ccEmail);
    }

    console.log('📧 INVOICE EMAIL: Calling Mailgun API...');
    
    const result = await sendEmail(emailData);
    
    console.log('✅ INVOICE EMAIL: Send result:', result.success);
    if (result.messageId) {
      console.log('✅ INVOICE EMAIL: Message ID:', result.messageId);
    }
    
    return result;
    
  } catch (error: any) {
    console.error('❌ INVOICE EMAIL: Send failed:', error);
    return {
      success: false,
      diagnostics: {
        error: error.message,
        details: error
      }
    };
  }
}

// Generate HTML content for invoice emails - COPIED FROM CONTRACT PATTERN
function generateInvoiceEmailHTML(invoice: any, userSettings: any, viewUrl: string): string {
  const businessName = userSettings?.businessName || 'MusoBuddy';
  const businessEmail = userSettings?.email || userSettings?.businessEmail;

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice ${invoice.invoiceNumber}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .invoice-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .detail-row { margin: 10px 0; padding: 5px 0; }
        .detail-row strong { color: #374151; }
        .view-button { display: inline-block; background: #059669; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .view-button:hover { background: #047857; }
        .footer { margin-top: 30px; font-size: 14px; color: #6b7280; text-align: center; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📄 Invoice Ready</h1>
        <p>Invoice ${invoice.invoiceNumber}</p>
    </div>
    
    <div class="content">
        <p>Dear ${invoice.clientName},</p>
        
        <p>Your invoice is ready for viewing and payment. You can access your invoice using the link below:</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${viewUrl}" class="view-button">📄 View Invoice</a>
        </div>
        
        <div class="invoice-details">
            <h3>Invoice Details</h3>
            <div class="detail-row">
                <strong>Invoice Number:</strong> ${invoice.invoiceNumber}
            </div>
            <div class="detail-row">
                <strong>Amount:</strong> £${invoice.amount}
            </div>
            <div class="detail-row">
                <strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString('en-GB')}
            </div>
            ${invoice.eventDate ? `
            <div class="detail-row">
                <strong>Event Date:</strong> ${new Date(invoice.eventDate).toLocaleDateString('en-GB')}
            </div>
            ` : ''}
        </div>
        
        <p>The invoice can be viewed and downloaded directly from the link above. No account or login is required.</p>
        
        <p>If you have any questions about this invoice, please don't hesitate to contact us.</p>
        
        <p>Best regards,<br>
        ${businessName}${businessEmail ? `<br><a href="mailto:${businessEmail}">${businessEmail}</a>` : ''}</p>
    </div>
    
    <div class="footer">
        <p>This email was sent by ${businessName} via MusoBuddy</p>
        <p>Invoice viewing link expires in 30 days</p>
    </div>
</body>
</html>
  `;
}

// COMPLIANCE EMAIL SENDING - NEW FUNCTION FOR SENDING COMPLIANCE DOCUMENTS
export async function sendComplianceEmail(
  recipientEmail: string,
  booking: any,
  complianceDocuments: any[],
  customMessage: string,
  userSettings: any
): Promise<{ success: boolean; messageId?: string; diagnostics?: any }> {
  try {
    console.log('📋 COMPLIANCE EMAIL: Starting compliance email send');
    console.log('📋 COMPLIANCE EMAIL: Recipient:', recipientEmail);
    console.log('📋 COMPLIANCE EMAIL: Documents count:', complianceDocuments.length);
    console.log('📋 COMPLIANCE EMAIL: Booking ID:', booking.id);

    if (!process.env.MAILGUN_API_KEY) {
      console.error('❌ MAILGUN_API_KEY not configured');
      return { success: false, diagnostics: { error: 'Mailgun not configured' } };
    }

    const domain = 'mg.musobuddy.com';
    
    // Determine sender email (use authenticated domain for delivery)
    const senderEmail = `noreply@${domain}`;
    
    // Determine reply-to email (use business email if available)
    const replyToEmail = userSettings?.email || userSettings?.businessEmail || senderEmail;
    
    console.log('📋 COMPLIANCE EMAIL: Sender config:', {
      from: senderEmail,
      replyTo: replyToEmail,
      to: recipientEmail
    });

    const emailData: EmailData = {
      from: `${userSettings?.businessName || 'MusoBuddy'} <${senderEmail}>`,
      to: recipientEmail,
      subject: `Compliance Documents for ${booking.venue} - ${new Date(booking.eventDate).toLocaleDateString('en-GB')}`,
      html: generateComplianceEmailHTML(booking, complianceDocuments, customMessage, userSettings),
      replyTo: replyToEmail
    };

    // Note: Documents are linked in email body using R2 URLs, not attached
    console.log('📋 COMPLIANCE EMAIL: Documents will be linked (not attached) using R2 URLs');

    console.log('📋 COMPLIANCE EMAIL: Calling Mailgun API...');
    
    const result = await sendEmail(emailData);
    
    console.log('✅ COMPLIANCE EMAIL: Send result:', result.success);
    if (result.messageId) {
      console.log('✅ COMPLIANCE EMAIL: Message ID:', result.messageId);
    }
    
    return result;
    
  } catch (error: any) {
    console.error('❌ COMPLIANCE EMAIL: Send failed:', error);
    return {
      success: false,
      diagnostics: {
        error: error.message,
        details: error
      }
    };
  }
}

// Generate HTML content for compliance emails
function generateComplianceEmailHTML(booking: any, complianceDocuments: any[], customMessage: string, userSettings: any): string {
  const businessName = userSettings?.businessName || 'MusoBuddy';
  const businessEmail = userSettings?.email || userSettings?.businessEmail;

  const documentsList = complianceDocuments.map((doc: any) => {
    const getDocumentTypeLabel = (type: string): string => {
      switch (type) {
        case 'public_liability':
          return 'Public Liability Insurance';
        case 'pat_testing':
          return 'PAT Testing Certificate';
        case 'music_license':
          return 'Music Performance License';
        default:
          return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      }
    };

    return `
      <div style="background: white; padding: 15px; border-radius: 6px; margin: 10px 0; border-left: 4px solid #10b981;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="flex: 1;">
            <strong style="color: #065f46;">${getDocumentTypeLabel(doc.type)}</strong>
            ${doc.expiryDate ? `<br><span style="color: #6b7280; font-size: 14px;">Expires: ${new Date(doc.expiryDate).toLocaleDateString('en-GB')}</span>` : ''}
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="background: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">
              ${doc.status === 'valid' ? '✅ Valid' : doc.status === 'expiring' ? '⚠️ Expiring' : '❌ Expired'}
            </span>
            <a href="${doc.documentUrl}" 
               style="background-color: #10b981; color: white; padding: 8px 16px; text-decoration: none; border-radius: 5px; font-size: 14px; font-weight: bold; margin-right: 10px;"
               target="_blank">
              📄 Download
            </a>
            <a href="${process.env.NODE_ENV === 'production' ? 'https://musobuddy.replit.app' : 'http://localhost:5000'}/view/compliance/${doc.id}" 
               style="background-color: #2563eb; color: white; padding: 8px 16px; text-decoration: none; border-radius: 5px; font-size: 14px; font-weight: bold;"
               target="_blank">
              👁️ View
            </a>
          </div>
        </div>
      </div>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Compliance Documents - ${booking.venue}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .event-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .detail-row { margin: 10px 0; padding: 5px 0; }
        .detail-row strong { color: #374151; }
        .documents-section { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .footer { margin-top: 30px; font-size: 14px; color: #6b7280; text-align: center; }
        .message-content { white-space: pre-line; background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6366f1; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🛡️ Compliance Documentation</h1>
        <p>Professional Certifications & Insurance</p>
    </div>
    
    <div class="content">
        ${customMessage ? `
        <div class="message-content">
            ${customMessage}
        </div>
        ` : `
        <p>Dear ${booking.clientName},</p>
        
        <p>Please find below the compliance documentation for our upcoming event. Click the download buttons to access each document:</p>
        `}
        
        <div class="event-details">
            <h3>📅 Event Details</h3>
            <div class="detail-row">
                <strong>Event:</strong> ${booking.venue || 'Performance'}
            </div>
            <div class="detail-row">
                <strong>Date:</strong> ${new Date(booking.eventDate).toLocaleDateString('en-GB')}
            </div>
            ${booking.eventTime ? `
            <div class="detail-row">
                <strong>Time:</strong> ${booking.eventTime}
            </div>
            ` : ''}
            ${booking.venueAddress ? `
            <div class="detail-row">
                <strong>Venue:</strong> ${booking.venueAddress}
            </div>
            ` : ''}
        </div>
        
        <div class="documents-section">
            <h3>📋 Available Documents</h3>
            ${documentsList}
        </div>
        
        <p>All documents are current and valid and can be downloaded directly using the links above. If you require any additional documentation or have questions about our compliance status, please don't hesitate to contact us.</p>
        
        <p>We look forward to providing an excellent musical experience for your event.</p>
        
        <p>Best regards,<br>
        ${businessName}${businessEmail ? `<br><a href="mailto:${businessEmail}">${businessEmail}</a>` : ''}</p>
    </div>
    
    <div class="footer">
        <p>This email was sent by ${businessName} via MusoBuddy</p>
        <p>All compliance documents are professionally managed and regularly updated</p>
    </div>
</body>
</html>
  `;
}

// Replace template variables with booking data
function replaceTemplateVariables(content: string, booking: Booking, userSettings: UserSettings): string {
  // Format performance duration - now stored as text
  const formatDuration = (duration: string | number | null) => {
    if (!duration) return '[Performance Duration]';
    // If it's already text, return as-is
    if (typeof duration === 'string') return duration;
    // If it's a number (legacy data), convert to readable format
    const hours = Math.floor(duration / 60);
    const mins = duration % 60;
    if (hours === 0) return `${mins} minutes`;
    if (mins === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    return `${hours} hour${hours > 1 ? 's' : ''} ${mins} minutes`;
  };

  // Format fee with proper currency
  const formatFee = (fee: any) => {
    if (!fee) return '[Fee]';
    const numericFee = typeof fee === 'string' ? parseFloat(fee) : fee;
    return numericFee.toFixed(2); // Return just the number, £ sign added in template
  };

  // Business signature from settings - proper format requested by user
  const businessSignature = `Best regards,\n${userSettings?.businessName || 'MusoBuddy'}\n${userSettings?.businessEmail || ''}\n${userSettings?.phone || ''}`.trim();

  // Process content and check for multiple business name occurrences
  let processedContent = content
    // Client details
    .replace(/\[Client Name\]/g, booking.clientName || '[Client Name]')
    .replace(/\[client name\]/g, booking.clientName || '[Client Name]')
    .replace(/\[CLIENT NAME\]/g, (booking.clientName || '[Client Name]').toUpperCase())
    
    // Event details
    .replace(/\[Event Date\]/g, booking.eventDate ? new Date(booking.eventDate).toLocaleDateString('en-GB') : '[Event Date]')
    .replace(/\[event date\]/g, booking.eventDate ? new Date(booking.eventDate).toLocaleDateString('en-GB') : '[Event Date]')
    .replace(/\[date\]/g, booking.eventDate ? new Date(booking.eventDate).toLocaleDateString('en-GB') : '[Date]')
    .replace(/\[Date\]/g, booking.eventDate ? new Date(booking.eventDate).toLocaleDateString('en-GB') : '[Date]')
    
    .replace(/\[Venue\]/g, booking.venue || '[Venue]')
    .replace(/\[venue\]/g, booking.venue || '[Venue]')
    
    .replace(/\[Event Time\]/g, booking.eventTime || '[Event Time]')
    .replace(/\[event time\]/g, booking.eventTime || '[Event Time]')
    
    // Financial details
    .replace(/\[Fee\]/g, formatFee(booking.fee))
    .replace(/\[fee\]/g, formatFee(booking.fee))
    .replace(/\[FEE\]/g, formatFee(booking.fee))
    
    // Performance details
    .replace(/\[Performance Duration\]/g, formatDuration(booking.performanceDuration))
    .replace(/\[performance duration\]/g, formatDuration(booking.performanceDuration))
    .replace(/\[Duration\]/g, formatDuration(booking.performanceDuration))
    .replace(/\[duration\]/g, formatDuration(booking.performanceDuration))
    
    .replace(/\[Repertoire\]/g, booking.styles || '[Styles]')
    .replace(/\[repertoire\]/g, booking.styles || '[Styles]')
    .replace(/\[Styles\]/g, booking.styles || '[Styles]')
    .replace(/\[styles\]/g, booking.styles || '[Styles]')
    .replace(/\[Style\/Genre\]/g, booking.styles || '[Styles]')
    .replace(/\[style\/genre\]/g, booking.styles || '[Styles]')
    
    .replace(/\[Equipment Provided\]/g, booking.equipmentProvided || '[Equipment Provided]')
    .replace(/\[equipment provided\]/g, booking.equipmentProvided || '[Equipment Provided]')
    .replace(/\{Equipment provided\}/g, booking.equipmentProvided || '[Equipment Provided]')
    .replace(/\[Equipment details\]/g, booking.equipmentProvided || '[Equipment Provided]')
    .replace(/\[equipment details\]/g, booking.equipmentProvided || '[Equipment Provided]')
    
    .replace(/\[What's Included\]/g, booking.whatsIncluded || '[What\'s Included]')
    .replace(/\[whats included\]/g, booking.whatsIncluded || '[What\'s Included]')
    .replace(/\[What\'s Included\]/g, booking.whatsIncluded || '[What\'s Included]')
    .replace(/\[What's included\?\]/g, booking.whatsIncluded || '[What\'s Included]')
    .replace(/\{What's included\?\}/g, booking.whatsIncluded || '[What\'s Included]')
    
    // Financial details - additional patterns
    .replace(/\[Amount\]/g, formatFee(booking.fee))
    .replace(/\[amount\]/g, formatFee(booking.fee))
    .replace(/\[What's included\]/g, booking.whatsIncluded || '[What\'s included]')
    .replace(/\[what's included\]/g, booking.whatsIncluded || '[What\'s included]')
    .replace(/\[WHAT'S INCLUDED\]/g, booking.whatsIncluded || '[What\'s included]')
    
    // Business signature and individual business details
    .replace(/\[Business Signature\]/g, businessSignature)
    .replace(/\[business signature\]/g, businessSignature)
    .replace(/\[BUSINESS SIGNATURE\]/g, businessSignature)
    .replace(/\[Your Name\]/g, userSettings?.businessName || 'MusoBuddy')
    .replace(/\[Your Business Name\]/g, userSettings?.businessName || 'MusoBuddy')
    .replace(/\[Business Name\]/g, userSettings?.businessName || 'MusoBuddy')
    .replace(/\[Business Email\]/g, userSettings?.businessEmail || '')
    .replace(/\[Business Phone\]/g, userSettings?.phone || '')
    .replace(/\[Contact Details\]/g, `${userSettings?.businessEmail || ''}\n${userSettings?.phone || ''}`);

  // Clean up any duplicate business names that might appear close together
  const businessName = userSettings?.businessName || 'MusoBuddy';
  if (businessName && businessName !== 'MusoBuddy') {
    const duplicatePattern = new RegExp(`(${businessName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})([\\s\\n]{0,50}${businessName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'g');
    processedContent = processedContent.replace(duplicatePattern, '$1');
  }
  
  return processedContent;
}

// TEMPLATE EMAIL SENDING FUNCTION - Business Email Ghosting Implementation
export async function sendTemplateEmail(
  template: { subject: string; emailBody: string; smsBody?: string },
  booking: Booking,
  userSettings: UserSettings
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    console.log('📧 === TEMPLATE EMAIL SENDING START ===');
    console.log('📧 Recipient:', booking.clientEmail);
    console.log('📧 Template:', template.subject);
    
    if (!booking.clientEmail) {
      throw new Error('Client email is required');
    }

    // Get business email for reply-to (Option 2: Business Email Ghosting)
    const businessEmail = userSettings?.businessEmail;
    const businessName = userSettings?.businessName || 'MusoBuddy';
    
    if (!businessEmail) {
      throw new Error('Business email not configured in user settings');
    }

    // Generate professional HTML email with template content
    const emailHTML = generateTemplateEmailHTML(template, booking, userSettings);

    const emailData: EmailData = {
      to: booking.clientEmail,
      from: `${businessName} <noreply@mg.musobuddy.com>`, // MusoBuddy sends
      replyTo: businessEmail, // Replies go to business email
      subject: template.subject,
      html: emailHTML,
      text: replaceTemplateVariables(template.emailBody, booking, userSettings) // Plain text fallback with variables replaced
    };

    console.log('📧 Email configuration:', {
      from: emailData.from,
      replyTo: emailData.replyTo,
      to: emailData.to,
      subject: emailData.subject
    });

    const result = await sendEmail(emailData);
    
    if (result.success) {
      console.log('✅ Template email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } else {
      console.error('❌ Template email failed:', result.diagnostics);
      return { success: false, error: 'Failed to send email' };
    }
  } catch (error: any) {
    console.error('❌ Template email error:', error);
    return { success: false, error: error.message };
  }
}

// Generate professional HTML for template emails
function generateTemplateEmailHTML(
  template: { subject: string; emailBody: string },
  booking: Booking,
  userSettings: UserSettings
): string {
  const businessName = userSettings?.businessName || 'MusoBuddy';
  const businessEmail = userSettings?.businessEmail;
  
  // Replace template variables with booking data before converting to HTML
  console.log('🔄 Template replacement - Original body:', template.emailBody.substring(0, 200) + '...');
  console.log('🔄 Booking data for replacement:', {
    styles: booking.styles,
    performanceDuration: booking.performanceDuration,
    equipmentProvided: booking.equipmentProvided,
    whatsIncluded: booking.whatsIncluded,
    fee: booking.fee
  });
  
  const processedEmailBody = replaceTemplateVariables(template.emailBody, booking, userSettings);
  console.log('🔄 Template replacement - Processed body:', processedEmailBody.substring(0, 200) + '...');
  
  // Convert plain text email body to HTML with line breaks
  const htmlBody = processedEmailBody
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${template.subject}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .booking-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .detail-row { margin: 10px 0; padding: 5px 0; }
        .detail-row strong { color: #374151; }
        .footer { margin-top: 30px; font-size: 14px; color: #6b7280; text-align: center; }
        .message-content { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📧 Message from ${businessName}</h1>
        <p>Regarding: ${booking.venue || 'Your Booking'}</p>
    </div>
    
    <div class="content">
        ${booking.eventDate ? `
        <div class="booking-details">
            <h3>Booking Reference</h3>
            <div class="detail-row">
                <strong>Event Date:</strong> ${new Date(booking.eventDate).toLocaleDateString('en-GB')}
            </div>
            ${booking.eventTime ? `
            <div class="detail-row">
                <strong>Event Time:</strong> ${booking.eventTime}
            </div>` : ''}
            ${booking.venue ? `
            <div class="detail-row">
                <strong>Venue:</strong> ${booking.venue}
            </div>` : ''}
            ${booking.fee ? `
            <div class="detail-row">
                <strong>Fee:</strong> £${booking.fee}
            </div>` : ''}
        </div>` : ''}
        
        <div class="message-content">
            <p>${htmlBody}</p>
        </div>
        
        <p>Best regards,<br>
        ${businessName}${businessEmail ? `<br><a href="mailto:${businessEmail}">${businessEmail}</a>` : ''}</p>
    </div>
    
    <div class="footer">
        <p>This email was sent by ${businessName} via MusoBuddy</p>
        <p>Reply to this email to respond directly to ${businessName}</p>
    </div>
</body>
</html>
  `;
}

// Enhanced test function with comprehensive diagnostics
export async function testEmailSending(testEmail?: string): Promise<void> {
  console.log('🧪 === ENHANCED EMAIL TEST START ===');

  const recipient = testEmail || 'test@example.com';

  const testEmailData: EmailData = {
    to: recipient,
    from: 'MusoBuddy Test <noreply@mg.musobuddy.com>',
    subject: `MusoBuddy Email Test - ${new Date().toLocaleTimeString()}`,
    text: 'This is a test email to verify Mailgun integration.',
    html: `
      <h1>📧 MusoBuddy Email Test</h1>
      <p>This is a test email to verify Mailgun integration.</p>
      <p><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
      <p><strong>Test ID:</strong> test-${Date.now()}</p>
      <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p><strong>If you receive this email:</strong></p>
        <ul>
          <li>✅ Mailgun API integration is working</li>
          <li>✅ Authentication is successful</li>
          <li>✅ Email delivery is functional</li>
        </ul>
      </div>
    `
  };

  const result = await sendEmail(testEmailData);

  console.log('🧪 === EMAIL TEST COMPLETE ===');
  if (result.success) {
    console.log('✅ Test email sent successfully!');
    console.log('✅ Message ID:', result.messageId);
    console.log('⏰ Check your inbox within 1-5 minutes');
  } else {
    console.log('❌ Test email failed!');
    console.log('❌ Diagnostics:', result.diagnostics);
  }
}