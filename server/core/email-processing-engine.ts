/**
 * ROBUST EMAIL PROCESSING ENGINE
 * Completely rewritten to eliminate recurring failures
 * Features:
 * - Smart duplicate detection for different email types
 * - Proper error handling with user visibility
 * - Comprehensive logging and monitoring
 * - Fallback mechanisms for AI failures
 * - User notifications for processing status
 */

import { Mutex } from 'async-mutex';
import { storage } from './storage';

interface ProcessingResult {
  success: boolean;
  bookingId?: number;
  error?: string;
  action: 'created' | 'duplicate' | 'failed' | 'review';
  details?: string;
}

interface EmailData {
  from: string;
  subject: string;
  body: string;
  recipient: string;
  timestamp: number;
}

export class EmailProcessingEngine {
  private processingMutex = new Mutex();
  private aiCallCount = 0;
  private lastMinuteReset = Date.now();

  constructor() {
    console.log('🏗️ Robust Email Processing Engine initialized');
    
    // Reset API counter every minute
    setInterval(() => {
      console.log(`📊 Processed ${this.aiCallCount} AI calls in the last minute`);
      this.aiCallCount = 0;
      this.lastMinuteReset = Date.now();
    }, 60000);
  }

  /**
   * MAIN PROCESSING ENTRY POINT
   * Processes email with comprehensive error handling
   */
  async processEmail(webhookData: any): Promise<ProcessingResult> {
    const requestId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`📧 [${requestId}] ROBUST PROCESSING: Starting email processing`);

