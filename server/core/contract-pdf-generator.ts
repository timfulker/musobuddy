import puppeteer from 'puppeteer';

export async function generateContractPDF(contract: any, userSettings: any, signatureDetails?: any): Promise<Buffer> {
  console.log('🎨 Starting professional contract PDF generation...');
  console.log('📄 Contract data:', {
    id: contract.id,
    clientName: contract.client_name || contract.clientName,
    venue: contract.venue,
    eventDate: contract.event_date || contract.eventDate,
    fee: contract.fee
  });

  let browser;
  try {
    // Launch browser with Replit-optimized settings
    browser = await puppeteer.launch({
      headless: true,
      executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-default-apps',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });

    const page = await browser.newPage();
    
    // Set page size and scaling for professional PDF output
    await page.setViewport({ width: 800, height: 1200, deviceScaleFactor: 2 });

    // Generate the professional contract HTML
    const contractHTML = generateProfessionalContractHTML(contract, userSettings, signatureDetails);
    
    console.log('📝 Setting HTML content...');
    await page.setContent(contractHTML, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });

    console.log('🎯 Generating PDF...');
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '10mm',
        bottom: '10mm',
        left: '10mm',
        right: '10mm'
      },
      preferCSSPageSize: true
    });

    console.log(`✅ Professional contract PDF generated: ${pdfBuffer.length} bytes`);
    return pdfBuffer;

  } catch (error: any) {
    console.error('❌ Contract PDF generation error:', error);
    throw new Error(`Contract PDF generation failed: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

function generateProfessionalContractHTML(contract: any, userSettings: any, signatureDetails?: any): string {
  // Helper functions for formatting
  const formatDate = (date: any) => {
    if (!date) return 'Date TBC';
    return new Date(date).toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  const formatTime = (time: any) => {
    if (!time) return 'Time TBC';
    return time;
  };

  const formatCurrency = (amount: any) => {
    if (!amount || amount === 0) return '£0.00';
    return `£${parseFloat(amount).toFixed(2)}`;
  };

  // Extract contract data with fallbacks for both field naming conventions
  const clientName = contract.client_name || contract.clientName || 'Client Name TBC';
  const clientEmail = contract.client_email || contract.clientEmail || '';
  const clientPhone = contract.client_phone || contract.clientPhone || '';
  const clientAddress = contract.client_address || contract.clientAddress || '';
  const eventDate = contract.event_date || contract.eventDate;
  const eventTime = contract.event_time || contract.eventTime || contract.startTime;
  const eventEndTime = contract.event_end_time || contract.eventEndTime || contract.endTime;
  const venue = contract.venue || 'Venue TBC';
  const venueAddress = contract.venue_address || contract.venueAddress || '';
  const fee = contract.fee || 0;
  const deposit = contract.deposit || 0;
  const equipmentRequirements = contract.equipment_requirements || contract.equipmentRequirements || '';
  const specialRequirements = contract.special_requirements || contract.specialRequirements || '';
  const paymentInstructions = contract.payment_instructions || contract.paymentInstructions || userSettings?.bank_details || '';

  // User/Business data
  const businessName = userSettings?.business_name || userSettings?.businessName || 'Business Name';
  const businessEmail = userSettings?.business_email || userSettings?.businessEmail || '';
  const businessPhone = userSettings?.phone || '';
  const businessAddress = userSettings?.business_address || userSettings?.businessAddress || 
    [userSettings?.address_line1, userSettings?.city, userSettings?.county, userSettings?.postcode]
      .filter(Boolean).join(', ') || '';
  const primaryInstrument = userSettings?.primary_instrument || userSettings?.primaryInstrument || '';

  // Contract metadata
  const contractNumber = contract.contract_number || contract.contractNumber || `CON-${contract.id}`;
  const generatedDate = new Date().toLocaleDateString('en-GB');
  const generatedTime = new Date().toLocaleTimeString('en-GB');

  // Terms content with dynamic values
  const totalFeeFormatted = formatCurrency(fee);
  const depositFormatted = formatCurrency(deposit);

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
            font-size: 24px;
            font-weight: 600;
            margin-top: 20px;
            margin-bottom: 5px;
        }
        
        .contract-subtitle {
            font-size: 14px;
            opacity: 0.8;
        }
        
        /* Contract content */
        .contract-content {
            padding: 40px;
        }
        
        .contract-section {
            margin-bottom: 35px;
            page-break-inside: avoid;
        }
        
        .section-header {
            background: #f8fafc;
            border-left: 4px solid #191970;
            padding: 12px 20px;
            margin-bottom: 20px;
            border-radius: 0 8px 8px 0;
        }
        
        .section-title {
            font-size: 16px;
            font-weight: 600;
            color: #191970;
            margin: 0;
        }
        
        .form-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .form-grid.single {
            grid-template-columns: 1fr;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-label {
            display: block;
            font-weight: 500;
            color: #374151;
            margin-bottom: 6px;
            font-size: 14px;
        }
        
        .form-value {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            font-size: 14px;
            font-family: inherit;
            background: white;
            min-height: 44px;
            display: flex;
            align-items: center;
        }
        
        .form-value.large {
            min-height: 120px;
            align-items: flex-start;
            padding-top: 12px;
        }
        
        /* Terms and conditions section */
        .terms-section {
            background: #f9fafb;
            border-radius: 12px;
            padding: 30px;
            margin: 30px 0;
            border: 1px solid #e5e7eb;
            page-break-inside: avoid;
        }
        
        .terms-title {
            font-size: 18px;
            font-weight: 600;
            color: #191970;
            margin-bottom: 20px;
            text-align: center;
        }
        
        .terms-content {
            font-size: 13px;
            line-height: 1.6;
            color: #4b5563;
        }
        
        .terms-content h4 {
            font-weight: 600;
            color: #1f2937;
            margin: 20px 0 10px 0;
            font-size: 14px;
        }
        
        .terms-content h4:first-child {
            margin-top: 0;
        }
        
        .terms-content p {
            margin-bottom: 12px;
        }
        
        .terms-content ul {
            margin: 10px 0 15px 20px;
        }
        
        .terms-content li {
            margin-bottom: 5px;
        }
        
        /* Signature section */
        .signature-section {
            border-top: 2px solid #e5e7eb;
            margin-top: 40px;
            padding-top: 30px;
            page-break-inside: avoid;
        }
        
        .signature-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-top: 30px;
        }
        
        .signature-block {
            text-align: center;
        }
        
        .signature-line {
            border-bottom: 2px solid #191970;
            height: 50px;
            margin-bottom: 10px;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            font-style: italic;
            color: #6b7280;
        }
        
        .signature-label {
            font-weight: 500;
            color: #374151;
            margin-bottom: 5px;
        }
        
        .signature-date {
            font-size: 12px;
            color: #6b7280;
        }
        
        /* Footer */
        .contract-footer {
            background: #f8fafc;
            padding: 25px 40px;
            border-top: 1px solid #e5e7eb;
            font-size: 11px;
            color: #6b7280;
            line-height: 1.5;
        }
        
        .footer-title {
            font-weight: 600;
            color: #374151;
            margin-bottom: 10px;
        }
        
        .footer-content p {
            margin-bottom: 8px;
        }
        
        /* Responsive design */
        @media (max-width: 768px) {
            body {
                padding: 10px;
            }
            
            .contract-header {
                padding: 20px;
            }
            
            .logo-section {
                flex-direction: column;
                gap: 15px;
            }
            
            .company-name {
                font-size: 24px;
            }
            
            .contract-content {
                padding: 20px;
            }
            
            .form-grid {
                grid-template-columns: 1fr;
            }
            
            .signature-grid {
                grid-template-columns: 1fr;
                gap: 30px;
            }
            
            .terms-section {
                padding: 20px;
            }
        }
        
        /* Print-specific page breaks */
        .terms-section {
            page-break-before: auto;
            page-break-after: auto;
            page-break-inside: avoid;
        }
        
        .signature-section {
            page-break-before: avoid;
            page-break-inside: avoid;
        }
        
        .contract-footer {
            page-break-before: avoid;
        }
        
        /* Ensure critical sections stay together */
        .performer-client-info {
            page-break-inside: avoid;
        }
        
        .event-details {
            page-break-inside: avoid;
        }
        
        .financial-info {
            page-break-inside: avoid;
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
            <div class="contract-subtitle">Professional Music Services Agreement</div>
        </div>
        
        <!-- Contract Content -->
        <div class="contract-content">
            <!-- Performer Information -->
            <div class="contract-section performer-client-info">
                <div class="section-header">
                    <h2 class="section-title">Performer Information</h2>
                </div>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Business Name</label>
                        <div class="form-value">${businessName}</div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Primary Instrument</label>
                        <div class="form-value">${primaryInstrument}</div>
                    </div>
                </div>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Business Email</label>
                        <div class="form-value">${businessEmail}</div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Phone Number</label>
                        <div class="form-value">${businessPhone}</div>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Business Address</label>
                    <div class="form-value large">${businessAddress}</div>
                </div>
            </div>
            
            <!-- Client Information -->
            <div class="contract-section performer-client-info">
                <div class="section-header">
                    <h2 class="section-title">Client Information</h2>
                </div>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Client Name</label>
                        <div class="form-value">${clientName}</div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Client Email</label>
                        <div class="form-value">${clientEmail}</div>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Client Phone</label>
                    <div class="form-value">${clientPhone}</div>
                </div>
                <div class="form-group">
                    <label class="form-label">Client Address</label>
                    <div class="form-value large">${clientAddress}</div>
                </div>
            </div>
            
            <!-- Event Details -->
            <div class="contract-section event-details">
                <div class="section-header">
                    <h2 class="section-title">Event Details</h2>
                </div>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Event Date</label>
                        <div class="form-value">${formatDate(eventDate)}</div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Event Type</label>
                        <div class="form-value">${contract.event_type || contract.eventType || 'Performance'}</div>
                    </div>
                </div>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Start Time</label>
                        <div class="form-value">${formatTime(eventTime)}</div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">End Time</label>
                        <div class="form-value">${formatTime(eventEndTime)}</div>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Venue Name</label>
                    <div class="form-value">${venue}</div>
                </div>
                <div class="form-group">
                    <label class="form-label">Venue Address</label>
                    <div class="form-value large">${venueAddress}</div>
                </div>
            </div>
            
            <!-- Financial Information -->
            <div class="contract-section financial-info">
                <div class="section-header">
                    <h2 class="section-title">Financial Information</h2>
                </div>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Total Performance Fee (£)</label>
                        <div class="form-value">${formatCurrency(fee)}</div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Deposit Required (£)</label>
                        <div class="form-value">${formatCurrency(deposit)}</div>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Payment Instructions</label>
                    <div class="form-value large">${paymentInstructions}</div>
                </div>
            </div>
            
            <!-- Requirements -->
            <div class="contract-section">
                <div class="section-header">
                    <h2 class="section-title">Performance Requirements</h2>
                </div>
                <div class="form-group">
                    <label class="form-label">Equipment Requirements</label>
                    <div class="form-value large">${equipmentRequirements}</div>
                </div>
                <div class="form-group">
                    <label class="form-label">Special Requirements</label>
                    <div class="form-value large">${specialRequirements}</div>
                </div>
            </div>
            
            <!-- Terms and Conditions -->
            <div class="terms-section">
                <h3 class="terms-title">Terms and Conditions</h3>
                <div class="terms-content">
                    <h4>Payment Terms & Conditions</h4>
                    <p><strong>Payment Due Date:</strong> Full payment of ${totalFeeFormatted} becomes due and payable no later than the day of performance. Payment must be received before or immediately upon completion of the performance.</p>
                    <p><strong>Payment Methods:</strong> Cash or bank transfer to the performer's designated account (details provided separately).</p>
                    <p><strong>Deposit:</strong> ${depositFormatted} deposit required to secure booking. Deposit is non-refundable except as outlined in the cancellation policy below.</p>
                    <p><strong>Late Payment:</strong> Any payment received after the due date may incur a late payment fee of £25 plus interest at 2% per month.</p>
                    
                    <h4>Cancellation & Refund Policy</h4>
                    <p><strong>Client Cancellation:</strong></p>
                    <ul>
                        <li>More than 30 days before event: Any deposit paid will be refunded minus a £50 administration fee</li>
                        <li>30 days or less before event: Full performance fee becomes due regardless of cancellation</li>
                        <li>Same day cancellation: Full fee due plus any additional costs incurred</li>
                    </ul>
                    <p><strong>Performer Cancellation:</strong> In the unlikely event the performer must cancel due to circumstances within their control, all payments will be refunded in full and reasonable assistance will be provided to find a suitable replacement.</p>
                    <p><strong>Rescheduling:</strong> Event may be rescheduled once without penalty if agreed by both parties at least 14 days in advance. Additional rescheduling requests may incur a £25 administrative fee.</p>
                    
                    <h4>Force Majeure</h4>
                    <p>Neither party shall be liable for any failure to perform due to circumstances beyond their reasonable control, including but not limited to: severe weather, natural disasters, government restrictions, venue closure, or serious illness.</p>
                    
                    <h4>Performance Contingencies</h4>
                    <p>The performer will provide appropriate backup equipment where reasonably possible. If performance cannot proceed due to venue-related issues (power failure, noise restrictions, etc.), the full fee remains due.</p>
                    
                    <h4>Professional Performance Standards</h4>
                    <p><strong>Payment Schedule:</strong> The agreed performance fee (including applicable VAT) becomes due and payable on the date of performance of the engagement.</p>
                    <p><strong>Equipment & Instrument Protection:</strong> The equipment and instruments of the performer are not available for use by any other person, except by specific permission of the performer. All musical instruments and equipment remain the exclusive property of the performer.</p>
                    <p><strong>Venue Safety Requirements:</strong> The client shall ensure a safe supply of electricity and the security of the performer and their property at the venue throughout the engagement.</p>
                    <p><strong>Recording & Transmission Policy:</strong> The client shall not make or permit the making of any audio and/or visual recording or transmission of the performer's performance without the prior written consent of the performer.</p>
                    <p><strong>Contract Modifications:</strong> This agreement may not be modified or cancelled except by mutual consent, in writing signed by both parties. Verbal modifications are not binding.</p>
                    <p><strong>Performance Rider:</strong> Any rider attached hereto and signed by both parties shall be deemed incorporated into this agreement.</p>
                    <p><strong>Safe Space Principle:</strong> The client and performer agree to a 'Safe Space' principle to provide a working environment free from harassment and discrimination, maintaining respectful professional standards throughout the engagement.</p>
                    <p><strong>Professional Insurance:</strong> The performer maintains professional liability insurance as required for musical performance engagements.</p>
                </div>
            </div>
            
            <!-- Signature Section -->
            <div class="signature-section">
                <div class="section-header">
                    <h2 class="section-title">Agreement & Signatures</h2>
                </div>
                <p style="text-align: center; margin-bottom: 30px; color: #6b7280; font-style: italic;">
                    By signing below, both parties acknowledge they have read, understood, and agree to be bound by all terms and conditions set forth in this contract.
                </p>
                
                <div class="signature-grid">
                    <div class="signature-block">
                        <div class="signature-line">${signatureDetails ? businessName : 'Digital signature pending'}</div>
                        <div class="signature-label">Performer Signature</div>
                        <div class="signature-date">Date: ${signatureDetails ? formatDate(signatureDetails.signedAt) : '_______________'}</div>
                    </div>
                    <div class="signature-block">
                        <div class="signature-line">${signatureDetails?.signatureName || 'Digital signature pending'}</div>
                        <div class="signature-label">Client Signature</div>
                        <div class="signature-date">Date: ${signatureDetails ? formatDate(signatureDetails.signedAt) : '_______________'}</div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Footer -->
        <div class="contract-footer">
            <div class="footer-title">Legal Information & Governing Terms</div>
            <div class="footer-content">
                <p><strong>Contract Number:</strong> ${contractNumber}</p>
                <p><strong>Generated:</strong> ${generatedDate} at ${generatedTime}</p>
                <p><strong>Binding Agreement:</strong> This is a legally binding agreement between the parties named above. Both parties acknowledge they have read, understood, and agree to be bound by all terms and conditions set forth herein.</p>
                <p><strong>Governing Law & Jurisdiction:</strong> This contract shall be governed by and construed in accordance with the laws of England and Wales. Any disputes, claims, or legal proceedings arising from or relating to this agreement shall be subject to the exclusive jurisdiction of the courts of England and Wales.</p>
                <p><strong>Digital Signatures:</strong> Digital signatures are legally binding under the Electronic Communications Act 2000 and eIDAS Regulation. Electronic acceptance constitutes agreement to all terms.</p>
                <p><strong>Entire Agreement:</strong> This contract represents the entire agreement between the parties and supersedes all prior negotiations, representations, or agreements. No modification shall be valid unless in writing and signed by both parties.</p>
                <p><strong>Severability:</strong> If any provision of this contract is found to be unenforceable, the remaining provisions shall continue in full force and effect.</p>
            </div>
        </div>
    </div>
</body>
</html>`;
}