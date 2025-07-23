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

  } catch (error) {
    console.error('❌ Contract signing email error:', error);
    return { 
      success: false, 
      diagnostics: { error: error.message } 
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

  } catch (error) {
    console.error('❌ Confirmation emails error:', error);
    return { 
      success: false, 
      diagnostics: { error: error.message } 
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