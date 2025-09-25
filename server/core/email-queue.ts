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
          userId: targetUserId || "1754488522516", // Use target user ID or fallback to correct user
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

    const rawEmailPrefix = recipientMatch[1];
    // Clean email prefix - remove quotes and make lowercase
    const emailPrefix = rawEmailPrefix.replace(/^["']|["']$/g, '').toLowerCase();
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
        user = { id: "1754488522516", email: "timfulkermusic@gmail.com" };
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
      
      // SIMPLE EMAIL ROUTING RULES:
      // 1. Emails with dates → Create booking
      // 2. Emails without dates → Send to review  
      // 3. Encore emails → Create booking
      // 4. Weebly-forwarded emails → Create booking
      
      const hasDate = !!parsedData.eventDate;
      const isEncoreMessage = bodyField.toLowerCase().includes('encore') || 
                              fromField.toLowerCase().includes('encore') ||
                              subjectField.toLowerCase().includes('encore') ||
                              bodyField.includes('apply now');
      const isWeeblyForwarded = fromField.toLowerCase().includes('weebly') ||
                               fromField.toLowerCase().includes('no-reply') ||
                               bodyField.toLowerCase().includes('weebly');
      
      console.log(`📧 [${requestId}] Email routing check:`, {
        hasDate, isEncoreMessage, isWeeblyForwarded
      });
      
      // Send to review if NO date AND NOT Encore AND NOT Weebly
      if (!hasDate && !isEncoreMessage && !isWeeblyForwarded) {
        await saveToReviewMessages('No date found in email', 'Email does not contain a date and is not from Encore or Weebly', user.id);
        return;
      }
      
      // Otherwise, create booking

      // List of known form builder/website host domains that forward contact forms
      // These services typically send from no-reply addresses, with actual client info in the form content
      const formBuilderDomains = [
        'weebly.com',
        'wix.com',
        'squarespace.com',
        'wordpress.com',
        'wpengine.com',
        'godaddy.com',
        'typeform.com',
        'jotform.com',
        'formspree.io',
        'formstack.com',
        'hubspot.com',
        'mailchimp.com',
        'constantcontact.com',
        'google.com', // Google Forms
        'microsoft.com', // Microsoft Forms
        '123formbuilder.com',
        'cognito.com',
        'zoho.com'
      ];
      
      // Check if this is a form builder submission
      const fromLower = fromField.toLowerCase();
      const isFormBuilderSubmission = 
        fromLower.includes('no-reply') || 
        fromLower.includes('noreply') ||
        fromLower.includes('do-not-reply') ||
        formBuilderDomains.some(domain => fromLower.includes(domain));
      
      // Determine client information based on source
      let finalClientName = parsedData.clientName || null;
      let finalClientEmail = parsedData.clientEmail || null;
      
      if (isFormBuilderSubmission) {
        // For form builder submissions, extract client info from form content
        console.log(`📧 [${requestId}] Detected form builder submission from: ${fromField}`);
        console.log(`📧 [${requestId}] Extracting actual client details from form content...`);
        
        // Try multiple patterns for email extraction (different form formats)
        const emailPatterns = [
          /Email\s*[:=]\s*([^\s@]+@[^\s@]+\.[^\s@]+)/i,
          /Email\s*\n\s*([^\s@]+@[^\s@]+\.[^\s@]+)/i,
          /E-mail\s*[:=]\s*([^\s@]+@[^\s@]+\.[^\s@]+)/i,
          /Your Email\s*[:=]\s*([^\s@]+@[^\s@]+\.[^\s@]+)/i,
          /Contact Email\s*[:=]\s*([^\s@]+@[^\s@]+\.[^\s@]+)/i,
          /Reply To\s*[:=]\s*([^\s@]+@[^\s@]+\.[^\s@]+)/i
        ];
        
        for (const pattern of emailPatterns) {
          const match = bodyField.match(pattern);
          if (match) {
            finalClientEmail = match[1].toLowerCase();
            console.log(`📧 [${requestId}] Extracted client email from form: ${finalClientEmail}`);
            break;
          }
        }
        
        // Try multiple patterns for name extraction
        const namePatterns = [
          /Name\s*[:=]\s*([^\n]+)/i,
          /Name\s*\n\s*([^\n]+)/i,
          /Full Name\s*[:=]\s*([^\n]+)/i,
          /Your Name\s*[:=]\s*([^\n]+)/i,
          /Contact Name\s*[:=]\s*([^\n]+)/i,
          /First Name\s*[:=]\s*([^\n]+)/i // Will get first name only
        ];
        
        for (const pattern of namePatterns) {
          const match = bodyField.match(pattern);
          if (match) {
            finalClientName = match[1].trim();
            console.log(`📧 [${requestId}] Extracted client name from form: ${finalClientName}`);
            break;
          }
        }
        
        // If no specific fields found, fall back to AI parsed data
        if (!finalClientEmail && parsedData.clientEmail) {
          finalClientEmail = parsedData.clientEmail;
          console.log(`📧 [${requestId}] Using AI-extracted email: ${finalClientEmail}`);
        }
        if (!finalClientName && parsedData.clientName) {
          finalClientName = parsedData.clientName;
          console.log(`📧 [${requestId}] Using AI-extracted name: ${finalClientName}`);
        }
        
        // Log warning if we couldn't extract client info from a form submission
        if (!finalClientEmail) {
          console.warn(`⚠️ [${requestId}] Form builder submission detected but could not extract client email!`);
          console.warn(`⚠️ [${requestId}] Consider adding extraction pattern for this form format`);
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