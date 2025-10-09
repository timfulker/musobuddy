/**
 * Unified Email Processing System
 *
 * Consolidates all email processing logic into one robust, maintainable system.
 * Replaces: email-queue-enhanced.ts, email-processing-engine.ts, email-queue.ts
 *
 * Benefits:
 * - Single source of truth for email processing
 * - Consistent error handling and logging
 * - Easier debugging and maintenance
 * - No duplicate code across systems
 */

import { Mutex } from 'async-mutex';

// ===== TYPES AND INTERFACES =====
interface EmailData {
  from: string;
  to: string;
  subject: string;
  bodyPlain: string;
  bodyHtml?: string;
  messageId: string;
  timestamp: Date;
  headers: Record<string, string>;
}

interface ProcessingResult {
  success: boolean;
  action: 'processed' | 'queued' | 'rejected' | 'duplicate';
  details?: string;
  error?: string;
  userId?: string;
  bookingId?: number;
}

interface EmailJob {
  id: string;
  emailData: EmailData;
  userId: string;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

// ===== MAIN UNIFIED PROCESSOR =====
export class UnifiedEmailProcessor {
  private processingMutex = new Mutex();
  private emailQueue = new Map<string, EmailJob[]>(); // Per-user queues
  private processedEmails = new Set<string>(); // Duplicate detection
  private duplicateWindowMs = 60000; // 1 minute window

  constructor() {
    console.log('🚀 Unified Email Processor initialized');

    // Cleanup processed emails every minute
    setInterval(() => {
      this.cleanupProcessedEmails();
    }, 60000);
  }

  /**
   * Main entry point - processes any email from webhook data
   */
  async processEmail(webhookData: any): Promise<ProcessingResult> {
    const requestId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    console.log(`📧 [${requestId}] Starting unified email processing`);

    try {
      // Step 1: Clean and validate the email data
      const emailData = this.extractAndCleanEmailData(webhookData, requestId);
      if (!emailData) {
        return { success: false, action: 'rejected', error: 'Invalid email data' };
      }

      // Step 2: Check for duplicates
      const duplicateHash = this.createDuplicateHash(emailData);
      if (this.isDuplicate(duplicateHash)) {
        console.log(`📧 [${requestId}] Duplicate email detected, skipping`);
        return { success: true, action: 'duplicate', details: 'Email already processed' };
      }

      // Step 3: Find the target user
      const user = await this.findUserByRecipient(emailData.to, requestId);
      if (!user) {
        return await this.handleUnknownUser(emailData, requestId);
      }

      // Step 4: Classify the email type and route appropriately
      const emailType = this.classifyEmail(emailData);
      console.log(`📧 [${requestId}] Email classified as: ${emailType}`);

      // Step 5: Process based on type
      const result = await this.routeEmail(emailType, emailData, user, requestId);

      // Step 6: Mark as processed (prevent duplicates)
      this.markAsProcessed(duplicateHash);

      return result;

    } catch (error: any) {
      console.error(`❌ [${requestId}] Unified processor error:`, error);

      // Fallback: Save to unparseable messages for manual review
      try {
        await this.saveToUnparseableMessages(webhookData, error.message, requestId);
        return {
          success: false,
          action: 'rejected',
          error: error.message,
          details: 'Saved to unparseable messages for review'
        };
      } catch (fallbackError: any) {
        console.error(`❌ [${requestId}] Fallback save failed:`, fallbackError);
        return {
          success: false,
          action: 'rejected',
          error: `${error.message} (fallback also failed: ${fallbackError.message})`
        };
      }
    }
  }

