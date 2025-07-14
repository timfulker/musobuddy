import { storage } from './storage';
import { sendEmail } from './mailgun-email';

export class ContractReminderService {
  /**
   * Check for contracts that need reminders and send them
   */
  async processContractReminders() {
    try {
      console.log('📧 Starting contract reminder processing...');
      
      // Get all contracts that need reminders
      const contractsNeedingReminders = await this.getContractsNeedingReminders();
      
      if (contractsNeedingReminders.length === 0) {
        console.log('📧 No contracts need reminders at this time');
        return { processed: 0, sent: 0, failed: 0 };
      }

      console.log(`📧 Found ${contractsNeedingReminders.length} contracts needing reminders`);

      let sent = 0;
      let failed = 0;

      for (const contract of contractsNeedingReminders) {
        try {
          await this.sendContractReminder(contract);
          sent++;
          console.log(`📧 Sent reminder for contract #${contract.contractNumber}`);
        } catch (error) {
          failed++;
          console.error(`📧 Failed to send reminder for contract #${contract.contractNumber}:`, error);
        }
      }

      console.log(`📧 Reminder processing complete: ${sent} sent, ${failed} failed`);
      return { processed: contractsNeedingReminders.length, sent, failed };
    } catch (error) {
      console.error('📧 Error in contract reminder processing:', error);
      throw error;
    }
  }

  /**
   * Get contracts that need reminders sent
   */
  private async getContractsNeedingReminders() {
    try {
      // Get all contracts with reminders enabled and status 'sent'
      const allContracts = await storage.getAllContracts();
      const now = new Date();
      
      return allContracts.filter(contract => {
        // Only send reminders for contracts that are sent but not signed
        if (contract.status !== 'sent' || contract.signedAt) {
          return false;
        }

        // Only contracts with reminders enabled
        if (!contract.reminderEnabled) {
          return false;
        }

        // Must have client email
        if (!contract.clientEmail) {
          return false;
        }

        // Check if it's time for a reminder
        const lastReminder = contract.lastReminderSent ? new Date(contract.lastReminderSent) : null;
        const daysSinceLastReminder = lastReminder 
          ? Math.floor((now.getTime() - lastReminder.getTime()) / (1000 * 60 * 60 * 24))
          : Math.floor((now.getTime() - new Date(contract.createdAt).getTime()) / (1000 * 60 * 60 * 24));

        // Check if enough days have passed since last reminder
        return daysSinceLastReminder >= (contract.reminderDays || 7);
      });
    } catch (error) {
      console.error('Error getting contracts needing reminders:', error);
      return [];
    }
  }

  /**
   * Send a reminder email for a contract
   */
  private async sendContractReminder(contract: any) {
    try {
      // Get user settings for business details
      const userSettings = await storage.getUserSettings(contract.userId);
      const businessName = userSettings?.businessName || 'MusoBuddy';
      
      // Format the reminder email
      const reminderCount = (contract.reminderCount || 0) + 1;
      const isFirstReminder = reminderCount === 1;
      
      const subject = isFirstReminder 
        ? `Contract Reminder: ${contract.clientName} - ${this.formatDate(contract.eventDate)}`
        : `Contract Reminder #${reminderCount}: ${contract.clientName} - ${this.formatDate(contract.eventDate)}`;

      const signUrl = `${process.env.REPLIT_DEV_DOMAIN || 'https://musobuddy.replit.app'}/sign-contract/${contract.id}`;

      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Contract Reminder</h2>
          
          <p>Dear ${contract.clientName},</p>
          
          <p>${isFirstReminder ? 'This is a friendly reminder that' : 'We previously sent you a contract that still needs your signature.'} 
          Your contract for the performance on <strong>${this.formatDate(contract.eventDate)}</strong> at <strong>${contract.venue}</strong> is waiting for your digital signature.</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #2563eb;">Event Details:</h3>
            <p><strong>Date:</strong> ${this.formatDate(contract.eventDate)}</p>
            <p><strong>Time:</strong> ${contract.eventTime}</p>
            <p><strong>Venue:</strong> ${contract.venue}</p>
            <p><strong>Performance Fee:</strong> £${contract.fee}</p>
            ${contract.deposit ? `<p><strong>Deposit:</strong> £${contract.deposit}</p>` : ''}
          </div>
          
          <p>To review and sign the contract, please click the button below:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${signUrl}" 
               style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Sign Contract Online
            </a>
          </div>
          
          <p>If you have any questions about the contract or need to make changes, please reply to this email.</p>
          
          <p>Best regards,<br>
          ${businessName}</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="font-size: 12px; color: #666;">
            This is reminder #${reminderCount} for contract #${contract.contractNumber}.
            If you no longer need this contract, please reply to let us know.
          </p>
        </div>
      `;

      // Send the email
      await sendEmail({
        to: contract.clientEmail,
        from: `${businessName} <noreply@mg.musobuddy.com>`,
        subject,
        html: emailContent,
        text: this.stripHtml(emailContent)
      });

      // Update contract with reminder info
      await storage.updateContract(contract.id, {
        lastReminderSent: new Date(),
        reminderCount: reminderCount
      }, contract.userId);

      console.log(`📧 Reminder sent for contract #${contract.contractNumber} (reminder #${reminderCount})`);
    } catch (error) {
      console.error(`📧 Failed to send reminder for contract #${contract.contractNumber}:`, error);
      throw error;
    }
  }

  /**
   * Format date for display
   */
  private formatDate(date: Date | string): string {
    if (!date) return 'Not specified';
    const d = new Date(date);
    return d.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Strip HTML tags from content for plain text email
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }
}