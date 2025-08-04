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
  console.log('🔄 Generating professional contract PDF...');
  
  try {
    // STEP 1: Generate styled HTML template
    const htmlContent = generateContractHTML(contract, userSettings, signatureDetails);
    
    // STEP 2: Launch Puppeteer with correct configuration
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-extensions',
        '--no-first-run',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ]
    });
    
    const page = await browser.newPage();
    
    // STEP 3: Set HTML content with proper wait conditions
    await page.setContent(htmlContent, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // STEP 4: Generate PDF with styling preservation
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,  // CRITICAL: Preserves purple headers and colored sections
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      },
      preferCSSPageSize: true,
      displayHeaderFooter: false
    });
    
    await browser.close();
    
    console.log(`✅ Professional contract PDF generated: ${pdfBuffer.length} bytes`);
    
    // Verify PDF size (should be > 15KB for styled content)
    if (pdfBuffer.length < 15000) {
      console.warn('⚠️ PDF suspiciously small - styling may have failed');
    }
    
    return pdfBuffer;
    
  } catch (error: any) {
    console.error('❌ PDF generation failed:', error);
    throw new Error(`PDF generation failed: ${error.message}`);
  }
}

export async function generateInvoicePDF(
  invoice: Invoice,
  userSettings: UserSettings | null
): Promise<Buffer> {
  console.log('🚀 Starting FAST invoice PDF generation for:', invoice.invoiceNumber);
  
  // Simple, reliable Puppeteer configuration - NO AI CALLS
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  try {
    const page = await browser.newPage();
    
    // CSS-OPTIMIZED: Generate HTML with built-in page break controls (NO AI)
    console.log('📄 Using CSS-optimized invoice template (under 5 seconds)...');
    const html = generateOptimizedInvoiceHTML(invoice, userSettings);
    
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    const pdf = await page.pdf({ 
      format: 'A4', 
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm', 
        bottom: '20mm',
        left: '15mm'
      }
    });
    
    console.log('✅ FAST invoice PDF generated successfully:', pdf.length, 'bytes');
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

// CSS-OPTIMIZED: Generate invoice HTML with proper page break controls
function generateOptimizedInvoiceHTML(
  invoice: Invoice,
  userSettings: UserSettings | null
): string {
  const businessName = userSettings?.businessName || 'MusoBuddy';
  
  // Format business address from user settings components
  const addressParts = [];
  if (userSettings?.addressLine1) addressParts.push(userSettings.addressLine1);
  if (userSettings?.city) addressParts.push(userSettings.city);
  if (userSettings?.county) addressParts.push(userSettings.county);
  if (userSettings?.postcode) addressParts.push(userSettings.postcode);
  const businessAddress = addressParts.length > 0 ? addressParts.join(', ') : '';
  const businessPhone = userSettings?.phone || '';
  const businessEmail = userSettings?.email || '';
  
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
        /* CSS PAGE BREAK OPTIMIZATION - No AI needed! */
        @media print {
          .page-break-before { page-break-before: always !important; }
          .page-break-after { page-break-after: always !important; }
          .no-page-break { page-break-inside: avoid !important; }
          .keep-together { page-break-inside: avoid !important; }
        }
        
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
        
        /* BILLING SECTION - Keep together */
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
        
        /* ITEMS TABLE - Optimized for page breaks */
        .items-section {
          margin-bottom: 30px;
        }
        
        .items-table {
          width: 100%;
          border-collapse: collapse;
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
        
        /* TOTALS SECTION - Keep together */
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
          font-weight: bold;
        }
        
        .total-amount {
          width: 100px;
          text-align: right;
          font-weight: bold;
        }
        
        .grand-total {
          border-top: 2px solid #333;
          padding-top: 8px;
          font-size: 18px;
          color: #9333ea;
        }
        
        /* PAYMENT INFO - Keep together */
        .payment-info {
          margin-top: 40px;
          padding: 20px;
          background-color: #f8f9fa;
          border-left: 4px solid #9333ea;
        }
        
        .payment-info h3 {
          color: #333;
          margin-bottom: 15px;
        }
        
        .payment-info p {
          margin: 8px 0;
          color: #666;
        }
        
        .payment-info strong {
          color: #333;
        }
        
        /* TERMS & CONDITIONS */
        .terms-section {
          margin-top: 30px;
          padding: 20px;
          background-color: #f8f9fa;
          border-left: 4px solid #9333ea;
        }
        
        .terms-section h3 {
          color: #333;
          margin-bottom: 15px;
        }
        
        .terms-section p {
          margin: 8px 0;
          color: #666;
        }
        
        .terms-section strong {
          color: #333;
        }
        
        /* FOOTER */
        .footer {
          margin-top: 30px;
          padding: 15px;
          text-align: center;
          border-top: 1px solid #ccc;
          color: #999;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <!-- HEADER SECTION -->
      <div class="header no-page-break">
        <div class="logo-section">
          ${logoHtml}
          <div class="logo">MusoBuddy</div>
        </div>
        <div class="invoice-details">
          <div class="invoice-number">Invoice ${invoice.invoiceNumber}</div>
          <div class="invoice-date">Date: ${new Date(invoice.createdAt).toLocaleDateString('en-GB')}</div>
        </div>
      </div>
      
      <!-- BILLING SECTION -->
      <div class="billing-section keep-together">
        <div class="billing-info">
          <h3>FROM:</h3>
          <p><strong>${businessName}</strong></p>
          <p>Sole trader trading as ${businessName}</p>
          ${businessAddress ? `<p>${businessAddress}</p>` : ''}
          ${businessPhone ? `<p>Phone: ${businessPhone}</p>` : ''}
          ${businessEmail ? `<p>Email: ${businessEmail}</p>` : ''}
          <p>Website: www.saxdj.co.uk</p>
        </div>
        <div class="billing-info">
          <h3>BILL TO:</h3>
          <p><strong>${invoice.clientName}</strong></p>
          ${invoice.clientEmail ? `<p>${invoice.clientEmail}</p>` : ''}
          ${invoice.clientAddress ? `<p>${invoice.clientAddress}</p>` : ''}
        </div>
      </div>
      
      <!-- ITEMS SECTION -->
      <div class="items-section">
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
              <td>
                <strong>Music Performance</strong><br>
                Venue: ${invoice.venueAddress || 'TBD'}
              </td>
              <td>${invoice.performanceDate ? new Date(invoice.performanceDate).toLocaleDateString('en-GB') : 'TBD'}</td>
              <td>£${invoice.performanceFee || invoice.amount}</td>
              <td>£${invoice.depositPaid || '0.00'}</td>
              <td class="amount">£${invoice.amount}</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- TOTALS SECTION -->
      <div class="total-section keep-together">
        <div class="total-row">
          <div class="total-label">Performance Fee:</div>
          <div class="total-amount">£${invoice.performanceFee || invoice.amount}</div>
        </div>
        <div class="total-row">
          <div class="total-label">Deposit Paid:</div>
          <div class="total-amount">-£${invoice.depositPaid || '0.00'}</div>
        </div>
        <div class="total-row">
          <div class="total-label">VAT Status:</div>
          <div class="total-amount">Not VAT registered</div>
        </div>
        <div class="total-row grand-total">
          <div class="total-label">Total Due:</div>
          <div class="total-amount">£${invoice.amount}</div>
        </div>
      </div>
      
      <!-- PAYMENT INFO -->
      <div class="payment-info keep-together">
        <h3>Payment Information</h3>
        <p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString('en-GB')}</p>
        <p><strong>Bank Details:</strong></p>
        <p>Acc - Mr T Fulker<br>
           No - 09851259<br>
           Sort - 54 21 30<br>
           Ref - Please use Name/Date</p>
      </div>
      
      <!-- TERMS & CONDITIONS -->
      <div class="terms-section keep-together">
        <h3>Terms & Conditions</h3>
        <p>${userSettings?.defaultTerms || 'All invoices to be paid within seven days of receipt'}</p>
        <p><strong>VAT Status:</strong> I am not VAT registered and therefore no VAT is charged.</p>
      </div>
      
      <!-- FOOTER -->
      <div class="footer">
        <p>Powered by <strong style="color: #9333ea;">MusoBuddy</strong> – less admin, more music.</p>
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
  
  // Format business address from user settings components (same as contract template)
  const addressParts = [];
  if (userSettings?.addressLine1) addressParts.push(userSettings.addressLine1);
  if (userSettings?.city) addressParts.push(userSettings.city);
  if (userSettings?.county) addressParts.push(userSettings.county);
  if (userSettings?.postcode) addressParts.push(userSettings.postcode);
  const businessAddress = addressParts.length > 0 ? addressParts.join(', ') : '';
  const businessPhone = userSettings?.phone || '';
  const businessEmail = userSettings?.email || '';
  
  // Use the custom MusoBuddy logo
  const logoBase64 = getLogoBase64();
  const logoHtml = logoBase64 ? `<img src="data:image/png;base64,${logoBase64}" style="height: 50px; width: auto; margin-bottom: 20px;" alt="MusoBuddy Logo" />` : '';
  
  // Signature section
  const hasSignature = signatureDetails && signatureDetails.signedAt;
  const signatureSection = hasSignature ? `
    <div style="margin-top: 40px; padding: 20px; border: 2px solid #4CAF50; background-color: #f9f9f9;">
      <h3 style="color: #4CAF50; margin-bottom: 15px;">✓ Contract Digitally Signed</h3>
      <p><strong>Signed by:</strong> ${signatureDetails.signatureName || contract.clientName}</p>
      <p><strong>Date signed:</strong> ${signatureDetails.signedAt.toLocaleDateString('en-GB')} at ${signatureDetails.signedAt.toLocaleTimeString('en-GB')}</p>
      <p><strong>IP Address:</strong> ${signatureDetails.clientIpAddress || 'Not recorded'}</p>
      <p style="font-size: 12px; color: #666; margin-top: 10px;">
        This contract has been digitally signed and is legally binding. 
        MusoBuddy maintains records of this signature for legal compliance.
      </p>
    </div>
  ` : `
    <div style="margin-top: 40px; padding: 20px; border: 2px solid #9333ea;">
      <p><strong>Client Signature:</strong> ___________________________ <strong>Date:</strong> ___________</p>
      <p style="margin-top: 20px;"><strong>Performer Signature:</strong> ___________________________ <strong>Date:</strong> ___________</p>
    </div>
  `;

  return `
<!DOCTYPE html>
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
    }
    
    /* SIGNATURE SECTION */
    .signature-section {
      margin-top: 40px;
      padding: 25px;
      background: #f1f5f9;
      border-radius: 8px;
      border: 2px solid #e2e8f0;
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
        <div class="detail-value">${new Date(contract.eventDate).toLocaleDateString('en-GB', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        })}</div>
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
        <div class="detail-label">Performance Duration</div>
        <div class="detail-value">${contract.performanceDuration || 'TBC'}</div>
      </div>
    </div>
  </div>

  <!-- CLIENT INFORMATION SECTION -->
  <div class="section">
    <h2>Client Information</h2>
    <div class="detail-grid">
      <div class="detail-item">
        <div class="detail-label">Client Name</div>
        <div class="detail-value">${contract.clientName}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Contact Email</div>
        <div class="detail-value">${contract.clientEmail || 'Not provided'}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Contact Phone</div>
        <div class="detail-value">${contract.clientPhone || 'Not provided'}</div>
      </div>
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
          font-weight: bold;
          color: #9333ea;
          margin-bottom: 10px;
        }
        .contract-number {
          font-size: 16px;
          color: #666;
        }
        .section {
          margin-bottom: 25px;
        }
        .section-title {
          font-size: 18px;
          font-weight: bold;
          color: #333;
          margin-bottom: 10px;
          border-bottom: 1px solid #ddd;
          padding-bottom: 5px;
        }
        .details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }
        .detail-item {
          margin-bottom: 8px;
        }
        .detail-label {
          font-weight: bold;
          color: #555;
        }
        .terms {
          background-color: #f9f9f9;
          padding: 15px;
          border-left: 4px solid #9333ea;
          margin: 20px 0;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          font-size: 12px;
          color: #666;
          border-top: 1px solid #ddd;
          padding-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        ${logoHtml}
        <div class="contract-title">PERFORMANCE CONTRACT</div>
        <div class="contract-number">Contract Number: ${contract.contractNumber}</div>
      </div>

      <div class="section">
        <div class="section-title">Parties</div>
        <div class="details-grid">
          <div>
            <div class="detail-item">
              <span class="detail-label">Performer:</span><br>
              ${businessName}<br>
              ${businessAddress ? `${businessAddress}<br>` : ''}
              ${businessPhone ? `Phone: ${businessPhone}<br>` : ''}
              ${businessEmail ? `Email: ${businessEmail}` : ''}
            </div>
          </div>
          <div>
            <div class="detail-item">
              <span class="detail-label">Client:</span><br>
              ${contract.clientName}<br>
              ${contract.clientEmail ? `Email: ${contract.clientEmail}<br>` : ''}
              ${contract.clientAddress || 'Address not provided'}
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Performance Details</div>
        <div class="detail-item">
          <span class="detail-label">Event Date:</span> ${new Date(contract.eventDate).toLocaleDateString('en-GB')}
        </div>
        <div class="detail-item">
          <span class="detail-label">Performance Time:</span> ${contract.eventTime || 'TBD'} - ${contract.eventEndTime || 'TBD'}
        </div>
        <div class="detail-item">
          <span class="detail-label">Venue:</span> ${contract.venue || 'TBD'}
        </div>
        <div class="detail-item">
          <span class="detail-label">Performance Fee:</span> £${contract.fee || '0.00'}
        </div>
        ${contract.deposit && parseFloat(contract.deposit.toString()) > 0 ? `
        <div class="detail-item">
          <span class="detail-label">Deposit Required:</span> £${contract.deposit}
        </div>
        ` : ''}
      </div>

      <div class="terms">
        <div class="section-title">Terms and Conditions</div>
        ${contract.paymentInstructions || contract.specialRequirements || 'Standard performance terms apply.'}
      </div>

      ${signatureSection}

      <div class="footer">
        <p>Generated by <strong style="color: #9333ea;">MusoBuddy</strong> – Professional Music Business Management</p>
        <p>Contract generated on ${new Date().toLocaleDateString('en-GB')}</p>
      </div>
    </body>
    </html>
  `;
}