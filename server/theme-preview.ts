import puppeteer from 'puppeteer';

interface ThemeSettings {
  template: string;
  tone: string;
  font: string;
  accentColor: string;
  customTitle: string;
  showSetlist: boolean;
  showRiderNotes: boolean;
  showQrCode: boolean;
  showTerms: boolean;
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;
}

const getFontFamily = (font: string) => {
  switch (font) {
    case 'times':
      return 'Times New Roman, serif';
    case 'arial':
      return 'Arial, sans-serif';
    case 'helvetica':
      return 'Helvetica, Arial, sans-serif';
    case 'georgia':
      return 'Georgia, serif';
    case 'roboto':
      return 'Roboto, sans-serif';
    default:
      return 'Times New Roman, serif';
  }
};

const getTemplateStyles = (template: string, accentColor: string, font: string) => {
  const baseStyles = `
    body {
      font-family: ${getFontFamily(font)};
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background: white;
    }
    .header {
      border-bottom: 2px solid ${accentColor};
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .accent-color {
      color: ${accentColor};
    }
    .accent-bg {
      background-color: ${accentColor};
      color: white;
    }
    .invoice-title {
      font-size: 2.5em;
      font-weight: bold;
      color: ${accentColor};
      margin-bottom: 10px;
    }
    .business-info {
      margin-bottom: 30px;
    }
    .invoice-details {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
    }
    .invoice-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    .invoice-table th,
    .invoice-table td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    .invoice-table th {
      background-color: ${accentColor};
      color: white;
      font-weight: bold;
    }
    .total-section {
      text-align: right;
      margin-top: 20px;
    }
    .total-amount {
      font-size: 1.5em;
      font-weight: bold;
      color: ${accentColor};
    }
    .optional-section {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
    }
    .terms-section {
      margin-top: 30px;
      padding: 20px;
      background-color: #f9f9f9;
      border-left: 4px solid ${accentColor};
    }
  `;

  switch (template) {
    case 'modern':
      return baseStyles + `
        .header {
          background: linear-gradient(135deg, ${accentColor}, ${accentColor}dd);
          color: white;
          padding: 30px;
          border-radius: 10px;
          border: none;
        }
        .invoice-title {
          color: white;
        }
        .business-info {
          color: white;
        }
        .invoice-table {
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
      `;
    case 'minimal':
      return baseStyles + `
        .header {
          border-bottom: 1px solid #eee;
          padding-bottom: 15px;
        }
        .invoice-title {
          font-size: 2em;
          font-weight: 300;
        }
        .invoice-table th {
          background-color: #f8f9fa;
          color: #333;
          border-bottom: 2px solid ${accentColor};
        }
        .terms-section {
          background-color: transparent;
          border-left: 2px solid ${accentColor};
          padding-left: 15px;
        }
      `;
    default: // classic
      return baseStyles;
  }
};

const getToneText = (tone: string) => {
  switch (tone) {
    case 'friendly':
      return {
        greeting: 'Hi there!',
        closing: 'Thanks so much for your business!',
        terms: 'Please remit payment within 30 days. Feel free to reach out if you have any questions!'
      };
    case 'creative':
      return {
        greeting: 'Let\'s make music together!',
        closing: 'Rock on and thanks for the gig!',
        terms: 'Payment is due within 30 days. Let\'s keep the music flowing!'
      };
    default: // professional
      return {
        greeting: 'Thank you for your business.',
        closing: 'We appreciate your continued partnership.',
        terms: 'Payment terms: Net 30 days. Please remit payment by the due date specified above.'
      };
  }
};

export async function generateThemePreviewPDF(settings: ThemeSettings): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    const toneText = getToneText(settings.tone);
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Theme Preview</title>
          <style>
            ${getTemplateStyles(settings.template, settings.accentColor, settings.font)}
          </style>
        </head>
        <body>
          <div class="header">
            <div class="invoice-title">${settings.customTitle}</div>
            <div class="business-info">
              <strong>${settings.businessName}</strong><br>
              ${settings.businessAddress}<br>
              ${settings.businessPhone}<br>
              ${settings.businessEmail}
            </div>
          </div>

          <div class="invoice-details">
            <div>
              <strong>Bill To:</strong><br>
              Sample Client<br>
              123 Client Street<br>
              Client City, CC 12345<br>
              client@example.com
            </div>
            <div>
              <strong>Invoice #:</strong> INV-2024-001<br>
              <strong>Date:</strong> ${new Date().toLocaleDateString()}<br>
              <strong>Due Date:</strong> ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}<br>
              <strong>Event Date:</strong> ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}
            </div>
          </div>

          <table class="invoice-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Quantity</th>
                <th>Rate</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Live Music Performance - Wedding Reception</td>
                <td>1</td>
                <td>£800.00</td>
                <td>£800.00</td>
              </tr>
              <tr>
                <td>Sound System Setup</td>
                <td>1</td>
                <td>£150.00</td>
                <td>£150.00</td>
              </tr>
              <tr>
                <td>Travel Expenses</td>
                <td>1</td>
                <td>£50.00</td>
                <td>£50.00</td>
              </tr>
            </tbody>
          </table>

          <div class="total-section">
            <div><strong>Subtotal: £1,000.00</strong></div>
            <div><strong>VAT (20%): £200.00</strong></div>
            <div class="total-amount">Total: £1,200.00</div>
          </div>

          ${settings.showSetlist ? `
            <div class="optional-section">
              <h3 class="accent-color">Setlist</h3>
              <p>1. Opening Jazz Standards (30 min)</p>
              <p>2. Popular Wedding Songs (45 min)</p>
              <p>3. Dance Floor Hits (60 min)</p>
              <p>4. Closing Ballads (15 min)</p>
            </div>
          ` : ''}

          ${settings.showRiderNotes ? `
            <div class="optional-section">
              <h3 class="accent-color">Technical Requirements</h3>
              <p>• Power supply: 2 x 13A sockets within 10m of performance area</p>
              <p>• Load-in access: Vehicle access required for equipment</p>
              <p>• Setup time: 60 minutes before performance</p>
              <p>• Breakdown time: 30 minutes after performance</p>
            </div>
          ` : ''}

          ${settings.showQrCode ? `
            <div class="optional-section">
              <h3 class="accent-color">Connect With Us</h3>
              <p>Scan QR code for our social media and playlist links</p>
              <div style="border: 2px solid ${settings.accentColor}; width: 100px; height: 100px; display: flex; align-items: center; justify-content: center;">
                [QR CODE]
              </div>
            </div>
          ` : ''}

          ${settings.showTerms ? `
            <div class="terms-section">
              <h3 class="accent-color">Terms & Conditions</h3>
              <p>${toneText.terms}</p>
              <p>Cancellation policy: 48 hours notice required for full refund.</p>
              <p>Weather policy: Indoor backup venue recommended for outdoor events.</p>
            </div>
          ` : ''}

          <div style="margin-top: 40px; text-align: center; color: #666;">
            <p>${toneText.greeting}</p>
            <p>${toneText.closing}</p>
          </div>
        </body>
      </html>
    `;

    await page.setContent(htmlContent);
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });

    return pdfBuffer;
  } finally {
    await browser.close();
  }
}