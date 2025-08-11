// ⚠️  PROTECTED FILE - INVOICE PDF GENERATOR - DO NOT MODIFY ⚠️
// This file generates professional invoices with optimized CSS and secure R2 storage
// BACKUP LOCATION: server/core/invoice-pdf-generator.backup.ts
// LAST STABLE VERSION: August 4, 2025 - 120px logo, midnight blue theme
// ⚠️  Changes to this file could break invoice generation system ⚠️

import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { Invoice, UserSettings } from '@shared/schema';

// Theme color mapping for PDF generation
function getThemeColor(userSettings: UserSettings | null): string {
  // Use user's selected theme accent color if available
  if (userSettings?.themeAccentColor) {
    return userSettings.themeAccentColor;
  }
  
  // Default fallback to purple (original theme)
  return '#8b5cf6';
}

// Generate secondary color (darker shade) from primary color
function getSecondaryColor(primaryColor: string): string {
  // Simple approach: if it's a known theme color, use predefined secondary
  const colorMap: Record<string, string> = {
    '#8b5cf6': '#a855f7', // Purple
    '#0ea5e9': '#0284c7', // Ocean Blue
    '#34d399': '#10b981', // Forest Green
    '#f87171': '#9ca3af', // Clean Pro Audio
    '#191970': '#1e3a8a', // Midnight Blue
  };
  
  return colorMap[primaryColor] || primaryColor; // Fallback to same color
}

function getLogoBase64(): string {
  try {
    const logoPath = join(process.cwd(), 'client/public/musobuddy-logo-midnight-blue.png');
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
  
  // Get dynamic theme colors
  const primaryColor = getThemeColor(userSettings);
  const secondaryColor = getSecondaryColor(primaryColor);
  
  console.log(`🎨 INVOICE PDF: Using theme colors - Primary: ${primaryColor}, Secondary: ${secondaryColor}`);
  // CSS-based animated metronome logo (from your HTML file) - LARGE VERSION
  const cssMetronomeLogo = `
    <div class="logo-invoice" style="display: inline-flex; align-items: center; gap: 20px;">
      <div class="metronome-icon" style="width: 120px; height: 120px; background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%); border-radius: 25px; display: flex; align-items: center; justify-content: center; position: relative; box-shadow: 0 10px 30px rgba(25, 25, 112, 0.3);">
        <div class="metronome-body" style="width: 42px; height: 68px; background: white; clip-path: polygon(25% 0%, 75% 0%, 100% 100%, 0% 100%); position: relative;">
          <div class="metronome-arm" style="position: absolute; top: 12px; left: 50%; transform: translateX(-50%); width: 4px; height: 42px; background: ${primaryColor}; border-radius: 2px;"></div>
        </div>
      </div>
      <div class="logo-text" style="text-align: left;">
        <div class="metronome-text" style="font-size: 48px; font-weight: 700; color: ${primaryColor}; letter-spacing: -1px; line-height: 1; margin-bottom: 10px; font-family: 'Arial', sans-serif;">MusoBuddy</div>
        <div class="tagline" style="font-size: 18px; color: #64748b; font-weight: 500; font-style: italic; font-family: 'Arial', sans-serif;">Less admin, more music</div>
      </div>
    </div>
  `;

  const logoHtml = logoBase64 ? 
    `<img src="data:image/png;base64,${logoBase64}" alt="MusoBuddy Logo" style="height: 120px; vertical-align: middle;">` : 
    cssMetronomeLogo;

  // Extract business details from user settings
  const businessName = userSettings?.businessName || 'MusoBuddy';
  
  const businessPhone = userSettings?.phone || '';
  const businessEmail = userSettings?.businessEmail || '';

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
          page-break-before: avoid;
          break-before: avoid;
        }
        
        /* FORCE TOTALS SECTION TO STAY WITH TABLE */
        .items-table {
          margin-bottom: 10px !important;
        }
        
        .total-section {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          page-break-before: avoid !important;
          break-before: avoid !important;
        }
        
        /* HEADER SECTION */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 40px;
          border-bottom: 3px solid ${secondaryColor};
          padding-bottom: 20px;
        }
        
        .logo-section {
          display: flex;
          align-items: center;
        }
        
        .logo {
          font-size: 24px;
          font-weight: bold;
          color: ${primaryColor};
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
          color: ${primaryColor};
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
          margin-bottom: 10px;
          border: 1px solid #ddd;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        
        .items-table th {
          background-color: ${primaryColor};
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
          margin-bottom: 20px;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          page-break-before: avoid !important;
          break-before: avoid !important;
        }
        
        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #eee;
        }
        
        .total-row.grand-total {
          border-top: 2px solid ${primaryColor};
          border-bottom: 2px solid ${primaryColor};
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
          border-left: 4px solid ${primaryColor};
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
          border-left: 4px solid ${primaryColor};
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
        </div>
        <div class="invoice-details">
          <div class="invoice-number">Invoice ${invoice.invoiceNumber}</div>
          <div class="invoice-date">Date: ${invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')}</div>
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
          ${(!userSettings?.addressLine1 && userSettings?.businessAddress) ? `<p>${userSettings.businessAddress.replace(/,\s*/g, '</p><p>')}</p>` : ''}
          ${businessPhone ? `<p>Phone: ${businessPhone}</p>` : ''}
          ${businessEmail ? `<p>Email: ${businessEmail}</p>` : ''}
          <p>Website: www.saxdj.co.uk</p>
        </div>
        <div class="billing-info">
          <h3>BILL TO:</h3>
          <p><strong>${invoice.clientName}</strong></p>
          ${invoice.clientEmail ? `<p>${invoice.clientEmail}</p>` : ''}
          ${invoice.clientPhone ? `<p>Phone: ${invoice.clientPhone}</p>` : ''}
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