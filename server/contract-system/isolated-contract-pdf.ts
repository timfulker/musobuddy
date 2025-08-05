// ISOLATED CONTRACT PDF GENERATOR - COMPLETELY INDEPENDENT
// Version: 2025.08.04.002 - CONTRACT SYSTEM ISOLATION
// NO IMPORTS FROM MAIN SYSTEM - PREVENTS CASCADING FAILURES

import puppeteer from 'puppeteer';
import type { IsolatedContractData, IsolatedUserSettings } from './isolated-contract-types';

// ISOLATED TEMPLATE FUNCTIONS - NO EXTERNAL DEPENDENCIES
function getIsolatedBasicTemplate(contract: IsolatedContractData, userSettings: IsolatedUserSettings | null): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Performance Contract - ${contract.contractNumber}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Inter', Arial, sans-serif;
            line-height: 1.6;
            color: #2d3748;
            background: white;
            font-size: 14px;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
            background: white;
        }
        
        .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 3px solid #9f7aea;
        }
        
        .logo {
            width: 80px;
            height: 80px;
            margin: 0 auto 20px;
            background: #9f7aea;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 24px;
            font-weight: bold;
        }
        
        h1 {
            color: #9f7aea;
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 10px;
        }
        
        .contract-details {
            background: #f8f4ff;
            padding: 25px;
            border-radius: 12px;
            margin: 30px 0;
            border-left: 5px solid #9f7aea;
        }
        
        .details-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-top: 20px;
        }
        
        .detail-item {
            padding: 15px;
            background: white;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
        }
        
        .detail-label {
            font-weight: 600;
            color: #9f7aea;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 5px;
        }
        
        .detail-value {
            font-size: 16px;
            font-weight: 500;
            color: #2d3748;
        }
        
        .terms-section {
            margin: 40px 0;
            padding: 30px;
            background: #fafafa;
            border-radius: 12px;
        }
        
        .terms-section h2 {
            color: #9f7aea;
            font-size: 20px;
            margin-bottom: 20px;
            font-weight: 600;
        }
        
        .signature-section {
            margin-top: 60px;
            padding: 30px;
            background: #f8f4ff;
            border-radius: 12px;
            border: 2px dashed #9f7aea;
        }
        
        .signature-boxes {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-top: 30px;
        }
        
        .signature-box {
            text-align: center;
            padding: 20px;
            background: white;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
        }
        
        .signature-line {
            border-bottom: 2px solid #9f7aea;
            height: 40px;
            margin: 20px 0;
        }
        
        @media print {
            body { font-size: 12px; }
            .container { padding: 20px; }
            .signature-section { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">♪</div>
            <h1>Performance Contract</h1>
            <p style="color: #666; font-size: 16px;">${contract.contractNumber}</p>
        </div>

        <div class="contract-details">
            <h2 style="color: #9f7aea; margin-bottom: 20px;">Event Details</h2>
            <div class="details-grid">
                <div class="detail-item">
                    <div class="detail-label">Client</div>
                    <div class="detail-value">${contract.clientName}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Event Date</div>
                    <div class="detail-value">${new Date(contract.eventDate).toLocaleDateString('en-GB')}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Event Time</div>
                    <div class="detail-value">${contract.eventTime} - ${contract.eventEndTime}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Venue</div>
                    <div class="detail-value">${contract.venue || 'To be confirmed'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Performance Fee</div>
                    <div class="detail-value">£${contract.fee}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Deposit</div>
                    <div class="detail-value">£${contract.deposit || '0.00'}</div>
                </div>
            </div>
        </div>

        <div class="terms-section">
            <h2>Terms & Conditions</h2>
            <ul style="list-style-type: none; padding: 0;">
                <li style="margin-bottom: 15px; padding-left: 20px; position: relative;">
                    <span style="position: absolute; left: 0; color: #9f7aea; font-weight: bold;">1.</span>
                    Payment terms: ${contract.paymentInstructions || 'Payment due on completion of performance.'}
                </li>
                <li style="margin-bottom: 15px; padding-left: 20px; position: relative;">
                    <span style="position: absolute; left: 0; color: #9f7aea; font-weight: bold;">2.</span>
                    Equipment: ${contract.equipmentRequirements || 'Standard PA system required.'}
                </li>
                <li style="margin-bottom: 15px; padding-left: 20px; position: relative;">
                    <span style="position: absolute; left: 0; color: #9f7aea; font-weight: bold;">3.</span>
                    Special requirements: ${contract.specialRequirements || 'None specified.'}
                </li>
                <li style="margin-bottom: 15px; padding-left: 20px; position: relative;">
                    <span style="position: absolute; left: 0; color: #9f7aea; font-weight: bold;">4.</span>
                    Cancellation policy: 48 hours notice required for cancellation.
                </li>
            </ul>
        </div>

        <div class="signature-section">
            <h2 style="text-align: center; color: #9f7aea; margin-bottom: 10px;">Agreement</h2>
            <p style="text-align: center; margin-bottom: 30px;">By signing below, both parties agree to the terms outlined in this contract.</p>
            
            <div class="signature-boxes">
                <div class="signature-box">
                    <h3 style="color: #9f7aea; margin-bottom: 10px;">Performer</h3>
                    <div class="signature-line"></div>
                    <p><strong>${userSettings?.businessName || 'MusoBuddy Performer'}</strong></p>
                    <p style="font-size: 12px; color: #666;">Date: ___________</p>
                </div>
                <div class="signature-box">
                    <h3 style="color: #9f7aea; margin-bottom: 10px;">Client</h3>
                    <div class="signature-line"></div>
                    <p><strong>${contract.clientName}</strong></p>
                    <p style="font-size: 12px; color: #666;">Date: ___________</p>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;
}

function getIsolatedProfessionalTemplate(contract: IsolatedContractData, userSettings: IsolatedUserSettings | null): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Professional Performance Contract - ${contract.contractNumber}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Inter', Arial, sans-serif;
            line-height: 1.6;
            color: #1a202c;
            background: white;
            font-size: 14px;
        }
        
        .container {
            max-width: 820px;
            margin: 0 auto;
            padding: 50px;
            background: white;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 50px;
            padding-bottom: 30px;
            border-bottom: 3px solid #3b82f6;
        }
        
        .logo-section {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .logo {
            width: 60px;
            height: 60px;
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 20px;
            font-weight: bold;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }
        
        .company-info {
            text-align: left;
        }
        
        .company-name {
            font-size: 22px;
            font-weight: 700;
            color: #1a202c;
            margin-bottom: 5px;
        }
        
        .company-details {
            color: #4a5568;
            font-size: 13px;
            line-height: 1.4;
        }
        
        .contract-header {
            text-align: right;
        }
        
        h1 {
            color: #3b82f6;
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 8px;
        }
        
        .contract-number {
            color: #4a5568;
            font-size: 16px;
            font-weight: 500;
        }
        
        .parties-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin: 40px 0;
            padding: 35px;
            background: linear-gradient(135deg, #f8fafc, #e2e8f0);
            border-radius: 16px;
            border: 1px solid #e2e8f0;
        }
        
        .party-box {
            background: white;
            padding: 25px;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }
        
        .party-title {
            color: #3b82f6;
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid #3b82f6;
        }
        
        .event-details {
            margin: 40px 0;
            padding: 35px;
            background: white;
            border: 2px solid #3b82f6;
            border-radius: 16px;
            position: relative;
            overflow: hidden;
        }
        
        .event-details::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 6px;
            background: linear-gradient(90deg, #3b82f6, #1d4ed8);
        }
        
        .event-title {
            color: #3b82f6;
            font-size: 20px;
            font-weight: 700;
            margin-bottom: 25px;
            text-align: center;
        }
        
        .details-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
        }
        
        .detail-card {
            background: #f8fafc;
            padding: 20px;
            border-radius: 10px;
            border-left: 4px solid #3b82f6;
            transition: all 0.2s;
        }
        
        .detail-card:hover {
            background: #f1f5f9;
        }
        
        .detail-label {
            font-weight: 600;
            color: #3b82f6;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            margin-bottom: 8px;
        }
        
        .detail-value {
            font-size: 16px;
            font-weight: 500;
            color: #1a202c;
        }
        
        .fee-highlight {
            font-size: 20px;
            font-weight: 700;
            color: #059669;
        }
        
        .terms-section {
            margin: 50px 0;
            padding: 40px;
            background: #fafbfc;
            border-radius: 16px;
            border: 1px solid #e5e7eb;
        }
        
        .terms-title {
            color: #3b82f6;
            font-size: 22px;
            font-weight: 700;
            margin-bottom: 25px;
            text-align: center;
        }
        
        .terms-list {
            list-style: none;
            padding: 0;
        }
        
        .terms-list li {
            margin-bottom: 20px;
            padding: 20px;
            background: white;
            border-radius: 10px;
            border-left: 4px solid #3b82f6;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
            position: relative;
            padding-left: 60px;
        }
        
        .terms-list li::before {
            content: counter(term-counter);
            counter-increment: term-counter;
            position: absolute;
            left: 20px;
            top: 20px;
            background: #3b82f6;
            color: white;
            width: 25px;
            height: 25px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            font-size: 12px;
        }
        
        .terms-list {
            counter-reset: term-counter;
        }
        
        .signature-section {
            margin-top: 60px;
            padding: 40px;
            background: linear-gradient(135deg, #f8fafc, #e2e8f0);
            border-radius: 16px;
            border: 2px solid #3b82f6;
        }
        
        .signature-title {
            text-align: center;
            color: #3b82f6;
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 15px;
        }
        
        .signature-subtitle {
            text-align: center;
            color: #4a5568;
            margin-bottom: 40px;
            font-size: 16px;
        }
        
        .signature-boxes {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 50px;
        }
        
        .signature-box {
            background: white;
            padding: 30px;
            border-radius: 12px;
            border: 2px solid #e2e8f0;
            text-align: center;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }
        
        .signature-box h3 {
            color: #3b82f6;
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 20px;
        }
        
        .signature-line {
            border-bottom: 2px solid #3b82f6;
            height: 50px;
            margin: 25px 0;
            position: relative;
        }
        
        .signature-line::after {
            content: 'Signature';
            position: absolute;
            right: 0;
            bottom: -20px;
            font-size: 11px;
            color: #9ca3af;
            font-style: italic;
        }
        
        .party-name {
            font-weight: 600;
            color: #1a202c;
            margin-bottom: 10px;
        }
        
        .signature-date {
            font-size: 12px;
            color: #6b7280;
            border-bottom: 1px solid #d1d5db;
            padding-bottom: 5px;
            margin-top: 15px;
        }
        
        @media print {
            body { font-size: 12px; }
            .container { padding: 30px; }
            .signature-section { page-break-inside: avoid; }
            .event-details { page-break-inside: avoid; }
        }
        
        @page {
            margin: 2cm;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo-section">
                <div class="logo">♪</div>
                <div class="company-info">
                    <div class="company-name">${userSettings?.businessName || 'MusoBuddy Professional'}</div>
                    <div class="company-details">
                        ${userSettings?.businessEmail || ''}<br>
                        ${userSettings?.businessPhone || ''}<br>
                        ${userSettings?.businessAddress || ''}
                    </div>
                </div>
            </div>
            <div class="contract-header">
                <h1>Professional Contract</h1>
                <div class="contract-number">${contract.contractNumber}</div>
            </div>
        </div>

        <div class="parties-section">
            <div class="party-box">
                <div class="party-title">Performer</div>
                <div style="font-weight: 600; margin-bottom: 10px;">${userSettings?.businessName || 'MusoBuddy Professional'}</div>
                <div style="color: #4a5568; font-size: 13px; line-height: 1.5;">
                    ${userSettings?.businessEmail || ''}<br>
                    ${userSettings?.businessPhone || ''}<br>
                    ${userSettings?.businessAddress || ''}
                </div>
            </div>
            <div class="party-box">
                <div class="party-title">Client</div>
                <div style="font-weight: 600; margin-bottom: 10px;">${contract.clientName}</div>
                <div style="color: #4a5568; font-size: 13px; line-height: 1.5;">
                    ${contract.clientEmail || ''}<br>
                    ${contract.clientPhone || ''}<br>
                    ${contract.clientAddress || ''}
                </div>
            </div>
        </div>

        <div class="event-details">
            <div class="event-title">Event Information</div>
            <div class="details-grid">
                <div class="detail-card">
                    <div class="detail-label">Event Date</div>
                    <div class="detail-value">${new Date(contract.eventDate).toLocaleDateString('en-GB')}</div>
                </div>
                <div class="detail-card">
                    <div class="detail-label">Performance Time</div>
                    <div class="detail-value">${contract.eventTime} - ${contract.eventEndTime}</div>
                </div>
                <div class="detail-card">
                    <div class="detail-label">Venue</div>
                    <div class="detail-value">${contract.venue || 'To be confirmed'}</div>
                </div>
                <div class="detail-card">
                    <div class="detail-label">Performance Fee</div>
                    <div class="detail-value fee-highlight">£${contract.fee}</div>
                </div>
                <div class="detail-card">
                    <div class="detail-label">Deposit Required</div>
                    <div class="detail-value">£${contract.deposit || '0.00'}</div>
                </div>
                <div class="detail-card">
                    <div class="detail-label">Venue Address</div>
                    <div class="detail-value">${contract.venueAddress || 'See venue details'}</div>
                </div>
            </div>
        </div>

        <div class="terms-section">
            <div class="terms-title">Terms & Conditions</div>
            <ul class="terms-list">
                <li><strong>Payment Terms:</strong> ${contract.paymentInstructions || 'Payment due in full on completion of performance. Payment can be made by cash, bank transfer, or cheque.'}</li>
                <li><strong>Equipment & Technical Requirements:</strong> ${contract.equipmentRequirements || 'Client to provide standard PA system suitable for venue size. Power supply (240V) must be available within 10 meters of performance area.'}</li>
                <li><strong>Special Requirements:</strong> ${contract.specialRequirements || 'None specified. Any additional requirements to be agreed in writing by both parties.'}</li>
                <li><strong>Cancellation Policy:</strong> Client may cancel up to 48 hours before event date without penalty. Cancellations within 48 hours of event incur 50% fee. Cancellations within 24 hours incur full fee.</li>
                <li><strong>Force Majeure:</strong> Neither party shall be liable for delays or failures in performance due to circumstances beyond their reasonable control including weather, venue issues, or government restrictions.</li>
                <li><strong>Liability:</strong> Performer maintains appropriate public liability insurance. Client responsible for venue safety and crowd control.</li>
            </ul>
        </div>

        <div class="signature-section">
            <div class="signature-title">Agreement & Signatures</div>
            <div class="signature-subtitle">By signing below, both parties agree to honor all terms and conditions outlined in this professional performance contract.</div>
            
            <div class="signature-boxes">
                <div class="signature-box">
                    <h3>Performer</h3>
                    <div class="signature-line"></div>
                    <div class="party-name">${userSettings?.businessName || 'MusoBuddy Professional'}</div>
                    <div class="signature-date">Date: _______________</div>
                </div>
                <div class="signature-box">
                    <h3>Client</h3>
                    <div class="signature-line"></div>
                    <div class="party-name">${contract.clientName}</div>
                    <div class="signature-date">Date: _______________</div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;
}

export class IsolatedContractPDFGenerator {
  private browser: any = null;

  async initBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      });
    }
    return this.browser;
  }

  async generateContractPDF(
    contract: IsolatedContractData, 
    userSettings: IsolatedUserSettings | null,
    templateName: string = 'professional'
  ): Promise<Buffer> {
    console.log(`🎨 Starting ${templateName} contract PDF generation...`);
    console.log('📄 Contract data:', {
      id: contract.id,
      clientName: contract.clientName,
      venue: contract.venue,
      eventDate: contract.eventDate,
      fee: contract.fee
    });

    const browser = await this.initBrowser();
    const page = await browser.newPage();

    try {
      // Get template HTML
      const templateFunction = templateName === 'basic' ? getIsolatedBasicTemplate : getIsolatedProfessionalTemplate;
      const htmlContent = templateFunction(contract, userSettings);

      console.log('📝 Setting HTML content...');
      await page.setContent(htmlContent, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });

      console.log('🎯 Generating PDF...');
      // Set viewport to ensure proper rendering
      await page.setViewport({ width: 1200, height: 1600 });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: false,
        height: '29.7cm',
        width: '21cm',
        margin: {
          top: '0.5cm',
          right: '0.5cm', 
          bottom: '0.5cm',
          left: '0.5cm'
        },
        timeout: 30000
      });

      console.log(`✅ ${templateName} contract PDF generated: ${pdfBuffer.length} bytes`);
      return pdfBuffer;

    } finally {
      await page.close();
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

// Singleton instance
let pdfGeneratorInstance: IsolatedContractPDFGenerator | null = null;

export async function generateIsolatedContractPDF(
  contract: IsolatedContractData,
  userSettings: IsolatedUserSettings | null,
  templateName: string = 'professional'
): Promise<Buffer> {
  if (!pdfGeneratorInstance) {
    pdfGeneratorInstance = new IsolatedContractPDFGenerator();
  }
  
  return await pdfGeneratorInstance.generateContractPDF(contract, userSettings, templateName);
}