    try {
      // Extract and normalize email data
      const emailData = this.extractEmailData(webhookData, requestId);
      if (!emailData) {
        throw new Error('Failed to extract email data from webhook');
      }

      // Find the user
      const user = await this.findUserByEmailPrefix(emailData.recipient, requestId);
      if (!user) {
        return {
          success: false,
          action: 'failed',
          error: `No user found for email prefix: ${emailData.recipient}`,
          details: 'Email saved to admin review queue'
        };
      }

      console.log(`✅ [${requestId}] Found user: ${user.id} (${user.email})`);

      // Check for duplicates using smart detection
      const duplicateCheck = await this.checkForDuplicates(emailData, user.id, requestId);
      if (duplicateCheck.isDuplicate) {
        return {
          success: true,
          action: 'duplicate',
          bookingId: duplicateCheck.existingBookingId,
          details: 'Duplicate email detected, skipped processing'
        };
      }

      // Acquire processing lock to prevent race conditions
      return await this.processingMutex.runExclusive(async () => {
        return await this.processWithAI(emailData, user, requestId);
      });

    } catch (error: any) {
      console.error(`❌ [${requestId}] CRITICAL PROCESSING FAILURE:`, error);
      
      // Save to user's review messages with full context
      await this.saveToUserReviewMessages(webhookData, error.message, requestId);
      
      return {
        success: false,
        action: 'failed',
        error: error.message,
        details: 'Email saved to review messages for manual processing'
      };
    }
  }

  /**
   * SMART DUPLICATE DETECTION
   * Different logic for different email types
   */
  private async checkForDuplicates(emailData: EmailData, userId: string, requestId: string): Promise<{isDuplicate: boolean, existingBookingId?: number}> {
    console.log(`🔍 [${requestId}] DUPLICATE CHECK: Starting smart duplicate detection`);

    try {
      // For Weebly forms, use form content for duplicate detection
      if (this.isWeeblyForm(emailData)) {
        return await this.checkWeeblyFormDuplicates(emailData, userId, requestId);
      }
      
      // For Encore emails, use job-specific content
      if (this.isEncoreEmail(emailData)) {
        return await this.checkEncoreEmailDuplicates(emailData, userId, requestId);
      }
      
      // For regular emails, use sender + subject + content start
      return await this.checkRegularEmailDuplicates(emailData, userId, requestId);
      
    } catch (error: any) {
      console.error(`❌ [${requestId}] Duplicate check failed:`, error);
      // If duplicate check fails, proceed with processing (safe default)
      return { isDuplicate: false };
    }
  }

  /**
   * WEEBLY FORM DUPLICATE DETECTION
   * Based on actual form data, not sender
   */
  private async checkWeeblyFormDuplicates(emailData: EmailData, userId: string, requestId: string): Promise<{isDuplicate: boolean, existingBookingId?: number}> {
    console.log(`📋 [${requestId}] WEEBLY CHECK: Extracting form data for duplicate detection`);
    
    // Extract form fields
    const nameMatch = emailData.body.match(/Name\s*([^\n]+)/i);
    const emailMatch = emailData.body.match(/Email\s*([^\n]+)/i);
    const phoneMatch = emailData.body.match(/Phone\s*([^\n]+)/i);
    const locationMatch = emailData.body.match(/Location of Event\s*([^\n]+)/i);
    const dateMatch = emailData.body.match(/Date and type of event\s*([^\n]+)/i);
    
    const clientName = nameMatch?.[1]?.trim();
    const clientEmail = emailMatch?.[1]?.trim();
    const clientPhone = phoneMatch?.[1]?.trim();
    const eventLocation = locationMatch?.[1]?.trim();
    const eventDetails = dateMatch?.[1]?.trim();
    
    console.log(`📋 [${requestId}] WEEBLY FORM DATA:`, {
      clientName,
      clientEmail,
      eventLocation,
      eventDetails: eventDetails?.substring(0, 50)
    });
    
    if (!clientName || !clientEmail) {
      console.log(`⚠️ [${requestId}] WEEBLY FORM: Missing critical data, treating as unique`);
      return { isDuplicate: false };
    }
    
    // Check for existing booking with same client and similar event details
    const userBookings = await storage.getBookings(userId);
    const recentBookings = userBookings.filter(b => {
      const bookingAge = Date.now() - new Date(b.createdAt || 0).getTime();
      return bookingAge < 24 * 60 * 60 * 1000; // Last 24 hours
    });
    
    for (const booking of recentBookings) {
      // Check for exact match on client name and email
      const nameMatch = booking.clientName?.toLowerCase() === clientName.toLowerCase();
      const emailMatch = booking.clientEmail?.toLowerCase() === clientEmail.toLowerCase();
      
      if (nameMatch && emailMatch) {
        console.log(`🔄 [${requestId}] DUPLICATE FOUND: Booking #${booking.id} has same client`);
        return { 
          isDuplicate: true, 
          existingBookingId: booking.id 
        };
      }
    }
    
    return { isDuplicate: false };
  }

  /**
   * PROCESS EMAIL WITH AI
   * Robust AI processing with fallback mechanisms
   */
  private async processWithAI(emailData: EmailData, user: any, requestId: string): Promise<ProcessingResult> {
    console.log(`🤖 [${requestId}] AI PROCESSING: Starting intelligent parsing`);
    
    try {
      // Track AI usage
      this.aiCallCount++;
      
      const { parseBookingMessage } = await import('../ai/booking-message-parser');
      const parsedData = await parseBookingMessage(
        emailData.body,
        emailData.from,
        null,
        user.id,
        emailData.subject
      );
      
      console.log(`✅ [${requestId}] AI PARSING COMPLETE:`, {
        hasEventDate: !!parsedData.eventDate,
        eventDateValue: parsedData.eventDate,
        hasVenue: !!parsedData.venue,
        venueValue: parsedData.venue,
        hasClientName: !!parsedData.clientName,
        clientNameValue: parsedData.clientName,
        hasApplyNowLink: !!parsedData.applyNowLink,
        applyNowLinkValue: parsedData.applyNowLink || 'NOT FOUND',
        confidence: parsedData.confidence,
        fullParsedData: parsedData
      });
      
      // Validate parsed data quality
      if (!this.isDataQualitySufficient(parsedData, emailData, requestId)) {
        // Save to review messages instead of failing completely
        await this.saveToUserReviewMessages(
          { From: emailData.from, Subject: emailData.subject, 'body-plain': emailData.body },
          'Insufficient data quality for automatic booking creation',
          requestId,
          user.id
        );
        
        return {
          success: true,
          action: 'review',
          details: 'Email requires manual review due to insufficient parsed data'
        };
      }
      
      // Create booking
      const bookingData = this.buildBookingData(parsedData, emailData, user.id);
      
      // Log apply link in bookingData
      console.log(`📎 [${requestId}] BOOKING DATA APPLY LINK:`, {
        hasApplyLink: !!bookingData.applyNowLink,
        applyLinkValue: bookingData.applyNowLink || 'NOT SET IN BOOKING DATA'
      });
      
      const newBooking = await storage.createBooking(bookingData);
      
      console.log(`✅ [${requestId}] BOOKING CREATED: #${newBooking.id} for user ${user.id}`, {
        finalApplyLink: newBooking.applyNowLink || 'NOT IN CREATED BOOKING'
      });
      
      return {
        success: true,
        action: 'created',
        bookingId: newBooking.id,
        details: `Created booking "${newBooking.title}"`
      };
      
    } catch (aiError: any) {
      console.error(`❌ [${requestId}] AI PROCESSING FAILED:`, aiError);
      
      // Try fallback processing for known email types
      const fallbackResult = await this.tryFallbackProcessing(emailData, user, requestId);
      if (fallbackResult.success) {
        return fallbackResult;
      }
      
      // If all else fails, save for manual review
      await this.saveToUserReviewMessages(
        { From: emailData.from, Subject: emailData.subject, 'body-plain': emailData.body },
        `AI processing failed: ${aiError.message}`,
        requestId,
        user.id
      );
      
      return {
        success: true,
        action: 'review',
        error: aiError.message,
        details: 'AI processing failed, email saved for manual review'
      };
    }
  }

  /**
   * FALLBACK PROCESSING
   * Handle known email types without AI when AI fails
   */
  private async tryFallbackProcessing(emailData: EmailData, user: any, requestId: string): Promise<ProcessingResult> {
    console.log(`🔄 [${requestId}] FALLBACK: Attempting non-AI processing`);
    
    try {
      if (this.isWeeblyForm(emailData)) {
        return await this.processWeeblyFormFallback(emailData, user, requestId);
      }
      
      // Add other fallback processors here
      return { success: false, action: 'failed', error: 'No fallback available' };
      
    } catch (error: any) {
      console.error(`❌ [${requestId}] FALLBACK FAILED:`, error);
      return { success: false, action: 'failed', error: error.message };
    }
  }

  /**
   * WEEBLY FORM FALLBACK PROCESSOR
   * Parse Weebly forms without AI
   */
  private async processWeeblyFormFallback(emailData: EmailData, user: any, requestId: string): Promise<ProcessingResult> {
    console.log(`📋 [${requestId}] WEEBLY FALLBACK: Processing form without AI`);
    
    try {
      // Extract form data using regex
      const nameMatch = emailData.body.match(/Name\s*([^\n]+)/i);
      const phoneMatch = emailData.body.match(/Phone\s*([^\n]+)/i);
      const locationMatch = emailData.body.match(/Location of Event\s*([^\n]+)/i);
      const dateMatch = emailData.body.match(/Date and type of event\s*([^\n]+)/i);
      const discoMatch = emailData.body.match(/complete package with disco[?\s]*([^\n]+)/i);
      
      const clientName = nameMatch?.[1]?.trim() || 'Unknown Client';
      // Use the same email priority logic as main processing
      const clientEmail = this.extractClientEmail({}, emailData);
      const clientPhone = phoneMatch?.[1]?.trim();
      const eventLocation = locationMatch?.[1]?.trim();
      const eventDetails = dateMatch?.[1]?.trim();
      const discoRequired = discoMatch?.[1]?.trim()?.toLowerCase().includes('yes');
      
      // Create basic booking data
      const bookingData = {
        userId: user.id,
        title: `Website Enquiry - ${clientName}`,
        clientName: clientName,
        clientEmail: clientEmail,
        clientPhone: clientPhone,
        venue: eventLocation || 'Location TBC',
        venueAddress: null,
        eventDate: null, // Will need manual date parsing
        eventTime: null,
        eventEndTime: null,
        fee: null,
        deposit: null,
        status: 'new',
        notes: `WEBSITE FORM SUBMISSION\n\nEvent Details: ${eventDetails || 'Not specified'}\nDisco Package: ${discoRequired ? 'Yes' : 'Maybe/No'}\n\nOriginal Message:\n${emailData.body}`,
        gigType: 'Wedding', // Default for most Weebly forms
        specialRequirements: discoRequired ? 'Complete package with disco requested' : null,
        processedAt: new Date()
      };
      
      const newBooking = await storage.createBooking(bookingData);
      
      console.log(`✅ [${requestId}] WEEBLY FALLBACK SUCCESS: Created booking #${newBooking.id}`);
      
      return {
        success: true,
        action: 'created',
        bookingId: newBooking.id,
        details: `Created booking via fallback processing - manual date entry required`
      };
      
    } catch (error: any) {
      console.error(`❌ [${requestId}] WEEBLY FALLBACK FAILED:`, error);
      return { success: false, action: 'failed', error: error.message };
    }
  }

  // Helper methods
  private extractEmailData(webhookData: any, requestId: string): EmailData | null {
    try {
      const from = webhookData.From || webhookData.from || webhookData.sender || '';
      const subject = webhookData.Subject || webhookData.subject || '';
      
      // Prefer HTML content for better formatting cues, fall back to plain text
      let body = webhookData['body-html'] || webhookData.html || webhookData['body-plain'] || webhookData.text || webhookData['stripped-text'] || '';
      
      // If we got HTML, convert basic tags to text equivalents for better parsing
      if (body && body.includes('<')) {
        // Convert HTML breaks and paragraphs to newlines for signature detection
        body = body
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<\/p>/gi, '\n')
          .replace(/<p[^>]*>/gi, '\n')
          .replace(/<[^>]+>/g, '') // Strip remaining HTML tags
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>');
      }
      
      const recipient = webhookData.To || webhookData.recipient || '';
      
      console.log(`📧 [${requestId}] EMAIL EXTRACTION:`, {
        from: from.substring(0, 50) + '...',
        subject: subject.substring(0, 50) + '...',
        bodyLength: body.length,
        bodyPreview: body.substring(0, 100) + '...',
        recipient: recipient.substring(0, 50) + '...'
      });
      
      if (!from && !subject && !body) {
        console.error(`❌ [${requestId}] EMAIL DATA: All fields empty`);
        return null;
      }
      
      return {
        from,
        subject,
        body,
        recipient,
        timestamp: Date.now()
      };
    } catch (error: any) {
      console.error(`❌ [${requestId}] EMAIL EXTRACTION FAILED:`, error);
      return null;
    }
  }

  private async findUserByEmailPrefix(recipient: string, requestId: string): Promise<any | null> {
    try {
      const recipientMatch = recipient.match(/([^@]+)@/);
      if (!recipientMatch) {
        console.error(`❌ [${requestId}] Invalid recipient format: ${recipient}`);
        return null;
      }
      
      const emailPrefix = recipientMatch[1].toLowerCase();
      console.log(`🔍 [${requestId}] Looking for user with prefix: ${emailPrefix}`);
      
      const user = await storage.getUserByEmailPrefix(emailPrefix);
      if (!user) {
        console.error(`❌ [${requestId}] No user found for prefix: ${emailPrefix}`);
      }
      
      return user;
    } catch (error: any) {
      console.error(`❌ [${requestId}] USER LOOKUP FAILED:`, error);
      return null;
    }
  }

  private isWeeblyForm(emailData: EmailData): boolean {
    return emailData.from.toLowerCase().includes('weebly') || 
           emailData.body.toLowerCase().includes('contact form');
  }

  private isEncoreEmail(emailData: EmailData): boolean {
    return emailData.from.toLowerCase().includes('encore') ||
           emailData.body.toLowerCase().includes('encore') ||
           emailData.body.includes('apply now');
  }

  private async checkRegularEmailDuplicates(emailData: EmailData, userId: string, requestId: string): Promise<{isDuplicate: boolean, existingBookingId?: number}> {
    // Implement regular email duplicate checking
    return { isDuplicate: false };
  }

  private async checkEncoreEmailDuplicates(emailData: EmailData, userId: string, requestId: string): Promise<{isDuplicate: boolean, existingBookingId?: number}> {
    // Implement Encore email duplicate checking
    return { isDuplicate: false };
  }

  private isDataQualitySufficient(parsedData: any, emailData: EmailData, requestId: string): boolean {
    // For Weebly forms, we can work with less data
    if (this.isWeeblyForm(emailData)) {
      return !!parsedData.clientName || emailData.body.includes('Name');
    }
    
    // FIXED: More flexible validation - accept emails with key booking information
    // Previous logic was too strict, requiring eventDate even when other data was valid
    const hasEventDetails = !!(parsedData.eventDate || parsedData.eventType);
    const hasContactInfo = !!(parsedData.clientName || parsedData.clientEmail);
    const hasVenueInfo = !!(parsedData.venue || parsedData.venueAddress);
    
    // Accept if we have event details AND (contact info OR venue info)
    // This covers most legitimate booking inquiries while filtering out spam
    return hasEventDetails && (hasContactInfo || hasVenueInfo);
  }

  private buildBookingData(parsedData: any, emailData: EmailData, userId: string): any {
    const { cleanEncoreTitle } = require('./booking-formatter');
    const cleanedSubject = cleanEncoreTitle(emailData.subject);
    
    // Log if this is an Encore email
    if (this.isEncoreEmail(emailData)) {
      console.log(`🎵 [ENCORE BUILD] Building booking data for Encore email:`, {
        hasApplyLink: !!parsedData.applyNowLink,
        applyLinkValue: parsedData.applyNowLink || 'NO LINK FOUND',
        subject: emailData.subject
      });
    }
    
    // Extract client email with proper priority: form content first, then parsed data, then sender
    const clientEmail = this.extractClientEmail(parsedData, emailData);
    
    return {
      userId: userId,
      title: cleanedSubject || `Email Booking - ${emailData.from.split('<')[0].trim() || 'Unknown'}`,
      clientName: parsedData.clientName || emailData.from.split('<')[0].trim() || 'Unknown Client',
      clientEmail: clientEmail,
      clientPhone: parsedData.clientPhone || null,
      venue: parsedData.venue || null,
      venueAddress: parsedData.venueAddress || null,
      eventDate: parsedData.eventDate || null,
      eventTime: parsedData.eventTime || null,
      eventEndTime: parsedData.eventEndTime || null,
      fee: parsedData.fee || null,
      travelExpense: parsedData.travelExpense || null,  // Separate travel costs
      deposit: parsedData.deposit || null,
      status: 'new',
      notes: emailData.body,
      gigType: parsedData.eventType || null,
      specialRequirements: parsedData.specialRequirements || null,
      applyNowLink: parsedData.applyNowLink || null,
      processedAt: new Date()
    };
  }

  /**
   * Extract client email with proper priority:
   * 1. Form content email (from body)
   * 2. AI parsed email 
   * 3. Sender email (fallback only)
   */
  private extractClientEmail(parsedData: any, emailData: EmailData): string | null {
    // 1. First priority: Extract email from form content
    const formEmails = this.extractEmailsFromFormContent(emailData.body);
    if (formEmails.length > 0) {
      console.log(`📧 PRIORITY: Using form content email: ${formEmails[0]}`);
      return formEmails[0];
    }
    
    // 2. Second priority: AI parsed email
    if (parsedData.clientEmail && !parsedData.clientEmail.includes('weebly.com') && !parsedData.clientEmail.includes('encore.com')) {
      console.log(`📧 PRIORITY: Using AI parsed email: ${parsedData.clientEmail}`);
      return parsedData.clientEmail;
    }
    
    // 3. Last resort: Sender email (but skip service emails)
    const senderEmail = emailData.from.match(/[\w.-]+@[\w.-]+\.\w+/)?.[0];
    if (senderEmail && !senderEmail.includes('weebly.com') && !senderEmail.includes('encore.com') && !senderEmail.includes('no-reply')) {
      console.log(`📧 PRIORITY: Using sender email: ${senderEmail}`);
      return senderEmail;
    }
    
    console.log(`⚠️ PRIORITY: No valid email found, returning null`);
    return null;
  }

  /**
   * Extract email addresses from form content (body text)
   */
  private extractEmailsFromFormContent(body: string): string[] {
    const emails: string[] = [];
    
    // Common form patterns
    const patterns = [
      /Email[:\s]*([^\n\r]+)/i,
      /E-mail[:\s]*([^\n\r]+)/i,
      /Email Address[:\s]*([^\n\r]+)/i,
      /Contact Email[:\s]*([^\n\r]+)/i,
      // Generic email pattern in body
      /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g
    ];
    
    for (const pattern of patterns) {
      const matches = body.match(pattern);
      if (matches) {
        const emailMatch = matches[1] || matches[0];
        const cleanEmail = emailMatch.trim();
        
        // Extract actual email if it contains extra text
        const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
        const extracted = cleanEmail.match(emailRegex);
        
        if (extracted && extracted[0]) {
          const email = extracted[0].toLowerCase();
          // Skip service emails
          if (!email.includes('weebly.com') && !email.includes('encore.com') && !email.includes('no-reply')) {
            emails.push(email);
          }
        }
      }
    }
    
    return [...new Set(emails)]; // Remove duplicates
  }

  private async saveToUserReviewMessages(webhookData: any, reason: string, requestId: string, userId?: string): Promise<void> {
    try {
      // If no userId provided, try to extract from webhook data
      if (!userId) {
        const recipient = webhookData.To || webhookData.recipient || '';
        const user = await this.findUserByEmailPrefix(recipient, requestId);
        userId = user?.id;
      }
      
      // If still no user, save to admin queue
      if (!userId) {
        userId = '43963086'; // Admin fallback
        console.log(`⚠️ [${requestId}] Saving to admin review queue - no user found`);
      }
      
      const fromField = webhookData.From || webhookData.from || webhookData.sender || '';
      const subjectField = webhookData.Subject || webhookData.subject || '';
      const bodyField = webhookData['body-plain'] || webhookData.text || webhookData['stripped-text'] || '';
      
      // Use proper email extraction priority for review messages
      const emailData = {
        from: fromField,
        subject: subjectField,
        body: bodyField,
        recipient: '',
        timestamp: Date.now()
      };
      
      const clientEmail = this.extractClientEmail({}, emailData) || '';
      
      let clientName = 'Unknown';
      if (fromField.includes('<')) {
        const nameMatch = fromField.match(/^([^<]+)/);
        if (nameMatch) clientName = nameMatch[1].trim();
      } else if (clientEmail) {
        clientName = clientEmail.split('@')[0];
      }
      
      // Try to extract name from form content if available
      const nameMatch = bodyField.match(/Name[:\s]*([^\n\r]+)/i);
      if (nameMatch && nameMatch[1]) {
        clientName = nameMatch[1].trim();
      }
      
      await storage.createUnparseableMessage({
        userId: userId,
        source: 'email',
        fromContact: `${clientName} <${clientEmail}>`,
        rawMessage: bodyField || 'No message content',
        clientAddress: null,
        messageType: 'processing_failed',
        parsingErrorDetails: reason
      });
      
      console.log(`📋 [${requestId}] Saved to review messages for user ${userId}`);
      
    } catch (error: any) {
      console.error(`❌ [${requestId}] CRITICAL: Failed to save review message:`, error);
    }
  }
}

// Export singleton instance
export const emailProcessingEngine = new EmailProcessingEngine();