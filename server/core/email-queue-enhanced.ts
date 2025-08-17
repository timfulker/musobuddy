/**
 * Enhanced Per-User Email Processing Queue System
 * Each user gets their own queue to prevent delays between users
 * Scales efficiently with multiple users and concurrent emails
 */

import { Mutex } from 'async-mutex';

interface EmailJob {
  id: string;
  timestamp: number;
  requestData: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retries: number;
  maxRetries: number;
  error?: string;
  userId: string;
  duplicateCheckHash?: string;
}

interface UserQueue {
  jobs: EmailJob[];
  processing: boolean;
  mutex: Mutex;
  lastProcessed: number;
}

class EnhancedEmailQueue {
  private userQueues = new Map<string, UserQueue>(); // Per-user queues
  private readonly maxRetries = 3;
  private processingDelay = 1000; // Dynamic delay based on system load (API can handle 300+ RPM)
  private processedEmails = new Map<string, Date>(); // Track recently processed emails
  private readonly duplicateWindowMs = 10000; // 10 second window for duplicate detection
  private apiCallCount = 0; // Track API calls per minute
  private lastMinuteReset = Date.now();
  
  constructor() {
    console.log('📧 Enhanced Per-User Email Queue initialized with dynamic AI rate limiting');
    
    // Clean up old processed emails and inactive user queues every minute
    setInterval(() => {
      this.cleanupProcessedEmails();
      this.cleanupInactiveUserQueues();
      this.resetApiCallCounter();
    }, 60000);
  }

  /**
   * Reset API call counter and adjust processing delay based on load
   */
  private resetApiCallCounter() {
    console.log(`📈 [API-STATS] Processed ${this.apiCallCount} API calls in the last minute`);
    
    // Adjust processing delay based on API usage
    if (this.apiCallCount > 200) {
      this.processingDelay = 2000; // Slow down if approaching limits
      console.log('📧 [QUEUE] High API usage detected, increasing delay to 2 seconds');
    } else if (this.apiCallCount > 100) {
      this.processingDelay = 1500; // Moderate slowdown
      console.log('📧 [QUEUE] Moderate API usage, delay set to 1.5 seconds');
    } else {
      this.processingDelay = 500; // Fast processing for low usage
      console.log('📧 [QUEUE] Low API usage, optimizing delay to 0.5 seconds');
    }
    
    this.apiCallCount = 0;
    this.lastMinuteReset = Date.now();
  }

  /**
   * Track API calls for dynamic rate limiting
   */
  private recordApiCall() {
    this.apiCallCount++;
  }

  /**
   * Get performance insights for the current system
   */
  private getPerformanceInsights() {
    const minutesElapsed = Math.ceil((Date.now() - this.lastMinuteReset) / 60000);
    const estimatedRpm = this.apiCallCount * minutesElapsed;
    
    let status = 'optimal';
    let recommendation = 'System running efficiently';
    
    if (this.apiCallCount > 200) {
      status = 'high-load';
      recommendation = 'Consider distributing load or requesting API limit increase';
    } else if (this.apiCallCount > 100) {
      status = 'moderate-load';
      recommendation = 'Monitor for potential rate limits';
    }
    
    return {
      currentRpm: estimatedRpm,
      targetLimit: '300 RPM (paid OpenAI)',
      utilizationPercent: Math.round((estimatedRpm / 300) * 100),
      status,
      recommendation,
      delayOptimization: this.processingDelay < 1000 ? 'Optimized for speed' : 'Conservative for stability'
    };
  }

  /**
   * Get or create user queue
   */
  private getUserQueue(userId: string): UserQueue {
    if (!this.userQueues.has(userId)) {
      this.userQueues.set(userId, {
        jobs: [],
        processing: false,
        mutex: new Mutex(),
        lastProcessed: 0
      });
      console.log(`📧 [USER:${userId}] Created new processing queue`);
    }
    return this.userQueues.get(userId)!;
  }

