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
  console.log('🔄 Generating professional contract PDF...');

  try {
    const htmlContent = generateContractHTML(contract, userSettings, signatureDetails);

    const browser = await puppeteer.launch({
      headless: true,
      executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-extensions',
        '--no-first-run'
      ]
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      }
    });

    await browser.close();
    console.log('✅ PDF generated successfully');
    return pdfBuffer;

  } catch (error) {
    console.error('❌ PDF generation failed:', error);
    throw new Error(`PDF generation failed: ${error.message}`);
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
  const businessName = userSettings?.businessName || 'Professional Musician';
  const businessEmail = userSettings?.businessEmail || '';
  const businessPhone = userSettings?.phone || '';

  // Build complete business address from detailed fields
  const addressParts = [];
  if (userSettings?.addressLine1) addressParts.push(userSettings.addressLine1);
  if (userSettings?.addressLine2) addressParts.push(userSettings.addressLine2);
  if (userSettings?.city) addressParts.push(userSettings.city);
  if (userSettings?.county) addressParts.push(userSettings.county);
  if (userSettings?.postcode) addressParts.push(userSettings.postcode);

  const businessAddress = addressParts.length > 0 ? addressParts.join(', ') : 
                         (userSettings?.businessAddress || '');

  const logoBase64 = getLogoBase64();
  const logoHtml = logoBase64 ? 
    `<img src="data:image/png;base64,${logoBase64}" alt="MusoBuddy Logo" style="height: 40px; margin-bottom: 15px;">` : 
    '<div style="color: #9333ea; font-weight: bold; font-size: 24px; margin-bottom: 15px; font-family: \'Segoe UI\', sans-serif;">MusoBuddy</div>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Performance Contract</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: white;
      font-size: 12px;
      padding: 20px;
    }

    /* CRITICAL FIX: Remove all page break forcing properties */
    .contract-header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 15px;
      border-bottom: 3px solid #9333ea;
      /* REMOVED: page-break-inside: avoid; */
      /* REMOVED: page-break-after: avoid; */
    }

    .contract-title {
      font-size: 24px; /* Reduced from 28px to save space */
      font-weight: bold;
      color: #9333ea;
      margin: 10px 0; /* Reduced margin */
    }

    .contract-number {
      font-size: 14px; /* Reduced from 16px */
      color: #666;
      font-weight: 500;
    }

    .draft-label {
      font-size: 16px; /* Reduced from 18px */
      font-weight: bold;
      color: #9333ea;
      background: linear-gradient(135deg, #f3e8ff, #e879f9);
      padding: 6px 16px; /* Reduced padding */
      border-radius: 20px;
      display: inline-block;
      margin: 10px 0; /* Reduced margin */
    }

    .section {
      margin-bottom: 20px; /* Reduced from 30px */
      /* CRITICAL: Allow sections to break across pages */
      page-break-inside: auto;
    }

    .section-title {
      font-size: 16px; /* Reduced from 18px */
      font-weight: bold;
      color: #9333ea;
      margin-bottom: 12px; /* Reduced from 15px */
      padding-bottom: 4px; /* Reduced from 5px */
      border-bottom: 2px solid #9333ea;
    }

    .performer-details {
      text-align: left;
      margin-bottom: 20px; /* Reduced from 30px */
    }

    .event-details-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px; /* Reduced from 20px */
    }

    .event-details-table td {
      padding: 6px; /* Reduced from 8px */
      border: 1px solid #ccc;
      vertical-align: top;
      font-size: 11px; /* Slightly smaller text */
    }

    .event-details-table .label {
      font-weight: bold;
      background: linear-gradient(135deg, #9333ea, #7c3aed);
      color: white;
      width: 30%;
    }

    /* CRITICAL FIX: Make terms section breakable */
    .terms-section {
      margin-top: 20px; /* Reduced from 30px */
      font-size: 10px; /* Reduced from 11px */
      line-height: 1.4; /* Reduced from 1.6 */
      /* CRITICAL: Allow terms to break across pages */
      page-break-inside: auto;
    }

    .terms-section h3 {
      font-size: 13px; /* Reduced from 14px */
      font-weight: bold;
      margin: 15px 0 8px 0; /* Reduced margins */
      text-decoration: underline;
      /* Allow headings to break if needed */
      page-break-after: auto;
    }

    .terms-section h4 {
      font-size: 11px; /* Reduced from 12px */
      font-weight: bold;
      margin: 12px 0 6px 0; /* Reduced margins */
      page-break-after: auto;
    }

    .terms-section ul {
      margin-left: 25px; /* Reduced from 30px */
      margin-bottom: 12px; /* Reduced from 15px */
    }

    .terms-section li {
      margin-bottom: 6px; /* Reduced from 8px */
    }

    .terms-section p {
      margin-bottom: 8px; /* Reduced from default */
    }

    /* CRITICAL FIX: Only prevent signature section from breaking */
    .signature-section {
      margin-top: 30px; /* Reduced from 40px */
      page-break-inside: avoid; /* Keep signatures together */
      page-break-before: auto; /* But allow natural page breaks before */
    }

    .signature-block {
      margin: 20px 0; /* Reduced from 30px */
      border: 2px solid #9333ea;
      background: linear-gradient(135deg, #faf5ff, #f3e8ff);
      padding: 15px; /* Reduced from 20px */
      border-radius: 8px;
      min-height: 60px; /* Reduced from 80px */
      page-break-inside: avoid; /* Keep individual signature blocks together */
    }

    .signature-block h4 {
      font-size: 14px; /* Reduced from 16px */
      font-weight: bold;
      color: #9333ea;
      margin-bottom: 10px; /* Reduced from 15px */
      border-bottom: 1px solid #9333ea;
      padding-bottom: 4px; /* Reduced from 5px */
    }

    .signature-info {
      margin: 8px 0; /* Reduced from 10px */
    }

    .legal-footer {
      margin-top: 30px; /* Reduced from 40px */
      font-size: 9px; /* Reduced from 10px */
      border-top: 1px solid #ccc;
      padding-top: 15px; /* Reduced from 20px */
      page-break-inside: auto; /* Allow footer to break if needed */
    }

    .legal-footer h4 {
      font-size: 11px; /* Reduced from 12px */
      font-weight: bold;
      margin-bottom: 8px; /* Reduced from 10px */
    }

    .powered-by {
      text-align: center;
      margin-top: 20px; /* Reduced from 30px */
      font-style: italic;
      font-size: 10px; /* Reduced from 11px */
    }

    .fee-highlight {
      background: linear-gradient(135deg, #9333ea, #7c3aed);
      color: white;
      padding: 12px; /* Reduced from 15px */
      border-radius: 8px;
      text-align: center;
      font-size: 16px; /* Reduced from 18px */
      font-weight: bold;
      margin: 15px 0; /* Reduced from 20px */
    }

    /* CRITICAL FIX: Override any forced page breaks */
    * {
      page-break-after: auto !important;
      page-break-before: auto !important;
    }

    /* Only allow these specific elements to avoid page breaks */
    .signature-section,
    .signature-block {
      page-break-inside: avoid !important;
    }

    /* Ensure content flows naturally */
    .contract-header,
    .section,
    .terms-section,
    .legal-footer {
      page-break-inside: auto !important;
      page-break-after: auto !important;
      page-break-before: auto !important;
    }
  </style>
</head>
<body>
  <!-- CONTRACT HEADER -->
  <div class="contract-header">
    ${logoHtml}
    <div class="contract-title">Performance Contract</div>
    <div class="contract-number">${contract.contractNumber}</div>
    <div class="draft-label">DRAFT</div>
  </div>

  <!-- PERFORMER DETAILS -->
  <div class="section">
    <div class="section-title">Performer Details</div>
    <div class="performer-details">
      ${businessName}<br>
      ${businessAddress ? `${businessAddress}<br>` : ''}
      ${businessPhone ? `Phone: ${businessPhone}<br>` : ''}
      ${businessEmail ? `Email: ${businessEmail}<br>` : ''}
    </div>
  </div>

  <!-- EVENT DETAILS -->
  <div class="section">
    <div class="section-title">Event Details</div>
    <table class="event-details-table">
      <tr>
        <td class="label">Client Name</td>
        <td>${contract.clientName}</td>
      </tr>
      <tr>
        <td class="label">Client Email</td>
        <td>${contract.clientEmail || 'Not provided'}</td>
      </tr>
      <tr>
        <td class="label">Client Address</td>
        <td>${contract.clientAddress || 'Not provided'}</td>
      </tr>
      <tr>
        <td class="label">Client Phone</td>
        <td>${contract.clientPhone || 'Not provided'}</td>
      </tr>
      <tr>
        <td class="label">Event Date</td>
        <td>${new Date(contract.eventDate).toLocaleDateString('en-GB', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        })}</td>
      </tr>
      <tr>
        <td class="label">Event Time</td>
        <td>${contract.eventTime || 'TBC'}</td>
      </tr>
      <tr>
        <td class="label">Venue</td>
        <td>${contract.venue || 'TBC'}</td>
      </tr>
      <tr>
        <td class="label">Performance Fee</td>
        <td><div class="fee-highlight">£${contract.fee || '0.00'}</div></td>
      </tr>
    </table>
  </div>

  <!-- TERMS AND CONDITIONS -->
  <div class="terms-section">
    <div class="section-title">Terms and Conditions</div>

    <h3>Payment Terms & Conditions</h3>
    <p><strong>Payment Due Date:</strong> Full payment of £${contract.fee || '0.00'} becomes due and payable no later than the day of performance. Payment must be received before or immediately upon completion of the performance.</p>

    <p><strong>Payment Methods:</strong> Cash or bank transfer to the performer's designated account (details provided separately).</p>

    ${contract.deposit && parseFloat(contract.deposit.toString()) > 0 ? `
    <p><strong>Deposit:</strong> £${contract.deposit} deposit required to secure booking. Deposit is non-refundable except as outlined in the cancellation policy below.</p>
    ` : ''}

    <p><strong>Late Payment:</strong> Any payment received after the due date may incur a late payment fee of £25 plus interest at 2% per month.</p>

    <h3>Cancellation & Refund Policy</h3>
    <h4>Client Cancellation:</h4>
    <ul>
      <li><strong>More than 30 days before event:</strong> Any deposit paid will be refunded minus a £50 administration fee</li>
      <li><strong>30 days or less before event:</strong> Full performance fee becomes due regardless of cancellation</li>
      <li><strong>Same day cancellation:</strong> Full fee due plus any additional costs incurred</li>
    </ul>

    <p><strong>Performer Cancellation:</strong> In the unlikely event the performer must cancel due to circumstances within their control, all payments will be refunded in full and reasonable assistance will be provided to find a suitable replacement.</p>

    <p><strong>Rescheduling:</strong> Event may be rescheduled once without penalty if agreed by both parties at least 14 days in advance. Additional rescheduling requests may incur a £25 administrative fee.</p>

    <h3>Force Majeure</h3>
    <p>Neither party shall be liable for any failure to perform due to circumstances beyond their reasonable control, including but not limited to: severe weather, natural disasters, government restrictions, venue closure, or serious illness.</p>

    <h3>Performance Contingencies</h3>
    <p>The performer will provide appropriate backup equipment where reasonably possible. If performance cannot proceed due to venue-related issues (power failure, noise restrictions, etc.), the full fee remains due.</p>

    <h3>Professional Performance Standards</h3>
    <p><strong>Payment Schedule:</strong> The agreed performance fee (including applicable VAT) becomes due and payable on the date of performance of the engagement.</p>

    <p><strong>Equipment & Instrument Protection:</strong> The equipment and instruments of the performer are not available for use by any other person, except by specific permission of the performer. All musical instruments and equipment remain the exclusive property of the performer.</p>

    <p><strong>Venue Safety Requirements:</strong> The client shall ensure a safe supply of electricity and the security of the performer and their property at the venue throughout the engagement.</p>

    <p><strong>Recording & Transmission Policy:</strong> The client shall not make or permit the making of any audio and/or visual recording or transmission of the performer's performance without the prior written consent of the performer.</p>

    <p><strong>Contract Modifications:</strong> This agreement may not be modified or cancelled except by mutual consent, in writing signed by both parties. Verbal modifications are not binding.</p>

    <p><strong>Performance Rider:</strong> Any rider attached hereto and signed by both parties shall be deemed incorporated into this agreement.</p>

    <p><strong>Safe Space Principle:</strong> The client and performer agree to a 'Safe Space' principle to provide a working environment free from harassment and discrimination, maintaining respectful professional standards throughout the engagement.</p>

    <p><strong>Professional Insurance:</strong> The performer maintains professional liability insurance as required for musical performance engagements.</p>
  </div>

  <!-- SIGNATURES -->
  <div class="signature-section">
    <div class="section-title">Signatures</div>

    <div class="signature-block">
      <h4>Performer</h4>
      <div class="signature-info">
        <p><strong>Signed by:</strong> ${businessName}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-GB')}</p>
        <p><strong>Status:</strong> Agreed by sending contract</p>
      </div>
    </div>

    <div class="signature-block">
      <h4>Client</h4>
      <div class="signature-info">
        ${signatureDetails ? `
          <p><strong>Signed by:</strong> ${signatureDetails.signatureName || contract.clientName}</p>
          <p><strong>Date:</strong> ${new Date(signatureDetails.signedAt).toLocaleDateString('en-GB')}</p>
          <p><strong>Status:</strong> Contract Signed</p>
        ` : `
          <p><strong>Status:</strong> Awaiting Signature</p>
          <p>This contract has been sent to ${contract.clientEmail} for digital signature.</p>
        `}
      </div>
    </div>
  </div>

  <!-- LEGAL INFORMATION -->
  <div class="legal-footer">
    <h4>Legal Information & Governing Terms:</h4>
    <p><strong>Contract Number:</strong> ${contract.contractNumber}</p>
    <p><strong>Generated:</strong> ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB')}</p>

    <p><strong>Binding Agreement:</strong> This is a legally binding agreement between the parties named above. Both parties acknowledge they have read, understood, and agree to be bound by all terms and conditions set forth herein.</p>

    <p><strong>Governing Law & Jurisdiction:</strong> This contract shall be governed by and construed in accordance with the laws of England and Wales. Any disputes, claims, or legal proceedings arising from or relating to this agreement shall be subject to the exclusive jurisdiction of the courts of England and Wales.</p>

    <p><strong>Digital Signatures:</strong> Digital signatures are legally binding under the Electronic Communications Act 2000 and eIDAS Regulation. Electronic acceptance constitutes agreement to all terms.</p>

    <p><strong>Entire Agreement:</strong> This contract represents the entire agreement between the parties and supersedes all prior negotiations, representations, or agreements. No modification shall be valid unless in writing and signed by both parties.</p>

    <p><strong>Severability:</strong> If any provision of this contract is found to be unenforceable, the remaining provisions shall continue in full force and effect.</p>

    <p><strong>Contract Validity:</strong> This contract remains valid and enforceable regardless of changes in circumstances, location, or contact information of either party.</p>
  </div>

  <div class="powered-by" style="text-align: center; margin-top: 20px; color: #9333ea; font-weight: bold; font-size: 11px;">
    Powered by <span style="color: #9333ea; font-weight: bold;">MusoBuddy</span> – less admin, more music.
  </div>
</body>
</html>`;
}

export async function generateInvoicePDF(
  invoice: Invoice,
  userSettings: UserSettings | null
): Promise<Buffer> {
  console.log('🔄 Generating professional invoice PDF...');

  try {
    const htmlContent = generateInvoiceHTML(invoice, userSettings);

    const browser = await puppeteer.launch({
      headless: true,
      executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-extensions',
        '--no-first-run'
      ]
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      }
    });

    await browser.close();
    console.log('✅ Invoice PDF generated successfully');
    return pdfBuffer;

  } catch (error) {
    console.error('❌ Invoice PDF generation failed:', error);
    throw new Error(`Invoice PDF generation failed: ${error.message}`);
  }
}

function generateInvoiceHTML(
  invoice: Invoice,
  userSettings: UserSettings | null
): string {
  const businessName = userSettings?.businessName || 'Professional Musician';
  const businessEmail = userSettings?.businessEmail || '';
  const businessAddress = userSettings?.businessAddress || '';
  const businessPhone = userSettings?.phone || '';

  const logoBase64 = getLogoBase64();
  const logoHtml = logoBase64 ? 
    `<img src="data:image/png;base64,${logoBase64}" alt="MusoBuddy Logo" style="height: 40px; margin-bottom: 10px;">` : 
    '<div style="color: #9333ea; font-weight: bold; font-size: 24px; margin-bottom: 10px;">MusoBuddy</div>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
    .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #9333ea; }
    .invoice-title { font-size: 28px; font-weight: bold; color: #9333ea; margin: 15px 0; }
    .invoice-number { font-size: 16px; color: #666; }
    .section { margin-bottom: 25px; }
    .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .detail-item { margin-bottom: 12px; }
    .detail-label { font-weight: bold; color: #555; }
    .total-highlight { background: #9333ea; color: white; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; margin: 20px 0; }
    .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    ${logoHtml}
    <div class="invoice-title">INVOICE</div>
    <div class="invoice-number">Invoice Number: ${invoice.invoiceNumber}</div>
  </div>

  <div class="section">
    <div class="details-grid">
      <div>
        <h3>From:</h3>
        <div>${businessName}</div>
        ${businessAddress ? `<div>${businessAddress}</div>` : ''}
        ${businessPhone ? `<div>Phone: ${businessPhone}</div>` : ''}
        ${businessEmail ? `<div>Email: ${businessEmail}</div>` : ''}
      </div>
      <div>
        <h3>To:</h3>
        <div>${invoice.clientName}</div>
        ${invoice.clientEmail ? `<div>Email: ${invoice.clientEmail}</div>` : ''}
        ${invoice.clientAddress ? `<div>${invoice.clientAddress}</div>` : ''}
      </div>
    </div>
  </div>

  <div class="section">
    <div class="detail-item">
      <span class="detail-label">Invoice Date:</span> ${new Date(invoice.issueDate).toLocaleDateString('en-GB')}
    </div>
    <div class="detail-item">
      <span class="detail-label">Due Date:</span> ${new Date(invoice.dueDate).toLocaleDateString('en-GB')}
    </div>
    <div class="detail-item">
      <span class="detail-label">Performance Date:</span> ${new Date(invoice.performanceDate).toLocaleDateString('en-GB')}
    </div>
  </div>

  <div class="total-highlight">
    Total Amount: £${invoice.amount}
  </div>

  <div class="footer">
    <p>Generated by <strong style="color: #9333ea;">MusoBuddy</strong> – Professional Music Business Management</p>
    <p>Invoice generated on ${new Date().toLocaleDateString('en-GB')}</p>
  </div>
</body>
</html>`;
}