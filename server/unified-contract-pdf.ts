// UNIFIED: contract-pdf-generator.ts - Single source of truth for contract PDF generation
import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { Contract, UserSettings } from '@shared/schema';

function getLogoBase64(): string {
  try {
    const logoPath = join(process.cwd(), 'client/public/musobuddy-logo-purple.png');
    const logoBuffer = readFileSync(logoPath);
    return logoBuffer.toString('base64');
  } catch (error) {
    console.error('Error loading logo:', error);
    return '';
  }
}

// MAIN EXPORT: Unified contract PDF generator
export async function generateContractPDF(
  contract: Contract,
  userSettings: UserSettings | null,
  signatureDetails?: {
    signedAt: Date;
    signatureName?: string;
    clientIpAddress?: string;
  }
): Promise<Buffer> {
  console.log('🚀 UNIFIED: Starting contract PDF generation for:', contract.contractNumber);
  console.log('🚀 UNIFIED: Contract status:', contract.status);
  console.log('🚀 UNIFIED: Has signature details:', !!signatureDetails);
  
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  try {
    const page = await browser.newPage();
    const html = generateUnifiedContractHTML(contract, userSettings, signatureDetails);
    
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    const pdf = await page.pdf({ 
      format: 'A4', 
      printBackground: true,
      margin: {
        top: '0.75in',
        right: '0.75in',
        bottom: '0.75in',
        left: '0.75in'
      }
    });
    
    console.log('✅ UNIFIED: Contract PDF generated successfully:', pdf.length, 'bytes');
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

function generateUnifiedContractHTML(
  contract: Contract,
  userSettings: UserSettings | null,
  signatureDetails?: {
    signedAt: Date;
    signatureName?: string;
    clientIpAddress?: string;
  }
): string {
  const businessName = userSettings?.businessName || 'MusoBuddy Professional Services';
  const eventDate = contract.eventDate ? new Date(contract.eventDate) : null;
  const eventDateStr = eventDate ? eventDate.toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric', 
    month: 'long',
    day: 'numeric'
  }) : 'Date TBC';

  const logoBase64 = getLogoBase64();
  const logoHtml = logoBase64 ? `<img src="data:image/png;base64,${logoBase64}" style="height: 50px; width: auto;" alt="MusoBuddy Logo" />` : '';

  // Determine if contract is signed and get signature info
  const isSigned = contract.status === 'signed' || signatureDetails;
  const signedAt = signatureDetails?.signedAt || (contract.signedAt ? new Date(contract.signedAt) : null);
  const signatureName = signatureDetails?.signatureName || contract.clientSignature || 'Digital Signature';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Performance Contract - ${contract.contractNumber}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #2c3e50;
            background: #ffffff;
        }
        
        .contract-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
            border-radius: 12px;
            overflow: hidden;
        }
        
        /* Header */
        .contract-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            position: relative;
        }
        
        .logo-section {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 15px;
            margin-bottom: 20px;
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
        }
        
        .contract-title {
            font-size: 32px;
            font-weight: 800;
            margin: 20px 0 10px 0;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        
        .contract-number {
            font-size: 16px;
            opacity: 0.9;
            font-weight: 500;
        }
        
        /* Status Badge */
        .status-badge {
            position: absolute;
            top: 20px;
            right: 20px;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
        }
        
        .status-signed {
            background: #10b981;
            color: white;
        }
        
        .status-sent {
            background: #3b82f6;
            color: white;
        }
        
        .status-draft {
            background: #6b7280;
            color: white;
        }
        
        /* Content */
        .contract-content {
            padding: 40px;
        }
        
        .section {
            margin-bottom: 35px;
        }
        
        .section-title {
            font-size: 22px;
            font-weight: 700;
            color: #2c3e50;
            margin-bottom: 20px;
            padding-bottom: 8px;
            border-bottom: 3px solid #667eea;
        }
        
        /* Parties Section */
        .parties-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 25px;
        }
        
        .party-box {
            background: linear-gradient(135deg, #f8f9ff 0%, #e3e7ff 100%);
            padding: 25px;
            border-radius: 12px;
            border-left: 4px solid #667eea;
        }
        
        .party-title {
            font-size: 16px;
            font-weight: 700;
            color: #7c3aed;
            margin-bottom: 15px;
        }
        
        .party-details {
            font-size: 15px;
            line-height: 1.6;
        }
        
        .party-details strong {
            color: #2c3e50;
        }
        
        /* Event Details Grid */
        .event-details {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin-bottom: 25px;
        }
        
        .detail-card {
            background: linear-gradient(135deg, #f8f9ff 0%, #e3e7ff 100%);
            padding: 20px;
            border-radius: 10px;
            border-left: 4px solid #667eea;
        }
        
        .detail-label {
            font-size: 12px;
            font-weight: 600;
            color: #7c3aed;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
        }
        
        .detail-value {
            font-size: 18px;
            font-weight: 700;
            color: #2c3e50;
        }
        
        /* Payment Section */
        .payment-section {
            background: linear-gradient(135deg, #fff5f5 0%, #fef2f2 100%);
            border: 2px solid #ef4444;
            border-radius: 12px;
            padding: 25px;
            margin-bottom: 20px;
        }
        
        .payment-title {
            font-size: 18px;
            font-weight: 700;
            color: #dc2626;
            text-align: center;
            margin-bottom: 20px;
        }
        
        .payment-details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .payment-item {
            text-align: center;
            padding: 15px;
            background: white;
            border-radius: 8px;
            border: 1px solid #fecaca;
        }
        
        .payment-label {
            font-size: 12px;
            font-weight: 600;
            color: #7f1d1d;
            margin-bottom: 8px;
        }
        
        .payment-amount {
            font-size: 24px;
            font-weight: 800;
            color: #dc2626;
        }
        
        /* Terms */
        .terms-section {
            margin-top: 20px;
        }
        
        .terms-subtitle {
            font-size: 16px;
            font-weight: 600;
            color: #374151;
            margin-bottom: 10px;
        }
        
        .terms-list {
            list-style: none;
            padding: 0;
        }
        
        .terms-list li {
            background: #f9fafb;
            margin-bottom: 8px;
            padding: 12px 16px;
            border-radius: 6px;
            border-left: 3px solid #6366f1;
            position: relative;
        }
        
        .terms-list li:before {
            content: "✓";
            color: #10b981;
            font-weight: bold;
            margin-right: 8px;
        }
        
        /* Signature section */
        .signature-section {
            margin-top: 40px;
            padding-top: 30px;
            border-top: 2px dashed #cbd5e1;
            page-break-inside: avoid;
        }
        
        .signature-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-top: 25px;
        }
        
        .signature-box {
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            border: 2px dashed #94a3b8;
            border-radius: 12px;
            padding: 25px;
            text-align: center;
            min-height: 140px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }
        
        .signed-box {
            border: 2px solid #10b981;
            background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
        }
        
        .signature-role {
            font-size: 14px;
            font-weight: 600;
            color: #64748b;
            margin-bottom: 15px;
        }
        
        .signature-line {
            border-top: 2px solid #334155;
            margin: 15px auto;
            width: 180px;
        }
        
        .signature-name {
            font-size: 16px;
            font-weight: 700;
            color: #1e293b;
            margin-top: 10px;
        }
        
        .signature-date {
            font-size: 13px;
            color: #64748b;
            margin-top: 10px;
        }
        
        .signature-status {
            font-size: 11px;
            margin-top: 8px;
        }
        
        /* Footer */
        .contract-footer {
            background: #f1f5f9;
            padding: 25px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
            margin-top: 30px;
        }
        
        .footer-text {
            font-size: 12px;
            color: #64748b;
            line-height: 1.5;
        }
        
        .footer-logo {
            font-weight: 700;
            color: #667eea;
        }
        
        /* Print optimizations */
        @media print {
            .contract-container {
                box-shadow: none;
                border-radius: 0;
            }
            
            .signature-section {
                page-break-inside: avoid;
                break-inside: avoid;
            }
            
            .signature-grid {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="contract-container">
        <!-- Header -->
        <div class="contract-header">
            <div class="status-badge status-${contract.status}">
                ${contract.status.toUpperCase()}
            </div>
            <div class="logo-section">
                ${logoHtml}
                <div>
                    <div class="company-name">MusoBuddy</div>
                    <div class="tagline">Professional Music Contracts</div>
                </div>
            </div>
            <div class="contract-title">Performance Contract</div>
            <div class="contract-number">Contract #${contract.contractNumber}</div>
        </div>

        <!-- Main Content -->
        <div class="contract-content">
            <!-- Parties Section -->
            <div class="section">
                <h2 class="section-title">Contract Parties</h2>
                <div class="parties-section">
                    <div class="party-box">
                        <div class="party-title">🎵 PERFORMER</div>
                        <div class="party-details">
                            <strong>${businessName}</strong><br>
                            ${userSettings?.businessEmail ? `Email: ${userSettings.businessEmail}<br>` : ''}
                            ${userSettings?.phone ? `Phone: ${userSettings.phone}<br>` : ''}
                            ${userSettings?.businessAddress ? userSettings.businessAddress.replace(/\n/g, '<br>') : ''}
                        </div>
                    </div>
                    <div class="party-box">
                        <div class="party-title">👤 CLIENT</div>
                        <div class="party-details">
                            <strong>${contract.clientName}</strong><br>
                            ${contract.clientEmail ? `Email: ${contract.clientEmail}<br>` : ''}
                            ${contract.clientPhone ? `Phone: ${contract.clientPhone}<br>` : ''}
                            ${contract.clientAddress ? contract.clientAddress.replace(/\n/g, '<br>') : ''}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Event Details -->
            <div class="section">
                <h2 class="section-title">Performance Details</h2>
                <div class="event-details">
                    <div class="detail-card">
                        <div class="detail-label">Event Date</div>
                        <div class="detail-value">${eventDateStr}</div>
                    </div>
                    <div class="detail-card">
                        <div class="detail-label">Performance Time</div>
                        <div class="detail-value">${contract.eventTime || 'TBC'} - ${contract.eventEndTime || 'TBC'}</div>
                    </div>
                    <div class="detail-card">
                        <div class="detail-label">Venue</div>
                        <div class="detail-value">${contract.venue || 'TBC'}</div>
                    </div>
                    <div class="detail-card">
                        <div class="detail-label">Venue Address</div>
                        <div class="detail-value">${contract.venueAddress || 'See venue name'}</div>
                    </div>
                </div>
            </div>

            <!-- Payment Terms -->
            <div class="section">
                <h2 class="section-title">Financial Terms</h2>
                <div class="payment-section">
                    <div class="payment-title">Performance Fee Structure</div>
                    <div class="payment-details">
                        <div class="payment-item">
                            <div class="payment-label">Total Performance Fee</div>
                            <div class="payment-amount">£${contract.fee}</div>
                        </div>
                        ${contract.deposit && parseFloat(contract.deposit) > 0 ? `
                        <div class="payment-item">
                            <div class="payment-label">Deposit Required</div>
                            <div class="payment-amount">£${contract.deposit}</div>
                        </div>
                        <div class="payment-item">
                            <div class="payment-label">Balance Due</div>
                            <div class="payment-amount">£${(parseFloat(contract.fee) - parseFloat(contract.deposit)).toFixed(2)}</div>
                        </div>
                        ` : `
                        <div class="payment-item">
                            <div class="payment-label">Payment Due</div>
                            <div class="payment-amount">On Completion</div>
                        </div>
                        `}
                    </div>
                    
                    ${contract.paymentInstructions ? `
                    <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #fecaca;">
                        <strong>Payment Instructions:</strong><br>
                        ${contract.paymentInstructions.replace(/\n/g, '<br>')}
                    </div>
                    ` : ''}
                </div>
            </div>

            <!-- Requirements -->
            ${(contract.equipmentRequirements || contract.specialRequirements) ? `
            <div class="section">
                <h2 class="section-title">Performance Requirements</h2>
                ${contract.equipmentRequirements ? `
                <div class="terms-section">
                    <div class="terms-subtitle">Equipment Requirements</div>
                    <p style="background: #f9fafb; padding: 15px; border-radius: 8px; border-left: 3px solid #6366f1;">
                        ${contract.equipmentRequirements.replace(/\n/g, '<br>')}
                    </p>
                </div>
                ` : ''}
                ${contract.specialRequirements ? `
                <div class="terms-section">
                    <div class="terms-subtitle">Special Requirements</div>
                    <p style="background: #f9fafb; padding: 15px; border-radius: 8px; border-left: 3px solid #6366f1;">
                        ${contract.specialRequirements.replace(/\n/g, '<br>')}
                    </p>
                </div>
                ` : ''}
            </div>
            ` : ''}

            <!-- Standard Terms -->
            <div class="section">
                <h2 class="section-title">Terms & Conditions</h2>
                <div class="terms-section">
                    <ul class="terms-list">
                        <li>Professional ${userSettings?.primaryInstrument || 'musical'} performance to industry standards</li>
                        <li>Punctual arrival and setup at the agreed time</li>
                        <li>Appropriate professional attire for the venue and occasion</li>
                        <li>Performance duration and repertoire as mutually agreed</li>
                        <li>Total performance fee as specified above</li>
                        ${contract.deposit ? `<li>Deposit of £${contract.deposit} required to secure booking within 7 days</li>` : ''}
                        <li>Final payment due immediately upon completion of performance</li>
                        <li>Cancellation policy: 48+ hours notice required for full refund</li>
                        <li>Less than 48 hours notice: 50% of total fee retained</li>
                        <li>Day of event cancellation: Full fee retained</li>
                        <li>Force majeure events handled on case-by-case basis</li>
                        <li>Contract governed by the laws of England and Wales</li>
                        <li>This contract constitutes the entire agreement between parties</li>
                        <li>Any modifications must be agreed in writing by both parties</li>
                        <li>Both parties confirm they have authority to enter this agreement</li>
                    </ul>
                </div>
            </div>

            <!-- Signature Section -->
            <div class="signature-section">
                <h2 class="section-title">Digital Signatures</h2>
                <p style="text-align: center; color: #64748b; margin-bottom: 20px;">
                    By signing below, both parties agree to the terms and conditions set forth in this contract.
                </p>
                
                <div class="signature-grid">
                    <!-- Performer Signature -->
                    <div class="signature-box signed-box">
                        <div class="signature-role">PERFORMER</div>
                        <div class="signature-line"></div>
                        <div class="signature-name">${businessName}</div>
                        <div class="signature-date">Digital signature by contract generation</div>
                        <div class="signature-status" style="color: #10b981;">✓ Signed on ${new Date(contract.createdAt || new Date()).toLocaleDateString('en-GB')}</div>
                    </div>
                    
                    <!-- Client Signature -->
                    <div class="signature-box ${isSigned ? 'signed-box' : ''}">
                        <div class="signature-role">CLIENT</div>
                        ${isSigned && signedAt ? `
                            <div class="signature-line"></div>
                            <div class="signature-name">${signatureName}</div>
                            <div class="signature-date">Digitally signed on ${signedAt.toLocaleDateString('en-GB')}</div>
                            <div class="signature-status" style="color: #10b981;">✓ Signed at ${signedAt.toLocaleTimeString('en-GB')}</div>
                        ` : `
                            <div class="signature-line"></div>
                            <div class="signature-name">${contract.clientName}</div>
                            <div class="signature-date">Date: _______________</div>
                            <div class="signature-status" style="color: #94a3b8;">${contract.status === 'sent' ? 'Awaiting digital signature' : 'Unsigned'}</div>
                        `}
                    </div>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <div class="contract-footer">
            <div class="footer-text">
                Contract generated on ${new Date(contract.createdAt || new Date()).toLocaleDateString('en-GB')}<br>
                Professional performance contract by <span class="footer-logo">MusoBuddy</span><br>
                Empowering musicians with professional business tools
            </div>
        </div>
    </div>
</body>
</html>
  `;
}

// Additional export for services.ts compatibility
export default {
  generateContractPDF
};