  /**
   * Clean up user queues that haven't been used recently
   */
  private cleanupInactiveUserQueues() {
    const now = Date.now();
    const inactiveThreshold = 30 * 60 * 1000; // 30 minutes
    
    for (const [userId, queue] of this.userQueues.entries()) {
      if (!queue.processing && queue.jobs.length === 0 && 
          (now - queue.lastProcessed) > inactiveThreshold) {
        this.userQueues.delete(userId);
        console.log(`📧 [USER:${userId}] Cleaned up inactive queue`);
      }
    }
  }

  /**
   * Generate a hash for duplicate detection
   * Enhanced for Weebly forms to use actual form content instead of generic sender
   */
  private generateDuplicateHash(requestData: any): string {
    const from = requestData.From || requestData.from || '';
    const subject = requestData.Subject || requestData.subject || '';
    const body = requestData['body-plain'] || requestData.text || '';
    
    // For Weebly forms, use form content for duplicate detection instead of sender
    if (from.toLowerCase().includes('weebly') || body.toLowerCase().includes('contact form')) {
      // Extract key form data for duplicate detection
      const nameMatch = body.match(/Name\s*([^\n]+)/i);
      const emailMatch = body.match(/Email\s*([^\n]+)/i);
      const phoneMatch = body.match(/Phone\s*([^\n]+)/i);
      const dateMatch = body.match(/Date and type of event\s*([^\n]+)/i);
      
      const formData = [
        nameMatch?.[1]?.trim() || '',
        emailMatch?.[1]?.trim() || '',
        phoneMatch?.[1]?.trim() || '',
        dateMatch?.[1]?.trim() || ''
      ].join('|');
      
      console.log(`📧 [DUPLICATE-CHECK] Weebly form hash based on form data: ${formData}`);
      return formData;
    }
    
    // Default duplicate detection for regular emails
    const bodyStart = body.substring(0, 100);
    return `${from}|${subject}|${bodyStart}`;
  }

  /**
   * Check if this email was recently processed
   */
  private isDuplicateEmail(hash: string): boolean {
    const processed = this.processedEmails.get(hash);
    if (!processed) return false;
    
    const age = Date.now() - processed.getTime();
    return age < this.duplicateWindowMs;
  }

  /**
   * Clean up old processed email records
   */
  private cleanupProcessedEmails() {
    const now = Date.now();
    for (const [hash, date] of this.processedEmails.entries()) {
      if (now - date.getTime() > this.duplicateWindowMs * 2) {
        this.processedEmails.delete(hash);
      }
    }
  }

  /**
   * Add email to per-user processing queue with duplicate detection
   */
  async addEmail(requestData: any): Promise<{ jobId: string; queuePosition: number; isDuplicate?: boolean; userId?: string }> {
    const jobId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const duplicateHash = this.generateDuplicateHash(requestData);
    
    // Check for duplicate
    if (this.isDuplicateEmail(duplicateHash)) {
      console.log(`📧 [GLOBAL] Duplicate email detected (hash: ${duplicateHash}), skipping`);
      return {
        jobId,
        queuePosition: -1,
        isDuplicate: true
      };
    }
    
    // Extract user ID from recipient email and look up actual database user ID
    const recipientField = requestData.To || requestData.recipient || '';
    const recipientMatch = recipientField.match(/([^@]+)@/);
    const emailPrefix = recipientMatch ? recipientMatch[1].toLowerCase() : 'unknown';
    
    if (!emailPrefix || emailPrefix === 'unknown') {
      console.error(`📧 [GLOBAL] Cannot determine user from recipient: ${recipientField}`);
      throw new Error(`Invalid recipient format: ${recipientField}`);
    }
    
    // CRITICAL FIX: Look up actual database user ID, not just email prefix
    const { storage } = await import('./storage');
    const user = await storage.getUserByEmailPrefix(emailPrefix);
    
    if (!user) {
      console.error(`📧 [GLOBAL] No user found for email prefix: ${emailPrefix}`);
      throw new Error(`No user found for email prefix: ${emailPrefix}`);
    }
    
    const actualUserId = user.id;
    console.log(`📧 [USER-LOOKUP] Email prefix "${emailPrefix}" → User ID "${actualUserId}"`);
    
    // Get or create user queue using actual user ID
    const userQueue = this.getUserQueue(actualUserId);
    
    const job: EmailJob = {
      id: jobId,
      timestamp: Date.now(),
      requestData,
      status: 'pending',
      retries: 0,
      maxRetries: this.maxRetries,
      userId: actualUserId, // FIXED: Use actual database user ID
      duplicateCheckHash: duplicateHash
    };

    userQueue.jobs.push(job);
    console.log(`📧 [USER:${actualUserId}] Added email job ${jobId} to user queue (position: ${userQueue.jobs.length})`);

    // Start processing for this user if not already running
    if (!userQueue.processing) {
      this.startUserProcessing(actualUserId);
    }

    return {
      jobId,
      queuePosition: userQueue.jobs.length,
      isDuplicate: false,
      userId: actualUserId
    };
  }

