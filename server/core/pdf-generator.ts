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
<html>
<head>
  <meta charset="utf-8">
  <title>Performance Contract</title>
  <style>
    * { box-sizing: border-box; }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      margin: 0;
      padding: 20px;
      color: #333;
      background: white;
      font-size: 14px;
    }
    
    /* PURPLE GRADIENT HEADER */
    .header {
      background: linear-gradient(135deg, #9333ea 0%, #7c3aed 100%);
      color: white;
      padding: 30px;
      text-align: center;
      margin: -20px -20px 30px -20px;
      border-radius: 0;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      -webkit-print-color-adjust: exact;
      color-adjust: exact;
    }
    
    .header h1 {
      margin: 0;
      font-size: 32px;
      font-weight: bold;
      text-shadow: 0 2px 4px rgba(0,0,0,0.3);
      letter-spacing: -0.5px;
    }
    
    .contract-number {
      background: rgba(255,255,255,0.2);
      padding: 8px 16px;
      border-radius: 20px;
      display: inline-block;
      margin-top: 10px;
      font-weight: 600;
      font-size: 16px;
    }
    
    /* BLUE SECTIONS */
    .section {
      margin: 25px 0;
      padding: 20px;
      border-left: 4px solid #2563eb;
      background: #f8fafc;
      border-radius: 0 8px 8px 0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      -webkit-print-color-adjust: exact;
      color-adjust: exact;
    }
    
    .section h2 {
      color: #2563eb;
      margin: 0 0 15px 0;
      font-size: 20px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    /* DETAIL GRID LAYOUT */
    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin: 15px 0;
    }
    
    .detail-item {
      background: white;
      padding: 15px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    
    .detail-label {
      font-weight: 600;
      color: #475569;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
    }
    
    .detail-value {
      color: #1e293b;
      font-size: 16px;
      font-weight: 500;
    }
    
    /* GREEN FEE HIGHLIGHT */
    .fee-highlight {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      color: white;
      font-size: 28px;
      font-weight: bold;
      text-align: center;
      padding: 25px;
      border-radius: 8px;
      margin: 25px 0;
      box-shadow: 0 4px 6px rgba(0,0,0,0.15);
      text-shadow: 0 2px 4px rgba(0,0,0,0.3);
      -webkit-print-color-adjust: exact;
      color-adjust: exact;
    }
    
    /* SIGNATURE SECTION */
    .signature-section {
      margin-top: 40px;
      padding: 25px;
      background: #f1f5f9;
      border-radius: 8px;
      border: 2px solid #e2e8f0;
      -webkit-print-color-adjust: exact;
      color-adjust: exact;
    }
    
    .signature-box {
      background: white;
      border: 2px solid #9333ea;
      padding: 20px;
      margin: 15px 0;
      border-radius: 8px;
      min-height: 80px;
      position: relative;
    }
    
    .signature-label {
      color: #9333ea;
      font-weight: 600;
      margin-bottom: 10px;
      font-size: 16px;
    }
    
    .signed-indicator {
      background: #10b981;
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: 600;
      display: inline-block;
      margin-top: 10px;
      font-size: 14px;
      -webkit-print-color-adjust: exact;
      color-adjust: exact;
    }
    
    .signature-name {
      font-size: 20px;
      color: #1e293b;
      margin: 10px 0;
      font-weight: 600;
    }
    
    /* TERMS SECTION */
    .terms {
      font-size: 13px;
      line-height: 1.8;
      color: #475569;
      margin-top: 30px;
      padding: 20px;
      background: #fafafa;
      border-radius: 8px;
      border-left: 4px solid #94a3b8;
      -webkit-print-color-adjust: exact;
      color-adjust: exact;
    }
    
    .terms strong {
      color: #334155;
      font-size: 14px;
    }
    
    /* FOOTER */
    .footer {
      margin-top: 40px;
      text-align: center;
      color: #64748b;
      font-size: 11px;
      border-top: 1px solid #e2e8f0;
      padding-top: 20px;
    }
    
    /* SINGLE COLUMN FOR LONG CONTENT */
    .full-width {
      grid-column: 1 / -1;
    }
    
    /* RESPONSIVE GRID */
    @media (max-width: 600px) {
      .detail-grid {
        grid-template-columns: 1fr;
      }
    }
    
    @media print {
      .header, .section, .fee-highlight, .signature-section, .terms {
        -webkit-print-color-adjust: exact;
        color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <!-- PURPLE HEADER -->
  <div class="header">
    <h1>Performance Contract</h1>
    <div class="contract-number">Contract #${contract.contractNumber || contract.id}</div>
  </div>

  <!-- EVENT DETAILS SECTION -->
  <div class="section">
    <h2>Event Details</h2>
    <div class="detail-grid">
      <div class="detail-item">
        <div class="detail-label">Event Date</div>
        <div class="detail-value">${formatDate(contract.eventDate)}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Event Time</div>
        <div class="detail-value">${contract.eventTime || 'TBC'} - ${contract.eventEndTime || 'TBC'}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Venue</div>
        <div class="detail-value">${contract.venue || 'TBC'}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Client Name</div>
        <div class="detail-value">${contract.clientName}</div>
      </div>
      ${contract.equipmentRequirements ? `
      <div class="detail-item">
        <div class="detail-label">Equipment Requirements</div>
        <div class="detail-value">${contract.equipmentRequirements}</div>
      </div>
      ` : ''}
      ${contract.specialRequirements ? `
      <div class="detail-item full-width">
        <div class="detail-label">Special Requirements</div>
        <div class="detail-value">${contract.specialRequirements}</div>
      </div>
      ` : ''}
    </div>
  </div>

  <!-- CLIENT INFORMATION SECTION -->
  <div class="section">
    <h2>Client Information</h2>
    <div class="detail-grid">
      <div class="detail-item">
        <div class="detail-label">Contact Email</div>
        <div class="detail-value">${contract.clientEmail || 'Not provided'}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Contact Phone</div>
        <div class="detail-value">${contract.clientPhone || 'Not provided'}</div>
      </div>
      ${contract.clientAddress ? `
      <div class="detail-item full-width">
        <div class="detail-label">Client Address</div>
        <div class="detail-value">${formatAddress(contract.clientAddress)}</div>
      </div>
      ` : ''}
    </div>
  </div>

  <!-- PERFORMER DETAILS SECTION -->
  <div class="section">
    <h2>Performer Details</h2>
    <div class="detail-grid">
      <div class="detail-item">
        <div class="detail-label">Performer Name</div>
        <div class="detail-value">${businessName}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Contact Phone</div>
        <div class="detail-value">${businessPhone || 'Not provided'}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Contact Email</div>
        <div class="detail-value">${businessEmail || 'Not provided'}</div>
      </div>
      ${businessAddress ? `
      <div class="detail-item">
        <div class="detail-label">Business Address</div>
        <div class="detail-value">${formatAddress(businessAddress)}</div>
      </div>
      ` : ''}
    </div>
  </div>

  <!-- FEE HIGHLIGHT -->
  <div class="fee-highlight">
    Performance Fee: £${contract.fee || 'TBC'}
  </div>

  <!-- SIGNATURE SECTION -->
  <div class="signature-section">
    <h2 style="color: #475569; margin-bottom: 20px; font-size: 18px;">Contract Agreement</h2>
    
    <div class="signature-box">
      <div class="signature-label">Client Signature</div>
      ${signatureDetails ? `
        <div class="signature-name">${signatureDetails.signatureName}</div>
        <div class="signed-indicator">
          ✓ Signed on ${signatureDetails.signedAt ? new Date(signatureDetails.signedAt).toLocaleDateString('en-GB') : 'N/A'}
        </div>
      ` : `
        <div style="color: #64748b; font-style: italic; margin-top: 20px;">
          Awaiting client signature
        </div>
      `}
    </div>
    
    <div class="signature-box">
      <div class="signature-label">Performer Signature</div>
      <div class="signature-name">${businessName}</div>
      <div class="signed-indicator">
        ✓ Agreed by sending contract
      </div>
    </div>
  </div>

  <!-- TERMS AND CONDITIONS -->
  <div class="terms">
    <strong>Terms and Conditions:</strong><br><br>
    
    <strong>Payment:</strong> Payment is due within 7 days of performance completion unless otherwise agreed in writing.<br><br>
    
    <strong>Cancellation:</strong> Cancellation within 48 hours of the event may result in a 50% cancellation fee. The performer reserves the right to cancel due to circumstances beyond their control (illness, weather, etc.).<br><br>
    
    <strong>Equipment:</strong> The performer will provide their own professional equipment unless specifically noted above. Adequate power supply and safe performance area must be provided by the client.<br><br>
    
    <strong>Liability:</strong> The performer carries public liability insurance. The client is responsible for the safety and security of guests and venue.<br><br>
    
    <strong>Agreement:</strong> This contract constitutes the entire agreement between the parties and supersedes all prior negotiations, representations, or agreements relating to the subject matter herein.
  </div>

  <!-- FOOTER -->
  <div class="footer">
    Contract generated on ${new Date().toLocaleDateString('en-GB')} via MusoBuddy Professional Services
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