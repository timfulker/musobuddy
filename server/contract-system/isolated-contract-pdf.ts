// FIXED ISOLATED CONTRACT PDF GENERATOR - SOLVING TRUNCATION
// Version: 2025.08.05.001 - PDF TRUNCATION FIX

import puppeteer from 'puppeteer';
import type { IsolatedContractData, IsolatedUserSettings } from './isolated-contract-types';

// FIXED TEMPLATE FUNCTIONS - OPTIMIZED FOR FULL PDF RENDERING
function getIsolatedBasicTemplate(contract: IsolatedContractData, userSettings: IsolatedUserSettings | null): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Performance Contract - ${contract.contractNumber}</title>
    <style>
        @page {
            size: A4;
            margin: 15mm 15mm 15mm 15mm;
        }
        
        * { 
            margin: 0; 
            padding: 0; 
            box-sizing: border-box; 
        }
        
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.4;
            color: #2d3748;
            background: white;
            font-size: 12px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        
        .container {
            width: 100%;
            max-width: none;
            padding: 0;
        }
        
        .header {
            text-align: center;
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 3px solid #9f7aea;
            page-break-inside: avoid;
        }
        
        .logo {
            width: 60px;
            height: 60px;
            margin: 0 auto 15px;
            background: #9f7aea;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 20px;
            font-weight: bold;
        }
        
        h1 {
            color: #9f7aea;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 8px;
        }
        
        .contract-details {
            background: #f8f4ff;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #9f7aea;
            page-break-inside: avoid;
        }
        
        .details-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-top: 15px;
        }
        
        .detail-item {
            padding: 12px;
            background: white;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
        }
        
        .detail-label {
            font-weight: bold;
            color: #9f7aea;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
        }
        
        .detail-value {
            font-size: 14px;
            font-weight: 500;
            color: #2d3748;
        }
        
        .terms-section {
            margin: 25px 0;
            padding: 20px;
            background: #fafafa;
            border-radius: 8px;
            page-break-inside: avoid;
        }
        
        .terms-section h2 {
            color: #9f7aea;
            font-size: 16px;
            margin-bottom: 15px;
            font-weight: bold;
        }
        
        .terms-list {
            list-style: none;
            padding: 0;
        }
        
        .terms-list li {
            margin-bottom: 12px;
            padding: 12px;
            background: white;
            border-radius: 6px;
            border-left: 3px solid #9f7aea;
            position: relative;
            padding-left: 35px;
        }
        
        .terms-list li::before {
            content: counter(term-counter);
            counter-increment: term-counter;
            position: absolute;
            left: 12px;
            top: 12px;
            background: #9f7aea;
            color: white;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 10px;
        }
        
        .terms-list {
            counter-reset: term-counter;
        }
        
        .signature-section {
            margin-top: 30px;
            padding: 25px;
            background: #f8f4ff;
            border-radius: 8px;
            border: 2px dashed #9f7aea;
            page-break-inside: avoid;
        }
        
        .signature-boxes {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-top: 20px;
        }
        
        .signature-box {
            text-align: center;
            padding: 15px;
            background: white;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
        }
        
        .signature-line {
            border-bottom: 2px solid #9f7aea;
            height: 30px;
            margin: 15px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">♪</div>
            <h1>Performance Contract</h1>
            <p style="color: #666; font-size: 14px;">${contract.contractNumber}</p>
        </div>

        <div class="contract-details">
            <h2 style="color: #9f7aea; margin-bottom: 15px;">Event Details</h2>
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
            <ul class="terms-list">
                <li>Payment terms: ${contract.paymentInstructions || 'Payment due on completion of performance.'}</li>
                <li>Equipment: ${contract.equipmentRequirements || 'Standard PA system required.'}</li>
                <li>Special requirements: ${contract.specialRequirements || 'None specified.'}</li>
                <li>Cancellation policy: 48 hours notice required for cancellation.</li>
            </ul>
        </div>

        <div class="signature-section">
            <h2 style="text-align: center; color: #9f7aea; margin-bottom: 10px;">Agreement</h2>
            <p style="text-align: center; margin-bottom: 20px;">By signing below, both parties agree to the terms outlined in this contract.</p>
            
            <div class="signature-boxes">
                <div class="signature-box">
                    <h3 style="color: #9f7aea; margin-bottom: 8px;">Performer</h3>
                    <div class="signature-line"></div>
                    <p><strong>${userSettings?.businessName || 'MusoBuddy Performer'}</strong></p>
                    <p style="font-size: 10px; color: #666;">Date: ___________</p>
                </div>
                <div class="signature-box">
                    <h3 style="color: #9f7aea; margin-bottom: 8px;">Client</h3>
                    <div class="signature-line"></div>
                    <p><strong>${contract.clientName}</strong></p>
                    <p style="font-size: 10px; color: #666;">Date: ___________</p>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;
}