  /**
   * Start processing for a specific user queue
   */
  private async startUserProcessing(userId: string) {
    const userQueue = this.getUserQueue(userId);
    
    if (userQueue.processing) {
      console.log(`📧 [USER:${userId}] Already processing, skipping`);
      return;
    }

    userQueue.processing = true;
    console.log(`📧 [USER:${userId}] Starting email processing (${userQueue.jobs.length} jobs queued)`);

    while (userQueue.jobs.length > 0) {
      const job = userQueue.jobs.shift();
      if (!job) continue;

      // Acquire user-specific mutex lock before processing
      const release = await userQueue.mutex.acquire();
      
      try {
        console.log(`📧 [USER:${userId}] Processing job ${job.id} with user mutex lock...`);
        job.status = 'processing';

        // Process the email with database-level locking
        await this.processEmailWithLocking(job);
        
        // Mark as processed for duplicate detection
        if (job.duplicateCheckHash) {
          this.processedEmails.set(job.duplicateCheckHash, new Date());
        }
        
        job.status = 'completed';
        userQueue.lastProcessed = Date.now();
        console.log(`✅ [USER:${userId}] Job ${job.id} completed successfully`);

      } catch (error: any) {
        console.error(`❌ [USER:${userId}] Job ${job.id} failed:`, error.message);
        job.error = error.message;
        job.retries++;

        if (job.retries < job.maxRetries) {
          console.log(`📧 [USER:${userId}] Retrying job ${job.id} (attempt ${job.retries + 1}/${job.maxRetries})`);
          job.status = 'pending';
          userQueue.jobs.push(job); // Re-add to end of user queue
        } else {
          job.status = 'failed';
          console.error(`📧 [USER:${userId}] Job ${job.id} failed after ${job.maxRetries} attempts`);
        }
      } finally {
        // Always release the user mutex
        release();
      }

      // Add delay between processing jobs for AI rate limiting (per user)
      if (userQueue.jobs.length > 0) {
        console.log(`📧 [USER:${userId}] Waiting ${this.processingDelay}ms before next email (API rate limiting)...`);
        await new Promise(resolve => setTimeout(resolve, this.processingDelay));
      }
    }

    userQueue.processing = false;
    console.log(`📧 [USER:${userId}] Email processing completed`);
  }