  /**
   * Extract and clean email data from webhook payload
   */
  private extractAndCleanEmailData(webhookData: any, requestId: string): EmailData | null {
    try {
      // Extract fields with fallbacks (handles different webhook formats)
      const rawFrom = webhookData.From || webhookData.from || webhookData.sender || '';
      const rawTo = webhookData.To || webhookData.recipient || '';
      const rawSubject = webhookData.Subject || webhookData.subject || '';
      const rawBodyPlain = webhookData['body-plain'] || webhookData.text || webhookData['stripped-text'] || '';
      const rawBodyHtml = webhookData['body-html'] || webhookData.html || '';
      const rawMessageId = webhookData['message-id'] || webhookData['Message-Id'] || `generated_${Date.now()}`;

      // Clean the data (remove quotes, trim whitespace)
      const from = this.cleanEmailField(rawFrom);
      const to = this.cleanEmailField(rawTo);
      const subject = this.cleanStringField(rawSubject);
      const bodyPlain = this.cleanStringField(rawBodyPlain);
      const bodyHtml = this.cleanStringField(rawBodyHtml);
      const messageId = this.cleanStringField(rawMessageId);

      // Basic validation
      if (!from || !to || !bodyPlain) {
        console.error(`📧 [${requestId}] Missing required fields: from=${!!from}, to=${!!to}, body=${!!bodyPlain}`);
        return null;
      }

      console.log(`📧 [${requestId}] Cleaned email data:`, {
        from: from.substring(0, 50),
        to: to.substring(0, 50),
        subject: subject?.substring(0, 50) || 'No subject',
        bodyLength: bodyPlain.length,
        hasHtml: !!bodyHtml
      });

      return {
        from,
        to,
        subject: subject || 'No Subject',
        bodyPlain,
        bodyHtml,
        messageId,
        timestamp: new Date(),
        headers: this.extractHeaders(webhookData)
      };

    } catch (error: any) {
      console.error(`❌ [${requestId}] Email data extraction failed:`, error);
      return null;
    }
  }

