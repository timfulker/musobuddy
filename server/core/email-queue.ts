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
    const saveToReviewMessages = async (reason: string, errorDetails?: string, targetUserId?: string) => {
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
          userId: targetUserId || "43963086", // Use target user ID or fallback to admin
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

    // Extract email fields - handle all Mailgun field variations
    const fromField = requestData.from || requestData.From || requestData.sender || '';
    const subjectField = requestData.subject || requestData.Subject || '';
    const bodyField = requestData['body-plain'] || requestData['stripped-text'] || requestData.text || requestData['body-html'] || '';
    const recipientField = requestData.recipient || requestData.To || requestData.to || '';
    
    // Log original data if available for debugging
    if (requestData.originalBody) {
      console.log(`📧 [${requestId}] Original Mailgun data keys:`, Object.keys(requestData.originalBody));
    }

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
    // Handle multiple domain formats: @musobuddy.replit.app, @enquiries.musobuddy.com, etc.
    const recipientMatch = recipientField.match(/([^@]+)@/);
    if (!recipientMatch) {
      console.log(`📧 [${requestId}] WARNING: Could not extract prefix from recipient: ${recipientField}`);
      // If no recipient field, default to primary user
      const { storage } = await import('./storage');
      const users = await storage.getAllUsers();
      const user = users.find(u => u.email === 'timfulkermusic@gmail.com') || { id: "43963086", email: "timfulkermusic@gmail.com" };
      console.log(`📧 [${requestId}] Using default user: ${user.email}`);
      // Continue processing with default user
      const parsedData = await parseBookingMessage(bodyField, fromField, null, user.id);
      // ... rest of processing continues below
    }

    const emailPrefix = recipientMatch[1].toLowerCase();
    console.log(`📧 [${requestId}] Email prefix extracted: ${emailPrefix}`);
    console.log(`📧 [${requestId}] Full recipient: ${recipientField}`);

    // Find user by email prefix
    const { storage } = await import('./storage');
    
    // Define email prefix to user email mapping
    const prefixMapping: { [key: string]: string } = {
      'timfulkermusic': 'timfulkermusic@gmail.com',
      'saxweddings': 'timfulker@gmail.com',
      // Add more mappings as needed
    };
    
    let user = null;
    
    // Try exact prefix match first (most reliable)
    user = await storage.getUserByEmailPrefix(emailPrefix);
    if (user) {
      console.log(`📧 [${requestId}] Found user by email prefix: ${user.id} (${user.email})`);
    }
    
    // If no direct match, try mapped email lookup
    if (!user && prefixMapping[emailPrefix]) {
      const targetEmail = prefixMapping[emailPrefix];
      console.log(`📧 [${requestId}] Mapped prefix "${emailPrefix}" to email: ${targetEmail}`);
      const users = await storage.getAllUsers();
      user = users.find(u => u.email === targetEmail);
      if (user) {
        console.log(`📧 [${requestId}] Found user by mapped email: ${user.id} (${user.email})`);
      }
    }
    
    // Fall back to primary user if no match found
    if (!user) {
      console.log(`📧 [${requestId}] No user found for prefix "${emailPrefix}", using primary user`);
      const users = await storage.getAllUsers();
      user = users.find(u => u.email === 'timfulkermusic@gmail.com');
      if (!user) {
        console.log(`📧 [${requestId}] CRITICAL: Could not find primary user, using fallback`);
        user = { id: "43963086", email: "timfulkermusic@gmail.com" };
      }
    }
    
    console.log(`📧 [${requestId}] Final user selection: ${user.id} (${user.email})`)

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

      // Very lenient validation - create booking if we have ANY substantive booking information
      const hasDate = !!parsedData.eventDate;
      const hasVenue = !!parsedData.venue;
      const hasEventType = !!parsedData.eventType;
      const hasFee = !!parsedData.fee;
      const hasSubstantialContent = bodyField.length > 50; // More than just a greeting
      
      // Create booking if we have:
      // 1. Date + any other info, OR
      // 2. Venue + event type, OR  
      // 3. Venue + fee, OR
      // 4. Event type + fee + substantial content, OR
      // 5. Encore email with venue
      const hasMinimumInfo = hasDate || 
                            (hasVenue && hasEventType) ||
                            (hasVenue && hasFee) ||
                            (hasEventType && hasFee && hasSubstantialContent) ||
                            (isEncoreMessage && hasVenue);
      
      console.log(`📧 [${requestId}] Validation check:`, {
        hasDate, hasVenue, hasEventType, hasFee, hasSubstantialContent, isEncoreMessage,
        hasMinimumInfo, confidence: parsedData.confidence
      });
      
      if (!hasMinimumInfo) {
        await saveToReviewMessages('Insufficient booking information', 'Message requires manual review - no clear booking details found', user.id);
        return;
      }

      // Special handling for Weebly form submissions
      const isWeeblyForm = fromField.toLowerCase().includes('weebly.com') || 
                          fromField.toLowerCase().includes('no-reply@weebly');
      
      // Determine client information based on source
      let finalClientName = parsedData.clientName || null;
      let finalClientEmail = parsedData.clientEmail || null;
      
      if (isWeeblyForm) {
        // For Weebly forms, prioritize the extracted email from form content
        console.log(`📧 [${requestId}] Detected Weebly form submission - extracting client email from form content`);
        
        // Extract email from the form content using a more precise pattern
        const emailPattern = /Email\s*[\n:]\s*([^\s@]+@[^\s@]+\.[^\s@]+)/i;
        const emailMatch = bodyField.match(emailPattern);
        if (emailMatch) {
          finalClientEmail = emailMatch[1].toLowerCase();
          console.log(`📧 [${requestId}] Extracted client email from Weebly form: ${finalClientEmail}`);
        }
        
        // Extract name from the form content
        const namePattern = /Name\s*[\n:]\s*([^\n]+)/i;
        const nameMatch = bodyField.match(namePattern);
        if (nameMatch) {
          finalClientName = nameMatch[1].trim();
          console.log(`📧 [${requestId}] Extracted client name from Weebly form: ${finalClientName}`);
        }
        
        // If no email found in specific field, use parsed data
        if (!finalClientEmail && parsedData.clientEmail) {
          finalClientEmail = parsedData.clientEmail;
        }
        if (!finalClientName && parsedData.clientName) {
          finalClientName = parsedData.clientName;
        }
      } else {
        // For regular emails, use sender information if parsed data is not available
        if (!finalClientName) {
          finalClientName = fromField.split('<')[0].trim() || 'Unknown Client';
        }
        if (!finalClientEmail) {
          finalClientEmail = fromField.match(/[\w.-]+@[\w.-]+\.\w+/)?.[0] || null;
        }
      }
      
      // Create booking with cleaned title
      const bookingData = {
        userId: user.id,
        title: cleanedSubject || `Email Booking - ${finalClientName || 'Unknown'}`,
        clientName: finalClientName || 'Unknown Client',
        clientEmail: finalClientEmail,
        clientPhone: parsedData.clientPhone || null,
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
      await saveToReviewMessages('Email parsing failed', parseError.message, user?.id);
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