  /**
   * Process individual email job with database-level locking
   */
  private async processEmailWithLocking(job: EmailJob): Promise<void> {
    const { requestData } = job;
    const requestId = job.id;

    console.log(`📧 [${requestId}] Processing email from queue with database locking`);

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
          userId: job.userId, // Save under the actual user who should see it
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
      recipient: recipientField?.substring(0, 50),
      duplicateHash: job.duplicateCheckHash
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

    const emailPrefix = recipientMatch[1].toLowerCase(); // Make case-insensitive
    console.log(`📧 [${requestId}] Email prefix: ${emailPrefix}`);

    // Find user by email prefix
    const { storage } = await import('./storage');
    const user = await storage.getUserByEmailPrefix(emailPrefix);
    
    if (!user) {
      await saveToReviewMessages('User not found', `No user found for email prefix: ${emailPrefix}`);
      return;
    }

    console.log(`📧 [${requestId}] Found user: ${user.id} (${user.email})`);

    // Process the email using existing widget logic
    const { parseBookingMessage } = await import('../ai/booking-message-parser');
    const { cleanEncoreTitle } = await import('./booking-formatter');
    
    try {
      console.log(`🤖 [${requestId}] AI PARSING: Processing email for user ${user.id}`);
      console.log(`🔍 [${requestId}] CONTAMINATION DEBUG: Email body hash:`, 
        Buffer.from(bodyField.substring(0, 200)).toString('base64').substring(0, 20));
      console.log(`🔍 [${requestId}] CONTAMINATION DEBUG: From field:`, fromField?.substring(0, 100));
      console.log(`🔍 [${requestId}] CONTAMINATION DEBUG: Subject:`, subjectField?.substring(0, 100));
      
      // Track this API call for dynamic rate limiting
      this.recordApiCall();
      
      // Pass subject for Encore area extraction
      const parsedData = await parseBookingMessage(bodyField, fromField, null, user.id, subjectField);
      
      console.log(`✅ [${requestId}] AI PARSING: Completed parsing (API call #${this.apiCallCount} this minute)`);
      console.log(`🔍 [${requestId}] CONTAMINATION DEBUG: Parsed data from AI:`, {
        venue: parsedData.venue,
        eventDate: parsedData.eventDate,
        eventType: parsedData.eventType,
        clientName: parsedData.clientName,
        confidence: parsedData.confidence
      });
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
        logParsingFailure('No valid event date found', 'Message requires manual review');
        return;
      }

      // Create booking with cleaned title - WITH DATABASE TRANSACTION
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
        applyNowLink: parsedData.applyNowLink || null,
        // Add duplicate prevention metadata
        emailHash: job.duplicateCheckHash,
        processedAt: new Date()
      };

      console.log(`📧 [${requestId}] RACE CONDITION DEBUG: Creating booking with data:`, {
        title: bookingData.title,
        clientEmail: bookingData.clientEmail,
        eventDate: bookingData.eventDate,
        userId: user.id,
        emailHash: bookingData.emailHash
      });

      // Use a transaction or database-level locking here
      const newBooking = await this.createBookingWithLocking(bookingData);
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
   * Create booking with database-level duplicate prevention using unique constraints
   */
  private async createBookingWithLocking(bookingData: any): Promise<any> {
    const { storage } = await import('./storage');
    
    console.log(`🔒 [BOOKING-LOCK] Creating booking with emailHash: ${bookingData.emailHash?.substring(0, 16)}...`);
    
    // Create the booking with proper error handling for duplicate constraints
    try {
      const newBooking = await storage.createBooking(bookingData);
      console.log(`✅ [BOOKING-LOCK] Successfully created booking #${newBooking.id}`);
      return newBooking;
    } catch (error: any) {
      // Check if this is a unique constraint violation (duplicate email hash)
      if (error.message.includes('unique constraint') || 
          error.message.includes('duplicate key') ||
          error.code === '23505') { // PostgreSQL unique violation code
        
        console.log(`📧 [DUPLICATE-PREVENT] Email hash ${bookingData.emailHash?.substring(0, 16)}... already processed, skipping duplicate`);
        
        // Find and return the existing booking instead
        try {
          const existingBookings = await storage.getBookingsByUser(bookingData.userId);
          const duplicateBooking = existingBookings.find(b => 
            b.emailHash === bookingData.emailHash || 
            (b.clientEmail === bookingData.clientEmail && 
             b.eventDate?.toISOString() === bookingData.eventDate?.toISOString())
          );
          
          if (duplicateBooking) {
            console.log(`🔄 [DUPLICATE-PREVENT] Found existing booking #${duplicateBooking.id}, returning it instead`);
            return duplicateBooking;
          }
        } catch (findError) {
          console.error(`⚠️ [DUPLICATE-PREVENT] Could not find duplicate booking:`, findError.message);
        }
        
        // If we can't find the duplicate, throw a descriptive error
        throw new Error('Duplicate email already processed - booking may have been created by concurrent request');
      }
      
      // For any other error, implement retry logic with exponential backoff
      console.error(`❌ [BOOKING-LOCK] Database error during booking creation:`, {
        message: error.message,
        code: error.code,
        emailHash: bookingData.emailHash?.substring(0, 16)
      });
      
      // Retry for transient database errors (connection issues, deadlocks, etc.)
      if (error.message.includes('connection') || error.message.includes('timeout') || error.code === '40001') {
        let retries = 0;
        const maxRetries = 3;
        
        while (retries < maxRetries) {
          retries++;
          console.log(`🔄 [BOOKING-RETRY] Attempt ${retries}/${maxRetries} after ${500 * retries}ms delay...`);
          
          await new Promise(resolve => setTimeout(resolve, 500 * retries));
          
          try {
            const retryBooking = await storage.createBooking(bookingData);
            console.log(`✅ [BOOKING-RETRY] Successfully created booking #${retryBooking.id} on retry ${retries}`);
            return retryBooking;
          } catch (retryError: any) {
            if (retries >= maxRetries) {
              throw retryError;
            }
          }
        }
      }
      
      // Re-throw the original error if not a duplicate or retryable error
      throw error;
    }
  }

