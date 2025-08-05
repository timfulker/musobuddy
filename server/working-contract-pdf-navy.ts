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
  
  // Format time display
  const timeString = contract.startTime && contract.endTime 
    ? `${contract.startTime} - ${contract.endTime}`
    : 'Time TBC';

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
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
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
            background: linear-gradient(135deg, #191970 0%, #1e3a8a 100%);
            color: white;
            padding: 40px;
            text-align: center;
            position: relative;
        }
        
        .logo-section {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 25px;
            margin-bottom: 30px;
        }
        
        .metronome-container {
            width: 80px;
            height: 80px;
            background: rgba(255, 255, 255, 0.15);
            border-radius: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            flex-shrink: 0;
            backdrop-filter: blur(10px);
        }
        
        .metronome-body {
            width: 24px;
            height: 38px;
            background: white;
            clip-path: polygon(25% 0%, 75% 0%, 100% 100%, 0% 100%);
            position: relative;
        }
        
        .metronome-arm {
            position: absolute;
            top: 8px;
            left: 50%;
            transform: translateX(-50%) rotate(10deg);
            width: 2.5px;
            height: 24px;
            background: #191970;
            border-radius: 1px;
            transform-origin: bottom center;
        }
        
        .company-name {
            font-size: 42px;
            font-weight: 700;
            letter-spacing: -1px;
            color: white;
            line-height: 1;
            margin-bottom: 8px;
        }
        
        .tagline {
            font-size: 18px;
            color: rgba(255, 255, 255, 0.9);
            font-style: italic;
            font-weight: 500;
        }
        
        .contract-title {
            font-size: 32px;
            font-weight: 800;
            margin: 25px 0 15px 0;
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
            padding: 10px 18px;
            border-radius: 25px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
            backdrop-filter: blur(10px);
        }
        
        .status-signed {
            background: rgba(16, 185, 129, 0.9);
            color: white;
        }
        
        .status-sent {
            background: rgba(59, 130, 246, 0.9);
            color: white;
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
            font-size: 24px;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 20px;
            border-bottom: 3px solid #1e3a8a;
            padding-bottom: 10px;
        }
        
        /* Parties section */
        .parties-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 30px;
        }
        
        .party-box {
            background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
            border: 2px solid #cbd5e1;
            border-radius: 12px;
            padding: 25px;
            text-align: center;
        }
        
        .party-title {
            font-size: 14px;
            font-weight: 700;
            color: #191970;
            margin-bottom: 15px;
        }
        
        .party-details {
            font-size: 15px;
            line-height: 1.6;
            color: #4a5568;
        }
        
        .party-details strong {
            color: #2d3748;
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
            border-left: 4px solid #1e3a8a;
            border: 1px solid #e2e8f0;
        }
        
        .detail-label {
            font-size: 12px;
            font-weight: 600;
            color: #191970;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
        }
        
        .detail-value {
            font-size: 18px;
            font-weight: 700;
            color: #2d3748;
        }
        
        /* Payment Section - Updated to remove red and match invoice style */
        .payment-section {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border: 2px solid #1e3a8a;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 20px;
        }
        
        .payment-title {
            font-size: 20px;
            font-weight: 700;
            color: #191970;
            text-align: center;
            margin-bottom: 25px;
        }
        
        .payment-details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 20px;
            margin-bottom: 25px;
        }
        
        .payment-item {
            text-align: center;
            padding: 20px;
            background: white;
            border-radius: 10px;
            border: 2px solid #e2e8f0;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        
        .payment-label {
            font-size: 12px;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 10px;
        }
        
        .payment-amount {
            font-size: 26px;
            font-weight: 800;
            color: #191970;
        }
        
        .payment-instructions {
            background: white;
            padding: 20px;
            border-radius: 10px;
            border: 2px solid #e2e8f0;
            margin-top: 20px;
        }
        
        .payment-instructions strong {
            color: #191970;
            font-size: 16px;
        }
        
        /* Terms */
        .terms-section {
            margin-top: 20px;
        }
        
        .terms-subtitle {
            font-size: 16px;
            font-weight: 600;
            color: #374151;
            margin-bottom: 15px;
        }
        
        .terms-list {
            list-style: none;
            padding: 0;
        }
        
        .terms-list li {
            background: #f9fafb;
            margin-bottom: 10px;
            padding: 15px 20px;
            border-radius: 8px;
            border-left: 4px solid #1e3a8a;
            position: relative;
            color: #4a5568;
        }
        
        .terms-list li:before {
            content: "✓";
            color: #10b981;
            font-weight: bold;
            margin-right: 10px;
        }
        
        .requirements-box {
            background: #f9fafb;
            padding: 20px;
            border-radius: 10px;
            border-left: 4px solid #1e3a8a;
            border: 1px solid #e2e8f0;
            color: #4a5568;
            line-height: 1.6;
        }
        
        /* Signature section */
        .signature-section {
            margin-top: 50px;
            padding-top: 40px;
            border-top: 2px dashed #cbd5e1;
            page-break-inside: avoid;
        }
        
        .signature-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-top: 30px;
        }
        
        .signature-box {
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            border: 2px dashed #94a3b8;
            border-radius: 12px;
            padding: 30px;
            text-align: center;
            min-height: 150px;
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
            margin-bottom: 20px;
        }
        
        .signature-line {
            border-top: 2px solid #334155;
            margin: 20px auto;
            width: 200px;
        }
        
        .signature-name {
            font-size: 16px;
            font-weight: 700;
            color: #1e293b;
            margin-top: 15px;
        }
        
        .signature-date {
            font-size: 13px;
            color: #64748b;
            margin-top: 10px;
        }
        
        .signature-status {
            font-size: 11px;
            margin-top: 10px;
        }
        
        /* Footer */
        .contract-footer {
            background: #f8f9fa;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
            margin-top: 30px;
        }
        
        .footer-text {
            font-size: 12px;
            color: #64748b;
            line-height: 1.6;
        }
        
        .footer-logo {
            font-weight: 700;
            color: #191970;
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
            <div class="status-badge ${contract.status === 'signed' ? 'status-signed' : 'status-sent'}">
                ${contract.status === 'signed' ? 'SIGNED' : 'SENT'}
            </div>
            <div class="logo-section">
                <div class="metronome-container">
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
            <!-- Parties Section -->
            <div class="section">
                <h2 class="section-title">Contract Parties</h2>
                <div class="parties-section">
                    <div class="party-box">
                        <div class="party-title">🎵 PERFORMER</div>
                        <div class="party-details">
                            <strong>${businessName}</strong><br>
                            ${userSettings?.businessEmail || 'Email: contact@musobuddy.com'}<br>
                            ${userSettings?.businessPhone || 'Phone: +44 7123 456789'}<br>
                            ${userSettings?.businessAddress || 'Professional Music Services'}
                        </div>
                    </div>
                    <div class="party-box">
                        <div class="party-title">👤 CLIENT</div>
                        <div class="party-details">
                            <strong>${contract.clientName}</strong><br>
                            Email: ${contract.clientEmail}<br>
                            ${contract.clientPhone ? `Phone: ${contract.clientPhone}<br>` : ''}
                            ${contract.clientAddress || 'Address: To be provided'}
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
                        <div class="detail-value">${timeString}</div>
                    </div>
                    <div class="detail-card">
                        <div class="detail-label">Venue</div>
                        <div class="detail-value">${contract.venue}</div>
                    </div>
                    <div class="detail-card">
                        <div class="detail-label">Venue Address</div>
                        <div class="detail-value">${contract.venueAddress || 'Address to be confirmed'}</div>
                    </div>
                </div>
            </div>

            <!-- Financial Terms -->
            <div class="section">
                <h2 class="section-title">Financial Terms</h2>
                <div class="payment-section">
                    <div class="payment-title">Performance Fee Structure</div>
                    <div class="payment-details">
                        <div class="payment-item">
                            <div class="payment-label">Total Performance Fee</div>
                            <div class="payment-amount">£${contract.fee}</div>
                        </div>
                        ${contract.deposit ? `
                        <div class="payment-item">
                            <div class="payment-label">Deposit Required</div>
                            <div class="payment-amount">£${contract.deposit}</div>
                        </div>
                        ` : ''}
                        <div class="payment-item">
                            <div class="payment-label">Balance Due</div>
                            <div class="payment-amount">${contract.deposit ? `£${parseFloat(contract.fee) - parseFloat(contract.deposit)}` : 'On Completion'}</div>
                        </div>
                    </div>
                    
                    <div class="payment-instructions">
                        <strong>Payment Instructions:</strong><br>
                        ${contract.deposit ? 'Deposit due within 7 days to secure booking. Balance due on completion of performance.' : 'Full payment due on completion of performance.'}<br>
                        ${userSettings?.bankDetails || 'Bank details: To be provided separately'}<br>
                        Please use reference: ${contract.contractNumber}
                    </div>
                </div>
            </div>

            <!-- Terms & Conditions -->
            <div class="section">
                <h2 class="section-title">Terms & Conditions</h2>
                
                <!-- Professional Standards -->
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

                <!-- Payment Terms -->
                <div class="terms-section">
                    <div class="terms-subtitle">Payment Terms & Conditions</div>
                    <div class="requirements-box">
                        <strong>Payment Due Date:</strong> Full payment of £${contract.fee || contract.amount || 'Amount TBC'} becomes due and payable no later than the day of performance. Payment must be received before or immediately upon completion of the performance.<br><br>
                        
                        <strong>Payment Methods:</strong> Cash or bank transfer to the performer's designated account (details provided separately).<br><br>
                        
                        <strong>Deposit:</strong> ${contract.deposit && parseFloat(contract.deposit) > 0 ? `£${contract.deposit}` : 'Deposit amount TBC'} deposit required to secure booking. Deposit is non-refundable except as outlined in the cancellation policy below.<br><br>
                        
                        <strong>Late Payment:</strong> Any payment received after the due date may incur a late payment fee of £25 plus interest at 2% per month.
                    </div>
                </div>

                <!-- Cancellation Policy -->
                <div class="terms-section">
                    <div class="terms-subtitle">Cancellation & Refund Policy</div>
                    <div class="requirements-box">
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
                    <div class="requirements-box">
                        The performer will provide appropriate backup equipment where reasonably possible. If performance cannot proceed due to venue-related issues (power failure, noise restrictions, etc.), the full fee remains due.
                    </div>
                </div>

                <!-- Force Majeure -->
                <div class="terms-section">
                    <div class="terms-subtitle">Force Majeure</div>
                    <div class="requirements-box">
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
                <h2 class="section-title">Digital Signatures</h2>
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
                <em>Less admin, more music</em>
            </div>
        </div>
    </div>
</body>
</html>
  `;
}