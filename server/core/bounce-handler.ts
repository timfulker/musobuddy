/**
 * Email Bounce Handler
 * Automatically processes bounce notifications from SendGrid and Mailgun
 * Removes hard bounces and tracks soft bounces
 */

interface BounceRecord {
  email: string;
  bounceType: 'hard' | 'soft' | 'complaint' | 'deferred';
  timestamp: Date;
  reason?: string;
  provider: 'sendgrid' | 'mailgun';
}

interface SuppressedEmail {
  email: string;
  reason: 'hard_bounce' | 'soft_bounce_limit' | 'spam_complaint';
  firstBounceDate: Date;
  bounceCount: number;
  provider: string;
}

interface DeferredTracking {
  firstDeferredAt: Date;
  lastDeferredAt: Date;
  deferCount: number;
  provider: string;
  lastReason?: string;
}

class BounceHandler {
  private softBounces = new Map<string, number>(); // email -> bounce count
  private softBounceThreshold = 3; // Remove after 3 soft bounces
  private deferredEmails = new Map<string, DeferredTracking>(); // email -> deferred info
  private deferredNotificationThreshold = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  /**
   * Process a bounce notification from email provider
   */
  async processBounce(bounceData: BounceRecord): Promise<void> {
    console.log(`📧 [BOUNCE] Processing ${bounceData.bounceType} bounce for: ${bounceData.email}`);

    const { email, bounceType, reason, provider } = bounceData;

    switch (bounceType) {
      case 'hard':
        await this.handleHardBounce(email, reason, provider);
        break;

      case 'soft':
        await this.handleSoftBounce(email, reason, provider);
        break;

      case 'complaint':
        await this.handleSpamComplaint(email, reason, provider);
        break;

      case 'deferred':
        await this.handleDeferred(email, reason, provider);
        break;
    }
  }

  /**
   * Handle hard bounces (permanent failures)
   * These should be immediately suppressed
   */
  private async handleHardBounce(email: string, reason?: string, provider?: string): Promise<void> {
    console.log(`❌ [HARD-BOUNCE] Suppressing email: ${email} (${reason || 'no reason provided'})`);

    try {
      const { storage } = await import('./storage');

      // Add to suppression list
      await storage.addSuppressedEmail({
        email,
        reason: 'hard_bounce',
        firstBounceDate: new Date(),
        bounceCount: 1,
        provider: provider || 'unknown',
        notes: reason
      });

      // Update any bookings with this email to flag the issue
      await this.flagBookingsWithBadEmail(email, 'Hard bounce - email invalid');

      // Create email delivery failure records for all affected users
      await this.createEmailFailureNotifications(email, 'hard_bounce', reason, provider);

      console.log(`✅ [HARD-BOUNCE] Email ${email} added to suppression list`);

    } catch (error: any) {
      console.error(`❌ [HARD-BOUNCE] Failed to suppress email ${email}:`, error.message);
    }
  }

  /**
   * Handle soft bounces (temporary failures)
   * Suppress after threshold is reached
   */
  private async handleSoftBounce(email: string, reason?: string, provider?: string): Promise<void> {
    const currentCount = this.softBounces.get(email) || 0;
    const newCount = currentCount + 1;

    this.softBounces.set(email, newCount);

    console.log(`⚠️ [SOFT-BOUNCE] Email ${email} bounce count: ${newCount}/${this.softBounceThreshold}`);

    if (newCount >= this.softBounceThreshold) {
      console.log(`❌ [SOFT-BOUNCE] Threshold reached for ${email}, suppressing`);

      try {
        const { storage } = await import('./storage');

        await storage.addSuppressedEmail({
          email,
          reason: 'soft_bounce_limit',
          firstBounceDate: new Date(),
          bounceCount: newCount,
          provider: provider || 'unknown',
          notes: `${newCount} soft bounces. Last reason: ${reason || 'unknown'}`
        });

        await this.flagBookingsWithBadEmail(email, `${newCount} soft bounces - email unreachable`);

        // Create email delivery failure records for all affected users
        await this.createEmailFailureNotifications(email, 'soft_bounce', reason, provider);

        // Remove from tracking map
        this.softBounces.delete(email);

        console.log(`✅ [SOFT-BOUNCE] Email ${email} suppressed after ${newCount} bounces`);

      } catch (error: any) {
        console.error(`❌ [SOFT-BOUNCE] Failed to suppress email ${email}:`, error.message);
      }
    }
  }