  /**
   * Get per-user queue status with enhanced information
   */
  getStatus() {
    const userQueueStatus = new Map<string, any>();
    let totalJobs = 0;
    let totalProcessing = 0;
    let totalPending = 0;
    let totalFailed = 0;
    
    // Aggregate status from all user queues
    this.userQueues.forEach((queue, userId) => {
      const pending = queue.jobs.filter(j => j.status === 'pending').length;
      const processing = queue.jobs.filter(j => j.status === 'processing').length;
      const failed = queue.jobs.filter(j => j.status === 'failed').length;
      
      userQueueStatus.set(userId, {
        totalJobs: queue.jobs.length,
        pendingJobs: pending,
        processingJobs: processing,
        failedJobs: failed,
        isProcessing: queue.processing,
        mutexLocked: queue.mutex.isLocked(),
        lastProcessed: queue.lastProcessed ? new Date(queue.lastProcessed).toISOString() : null
      });
      
      totalJobs += queue.jobs.length;
      totalPending += pending;
      totalProcessing += processing;
      totalFailed += failed;
    });
    
    return {
      systemType: 'per-user-queues-with-dynamic-ai-limiting',
      totalActiveUsers: this.userQueues.size,
      totalJobs,
      totalPending,
      totalProcessing,
      totalFailed,
      recentDuplicatesBlocked: this.processedEmails.size,
      currentProcessingDelay: this.processingDelay,
      apiCallsThisMinute: this.apiCallCount,
      duplicateWindowMs: this.duplicateWindowMs,
      performanceInsights: this.getPerformanceInsights(),
      userQueues: Object.fromEntries(userQueueStatus)
    };
  }

  /**
   * Clear all queues (for testing/emergency use)
   */
  clearQueue() {
    this.userQueues.clear();
    this.processedEmails.clear();
    console.log('📧 [GLOBAL] All user queues cleared');
  }

  /**
   * Get status for specific user
   */
  getUserStatus(userId: string) {
    const queue = this.userQueues.get(userId);
    if (!queue) {
      return { exists: false, message: `No queue found for user ${userId}` };
    }
    
    return {
      exists: true,
      userId,
      totalJobs: queue.jobs.length,
      pendingJobs: queue.jobs.filter(j => j.status === 'pending').length,
      processingJobs: queue.jobs.filter(j => j.status === 'processing').length,
      failedJobs: queue.jobs.filter(j => j.status === 'failed').length,
      isProcessing: queue.processing,
      mutexLocked: queue.mutex.isLocked(),
      lastProcessed: queue.lastProcessed ? new Date(queue.lastProcessed).toISOString() : null
    };
  }
}

// Export singleton instance
export const enhancedEmailQueue = new EnhancedEmailQueue();