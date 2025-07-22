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

function generateContractHTML(
  contract: Contract,
  userSettings: UserSettings | null,
  signatureDetails?: {
    signedAt: Date;
    signatureName?: string;
    clientIpAddress?: string;
  }
): string {
  // Format date exactly like Andy Urquahart contract: DD/MM/YYYY format
  const eventDate = new Date(contract.eventDate);
  const formattedDate = eventDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric'
  });
  
  // Format full event date like in Andy Urquahart: "Sunday 10 August 2025"
  const fullEventDate = eventDate.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

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
          color: #000;
          max-width: 800px;
          margin: 0 auto;
          padding: 40px 50px;
          font-size: 12px;
        }
        .header {
          text-align: center;
          margin-bottom: 60px;
        }
        .title {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 20px;
        }
        .subtitle {
          font-size: 14px;
          margin-bottom: 20px;
        }
        .draft-status {
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 40px;
        }
        .section {
          margin-bottom: 30px;
        }
        .section-title {
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 15px;
        }
        .performer-details {
          margin-bottom: 30px;
        }
        .event-details table {
          width: 100%;
          border-collapse: collapse;
        }
        .event-details td {
          padding: 8px 0;
          vertical-align: top;
        }
        .event-details .label {
          width: 30%;
          font-weight: bold;
        }
        .event-details .value {
          width: 70%;
        }
        .terms-section {
          margin-top: 30px;
        }
        .terms-title {
          font-size: 14px;
          font-weight: bold;
          margin: 20px 0 10px 0;
        }
        .terms-content {
          margin-bottom: 15px;
          text-align: justify;
        }
        .signature-section {
          margin-top: 40px;
        }
        .signature-block {
          margin-bottom: 40px;
        }
        .signature-title {
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 20px;
        }
        .signature-details {
          margin-top: 15px;
        }
        .legal-footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #ccc;
          font-size: 10px;
          text-align: justify;
        }
        .footer-branding {
          text-align: center;
          margin-top: 30px;
          font-size: 12px;
          font-style: italic;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">Performance Contract</div>
        <div class="subtitle">(${formattedDate} - ${contract.clientName})</div>
        <div class="draft-status">DRAFT</div>
      </div>

      <div class="section performer-details">
        <div class="section-title">Performer Details</div>
        <div>Tim Fulker</div>
        <div>59, Gloucester Rd Bournemouth Dorset BH7 6JA</div>
        <div>Phone: 07765190034</div>
        <div>Email: timfulkermusic@gmail.com</div>
      </div>

      <div class="section event-details">
        <div class="section-title">Event Details</div>
        <table>
          <tr>
            <td class="label">Client Name</td>
            <td class="value">${contract.clientName || ''}</td>
          </tr>
          <tr>
            <td class="label">Client Email</td>
            <td class="value">${contract.clientEmail || ''}</td>
          </tr>
          <tr>
            <td class="label">Client Address</td>
            <td class="value">${contract.clientAddress || ''}</td>
          </tr>
          <tr>
            <td class="label">Client Phone</td>
            <td class="value">${contract.clientPhone || ''}</td>
          </tr>
          <tr>
            <td class="label">Event Date</td>
            <td class="value">${fullEventDate}</td>
          </tr>
          <tr>
            <td class="label">Event Time</td>
            <td class="value">${contract.eventTime || ''}</td>
          </tr>
          <tr>
            <td class="label">Venue</td>
            <td class="value">${contract.venue || ''}</td>
          </tr>
          <tr>
            <td class="label">Performance Fee</td>
            <td class="value">£${parseFloat(contract.fee || '0').toFixed(2)}</td>
          </tr>
        </table>
      </div>

      <div class="section terms-section">
        <div class="section-title">Terms and Conditions</div>
        
        <div class="terms-title">Payment Terms & Conditions</div>
        <div class="terms-content">
          Payment Due Date: Full payment of £${parseFloat(contract.fee || '0').toFixed(2)} becomes due and payable no later than the day of performance. Payment must be received before or immediately upon completion of the performance.
          <br><br>
          Payment Methods: Cash or bank transfer to the performer's designated account (details provided separately).
          <br><br>
          Deposit: £0.00 deposit required to secure booking. Deposit is non-refundable except as outlined in the cancellation policy below.
          <br><br>
          Late Payment: Any payment received after the due date may incur a late payment fee of £25 plus interest at 2% per month.
        </div>

        <div class="terms-title">Cancellation & Refund Policy</div>
        <div class="terms-content">
          Client Cancellation:
          <br><br>
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;More than 30 days before event: Any deposit paid will be refunded minus a £50 administration fee
          <br>
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;30 days or less before event: Full performance fee becomes due regardless of cancellation
          <br>
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Same day cancellation: Full fee due plus any additional costs incurred
          <br><br>
          Performer Cancellation: In the unlikely event the performer must cancel due to circumstances within their control, all payments will be refunded in full and reasonable assistance will be provided to find a suitable replacement.
          <br><br>
          Rescheduling: Event may be rescheduled once without penalty if agreed by both parties at least 14 days in advance. Additional rescheduling requests may incur a £25 administrative fee.
        </div>

        <div class="terms-title">Force Majeure</div>
        <div class="terms-content">
          Neither party shall be liable for any failure to perform due to circumstances beyond their reasonable control, including but not limited to: severe weather, natural disasters, government restrictions, venue closure, or serious illness.
        </div>

        <div class="terms-title">Performance Contingencies</div>
        <div class="terms-content">
          The performer will provide appropriate backup equipment where reasonably possible. If performance cannot proceed due to venue-related issues (power failure, noise restrictions, etc.), the full fee remains due.
        </div>

        <div class="terms-title">Professional Performance Standards</div>
        <div class="terms-content">
          Payment Schedule: The agreed performance fee (including applicable VAT) becomes due and payable on the date of performance of the engagement.
          <br><br>
          Equipment & Instrument Protection: The equipment and instruments of the performer are not available for use by any other person, except by specific permission of the performer. All musical instruments and equipment remain the exclusive property of the performer.
          <br><br>
          Venue Safety Requirements: The client shall ensure a safe supply of electricity and the security of the performer and their property at the venue throughout the engagement.
          <br><br>
          Recording & Transmission Policy: The client shall not make or permit the making of any audio and/or visual recording or transmission of the performer's performance without the prior written consent of the performer.
          <br><br>
          Contract Modifications: This agreement may not be modified or cancelled except by mutual consent, in writing signed by both parties. Verbal modifications are not binding.
          <br><br>
          Performance Rider: Any rider attached hereto and signed by both parties shall be deemed incorporated into this agreement.
          <br><br>
          Safe Space Principle: The client and performer agree to a 'Safe Space' principle to provide a working environment free from harassment and discrimination, maintaining respectful professional standards throughout the engagement.
          <br><br>
          Professional Insurance: The performer maintains professional liability insurance as required for musical performance engagements.
        </div>
      </div>

      <div class="signature-section">
        <div class="section-title">Signatures</div>
        
        <div class="signature-block">
          <div class="signature-title">Performer</div>
          <div class="signature-details">
            Signed by: Tim Fulker<br>
            Date: ${new Date().toLocaleDateString('en-GB')}<br>
            Status: Agreed by sending contract
          </div>
        </div>

        <div class="signature-block">
          <div class="signature-title">Client</div>
          <div class="signature-details">
            ${signatureDetails ? 
              `Signed by: ${signatureDetails.signatureName}<br>Date: ${signatureDetails.signedAt.toLocaleDateString('en-GB')}<br>Status: Digitally Signed` : 
              `Status: Awaiting Signature<br><br>This contract has been sent to ${contract.clientEmail} for digital signature.`
            }
          </div>
        </div>
      </div>

      <div class="legal-footer">
        <div style="margin-bottom: 15px;">
          <strong>Legal Information & Governing Terms:</strong>
        </div>
        <div style="margin-bottom: 10px;">
          <strong>Contract Number:</strong> (${formattedDate} - ${contract.clientName})
        </div>
        <div style="margin-bottom: 10px;">
          <strong>Generated:</strong> ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB')}
        </div>
        
        <div style="margin-top: 15px;">
          Binding Agreement: This is a legally binding agreement between the parties named above. Both parties acknowledge they have read, understood, and agree to be bound by all terms and conditions set forth herein.
          <br><br>
          Governing Law & Jurisdiction: This contract shall be governed by and construed in accordance with the laws of England and Wales. Any disputes, claims, or legal proceedings arising from or relating to this agreement shall be subject to the exclusive jurisdiction of the courts of England and Wales.
          <br><br>
          Digital Signatures: Digital signatures are legally binding under the Electronic Communications Act 2000 and eIDAS Regulation. Electronic acceptance constitutes agreement to all terms.
          <br><br>
          Entire Agreement: This contract represents the entire agreement between the parties and supersedes all prior negotiations, representations, or agreements. No modification shall be valid unless in writing and signed by both parties.
          <br><br>
          Severability: If any provision of this contract is found to be unenforceable, the remaining provisions shall continue in full force and effect.
          <br><br>
          Contract Validity: This contract remains valid and enforceable regardless of changes in circumstances, location, or contact information of either party.
        </div>
      </div>

      <div class="footer-branding">
        Powered by MusoBuddy – less admin, more music.
      </div>
    </body>
    </html>
  `;
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
        ${userSettings?.bankDetails ? `<p><strong>Bank Details:</strong><br>${userSettings.bankDetails.replace(/\n/g, '<br>')}</p>` : ''}
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