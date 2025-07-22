import puppeteer from 'puppeteer';

// Generate comprehensive HTML contract matching your reference design
function generateContractHTML(contract: any, userSettings: any): string {
  const formatDate = (date: any) => {
    if (!date) return 'Date TBC';
    return new Date(date).toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  const formatLongDate = (date: any) => {
    if (!date) return 'Date TBC';
    return new Date(date).toLocaleDateString('en-GB', { 
      weekday: 'long',
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const eventDateStr = formatDate(contract.eventDate);
  const eventLongDateStr = formatLongDate(contract.eventDate);

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Performance Contract</title>
    <style>
        @page {
            margin: 40px;
            size: A4;
        }
        
        body {
            font-family: Arial, sans-serif;
            font-size: 11px;
            line-height: 1.4;
            color: #333;
            margin: 0;
            padding: 0;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #7C3AED;
            padding-bottom: 20px;
        }
        
        .logo {
            width: 50px;
            height: 50px;
            background: #7C3AED;
            margin: 0 auto 15px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 20px;
            font-weight: bold;
        }
        
        .title {
            font-size: 28px;
            font-weight: bold;
            color: #222;
            margin: 15px 0 10px;
        }
        
        .subtitle {
            font-size: 14px;
            font-weight: bold;
            color: #666;
            margin-bottom: 10px;
        }
        
        .draft-badge {
            background: #FFF7E0;
            color: #E6B800;
            padding: 5px 15px;
            border-radius: 15px;
            font-size: 12px;
            font-weight: bold;
            display: inline-block;
            border: 1px solid #E6B800;
        }
        
        .section {
            margin: 25px 0;
        }
        
        .section-title {
            font-size: 16px;
            font-weight: bold;
            color: #222;
            margin-bottom: 15px;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
        }
        
        .event-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }
        
        .event-table th,
        .event-table td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: left;
        }
        
        .event-table th {
            background: #E5E7EB;
            font-weight: bold;
            width: 35%;
        }
        
        .event-table td {
            background: #fff;
        }
        
        .event-table tr:nth-child(even) th {
            background: #F9FAFB;
        }
        
        .fee-highlight {
            color: #2563EB;
            font-weight: bold;
            font-size: 13px;
        }
        
        .terms-box {
            background: #F3F4F6;
            border: 1px solid #D1D5DB;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        
        .terms-title {
            color: #2563EB;
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 10px;
        }
        
        .terms-content {
            font-size: 10px;
            line-height: 1.5;
        }
        
        .terms-content ul {
            margin: 10px 0;
            padding-left: 20px;
        }
        
        .signature-section {
            margin-top: 40px;
        }
        
        .signature-box {
            border: 2px solid #22C55E;
            background: #F0FDF4;
            padding: 15px;
            margin: 15px 0;
            border-radius: 8px;
        }
        
        .signature-box.client {
            border-color: #E5E7EB;
            background: #F9FAFB;
        }
        
        .signature-label {
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        .signature-details {
            font-size: 10px;
            color: #666;
        }
        
        .footer {
            margin-top: 40px;
            padding: 15px;
            background: #F3F4F6;
            border-radius: 8px;
            font-size: 9px;
            color: #666;
        }
        
        .footer-title {
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .musobuddy-footer {
            text-align: center;
            margin-top: 20px;
            color: #7C3AED;
            font-size: 10px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">M</div>
        <div class="title">Performance Contract</div>
        <div class="subtitle">(${eventDateStr} - ${contract.clientName || 'Client'})</div>
        <div class="draft-badge">DRAFT</div>
    </div>

    <div class="section">
        <div class="section-title">Performer Details</div>
        <p><strong>Tim Fulker</strong></p>
        <p>59, Gloucester Rd Bournemouth Dorset BH7 6JA</p>
        <p>Phone: 07765190034</p>
        <p>Email: timfulkermusic@gmail.com</p>
    </div>

    <div class="section">
        <div class="section-title">Event Details</div>
        <table class="event-table">
            <tr>
                <th>Client Name</th>
                <td>${contract.clientName || 'Not provided'}</td>
            </tr>
            <tr>
                <th>Client Email</th>
                <td>${contract.clientEmail || 'Not provided'}</td>
            </tr>
            <tr>
                <th>Client Address</th>
                <td>${contract.clientAddress || 'Not provided'}</td>
            </tr>
            <tr>
                <th>Client Phone</th>
                <td>${contract.clientPhone || 'Not provided'}</td>
            </tr>
            <tr>
                <th>Event Date</th>
                <td>${eventLongDateStr}</td>
            </tr>
            <tr>
                <th>Event Time</th>
                <td>${contract.eventTime || 'Time TBC'}</td>
            </tr>
            <tr>
                <th>Venue</th>
                <td>${contract.venue || 'Venue TBC'}</td>
            </tr>
            <tr>
                <th>Performance Fee</th>
                <td class="fee-highlight">£${contract.fee || '0.00'}</td>
            </tr>
        </table>
    </div>

    <div class="section">
        <div class="section-title">Terms and Conditions</div>
        
        <div class="terms-box">
            <div class="terms-title">Payment Terms & Conditions</div>
            <div class="terms-content">
                <p><strong>Payment Due Date:</strong> Full payment of £${contract.fee || '0.00'} becomes due and payable no later than the day of performance. Payment must be received before or immediately upon completion of the performance.</p>
                <p><strong>Payment Methods:</strong> Cash or bank transfer to the performer's designated account (details provided separately).</p>
                <p><strong>Deposit:</strong> £${contract.deposit || '0.00'} deposit required to secure booking. Deposit is non-refundable except as outlined in the cancellation policy below.</p>
                <p><strong>Late Payment:</strong> Any payment received after the due date may incur a late payment fee of £25 plus interest at 2% per month.</p>
            </div>
        </div>

        <div class="terms-box">
            <div class="terms-title">Cancellation & Refund Policy</div>
            <div class="terms-content">
                <p><strong>Client Cancellation:</strong></p>
                <ul>
                    <li>More than 30 days before event: Any deposit paid will be refunded minus a £50 administration fee</li>
                    <li>30 days or less before event: Full performance fee becomes due regardless of cancellation</li>
                    <li>Same day cancellation: Full fee due plus any additional costs incurred</li>
                </ul>
                <p><strong>Performer Cancellation:</strong> In the unlikely event the performer must cancel due to circumstances within their control, all payments will be refunded in full and reasonable assistance will be provided to find a suitable replacement.</p>
                <p><strong>Rescheduling:</strong> Event may be rescheduled once without penalty if agreed by both parties at least 14 days in advance. Additional rescheduling requests may incur a £25 administrative fee.</p>
            </div>
        </div>

        <div class="terms-box">
            <div class="terms-title">Force Majeure</div>
            <div class="terms-content">
                <p>Neither party shall be liable for any failure to perform due to circumstances beyond their reasonable control, including but not limited to: severe weather, natural disasters, government restrictions, venue closure, or serious illness.</p>
            </div>
        </div>

        <div class="terms-box">
            <div class="terms-title">Performance Contingencies</div>
            <div class="terms-content">
                <p>The performer will provide appropriate backup equipment where reasonably possible. If performance cannot proceed due to venue-related issues (power failure, noise restrictions, etc.), the full fee remains due.</p>
            </div>
        </div>

        <div class="terms-box">
            <div class="terms-title">Professional Performance Standards</div>
            <div class="terms-content">
                <p><strong>Payment Schedule:</strong> The agreed performance fee (including applicable VAT) becomes due and payable on the date of performance of the engagement.</p>
                <p><strong>Equipment & Instrument Protection:</strong> The equipment and instruments of the performer are not available for use by any other person, except by specific permission of the performer. All musical instruments and equipment remain the exclusive property of the performer.</p>
                <p><strong>Venue Safety Requirements:</strong> The client shall ensure a safe supply of electricity and the security of the performer and their property at the venue throughout the engagement.</p>
            </div>
        </div>

        <div class="terms-box">
            <div class="terms-title">Recording & Transmission Policy</div>
            <div class="terms-content">
                <p>The client shall not make or permit the making of any audio and/or visual recording or transmission of the performer's performance without the prior written consent of the performer.</p>
            </div>
        </div>

        <div class="terms-box">
            <div class="terms-title">Contract Modifications</div>
            <div class="terms-content">
                <p>This agreement may not be modified or cancelled except by mutual consent, in writing signed by both parties. Verbal modifications are not binding.</p>
            </div>
        </div>

        <div class="terms-box">
            <div class="terms-title">Performance Rider</div>
            <div class="terms-content">
                <p>Any rider attached hereto and signed by both parties shall be deemed incorporated into this agreement.</p>
            </div>
        </div>

        <div class="terms-box">
            <div class="terms-title">Safe Space Principle</div>
            <div class="terms-content">
                <p>The client and performer agree to a 'Safe Space' principle to provide a working environment free from harassment and discrimination, maintaining respectful professional standards throughout the engagement.</p>
            </div>
        </div>

        <div class="terms-box">
            <div class="terms-title">Professional Insurance</div>
            <div class="terms-content">
                <p>The performer maintains professional liability insurance as required for musical performance engagements.</p>
            </div>
        </div>
    </div>

    <div class="signature-section">
        <div class="section-title">Signatures</div>
        
        <div class="section-title" style="font-size: 14px; margin-top: 30px;">Performer</div>
        <div class="signature-box">
            <div class="signature-label">Signed by: Tim Fulker</div>
            <div class="signature-details">Date: ${new Date().toLocaleDateString('en-GB')}</div>
            <div class="signature-details">Status: Agreed by sending contract</div>
        </div>

        <div class="section-title" style="font-size: 14px; margin-top: 30px;">Client</div>
        <div class="signature-box client">
            <div class="signature-details">Status: Awaiting Signature</div>
            <div class="signature-details">This contract has been sent to ${contract.clientEmail || 'client email'} for digital signature.</div>
        </div>
    </div>

    <div class="footer">
        <div class="terms-box">
            <div class="terms-title">Binding Agreement</div>
            <div class="terms-content">
                <p>This is a legally binding agreement between the parties named above. Both parties acknowledge they have read, understood, and agree to be bound by all terms and conditions set forth herein.</p>
            </div>
        </div>

        <div class="terms-box">
            <div class="terms-title">Governing Law & Jurisdiction</div>
            <div class="terms-content">
                <p>This contract shall be governed by and construed in accordance with the laws of England and Wales. Any disputes, claims, or legal proceedings arising from or relating to this agreement shall be subject to the exclusive jurisdiction of the courts of England and Wales.</p>
            </div>
        </div>

        <div class="terms-box">
            <div class="terms-title">Digital Signatures</div>
            <div class="terms-content">
                <p>Digital signatures are legally binding under the Electronic Communications Act 2000 and eIDAS Regulation. Electronic acceptance constitutes agreement to all terms.</p>
            </div>
        </div>

        <div class="terms-box">
            <div class="terms-title">Entire Agreement</div>
            <div class="terms-content">
                <p>This contract represents the entire agreement between the parties and supersedes all prior negotiations, representations, or agreements. No modification shall be valid unless in writing and signed by both parties.</p>
            </div>
        </div>

        <div class="terms-box">
            <div class="terms-title">Severability</div>
            <div class="terms-content">
                <p>If any provision of this contract is found to be unenforceable, the remaining provisions shall continue in full force and effect.</p>
            </div>
        </div>

        <div class="terms-box">
            <div class="terms-title">Contract Validity</div>
            <div class="terms-content">
                <p>This contract remains valid and enforceable regardless of changes in circumstances, location, or contact information of either party.</p>
            </div>
        </div>

        <div class="footer-title">Legal Information & Governing Terms:</div>
        <p>Contract Number: ${eventDateStr} - ${contract.clientName || 'Client'}</p>
        <p>Generated: ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB')}</p>
    </div>

    <div class="musobuddy-footer">
        Powered by <strong>MusoBuddy</strong> – less admin, more music.
    </div>
</body>
</html>
  `;
}

export async function generateHTMLContractPDF(contract: any, userSettings: any): Promise<Buffer> {
  console.log('📄 Generating HTML contract with Puppeteer...');
  
  const html = generateContractHTML(contract, userSettings);
  
  try {
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
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
    
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
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
    
    await browser.close();
    
    console.log('✅ HTML contract PDF generated, size:', pdfBuffer.length, 'bytes');
    return pdfBuffer;
    
  } catch (error) {
    console.error('❌ Puppeteer PDF generation failed:', error);
    console.log('🔄 Falling back to external PDF service...');
    
    // Fallback to external PDF service (HTMLCSSto PDF API)
    try {
      const response = await fetch('https://htmlcsstoimage.com/demo_run/pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          html: html,
          css: '', // CSS is embedded in HTML
          google_fonts: 'Arial',
          format: 'A4',
          width: 794,
          height: 1123
        })
      });
      
      if (response.ok) {
        const pdfBuffer = Buffer.from(await response.arrayBuffer());
        console.log('✅ External PDF service generated contract, size:', pdfBuffer.length, 'bytes');
        return pdfBuffer;
      }
    } catch (externalError) {
      console.error('❌ External PDF service failed:', externalError);
    }
    
    throw new Error(`HTML PDF generation failed: ${error.message}. Try using ?pdfkit=true for legacy generation.`);
  }
}