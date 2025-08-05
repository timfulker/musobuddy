import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { Contract, UserSettings, Invoice } from '@shared/schema';

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
  console.log('🚀 Starting ORIGINAL contract PDF generation for:', contract.contractNumber);
  
  // Simple, reliable Puppeteer configuration
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  try {
    const page = await browser.newPage();
    const html = generateContractHTML(contract, userSettings, signatureDetails);
    
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
    
    console.log('✅ ORIGINAL contract PDF generated successfully:', pdf.length, 'bytes');
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
  const businessName = userSettings?.businessName || 'MusoBuddy Business';
  const eventDate = contract.eventDate ? new Date(contract.eventDate) : null;
  const eventDateStr = eventDate ? eventDate.toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric', 
    month: 'long',
    day: 'numeric'
  }) : 'Date TBC';

  // Use the custom MusoBuddy logo
  const logoBase64 = getLogoBase64();
  const logoHtml = logoBase64 ? `<img src="data:image/png;base64,${logoBase64}" style="height: 50px; width: auto;" alt="MusoBuddy Logo" />` : '';

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
            transition: transform 0.2s;
        }
        
        .detail-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
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
            grid-template-columns: repeat(3, 1fr);
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
        
        /* Signature section - IMPROVED LAYOUT */
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
            <div class="logo-section">
                ${logoHtml}
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

            <!-- Professional Performance Standards -->
            <div class="section">
                <h2 class="section-title">Terms & Conditions</h2>
                
                <div class="terms-section">
                    <div class="terms-subtitle">Professional Performance Standards</div>
                    <ul class="terms-list">
                        <li>Professional musical performance delivered to industry standards with appropriate attire</li>
                        <li>Punctual arrival and setup at the agreed time with performance duration as specified</li>
                        <li>The performer maintains professional liability insurance as required for musical performances</li>
                        <li>Both parties agree to a 'Safe Space' principle providing a working environment free from harassment and discrimination</li>
                        <li>The equipment and instruments of the performer are not available for use by any other person, except by specific permission</li>
                        <li>All musical instruments and equipment remain the exclusive property of the performer</li>
                        <li>The client shall ensure a safe supply of electricity and the security of the performer and their property at the venue</li>
                        <li>The client shall not make or permit any audio/visual recording or transmission without prior written consent</li>
                    </ul>
                </div>

                <!-- Enhanced Payment Terms -->
                <div class="terms-section">
                    <div class="terms-subtitle">Payment Terms & Conditions</div>
                    <div style="background: #f9fafb; padding: 15px; border-radius: 8px; border-left: 3px solid #6366f1;">
                        <strong>Payment Due Date:</strong> Full payment of £${contract.fee || contract.amount || 'Amount TBC'} becomes due and payable no later than the day of performance. Payment must be received before or immediately upon completion of the performance.<br><br>
                        
                        <strong>Payment Methods:</strong> Cash or bank transfer to the performer's designated account (details provided separately).<br><br>
                        
                        <strong>Deposit:</strong> ${contract.deposit && parseFloat(contract.deposit) > 0 ? `£${contract.deposit}` : 'Deposit amount TBC'} deposit required to secure booking. Deposit is non-refundable except as outlined in the cancellation policy below.<br><br>
                        
                        <strong>Late Payment:</strong> Any payment received after the due date may incur a late payment fee of £25 plus interest at 2% per month.
                    </div>
                </div>

                <!-- Comprehensive Cancellation Policy -->
                <div class="terms-section">
                    <div class="terms-subtitle">Cancellation & Refund Policy</div>
                    <div style="background: #f9fafb; padding: 15px; border-radius: 8px; border-left: 3px solid #6366f1;">
                        <strong>Client Cancellation:</strong><br>
                        • More than 30 days before event: Any deposit paid will be refunded minus a £50 administration fee<br>
                        • 30 days or less before event: Full performance fee becomes due regardless of cancellation<br>
                        • Same day cancellation: Full fee due plus any additional costs incurred<br><br>
                        
                        <strong>Performer Cancellation:</strong> In the unlikely event the performer must cancel due to circumstances within their control, all payments will be refunded in full and reasonable assistance will be provided to find a suitable replacement.<br><br>
                        
                        <strong>Rescheduling:</strong> Event may be rescheduled once without penalty if agreed by both parties at least 14 days in advance. Additional rescheduling requests may incur a £25 administrative fee.
                    </div>
                </div>

                <!-- Performance Contingencies -->
                <div class="terms-section">
                    <div class="terms-subtitle">Performance Contingencies</div>
                    <div style="background: #f9fafb; padding: 15px; border-radius: 8px; border-left: 3px solid #6366f1;">
                        The performer will provide appropriate backup equipment where reasonably possible. If performance cannot proceed due to venue-related issues (power failure, noise restrictions, etc.), the full fee remains due.
                    </div>
                </div>

                <!-- Force Majeure -->
                <div class="terms-section">
                    <div class="terms-subtitle">Force Majeure</div>
                    <div style="background: #f9fafb; padding: 15px; border-radius: 8px; border-left: 3px solid #6366f1;">
                        Neither party shall be liable for any failure to perform due to circumstances beyond their reasonable control, including but not limited to: severe weather, natural disasters, government restrictions, venue closure, or serious illness.
                    </div>
                </div>

                <!-- Legal Framework -->
                <div class="terms-section">
                    <div class="terms-subtitle">Legal Framework</div>
                    <ul class="terms-list">
                        <li>This agreement may not be modified except by mutual consent, in writing signed by both parties</li>
                        <li>Any rider attached and signed by both parties shall be deemed incorporated into this agreement</li>
                        <li>Contract governed by the laws of England and Wales</li>
                        <li>This contract constitutes the entire agreement between parties</li>
                        <li>Both parties confirm they have authority to enter this agreement</li>
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
                    <div class="signature-box signed-box">
                        <div class="signature-role">Performer</div>
                        <div class="signature-line"></div>
                        <div class="signature-name">${businessName}</div>
                        <div class="signature-date">Agreed by sending contract</div>
                        <div class="signature-status" style="color: #10b981;">✓ Contract sent on ${new Date(contract.createdAt).toLocaleDateString('en-GB')}</div>
                    </div>
                    
                    <div class="signature-box ${contract.status === 'signed' ? 'signed-box' : ''}">
                        <div class="signature-role">Client</div>
                        ${contract.status === 'signed' && signatureDetails ? `
                            <div class="signature-line"></div>
                            <div class="signature-name">${signatureDetails.signatureName || 'Digital Signature'}</div>
                            <div class="signature-date">Digitally signed on ${signatureDetails.signedAt.toLocaleDateString('en-GB')}</div>
                            <div class="signature-status" style="color: #10b981;">✓ Signed at ${signatureDetails.signedAt.toLocaleTimeString('en-GB')}</div>
                        ` : `
                            <div class="signature-line"></div>
                            <div class="signature-name">${contract.clientName}</div>
                            <div class="signature-date">Date: _______________</div>
                            <div class="signature-status" style="color: #94a3b8;">Awaiting digital signature</div>
                        `}
                    </div>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <div class="contract-footer">
            <div class="footer-text">
                Contract generated on ${new Date(contract.createdAt).toLocaleDateString('en-GB')}<br>
                Professional performance contract by <span class="footer-logo">MusoBuddy</span><br>
                Empowering musicians with professional business tools
            </div>
        </div>
    </div>
</body>
</html>
  `;
}