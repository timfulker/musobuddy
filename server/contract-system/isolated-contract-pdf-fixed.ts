// ISOLATED CONTRACT PDF GENERATOR - PROFESSIONAL TEMPLATE ONLY
// Version: 2025.08.05.002 - BASIC TEMPLATE COMPLETELY REMOVED

import puppeteer from 'puppeteer';
import chromium from '@sparticuz/chromium';
import type { IsolatedContractData, IsolatedUserSettings } from './isolated-contract-types';

// ONLY PROFESSIONAL TEMPLATE - BASIC TEMPLATE COMPLETELY REMOVED
function getIsolatedProfessionalTemplate(contract: IsolatedContractData, userSettings: IsolatedUserSettings | null): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Professional Performance Agreement - ${contract.contractNumber}</title>
    <style>
        @page {
            size: A4;
            margin: 15mm;
        }
        
        * { 
            margin: 0; 
            padding: 0; 
            box-sizing: border-box; 
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            line-height: 1.5;
            color: #1e293b;
            background: white;
            font-size: 11px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        
        .container {
            width: 100%;
            max-width: none;
            padding: 0;
        }
        
        .header {
            background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
            color: white;
            padding: 25px;
            text-align: center;
            margin-bottom: 25px;
            border-radius: 8px;
            page-break-inside: avoid;
        }
        
        .header h1 {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 8px;
        }
        
        .header .contract-ref {
            font-size: 14px;
            opacity: 0.9;
            font-weight: 500;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 25px;
        }
        
        .info-section {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 15px;
            page-break-inside: avoid;
        }
        
        .info-section h3 {
            color: #3b82f6;
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 10px;
            border-bottom: 2px solid #3b82f6;
            padding-bottom: 5px;
        }
        
        .info-item {
            margin-bottom: 8px;
            display: flex;
            justify-content: space-between;
        }
        
        .info-label {
            font-weight: 500;
            color: #64748b;
            flex-shrink: 0;
            margin-right: 10px;
        }
        
        .info-value {
            font-weight: 600;
            color: #1e293b;
            text-align: right;
            flex-grow: 1;
        }
        
        .event-details {
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
            border: 2px solid #3b82f6;
            border-radius: 12px;
            padding: 20px;
            margin: 25px 0;
            page-break-inside: avoid;
        }
        
        .event-details h2 {
            color: #1e40af;
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 15px;
            text-align: center;
        }
        
        .event-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
        }
        
        .event-item {
            background: white;
            padding: 12px;
            border-radius: 6px;
            border-left: 4px solid #3b82f6;
            text-align: center;
        }
        
        .event-item .label {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748b;
            font-weight: 600;
            margin-bottom: 4px;
        }
        
        .event-item .value {
            font-size: 13px;
            font-weight: 700;
            color: #1e293b;
        }
        
        .financial-section {
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            border: 2px solid #0ea5e9;
            border-radius: 12px;
            padding: 20px;
            margin: 25px 0;
            page-break-inside: avoid;
        }
        
        .financial-section h2 {
            color: #0c4a6e;
            font-size: 16px;
            font-weight: 700;
            margin-bottom: 15px;
            text-align: center;
        }
        
        .financial-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }
        
        .financial-item {
            background: white;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #bae6fd;
            text-align: center;
        }
        
        .financial-item .amount {
            font-size: 18px;
            font-weight: 700;
            color: #0c4a6e;
            margin-bottom: 5px;
        }
        
        .financial-item .label {
            font-size: 11px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .terms-section {
            margin: 25px 0;
            page-break-inside: avoid;
        }
        
        .terms-section h2 {
            color: #1e40af;
            font-size: 16px;
            font-weight: 700;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid #3b82f6;
        }
        
        .terms-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }
        
        .term-item {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 15px;
            border-left: 4px solid #3b82f6;
        }
        
        .term-item h4 {
            color: #1e40af;
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .term-item p {
            color: #475569;
            font-size: 11px;
            line-height: 1.4;
        }
        
        .signature-section {
            margin-top: 30px;
            padding: 25px;
            background: linear-gradient(135deg, #fefbf3 0%, #fef3c7 100%);
            border: 2px solid #f59e0b;
            border-radius: 12px;
            page-break-inside: avoid;
        }
        
        .signature-section h2 {
            color: #92400e;
            font-size: 16px;
            font-weight: 700;
            text-align: center;
            margin-bottom: 20px;
        }
        
        .signature-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-top: 20px;
        }
        
        .signature-box {
            background: white;
            border: 2px dashed #f59e0b;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
        }
        
        .signature-box h3 {
            color: #92400e;
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 15px;
        }
        
        .signature-line {
            border-bottom: 2px solid #f59e0b;
            height: 40px;
            margin: 15px 0;
        }
        
        .signature-box .name {
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 8px;
        }
        
        .signature-box .date {
            font-size: 10px;
            color: #64748b;
        }
        
        .footer {
            margin-top: 30px;
            padding: 15px;
            background: #f1f5f9;
            border-radius: 8px;
            text-align: center;
            border: 1px solid #cbd5e1;
        }
        
        .footer p {
            font-size: 10px;
            color: #64748b;
            line-height: 1.4;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Professional Performance Agreement</h1>
            <div class="contract-ref">Contract Reference: ${contract.contractNumber}</div>
        </div>
        
        <div class="info-grid">
            <div class="info-section">
                <h3>Client Information</h3>
                <div class="info-item">
                    <span class="info-label">Name:</span>
                    <span class="info-value">${contract.clientName}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Email:</span>
                    <span class="info-value">${contract.clientEmail}</span>
                </div>
                ${contract.clientPhone ? `
                <div class="info-item">
                    <span class="info-label">Phone:</span>
                    <span class="info-value">${contract.clientPhone}</span>
                </div>` : ''}
            </div>
            
            <div class="info-section">
                <h3>Performer Information</h3>
                <div class="info-item">
                    <span class="info-label">Name:</span>
                    <span class="info-value">${userSettings?.businessName || 'Professional Performer'}</span>
                </div>
                ${userSettings?.businessEmail ? `
                <div class="info-item">
                    <span class="info-label">Email:</span>
                    <span class="info-value">${userSettings.businessEmail}</span>
                </div>` : ''}
                ${userSettings?.businessPhone ? `
                <div class="info-item">
                    <span class="info-label">Phone:</span>
                    <span class="info-value">${userSettings.businessPhone}</span>
                </div>` : ''}
            </div>
        </div>
        
        <div class="event-details">
            <h2>Event Details</h2>
            <div class="event-grid">
                <div class="event-item">
                    <div class="label">Date</div>
                    <div class="value">${new Date(contract.eventDate).toLocaleDateString('en-GB')}</div>
                </div>
                <div class="event-item">
                    <div class="label">Start Time</div>
                    <div class="value">${contract.eventTime}</div>
                </div>
                <div class="event-item">
                    <div class="label">End Time</div>
                    <div class="value">${contract.eventEndTime}</div>
                </div>
            </div>
            <div style="margin-top: 15px; text-align: center; background: white; padding: 12px; border-radius: 6px;">
                <div class="label" style="margin-bottom: 5px;">Venue</div>
                <div class="value" style="font-size: 14px;">${contract.venue || 'To be confirmed'}</div>
            </div>
        </div>
        
        <div class="financial-section">
            <h2>Financial Terms</h2>
            <div class="financial-grid">
                <div class="financial-item">
                    <div class="amount">£${contract.fee}</div>
                    <div class="label">Performance Fee</div>
                </div>
                <div class="financial-item">
                    <div class="amount">£${contract.deposit || '0.00'}</div>
                    <div class="label">Deposit Required</div>
                </div>
            </div>
        </div>
        
        <div class="terms-section">
            <h2>Terms & Conditions</h2>
            <div class="terms-grid">
                <div class="term-item">
                    <h4>Payment</h4>
                    <p>${contract.paymentInstructions || 'Payment due within 30 days of performance.'}</p>
                </div>
                <div class="term-item">
                    <h4>Cancellation</h4>
                    <p>48 hours notice required for cancellation. Deposit may be retained for late cancellations.</p>
                </div>
                <div class="term-item">
                    <h4>Equipment</h4>
                    <p>${contract.equipmentRequirements || 'Professional sound equipment will be provided.'}</p>
                </div>
                <div class="term-item">
                    <h4>Special Requirements</h4>
                    <p>${contract.specialRequirements || 'None specified.'}</p>
                </div>
            </div>
        </div>
        
        <div class="signature-section">
            <h2>Agreement Signatures</h2>
            <p style="text-align: center; margin-bottom: 20px; color: #92400e;">
                By signing below, both parties agree to the terms and conditions outlined in this contract.
            </p>
            
            <div class="signature-grid">
                <div class="signature-box">
                    <h3>Performer Signature</h3>
                    <div class="signature-line"></div>
                    <div class="name">${userSettings?.businessName || 'Professional Performer'}</div>
                    <div class="date">Date: _______________</div>
                </div>
                <div class="signature-box">
                    <h3>Client Signature</h3>
                    <div class="signature-line"></div>
                    <div class="name">${contract.clientName}</div>
                    <div class="date">Date: _______________</div>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <p>This contract is governed by the laws of England and Wales. Any disputes shall be resolved through binding arbitration.</p>
            <p>Generated by MusoBuddy Professional Contract System - ${new Date().toLocaleDateString('en-GB')}</p>
        </div>
    </div>
</body>
</html>`;
}

// PDF Generator class with enhanced rendering
class IsolatedContractPDFGenerator {
  private browser: puppeteer.Browser | null = null;

  private async initBrowser(): Promise<puppeteer.Browser> {
    if (!this.browser) {
      console.log('🚀 Initializing Puppeteer browser with Chromium...');
      this.browser = await puppeteer.launch({
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
        args: [
          ...chromium.args,
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-default-apps',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding'
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
    console.log(`🎨 Starting professional contract PDF generation...`);
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
      // Set exact viewport from working invoice system
      await page.setViewport({ width: 794, height: 1123 });
      
      // Always use professional template
      console.log(`🎨 Using professional template for contract #${contract.id}`);
      const htmlContent = getIsolatedProfessionalTemplate(contract, userSettings);

      console.log('📝 Setting HTML content...');
      await page.setContent(htmlContent, { 
        waitUntil: 'domcontentloaded',
        timeout: 10000 
      });

      // Wait for fonts and content
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('🎯 Generating PDF with enhanced settings...');
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: false,
        displayHeaderFooter: false,
        margin: {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm'
        },
        scale: 0.9,
        timeout: 30000
      });

      console.log(`✅ Professional contract PDF generated: ${pdfBuffer.length} bytes`);
      
      return pdfBuffer;

    } catch (error) {
      console.error('❌ PDF generation error:', error);
      throw error;
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