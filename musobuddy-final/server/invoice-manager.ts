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
      const overdueThreshold = 3; // 3 working days grace period
      
      for (const invoice of allInvoices) {
        if (invoice.status === 'sent' && invoice.dueDate) {
          const dueDate = new Date(invoice.dueDate);
          const workingDaysOverdue = this.calculateWorkingDays(dueDate, currentDate);
          
          if (workingDaysOverdue >= overdueThreshold) {
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
      
      // Get related contract for client details
      let contract = null;
      if (invoice.contractId) {
        contract = await storage.getContract(invoice.contractId, userId);
      }
      
      if (!contract?.clientEmail) {
        console.log('No client email found for overdue reminder');
        return false;
      }
      
      // Import email functions
      const { sendEmail } = await import('./sendgrid');
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
      
      const emailSent = await sendEmail({
        to: contract.clientEmail,
        from: `${fromName} <${fromEmail}>`,
        subject: `OVERDUE: Invoice ${invoice.invoiceNumber} - Payment Required`,
        html: this.generateOverdueEmailHtml(invoice, contract, userSettings, daysOverdue),
        text: `PAYMENT OVERDUE: Invoice ${invoice.invoiceNumber} for £${invoice.amount} was due ${daysOverdue} days ago. Please arrange payment immediately to avoid further action.`,
        attachments: [{
          content: pdfBase64,
          filename: `OVERDUE-Invoice-${invoice.invoiceNumber}.pdf`,
          type: 'application/pdf',
          disposition: 'attachment'
        }]
      });
      
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
  private generateOverdueEmailHtml(invoice: any, contract: any, userSettings: any, daysOverdue: number): string {
    const businessName = userSettings?.businessName || 'Your Business';
    const businessEmail = userSettings?.businessEmail || 'noreply@musobuddy.com';
    const businessPhone = userSettings?.phone || '';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background-color: #fff; }
          .warning { background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; }
          .invoice-details { background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .amount { font-size: 24px; font-weight: bold; color: #dc2626; }
          .footer { background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>PAYMENT OVERDUE</h1>
          <p>Invoice ${invoice.invoiceNumber}</p>
        </div>
        
        <div class="content">
          <p>Dear ${contract.clientName},</p>
          
          <div class="warning">
            <strong>⚠️ URGENT ACTION REQUIRED</strong><br>
            Your payment is now <strong>${daysOverdue} days overdue</strong>. Immediate payment is required to avoid further action.
          </div>
          
          <div class="invoice-details">
            <h3>Invoice Details:</h3>
            <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
            <p><strong>Amount Due:</strong> <span class="amount">£${invoice.amount}</span></p>
            <p><strong>Original Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString('en-GB')}</p>
            <p><strong>Days Overdue:</strong> ${daysOverdue} days</p>
            <p><strong>Event:</strong> ${new Date(invoice.performanceDate).toLocaleDateString('en-GB')}</p>
          </div>
          
          <p><strong>Please arrange payment immediately using one of the following methods:</strong></p>
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
          
          <p>Best regards,<br>${businessName}</p>
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