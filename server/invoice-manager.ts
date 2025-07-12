import { storage } from './storage';
import type { Invoice } from '@shared/schema';

export class InvoiceManager {
  
  /**
   * Check all invoices and update overdue status
   * Called periodically to maintain invoice status accuracy
   */
  async updateOverdueInvoices(): Promise<void> {
    console.log('Starting overdue invoice check...');
    
    try {
      // Get all users to check their invoices
      // Note: In a real system, you'd batch this or use a more efficient query
      const allInvoices = await this.getAllSentInvoices();
      
      const currentDate = new Date();
      const overdueThreshold = 7; // 7 days grace period for first reminder
      
      for (const invoice of allInvoices) {
        if (invoice.status === 'sent' && invoice.dueDate) {
          const dueDate = new Date(invoice.dueDate);
          const daysOverdue = Math.ceil((currentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysOverdue >= overdueThreshold) {
            console.log(`Marking invoice ${invoice.invoiceNumber} as overdue`);
            await storage.updateInvoice(invoice.id, { status: 'overdue' }, invoice.userId);
          }
        }
      }
      
      console.log('Overdue invoice check completed');
    } catch (error) {
      console.error('Error updating overdue invoices:', error);
    }
  }
  
  /**
   * Calculate working days between two dates (excluding weekends)
   */
  private calculateWorkingDays(startDate: Date, endDate: Date): number {
    if (endDate <= startDate) return 0;
    
    let workingDays = 0;
    const currentDate = new Date(startDate);
    
    while (currentDate < endDate) {
      currentDate.setDate(currentDate.getDate() + 1);
      const dayOfWeek = currentDate.getDay();
      
      // Skip weekends (0 = Sunday, 6 = Saturday)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
    }
    
    return workingDays;
  }
  
  /**
   * Get all sent invoices across all users
   * In production, this would be optimized with proper database queries
   */
  private async getAllSentInvoices(): Promise<Invoice[]> {
    // This is a simplified approach - in production you'd use a more efficient query
    // For now, we'll need to extend the storage interface
    return [];
  }
  
  /**
   * Mark an invoice as paid
   */
  async markInvoiceAsPaid(invoiceId: number, userId: string, paidDate?: Date): Promise<boolean> {
    try {
      const paidAt = paidDate || new Date();
      const updatedInvoice = await storage.updateInvoice(
        invoiceId, 
        { status: 'paid', paidAt }, 
        userId
      );
      
      if (updatedInvoice) {
        console.log(`Invoice ${updatedInvoice.invoiceNumber} marked as paid`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
      return false;
    }
  }
  
  /**
   * Generate overdue invoice reminder
   */
  async generateOverdueReminder(invoiceId: number, userId: string): Promise<boolean> {
    try {
      const invoice = await storage.getInvoice(invoiceId, userId);
      if (!invoice || invoice.status !== 'overdue') {
        return false;
      }
      
      // Get client email from invoice or related contract
      let clientEmail = invoice.clientEmail;
      let contract = null;
      
      if (invoice.contractId) {
        contract = await storage.getContract(invoice.contractId, userId);
      }
      
      // Use contract email if invoice email is not available
      if (!clientEmail && contract?.clientEmail) {
        clientEmail = contract.clientEmail;
      }
      
      if (!clientEmail) {
        console.log('No client email found for overdue reminder');
        return false;
      }
      
      // Email sending temporarily disabled - rebuilding from scratch
      const { generateInvoicePDF } = await import('./pdf-generator');
      
      // Get user settings
      const userSettings = await storage.getUserSettings(userId);
      
      // Generate PDF with overdue status
      const pdfBuffer = await generateInvoicePDF(invoice, contract, userSettings);
      const pdfBase64 = pdfBuffer.toString('base64');
      
      // Send overdue reminder email
      const fromEmail = userSettings?.businessEmail || 'noreply@musobuddy.com';
      const fromName = userSettings?.emailFromName || userSettings?.businessName || 'MusoBuddy';
      
      const daysOverdue = Math.ceil((Date.now() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24));
      
      // Determine reminder type based on days overdue
      const reminderType = daysOverdue >= 21 ? 'final' : 'first';
      
      const emailSent = false; // Email sending disabled - rebuilding
      
      if (emailSent) {
        console.log(`Overdue reminder sent for invoice ${invoice.invoiceNumber}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error sending overdue reminder:', error);
      return false;
    }
  }
  
  /**
   * Generate HTML for overdue email reminder
   */
  private generateOverdueEmailHtml(invoice: any, contract: any, userSettings: any, daysOverdue: number, reminderType: 'first' | 'final' = 'first'): string {
    const businessName = userSettings?.businessName || 'Your Business';
    const businessEmail = userSettings?.businessEmail || 'noreply@musobuddy.com';
    const businessPhone = userSettings?.phone || '';
    
    const isFirstReminder = reminderType === 'first';
    const headerColor = isFirstReminder ? '#f59e0b' : '#dc2626';
    const headerText = isFirstReminder ? 'PAYMENT REMINDER' : 'FINAL NOTICE';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background-color: ${headerColor}; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background-color: #fff; }
          .warning { background-color: ${isFirstReminder ? '#fef3c7' : '#fef2f2'}; border-left: 4px solid ${headerColor}; padding: 15px; margin: 20px 0; }
          .invoice-details { background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .amount { font-size: 24px; font-weight: bold; color: ${headerColor}; }
          .footer { background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${headerText}</h1>
          <p>Invoice ${invoice.invoiceNumber}</p>
        </div>
        
        <div class="content">
          <p>Dear ${contract?.clientName || invoice.clientName},</p>
          
          <div class="warning">
            ${isFirstReminder 
              ? `<strong>Payment Reminder</strong><br>Your payment is now <strong>${daysOverdue} days overdue</strong>. We would appreciate if you could arrange payment at your earliest convenience.`
              : `<strong>⚠️ FINAL NOTICE</strong><br>Your payment is now <strong>${daysOverdue} days overdue</strong>. Immediate payment is required to avoid further action.`
            }
          </div>
          
          <div class="invoice-details">
            <h3>Invoice Details:</h3>
            <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
            <p><strong>Amount Due:</strong> <span class="amount">£${invoice.amount}</span></p>
            <p><strong>Original Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString('en-GB')}</p>
            <p><strong>Days Overdue:</strong> ${daysOverdue} days</p>
            <p><strong>Event:</strong> ${new Date(invoice.performanceDate).toLocaleDateString('en-GB')}</p>
          </div>
          
          ${isFirstReminder 
            ? `<p><strong>Please arrange payment using one of the following methods:</strong></p>
              <ul>
                <li>Bank Transfer: ${userSettings?.bankDetails || 'Contact us for bank details'}</li>
                <li>Contact us directly: ${businessEmail}</li>
                ${businessPhone ? `<li>Phone: ${businessPhone}</li>` : ''}
              </ul>
              
              <p>If you have already made payment, please disregard this notice and contact us with proof of payment.</p>
              
              <p>Thank you for your prompt attention to this matter.</p>
              
              <p>Best regards,<br>${businessName}</p>`
            : `<p><strong>Please arrange payment immediately using one of the following methods:</strong></p>
              <ul>
                <li>Bank Transfer: ${userSettings?.bankDetails || 'Contact us for bank details'}</li>
                <li>Contact us directly: ${businessEmail}</li>
                ${businessPhone ? `<li>Phone: ${businessPhone}</li>` : ''}
              </ul>
              
              <p>If payment is not received within 7 days, we may be forced to take further action including:</p>
              <ul>
                <li>Additional late payment charges</li>
                <li>Referral to debt collection</li>
                <li>Legal action</li>
              </ul>
              
              <p>If you have already made payment, please disregard this notice and contact us immediately with proof of payment.</p>
              
              <p>Thank you for your immediate attention to this matter.</p>
              
              <p>Best regards,<br>${businessName}</p>`
          }
        </div>
        
        <div class="footer">
          <p>${businessName} | ${businessEmail} ${businessPhone ? `| ${businessPhone}` : ''}</p>
          <p>This is an automated reminder. Please contact us if you have any questions.</p>
        </div>
      </body>
      </html>
    `;
  }
}

export const invoiceManager = new InvoiceManager();