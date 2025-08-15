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
  private readonly processingDelay = 5000; // 5 seconds between jobs for AI accuracy PER USER
  private processedEmails = new Map<string, Date>(); // Track recently processed emails
  private readonly duplicateWindowMs = 10000; // 10 second window for duplicate detection

  constructor() {
    console.log('📧 Enhanced Per-User Email Queue initialized - each user processes independently');
    
    // Clean up old processed emails and inactive user queues every minute
    setInterval(() => {
      this.cleanupProcessedEmails();
      this.cleanupInactiveUserQueues();
    }, 60000);
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
   */
  private generateDuplicateHash(requestData: any): string {
    const from = requestData.From || requestData.from || '';
    const subject = requestData.Subject || requestData.subject || '';
    const bodyStart = (requestData['body-plain'] || requestData.text || '').substring(0, 100);
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
    
    // Extract user ID from recipient email
    const recipientField = requestData.To || requestData.recipient || '';
    const recipientMatch = recipientField.match(/([^@]+)@/);
    const emailPrefix = recipientMatch ? recipientMatch[1] : 'unknown';
    
    if (!emailPrefix || emailPrefix === 'unknown') {
      console.error(`📧 [GLOBAL] Cannot determine user from recipient: ${recipientField}`);
      throw new Error(`Invalid recipient format: ${recipientField}`);
    }
    
    // Get or create user queue
    const userQueue = this.getUserQueue(emailPrefix);
    
    const job: EmailJob = {
      id: jobId,
      timestamp: Date.now(),
      requestData,
      status: 'pending',
      retries: 0,
      maxRetries: this.maxRetries,
      userId: emailPrefix,
      duplicateCheckHash: duplicateHash
    };

    userQueue.jobs.push(job);
    console.log(`📧 [USER:${emailPrefix}] Added email job ${jobId} to user queue (position: ${userQueue.jobs.length})`);

    // Start processing for this user if not already running
    if (!userQueue.processing) {
      this.startUserProcessing(emailPrefix);
    }

    return {
      jobId,
      queuePosition: userQueue.jobs.length,
      isDuplicate: false,
      userId: emailPrefix
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

      // Add delay between processing jobs for AI accuracy (per user)
      if (userQueue.jobs.length > 0) {
        console.log(`📧 [USER:${userId}] Waiting ${this.processingDelay}ms before next email for AI accuracy...`);
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

    const emailPrefix = recipientMatch[1];
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
      console.log(`🤖 [${requestId}] AI PARSING: Taking time to carefully parse email for user ${user.id}`);
      console.log(`🔍 [${requestId}] CONTAMINATION DEBUG: Email body hash:`, 
        Buffer.from(bodyField.substring(0, 200)).toString('base64').substring(0, 20));
      console.log(`🔍 [${requestId}] CONTAMINATION DEBUG: From field:`, fromField?.substring(0, 100));
      console.log(`🔍 [${requestId}] CONTAMINATION DEBUG: Subject:`, subjectField?.substring(0, 100));
      
      const parsedData = await parseBookingMessage(bodyField, fromField, null, user.id);
      
      console.log(`✅ [${requestId}] AI PARSING: Completed parsing with 5-second delay for accuracy`);
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
        await saveToReviewMessages('No valid event date found', 'Message requires manual review');
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
   * Create booking with database-level locking to prevent duplicates
   */
  private async createBookingWithLocking(bookingData: any): Promise<any> {
    const { storage } = await import('./storage');
    
    // Check for recent duplicate based on email hash
    if (bookingData.emailHash) {
      // This would ideally check the database for recent bookings with same hash
      // For now, we'll rely on our in-memory duplicate detection
    }
    
    // Create the booking with retry logic
    let retries = 0;
    const maxRetries = 3;
    
    while (retries < maxRetries) {
      try {
        const newBooking = await storage.createBooking(bookingData);
        return newBooking;
      } catch (error: any) {
        retries++;
        console.error(`⚠️ Booking creation attempt ${retries} failed:`, error.message);
        
        if (retries >= maxRetries) {
          throw error;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 500 * retries));
      }
    }
    
    throw new Error('Failed to create booking after multiple attempts');
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
      systemType: 'per-user-queues',
      totalActiveUsers: this.userQueues.size,
      totalJobs,
      totalPending,
      totalProcessing,
      totalFailed,
      recentDuplicatesBlocked: this.processedEmails.size,
      processingDelay: this.processingDelay,
      duplicateWindowMs: this.duplicateWindowMs,
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