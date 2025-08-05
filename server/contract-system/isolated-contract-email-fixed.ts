// FIXED ISOLATED CONTRACT EMAIL SERVICE - SOLVING DELIVERY ISSUES
// Version: 2025.08.05.001 - EMAIL DELIVERY FIX

import formData from 'form-data';
import Mailgun from 'mailgun.js';
import type { IsolatedContractData, IsolatedUserSettings } from './isolated-contract-types';

const MAILGUN_DOMAIN = 'mg.musobuddy.com';

export async function sendIsolatedContractEmail(
  contract: IsolatedContractData,
  userSettings: IsolatedUserSettings | null,
  contractUrl: string,
  subject: string,
  customMessage?: string
) {
  console.log('🔒 FIXED CONTRACT EMAIL: Starting email send process...');
  
  try {
    if (!process.env.MAILGUN_API_KEY) {
      throw new Error('MAILGUN_API_KEY not configured');
    }

    // Initialize Mailgun with exact working configuration
    const mg = new Mailgun(formData);
    const mailgun = mg.client({
      username: 'api',
      key: process.env.MAILGUN_API_KEY,
      url: 'https://api.eu.mailgun.net'
    });

    // CRITICAL FIX: Use simplified, deliverable email template
    const emailHtml = generateSimpleContractEmailHTML(contract, userSettings, contractUrl, customMessage);
    const emailText = generateContractEmailText(contract, userSettings, contractUrl, customMessage);
    
    const messageData = {
      from: `MusoBuddy <noreply@${MAILGUN_DOMAIN}>`,
      to: contract.clientEmail,
      subject: subject || `Contract ready for signing - ${contract.contractNumber}`,
      html: emailHtml,
      text: emailText, // CRITICAL FIX: Added plain text version for better deliverability
      'h:Reply-To': userSettings?.businessEmail || `noreply@${MAILGUN_DOMAIN}`,
      'h:X-Mailgun-Variables': JSON.stringify({
        email_type: 'contract',
        contract_id: contract.id,
        user_id: contract.userId
      }),
      'o:tracking': true,
      'o:tracking-clicks': true,
      'o:tracking-opens': true,
      'o:tag': ['contract', 'musobuddy'] // CRITICAL FIX: Added tags for better deliverability
    };

    console.log('🔒 FIXED CONTRACT EMAIL: Sending via Mailgun EU...', {
      from: messageData.from,
      to: messageData.to,
      subject: messageData.subject,
      domain: MAILGUN_DOMAIN,
      hasText: !!emailText,
      hasHtml: !!emailHtml
    });

    const result = await mailgun.messages.create(MAILGUN_DOMAIN, messageData);
    
    console.log('✅ FIXED CONTRACT EMAIL: Email sent successfully:', result.id);
    
    // CRITICAL FIX: Additional validation that email was actually queued
    if (!result.id || result.id.length < 10) {
      throw new Error('Email send returned invalid message ID');
    }
    
    return { success: true, messageId: result.id };
    
  } catch (error: any) {
    console.error('❌ FIXED CONTRACT EMAIL: Failed to send email:', error);
    console.error('❌ FIXED CONTRACT EMAIL: Error details:', {
      message: error?.message,
      code: error?.code,
      status: error?.status,
      body: error?.body
    });
    return { success: false, error: error?.message || 'Unknown error' };
  }
}

// CRITICAL FIX: Simplified, reliable HTML template
function generateSimpleContractEmailHTML(
  contract: IsolatedContractData, 
  userSettings: IsolatedUserSettings | null, 
  contractUrl: string, 
  customMessage?: string
) {
  const businessName = userSettings?.businessName || 'MusoBuddy';
  const userEmail = userSettings?.businessEmail || 'hello@musobuddy.com';
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contract ${contract.contractNumber}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <div style="background: #3b82f6; color: white; padding: 30px; text-align: center; border-radius: 8px; margin-bottom: 30px;">
    <h1 style="margin: 0; font-size: 24px;">📄 Contract Ready</h1>
    <p style="margin: 10px 0 0 0; opacity: 0.9;">From ${businessName}</p>
  </div>
  
  <div style="padding: 0 10px;">
    <p style="font-size: 16px;">Hello,</p>
    
    ${customMessage ? `<div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #3b82f6;"><strong>Message:</strong> ${customMessage}</div>` : ''}
    
    <p>Your performance contract is ready for review and signing. Please find the details below:</p>
    
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #e9ecef;">
      <h3 style="margin-top: 0; color: #3b82f6; font-size: 18px;">Contract Details</h3>
      <p style="margin: 8px 0;"><strong>Contract Number:</strong> ${contract.contractNumber}</p>
      <p style="margin: 8px 0;"><strong>Client:</strong> ${contract.clientName}</p>
      <p style="margin: 8px 0;"><strong>Event Date:</strong> ${new Date(contract.eventDate).toLocaleDateString()}</p>
      <p style="margin: 8px 0;"><strong>Venue:</strong> ${contract.venue || 'To be confirmed'}</p>
      <p style="margin: 8px 0;"><strong>Fee:</strong> £${parseFloat(contract.fee || '0').toFixed(2)}</p>
    </div>
    
    <p>Click the button below to review and digitally sign your contract:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${contractUrl}" 
         style="background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;"
         target="_blank">Review &amp; Sign Contract</a>
    </div>
    
    <p style="margin-top: 30px;">If you have any questions about this contract, please don't hesitate to contact us.</p>
    
    <p>Best regards,<br>${businessName}</p>
  </div>
  
  <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666; border-top: 1px solid #e9ecef; margin-top: 40px; font-size: 14px;">
    <p style="margin: 0;">This email was sent by MusoBuddy</p>
    <p style="margin: 5px 0 0 0;">Contact: ${userEmail}</p>
  </div>
  
</body>
</html>`;
}

// CRITICAL FIX: Plain text version for better deliverability
function generateContractEmailText(
  contract: IsolatedContractData, 
  userSettings: IsolatedUserSettings | null, 
  contractUrl: string, 
  customMessage?: string
) {
  const businessName = userSettings?.businessName || 'MusoBuddy';
  const userEmail = userSettings?.businessEmail || 'hello@musobuddy.com';
  
  return `Contract Ready - From ${businessName}

Hello,

${customMessage ? `Message: ${customMessage}\n\n` : ''}Your performance contract is ready for review and signing.

Contract Details:
- Contract Number: ${contract.contractNumber}
- Client: ${contract.clientName}
- Event Date: ${new Date(contract.eventDate).toLocaleDateString()}
- Venue: ${contract.venue || 'To be confirmed'}
- Fee: £${parseFloat(contract.fee || '0').toFixed(2)}

To review and sign your contract, please visit:
${contractUrl}

If you have any questions about this contract, please don't hesitate to contact us.

Best regards,
${businessName}

---
This email was sent by MusoBuddy
Contact: ${userEmail}`;
}