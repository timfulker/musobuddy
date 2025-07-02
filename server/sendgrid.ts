import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    console.log('Sending email with params:', {
      to: params.to,
      from: params.from,
      subject: params.subject,
      hasText: !!params.text,
      hasHtml: !!params.html
    });
    
    const result = await mailService.send({
      to: params.to,
      from: params.from,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    
    console.log('SendGrid response:', result);
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    if (error.response && error.response.body) {
      console.error('SendGrid error details:', error.response.body);
    }
    return false;
  }
}

export function generateInvoiceHtml(invoice: any, contract: any, userSettings: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Invoice ${invoice.invoiceNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f9f9f9; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 30px; border-bottom: 2px solid #0EA5E9; padding-bottom: 20px; }
        .logo { font-size: 24px; font-weight: bold; color: #0EA5E9; }
        .invoice-title { text-align: right; }
        .invoice-number { font-size: 20px; font-weight: bold; color: #333; }
        .invoice-date { color: #666; margin-top: 5px; }
        .billing-section { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .billing-info { flex: 1; }
        .billing-info h3 { color: #333; margin-bottom: 10px; font-size: 14px; text-transform: uppercase; }
        .billing-info p { margin: 3px 0; color: #666; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .items-table th { background-color: #f8f9fa; padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6; }
        .items-table td { padding: 12px; border-bottom: 1px solid #dee2e6; }
        .items-table .amount { text-align: right; font-weight: bold; }
        .total-section { text-align: right; }
        .total-row { display: flex; justify-content: flex-end; margin-bottom: 5px; }
        .total-label { width: 150px; text-align: right; padding-right: 20px; }
        .total-amount { width: 100px; text-align: right; font-weight: bold; }
        .grand-total { font-size: 18px; color: #0EA5E9; border-top: 2px solid #0EA5E9; padding-top: 10px; margin-top: 10px; }
        .terms { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; }
        .terms h3 { color: #333; margin-bottom: 10px; }
        .terms p { color: #666; line-height: 1.5; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">${userSettings?.businessName || 'MusoBuddy'}</div>
          <div class="invoice-title">
            <div class="invoice-number">Invoice ${invoice.invoiceNumber}</div>
            <div class="invoice-date">${new Date(invoice.issueDate).toLocaleDateString('en-GB')}</div>
          </div>
        </div>

        <div class="billing-section">
          <div class="billing-info">
            <h3>From:</h3>
            <p><strong>${userSettings?.businessName || 'Your Business'}</strong></p>
            ${userSettings?.businessAddress ? `<p>${userSettings.businessAddress.replace(/\n/g, '<br>')}</p>` : ''}
            ${userSettings?.phone ? `<p>Phone: ${userSettings.phone}</p>` : ''}
            ${userSettings?.website ? `<p>Website: ${userSettings.website}</p>` : ''}
          </div>
          <div class="billing-info">
            <h3>To:</h3>
            <p><strong>${contract?.clientName || 'Client'}</strong></p>
            ${contract?.clientEmail ? `<p>${contract.clientEmail}</p>` : ''}
            ${contract?.clientPhone ? `<p>${contract.clientPhone}</p>` : ''}
            ${contract?.eventVenue ? `<p>${contract.eventVenue}</p>` : ''}
          </div>
        </div>

        <table class="items-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Event Date</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${contract?.eventType || 'Music Performance'} - ${contract?.clientName || 'Client'}</td>
              <td>${contract?.eventDate ? new Date(contract.eventDate).toLocaleDateString('en-GB') : ''}</td>
              <td class="amount">£${Number(invoice.amount).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <div class="total-section">
          <div class="total-row">
            <div class="total-label">Subtotal:</div>
            <div class="total-amount">£${Number(invoice.amount).toFixed(2)}</div>
          </div>
          <div class="total-row grand-total">
            <div class="total-label">Total:</div>
            <div class="total-amount">£${Number(invoice.amount).toFixed(2)}</div>
          </div>
        </div>

        ${invoice.terms || userSettings?.defaultTerms ? `
        <div class="terms">
          <h3>Payment Terms</h3>
          <p>${invoice.terms || userSettings?.defaultTerms || 'Payment due within 30 days of invoice date.'}</p>
        </div>
        ` : ''}
      </div>
    </body>
    </html>
  `;
}

export function generateContractHtml(contract: any, userSettings: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Contract ${contract.contractNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f9f9f9; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #0EA5E9; padding-bottom: 20px; }
        .title { font-size: 24px; font-weight: bold; color: #0EA5E9; margin-bottom: 10px; }
        .contract-number { color: #666; }
        .section { margin-bottom: 25px; }
        .section h3 { color: #333; margin-bottom: 10px; font-size: 16px; border-bottom: 1px solid #dee2e6; padding-bottom: 5px; }
        .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
        .detail-item { margin-bottom: 10px; }
        .detail-label { font-weight: bold; color: #333; }
        .detail-value { color: #666; margin-top: 2px; }
        .terms-text { line-height: 1.6; color: #555; white-space: pre-line; }
        .signature-section { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #dee2e6; }
        .signature-box { text-align: center; }
        .signature-line { border-bottom: 1px solid #333; margin-bottom: 10px; height: 40px; }
        .signature-label { color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="title">Performance Contract</div>
          <div class="contract-number">Contract ${contract.contractNumber}</div>
        </div>

        <div class="section">
          <h3>Performer Details</h3>
          <div class="detail-item">
            <div class="detail-label">${userSettings?.businessName || 'Performer Name'}</div>
            ${userSettings?.businessAddress ? `<div class="detail-value">${userSettings.businessAddress.replace(/\n/g, '<br>')}</div>` : ''}
            ${userSettings?.phone ? `<div class="detail-value">Phone: ${userSettings.phone}</div>` : ''}
          </div>
        </div>

        <div class="section">
          <h3>Client Details</h3>
          <div class="detail-item">
            <div class="detail-label">${contract.clientName}</div>
            ${contract.clientEmail ? `<div class="detail-value">Email: ${contract.clientEmail}</div>` : ''}
            ${contract.clientPhone ? `<div class="detail-value">Phone: ${contract.clientPhone}</div>` : ''}
          </div>
        </div>

        <div class="section">
          <h3>Event Details</h3>
          <div class="details-grid">
            <div class="detail-item">
              <div class="detail-label">Event Type</div>
              <div class="detail-value">${contract.eventType}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Event Date</div>
              <div class="detail-value">${new Date(contract.eventDate).toLocaleDateString('en-GB')}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Start Time</div>
              <div class="detail-value">${contract.startTime}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Duration</div>
              <div class="detail-value">${contract.duration}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Venue</div>
              <div class="detail-value">${contract.eventVenue}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Fee</div>
              <div class="detail-value">£${Number(contract.fee).toFixed(2)}</div>
            </div>
          </div>
        </div>

        ${contract.terms ? `
        <div class="section">
          <h3>Terms and Conditions</h3>
          <div class="terms-text">${contract.terms}</div>
        </div>
        ` : ''}

        <div class="signature-section">
          <div class="signature-box">
            <div class="signature-line"></div>
            <div class="signature-label">Performer Signature</div>
            <div class="signature-label">Date: ___________</div>
          </div>
          <div class="signature-box">
            <div class="signature-line"></div>
            <div class="signature-label">Client Signature</div>
            <div class="signature-label">Date: ___________</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}