/**
 * Email Provider Abstraction Layer
 * Allows switching between Mailgun and SendGrid with a single environment variable
 *
 * Usage:
 *   Set EMAIL_PROVIDER=sendgrid or EMAIL_PROVIDER=mailgun
 *   If not set, defaults to mailgun for backward compatibility
 */

import sgMail from '@sendgrid/mail';
import Mailgun from 'mailgun.js';
import FormData from 'form-data';

export interface EmailData {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  fromEmail?: string;
  fromName?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: Array<{
    content: string;
    filename: string;
    type?: string;
    disposition?: string;
  }>;
  disableTracking?: boolean; // For auth emails
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  details?: any;
  provider?: 'mailgun' | 'sendgrid';
}

/**
 * Abstract email provider interface
 */
interface IEmailProvider {
  name: 'mailgun' | 'sendgrid';
  isConfigured(): boolean;
  sendEmail(emailData: EmailData): Promise<EmailResult>;
}

/**
 * Mailgun Email Provider
 */
class MailgunProvider implements IEmailProvider {
  name: 'mailgun' | 'sendgrid' = 'mailgun';
  private mailgun: any;
  private domain: string;

  constructor() {
    if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN) {
      console.warn('⚠️ Mailgun not configured');
      return;
    }

    const mailgun = new Mailgun(FormData);
    this.mailgun = mailgun.client({
      username: 'api',
      key: process.env.MAILGUN_API_KEY,
      url: 'https://api.eu.mailgun.net'
    });
    this.domain = process.env.MAILGUN_DOMAIN;
    console.log('✅ Mailgun provider initialized');
  }

  isConfigured(): boolean {
    return !!this.mailgun && !!this.domain;
  }

  async sendEmail(emailData: EmailData): Promise<EmailResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Mailgun not configured',
        provider: 'mailgun'
      };
    }

    try {
      console.log(`📧 [MAILGUN] Sending email: ${emailData.subject}`);

      const messageData: any = {
        from: `${emailData.fromName || 'MusoBuddy'} <${emailData.fromEmail || 'noreply@musobuddy.com'}>`,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html
      };

      if (emailData.text) messageData.text = emailData.text;
      if (emailData.replyTo) messageData['h:Reply-To'] = emailData.replyTo;
      if (emailData.cc && emailData.cc.length > 0) messageData.cc = emailData.cc;
      if (emailData.bcc && emailData.bcc.length > 0) messageData.bcc = emailData.bcc;

      // Disable tracking for auth emails
      if (emailData.disableTracking) {
        messageData['o:tracking'] = 'no';
        messageData['o:tracking-clicks'] = 'no';
        messageData['o:tracking-opens'] = 'no';
        messageData['h:X-Mailgun-Track-Clicks'] = 'no';
        messageData['h:X-Mailgun-Track-Opens'] = 'no';
        console.log('🚫 [MAILGUN] Tracking disabled');
      }

      // Handle attachments
      if (emailData.attachments && emailData.attachments.length > 0) {
        messageData.attachment = emailData.attachments.map(att => ({
          data: Buffer.from(att.content, 'base64'),
          filename: att.filename,
          contentType: att.type
        }));
      }

      const result = await this.mailgun.messages.create(this.domain, messageData);

      console.log('✅ [MAILGUN] Email sent successfully:', result.id);

      return {
        success: true,
        messageId: result.id,
        provider: 'mailgun'
      };
    } catch (error: any) {
      console.error('❌ [MAILGUN] Failed to send email:', error);
      return {
        success: false,
        error: error.message,
        details: error,
        provider: 'mailgun'
      };
    }
  }
}

/**
 * SendGrid Email Provider
 */
class SendGridProvider implements IEmailProvider {
  name: 'mailgun' | 'sendgrid' = 'sendgrid';
  private configured: boolean = false;

  constructor() {
    if (!process.env.SENDGRID_API_KEY) {
      console.warn('⚠️ SendGrid not configured');
      return;
    }

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    this.configured = true;
    console.log('✅ SendGrid provider initialized');
  }

  isConfigured(): boolean {
    return this.configured;
  }

