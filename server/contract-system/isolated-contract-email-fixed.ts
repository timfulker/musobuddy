// ISOLATED CONTRACT EMAIL SERVICE - EXACT COPY OF WORKING INVOICE SYSTEM
// Version: 2025.08.04.003 - COPIED FROM WORKING INVOICE EMAIL
// Uses identical Mailgun configuration as invoice system

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
  console.log('🔒 ISOLATED CONTRACT EMAIL: Starting email send process...');
  console.log('📧 Contract email data:', {
    clientEmail: contract.clientEmail,
    contractNumber: contract.contractNumber,
    contractUrl: contractUrl,
    hasUserSettings: !!userSettings
  });
  
  try {
    if (!process.env.MAILGUN_API_KEY) {
      throw new Error('MAILGUN_API_KEY not configured');
    }

    if (!contract.clientEmail) {
      throw new Error('Client email address is required');
    }

    // Initialize Mailgun with EXACT same config as working invoice system
    const mg = new Mailgun(formData);
    const mailgun = mg.client({
      username: 'api',
      key: process.env.MAILGUN_API_KEY,
      url: 'https://api.eu.mailgun.net'
    });

    // Generate email content
    const emailHtml = generateContractEmailHTML(contract, userSettings, contractUrl, customMessage);
    
    const messageData = {
      from: `MusoBuddy <noreply@${MAILGUN_DOMAIN}>`,
      to: contract.clientEmail,
      subject: subject || `Contract ready for signing - ${contract.contractNumber}`,
      html: emailHtml,
      'h:Reply-To': userSettings?.businessEmail || `noreply@${MAILGUN_DOMAIN}`,
      'h:X-Mailgun-Variables': JSON.stringify({
        email_type: 'contract',
        contract_id: contract.id,
        user_id: contract.userId
      }),
      'o:tracking': true,
      'o:tracking-clicks': true,
      'o:tracking-opens': true
    };

    console.log('🔒 ISOLATED CONTRACT EMAIL: Sending via Mailgun EU...', {
      from: messageData.from,
      to: messageData.to,
      subject: messageData.subject,
      domain: MAILGUN_DOMAIN
    });

    const result = await mailgun.messages.create(MAILGUN_DOMAIN, messageData);
    
    console.log('✅ ISOLATED CONTRACT EMAIL: Email sent successfully:', result.id);
    return { success: true, messageId: result.id };
    
  } catch (error: any) {
    console.error('❌ ISOLATED CONTRACT EMAIL: Failed to send email:', error);
    return { success: false, error: error?.message || 'Unknown error' };
  }
}

function generateContractEmailHTML(
  contract: IsolatedContractData, 
  userSettings: IsolatedUserSettings | null, 
  contractUrl: string, 
  customMessage?: string
) {
  const businessName = userSettings?.businessName || 'MusoBuddy';
  const userEmail = userSettings?.businessEmail || 'hello@musobuddy.com';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contract ${contract.contractNumber}</title>
  <style>
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
    .container { max-width: 600px; margin: 0 auto; background-color: white; }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 40px 30px; text-align: center; }
    .content { padding: 40px 30px; }
    .contract-details { background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .view-button { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0; font-weight: 600; }
    .footer { background-color: #f8fafc; padding: 30px; text-align: center; color: #64748b; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 28px;">📄 Contract Ready</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">From ${businessName}</p>
    </div>
    
    <div class="content">
      <p>Hello,</p>
      
      ${customMessage ? `<p><strong>Message:</strong> ${customMessage}</p>` : ''}
      
      <p>Your performance contract is ready for review and signing. Please find the details below:</p>
      
      <div class="contract-details">
        <h3 style="margin-top: 0; color: #3b82f6;">Contract Details</h3>
        <p><strong>Contract Number:</strong> ${contract.contractNumber}</p>
        <p><strong>Client:</strong> ${contract.clientName}</p>
        <p><strong>Event Date:</strong> ${new Date(contract.eventDate).toLocaleDateString()}</p>
        <p><strong>Venue:</strong> ${contract.venue || 'To be confirmed'}</p>
        <p><strong>Fee:</strong> £${parseFloat(contract.fee || '0').toFixed(2)}</p>
      </div>
      
      <p>Click the button below to review and digitally sign your contract:</p>
      
      <a href="${contractUrl}" class="view-button" target="_blank">Review & Sign Contract</a>
      
      <p style="margin-top: 30px;">If you have any questions about this contract, please don't hesitate to contact us.</p>
      
      <p>Best regards,<br>${businessName}</p>
    </div>
    
    <div class="footer">
      <p>This email was sent by MusoBuddy</p>
      <p>Contact: ${userEmail}</p>
    </div>
  </div>
</body>
</html>`;
}