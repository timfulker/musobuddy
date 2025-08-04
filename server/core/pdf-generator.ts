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

  const logoBase64 = getLogoBase64();
  const logoHtml = logoBase64 ? 
    `<img src="data:image/png;base64,${logoBase64}" alt="MusoBuddy Logo" style="height: 40px; margin-bottom: 10px;">` : 
    '<div style="color: #9333ea; font-weight: bold; font-size: 24px; margin-bottom: 10px;">MusoBuddy</div>';

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
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 3px solid #9333ea;
    }
    .contract-title {
      font-size: 28px;
      font-weight: bold;
      color: #9333ea;
      margin: 15px 0;
    }
    .contract-number {
      font-size: 16px;
      color: #666;
      font-weight: 500;
    }
    .section {
      margin-bottom: 25px;
    }
    .section-title {
      font-size: 18px;
      font-weight: bold;
      color: #333;
      margin-bottom: 15px;
      padding-bottom: 5px;
      border-bottom: 1px solid #ddd;
    }
    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }
    .detail-item {
      margin-bottom: 12px;
    }
    .detail-label {
      font-weight: bold;
      color: #555;
      display: block;
      margin-bottom: 5px;
    }
    .detail-value {
      color: #333;
    }
    .fee-highlight {
      background: linear-gradient(135deg, #9333ea, #7c3aed);
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      font-size: 24px;
      font-weight: bold;
      margin: 20px 0;
    }
    .terms {
      background-color: #f8fafc;
      padding: 20px;
      border-left: 4px solid #9333ea;
      margin: 20px 0;
      border-radius: 4px;
    }
    .signature-section {
      margin-top: 40px;
      padding: 20px;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
    }
    .signature-box {
      margin: 20px 0;
      padding: 15px;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
    }
    .signature-label {
      font-weight: bold;
      color: #475569;
      margin-bottom: 10px;
    }
    .signature-name {
      font-size: 18px;
      font-weight: bold;
      color: #1e293b;
      margin: 10px 0;
    }
    .signed-indicator {
      color: #059669;
      font-weight: bold;
      font-size: 14px;
    }
    .footer {
      margin-top: 40px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
      padding-top: 20px;
    }
  </style>
</head>
<body>
  <!-- HEADER -->
  <div class="header">
    ${logoHtml}
    <div class="contract-title">PERFORMANCE CONTRACT</div>
    <div class="contract-number">Contract Number: ${contract.contractNumber}</div>
  </div>

  <!-- PARTIES SECTION -->
  <div class="section">
    <div class="section-title">Contracting Parties</div>
    <div class="details-grid">
      <div>
        <div class="detail-item">
          <span class="detail-label">Performer:</span>
          <div class="detail-value">
            ${businessName}<br>
            ${businessAddress ? `${businessAddress}<br>` : ''}
            ${businessPhone ? `Phone: ${businessPhone}<br>` : ''}
            ${businessEmail ? `Email: ${businessEmail}` : ''}
          </div>
        </div>
      </div>
      <div>
        <div class="detail-item">
          <span class="detail-label">Client:</span>
          <div class="detail-value">
            ${contract.clientName}<br>
            ${contract.clientEmail ? `Email: ${contract.clientEmail}<br>` : ''}
            ${contract.clientPhone ? `Phone: ${contract.clientPhone}<br>` : ''}
            ${contract.clientAddress || 'Address not provided'}
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- PERFORMANCE DETAILS -->
  <div class="section">
    <div class="section-title">Performance Details</div>
    <div class="detail-item">
      <span class="detail-label">Event Date:</span>
      <div class="detail-value">${new Date(contract.eventDate).toLocaleDateString('en-GB', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      })}</div>
    </div>
    <div class="detail-item">
      <span class="detail-label">Performance Time:</span>
      <div class="detail-value">${contract.eventTime || 'TBC'} - ${contract.eventEndTime || 'TBC'}</div>
    </div>
    <div class="detail-item">
      <span class="detail-label">Venue:</span>
      <div class="detail-value">${contract.venue || 'TBC'}</div>
    </div>
    ${contract.venueAddress ? `
    <div class="detail-item">
      <span class="detail-label">Venue Address:</span>
      <div class="detail-value">${contract.venueAddress}</div>
    </div>
    ` : ''}
  </div>

  <!-- FEE HIGHLIGHT -->
  <div class="fee-highlight">
    Performance Fee: £${contract.fee || 'TBC'}
    ${contract.deposit && parseFloat(contract.deposit.toString()) > 0 ? 
      `<div style="font-size: 18px; margin-top: 10px;">Deposit Required: £${contract.deposit}</div>` : ''}
  </div>

  <!-- TECHNICAL REQUIREMENTS -->
  ${contract.equipmentRequirements || contract.specialRequirements ? `
  <div class="section">
    <div class="section-title">Technical Requirements</div>
    ${contract.equipmentRequirements ? `
    <div class="detail-item">
      <span class="detail-label">Equipment Requirements:</span>
      <div class="detail-value">${contract.equipmentRequirements}</div>
    </div>
    ` : ''}
    ${contract.specialRequirements ? `
    <div class="detail-item">
      <span class="detail-label">Special Requirements:</span>
      <div class="detail-value">${contract.specialRequirements}</div>
    </div>
    ` : ''}
  </div>
  ` : ''}

  <!-- PAYMENT INSTRUCTIONS -->
  ${contract.paymentInstructions ? `
  <div class="section">
    <div class="section-title">Payment Instructions</div>
    <div class="detail-item">
      <div class="detail-value">${contract.paymentInstructions}</div>
    </div>
  </div>
  ` : ''}

  <!-- SIGNATURE SECTION -->
  <div class="signature-section">
    <div class="section-title">Contract Agreement</div>
    <div class="signature-box">
      <div class="signature-label">Client Signature</div>
      ${signatureDetails ? `
        <div class="signature-name">${signatureDetails.signatureName || 'Signed'}</div>
        <div class="signed-indicator">
          ✓ Signed on ${signatureDetails.signedAt ? new Date(signatureDetails.signedAt).toLocaleDateString('en-GB') : 'N/A'}
        </div>
      ` : `
        <div style="color: #64748b; font-style: italic; margin-top: 20px;">
          Awaiting client signature
        </div>
      `}
    </div>
  </div>

  <!-- TERMS AND CONDITIONS -->
  <div class="terms">
    <div class="section-title">Terms and Conditions</div>
    <p><strong>Payment:</strong> Payment is due within 7 days of performance completion unless otherwise agreed in writing.</p>
    <p><strong>Cancellation:</strong> Cancellation within 48 hours of the event may result in a 50% cancellation fee.</p>
    <p><strong>Equipment:</strong> The performer will provide their own professional equipment unless specifically noted above.</p>
    <p><strong>Liability:</strong> The performer carries public liability insurance. The client is responsible for the safety and security of guests and venue.</p>
    <p><strong>Agreement:</strong> This contract constitutes the entire agreement between the parties and supersedes all prior negotiations, representations, or agreements relating to the subject matter herein.</p>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <p>Generated by <strong style="color: #9333ea;">MusoBuddy</strong> – Professional Music Business Management</p>
    <p>Contract generated on ${new Date().toLocaleDateString('en-GB')}</p>
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