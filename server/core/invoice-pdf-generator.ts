import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { Invoice, UserSettings } from '@shared/schema';

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

function generateOptimizedInvoiceHTML(invoice: Invoice, userSettings: UserSettings | null): string {
  const logoBase64 = getLogoBase64();
  const logoHtml = logoBase64 ? 
    `<img src="data:image/png;base64,${logoBase64}" alt="MusoBuddy Logo" style="height: 40px; margin-right: 10px; vertical-align: middle;">` : 
    `<div style="width: 40px; height: 40px; background: #9333ea; border-radius: 8px; display: inline-block; margin-right: 10px; vertical-align: middle;"></div>`;

  // Extract business details from user settings
  const businessName = userSettings?.businessName || 'MusoBuddy';
  
  const businessPhone = userSettings?.phone || '';
  const businessEmail = userSettings?.email || '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Invoice ${invoice.invoiceNumber}</title>
      <style>
        /* INVOICE-SPECIFIC STYLING - ISOLATED FROM CONTRACTS */
        body {
          font-family: 'Arial', sans-serif;
          margin: 0;
          padding: 20px;
          color: #333;
          line-height: 1.6;
        }
        
        /* NO PAGE BREAK CONTROLS - OPTIMIZED FOR SINGLE PAGE */
        .no-page-break {
          page-break-inside: avoid;
          break-inside: avoid;
        }
        
        .keep-together {
          page-break-inside: avoid;
          break-inside: avoid;
        }
        
        /* HEADER SECTION */
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
        }
        
        .logo {
          font-size: 24px;
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
        }
        
        .invoice-date {
          color: #666;
          font-size: 14px;
        }
        
        /* BILLING SECTION */
        .billing-section {
          display: flex;
          justify-content: space-between;
          margin-bottom: 40px;
          gap: 40px;
        }
        
        .billing-info {
          flex: 1;
        }
        
        .billing-info h3 {
          color: #9333ea;
          margin-bottom: 10px;
          font-size: 16px;
        }
        
        .billing-info p {
          margin: 5px 0;
          color: #666;
        }
        
        .billing-info strong {
          color: #333;
        }
        
        /* ITEMS TABLE */
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
          border: 1px solid #ddd;
        }
        
        .items-table th {
          background-color: #9333ea;
          color: white;
          padding: 12px;
          text-align: left;
          font-weight: bold;
        }
        
        .items-table td {
          padding: 12px;
          border-bottom: 1px solid #eee;
          vertical-align: top;
        }
        
        .items-table tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        
        /* TOTALS SECTION */
        .total-section {
          margin-left: auto;
          width: 300px;
          margin-bottom: 30px;
        }
        
        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #eee;
        }
        
        .total-row.grand-total {
          border-top: 2px solid #9333ea;
          border-bottom: 2px solid #9333ea;
          font-weight: bold;
          font-size: 18px;
          margin-top: 10px;
          padding-top: 10px;
        }
        
        .total-label {
          font-weight: 500;
        }
        
        .total-amount {
          font-weight: bold;
        }
        
        /* PAYMENT INFO */
        .payment-info {
          background-color: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
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
          ${userSettings?.addressLine1 ? `<p>${userSettings.addressLine1}</p>` : ''}
          ${userSettings?.addressLine2 ? `<p>${userSettings.addressLine2}</p>` : ''}
          ${userSettings?.city ? `<p>${userSettings.city}</p>` : ''}
          ${userSettings?.county ? `<p>${userSettings.county}</p>` : ''}
          ${userSettings?.postcode ? `<p>${userSettings.postcode}</p>` : ''}
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
      
      <!-- ITEMS TABLE -->
      <table class="items-table keep-together">
        <thead>
          <tr>
            <th>Description</th>
            <th>Event Date</th>
            <th>Performance Fee</th>
            <th>Deposit Paid</th>
            <th>Amount Due</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <strong>Music Performance</strong><br>
              Venue: ${invoice.venueAddress || 'TBD'}
            </td>
            <td>${invoice.eventDate ? new Date(invoice.eventDate).toLocaleDateString('en-GB') : 'TBD'}</td>
            <td>£${invoice.fee || invoice.amount}</td>
            <td>£${invoice.depositPaid || '0.00'}</td>
            <td>£${invoice.amount}</td>
          </tr>
        </tbody>
      </table>
      
      <!-- TOTALS SECTION -->
      <div class="total-section keep-together">
        <div class="total-row">
          <div class="total-label">Performance Fee:</div>
          <div class="total-amount">£${invoice.fee || invoice.amount}</div>
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
      
      <!-- PAYMENT INFORMATION -->
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
        <p>Powered by <strong>MusoBuddy</strong> – less admin, more music.</p>
      </div>
    </body>
    </html>
  `;
}