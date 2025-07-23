import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { Contract, UserSettings, Invoice } from '@shared/schema';

function getLogoBase64(): string {
  try {
    const logoPath = join(process.cwd(), 'client/public/musobuddy-logo-purple.png');
    const logoBuffer = readFileSync(logoPath);
    return logoBuffer.toString('base64');
  } catch (error) {
    console.error('Error loading logo:', error);
    // Fallback to empty string if logo not found
    return '';
  }
}

export async function generateContractPDF(
  contract: Contract,
  userSettings: UserSettings | null,
  signatureDetails?: {
    signedAt: Date;
    signatureName?: string;
    clientIpAddress?: string;
  }
): Promise<Buffer> {
  console.log('Starting contract PDF generation for:', contract.contractNumber);
  
  // Simple, reliable Puppeteer configuration
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  try {
    const page = await browser.newPage();
    const html = generateContractHTML(contract, userSettings, signatureDetails);
    
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    
    console.log('Contract PDF generated successfully:', pdf.length, 'bytes');
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

export async function generateInvoicePDF(
  invoice: Invoice,
  contract: Contract | null,
  userSettings: UserSettings | null
): Promise<Buffer> {
  console.log('Starting invoice PDF generation for:', invoice.invoiceNumber);
  
  // Simple, reliable Puppeteer configuration
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  try {
    const page = await browser.newPage();
    const html = generateInvoiceHTML(invoice, contract, userSettings);
    
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    
    console.log('Invoice PDF generated successfully:', pdf.length, 'bytes');
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

function generateInvoiceHTML(
  invoice: Invoice,
  contract: Contract | null,
  userSettings: UserSettings | null
): string {
  const businessName = userSettings?.businessName || 'MusoBuddy';
  
  // Use the custom MusoBuddy logo
  const logoBase64 = getLogoBase64();
  const logoHtml = logoBase64 ? `<img src="data:image/png;base64,${logoBase64}" style="height: 40px; width: auto;" alt="MusoBuddy Logo" />` : '';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Invoice ${invoice.invoiceNumber}</title>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          margin: 0;
          padding: 20px;
          color: #333;
          line-height: 1.6;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 40px;
          border-bottom: 3px solid #9333ea;
          padding-bottom: 20px;
        }
        .logo-section {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .logo {
          font-size: 32px;
          font-weight: bold;
          color: #9333ea;
        }
        .invoice-details {
          text-align: right;
        }
        .invoice-number {
          font-size: 24px;
          font-weight: bold;
          color: #333;
          margin-bottom: 5px;
        }
        .invoice-date {
          color: #666;
          font-size: 14px;
        }
        .billing-section {
          display: flex;
          justify-content: space-between;
          margin-bottom: 40px;
        }
        .billing-info {
          width: 45%;
        }
        .billing-info h3 {
          color: #333;
          margin-bottom: 15px;
          font-size: 16px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .billing-info p {
          margin: 5px 0;
          color: #666;
        }
        .billing-info strong {
          color: #333;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        .items-table th {
          background-color: #f8f9fa;
          padding: 15px;
          text-align: left;
          border-bottom: 2px solid #dee2e6;
          font-weight: bold;
          color: #333;
        }
        .items-table td {
          padding: 15px;
          border-bottom: 1px solid #dee2e6;
        }
        .items-table .amount {
          text-align: right;
          font-weight: bold;
        }
        .total-section {
          text-align: right;
          margin-top: 30px;
        }
        .total-row {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 8px;
        }
        .total-label {
          width: 150px;
          text-align: right;
          padding-right: 20px;
          color: #666;
        }
        .total-amount {
          width: 100px;
          text-align: right;
          font-weight: bold;
        }
        .grand-total {
          font-size: 20px;
          color: #9333ea;
          border-top: 2px solid #9333ea;
          padding-top: 15px;
          margin-top: 15px;
        }
        .payment-info {
          margin-top: 40px;
          padding: 20px;
          background-color: #f8f9fa;
          border-radius: 8px;
        }
        .payment-info h3 {
          color: #333;
          margin-bottom: 15px;
        }
        .bank-details {
          margin-top: 20px;
          padding: 15px;
          background-color: #e8f5e8;
          border-radius: 5px;
          border-left: 4px solid #059669;
        }
        .bank-details h4 {
          color: #059669;
          margin-bottom: 10px;
        }
        .payment-info p {
          margin: 5px 0;
          color: #666;
        }
        .terms {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #dee2e6;
        }
        .terms h3 {
          color: #333;
          margin-bottom: 10px;
        }
        .terms p {
          color: #666;
          line-height: 1.5;
        }
        .status-badge {
          display: inline-block;
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .status-draft {
          background-color: #fef3c7;
          color: #92400e;
        }
        .status-sent {
          background-color: #dbeafe;
          color: #1e40af;
        }
        .status-paid {
          background-color: #d1fae5;
          color: #065f46;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo-section">
          ${logoHtml}
          <div class="logo">${businessName}</div>
        </div>
        <div class="invoice-details">
          <div class="invoice-number">Invoice ${invoice.invoiceNumber}</div>
          <div class="invoice-date">${new Date(invoice.createdAt || '').toLocaleDateString('en-GB')}</div>
          <div style="margin-top: 10px;">
            <span class="status-badge status-${invoice.status}">${invoice.status}</span>
          </div>
        </div>
      </div>

      <div class="billing-section">
        <div class="billing-info">
          <h3>From:</h3>
          <p><strong>${businessName}</strong></p>
          <p style="font-style: italic; color: #666;">Sole trader trading as ${businessName}</p>
          ${userSettings?.businessAddress ? `<p>${userSettings?.businessAddress.replace(/\n/g, '<br>')}</p>` : ''}
          ${userSettings?.phone ? `<p>Phone: ${userSettings?.phone}</p>` : ''}
          ${userSettings?.businessEmail ? `<p>Email: ${userSettings.businessEmail}</p>` : ''}
          ${userSettings?.website ? `<p>Website: ${userSettings.website}</p>` : ''}
        </div>
        <div class="billing-info">
          <h3>Bill To:</h3>
          <p><strong>${invoice.clientName}</strong></p>
          ${invoice.clientAddress ? `<p>${invoice.clientAddress.replace(/\n/g, '<br>')}</p>` : ''}
          ${(invoice.clientEmail || contract?.clientEmail) ? `<p>${invoice.clientEmail || contract?.clientEmail}</p>` : ''}
          ${contract?.clientPhone ? `<p>${contract.clientPhone}</p>` : ''}
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Event Date</th>
            <th>Performance Fee</th>
            <th>Deposit Paid</th>
            <th class="amount">Amount Due</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Music Performance${invoice.venueAddress ? `<br><strong>Venue:</strong> ${invoice.venueAddress}` : ''}</td>
            <td>${invoice.performanceDate ? new Date(invoice.performanceDate).toLocaleDateString('en-GB') : 'TBD'}</td>
            <td>£${parseFloat(invoice.performanceFee || invoice.amount).toFixed(2)}</td>
            <td>£${parseFloat(invoice.depositPaid || '0').toFixed(2)}</td>
            <td class="amount">£${parseFloat(invoice.amount).toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <div class="total-section">
        <div class="total-row">
          <div class="total-label">Performance Fee:</div>
          <div class="total-amount">£${parseFloat(invoice.performanceFee || invoice.amount).toFixed(2)}</div>
        </div>
        <div class="total-row">
          <div class="total-label">Deposit Paid:</div>
          <div class="total-amount">-£${parseFloat(invoice.depositPaid || '0').toFixed(2)}</div>
        </div>
        <div class="total-row">
          <div class="total-label">VAT Status:</div>
          <div class="total-amount">Not VAT registered</div>
        </div>
        <div class="total-row grand-total">
          <div class="total-label">Total Due:</div>
          <div class="total-amount">£${parseFloat(invoice.amount).toFixed(2)}</div>
        </div>
      </div>

      <div class="payment-info">
        <h3>Payment Information</h3>
        <p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString('en-GB')}</p>
        
        <div class="bank-details">
          <h4>Bank Details for Payment</h4>
          ${userSettings?.bankDetails ? 
            `<p style="margin: 0; white-space: pre-line;">${userSettings.bankDetails}</p>` : 
            `<p style="margin: 0;">
              <strong>Account Name:</strong> ${businessName}<br>
              <strong>Sort Code:</strong> [To be provided]<br>
              <strong>Account Number:</strong> [To be provided]<br>
              <strong>Bank:</strong> [To be provided]
            </p>`
          }
          <p style="margin-top: 10px; font-style: italic; color: #059669;">
            Please use invoice number ${invoice.invoiceNumber} as payment reference
          </p>
        </div>
      </div>

      <div class="terms">
        <h3>Terms & Conditions</h3>
        <p>${userSettings?.defaultTerms || 'Payment is due within 30 days of the invoice date. Thank you for your business!'}</p>
        <p style="margin-top: 15px; font-weight: bold; color: #333;">VAT Status: I am not VAT registered and therefore no VAT is charged.</p>
      </div>

      <div style="margin-top: 40px; padding: 15px; text-align: center; border-top: 1px solid #dee2e6; color: #999; font-size: 12px;">
        <p style="margin: 0;">Powered by <strong style="color: #9333ea;">MusoBuddy</strong> – less admin, more music.</p>
      </div>
    </body>
    </html>
  `;
}

function generateContractHTML(
  contract: Contract,
  userSettings: UserSettings | null,
  signatureDetails?: {
    signedAt: Date;
    signatureName?: string;
    clientIpAddress?: string;
  }
): string {
  const businessName = userSettings?.businessName || 'MusoBuddy';
  const businessAddress = userSettings?.businessAddress || '';
  const businessPhone = userSettings?.phone || '';
  const businessEmail = userSettings?.businessEmail || '';
  
  // Use the custom MusoBuddy logo
  const logoBase64 = getLogoBase64();
  const logoHtml = logoBase64 ? `<img src="data:image/png;base64,${logoBase64}" style="height: 50px; width: auto; margin-bottom: 20px;" alt="MusoBuddy Logo" />` : '';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Performance Contract ${contract.contractNumber}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          text-align: center;
          border-bottom: 3px solid #9333ea;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .business-details {
          margin-bottom: 30px;
        }
        .contract-details {
          margin-bottom: 30px;
        }
        .terms {
          margin-bottom: 30px;
        }
        .signature-section {
          margin-top: 50px;
          border-top: 1px solid #ccc;
          padding-top: 30px;
        }
        .signature-box {
          border: 1px solid #333;
          padding: 20px;
          margin: 20px 0;
          background-color: #f9f9f9;
        }
        .signed-box {
          border: 2px solid #4CAF50;
          background-color: #e8f5e8;
        }
        .party-section {
          margin-bottom: 30px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 12px;
          text-align: left;
        }
        th {
          background-color: #f4f4f4;
          font-weight: bold;
        }
        .amount {
          font-weight: bold;
          color: #2563eb;
        }
        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
        }
        .status-signed {
          background-color: #dcfce7;
          color: #166534;
        }
        .status-sent {
          background-color: #fef3c7;
          color: #92400e;
        }
      </style>
    </head>
    <body>
      <div class="header">
        ${logoHtml}
        <h1>Performance Contract</h1>
        <h2>${contract.contractNumber}</h2>
        <div class="status-badge ${contract.status === 'signed' ? 'status-signed' : 'status-sent'}">
          ${contract.status.toUpperCase()}
        </div>
      </div>

      <div class="business-details">
        <h3>Performer Details</h3>
        <p><strong>${businessName}</strong></p>
        ${businessAddress ? `<p>${businessAddress}</p>` : ''}
        ${businessPhone ? `<p>Phone: ${businessPhone}</p>` : ''}
        ${businessEmail ? `<p>Email: ${businessEmail}</p>` : ''}
      </div>

      <div class="contract-details">
        <h3>Event Details</h3>
        <table>
          <tr>
            <th>Client Name</th>
            <td>${contract.clientName}</td>
          </tr>
          <tr>
            <th>Client Email</th>
            <td>${contract.clientEmail}</td>
          </tr>
          ${contract.clientAddress ? `<tr>
            <th>Client Address</th>
            <td>${contract.clientAddress}</td>
          </tr>` : ''}
          ${contract.clientPhone ? `<tr>
            <th>Client Phone</th>
            <td>${contract.clientPhone}</td>
          </tr>` : ''}
          <tr>
            <th>Event Date</th>
            <td>${new Date(contract.eventDate).toLocaleDateString('en-GB', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</td>
          </tr>
          <tr>
            <th>Event Time</th>
            <td>${contract.eventTime}</td>
          </tr>
          <tr>
            <th>Venue</th>
            <td>${contract.venue}</td>
          </tr>
          <tr>
            <th>Performance Fee</th>
            <td class="amount">£${contract.fee}</td>
          </tr>
        </table>
      </div>

      <div class="terms">
        <h3>Terms and Conditions</h3>
        
        <div style="margin-top: 20px; padding: 15px; background-color: #f0f8ff; border-radius: 5px; font-size: 14px;">
          <h4 style="margin-top: 0; color: #2563eb;">Payment Terms & Conditions</h4>
          <p><strong>Payment Due Date:</strong> Full payment of £${contract.fee} becomes due and payable no later than the day of performance. Payment must be received before or immediately upon completion of the performance.</p>
          <p><strong>Payment Methods:</strong> Cash or bank transfer to the performer's designated account (details provided separately).</p>
          ${contract.deposit ? `<p><strong>Deposit:</strong> £${contract.deposit} deposit required to secure booking. Deposit is non-refundable except as outlined in the cancellation policy below.</p>` : ''}
          <p><strong>Late Payment:</strong> Any payment received after the due date may incur a late payment fee of £25 plus interest at 2% per month.</p>
          
          <h4 style="color: #2563eb; margin-top: 20px;">Cancellation & Refund Policy</h4>
          <p><strong>Client Cancellation:</strong></p>
          <ul style="margin-left: 20px;">
            <li>More than 30 days before event: Any deposit paid will be refunded minus a £50 administration fee</li>
            <li>30 days or less before event: Full performance fee becomes due regardless of cancellation</li>
            <li>Same day cancellation: Full fee due plus any additional costs incurred</li>
          </ul>
          <p><strong>Performer Cancellation:</strong> In the unlikely event the performer must cancel due to circumstances within their control, all payments will be refunded in full and reasonable assistance will be provided to find a suitable replacement.</p>
          <p><strong>Rescheduling:</strong> Event may be rescheduled once without penalty if agreed by both parties at least 14 days in advance. Additional rescheduling requests may incur a £25 administrative fee.</p>
          
          <h4 style="color: #2563eb; margin-top: 20px;">Force Majeure</h4>
          <p>Neither party shall be liable for any failure to perform due to circumstances beyond their reasonable control, including but not limited to: severe weather, natural disasters, government restrictions, venue closure, or serious illness.</p>
          
          <h4 style="color: #2563eb; margin-top: 20px;">Performance Contingencies</h4>
          <p>The performer will provide appropriate backup equipment where reasonably possible. If performance cannot proceed due to venue-related issues (power failure, noise restrictions, etc.), the full fee remains due.</p>
          
          <h4 style="color: #2563eb; margin-top: 20px;">Professional Performance Standards</h4>
          <p><strong>Payment Schedule:</strong> The agreed performance fee${contract.deposit ? ' (including applicable VAT)' : ''} becomes due and payable on the date of performance of the engagement.</p>
          <p><strong>Equipment & Instrument Protection:</strong> The equipment and instruments of the performer are not available for use by any other person, except by specific permission of the performer. All musical instruments and equipment remain the exclusive property of the performer.</p>
          <p><strong>Venue Safety Requirements:</strong> The client shall ensure a safe supply of electricity and the security of the performer and their property at the venue throughout the engagement.</p>
          <p><strong>Recording & Transmission Policy:</strong> The client shall not make or permit the making of any audio and/or visual recording or transmission of the performer's performance without the prior written consent of the performer.</p>
          <p><strong>Contract Modifications:</strong> This agreement may not be modified or cancelled except by mutual consent, in writing signed by both parties. Verbal modifications are not binding.</p>
          <p><strong>Performance Rider:</strong> Any rider attached hereto and signed by both parties shall be deemed incorporated into this agreement.</p>
          <p><strong>Safe Space Principle:</strong> The client and performer agree to a 'Safe Space' principle to provide a working environment free from harassment and discrimination, maintaining respectful professional standards throughout the engagement.</p>
          <p><strong>Professional Insurance:</strong> The performer maintains professional liability insurance as required for musical performance engagements.</p>
        </div>
      </div>

      <div class="signature-section">
        <h3>Signatures</h3>
        
        <div class="party-section">
          <h4>Performer</h4>
          <div class="signature-box signed-box">
            <p><strong>Signed by:</strong> ${businessName}</p>
            <p><strong>Date:</strong> ${new Date(contract.createdAt).toLocaleDateString('en-GB')}</p>
            <p><strong>Status:</strong> Agreed by sending contract</p>
          </div>
        </div>

        <div class="party-section">
          <h4>Client</h4>
          <div class="signature-box ${contract.status === 'signed' ? 'signed-box' : ''}">
            ${contract.status === 'signed' && signatureDetails ? `
              <p><strong>Signed by:</strong> ${signatureDetails.signatureName || 'Digital Signature'}</p>
              <p><strong>Date:</strong> ${signatureDetails.signedAt.toLocaleDateString('en-GB')} at ${signatureDetails.signedAt.toLocaleTimeString('en-GB')}</p>
              <p><strong>Status:</strong> Digitally Signed</p>
            ` : `
              <p><strong>Status:</strong> Awaiting Signature</p>
              <p>This contract has been sent to ${contract.clientEmail} for digital signature.</p>
            `}
          </div>
        </div>
      </div>

      <div style="margin-top: 50px; padding: 20px; background-color: #f0f0f0; border-radius: 5px; font-size: 12px; color: #666;">
        <p><strong>Legal Information & Governing Terms:</strong></p>
        <p>Contract Number: ${contract.contractNumber}</p>
        <p>Generated: ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB')}</p>
        <p><strong>Binding Agreement:</strong> This is a legally binding agreement between the parties named above. Both parties acknowledge they have read, understood, and agree to be bound by all terms and conditions set forth herein.</p>
        <p><strong>Governing Law & Jurisdiction:</strong> This contract shall be governed by and construed in accordance with the laws of England and Wales. Any disputes, claims, or legal proceedings arising from or relating to this agreement shall be subject to the exclusive jurisdiction of the courts of England and Wales.</p>
        <p><strong>Digital Signatures:</strong> Digital signatures are legally binding under the Electronic Communications Act 2000 and eIDAS Regulation. Electronic acceptance constitutes agreement to all terms.</p>
        <p><strong>Entire Agreement:</strong> This contract represents the entire agreement between the parties and supersedes all prior negotiations, representations, or agreements. No modification shall be valid unless in writing and signed by both parties.</p>
        <p><strong>Severability:</strong> If any provision of this contract is found to be unenforceable, the remaining provisions shall continue in full force and effect.</p>
        <p><strong>Contract Validity:</strong> This contract remains valid and enforceable regardless of changes in circumstances, location, or contact information of either party.</p>
      </div>

      <div style="margin-top: 30px; padding: 15px; text-align: center; border-top: 1px solid #ccc; color: #999; font-size: 12px;">
        <p style="margin: 0;">Powered by <strong style="color: #9333ea;">MusoBuddy</strong> – less admin, more music.</p>
      </div>
    </body>
    </html>
  `;
}