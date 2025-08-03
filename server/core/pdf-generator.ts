import puppeteer from 'puppeteer';
import type { Contract, Invoice, UserSettings } from '@shared/schema';

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
  
  // RESTORED: Working Puppeteer configuration from previous version
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

// Logo utility function - Fixed ES module imports
function getLogoBase64(): string {
  try {
    import('fs').then(fs => {
      import('path').then(path => {
        const logoPath = path.join(process.cwd(), 'client/public/musobuddy-logo-purple.png');
        const logoBuffer = fs.readFileSync(logoPath);
        return logoBuffer.toString('base64');
      });
    });
    return ''; // For now, return empty - logo will be added in future update
  } catch (error) {
    console.error('Error loading logo:', error);
    return '';
  }
}

// Theme-specific titles and language
function getThemeTitle(theme: string): string {
  switch (theme) {
    case 'professional':
      return 'Performance Agreement';
    case 'friendly':
      return 'Music Performance Contract';
    case 'musical':
      return '🎵 Performance Contract 🎵';
    default:
      return 'Performance Contract';
  }
}

function getThemeTermsTitle(theme: string): string {
  switch (theme) {
    case 'professional':
      return 'Terms and Conditions';
    case 'friendly':
      return 'Important Details';
    case 'musical':
      return 'The Small Print (But Important Stuff!)';
    default:
      return 'Terms and Conditions';
  }
}

function getThemePaymentTitle(theme: string): string {
  switch (theme) {
    case 'professional':
      return 'Payment Terms & Conditions';
    case 'friendly':
      return 'Payment & Money Matters';
    case 'musical':
      return 'Payment & The Business Side of Things';
    default:
      return 'Payment Terms & Conditions';
  }
}

function getThemeBoxColor(theme: string): string {
  switch (theme) {
    case 'professional':
      return '#f8fafc'; // Light blue-gray
    case 'friendly':
      return '#f0fdf4'; // Light green
    case 'musical':
      return '#faf5ff'; // Light purple
    default:
      return '#f0f8ff';
  }
}

