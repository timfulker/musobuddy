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
 * Email Service with Dual-Provider Routing
 * Routes emails based on recipient domain to optimize deliverability
 *
 * Routing Rules:
 * - Yahoo/AOL domains → Mailgun (better deliverability)
 * - Microsoft domains (Hotmail, Outlook, Live, MSN) → Mailgun (rotating IPs bypass blocklists)
 * - All other domains → SendGrid (default provider)
 */
export class EmailService {
  private sendgridProvider: IEmailProvider;
  private mailgunProvider: IEmailProvider;
  private defaultProvider: 'mailgun' | 'sendgrid';

  constructor() {
    // Initialize BOTH providers for dual-routing
    this.sendgridProvider = new SendGridProvider();
    this.mailgunProvider = new MailgunProvider();

    // Set default provider from env var (fallback to sendgrid)
    this.defaultProvider = (process.env.EMAIL_PROVIDER || 'sendgrid').toLowerCase() as 'mailgun' | 'sendgrid';

    console.log(`🔧 Dual-provider routing enabled`);
    console.log(`📧 Default provider: ${this.defaultProvider}`);
    console.log(`📧 SendGrid configured: ${this.sendgridProvider.isConfigured()}`);
    console.log(`📧 Mailgun configured: ${this.mailgunProvider.isConfigured()}`);

    // Warn if providers not configured
    if (!this.sendgridProvider.isConfigured()) {
      console.warn('⚠️ SendGrid not configured - emails to non-Microsoft/Yahoo/AOL domains may fail');
    }
    if (!this.mailgunProvider.isConfigured()) {
      console.warn('⚠️ Mailgun not configured - emails to Microsoft/Yahoo/AOL domains may fail');
    }
  }

  /**
   * Select email provider based on recipient domain
   * Routes Yahoo/AOL/Microsoft to Mailgun (rotating IPs), everything else to default provider
   */
  private selectProvider(emailData: EmailData): IEmailProvider {
    // Extract recipient email (handle both string and array)
    const recipientEmail = (Array.isArray(emailData.to) ? emailData.to[0] : emailData.to).toLowerCase();

    // Check if recipient is Yahoo or AOL
    const isYahoo = recipientEmail.includes('@yahoo.') || recipientEmail.includes('@ymail.');
    const isAOL = recipientEmail.includes('@aol.');

    // Check if recipient is Microsoft (Hotmail, Outlook, Live, MSN)
    const isMicrosoft = recipientEmail.includes('@hotmail.') ||
                        recipientEmail.includes('@outlook.') ||
                        recipientEmail.includes('@live.') ||
                        recipientEmail.includes('@msn.');

    if (isYahoo || isAOL) {
      console.log(`🔀 [ROUTING] Yahoo/AOL detected → Mailgun for: ${recipientEmail}`);
      return this.mailgunProvider;
    }

    if (isMicrosoft) {
      console.log(`🔀 [ROUTING] Microsoft (Hotmail/Outlook) detected → Mailgun (rotating IPs) for: ${recipientEmail}`);
      return this.mailgunProvider;
    }

    // Route to default provider for all other domains
    const provider = this.defaultProvider === 'sendgrid' ? this.sendgridProvider : this.mailgunProvider;
    console.log(`🔀 [ROUTING] Default provider (${this.defaultProvider}) for: ${recipientEmail}`);
    return provider;
  }

  /**
   * Send a single email
   * Automatically routes to appropriate provider based on recipient domain
   */
  async sendEmail(emailData: EmailData): Promise<EmailResult> {
    const recipientEmail = Array.isArray(emailData.to) ? emailData.to[0] : emailData.to;

    // Check if email is suppressed before sending
    try {
      const { bounceHandler } = await import('./bounce-handler');
      const suppressionCheck = await bounceHandler.isEmailSuppressed(recipientEmail);

      if (suppressionCheck.suppressed) {
        console.log(`🚫 [EMAIL-SUPPRESSED] Not sending to ${recipientEmail}: ${suppressionCheck.reason}`);
        return {
          success: false,
          error: `Email suppressed: ${suppressionCheck.reason}`,
          provider: 'none' as any
        };
      }
    } catch (error) {
      console.error('❌ Failed to check email suppression, proceeding with send:', error);
      // Continue with send if suppression check fails (fail open)
    }

    const primaryProvider = this.selectProvider(emailData);

    // Check if selected provider is configured
    if (!primaryProvider.isConfigured()) {
      console.error(`❌ Primary provider (${primaryProvider.name}) not configured for: ${recipientEmail}`);

      // Try fallback provider
      const fallbackProvider = primaryProvider.name === 'sendgrid' ? this.mailgunProvider : this.sendgridProvider;

      if (fallbackProvider.isConfigured()) {
        console.log(`🔄 [FALLBACK] Switching to ${fallbackProvider.name} for: ${recipientEmail}`);
        const fallbackResult = await fallbackProvider.sendEmail(emailData);

        if (!fallbackResult.success) {
          this.trackEmailFailure(emailData, fallbackResult, fallbackProvider.name).catch(err => {
            console.error('❌ Failed to track email delivery failure:', err);
          });
        }

        return fallbackResult;
      }

      return {
        success: false,
        error: `Email provider ${primaryProvider.name} not configured and no fallback available`,
        provider: primaryProvider.name
      };
    }

    // Send the email with primary provider
    const result = await primaryProvider.sendEmail(emailData);

    // If primary provider fails and we have an alternate provider configured, try it
    if (!result.success) {
      const fallbackProvider = primaryProvider.name === 'sendgrid' ? this.mailgunProvider : this.sendgridProvider;

      if (fallbackProvider.isConfigured()) {
        console.log(`🔄 [FALLBACK] Primary provider (${primaryProvider.name}) failed, trying ${fallbackProvider.name} for: ${recipientEmail}`);
        console.log(`   Reason: ${result.error}`);

        const fallbackResult = await fallbackProvider.sendEmail(emailData);

        // If fallback succeeds, return success (don't track primary failure)
        if (fallbackResult.success) {
          console.log(`✅ [FALLBACK] ${fallbackProvider.name} succeeded after ${primaryProvider.name} failed`);
          return fallbackResult;
        }

        // Both failed - track the fallback failure
        console.error(`❌ [FALLBACK] Both providers failed for: ${recipientEmail}`);
        this.trackEmailFailure(emailData, fallbackResult, fallbackProvider.name).catch(err => {
          console.error('❌ Failed to track email delivery failure:', err);
        });

        return fallbackResult;
      }

      // No fallback available, track the primary failure
      this.trackEmailFailure(emailData, result, primaryProvider.name).catch(err => {
        console.error('❌ Failed to track email delivery failure:', err);
      });
    }

    return result;
  }

