import puppeteer from 'puppeteer';

interface SimpleContractData {
  id: number;
  contractNumber: string;
  clientName: string;
  clientEmail?: string;
  venue: string;
  eventDate: Date;
  fee: string;
  deposit?: string;
}

interface SimpleUserSettings {
  businessName: string;
  primaryInstrument: string;
}

export async function generateSimpleContractPDF(
  contract: SimpleContractData,
  userSettings: SimpleUserSettings | null
): Promise<Buffer> {
  
  const businessName = userSettings?.businessName || 'Your Business';
  const eventDateStr = contract.eventDate.toLocaleDateString('en-GB');
  
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Performance Contract</title>
    <style>
        @page {
            size: A4;
            margin: 20mm;
        }
        
        body {
            font-family: 'Inter', Arial, sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #1e293b;
            margin: 0;
            padding: 0;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #3b82f6;
            padding-bottom: 20px;
        }
        
        .header h1 {
            color: #1e40af;
            font-size: 24px;
            margin: 0 0 10px 0;
            font-weight: 700;
        }
        
        .contract-number {
            color: #64748b;
            font-size: 14px;
            font-weight: 600;
        }
        
        .section {
            margin: 20px 0;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
        }
        
        .section h2 {
            color: #1e40af;
            font-size: 16px;
            margin: 0 0 15px 0;
            font-weight: 700;
            border-bottom: 2px solid #3b82f6;
            padding-bottom: 8px;
        }
        
        .details-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin: 15px 0;
        }
        
        .detail-item {
            background: white;
            padding: 12px;
            border-radius: 6px;
            border-left: 4px solid #3b82f6;
        }
        
        .detail-label {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748b;
            font-weight: 600;
            margin-bottom: 4px;
        }
        
        .detail-value {
            font-size: 14px;
            font-weight: 700;
            color: #1e293b;
        }
        
        .terms {
            margin: 30px 0;
        }
        
        .terms h3 {
            color: #1e40af;
            font-size: 14px;
            margin: 15px 0 8px 0;
            font-weight: 700;
        }
        
        .terms ul {
            margin: 8px 0 8px 20px;
            padding: 0;
        }
        
        .terms li {
            margin: 6px 0;
            line-height: 1.5;
        }
        
        .signature-section {
            margin-top: 40px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
        }
        
        .signature-box {
            border: 2px solid #3b82f6;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            background: white;
        }
        
        .signature-line {
            border-top: 2px solid #3b82f6;
            margin: 30px 0 10px 0;
            position: relative;
        }
        
        .signature-label {
            font-weight: 700;
            color: #1e40af;
            margin-top: 10px;
        }
        
        .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 10px;
            color: #64748b;
            border-top: 1px solid #e2e8f0;
            padding-top: 20px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Performance Contract</h1>
        <div class="contract-number">${contract.contractNumber}</div>
    </div>

    <div class="section">
        <h2>Event Details</h2>
        <div class="details-grid">
            <div class="detail-item">
                <div class="detail-label">Client</div>
                <div class="detail-value">${contract.clientName}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Venue</div>
                <div class="detail-value">${contract.venue}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Date</div>
                <div class="detail-value">${eventDateStr}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Performance Fee</div>
                <div class="detail-value">£${contract.fee}</div>
            </div>
        </div>
    </div>

    <div class="section terms">
        <h2>Terms & Conditions</h2>
        
        <h3>Payment Terms</h3>
        <ul>
            <li>Total performance fee: £${contract.fee}</li>
            ${contract.deposit ? `<li>Deposit required: £${contract.deposit}</li>` : ''}
            <li>Final payment due on completion of performance</li>
            <li>All payments to be made to ${businessName}</li>
        </ul>
        
        <h3>Performance Requirements</h3>
        <ul>
            <li>Professional ${userSettings?.primaryInstrument || 'musical'} performance</li>
            <li>Appropriate attire and presentation</li>
            <li>Punctual arrival and setup</li>
            <li>Performance duration as agreed</li>
        </ul>
        
        <h3>Cancellation Policy</h3>
        <ul>
            <li>Client cancellation: 48+ hours notice - full refund</li>
            <li>Client cancellation: Less than 48 hours - 50% fee retained</li>
            <li>Performer cancellation: Alternative performer provided or full refund</li>
            <li>Force majeure events handled case by case</li>
        </ul>
        
        <h3>General Terms</h3>
        <ul>
            <li>This contract constitutes the entire agreement between parties</li>
            <li>Any modifications must be agreed in writing</li>
            <li>Governed by UK law</li>
            <li>Both parties confirm they have authority to enter this agreement</li>
        </ul>
    </div>

    <div class="signature-section">
        <div class="signature-box">
            <div>Performer</div>
            <div class="signature-line"></div>
            <div class="signature-label">${businessName}</div>
            <div style="margin-top: 15px; font-size: 10px; color: #64748b;">
                Date: _______________
            </div>
        </div>
        
        <div class="signature-box">
            <div>Client</div>
            <div class="signature-line"></div>
            <div class="signature-label">${contract.clientName}</div>
            <div style="margin-top: 15px; font-size: 10px; color: #64748b;">
                Date: _______________
            </div>
        </div>
    </div>

    <div class="footer">
        <div>Contract generated on ${new Date().toLocaleDateString('en-GB')}</div>
        <div>Professional performance contract - ${businessName}</div>
    </div>
</body>
</html>`;

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ],
    executablePath: process.env.NODE_ENV === 'production' 
      ? '/usr/bin/chromium-browser' 
      : undefined
  });
  
  const page = await browser.newPage();
  await page.setContent(htmlContent);
  
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20mm',
      bottom: '20mm',
      left: '20mm',
      right: '20mm'
    }
  });
  
  await browser.close();
  return pdfBuffer;
}