// Theme-based styling configuration with dramatic differences
function getThemeStyles(theme: string) {
  switch (theme) {
    case 'professional':
      return {
        fontFamily: "'Times New Roman', serif",
        accentColor: '#1e40af', // Professional blue
        textColor: '#1f2937',    // Dark gray
        backgroundColor: '#ffffff',
        headerStyle: 'formal',
        tone: 'formal',
        headerLayout: 'traditional',
        borderStyle: '3px solid #1e40af',
        tableHeaderBg: '#f8fafc',
        invoiceTitle: 'INVOICE',
        formality: 'FORMAL',
        layout: 'classic'
      };
    case 'friendly':
      return {
        fontFamily: "'Georgia', serif", 
        accentColor: '#059669',  // Warm green
        textColor: '#374151',    // Softer gray
        backgroundColor: '#fefefe',
        headerStyle: 'warm',
        tone: 'casual',
        headerLayout: 'modern',
        borderStyle: '4px solid #059669',
        tableHeaderBg: '#f0fdf4',
        invoiceTitle: 'Invoice',
        formality: 'FRIENDLY',
        layout: 'modern'
      };
    case 'musical':
      return {
        fontFamily: "'Trebuchet MS', sans-serif",
        accentColor: '#7c3aed',  // Creative purple
        textColor: '#6b7280',    // Medium gray
        backgroundColor: '#faf5ff',
        headerStyle: 'creative',
        tone: 'expressive',
        headerLayout: 'artistic',
        borderStyle: '5px double #7c3aed',
        tableHeaderBg: '#faf5ff',
        invoiceTitle: '🎵 Invoice 🎵',
        formality: 'CREATIVE',
        layout: 'artistic'
      };
    default:
      return {
        fontFamily: "'Times New Roman', serif",
        accentColor: '#1e40af',
        textColor: '#1f2937',
        backgroundColor: '#ffffff',
        headerStyle: 'formal',
        tone: 'formal',
        headerLayout: 'standard',
        borderStyle: '2px solid #6b7280',
        tableHeaderBg: '#f9fafb',
        invoiceTitle: 'Invoice',
        formality: 'STANDARD',
        layout: 'classic'
      };
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
  const logoHtml = logoBase64 ? `<img src="data:image/png;base64,${logoBase64}" style="height: 50px; width: auto; margin-bottom: 20px;" alt="MusoBuddy Logo" />` : '';
  
  // Theme-based styling
  const theme = (contract as any).contractTheme || 'professional';
  const themeStyles = getThemeStyles(theme);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Performance Contract ${contract.contractNumber}</title>
      <style>
        body {
          font-family: ${themeStyles.fontFamily};
          line-height: 1.6;
          color: ${themeStyles.textColor};
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          background-color: ${themeStyles.backgroundColor};
        }
        .header {
          text-align: center;
          border-bottom: 3px solid ${themeStyles.accentColor};
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .business-details {
          margin-bottom: 30px;
        }
        .contract-details {
          margin-bottom: 30px;
        }
        .terms {
          margin-bottom: 30px;
        }
        .signature-section {
          margin-top: 50px;
          border-top: 1px solid #ccc;
          padding-top: 30px;
        }
        .signature-box {
          border: 1px solid #333;
          padding: 20px;
          margin: 20px 0;
          background-color: #f9f9f9;
        }
        .signed-box {
          border: 2px solid #4CAF50;
          background-color: #e8f5e8;
        }
        .party-section {
          margin-bottom: 30px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 12px;
          text-align: left;
        }
        th {
          background-color: #f4f4f4;
          font-weight: bold;
        }
        .amount {
          font-weight: bold;
          color: #2563eb;
        }
        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
        }
        .status-signed {
          background-color: #dcfce7;
          color: #166534;
        }
        .status-sent {
          background-color: #fef3c7;
          color: #92400e;
        }
      </style>
    </head>
    <body>
      <div class="header">
        ${logoHtml}
        <h1 style="color: ${themeStyles.accentColor};">${getThemeTitle(theme)}</h1>
        <h2 style="color: ${themeStyles.textColor};">${contract.contractNumber}</h2>
        <div class="status-badge ${contract.status === 'signed' ? 'status-signed' : 'status-sent'}">
          ${contract.status.toUpperCase()}
        </div>
      </div>

      <div class="business-details">
        <h3>Performer Details</h3>
        <p><strong>${businessName}</strong></p>
        ${businessAddress ? `<p>${businessAddress}</p>` : ''}
        ${businessPhone ? `<p>Phone: ${businessPhone}</p>` : ''}
        ${businessEmail ? `<p>Email: ${businessEmail}</p>` : ''}
      </div>

      <div class="contract-details">
        <h3>Event Details</h3>
        <table>
          <tr>
            <th>Client Name</th>
            <td>${contract.clientName}</td>
          </tr>
          <tr>
            <th>Client Email</th>
            <td>${contract.clientEmail}</td>
          </tr>
          ${contract.clientAddress ? `<tr>
            <th>Client Address</th>
            <td>${contract.clientAddress}</td>
          </tr>` : ''}
          ${contract.clientPhone ? `<tr>
            <th>Client Phone</th>
            <td>${contract.clientPhone}</td>
          </tr>` : ''}
          <tr>
            <th>Event Date</th>
            <td>${new Date(contract.eventDate).toLocaleDateString('en-GB', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</td>
          </tr>
          <tr>
            <th>Event Time</th>
            <td>${contract.eventTime || 'Time TBC'}${contract.eventEndTime ? ` - ${contract.eventEndTime}` : ''}</td>
          </tr>
          <tr>
            <th>Venue</th>
            <td>${contract.venue}</td>
          </tr>
          <tr>
            <th>Performance Fee</th>
            <td class="amount">£${contract.fee}</td>
          </tr>
        </table>
      </div>

      <div class="terms">
        <h3 style="color: ${themeStyles.accentColor};">${getThemeTermsTitle(theme)}</h3>
        
        <div style="margin-top: 20px; padding: 15px; background-color: ${getThemeBoxColor(theme)}; border-radius: 5px; font-size: 14px;">
          <h4 style="margin-top: 0; color: ${themeStyles.accentColor};">${getThemePaymentTitle(theme)}</h4>
          <p><strong>Payment Due Date:</strong> Full payment of £${contract.fee} becomes due and payable no later than the day of performance. Payment must be received before or immediately upon completion of the performance.</p>
          <p><strong>Payment Methods:</strong> Cash or bank transfer to the performer's designated account (details provided separately).</p>
          ${contract.deposit ? `<p><strong>Deposit:</strong> £${contract.deposit} deposit required to secure booking. Deposit is non-refundable except as outlined in the cancellation policy below.</p>` : ''}
          <p><strong>Late Payment:</strong> Any payment received after the due date may incur a late payment fee of £25 plus interest at 2% per month.</p>
          
          <h4 style="color: #2563eb; margin-top: 20px;">Cancellation & Refund Policy</h4>
          <p><strong>Client Cancellation:</strong></p>
          <ul style="margin-left: 20px;">
            <li>More than 30 days before event: Any deposit paid will be refunded minus a £50 administration fee</li>
            <li>30 days or less before event: Full performance fee becomes due regardless of cancellation</li>
            <li>Same day cancellation: Full fee due plus any additional costs incurred</li>
          </ul>
          <p><strong>Performer Cancellation:</strong> In the unlikely event the performer must cancel due to circumstances within their control, all payments will be refunded in full and reasonable assistance will be provided to find a suitable replacement.</p>
          <p><strong>Rescheduling:</strong> Event may be rescheduled once without penalty if agreed by both parties at least 14 days in advance. Additional rescheduling requests may incur a £25 administrative fee.</p>
          
          <h4 style="color: #2563eb; margin-top: 20px;">Force Majeure</h4>
          <p>Neither party shall be liable for any failure to perform due to circumstances beyond their reasonable control, including but not limited to: severe weather, natural disasters, government restrictions, venue closure, or serious illness.</p>
          
          <h4 style="color: #2563eb; margin-top: 20px;">Performance Contingencies</h4>
          <p>The performer will provide appropriate backup equipment where reasonably possible. If performance cannot proceed due to venue-related issues (power failure, noise restrictions, etc.), the full fee remains due.</p>
          
          <h4 style="color: #2563eb; margin-top: 20px;">Professional Performance Standards</h4>
          <p><strong>Payment Schedule:</strong> The agreed performance fee${contract.deposit ? ' (including applicable VAT)' : ''} becomes due and payable on the date of performance of the engagement.</p>
          <p><strong>Equipment & Instrument Protection:</strong> The equipment and instruments of the performer are not available for use by any other person, except by specific permission of the performer. All musical instruments and equipment remain the exclusive property of the performer.</p>
          <p><strong>Venue Safety Requirements:</strong> The client shall ensure a safe supply of electricity and the security of the performer and their property at the venue throughout the engagement.</p>
          <p><strong>Recording & Transmission Policy:</strong> The client shall not make or permit the making of any audio and/or visual recording or transmission of the performer's performance without the prior written consent of the performer.</p>
          <p><strong>Contract Modifications:</strong> This agreement may not be modified or cancelled except by mutual consent, in writing signed by both parties. Verbal modifications are not binding.</p>
          <p><strong>Performance Rider:</strong> Any rider attached hereto and signed by both parties shall be deemed incorporated into this agreement.</p>
          <p><strong>Safe Space Principle:</strong> The client and performer agree to a 'Safe Space' principle to provide a working environment free from harassment and discrimination, maintaining respectful professional standards throughout the engagement.</p>
          <p><strong>Professional Insurance:</strong> The performer maintains professional liability insurance as required for musical performance engagements.</p>
        </div>
      </div>

      <div class="signature-section">
        <h3>Signatures</h3>
        
        <div class="party-section">
          <h4>Performer</h4>
          <div class="signature-box signed-box">
            <p><strong>Signed by:</strong> ${businessName}</p>
            <p><strong>Date:</strong> ${new Date(contract.createdAt).toLocaleDateString('en-GB')}</p>
            <p><strong>Status:</strong> Agreed by sending contract</p>
          </div>
        </div>

        <div class="party-section">
          <h4>Client</h4>
          <div class="signature-box ${contract.status === 'signed' ? 'signed-box' : ''}">
            ${contract.status === 'signed' && signatureDetails ? `
              <p><strong>Signed by:</strong> ${signatureDetails.signatureName || contract.clientName}</p>
              <p><strong>Date:</strong> ${signatureDetails.signedAt.toLocaleDateString('en-GB')} at ${signatureDetails.signedAt.toLocaleTimeString('en-GB')}</p>
              <p><strong>Status:</strong> Digitally Signed</p>
            ` : `
              <p><strong>Status:</strong> Awaiting Signature</p>
              <p>This contract has been sent to ${contract.clientEmail} for digital signature.</p>
            `}
          </div>
        </div>
      </div>

      <div style="margin-top: 50px; padding: 20px; background-color: #f0f0f0; border-radius: 5px; font-size: 12px; color: #666;">
        <p><strong>Legal Information & Governing Terms:</strong></p>
        <p>Contract Number: ${contract.contractNumber}</p>
        <p>Generated: ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB')}</p>
        <p><strong>Binding Agreement:</strong> This is a legally binding agreement between the parties named above. Both parties acknowledge they have read, understood, and agree to be bound by all terms and conditions set forth herein.</p>
        <p><strong>Governing Law & Jurisdiction:</strong> This contract shall be governed by and construed in accordance with the laws of England and Wales. Any disputes, claims, or legal proceedings arising from or relating to this agreement shall be subject to the exclusive jurisdiction of the courts of England and Wales.</p>
        <p><strong>Digital Signatures:</strong> Digital signatures are legally binding under the Electronic Communications Act 2000 and eIDAS Regulation. Electronic acceptance constitutes agreement to all terms.</p>
        <p><strong>Entire Agreement:</strong> This contract represents the entire agreement between the parties and supersedes all prior negotiations, representations, or agreements. No modification shall be valid unless in writing and signed by both parties.</p>
        <p><strong>Severability:</strong> If any provision of this contract is found to be unenforceable, the remaining provisions shall continue in full force and effect.</p>
        <p><strong>Contract Validity:</strong> This contract remains valid and enforceable regardless of changes in circumstances, location, or contact information of either party.</p>
      </div>

      <div style="margin-top: 30px; padding: 15px; text-align: center; border-top: 1px solid #ccc; color: #999; font-size: 12px;">
        <p style="margin: 0;">Powered by <strong style="color: #9333ea;">MusoBuddy</strong> – less admin, more music.</p>
      </div>
    </body>
    </html>
  `;
}

export async function generateInvoicePDF(
  invoice: Invoice,
  userSettings: UserSettings | null,
  contract?: any
): Promise<Buffer> {
  console.log('Starting invoice PDF generation for:', invoice.invoiceNumber);
  
  // RESTORED: Working Puppeteer configuration from previous version
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

function generateInvoiceHTML(
  invoice: Invoice,
  contract: Contract | null,
  userSettings: UserSettings | null
): string {
  const businessName = userSettings?.businessName || 'MusoBuddy';
  
  // Build business address from individual fields (same as contract generation)
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
  
  // Theme-based styling for invoices with dramatic differences
  const theme = (invoice as any).invoiceTheme || 'professional';
  const themeStyles = getThemeStyles(theme);
  
  // Generate theme-specific content and layouts
  function getThemeSpecificContent() {
    switch (theme) {
      case 'professional':
        return {
          headerClass: 'professional-header',
          billingTitle: 'BILLING INFORMATION',
          itemsTableClass: 'formal-table',
          footerNote: 'This invoice is issued in accordance with professional standards.',
          pageStyle: 'border-top: 8px solid #1e40af;'
        };
      case 'friendly':
        return {
          headerClass: 'friendly-header',
          billingTitle: 'Who\'s Paying What',
          itemsTableClass: 'friendly-table',
          footerNote: 'Thanks for choosing us! We really appreciate your business.',
          pageStyle: 'border-left: 8px solid #059669; border-radius: 8px;'
        };
      case 'musical':
        return {
          headerClass: 'musical-header',
          billingTitle: '🎼 Show Me The Money 🎼',
          itemsTableClass: 'musical-table',
          footerNote: '🎵 Keep the music playing and the payments flowing! 🎵',
          pageStyle: 'border: 6px double #7c3aed; border-radius: 15px; background: linear-gradient(45deg, #faf5ff, #ffffff);'
        };
      default:
        return {
          headerClass: 'standard-header',
          billingTitle: 'Billing Information',
          itemsTableClass: 'standard-table',
          footerNote: 'Standard invoice terms apply.',
          pageStyle: ''
        };
    }
  }
  
  const themeContent = getThemeSpecificContent();
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Invoice ${invoice.invoiceNumber}</title>
      <style>
        body {
          font-family: ${themeStyles.fontFamily};
          margin: 0;
          padding: 20px;
          color: ${themeStyles.textColor};
          line-height: 1.6;
          background-color: ${themeStyles.backgroundColor};
          ${themeContent.pageStyle}
        }
        
        /* Professional Theme Styling */
        .professional-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 40px;
          border-bottom: 4px solid #1e40af;
          padding-bottom: 20px;
          background: linear-gradient(135deg, #f8fafc, #ffffff);
          padding: 20px;
          margin: -20px -20px 40px -20px;
        }
        
        /* Friendly Theme Styling */
        .friendly-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 40px;
          border-bottom: 4px solid #059669;
          border-radius: 12px;
          padding: 25px;
          background: linear-gradient(135deg, #f0fdf4, #ffffff);
          box-shadow: 0 4px 6px rgba(5, 150, 105, 0.1);
          margin: -20px -20px 40px -20px;
        }
        
        /* Musical Theme Styling */
        .musical-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 40px;
          border: 4px double #7c3aed;
          border-radius: 20px;
          padding: 30px;
          background: linear-gradient(135deg, #faf5ff, #f3e8ff, #ffffff);
          box-shadow: 0 8px 16px rgba(124, 58, 237, 0.15);
          margin: -20px -20px 40px -20px;
          position: relative;
        }
        .musical-header::before {
          content: "🎵";
          position: absolute;
          top: 10px;
          left: 20px;
          font-size: 20px;
          opacity: 0.3;
        }
        .musical-header::after {
          content: "🎵";
          position: absolute;
          bottom: 10px;
          right: 20px;
          font-size: 20px;
          opacity: 0.3;
        }
        
        .logo-section {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .logo {
          font-size: ${theme === 'musical' ? '36px' : theme === 'friendly' ? '30px' : '28px'};
          font-weight: bold;
          color: ${themeStyles.accentColor};
          ${theme === 'musical' ? 'text-shadow: 2px 2px 4px rgba(124, 58, 237, 0.3);' : ''}
        }
        .invoice-details {
          text-align: right;
        }
        .invoice-number {
          font-size: ${theme === 'musical' ? '28px' : '24px'};
          font-weight: bold;
          color: ${themeStyles.accentColor};
          margin-bottom: 5px;
          ${theme === 'musical' ? 'text-shadow: 1px 1px 2px rgba(124, 58, 237, 0.2);' : ''}
        }
        .invoice-date {
          color: #666;
          font-size: 14px;
        }
        
        /* Theme-specific billing sections */
        .billing-section {
          display: flex;
          justify-content: space-between;
          margin-bottom: 40px;
        }
        .billing-info {
          width: 45%;
        }
        .billing-info h3 {
          color: ${themeStyles.accentColor};
          margin-bottom: 15px;
          font-size: ${theme === 'musical' ? '18px' : '16px'};
          ${theme === 'professional' ? 'text-transform: uppercase; letter-spacing: 1px;' : ''}
          ${theme === 'musical' ? 'text-shadow: 1px 1px 2px rgba(124, 58, 237, 0.2);' : ''}
        }
        .billing-info p {
          margin: 5px 0;
          color: ${themeStyles.textColor};
        }
        .billing-info strong {
          color: ${themeStyles.accentColor};
        }
        
        /* Theme-specific table styling */
        .formal-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
          border: 2px solid #1e40af;
        }
        .formal-table th {
          background-color: #f8fafc;
          padding: 15px;
          text-align: left;
          border-bottom: 2px solid #1e40af;
          font-weight: bold;
          color: #1e40af;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .formal-table td {
          padding: 15px;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .friendly-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1);
        }
        .friendly-table th {
          background-color: #f0fdf4;
          padding: 18px;
          text-align: left;
          border-bottom: 3px solid #059669;
          font-weight: bold;
          color: #059669;
        }
        .friendly-table td {
          padding: 18px;
          border-bottom: 1px solid #d1fae5;
        }
        
        .musical-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
          border: 3px double #7c3aed;
          border-radius: 12px;
          overflow: hidden;
          background: linear-gradient(135deg, #faf5ff, #ffffff);
        }
        .musical-table th {
          background: linear-gradient(135deg, #faf5ff, #f3e8ff);
          padding: 20px;
          text-align: left;
          border-bottom: 3px solid #7c3aed;
          font-weight: bold;
          color: #7c3aed;
          text-shadow: 1px 1px 2px rgba(124, 58, 237, 0.1);
        }
        .musical-table td {
          padding: 20px;
          border-bottom: 1px solid #e9d5ff;
        }
        
        .items-table .amount {
          text-align: right;
          font-weight: bold;
          color: ${themeStyles.accentColor};
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
          color: ${themeStyles.accentColor};
          border-top: 2px solid ${themeStyles.accentColor};
          padding-top: 15px;
          margin-top: 15px;
        }
        .payment-info {
          margin-top: 40px;
          padding: 20px;
          background-color: ${getThemeBoxColor(theme)};
          border-radius: 8px;
        }
        .payment-info h3 {
          color: ${themeStyles.accentColor};
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
          color: ${themeStyles.accentColor};
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
      <div class="${themeContent.headerClass}">
        <div class="logo-section">
          ${logoHtml}
          <div class="logo">${businessName}</div>
        </div>
        <div class="invoice-details">
          <div class="invoice-number">${themeStyles.invoiceTitle} ${invoice.invoiceNumber}</div>
          <div class="invoice-date">${new Date(invoice.createdAt || '').toLocaleDateString('en-GB')}</div>
          <div style="margin-top: 10px;">
            <span class="status-badge status-${invoice.status}">${invoice.status}</span>
          </div>
        </div>
      </div>

      <div class="billing-section">
        <div class="billing-info">
          <h3>${theme === 'professional' ? 'FROM:' : theme === 'friendly' ? 'From:' : '🎤 From:'}</h3>
          <p><strong>${businessName}</strong></p>
          <p style="font-style: italic; color: #666;">${theme === 'professional' ? 'Sole trader trading as' : theme === 'friendly' ? 'Trading as' : '🎵 Performing as'} ${businessName}</p>
          ${businessAddress ? `<p>${businessAddress}</p>` : ''}
          ${businessPhone ? `<p>${theme === 'musical' ? '📞 ' : ''}Phone: ${businessPhone}</p>` : ''}
          ${businessEmail ? `<p>${theme === 'musical' ? '📧 ' : ''}Email: ${businessEmail}</p>` : ''}
          ${userSettings?.website ? `<p>${theme === 'musical' ? '🌐 ' : ''}Website: ${userSettings.website}</p>` : ''}
        </div>
        <div class="billing-info">
          <h3>${themeContent.billingTitle}</h3>
          <p><strong>${invoice.clientName}</strong></p>
          ${invoice.clientAddress ? `<p>${invoice.clientAddress.replace(/\n/g, '<br>')}</p>` : ''}
          ${(invoice.clientEmail || contract?.clientEmail) ? `<p>${theme === 'musical' ? '📧 ' : ''}${invoice.clientEmail || contract?.clientEmail}</p>` : ''}
          ${contract?.clientPhone ? `<p>${theme === 'musical' ? '📞 ' : ''}${contract.clientPhone}</p>` : ''}
        </div>
      </div>

      <table class="${themeContent.itemsTableClass}">
        <thead>
          <tr>
            <th>${theme === 'musical' ? '🎵 ' : ''}Description</th>
            <th>${theme === 'musical' ? '📅 ' : ''}Event Date</th>
            <th>${theme === 'musical' ? '💰 ' : ''}Performance Fee</th>
            <th>${theme === 'musical' ? '💸 ' : ''}Deposit Paid</th>
            <th class="amount">${theme === 'musical' ? '💳 ' : ''}Amount Due</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${theme === 'musical' ? '🎼 ' : ''}Music Performance${invoice.venueAddress ? `<br><strong>${theme === 'musical' ? '🏢 ' : ''}Venue:</strong> ${invoice.venueAddress}` : ''}</td>
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
        <h3>${getThemePaymentTitle(theme)}</h3>
        <p>${theme === 'professional' ? 'All invoices are to be paid within seven days of receipt.' : 
             theme === 'friendly' ? 'We\'d appreciate payment within a week - thanks!' : 
             '🎵 Please pay within 7 days to keep the music flowing! 🎵'}</p>
        <p>${theme === 'professional' ? 'VAT Status: I am not VAT registered and therefore no VAT is charged.' :
             theme === 'friendly' ? 'VAT Status: We\'re not VAT registered, so no VAT included.' :
             '💰 VAT Status: No VAT registration = no VAT charges! 💰'}</p>
      </div>

      <div style="text-align: center; margin-top: 40px; padding: 20px; 
                  ${theme === 'musical' ? 'background: linear-gradient(135deg, #faf5ff, #f3e8ff);' : ''}
                  ${theme === 'friendly' ? 'background: linear-gradient(135deg, #f0fdf4, #ffffff);' : ''}
                  ${theme === 'professional' ? 'background: linear-gradient(135deg, #f8fafc, #ffffff);' : ''}
                  border-radius: 8px; color: ${themeStyles.accentColor}; font-size: 12px;">
        <p>${themeContent.footerNote}</p>
        <p style="margin-top: 10px; font-style: italic;">
          ${theme === 'musical' ? '🎵 ' : ''}Powered by MusoBuddy${theme === 'musical' ? ' 🎵' : ''} – ${theme === 'professional' ? 'Professional music business management' : theme === 'friendly' ? 'less admin, more music' : 'keeping the beat in your business!'}
        </p>
      </div>
    </body>
    </html>
  `;
}