  /**
   * Track email delivery failures in the database for user notification
   */
  private async trackEmailFailure(
    emailData: EmailData,
    result: EmailResult,
    provider: 'mailgun' | 'sendgrid'
  ): Promise<void> {
    try {
      const { storage } = await import('./storage');

      // Extract recipient email
      const recipientEmail = Array.isArray(emailData.to) ? emailData.to[0] : emailData.to;

      // Determine email type based on subject/content
      let emailType = 'other';
      const subjectLower = emailData.subject.toLowerCase();
      if (subjectLower.includes('contract') || subjectLower.includes('agreement')) {
        emailType = 'contract';
      } else if (subjectLower.includes('invoice') || subjectLower.includes('payment')) {
        emailType = 'invoice';
      } else if (subjectLower.includes('enquiry') || subjectLower.includes('booking')) {
        emailType = 'response';
      }

      // Try to find the associated booking/user from the replyTo field
      let userId: string | undefined;
      let bookingId: number | undefined;

      // Parse reply-to format: "User{userId}-Booking{bookingId}@..."
      if (emailData.replyTo) {
        const match = emailData.replyTo.match(/User(\d+)-Booking(\d+)/i);
        if (match) {
          userId = match[1];
          bookingId = parseInt(match[2]);
          console.log(`📧 [TRACKING] Extracted userId: ${userId}, bookingId: ${bookingId} from replyTo`);
        }
      }

      // If we couldn't extract userId from replyTo, try to find user by searching all users' bookings
      if (!userId) {
        console.log(`⚠️ [TRACKING] No userId in replyTo, searching for booking with email: ${recipientEmail}`);
        const users = await storage.getAllUsers();
        for (const user of users) {
          const bookings = await storage.getBookings(user.id);
          const matchingBooking = bookings.find(b =>
            b.clientEmail?.toLowerCase() === recipientEmail.toLowerCase()
          );
          if (matchingBooking) {
            userId = user.id;
            bookingId = matchingBooking.id;
            console.log(`✅ [TRACKING] Found userId: ${userId}, bookingId: ${bookingId} via booking search`);
            break;
          }
        }
      }

      // Only create failure record if we found a userId
      if (userId) {
        await storage.createEmailDeliveryFailure({
          userId: userId,
          bookingId: bookingId,
          recipientEmail: recipientEmail,
          emailType: emailType,
          subject: emailData.subject,
          failureType: 'blocked', // Default to blocked since this is a send failure, not a bounce
          failureReason: result.error || 'Unknown error',
          provider: provider,
          priority: emailType === 'contract' || emailType === 'invoice' ? 'high' : 'medium'
        });

        console.log(`📧 [TRACKING] Email failure tracked for user ${userId}, recipient: ${recipientEmail}`);
      } else {
        console.log(`⚠️ [TRACKING] Could not track failure - no userId found for recipient: ${recipientEmail}`);
      }

    } catch (error: any) {
      console.error('❌ [TRACKING] Failed to track email failure:', error.message);
    }
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

    console.log(`📊 Bulk email results: ${successful} sent, ${failed} failed (dual-provider routing)`);

    return { successful, failed, results };
  }

  /**
   * Get default provider name
   */
  getProviderName(): 'mailgun' | 'sendgrid' {
    return this.defaultProvider;
  }

  /**
   * Check if at least one provider is configured
   */
  isConfigured(): boolean {
    return this.sendgridProvider.isConfigured() || this.mailgunProvider.isConfigured();
  }

  /**
   * Get status of both providers (for monitoring)
   */
  getProvidersStatus(): { sendgrid: boolean; mailgun: boolean; defaultProvider: string } {
    return {
      sendgrid: this.sendgridProvider.isConfigured(),
      mailgun: this.mailgunProvider.isConfigured(),
      defaultProvider: this.defaultProvider
    };
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
