import puppeteer from 'puppeteer';

// FRESH START: Simple PDF generator like your original success 3-4 weeks ago
export async function generateSimpleContractPDF(contract: any, userSettings: any): Promise<Buffer> {
  console.log('🚀 FRESH START: Simple contract PDF generation');
  
  // Super simple, reliable browser launch - like the original
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Simple HTML template - professional but straightforward
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Contract ${contract.contractNumber}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 30px;
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #9333ea;
            padding-bottom: 20px;
            margin-bottom: 40px;
          }
          .header h1 {
            color: #9333ea;
            margin: 0;
            font-size: 32px;
          }
          .header h2 {
            color: #666;
            margin: 10px 0 0 0;
            font-size: 18px;
          }
          .section {
            margin-bottom: 30px;
          }
          .section h3 {
            color: #2563eb;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
          }
          .details-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 20px 0;
          }
          .detail-item {
            margin-bottom: 10px;
          }
          .label {
            font-weight: bold;
            color: #555;
          }
          .value {
            color: #333;
            margin-left: 10px;
          }
          .fee-highlight {
            background: #f0f8ff;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            margin: 20px 0;
          }
          .fee-amount {
            font-size: 24px;
            font-weight: bold;
            color: #059669;
          }
          .terms {
            background: #f9f9f9;
            padding: 20px;
            border-radius: 8px;
            font-size: 14px;
          }
          .signature-section {
            margin-top: 50px;
            border-top: 2px solid #ddd;
            padding-top: 30px;
          }
          .signature-boxes {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-top: 20px;
          }
          .signature-box {
            border: 1px solid #ccc;
            padding: 20px;
            text-align: center;
            background: #fafafa;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>PERFORMANCE CONTRACT</h1>
          <h2>Contract Number: ${contract.contractNumber || 'N/A'}</h2>
        </div>

        <div class="section">
          <h3>Event Details</h3>
          <div class="details-grid">
            <div>
              <div class="detail-item">
                <span class="label">Client:</span>
                <span class="value">${contract.clientName || 'N/A'}</span>
              </div>
              <div class="detail-item">
                <span class="label">Email:</span>
                <span class="value">${contract.clientEmail || 'N/A'}</span>
              </div>
              <div class="detail-item">
                <span class="label">Date:</span>
                <span class="value">${contract.eventDate ? new Date(contract.eventDate).toLocaleDateString('en-GB') : 'N/A'}</span>
              </div>
            </div>
            <div>
              <div class="detail-item">
                <span class="label">Time:</span>
                <span class="value">${contract.eventTime || 'TBC'}</span>
              </div>
              <div class="detail-item">
                <span class="label">Venue:</span>
                <span class="value">${contract.venue || 'TBC'}</span>
              </div>
            </div>
          </div>
          
          <div class="fee-highlight">
            <div class="fee-amount">Performance Fee: £${contract.fee || '0'}</div>
          </div>
        </div>

        <div class="section">
          <h3>Performer Details</h3>
          <div class="detail-item">
            <span class="label">Business:</span>
            <span class="value">${userSettings?.businessName || 'MusoBuddy'}</span>
          </div>
          ${userSettings?.businessEmail ? `
          <div class="detail-item">
            <span class="label">Email:</span>
            <span class="value">${userSettings.businessEmail}</span>
          </div>
          ` : ''}
          ${userSettings?.phone ? `
          <div class="detail-item">
            <span class="label">Phone:</span>
            <span class="value">${userSettings.phone}</span>
          </div>
          ` : ''}
        </div>

        <div class="section">
          <h3>Terms & Conditions</h3>
          <div class="terms">
            <p><strong>Payment:</strong> The performance fee is payable on the date of performance.</p>
            <p><strong>Equipment:</strong> All instruments and equipment remain the property of the performer.</p>
            <p><strong>Venue Safety:</strong> The client ensures safe electricity supply and security.</p>
            <p><strong>Recording:</strong> No recording without written consent.</p>
            <p><strong>Cancellation:</strong> Standard cancellation terms apply as per industry practice.</p>
          </div>
        </div>

        <div class="signature-section">
          <h3>Agreement</h3>
          <p>This contract represents the complete agreement between the parties.</p>
          
          <div class="signature-boxes">
            <div class="signature-box">
              <p><strong>Performer</strong></p>
              <p>${userSettings?.businessName || 'MusoBuddy'}</p>
              <p style="margin-top: 30px;">Signature: _________________</p>
              <p>Date: _________________</p>
            </div>
            <div class="signature-box">
              <p><strong>Client</strong></p>
              <p>${contract.clientName || 'N/A'}</p>
              <p style="margin-top: 30px;">Signature: _________________</p>
              <p>Date: _________________</p>
            </div>
          </div>
        </div>

        <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #666;">
          <p>Generated by MusoBuddy - ${new Date().toLocaleDateString('en-GB')}</p>
        </div>
      </body>
      </html>
    `;
    
    await page.setContent(html);
    const pdf = await page.pdf({ 
      format: 'A4', 
      printBackground: true,
      margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' }
    });
    
    console.log('✅ Simple PDF generated successfully:', pdf.length, 'bytes');
    return Buffer.from(pdf);
    
  } finally {
    await browser.close();
  }
}