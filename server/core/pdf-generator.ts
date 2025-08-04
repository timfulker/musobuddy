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
  const businessAddress = userSettings?.businessAddress || '';
  const businessPhone = userSettings?.phone || '';

  // Helper functions
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  const formatAddress = (addressStr: string) => {
    if (!addressStr) return '';
    return addressStr.split(',').map((part: string) => part.trim()).join('<br>');
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>MusoBuddy Performance Contract</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    html, body {
      background: #f4f6fa;
      color: #222;
      font-family: 'Inter', Arial, sans-serif;
      font-size: 11px;
      line-height: 1.3;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: #fff;
      padding: 18px 10px 10px 10px;
      box-shadow: 0 2px 8px #e0e7ef;
    }
    .header {
      background: #3b82f6;
      color: #fff;
      padding: 16px 0 10px 0;
      margin-bottom: 18px;
      border-radius: 0 0 6px 6px;
      text-align: center;
    }
    .header h1 {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 4px;
      letter-spacing: 0.5px;
    }
    .header .subtitle {
      font-size: 11px;
      opacity: 0.92;
    }
    .two-column {
      display: flex;
      gap: 12px;
      margin-bottom: 10px;
    }
    .column {
      flex: 1;
      background: #f4f6fa;
      padding: 10px 10px 6px 10px;
      border-radius: 6px;
      border-left: 3px solid #3b82f6;
    }
    .column h3 {
      color: #3b82f6;
      font-size: 11px;
      font-weight: 600;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .column p {
      margin-bottom: 4px;
      font-size: 11px;
    }
    .event-table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0 0 0;
      background: #fff;
      border-radius: 6px;
      overflow: hidden;
      box-shadow: 0 1px 4px #e0e7ef;
    }
    .event-table th {
      background: #3b82f6;
      color: #fff;
      padding: 6px;
      text-align: left;
      font-weight: 600;
      font-size: 11px;
    }
    .event-table td {
      padding: 6px;
      border-bottom: 1px solid #e0e7ef;
      font-size: 11px;
    }
    .event-table tr:last-child td {
      border-bottom: none;
    }
    .event-table .label {
      font-weight: 600;
      color: #334155;
      width: 32%;
    }
    .fee-highlight {
      background: #e0e7ef;
      color: #3b82f6;
      font-size: 14px;
      text-align: center;
      padding: 8px;
      border-radius: 6px;
      margin: 12px 0 0 0;
      font-weight: 600;
      box-shadow: 0 2px 8px #e0e7ef;
    }
    .fee-highlight .label {
      font-size: 10px;
      color: #334155;
      font-weight: 400;
      margin-top: 2px;
    }
    .section-header {
      color: #334155;
      background: #e0e7ef;
      font-size: 12px;
      font-weight: 600;
      padding: 6px 10px;
      border-radius: 6px;
      margin: 18px 0 8px 0;
      letter-spacing: 0.5px;
    }
    .section-header.terms {
      page-break-before: always;
      break-before: page;
    }
    .terms-section {
      background: #f4f6fa;
      padding: 10px 8px;
      border-radius: 6px;
      margin: 8px 0;
      border-left: 3px solid #3b82f6;
    }
    .terms-section h4 {
      color: #3b82f6;
      font-size: 11px;
      font-weight: 600;
      margin-bottom: 6px;
      text-transform: uppercase;
    }
    .terms-section p, .terms-section ul {
      font-size: 10px;
      line-height: 1.4;
      margin-bottom: 4px;
      color: #475569;
    }
    .terms-section ul {
      padding-left: 16px;
    }
    .terms-section li {
      margin-bottom: 2px;
    }
    .signature-section {
      margin-top: 12px;
      display: flex;
      gap: 12px;
    }
    .signature-box {
      flex: 1;
      border: 2px solid #3b82f6;
      border-radius: 6px;
      padding: 10px 6px 8px 6px;
      text-align: center;
      background: #fff;
      min-height: 60px;
      position: relative;
    }
    .signature-box h4 {
      color: #3b82f6;
      font-size: 11px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .signature-line {
      border-bottom: 2px solid #3b82f6;
      margin: 10px 0 4px 0;
      height: 18px;
    }
    .signature-box .date-line {
      font-size: 10px;
      color: #64748b;
      margin-top: 4px;
    }
    .signed-indicator {
      background: #059669;
      color: white;
      padding: 4px 8px;
      border-radius: 20px;
      font-size: 9px;
      font-weight: 600;
      display: inline-block;
      margin-top: 4px;
    }
    .footer {
      background: #3b82f6;
      color: white;
      padding: 6px 0 4px 0;
      text-align: center;
      font-size: 10px;
      border-radius: 6px 6px 0 0;
      margin-top: 10px;
    }
    .footer .brand {
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 2px;
    }
    .footer .contract-ref {
      font-size: 9px;
      opacity: 0.7;
    }
    @media print {
      .header, .footer { background: #3b82f6 !important; }
      .section-header, .event-table th { background: #e0e7ef !important; color: #334155 !important; }
      .fee-highlight { background: #e0e7ef !important; color: #3b82f6 !important; }
      .section-header.terms { page-break-before: always; break-before: page; }
      .event-table, .fee-highlight, .section-header, .terms-section, .signature-section { page-break-inside: avoid; break-inside: avoid; }
      .section-header { page-break-after: avoid; break-after: avoid; }
      .footer { border-radius: 0; box-shadow: none; }
    }
    @media (max-width: 700px) {
      .container { padding: 6px; }
      .two-column, .signature-section { flex-direction: column; gap: 8px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>Performance Contract</h1>
      <div class="subtitle">Contract #${contract.contractNumber || 'DRAFT'} • Generated ${new Date().toLocaleDateString('en-GB')}</div>
    </div>

    <!-- Parties Section -->
    <div class="two-column">
      <div class="column">
        <h3>Performer Details</h3>
        <p><strong>${businessName}</strong></p>
        ${businessEmail ? `<p>Email: ${businessEmail}</p>` : ''}
        ${businessPhone ? `<p>Phone: ${businessPhone}</p>` : ''}
        ${businessAddress ? `<p style="font-size:10px; color:#64748b;">Address: ${formatAddress(businessAddress)}</p>` : ''}
      </div>
      <div class="column">
        <h3>Client Details</h3>
        <p><strong>${contract.clientName}</strong></p>
        ${contract.clientEmail ? `<p>Email: ${contract.clientEmail}</p>` : ''}
        ${contract.clientPhone ? `<p>Phone: ${contract.clientPhone}</p>` : ''}
        ${contract.clientAddress ? `<p>Address: ${formatAddress(contract.clientAddress)}</p>` : ''}
      </div>
    </div>

    <!-- Event Details Section -->
    <div class="section-header">Event Details</div>
    <table class="event-table">
      <tr>
        <td class="label">Event Date:</td>
        <td><strong>${contract.eventDate ? formatDate(contract.eventDate) : 'To be confirmed'}</strong></td>
      </tr>
      <tr>
        <td class="label">Event Time:</td>
        <td>${contract.eventTime || 'TBC'} - ${contract.eventEndTime || 'TBC'}</td>
      </tr>
      <tr>
        <td class="label">Venue:</td>
        <td><strong>${contract.venue || 'To be confirmed'}</strong></td>
      </tr>
      <tr>
        <td class="label">Venue Address:</td>
        <td>${contract.venueAddress || 'To be confirmed'}</td>
      </tr>
      <tr>
        <td class="label">Performance Type:</td>
        <td>${userSettings?.primaryInstrument ? `${userSettings.primaryInstrument} Performance` : 'Live Music Performance'}</td>
      </tr>
    </table>

    <!-- Fee Highlight -->
    <div class="fee-highlight">
      £${contract.fee || '0.00'}
      <div class="label">Total Performance Fee</div>
      ${contract.deposit && parseFloat(contract.deposit) > 0 ? `<div style="font-size:10px; color:#334155; margin-top:2px;">Deposit Required: £${contract.deposit}</div>` : ''}
    </div>

    <!-- Equipment & Special Requirements -->
    ${(contract.equipmentRequirements || contract.specialRequirements) ? `
      <div class="section-header">Requirements & Specifications</div>
      <div class="terms-section">
        ${contract.equipmentRequirements ? `
          <h4>Equipment Requirements</h4>
          <p>${contract.equipmentRequirements}</p>
        ` : ''}
        ${contract.specialRequirements ? `
          <h4>Special Requirements</h4>
          <p>${contract.specialRequirements}</p>
        ` : ''}
      </div>
    ` : ''}

    <!-- Terms & Conditions (start on page 2) -->
    <div class="section-header terms">Terms & Conditions</div>
    <div class="terms-section">
      <h4>Payment Terms & Conditions</h4>
      <ul>
        <li><strong>Payment Due Date:</strong> Full payment of £${contract.fee || '0.00'} becomes due and payable no later than the day of performance. Payment must be received before or immediately upon completion of the performance.</li>
        <li><strong>Payment Methods:</strong> Cash or bank transfer to the performer's designated account (details provided separately).</li>
        <li><strong>Deposit:</strong> £${contract.deposit || '0.00'} deposit required to secure booking. Deposit is non-refundable except as outlined in the cancellation policy below.</li>
        <li><strong>Late Payment:</strong> Any payment received after the due date may incur a late payment fee of £25 plus interest at 2% per month.</li>
      </ul>
    </div>
    <div class="terms-section">
      <h4>Cancellation & Refund Policy</h4>
      <ul>
        <li><strong>Client Cancellation:</strong>
          <ul>
            <li>More than 30 days before event: Any deposit paid will be refunded minus a £50 administration fee.</li>
            <li>30 days or less before event: Full performance fee becomes due regardless of cancellation.</li>
            <li>Same day cancellation: Full fee due plus any additional costs incurred.</li>
          </ul>
        </li>
        <li><strong>Performer Cancellation:</strong> In the unlikely event the performer must cancel due to circumstances within their control, all payments will be refunded in full and reasonable assistance will be provided to find a suitable replacement.</li>
        <li><strong>Rescheduling:</strong> Event may be rescheduled once without penalty if agreed by both parties at least 14 days in advance. Additional rescheduling requests may incur a £25 administrative fee.</li>
      </ul>
    </div>
    <div class="terms-section">
      <h4>Force Majeure</h4>
      <p>Neither party shall be liable for any failure to perform due to circumstances beyond their reasonable control, including but not limited to: severe weather, natural disasters, government restrictions, venue closure, or serious illness.</p>
    </div>
    <div class="terms-section">
      <h4>Performance Contingencies</h4>
      <ul>
        <li>The performer will provide appropriate backup equipment where reasonably possible. If performance cannot proceed due to venue-related issues (power failure, noise restrictions, etc.), the full fee remains due.</li>
      </ul>
    </div>
    <div class="terms-section">
      <h4>Professional Performance Standards</h4>
      <ul>
        <li><strong>Payment Schedule:</strong> The agreed performance fee (including applicable VAT) becomes due and payable on the date of performance of the engagement.</li>
        <li><strong>Equipment & Instrument Protection:</strong> The equipment and instruments of the performer are not available for use by any other person, except by specific permission of the performer. All musical instruments and equipment remain the exclusive property of the performer.</li>
        <li><strong>Venue Safety Requirements:</strong> The client shall ensure a safe supply of electricity and the security of the performer and their property at the venue throughout the engagement.</li>
        <li><strong>Recording & Transmission Policy:</strong> The client shall not make or permit the making of any audio and/or visual recording or transmission of the performer's performance without the prior written consent of the performer.</li>
        <li><strong>Contract Modifications:</strong> This agreement may not be modified or cancelled except by mutual consent, in writing signed by both parties. Verbal modifications are not binding.</li>
        <li><strong>Performance Rider:</strong> Any rider attached hereto and signed by both parties shall be deemed incorporated into this agreement.</li>
        <li><strong>Safe Space Principle:</strong> The client and performer agree to a 'Safe Space' principle to provide a working environment free from harassment and discrimination, maintaining respectful professional standards throughout the engagement.</li>
        <li><strong>Professional Insurance:</strong> The performer maintains professional liability insurance as required for musical performance engagements.</li>
      </ul>
    </div>

    <!-- Signature Section (page 3) -->
    <div class="signature-section">
      <div class="signature-box">
        <h4>Client Signature</h4>
        <div class="signature-line"></div>
        <p><strong>${contract.clientName}</strong></p>
        <div class="date-line">Date: ________________</div>
        ${signatureDetails?.signedAt && signatureDetails?.signatureName ? `
          <div class="signed-indicator">
            ✓ Signed on ${new Date(signatureDetails.signedAt).toLocaleDateString('en-GB')}
          </div>
        ` : ''}
      </div>
      <div class="signature-box">
        <h4>Performer Signature</h4>
        <div class="signature-line"></div>
        <p><strong>${businessName}</strong></p>
        <div class="date-line">Date: ________________</div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="brand">MusoBuddy</div>
      <div class="contract-ref">
        Contract Reference: (${contract.contractNumber || 'DRAFT'} - ${contract.clientName || ''}) • 
        Generated: ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-GB')}
        ${contract.id ? ` • ID: ${contract.id}` : ''}
      </div>
    </div>
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