  /**
   * Handle spam complaints
   * Immediately suppress and flag
   */
  private async handleSpamComplaint(email: string, reason?: string, provider?: string): Promise<void> {
    console.log(`🚨 [SPAM-COMPLAINT] Suppressing email: ${email}`);

    try {
      const { storage } = await import('./storage');

      await storage.addSuppressedEmail({
        email,
        reason: 'spam_complaint',
        firstBounceDate: new Date(),
        bounceCount: 1,
        provider: provider || 'unknown',
        notes: `Spam complaint: ${reason || 'User marked as spam'}`
      });

      await this.flagBookingsWithBadEmail(email, 'Spam complaint - user reported as spam');

      // Create email delivery failure records for all affected users
      await this.createEmailFailureNotifications(email, 'spam_complaint', reason, provider);

      console.log(`✅ [SPAM-COMPLAINT] Email ${email} suppressed due to complaint`);

    } catch (error: any) {
      console.error(`❌ [SPAM-COMPLAINT] Failed to suppress email ${email}:`, error.message);
    }
  }

  /**
   * Handle deferred emails (temporary delays)
   * Track but don't notify until 24 hours have passed
   */
  private async handleDeferred(email: string, reason?: string, provider?: string): Promise<void> {
    const existing = this.deferredEmails.get(email);

    if (existing) {
      // Update existing deferred tracking
      existing.lastDeferredAt = new Date();
      existing.deferCount += 1;
      existing.lastReason = reason || existing.lastReason;
      this.deferredEmails.set(email, existing);

      console.log(`⏰ [DEFERRED] Email ${email} deferred count: ${existing.deferCount} (first: ${existing.firstDeferredAt.toISOString()})`);
    } else {
      // First deferral for this email
      this.deferredEmails.set(email, {
        firstDeferredAt: new Date(),
        lastDeferredAt: new Date(),
        deferCount: 1,
        provider: provider || 'unknown',
        lastReason: reason
      });

      console.log(`⏰ [DEFERRED] First deferral for ${email} - will notify if still deferred after 24 hours`);
    }
  }

  /**
   * Check for emails that have been deferred for 24+ hours and create notifications
   * This should be called periodically (e.g., every hour) by a scheduled job
   */
  async checkStuckDeferrals(): Promise<void> {
    console.log(`🔍 [DEFERRED-CHECK] Checking ${this.deferredEmails.size} deferred emails for 24-hour threshold`);

    const now = new Date();
    const emailsToNotify: string[] = [];

    for (const [email, tracking] of this.deferredEmails.entries()) {
      const timeSinceFirstDefer = now.getTime() - tracking.firstDeferredAt.getTime();

      if (timeSinceFirstDefer >= this.deferredNotificationThreshold) {
        console.log(`⚠️ [DEFERRED-STUCK] Email ${email} has been deferred for ${Math.round(timeSinceFirstDefer / (60 * 60 * 1000))} hours - creating notification`);

        try {
          // Create email delivery failure notifications for affected users
          await this.createEmailFailureNotifications(
            email,
            'deferred',
            tracking.lastReason || 'Email delivery delayed for 24+ hours',
            tracking.provider
          );

          emailsToNotify.push(email);
          console.log(`✅ [DEFERRED-STUCK] Notification created for ${email}`);
        } catch (error: any) {
          console.error(`❌ [DEFERRED-STUCK] Failed to create notification for ${email}:`, error.message);
        }
      }
    }

    // Remove notified emails from tracking
    for (const email of emailsToNotify) {
      this.deferredEmails.delete(email);
    }

    if (emailsToNotify.length > 0) {
      console.log(`📧 [DEFERRED-CHECK] Created notifications for ${emailsToNotify.length} stuck deferrals`);
    } else {
      console.log(`✅ [DEFERRED-CHECK] No stuck deferrals found`);
    }
  }

