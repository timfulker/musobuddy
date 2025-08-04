import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { Contract, UserSettings } from '@shared/schema';
import { generateProfessionalContractHTML } from './contract-templates.js';

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
    const html = generateProfessionalContractHTML(contract, userSettings);
    
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    
    console.log('Contract PDF generated successfully:', pdf.length, 'bytes');
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
  const logoBase64 = getLogoBase64();
  const logoHtml = logoBase64 ? 
    `<img src="data:image/png;base64,${logoBase64}" alt="MusoBuddy Logo" style="height: 40px; margin-right: 10px; vertical-align: middle;">` : 
    `<div style="width: 40px; height: 40px; background: #9333ea; border-radius: 8px; display: inline-block; margin-right: 10px; vertical-align: middle;"></div>`;

  const businessName = userSettings?.businessName || 'MusoBuddy';
  
  // Build business address from components
  const addressParts = [];
  if (userSettings?.addressLine1) addressParts.push(userSettings.addressLine1);
  if (userSettings?.city) addressParts.push(userSettings.city);
  if (userSettings?.county) addressParts.push(userSettings.county);
  if (userSettings?.postcode) addressParts.push(userSettings.postcode);
  const businessAddress = addressParts.length > 0 ? addressParts.join(', ') : '';
  
  const businessPhone = userSettings?.phone || '';
  const businessEmail = userSettings?.email || '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Contract ${contract.contractNumber}</title>
      <style>
        /* CONTRACT-SPECIFIC STYLING - ISOLATED FROM INVOICES */
        body {
          font-family: 'Arial', sans-serif;
          margin: 0;
          padding: 20px;
          color: #333;
          line-height: 1.6;
        }
        
        /* CONTRACT PAGE BREAK CONTROLS */
        .page-break {
          page-break-before: always;
          break-before: page;
        }
        
        .no-page-break {
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
        
        .contract-details {
          text-align: right;
        }
        
        .contract-number {
          font-size: 24px;
          font-weight: bold;
          color: #333;
        }
        
        .contract-date {
          color: #666;
          font-size: 14px;
        }
        
        /* CONTRACT CONTENT */
        .contract-content {
          margin-bottom: 40px;
        }
        
        .contract-content h2 {
          color: #9333ea;
          border-bottom: 2px solid #9333ea;
          padding-bottom: 10px;
        }
        
        .contract-content h3 {
          color: #333;
          margin-top: 30px;
        }
        
        .contract-content p {
          margin: 10px 0;
          text-align: justify;
        }
        
        .contract-content ul {
          margin: 10px 0;
          padding-left: 20px;
        }
        
        .contract-content li {
          margin: 5px 0;
        }
        
        /* PARTIES SECTION */
        .parties-section {
          display: flex;
          justify-content: space-between;
          margin: 30px 0;
          gap: 40px;
        }
        
        .party-info {
          flex: 1;
          padding: 20px;
          background-color: #f8f9fa;
          border-radius: 8px;
          border-left: 4px solid #9333ea;
        }
        
        .party-info h3 {
          color: #9333ea;
          margin-bottom: 15px;
        }
        
        .party-info p {
          margin: 5px 0;
          color: #666;
        }
        
        .party-info strong {
          color: #333;
        }
        
        /* PERFORMANCE DETAILS */
        .performance-details {
          background-color: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 4px solid #9333ea;
        }
        
        .performance-details h3 {
          color: #333;
          margin-bottom: 15px;
        }
        
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #eee;
        }
        
        .detail-label {
          font-weight: 500;
          color: #666;
        }
        
        .detail-value {
          font-weight: bold;
          color: #333;
        }
        
        /* SIGNATURE SECTION */
        .signature-section {
          margin-top: 40px;
          padding: 20px;
          border: 2px solid #9333ea;
          border-radius: 8px;
        }
        
        .signature-section h3 {
          color: #9333ea;
          margin-bottom: 20px;
        }
        
        .signature-details {
          margin-top: 20px;
        }
        
        .signature-line {
          border-bottom: 1px solid #333;
          margin: 20px 0;
          height: 40px;
          position: relative;
        }
        
        .signature-label {
          position: absolute;
          bottom: -20px;
          left: 0;
          font-size: 12px;
          color: #666;
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
        <div class="contract-details">
          <div class="contract-number">Contract ${contract.contractNumber}</div>
          <div class="contract-date">Date: ${new Date(contract.createdAt).toLocaleDateString('en-GB')}</div>
        </div>
      </div>
      
      <!-- PARTIES SECTION -->
      <div class="parties-section no-page-break">
        <div class="party-info">
          <h3>PERFORMER:</h3>
          <p><strong>${businessName}</strong></p>
          <p>Sole trader trading as ${businessName}</p>
          ${businessAddress ? `<p>${businessAddress}</p>` : ''}
          ${businessPhone ? `<p>Phone: ${businessPhone}</p>` : ''}
          ${businessEmail ? `<p>Email: ${businessEmail}</p>` : ''}
        </div>
        <div class="party-info">
          <h3>CLIENT:</h3>
          <p><strong>${contract.clientName}</strong></p>
          ${contract.clientEmail ? `<p>Email: ${contract.clientEmail}</p>` : ''}
          ${contract.clientPhone ? `<p>Phone: ${contract.clientPhone}</p>` : ''}
          ${contract.venueAddress ? `<p>Venue: ${contract.venueAddress}</p>` : ''}
        </div>
      </div>
      
      <!-- PERFORMANCE DETAILS -->
      <div class="performance-details no-page-break">
        <h3>Performance Details</h3>
        <div class="detail-row">
          <div class="detail-label">Event Date:</div>
          <div class="detail-value">${contract.eventDate ? new Date(contract.eventDate).toLocaleDateString('en-GB') : 'TBD'}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Start Time:</div>
          <div class="detail-value">${contract.startTime || 'TBD'}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">End Time:</div>
          <div class="detail-value">${contract.endTime || 'TBD'}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Performance Fee:</div>
          <div class="detail-value">£${contract.fee}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Deposit Required:</div>
          <div class="detail-value">£${contract.depositAmount || '0.00'}</div>
        </div>
      </div>
      
      <!-- CONTRACT CONTENT -->
      <div class="contract-content">
        <h2>Terms and Conditions</h2>
        
        <h3>1. Performance Agreement</h3>
        <p>The Performer agrees to provide musical entertainment services at the specified venue, date, and time as outlined in this contract. The performance will include professional quality music suitable for the event type.</p>
        
        <h3>2. Payment Terms</h3>
        <p>The total performance fee is £${contract.fee}. Payment terms are as follows:</p>
        <ul>
          <li>Deposit of £${contract.depositAmount || '0.00'} required to secure booking</li>
          <li>Remaining balance due on or before performance date</li>
          <li>Payment may be made by bank transfer or cash</li>
        </ul>
        
        <h3>3. Cancellation Policy</h3>
        <p>Should the Client need to cancel this performance:</p>
        <ul>
          <li>More than 30 days notice: Full refund of deposit</li>
          <li>14-30 days notice: 50% refund of deposit</li>
          <li>Less than 14 days notice: No refund of deposit</li>
        </ul>
        
        <h3>4. Equipment and Setup</h3>
        <p>The Performer will provide all necessary musical equipment and setup. Access to venue must be provided at least 1 hour before performance start time for setup and sound check.</p>
        
        <h3>5. Force Majeure</h3>
        <p>Neither party shall be liable for any failure to perform due to circumstances beyond their reasonable control, including but not limited to acts of God, government restrictions, or public health emergencies.</p>
        
        <h3>6. Agreement</h3>
        <p>This contract represents the complete agreement between the parties. Any modifications must be made in writing and signed by both parties.</p>
      </div>
      
      <!-- SIGNATURE SECTION -->
      <div class="signature-section">
        <h3>Digital Signature</h3>
        ${signatureDetails ? `
          <div class="signature-details">
            <p><strong>Signed by:</strong> ${signatureDetails.signatureName || contract.clientName}</p>
            <p><strong>Date:</strong> ${signatureDetails.signedAt.toLocaleDateString('en-GB')} at ${signatureDetails.signedAt.toLocaleTimeString('en-GB')}</p>
            ${signatureDetails.clientIpAddress ? `<p><strong>IP Address:</strong> ${signatureDetails.clientIpAddress}</p>` : ''}
            <p style="color: #9333ea; font-weight: bold;">✓ Digitally signed and legally binding</p>
          </div>
        ` : `
          <div class="signature-line">
            <div class="signature-label">Client Signature</div>
          </div>
          <div class="signature-line">
            <div class="signature-label">Date</div>
          </div>
        `}
      </div>
      
      <!-- FOOTER -->
      <div class="footer">
        <p>Powered by <strong>MusoBuddy</strong> – Professional music contracts made simple.</p>
      </div>
    </body>
    </html>
  `;
}