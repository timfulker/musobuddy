/**
 * Mailgun Authentication Email Service
 * Handles sending authentication emails with click tracking disabled
 * This prevents Mailgun from rewriting Supabase verification URLs
 */

import Mailgun from 'mailgun.js';
import FormData from 'form-data';

export class MailgunAuthService {
  private mailgun: any;
  private domain: string;

  constructor() {
    if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN) {
      console.warn('⚠️ Mailgun not configured - auth email features will be disabled');
      return;
    }

    const mailgun = new Mailgun(FormData);
    
    this.mailgun = mailgun.client({
      username: 'api',
      key: process.env.MAILGUN_API_KEY,
      url: 'https://api.eu.mailgun.net' // EU endpoint
    });
    
    this.domain = process.env.MAILGUN_DOMAIN;
    
    console.log('🔧 Mailgun Auth Service initialized');
  }

  /**
   * Send authentication email with click tracking disabled
   * This prevents Mailgun from rewriting Supabase verification URLs
   */
  async sendAuthEmail(emailData: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }) {
    if (!this.mailgun) {
      console.log('📧 Mailgun not configured, skipping auth email');
      return { success: false, error: 'Email service not configured' };
    }

    try {
      console.log(`📧 Sending auth email: ${emailData.subject}`);
      console.log(`📧 To: ${emailData.to}`);
      
      const messageData: any = {
        from: `MusoBuddy <noreply@${this.domain}>`,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html
      };

      // Add text version if provided
      if (emailData.text) {
        messageData.text = emailData.text;
      }

      // CRITICAL: Disable click tracking to prevent URL rewriting
      messageData['o:tracking'] = 'no';
      messageData['o:tracking-clicks'] = 'no';
      messageData['o:tracking-opens'] = 'no';
      
      // Additional headers to ensure tracking is disabled
      messageData['h:X-Mailgun-Track-Clicks'] = 'no';
      messageData['h:X-Mailgun-Track-Opens'] = 'no';
      
      console.log('🚫 Authentication email: Click tracking disabled');
      console.log('📧 Domain:', this.domain);
      
      const result = await this.mailgun.messages.create(this.domain, messageData);
      
      console.log('✅ Auth email sent successfully:', result.id);
      
      return {
        success: true,
        messageId: result.id,
        status: result.status || 'sent'
      };
    } catch (error: any) {
      console.error('❌ Failed to send auth email:', error);
      console.error('❌ Error details:', {
        message: error.message,
        status: error.status,
        details: error.details
      });
      return {
        success: false,
        error: error.message || 'Failed to send auth email'
      };
    }
  }

  /**
   * Test endpoint to verify click tracking is disabled
   */
  async sendTestVerificationEmail(email: string, testUrl: string) {
    const testHtml = `
      <!DOCTYPE html>
      <html>
      <body>
        <h2>Test Verification Email</h2>
        <p>This is a test email to verify that click tracking is disabled.</p>
        <p>Click this test link: <a href="${testUrl}">Verify Email</a></p>
        <p>The URL should NOT be rewritten by Mailgun.</p>
      </body>
      </html>
    `;

    const testText = `
      Test Verification Email
      
      This is a test email to verify that click tracking is disabled.
      Click this test link: ${testUrl}
      The URL should NOT be rewritten by Mailgun.
    `;

    return await this.sendAuthEmail({
      to: email,
      subject: 'Test: Email Verification (Click Tracking Disabled)',
      html: testHtml,
      text: testText
    });
  }
}

export const mailgunAuthService = new MailgunAuthService();