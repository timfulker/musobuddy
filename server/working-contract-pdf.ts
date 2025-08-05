// WORKING CONTRACT PDF GENERATOR - Uses EXACT same approach as invoice system
// Based on server/core/invoice-pdf-generator.ts (the working system)

import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
import { join } from 'path';

interface ContractData {
  id: number;
  contractNumber: string;
  clientName: string;
  clientEmail?: string;
  venue: string;
  eventDate: Date;
  fee: string;
  deposit?: string;
}

interface UserSettings {
  businessName: string;
  primaryInstrument: string;
}

function getLogoBase64(): string {
  try {
    const logoPath = join(process.cwd(), 'client/public/musobuddy-logo-midnight-blue.png');
    const logoBuffer = readFileSync(logoPath);
    return logoBuffer.toString('base64');
  } catch (error) {
    console.error('Error loading logo:', error);
    return '';
  }
}

export async function generateWorkingContractPDF(
  contract: ContractData,
  userSettings: UserSettings | null,
  signatureDetails?: {
    signedAt: Date;
    signatureName: string;
    clientIpAddress: string;
  }
): Promise<Buffer> {
  console.log('🚀 Starting WORKING contract PDF generation for:', contract.contractNumber);
  
  // EXACT same Puppeteer configuration as working invoice system
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  try {
    const page = await browser.newPage();
    
    console.log('📄 Using professional contract template from user...');
    const html = generateProfessionalContractHTML(contract, userSettings, signatureDetails);
    
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
    
    console.log('✅ WORKING contract PDF generated successfully:', pdf.length, 'bytes');
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

function generateProfessionalContractHTML(
  contract: ContractData, 
  userSettings: UserSettings | null,
  signatureDetails?: {
    signedAt: Date;
    signatureName: string;
    clientIpAddress: string;
  }
): string {
  const businessName = userSettings?.businessName || 'Your Business';
  const eventDateStr = contract.eventDate.toLocaleDateString('en-GB');
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MusoBuddy - Performance Contract</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        /* Print and PDF optimizations */
        @media print {
            * {
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
            }
            
            body {
                background: white !important;
                font-size: 11pt;
                line-height: 1.4;
            }
            
            .no-print {
                display: none !important;
            }
            
            .page-break-before {
                page-break-before: always;
            }
            
            .page-break-after {
                page-break-after: always;
            }
            
            .no-page-break {
                page-break-inside: avoid;
            }
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            line-height: 1.6;
            color: #1a1a1a;
            background: #f8fafc;
            margin: 0;
            padding: 20px;
        }
        
        .contract-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
        }
        
        /* Header with logo */
        .contract-header {
            background: linear-gradient(135deg, #191970 0%, #1e3a8a 100%);
            color: white;
            padding: 30px;
            text-align: center;
            page-break-inside: avoid;
        }
        
        .logo-section {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .metronome-icon {
            width: 60px;
            height: 60px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 15px;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
        }
        
        .metronome-body {
            width: 20px;
            height: 32px;
            background: white;
            clip-path: polygon(25% 0%, 75% 0%, 100% 100%, 0% 100%);
            position: relative;
        }
        
        .metronome-arm {
            position: absolute;
            top: 6px;
            left: 50%;
            transform: translateX(-50%);
            width: 2px;
            height: 20px;
            background: #191970;
            transform-origin: bottom;
            border-radius: 1px;
        }
        
        .company-name {
            font-size: 28px;
            font-weight: 700;
            letter-spacing: -0.5px;
        }
        
        .tagline {
            font-size: 14px;
            opacity: 0.9;
            font-style: italic;
            margin-top: 5px;
        }
        
        .contract-title {
            font-size: 32px;
            font-weight: 800;
            margin: 10px 0 5px;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .contract-number {
            font-size: 16px;
            opacity: 0.9;
            font-weight: 500;
        }
        
        /* Main content */
        .contract-content {
            padding: 40px;
        }
        
        .section {
            margin-bottom: 40px;
            page-break-inside: avoid;
        }
        
        .section-title {
            font-size: 20px;
            font-weight: 700;
            color: #1e3a8a;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 3px solid #3b82f6;
            position: relative;
        }
        
        .section-title::after {
            content: '';
            position: absolute;
            bottom: -3px;
            left: 0;
            width: 60px;
            height: 3px;
            background: #191970;
        }
        
        /* Event details grid */
        .event-details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .detail-card {
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            border: 1px solid #cbd5e1;
            border-radius: 12px;
            padding: 20px;
            border-left: 5px solid #3b82f6;
            transition: all 0.3s ease;
        }
        
        .detail-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
        }
        
        .detail-label {
            font-size: 12px;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 8px;
        }
        
        .detail-value {
            font-size: 18px;
            font-weight: 700;
            color: #1e293b;
            line-height: 1.3;
        }
        
        /* Terms sections */
        .terms-section {
            margin-bottom: 30px;
        }
        
        .terms-subtitle {
            font-size: 16px;
            font-weight: 600;
            color: #1e3a8a;
            margin-bottom: 15px;
            padding-left: 15px;
            border-left: 4px solid #3b82f6;
        }
        
        .terms-list {
            list-style: none;
            padding: 0;
        }
        
        .terms-list li {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 10px;
            position: relative;
            padding-left: 45px;
        }
        
        .terms-list li::before {
            content: '✓';
            position: absolute;
            left: 15px;
            top: 15px;
            color: #10b981;
            font-weight: 700;
            font-size: 16px;
        }
        
        /* Payment section highlighting */
        .payment-section {
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
            border: 2px solid #3b82f6;
            border-radius: 15px;
            padding: 25px;
            margin: 20px 0;
        }
        
        .payment-title {
            color: #1e40af;
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 15px;
            text-align: center;
        }
        
        .payment-details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }
        
        .payment-item {
            background: white;
            border: 1px solid #bfdbfe;
            border-radius: 10px;
            padding: 15px;
            text-align: center;
        }
        
        .payment-label {
            font-size: 12px;
            color: #64748b;
            font-weight: 600;
            margin-bottom: 5px;
        }
        
        .payment-amount {
            font-size: 24px;
            font-weight: 800;
            color: #1e40af;
        }
        
        /* Signature section */
        .signature-section {
            margin-top: 50px;
            padding-top: 30px;
            border-top: 2px dashed #cbd5e1;
        }
        
        .signature-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-top: 30px;
        }
        
        .signature-box {
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            border: 2px dashed #94a3b8;
            border-radius: 15px;
            padding: 30px;
            text-align: center;
            min-height: 120px;
            position: relative;
        }
        
        .signature-role {
            font-size: 14px;
            font-weight: 600;
            color: #64748b;
            margin-bottom: 40px;
        }
        
        .signature-line {
            border-top: 2px solid #1e3a8a;
            margin: 20px auto;
            width: 200px;
            position: relative;
        }
        
        .signature-name {
            font-size: 16px;
            font-weight: 700;
            color: #1e293b;
            margin-top: 10px;
        }
        
        .signature-date {
            font-size: 12px;
            color: #64748b;
            margin-top: 15px;
        }
        
        /* Footer */
        .contract-footer {
            background: #f1f5f9;
            padding: 25px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
            margin-top: 40px;
        }
        
        .footer-text {
            font-size: 12px;
            color: #64748b;
            line-height: 1.5;
        }
        
        .footer-logo {
            font-weight: 700;
            color: #1e3a8a;
        }
        
        /* Responsive adjustments for print */
        @media print {
            .contract-container {
                box-shadow: none;
                border-radius: 0;
            }
            
            .detail-card:hover {
                transform: none;
                box-shadow: none;
            }
            
            .event-details {
                grid-template-columns: repeat(2, 1fr);
            }
            
            .payment-details {
                grid-template-columns: repeat(3, 1fr);
            }
        }
    </style>
</head>
<body>
    <div class="contract-container">
        <!-- Header -->
        <div class="contract-header">
            <div class="logo-section">
                <div class="metronome-icon">
                    <div class="metronome-body">
                        <div class="metronome-arm"></div>
                    </div>
                </div>
                <div>
                    <div class="company-name">MusoBuddy</div>
                    <div class="tagline">Less admin, more music</div>
                </div>
            </div>
            <div class="contract-title">Performance Contract</div>
            <div class="contract-number">Contract #${contract.contractNumber}</div>
        </div>

        <!-- Main Content -->
        <div class="contract-content">
            <!-- Event Details -->
            <div class="section">
                <h2 class="section-title">Event Details</h2>
                <div class="event-details">
                    <div class="detail-card">
                        <div class="detail-label">Client</div>
                        <div class="detail-value">${contract.clientName}</div>
                    </div>
                    <div class="detail-card">
                        <div class="detail-label">Venue</div>
                        <div class="detail-value">${contract.venue}</div>
                    </div>
                    <div class="detail-card">
                        <div class="detail-label">Date</div>
                        <div class="detail-value">${eventDateStr}</div>
                    </div>
                    <div class="detail-card">
                        <div class="detail-label">Performer</div>
                        <div class="detail-value">${businessName}</div>
                    </div>
                </div>
            </div>

            <!-- Payment Terms -->
            <div class="section">
                <h2 class="section-title">Payment Terms</h2>
                <div class="payment-section">
                    <div class="payment-title">Performance Fee Structure</div>
                    <div class="payment-details">
                        <div class="payment-item">
                            <div class="payment-label">Total Fee</div>
                            <div class="payment-amount">£${contract.fee}</div>
                        </div>
                        ${contract.deposit ? `
                        <div class="payment-item">
                            <div class="payment-label">Deposit Required</div>
                            <div class="payment-amount">£${contract.deposit}</div>
                        </div>
                        ` : ''}
                        <div class="payment-item">
                            <div class="payment-label">Final Payment</div>
                            <div class="payment-amount">On Completion</div>
                        </div>
                    </div>
                </div>
                
                <div class="terms-section">
                    <ul class="terms-list">
                        <li>Total performance fee as stated above</li>
                        ${contract.deposit ? `<li>Deposit of £${contract.deposit} required to secure booking</li>` : ''}
                        <li>Final payment due immediately upon completion of performance</li>
                        <li>All payments to be made to ${businessName}</li>
                        <li>Late payment may incur additional charges</li>
                    </ul>
                </div>
            </div>

            <!-- Performance Requirements -->
            <div class="section">
                <h2 class="section-title">Performance Requirements</h2>
                <div class="terms-section">
                    <ul class="terms-list">
                        <li>Professional ${userSettings?.primaryInstrument || 'musical'} performance</li>
                        <li>Appropriate attire and presentation for the venue</li>
                        <li>Punctual arrival and setup at agreed time</li>
                        <li>Performance duration as mutually agreed</li>
                        <li>Professional conduct throughout the event</li>
                    </ul>
                </div>
            </div>

            <!-- Cancellation Policy -->
            <div class="section">
                <h2 class="section-title">Cancellation Policy</h2>
                <div class="terms-section">
                    <div class="terms-subtitle">Client Cancellation</div>
                    <ul class="terms-list">
                        <li>48+ hours notice: Full refund of any deposit paid</li>
                        <li>Less than 48 hours notice: 50% of total fee retained</li>
                        <li>Day of event cancellation: Full fee retained</li>
                    </ul>
                </div>
                
                <div class="terms-section">
                    <div class="terms-subtitle">Performer Cancellation</div>
                    <ul class="terms-list">
                        <li>Alternative qualified performer provided where possible</li>
                        <li>If no alternative available: Full refund guaranteed</li>
                        <li>Force majeure events handled on case-by-case basis</li>
                    </ul>
                </div>
            </div>

            <!-- General Terms -->
            <div class="section">
                <h2 class="section-title">General Terms & Conditions</h2>
                <div class="terms-section">
                    <ul class="terms-list">
                        <li>This contract constitutes the entire agreement between parties</li>
                        <li>Any modifications must be agreed in writing by both parties</li>
                        <li>Contract governed by the laws of England and Wales</li>
                        <li>Both parties confirm they have authority to enter this agreement</li>
                        <li>Venue to provide safe working environment and agreed facilities</li>
                        <li>Performer reserves right to refuse inappropriate requests</li>
                        <li>Client responsible for obtaining necessary licenses (PRS, etc.)</li>
                    </ul>
                </div>
            </div>

            <!-- Signature Section -->
            <div class="signature-section">
                <h2 class="section-title">Agreement Signatures</h2>
                <p style="text-align: center; color: #64748b; margin-bottom: 20px;">
                    By signing below, both parties agree to the terms and conditions set forth in this contract.
                </p>
                
                <div class="signature-grid">
                    <div class="signature-box">
                        <div class="signature-role">Performer</div>
                        <div class="signature-line"></div>
                        <div class="signature-name">${businessName}</div>
                        <div class="signature-date">Date: _______________</div>
                    </div>
                    
                    <div class="signature-box">
                        <div class="signature-role">Client</div>
                        <div class="signature-line">${signatureDetails ? `Digital signature: ${signatureDetails.signatureName} - ${signatureDetails.signedAt.toISOString()}` : ''}</div>
                        <div class="signature-name">${contract.clientName}</div>
                        <div class="signature-date">Date: ${signatureDetails ? signatureDetails.signedAt.toLocaleDateString('en-GB') : '_______________'}</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <div class="contract-footer">
            <div class="footer-text">
                Contract generated on ${new Date().toLocaleDateString('en-GB')}<br>
                Professional performance contract by <span class="footer-logo">MusoBuddy</span><br>
                Empowering musicians with professional business tools
            </div>
        </div>
    </div>
</body>
</html>`;
}