  /**
   * Clean email address fields (handles Hotmail quotes issue)
   */
  private cleanEmailField(field: string): string {
    if (!field) return '';

    // Remove quotes and trim - fixes Hotmail issue
    return field.replace(/^["']|["']$/g, '').trim();
  }

  /**
   * Clean string fields
   */
  private cleanStringField(field: string): string | undefined {
    if (!field || typeof field !== 'string') return undefined;

    const cleaned = field.trim();
    return cleaned.length > 0 ? cleaned : undefined;
  }

  /**
   * Extract headers from webhook data
   */
  private extractHeaders(webhookData: any): Record<string, string> {
    const headers: Record<string, string> = {};

    // Extract common headers
    const commonHeaders = ['Content-Type', 'From', 'To', 'Subject', 'Date', 'Message-Id'];
    commonHeaders.forEach(header => {
      if (webhookData[header]) {
        headers[header] = webhookData[header];
      }
    });

    return headers;
  }

  /**
   * Find user by recipient email address
   */
  private async findUserByRecipient(recipient: string, requestId: string): Promise<any> {
    try {
      // Extract email prefix (before @)
      const recipientMatch = recipient.match(/([^@]+)@/);
      if (!recipientMatch) {
        console.error(`📧 [${requestId}] Invalid recipient format: ${recipient}`);
        return null;
      }

      const rawEmailPrefix = recipientMatch[1];
      // Clean email prefix - remove quotes and make lowercase (Hotmail fix)
      const emailPrefix = rawEmailPrefix.replace(/^["']|["']$/g, '').toLowerCase();

      console.log(`📧 [${requestId}] Looking up user with prefix: "${emailPrefix}"`);

      // Look up user in database
      const { storage } = await import('./storage');
      const user = await storage.getUserByEmailPrefix(emailPrefix);

      if (!user) {
        console.error(`📧 [${requestId}] No user found for prefix: "${emailPrefix}"`);
        return null;
      }

      console.log(`📧 [${requestId}] Found user: ${user.id} (${user.email})`);
      return user;

    } catch (error: any) {
      console.error(`📧 [${requestId}] User lookup failed:`, error);
      return null;
    }
  }

  /**
   * Classify email type for proper routing
   */
  private classifyEmail(emailData: EmailData): 'encore_followup' | 'booking_reply' | 'invoice_reply' | 'new_inquiry' {
    const { from, subject, bodyPlain } = emailData;

    // Check for Encore follow-up emails
    if (this.isEncoreFollowup(from, subject, bodyPlain)) {
      return 'encore_followup';
    }

    // Check for booking replies (RE: Booking #123)
    if (this.isBookingReply(subject, bodyPlain)) {
      return 'booking_reply';
    }

    // Check for invoice replies (RE: Invoice #123)
    if (this.isInvoiceReply(subject, bodyPlain)) {
      return 'invoice_reply';
    }

    // Default to new inquiry
    return 'new_inquiry';
  }

  /**
   * Check if email is an Encore follow-up
   */
  private isEncoreFollowup(from: string, subject: string, body: string): boolean {
    const isFromEncoreService = (
      from.toLowerCase().includes('encore') ||
      from.includes('@encoremusicians.com') ||
      from.includes('no-reply-message@encoremusicians.com')
    );

    const hasFollowupIndicators = (
      body.toLowerCase().includes('congratulations') ||
      body.toLowerCase().includes('you have been selected') ||
      body.toLowerCase().includes('client has chosen') ||
      body.toLowerCase().includes('booking confirmed') ||
      body.toLowerCase().includes('booking update') ||
      body.toLowerCase().includes('payment') ||
      body.toLowerCase().includes('cancelled') ||
      body.toLowerCase().includes('rescheduled')
    );

    return isFromEncoreService && hasFollowupIndicators;
  }

  /**
   * Check if email is a booking reply
   */
  private isBookingReply(subject: string, body: string): boolean {
    return /booking\s*#?\s*\d+/i.test(subject) || /booking\s*#?\s*\d+/i.test(body);
  }

  /**
   * Check if email is an invoice reply
   */
  private isInvoiceReply(subject: string, body: string): boolean {
    return /invoice\s*#?\s*\d+/i.test(subject) || /invoice\s*#?\s*\d+/i.test(body);
  }

  /**
   * Route email to appropriate handler based on classification
   */
  private async routeEmail(
    emailType: string,
    emailData: EmailData,
    user: any,
    requestId: string
  ): Promise<ProcessingResult> {

    switch (emailType) {
      case 'encore_followup':
        return await this.handleEncoreFollowup(emailData, user, requestId);

      case 'booking_reply':
        return await this.handleBookingReply(emailData, user, requestId);

      case 'invoice_reply':
        return await this.handleInvoiceReply(emailData, user, requestId);

      case 'new_inquiry':
      default:
        return await this.handleNewInquiry(emailData, user, requestId);
    }
  }

  /**
   * Handle Encore follow-up emails
   */
  private async handleEncoreFollowup(emailData: EmailData, user: any, requestId: string): Promise<ProcessingResult> {
    try {
      console.log(`🎵 [${requestId}] Processing Encore follow-up email`);

      // Find recent Encore bookings to link to
      const { storage } = await import('./storage');
      const recentBookings = await storage.getBookings(user.id);

      const encoreBookings = recentBookings
        .filter((b: any) =>
          b.venue?.toLowerCase().includes('encore') ||
          b.title?.toLowerCase().includes('encore') ||
          b.source === 'encore'
        )
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

      if (encoreBookings.length > 0) {
        const targetBooking = encoreBookings[0]; // Link to most recent

        // Store the follow-up message
        const { uploadToCloudflareR2 } = await import('./cloud-storage');
        const messageHtml = this.createEncoreFollowupMessageHtml(emailData, targetBooking);
        const fileName = `user${user.id}/booking${targetBooking.id}/messages/encore_followup_${Date.now()}.html`;

        await uploadToCloudflareR2(Buffer.from(messageHtml, 'utf8'), fileName, 'text/html');

        // Add to messages table
        await storage.createMessage({
          userId: user.id,
          bookingId: targetBooking.id,
          senderEmail: emailData.from,
          subject: `[ENCORE FOLLOW-UP] ${emailData.subject}`,
          messageUrl: fileName,
          isRead: false,
          createdAt: new Date()
        });

        console.log(`✅ [${requestId}] Encore follow-up linked to booking ${targetBooking.id}`);
        return {
          success: true,
          action: 'processed',
          details: `Linked to booking ${targetBooking.id}`,
          userId: user.id,
          bookingId: targetBooking.id
        };
      } else {
        console.log(`⚠️  [${requestId}] No recent Encore bookings found for follow-up`);

        // Save to unparseable messages for manual review
        await storage.createUnparseableMessage({
          userId: user.id,
          source: 'email',
          fromContact: emailData.from,
          subject: `[ENCORE - NO BOOKINGS] ${emailData.subject}`,
          rawMessage: emailData.bodyPlain,
          parsingErrorDetails: 'Encore follow-up email - no existing Encore bookings found to link to',
          messageType: 'encore_followup_unlinked',
          createdAt: new Date()
        });

        return {
          success: true,
          action: 'processed',
          details: 'No Encore bookings found - saved for manual review',
          userId: user.id
        };
      }

    } catch (error: any) {
      console.error(`❌ [${requestId}] Encore follow-up processing failed:`, error);
      return {
        success: false,
        action: 'rejected',
        error: error.message
      };
    }
  }

  /**
   * Handle booking reply emails
   */
  private async handleBookingReply(emailData: EmailData, user: any, requestId: string): Promise<ProcessingResult> {
    try {
      console.log(`📋 [${requestId}] Processing booking reply email`);

      // Extract booking ID from subject or body
      const bookingIdMatch = (emailData.subject + ' ' + emailData.bodyPlain).match(/booking\s*#?\s*(\d+)/i);

      if (!bookingIdMatch) {
        throw new Error('Could not extract booking ID from reply');
      }

      const bookingId = parseInt(bookingIdMatch[1]);

      // Verify booking exists and belongs to user
      const { storage } = await import('./storage');
      const booking = await storage.getBooking(bookingId);

      if (!booking || booking.userId !== user.id) {
        throw new Error(`Booking ${bookingId} not found or access denied`);
      }

      // Store the reply
      const messageHtml = this.createBookingReplyMessageHtml(emailData, booking);
      const { uploadToCloudflareR2 } = await import('./cloud-storage');
      const fileName = `user${user.id}/booking${bookingId}/messages/reply_${Date.now()}.html`;

      await uploadToCloudflareR2(Buffer.from(messageHtml, 'utf8'), fileName, 'text/html');

      // Add to messages table
      await storage.createMessage({
        userId: user.id,
        bookingId: bookingId,
        senderEmail: emailData.from,
        subject: emailData.subject,
        messageUrl: fileName,
        isRead: false,
        createdAt: new Date()
      });

      console.log(`✅ [${requestId}] Booking reply linked to booking ${bookingId}`);
      return {
        success: true,
        action: 'processed',
        details: `Linked to booking ${bookingId}`,
        userId: user.id,
        bookingId: bookingId
      };

    } catch (error: any) {
      console.error(`❌ [${requestId}] Booking reply processing failed:`, error);
      return {
        success: false,
        action: 'rejected',
        error: error.message
      };
    }
  }

  /**
   * Handle invoice reply emails
   */
  private async handleInvoiceReply(emailData: EmailData, user: any, requestId: string): Promise<ProcessingResult> {
    try {
      console.log(`🧾 [${requestId}] Processing invoice reply email`);

      // Extract invoice ID from subject or body
      const invoiceIdMatch = (emailData.subject + ' ' + emailData.bodyPlain).match(/invoice\s*#?\s*(\d+)/i);

      if (!invoiceIdMatch) {
        throw new Error('Could not extract invoice ID from reply');
      }

      const invoiceId = parseInt(invoiceIdMatch[1]);

      // Store as invoice reply
      const { storage } = await import('./storage');

      // For now, save to unparseable messages with clear labeling
      // TODO: Implement proper invoice reply handling when invoice system is built
      await storage.createUnparseableMessage({
        userId: user.id,
        source: 'email',
        fromContact: emailData.from,
        subject: `[INVOICE REPLY #${invoiceId}] ${emailData.subject}`,
        rawMessage: emailData.bodyPlain,
        parsingErrorDetails: `Reply to invoice ${invoiceId}`,
        messageType: 'invoice_reply',
        createdAt: new Date()
      });

      console.log(`✅ [${requestId}] Invoice reply saved for invoice ${invoiceId}`);
      return {
        success: true,
        action: 'processed',
        details: `Invoice reply saved for manual handling`,
        userId: user.id
      };

    } catch (error: any) {
      console.error(`❌ [${requestId}] Invoice reply processing failed:`, error);
      return {
        success: false,
        action: 'rejected',
        error: error.message
      };
    }
  }

  /**
   * Handle new inquiry emails (main booking processing)
   */
  private async handleNewInquiry(emailData: EmailData, user: any, requestId: string): Promise<ProcessingResult> {
    try {
      console.log(`📨 [${requestId}] Processing new inquiry email`);

      // Use AI to parse the booking inquiry
      const { parseBookingMessage } = await import('../ai/booking-message-parser');

      const parsedData = await parseBookingMessage(
        emailData.bodyPlain,
        emailData.from,
        emailData.subject,
        user.id
      );

      if (!parsedData) {
        throw new Error('AI parsing failed - no booking data extracted');
      }

      // Store the parsed booking
      const { storage } = await import('./storage');
      const bookingData = {
        userId: user.id,
        source: 'email',
        status: 'new' as const,
        clientName: parsedData.clientName,
        clientEmail: parsedData.clientEmail,
        clientPhone: parsedData.clientPhone,
        eventDate: parsedData.eventDate ? new Date(parsedData.eventDate) : null,
        eventTime: parsedData.eventTime,
        venue: parsedData.venue,
        venueAddress: parsedData.venueAddress,
        fee: parsedData.fee || null,
        deposit: parsedData.deposit || null,
        title: parsedData.title || emailData.subject,
        message: parsedData.message || emailData.bodyPlain,
        specialRequirements: parsedData.specialRequirements,
        applyNowLink: parsedData.applyNowLink,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const booking = await storage.createBooking(bookingData);

      console.log(`✅ [${requestId}] New booking created: ${booking.id}`);
      return {
        success: true,
        action: 'processed',
        details: `New booking created: ${booking.id}`,
        userId: user.id,
        bookingId: booking.id
      };

    } catch (error: any) {
      console.error(`❌ [${requestId}] New inquiry processing failed:`, error);

      // Save to unparseable messages as fallback
      const { storage } = await import('./storage');
      await storage.createUnparseableMessage({
        userId: user.id,
        source: 'email',
        fromContact: emailData.from,
        subject: emailData.subject,
        rawMessage: emailData.bodyPlain,
        parsingErrorDetails: `New inquiry parsing failed: ${error.message}`,
        messageType: 'new_inquiry_failed',
        createdAt: new Date()
      });

      return {
        success: true,
        action: 'processed',
        details: 'Saved to unparseable messages for manual review',
        userId: user.id
      };
    }
  }

  /**
   * Handle emails sent to unknown users
   */
  private async handleUnknownUser(emailData: EmailData, requestId: string): Promise<ProcessingResult> {
    try {
      console.log(`❓ [${requestId}] Handling email for unknown user: ${emailData.to}`);

      // Get fallback user (admin/main user) to save under
      const { storage } = await import('./storage');
      const allUsers = await storage.getAllUsers();
      const fallbackUser = allUsers.find(u => u.email.includes('jake') || u.email.includes('admin')) || allUsers[0];

      if (fallbackUser) {
        console.log(`📧 [${requestId}] Saving to fallback user: ${fallbackUser.id}`);

        await storage.createUnparseableMessage({
          userId: fallbackUser.id,
          source: 'email',
          fromContact: emailData.from,
          subject: `[UNKNOWN USER: ${emailData.to}] ${emailData.subject}`,
          rawMessage: `⚠️ EMAIL ROUTING ERROR:\nThis email was sent to "${emailData.to}" but no user found.\n\nOriginal email:\n---\n${emailData.bodyPlain}`,
          parsingErrorDetails: `Email sent to unknown user: ${emailData.to}`,
          messageType: 'unknown_user',
          createdAt: new Date()
        });

        return {
          success: true,
          action: 'processed',
          details: 'Saved under fallback user for review',
          userId: fallbackUser.id
        };
      } else {
        throw new Error('No fallback user available');
      }

    } catch (error: any) {
      console.error(`❌ [${requestId}] Unknown user handling failed:`, error);
      return {
        success: false,
        action: 'rejected',
        error: `No user found for ${emailData.to} and fallback failed: ${error.message}`
      };
    }
  }

  /**
   * Save failed emails to unparseable messages
   */
  private async saveToUnparseableMessages(webhookData: any, errorMessage: string, requestId: string): Promise<void> {
    const { storage } = await import('./storage');

    // Get fallback user
    const allUsers = await storage.getAllUsers();
    const fallbackUser = allUsers.find(u => u.email.includes('jake') || u.email.includes('admin')) || allUsers[0];

    if (!fallbackUser) {
      throw new Error('No fallback user available for unparseable message storage');
    }

    const rawFrom = webhookData.From || webhookData.from || webhookData.sender || 'Unknown';
    const rawSubject = webhookData.Subject || webhookData.subject || 'No Subject';
    const rawBody = webhookData['body-plain'] || webhookData.text || webhookData['stripped-text'] || 'No content';

    await storage.createUnparseableMessage({
      userId: fallbackUser.id,
      source: 'email',
      fromContact: rawFrom,
      subject: `[PROCESSING ERROR] ${rawSubject}`,
      rawMessage: `Processing failed: ${errorMessage}\n\n--- Original Email ---\n${rawBody}`,
      parsingErrorDetails: `Unified processor error: ${errorMessage}`,
      messageType: 'processing_error',
      createdAt: new Date()
    });

    console.log(`💾 [${requestId}] Saved failed email to unparseable messages under user ${fallbackUser.id}`);
  }

  // ===== UTILITY METHODS =====

  /**
   * Create duplicate detection hash
   */
  private createDuplicateHash(emailData: EmailData): string {
    const hashString = `${emailData.from}|${emailData.subject}|${emailData.bodyPlain.substring(0, 100)}`;
    return Buffer.from(hashString).toString('base64').substring(0, 20);
  }

  /**
   * Check if email is a duplicate
   */
  private isDuplicate(hash: string): boolean {
    return this.processedEmails.has(hash);
  }

  /**
   * Mark email as processed
   */
  private markAsProcessed(hash: string): void {
    this.processedEmails.add(hash);

    // Remove after duplicate window expires
    setTimeout(() => {
      this.processedEmails.delete(hash);
    }, this.duplicateWindowMs);
  }

  /**
   * Cleanup old processed emails
   */
  private cleanupProcessedEmails(): void {
    // The setTimeout in markAsProcessed handles cleanup automatically
    console.log(`🧹 Processed emails cache size: ${this.processedEmails.size}`);
  }

  /**
   * Create HTML for Encore follow-up message
   */
  private createEncoreFollowupMessageHtml(emailData: EmailData, booking: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Encore Follow-up - ${emailData.subject}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 20px; }
        .header { background-color: #f0f8ff; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .encore-badge { background-color: #9c27b0; color: white; padding: 2px 8px; border-radius: 3px; font-size: 12px; }
        .content { background-color: #ffffff; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <strong>🎵 Encore Follow-up Message</strong> <span class="encore-badge">AUTO-LINKED</span><br>
        <strong>From:</strong> ${emailData.from}<br>
        <strong>Subject:</strong> ${emailData.subject}<br>
        <strong>Date:</strong> ${emailData.timestamp.toLocaleString()}<br>
        <strong>Linked to Booking:</strong> #${booking.id} - ${booking.title}
    </div>

    <div class="content">
        ${emailData.bodyHtml || emailData.bodyPlain.replace(/\n/g, '<br>')}
    </div>
</body>
</html>`;
  }

  /**
   * Create HTML for booking reply message
   */
  private createBookingReplyMessageHtml(emailData: EmailData, booking: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Booking Reply - ${emailData.subject}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 20px; }
        .header { background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .content { background-color: #ffffff; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <strong>📨 Client Reply</strong><br>
        <strong>From:</strong> ${emailData.from}<br>
        <strong>Subject:</strong> ${emailData.subject}<br>
        <strong>Date:</strong> ${emailData.timestamp.toLocaleString()}<br>
        <strong>Booking ID:</strong> #${booking.id}
    </div>

    <div class="content">
        ${emailData.bodyHtml || emailData.bodyPlain.replace(/\n/g, '<br>')}
    </div>
</body>
</html>`;
  }
}

// Export singleton instance
export const unifiedEmailProcessor = new UnifiedEmailProcessor();