  async sendEmail(emailData: EmailData): Promise<EmailResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'SendGrid not configured',
        provider: 'sendgrid'
      };
    }

    try {
      console.log(`📧 [SENDGRID] Sending email: ${emailData.subject}`);

      const msg: any = {
        to: emailData.to,
        from: {
          email: emailData.fromEmail || process.env.SENDGRID_SENDER_EMAIL || 'noreply@musobuddy.com',
          name: emailData.fromName || process.env.SENDGRID_SENDER_NAME || 'MusoBuddy'
        },
        subject: emailData.subject,
        html: emailData.html
      };

      if (emailData.text) msg.text = emailData.text;
      if (emailData.replyTo) msg.replyTo = emailData.replyTo;
      if (emailData.cc && emailData.cc.length > 0) msg.cc = emailData.cc;
      if (emailData.bcc && emailData.bcc.length > 0) msg.bcc = emailData.bcc;
      if (emailData.attachments) msg.attachments = emailData.attachments;

      // Disable tracking for auth emails
      if (emailData.disableTracking) {
        msg.trackingSettings = {
          clickTracking: { enable: false, enableText: false },
          openTracking: { enable: false }
        };
        console.log('🚫 [SENDGRID] Tracking disabled');
      }

      const result = await sgMail.send(msg);

      console.log('✅ [SENDGRID] Email sent successfully');

      return {
        success: true,
        messageId: result[0]?.headers?.['x-message-id'],
        provider: 'sendgrid'
      };
    } catch (error: any) {
      console.error('❌ [SENDGRID] Failed to send email:', error);
      console.error('❌ [SENDGRID] Error details:', JSON.stringify(error.response?.body, null, 2));
      return {
        success: false,
        error: error.message,
        details: error.response?.body,
        provider: 'sendgrid'
      };
    }
  }
}

/**
 * Email Service with Provider Abstraction
 * Automatically selects provider based on EMAIL_PROVIDER env variable
 */
export class EmailService {
  private provider: IEmailProvider;

  constructor() {
    const providerName = (process.env.EMAIL_PROVIDER || 'mailgun').toLowerCase();

    console.log(`🔧 Email provider: ${providerName}`);

    if (providerName === 'sendgrid') {
      this.provider = new SendGridProvider();
    } else {
      this.provider = new MailgunProvider();
    }

    if (!this.provider.isConfigured()) {
      console.error(`❌ ${this.provider.name} provider not configured`);
      console.error(`❌ Set EMAIL_PROVIDER=mailgun or EMAIL_PROVIDER=sendgrid`);
    } else {
      console.log(`✅ Email service using ${this.provider.name}`);
    }
  }

  /**
   * Send a single email
   */
  async sendEmail(emailData: EmailData): Promise<EmailResult> {
    return await this.provider.sendEmail(emailData);
  }

  /**
   * Send bulk emails (for backward compatibility)
   */
  async sendBulkEmail(emails: Array<EmailData>): Promise<{
    successful: number;
    failed: number;
    results: PromiseSettledResult<EmailResult>[];
  }> {
    const results = await Promise.allSettled(
      emails.map(email => this.sendEmail(email))
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;

    console.log(`📊 Bulk email results: ${successful} sent, ${failed} failed (${this.provider.name})`);

    return { successful, failed, results };
  }

  /**
   * Get current provider name
   */
  getProviderName(): 'mailgun' | 'sendgrid' {
    return this.provider.name;
  }

  /**
   * Check if provider is configured
   */
  isConfigured(): boolean {
    return this.provider.isConfigured();
  }

  /**
   * Send contract email (for backward compatibility)
   * This method wraps sendEmail with contract-specific HTML generation
   */
  async sendContractEmail(contract: any, userSettings: any, subject: string, contractUrl: string, customMessage?: string, userId?: string): Promise<EmailResult> {
    const { generateContractEmailHTML } = await import('./contract-email-template');
    const htmlContent = generateContractEmailHTML(contract, userSettings, contractUrl, customMessage);

    // Determine from email - use user's emailPrefix@enquiries.musobuddy.com for personalization
    let fromEmail = 'support@musobuddy.com'; // Fallback

    if (userId) {
      try {
        const { storage } = await import('./storage');
        const user = await storage.getUserById(userId);
        if (user?.emailPrefix) {
          fromEmail = `${user.emailPrefix}@enquiries.musobuddy.com`;
          console.log(`📧 [CONTRACT] Using personalized from address: ${fromEmail}`);
        }
      } catch (error) {
        console.error('❌ [CONTRACT] Failed to fetch user emailPrefix, using fallback:', error);
      }
    }

    // Create reply-to routing address for conversation tracking
    const replyToAddress = contract.bookingId && userId
      ? `User${userId}-Booking${contract.bookingId} <user${userId}-booking${contract.bookingId}@mg.musobuddy.com>`
      : undefined;

    return await this.sendEmail({
      to: contract.clientEmail,
      subject: subject,
      html: htmlContent,
      fromEmail: fromEmail,
      fromName: userSettings?.businessName || 'MusoBuddy',
      replyTo: replyToAddress
    });
  }
}

// Export singleton instance
export const emailService = new EmailService();
