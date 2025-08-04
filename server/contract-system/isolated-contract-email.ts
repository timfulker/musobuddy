// ISOLATED CONTRACT EMAIL SERVICE - COMPLETELY INDEPENDENT
// Version: 2025.08.04.002 - CONTRACT SYSTEM ISOLATION  
// NO IMPORTS FROM MAIN SYSTEM - PREVENTS CASCADING FAILURES

import FormData from 'form-data';
import type { IsolatedContractData, IsolatedUserSettings, IsolatedEmailData, IsolatedEmailResult } from './isolated-contract-types';

export class IsolatedContractEmailService {
  private mailgun: any;

  async init() {
    if (!this.mailgun) {
      // Use EXACT same configuration as working invoice system
      const { default: Mailgun } = await import('mailgun.js');
      const formData = (await import('form-data')).default;
      const mg = new Mailgun(formData);
      
      this.mailgun = mg.client({
        username: 'api',
        key: process.env.MAILGUN_API_KEY,
        url: 'https://api.eu.mailgun.net'
      });
    }
  }

  private async sendEmail(emailData: IsolatedEmailData): Promise<IsolatedEmailResult> {
    try {
      await this.init();
      const domain = process.env.MAILGUN_DOMAIN;
      
      const messageData: any = {
        from: emailData.from || `MusoBuddy <noreply@mg.musobuddy.com>`,
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
      
      const result = await this.mailgun.messages.create('mg.musobuddy.com', messageData);

      if (result?.id || result?.message) {
        console.log(`✅ Email sent successfully: ${result.id || result.message}`);
        return { 
          success: true, 
          messageId: result.id || result.message 
        };
      } else {
        console.error('❌ Unexpected Mailgun response:', result);
        return { 
          success: false, 
          error: 'Unexpected response from email service' 
        };
      }

    } catch (error: any) {
      console.error('❌ Email sending failed:', error);
      return { 
        success: false, 
        error: error.message || 'Unknown email error' 
      };
    }
  }

  async sendContractEmail(
    contract: IsolatedContractData,
    userSettings: IsolatedUserSettings | null,
    subject?: string,
    contractUrl?: string,
    customMessage?: string
  ): Promise<IsolatedEmailResult> {
    try {
      if (!contract.clientEmail) {
        return { success: false, error: 'No client email provided' };
      }

      const defaultSubject = `Contract ready for signing - ${contract.contractNumber}`;
      const finalSubject = subject || defaultSubject;
      
      const finalContractUrl = contractUrl || contract.cloudStorageUrl || '#';

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Contract Ready</title>
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
              <a href="${finalContractUrl}" 
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

      const emailData: IsolatedEmailData = {
        to: contract.clientEmail,
        subject: finalSubject,
        html: emailHtml
        // NO custom 'from' field - use default working logic
      };

      return await this.sendEmail(emailData);
    } catch (error: any) {
      console.error('❌ Failed to send contract email:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
export const isolatedContractEmailService = new IsolatedContractEmailService();