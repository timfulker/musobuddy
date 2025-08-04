// ⚠️  COMPLETELY ISOLATED INVOICE EMAIL SERVICE ⚠️
// This file provides isolated email sending for invoices ONLY
// Last Updated: August 4, 2025
// NO dependencies on main email systems

import formData from 'form-data';
import Mailgun from 'mailgun.js';

const MAILGUN_DOMAIN = 'mg.musobuddy.com';

export async function sendIsolatedInvoiceEmail(
  invoice: any, 
  userSettings: any, 
  pdfUrl: string, 
  subject: string,
  customMessage?: string
) {
  console.log('🔒 ISOLATED INVOICE EMAIL: Starting email send process...');
  
  try {
    if (!process.env.MAILGUN_API_KEY) {
      throw new Error('MAILGUN_API_KEY not configured');
    }

    // Initialize Mailgun with EU endpoint
    const mg = new Mailgun(formData);
    const mailgun = mg.client({
      username: 'api',
      key: process.env.MAILGUN_API_KEY,
      url: 'https://api.eu.mailgun.net'
    });

    // Generate email content
    const emailHtml = generateInvoiceEmailHTML(invoice, userSettings, pdfUrl, customMessage);
    
    const messageData = {
      from: `MusoBuddy <noreply@${MAILGUN_DOMAIN}>`,
      to: invoice.clientEmail,
      subject: subject || `Invoice ${invoice.invoiceNumber} - MusoBuddy`,
      html: emailHtml,
      'h:Reply-To': userSettings?.email || `noreply@${MAILGUN_DOMAIN}`,
      'h:X-Mailgun-Variables': JSON.stringify({
        email_type: 'invoice',
        invoice_id: invoice.id,
        user_id: invoice.userId
      }),
      'o:tracking': 'yes',
      'o:tracking-clicks': 'yes',
      'o:tracking-opens': 'yes'
    };

    console.log('🔒 ISOLATED INVOICE EMAIL: Sending via Mailgun EU...', {
      from: messageData.from,
      to: messageData.to,
      subject: messageData.subject,
      domain: MAILGUN_DOMAIN
    });

    const result = await mailgun.messages.create(MAILGUN_DOMAIN, messageData);
    
    console.log('✅ ISOLATED INVOICE EMAIL: Email sent successfully:', result.id);
    return { success: true, messageId: result.id };
    
  } catch (error) {
    console.error('❌ ISOLATED INVOICE EMAIL: Failed to send email:', error);
    return { success: false, error: error.message };
  }
}

function generateInvoiceEmailHTML(
  invoice: any, 
  userSettings: any, 
  pdfUrl: string, 
  customMessage?: string
) {
  const businessName = userSettings?.businessName || 'MusoBuddy';
  const userEmail = userSettings?.email || 'hello@musobuddy.com';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
    .container { max-width: 600px; margin: 0 auto; background-color: white; }
    .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 40px 30px; text-align: center; }
    .content { padding: 40px 30px; }
    .invoice-details { background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .view-button { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0; font-weight: 600; }
    .footer { background-color: #f8fafc; padding: 30px; text-align: center; color: #64748b; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 28px;">📄 Invoice Ready</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">From ${businessName}</p>
    </div>
    
    <div class="content">
      <p>Hello,</p>
      
      ${customMessage ? `<p><strong>Message:</strong> ${customMessage}</p>` : ''}
      
      <p>Your invoice is ready for review. Please find the details below:</p>
      
      <div class="invoice-details">
        <h3 style="margin-top: 0; color: #1e3a8a;">Invoice Details</h3>
        <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
        <p><strong>Amount:</strong> £${invoice.amount?.toFixed(2) || '0.00'}</p>
        <p><strong>Performance Date:</strong> ${new Date(invoice.performanceDate).toLocaleDateString()}</p>
        <p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>
      </div>
      
      <p>Click the button below to view and download your invoice:</p>
      
      <a href="${pdfUrl}" class="view-button" target="_blank">View Invoice PDF</a>
      
      <p style="margin-top: 30px;">If you have any questions about this invoice, please don't hesitate to contact us.</p>
      
      <p>Best regards,<br>${businessName}</p>
    </div>
    
    <div class="footer">
      <p>This email was sent by MusoBuddy</p>
      <p>Contact: ${userEmail}</p>
    </div>
  </div>
</body>
</html>`;
}