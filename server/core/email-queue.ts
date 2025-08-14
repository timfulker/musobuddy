/**
 * Email Processing Queue System
 * Prevents race conditions when multiple emails arrive simultaneously
 */

interface EmailJob {
  id: string;
  timestamp: number;
  requestData: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retries: number;
  maxRetries: number;
  error?: string;
}

class EmailQueue {
  private queue: EmailJob[] = [];
  private processing = false;
  private readonly maxRetries = 3;
  private readonly processingDelay = 500; // 500ms between jobs to prevent conflicts

  constructor() {
    console.log('📧 Email processing queue initialized');
  }

  /**
   * Add email to processing queue
   */
  async addEmail(requestData: any): Promise<{ jobId: string; queuePosition: number }> {
    const jobId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job: EmailJob = {
      id: jobId,
      timestamp: Date.now(),
      requestData,
      status: 'pending',
      retries: 0,
      maxRetries: this.maxRetries
    };

    this.queue.push(job);
    console.log(`📧 [QUEUE] Added email job ${jobId} to queue (position: ${this.queue.length})`);

    // Start processing if not already running
    if (!this.processing) {
      this.startProcessing();
    }

    return {
      jobId,
      queuePosition: this.queue.length
    };
  }

  /**
   * Start processing queue
   */
  private async startProcessing() {
    if (this.processing) return;

    this.processing = true;
    console.log('📧 [QUEUE] Starting email processing...');

    while (this.queue.length > 0) {
      const job = this.queue.shift();
      if (!job) continue;

      try {
        console.log(`📧 [QUEUE] Processing job ${job.id}...`);
        job.status = 'processing';

        // Process the email with proper error handling
        await this.processEmail(job);
        
        job.status = 'completed';
        console.log(`📧 [QUEUE] ✅ Job ${job.id} completed successfully`);

      } catch (error: any) {
        console.error(`📧 [QUEUE] ❌ Job ${job.id} failed:`, error.message);
        
        job.retries++;
        job.error = error.message;

        if (job.retries < job.maxRetries) {
          console.log(`📧 [QUEUE] Retrying job ${job.id} (attempt ${job.retries + 1}/${job.maxRetries})`);
          job.status = 'pending';
          this.queue.push(job); // Re-add to end of queue
        } else {
          job.status = 'failed';
          console.error(`📧 [QUEUE] Job ${job.id} failed after ${job.maxRetries} attempts`);
        }
      }

      // Add delay between processing jobs to prevent race conditions
      if (this.queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.processingDelay));
      }
    }

    this.processing = false;
    console.log('📧 [QUEUE] Email processing completed');
  }

  /**
   * Process individual email job
   */
  private async processEmail(job: EmailJob): Promise<void> {
    const { requestData } = job;
    const requestId = job.id;

    console.log(`📧 [${requestId}] Processing email from queue`);

    // Helper function to save to review messages with proper error handling
    const saveToReviewMessages = async (reason: string, errorDetails?: string) => {
      try {
        const { storage } = await import('./storage');
        
        const fromField = requestData.From || requestData.from || requestData.sender || '';
        const subjectField = requestData.Subject || requestData.subject || '';
        const bodyField = requestData['body-plain'] || requestData.text || requestData['stripped-text'] || '';
        
        // Extract email and name
        let clientEmail = '';
        const emailMatch = fromField.match(/[\w.-]+@[\w.-]+\.\w+/);
        if (emailMatch) clientEmail = emailMatch[0];
        
        let clientName = 'Unknown';
        if (fromField.includes('<')) {
          const nameMatch = fromField.match(/^([^<]+)/);
          if (nameMatch) clientName = nameMatch[1].trim();
        } else if (clientEmail) {
          clientName = clientEmail.split('@')[0];
        }
        
        // Apply title cleanup for Encore emails
        const { cleanEncoreTitle } = await import('./booking-formatter');
        const cleanedSubject = cleanEncoreTitle(subjectField);

        await storage.createUnparseableMessage({
          userId: "43963086", // Default admin user for review
          source: 'email',
          fromContact: `${clientName} <${clientEmail}>`,
          rawMessage: bodyField || 'No message content',
          clientAddress: null,
          messageType: 'parsing_failed',
          parsingErrorDetails: `${reason}${errorDetails ? `: ${errorDetails}` : ''}`
        });
        
        console.log(`📋 [${requestId}] Saved to Review Messages - ${reason}`);
        
      } catch (storageError: any) {
        console.error(`❌ [${requestId}] CRITICAL: Failed to save to Review Messages:`, storageError);
        throw storageError;
      }
    };

    // Extract email fields
    const fromField = requestData.From || requestData.from || requestData.sender || '';
    const subjectField = requestData.Subject || requestData.subject || '';
    const bodyField = requestData['body-plain'] || requestData.text || requestData['stripped-text'] || '';
    const recipientField = requestData.To || requestData.recipient || '';

    console.log(`📧 [${requestId}] Email data:`, {
      from: fromField?.substring(0, 50),
      subject: subjectField?.substring(0, 100),
      bodyLength: bodyField?.length || 0,
      recipient: recipientField?.substring(0, 50)
    });

    // Basic validation
    if (!fromField && !subjectField && !bodyField) {
      throw new Error('Email appears to be empty - no from, subject, or body fields');
    }

    if (!bodyField || bodyField.trim().length === 0) {
      await saveToReviewMessages('No message content', 'Email body was empty or missing');
      return;
    }

    // Extract email prefix from recipient to find user
    const recipientMatch = recipientField.match(/([^@]+)@/);
    if (!recipientMatch) {
      await saveToReviewMessages('Invalid recipient format', `Recipient: ${recipientField}`);
      return;
    }

    const emailPrefix = recipientMatch[1];
    console.log(`📧 [${requestId}] Email prefix: ${emailPrefix}`);

    // Find user by email prefix
    const { storage } = await import('./storage');
    let user = await storage.getUserByEmailPrefix(emailPrefix);
    
    if (!user) {
      // Fall back to admin user if no matching email prefix found
      console.log(`📧 [${requestId}] No user found for prefix "${emailPrefix}", using admin user`);
      user = { id: "43963086", email: "admin@musobuddy.com" }; // Admin/primary user fallback
    } else {
      console.log(`📧 [${requestId}] Found user: ${user.id} (${user.email})`);
    }

    // Process the email using existing widget logic
    const { parseBookingMessage } = await import('../ai/booking-message-parser');
    const { cleanEncoreTitle } = await import('./booking-formatter');
    
    try {
      console.log(`📧 [${requestId}] RACE CONDITION DEBUG: Starting parseBookingMessage for user ${user.id}`);
      const parsedData = await parseBookingMessage(bodyField, fromField, null, user.id);
      console.log(`📧 [${requestId}] RACE CONDITION DEBUG: parseBookingMessage completed`, {
        hasEventDate: !!parsedData.eventDate,
        hasVenue: !!parsedData.venue,
        eventType: parsedData.eventType
      });
      
      // Apply title cleanup
      const cleanedSubject = cleanEncoreTitle(subjectField);
      
      // Create booking or save to review based on parsed data quality
      const isEncoreMessage = bodyField.toLowerCase().includes('encore') || 
                              fromField.toLowerCase().includes('encore') ||
                              subjectField.toLowerCase().includes('encore') ||
                              bodyField.includes('apply now');

      if (!parsedData.eventDate && !(isEncoreMessage && parsedData.venue && parsedData.eventType)) {
        await saveToReviewMessages('No valid event date found', 'Message requires manual review');
        return;
      }

      // Create booking with cleaned title
      const bookingData = {
        userId: user.id,
        title: cleanedSubject || `Email Booking - ${fromField.split('<')[0].trim() || 'Unknown'}`,
        clientName: fromField.split('<')[0].trim() || 'Unknown Client',
        clientEmail: fromField.match(/[\w.-]+@[\w.-]+\.\w+/)?.[0] || null,
        clientPhone: null,
        venue: parsedData.venue || null,
        venueAddress: parsedData.venueAddress || null,
        eventDate: parsedData.eventDate || null,
        eventTime: parsedData.eventTime || null,
        eventEndTime: parsedData.eventEndTime || null,
        fee: parsedData.fee || null,
        deposit: parsedData.deposit || null,
        status: 'new',
        notes: bodyField,
        gigType: parsedData.eventType || null,
        specialRequirements: parsedData.specialRequirements || null,
        // Extract Encore apply-now link
        applyNowLink: parsedData.applyNowLink || null
      };

      console.log(`📧 [${requestId}] RACE CONDITION DEBUG: Creating booking with data:`, {
        title: bookingData.title,
        clientEmail: bookingData.clientEmail,
        eventDate: bookingData.eventDate,
        userId: user.id
      });

      const newBooking = await storage.createBooking(bookingData);
      console.log(`✅ [${requestId}] RACE CONDITION DEBUG: Email booking created successfully: #${newBooking.id} for user ${user.id}`);

    } catch (parseError: any) {
      console.error(`❌ [${requestId}] RACE CONDITION DEBUG: Email processing failed:`, {
        error: parseError.message,
        stack: parseError.stack,
        fromField: fromField?.substring(0, 100),
        subjectField: subjectField?.substring(0, 100),
        bodyLength: bodyField?.length || 0
      });
      await saveToReviewMessages('Email parsing failed', parseError.message);
    }
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      pendingJobs: this.queue.filter(j => j.status === 'pending').length,
      processingJobs: this.queue.filter(j => j.status === 'processing').length,
      failedJobs: this.queue.filter(j => j.status === 'failed').length
    };
  }
}

// Export singleton instance
export const emailQueue = new EmailQueue();

// Export direct processing function for fallback use
export async function processEmailDirect(requestData: any, requestId: string): Promise<void> {
  const queue = new EmailQueue();
  await queue.processEmail(requestData, requestId);
}