// CRITICAL FIX: Full professional template with enhanced PDF optimization
function getIsolatedProfessionalTemplate(contract: IsolatedContractData, userSettings: IsolatedUserSettings | null): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=794, initial-scale=1.0">
    <title>Professional Performance Contract - ${contract.contractNumber}</title>
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
            font-family: Arial, sans-serif;
            line-height: 1.4;
            color: #1a202c;
            background: white;
            font-size: 12px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        
        .container {
            width: 100%;
            max-width: none;
            padding: 0;
        }
        
        .page-section {
            page-break-inside: avoid;
            margin-bottom: 20px;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #3b82f6;
            page-break-inside: avoid;
        }
        
        .logo-section {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .logo {
            width: 50px;
            height: 50px;
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 16px;
            font-weight: bold;
        }
        
        h1 {
            color: #3b82f6;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 6px;
        }
        
        .parties-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 25px;
            margin: 25px 0;
            padding: 20px;
            background: #f8fafc;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
            page-break-inside: avoid;
        }
        
        .party-box {
            background: white;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
        }
        
        .party-title {
            color: #3b82f6;
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 10px;
            padding-bottom: 5px;
            border-bottom: 2px solid #3b82f6;
        }
        
        .event-details {
            margin: 25px 0;
            padding: 20px;
            background: white;
            border: 2px solid #3b82f6;
            border-radius: 12px;
            position: relative;
            page-break-inside: avoid;
        }
        
        .event-title {
            color: #3b82f6;
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 15px;
            text-align: center;
        }
        
        .details-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
        }
        
        .detail-card {
            background: #f8fafc;
            padding: 12px;
            border-radius: 8px;
            border-left: 3px solid #3b82f6;
        }
        
        .detail-label {
            font-weight: bold;
            color: #3b82f6;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 5px;
        }
        
        .detail-value {
            font-size: 14px;
            font-weight: 500;
            color: #1a202c;
        }
        
        .terms-section {
            margin: 30px 0;
            padding: 25px;
            background: #fafbfc;
            border-radius: 12px;
            border: 1px solid #e5e7eb;
            page-break-inside: avoid;
        }
        
        .terms-title {
            color: #3b82f6;
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 20px;
            text-align: center;
        }
        
        .terms-list {
            list-style: none;
            padding: 0;
            counter-reset: term-counter;
        }
        
        .terms-list li {
            margin-bottom: 15px;
            padding: 15px;
            background: white;
            border-radius: 8px;
            border-left: 3px solid #3b82f6;
            position: relative;
            padding-left: 45px;
        }
        
        .terms-list li::before {
            content: counter(term-counter);
            counter-increment: term-counter;
            position: absolute;
            left: 15px;
            top: 15px;
            background: #3b82f6;
            color: white;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 10px;
        }
        
        .comprehensive-terms {
            margin: 30px 0;
            page-break-inside: avoid;
        }
        
        .comprehensive-terms h3 {
            color: #3b82f6;
            font-size: 16px;
            margin-bottom: 15px;
            font-weight: bold;
        }
        
        .terms-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        
        .term-block {
            background: white;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
        }
        
        .term-block h4 {
            color: #3b82f6;
            font-size: 14px;
            margin-bottom: 10px;
            font-weight: bold;
        }
        
        .signature-section {
            margin-top: 40px;
            padding: 30px;
            background: #f8fafc;
            border-radius: 12px;
            border: 2px solid #3b82f6;
            page-break-inside: avoid;
        }
        
        .signature-title {
            color: #3b82f6;
            font-size: 18px;
            font-weight: bold;
            text-align: center;
            margin-bottom: 20px;
        }
        
        .signature-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-top: 25px;
        }
        
        .signature-box {
            text-align: center;
            padding: 20px;
            background: white;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
        }
        
        .signature-line {
            border-bottom: 2px solid #3b82f6;
            height: 40px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header Section -->
        <div class="header page-section">
            <div class="logo-section">
                <div class="logo">♪</div>
                <div>
                    <h1>Professional Performance Contract</h1>
                    <p style="color: #4a5568; font-size: 14px;">${contract.contractNumber}</p>
                </div>
            </div>
            <div style="text-align: right;">
                <p style="font-weight: bold; color: #1a202c;">Generated: ${new Date().toLocaleDateString('en-GB')}</p>
                <p style="color: #4a5568;">MusoBuddy Platform</p>
            </div>
        </div>

        <!-- Parties Section -->
        <div class="parties-section page-section">
            <div class="party-box">
                <div class="party-title">PERFORMER</div>
                <p><strong>${userSettings?.businessName || 'MusoBuddy Performer'}</strong></p>
                <p>${userSettings?.businessAddress || 'Address on file'}</p>
                <p>Email: ${userSettings?.businessEmail || 'hello@musobuddy.com'}</p>
                <p>Phone: ${userSettings?.businessPhone || 'Contact via platform'}</p>
            </div>
            <div class="party-box">
                <div class="party-title">CLIENT</div>
                <p><strong>${contract.clientName}</strong></p>
                <p>Email: ${contract.clientEmail}</p>
                <p>Phone: ${contract.clientPhone || 'Contact via email'}</p>
                <p>Event Contact: ${contract.clientName}</p>
            </div>
        </div>

        <!-- Event Details -->
        <div class="event-details page-section">
            <div class="event-title">Event Performance Details</div>
            <div class="details-grid">
                <div class="detail-card">
                    <div class="detail-label">Event Date</div>
                    <div class="detail-value">${new Date(contract.eventDate).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
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
                    <div class="detail-label">Performance Duration</div>
                    <div class="detail-value">${contract.duration || 'As agreed'}</div>
                </div>
                <div class="detail-card">
                    <div class="detail-label">Performance Fee</div>
                    <div class="detail-value" style="font-size: 16px; font-weight: bold; color: #059669;">£${contract.fee}</div>
                </div>
                <div class="detail-card">
                    <div class="detail-label">Deposit Required</div>
                    <div class="detail-value">£${contract.deposit || '0.00'}</div>
                </div>
            </div>
        </div>

        <!-- Basic Terms -->
        <div class="terms-section page-section">
            <div class="terms-title">Performance Terms & Conditions</div>
            <ul class="terms-list">
                <li><strong>Payment Terms:</strong> ${contract.paymentInstructions || 'Full payment due upon completion of performance unless otherwise specified.'}</li>
                <li><strong>Equipment Requirements:</strong> ${contract.equipmentRequirements || 'Standard PA system and microphones to be provided by venue.'}</li>
                <li><strong>Special Requirements:</strong> ${contract.specialRequirements || 'None specified at time of contract.'}</li>
                <li><strong>Setup Requirements:</strong> Minimum 1 hour setup time required before performance start time.</li>
                <li><strong>Sound Check:</strong> 30 minute sound check to be completed before event start time.</li>
            </ul>
        </div>

        <!-- Comprehensive Legal Terms -->
        <div class="comprehensive-terms page-section">
            <h3>Legal Terms & Conditions</h3>
            <div class="terms-grid">
                <div class="term-block">
                    <h4>Cancellation Policy</h4>
                    <p>• 48+ hours notice: Full refund of deposit</p>
                    <p>• 24-48 hours: 50% deposit retained</p>
                    <p>• Less than 24 hours: Full deposit retained</p>
                    <p>• Force majeure events: Mutually agreed resolution</p>
                </div>
                <div class="term-block">
                    <h4>Performance Standards</h4>
                    <p>• Professional equipment and presentation</p>
                    <p>• Punctual arrival and setup</p>
                    <p>• Performance duration as specified</p>
                    <p>• Adherence to venue regulations</p>
                </div>
                <div class="term-block">
                    <h4>Liability & Insurance</h4>
                    <p>• Public liability insurance in force</p>
                    <p>• Equipment insurance coverage</p>
                    <p>• Venue damage responsibility</p>
                    <p>• Personal injury protocols</p>
                </div>
                <div class="term-block">
                    <h4>Intellectual Property</h4>
                    <p>• Performance rights clearances</p>
                    <p>• Recording permissions required</p>
                    <p>• Set list approval process</p>
                    <p>• Copyright compliance</p>
                </div>
            </div>
        </div>

        <!-- Additional Terms -->
        <div class="terms-section page-section">
            <div class="terms-title">Additional Provisions</div>
            <ul class="terms-list">
                <li><strong>Weather Contingency:</strong> For outdoor events, suitable indoor backup venue or postponement arrangement must be agreed.</li>
                <li><strong>Technical Requirements:</strong> Venue must provide adequate power supply and weather protection for equipment.</li>
                <li><strong>Parking & Access:</strong> Reasonable vehicle access and parking to be provided for equipment loading.</li>
                <li><strong>Refreshments:</strong> Light refreshments and drinking water to be provided during performance period.</li>
                <li><strong>Marketing & Promotion:</strong> Client may use performer name and image for event promotion with prior consent.</li>
            </ul>
        </div>

        <!-- Signature Section -->
        <div class="signature-section page-section">
            <div class="signature-title">Contract Agreement & Signatures</div>
            <p style="text-align: center; margin-bottom: 25px; line-height: 1.6;">
                By signing below, both parties acknowledge they have read, understood, and agree to be bound by all terms and conditions outlined in this professional performance contract. This agreement constitutes the entire understanding between the parties and supersedes all prior negotiations, representations, or agreements.
            </p>
            
            <div class="signature-grid">
                <div class="signature-box">
                    <h3 style="color: #3b82f6; margin-bottom: 15px;">PERFORMER ACCEPTANCE</h3>
                    <div class="signature-line"></div>
                    <p><strong>${userSettings?.businessName || 'MusoBuddy Performer'}</strong></p>
                    <p style="margin-top: 10px;">Signature: _________________________</p>
                    <p style="margin-top: 5px;">Date: _____________________________</p>
                    <p style="margin-top: 5px;">Print Name: _______________________</p>
                </div>
                <div class="signature-box">
                    <h3 style="color: #3b82f6; margin-bottom: 15px;">CLIENT ACCEPTANCE</h3>
                    <div class="signature-line"></div>
                    <p><strong>${contract.clientName}</strong></p>
                    <p style="margin-top: 10px;">Signature: _________________________</p>
                    <p style="margin-top: 5px;">Date: _____________________________</p>
                    <p style="margin-top: 5px;">Print Name: _______________________</p>
                </div>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                <p style="font-size: 10px; color: #64748b;">
                    This contract is generated and managed through the MusoBuddy platform.<br>
                    For support or contract modifications, contact: support@musobuddy.com
                </p>
            </div>
        </div>
    </div>
</body>
</html>`;
}

// CRITICAL FIX: PDF Generator class with enhanced rendering
class IsolatedContractPDFGenerator {
  private browser: puppeteer.Browser | null = null;

  private async initBrowser(): Promise<puppeteer.Browser> {
    if (!this.browser) {
      console.log('🚀 FIXED: Initializing Puppeteer browser...');
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
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
    console.log(`🎨 FIXED: Starting ${templateName} contract PDF generation...`);
    console.log('📄 FIXED: Contract data:', {
      id: contract.id,
      clientName: contract.clientName,
      venue: contract.venue,
      eventDate: contract.eventDate,
      fee: contract.fee
    });

    const browser = await this.initBrowser();
    const page = await browser.newPage();

    try {
      // CRITICAL FIX: Set exact A4 viewport dimensions
      await page.setViewport({ width: 794, height: 1123 });
      
      // Get template HTML
      const templateFunction = templateName === 'basic' ? getIsolatedBasicTemplate : getIsolatedProfessionalTemplate;
      const htmlContent = templateFunction(contract, userSettings);

      console.log('📝 FIXED: Setting HTML content with optimized settings...');
      await page.setContent(htmlContent, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });

      // CRITICAL FIX: Enhanced font and content loading
      await Promise.all([
        page.evaluate(() => {
          return new Promise(resolve => {
            if (document.fonts && document.fonts.ready) {
              document.fonts.ready.then(resolve);
            } else {
              resolve(null);
            }
          });
        }),
        page.evaluate(() => {
          return new Promise(resolve => {
            if (document.readyState === 'complete') {
              resolve(null);
            } else {
              window.addEventListener('load', resolve);
            }
          })
        })
      ]);

      // Additional wait for rendering
      await page.waitForTimeout(3000);

      console.log('🎯 FIXED: Generating PDF with proper settings...');
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: false, // CRITICAL FIX: Disabled to prevent truncation
        displayHeaderFooter: false,
        margin: {
          top: '15mm',
          right: '15mm', 
          bottom: '15mm',
          left: '15mm'
        },
        scale: 0.9, // CRITICAL FIX: Slight scale reduction to ensure content fits
        timeout: 120000
      });

      console.log(`✅ FIXED: ${templateName} contract PDF generated: ${pdfBuffer.length} bytes`);
      
      // Validate PDF size - should be substantial for multi-page content
      if (pdfBuffer.length < 50000) {
        console.warn('⚠️ FIXED: PDF seems small, might be truncated');
      }
      
      return pdfBuffer;

    } catch (error) {
      console.error('❌ FIXED: PDF generation error:', error);
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