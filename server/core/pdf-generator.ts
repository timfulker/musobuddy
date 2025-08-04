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
          <div class="invoice-date">Date: ${new Date(invoice.invoiceDate).toLocaleDateString('en-GB')}</div>
        </div>
      </div>
      
      <!-- BILLING SECTION -->
      <div class="billing-section keep-together">
        <div class="billing-info">
          <h3>From</h3>
          <p><strong>${businessName}</strong></p>
          ${businessAddress ? `<p>${businessAddress}</p>` : ''}
          ${businessPhone ? `<p>Phone: ${businessPhone}</p>` : ''}
          ${businessEmail ? `<p>Email: ${businessEmail}</p>` : ''}
        </div>
        <div class="billing-info">
          <h3>Bill To</h3>
          <p><strong>${invoice.clientName}</strong></p>
          ${invoice.clientEmail ? `<p>Email: ${invoice.clientEmail}</p>` : ''}
          ${invoice.clientAddress ? `<p>${invoice.clientAddress}</p>` : ''}
        </div>
      </div>
      
      <!-- ITEMS SECTION -->
      <div class="items-section">
        <table class="items-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Date</th>
              <th>Venue</th>
              <th class="amount">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Performance Fee</strong></td>
              <td>${invoice.performanceDate ? new Date(invoice.performanceDate).toLocaleDateString('en-GB') : 'TBD'}</td>
              <td>${invoice.venueAddress || 'TBD'}</td>
              <td class="amount">£${invoice.amount}</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- TOTALS SECTION -->
      <div class="total-section keep-together">
        <div class="total-row">
          <div class="total-label">Subtotal:</div>
          <div class="total-amount">£${invoice.amount}</div>
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
        <p><strong>Payment Terms:</strong> Payment due on or before the due date above.</p>
        <p><strong>Status:</strong> ${invoice.status?.toUpperCase() || 'DRAFT'}</p>
      </div>
      
      <!-- FOOTER -->
      <div class="footer">
        <p>Generated by <strong style="color: #9333ea;">MusoBuddy</strong> – Professional Music Business Management</p>
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
      <title>Contract ${contract.contractNumber}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          margin: 0;
          padding: 20px;
          color: #333;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 3px solid #9333ea;
          padding-bottom: 20px;
        }
        .contract-title {
          font-size: 24px;
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
          <span class="detail-label">Performance Time:</span> ${contract.startTime} - ${contract.endTime}
        </div>
        <div class="detail-item">
          <span class="detail-label">Venue:</span> ${contract.venue}
        </div>
        <div class="detail-item">
          <span class="detail-label">Performance Fee:</span> £${contract.performanceFee}
        </div>
        ${contract.depositRequired ? `
        <div class="detail-item">
          <span class="detail-label">Deposit Required:</span> £${contract.depositAmount} (due by ${new Date(contract.depositDueDate!).toLocaleDateString('en-GB')})
        </div>
        ` : ''}
      </div>

      <div class="terms">
        <div class="section-title">Terms and Conditions</div>
        ${contract.terms || 'Standard performance terms apply.'}
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