  /**
   * Remove an email from deferred tracking (e.g., when it successfully delivers or becomes a hard bounce)
   */
  clearDeferredTracking(email: string): void {
    if (this.deferredEmails.has(email)) {
      this.deferredEmails.delete(email);
      console.log(`🗑️ [DEFERRED] Cleared deferred tracking for ${email}`);
    }
  }

  /**
   * Create email delivery failure notifications for all affected users
   */
  private async createEmailFailureNotifications(
    email: string,
    failureType: 'hard_bounce' | 'soft_bounce' | 'spam_complaint' | 'deferred',
    reason?: string,
    provider?: string
  ): Promise<void> {
    try {
      const { storage } = await import('./storage');

      // Get all users to search their bookings
      const users = await storage.getAllUsers();

      for (const user of users) {
        const bookings = await storage.getBookings(user.id);
        const affectedBookings = bookings.filter(b =>
          b.clientEmail?.toLowerCase() === email.toLowerCase()
        );

        // Create a failure notification for each affected booking
        for (const booking of affectedBookings) {
          // Determine email type based on booking status
          let emailType = 'other';
          if (booking.contractSent) emailType = 'contract';
          else if (booking.invoiceSent) emailType = 'invoice';
          else emailType = 'response';

          // Determine priority based on failure type
          let priority = 'medium';
          if (failureType === 'hard_bounce' || failureType === 'spam_complaint') {
            priority = 'high';
          }

          // Create email delivery failure record
          const failure = await storage.createEmailDeliveryFailure({
            userId: user.id,
            bookingId: booking.id,
            recipientEmail: email,
            recipientName: booking.clientName || undefined,
            emailType: emailType,
            subject: `Email to ${booking.clientName || email}`,
            failureType: failureType,
            failureReason: reason,
            provider: provider,
            priority: priority
          });

          console.log(`📧 [EMAIL-FAILURE] Created failure notification #${failure.id} for user ${user.id}, booking #${booking.id}`);
        }
      }

    } catch (error: any) {
      console.error(`❌ [EMAIL-FAILURE] Failed to create failure notifications:`, error.message);
    }
  }

  /**
   * Flag all bookings associated with a bounced email
   */
  private async flagBookingsWithBadEmail(email: string, issue: string): Promise<void> {
    try {
      const { storage } = await import('./storage');

      // Get all users to search their bookings
      const users = await storage.getAllUsers();

      for (const user of users) {
        const bookings = await storage.getBookings(user.id);
        const affectedBookings = bookings.filter(b =>
          b.clientEmail?.toLowerCase() === email.toLowerCase()
        );

        for (const booking of affectedBookings) {
          // Add a note to the booking
          const currentNotes = booking.notes || '';
          const bounceNote = `\n\n⚠️ EMAIL ISSUE (${new Date().toISOString()}): ${issue}`;

          await storage.updateBooking(booking.id, {
            notes: currentNotes + bounceNote,
            // Optionally, you could add a custom field like 'emailBounced: true'
          });

          console.log(`📝 [BOOKING-FLAG] Booking #${booking.id} flagged with email issue`);
        }
      }

    } catch (error: any) {
      console.error(`❌ [BOOKING-FLAG] Failed to flag bookings:`, error.message);
    }
  }

  /**
   * Check if an email is suppressed before sending
   */
  async isEmailSuppressed(email: string): Promise<{ suppressed: boolean; reason?: string }> {
    try {
      const { storage } = await import('./storage');
      const suppressed = await storage.getSuppressedEmail(email.toLowerCase());

      if (suppressed) {
        return {
          suppressed: true,
          reason: suppressed.reason
        };
      }

      return { suppressed: false };

    } catch (error: any) {
      console.error(`❌ [SUPPRESSION-CHECK] Failed to check email ${email}:`, error.message);
      // On error, allow the email (fail open)
      return { suppressed: false };
    }
  }

  /**
   * Get statistics about bounces and deferrals
   */
  getStats() {
    return {
      softBouncesTracking: this.softBounces.size,
      softBounceThreshold: this.softBounceThreshold,
      deferredEmailsTracking: this.deferredEmails.size,
      softBounces: Array.from(this.softBounces.entries()).map(([email, count]) => ({
        email: email.substring(0, 3) + '***@' + email.split('@')[1], // Obfuscate for privacy
        bounceCount: count
      })),
      deferredEmails: Array.from(this.deferredEmails.entries()).map(([email, tracking]) => ({
        email: email.substring(0, 3) + '***@' + email.split('@')[1], // Obfuscate for privacy
        deferCount: tracking.deferCount,
        hoursSinceFirst: Math.round((new Date().getTime() - tracking.firstDeferredAt.getTime()) / (60 * 60 * 1000))
      }))
    };
  }

  /**
   * Clean up old soft bounce tracking (run periodically)
   */
  cleanupSoftBounces() {
    const deleted = this.softBounces.size;
    this.softBounces.clear();
    console.log(`🧹 [BOUNCE-CLEANUP] Cleared ${deleted} soft bounce records`);
  }
}

/**
 * Parse SendGrid bounce webhook
 */
export function parseSendGridBounce(webhookData: any): BounceRecord | null {
  try {
    const event = webhookData.event;
    const email = webhookData.email;
    const reason = webhookData.reason || webhookData.status;

    let bounceType: 'hard' | 'soft' | 'complaint' | 'deferred' = 'soft';

    if (event === 'bounce') {
      bounceType = webhookData.type === 'hard' ? 'hard' : 'soft';
    } else if (event === 'dropped') {
      bounceType = 'hard';
    } else if (event === 'spamreport') {
      bounceType = 'complaint';
    } else if (event === 'deferred') {
      bounceType = 'deferred';
    } else {
      return null; // Not a bounce/deferred event
    }

    return {
      email,
      bounceType,
      timestamp: new Date(webhookData.timestamp * 1000),
      reason,
      provider: 'sendgrid'
    };

  } catch (error: any) {
    console.error('❌ [SENDGRID-PARSE] Failed to parse bounce:', error.message);
    return null;
  }
}

/**
 * Parse Mailgun bounce webhook
 */
export function parseMailgunBounce(webhookData: any): BounceRecord | null {
  try {
    const eventType = webhookData['event-data']?.event;
    const email = webhookData['event-data']?.recipient;
    const reason = webhookData['event-data']?.['delivery-status']?.message ||
                   webhookData['event-data']?.reason;

    let bounceType: 'hard' | 'soft' | 'complaint' | 'deferred' = 'soft';

    if (eventType === 'failed') {
      const severity = webhookData['event-data']?.severity;
      bounceType = severity === 'permanent' ? 'hard' : 'soft';
    } else if (eventType === 'complained') {
      bounceType = 'complaint';
    } else if (eventType === 'deferred') {
      bounceType = 'deferred';
    } else {
      return null; // Not a bounce/deferred event
    }

    return {
      email,
      bounceType,
      timestamp: new Date(webhookData['event-data']?.timestamp * 1000),
      reason,
      provider: 'mailgun'
    };

  } catch (error: any) {
    console.error('❌ [MAILGUN-PARSE] Failed to parse bounce:', error.message);
    return null;
  }
}

// Export singleton instance
export const bounceHandler = new BounceHandler();
