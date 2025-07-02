import puppeteer from 'puppeteer';
import type { Contract, UserSettings } from '@shared/schema';

export async function generateContractPDF(
  contract: Contract,
  userSettings: UserSettings | null,
  signatureDetails?: {
    signedAt: Date;
    signatureName?: string;
    clientIpAddress?: string;
  }
): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Generate HTML content for the contract
    const html = generateContractHTML(contract, userSettings, signatureDetails);
    
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    // Generate PDF
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '1cm',
        bottom: '1cm',
        left: '1cm',
        right: '1cm'
      }
    });
    
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
  const businessName = userSettings?.businessName || 'MusoBuddy';
  const businessAddress = userSettings?.businessAddress || '';
  const businessPhone = userSettings?.phone || '';
  const businessEmail = userSettings?.businessEmail || '';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Performance Contract ${contract.contractNumber}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #333;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .business-details {
          margin-bottom: 30px;
        }
        .contract-details {
          margin-bottom: 30px;
        }
        .terms {
          margin-bottom: 30px;
        }
        .signature-section {
          margin-top: 50px;
          border-top: 1px solid #ccc;
          padding-top: 30px;
        }
        .signature-box {
          border: 1px solid #333;
          padding: 20px;
          margin: 20px 0;
          background-color: #f9f9f9;
        }
        .signed-box {
          border: 2px solid #4CAF50;
          background-color: #e8f5e8;
        }
        .party-section {
          margin-bottom: 30px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 12px;
          text-align: left;
        }
        th {
          background-color: #f4f4f4;
          font-weight: bold;
        }
        .amount {
          font-weight: bold;
          color: #2563eb;
        }
        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
        }
        .status-signed {
          background-color: #dcfce7;
          color: #166534;
        }
        .status-sent {
          background-color: #fef3c7;
          color: #92400e;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Performance Contract</h1>
        <h2>${contract.contractNumber}</h2>
        <div class="status-badge ${contract.status === 'signed' ? 'status-signed' : 'status-sent'}">
          ${contract.status.toUpperCase()}
        </div>
      </div>

      <div class="business-details">
        <h3>Performer Details</h3>
        <p><strong>${businessName}</strong></p>
        ${businessAddress ? `<p>${businessAddress}</p>` : ''}
        ${businessPhone ? `<p>Phone: ${businessPhone}</p>` : ''}
        ${businessEmail ? `<p>Email: ${businessEmail}</p>` : ''}
      </div>

      <div class="contract-details">
        <h3>Event Details</h3>
        <table>
          <tr>
            <th>Client Name</th>
            <td>${contract.clientName}</td>
          </tr>
          <tr>
            <th>Client Email</th>
            <td>${contract.clientEmail}</td>
          </tr>
          <tr>
            <th>Event Date</th>
            <td>${new Date(contract.eventDate).toLocaleDateString('en-GB', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</td>
          </tr>
          <tr>
            <th>Event Time</th>
            <td>${contract.eventTime}</td>
          </tr>
          <tr>
            <th>Venue</th>
            <td>${contract.venue}</td>
          </tr>
          <tr>
            <th>Performance Fee</th>
            <td class="amount">£${contract.fee}</td>
          </tr>
        </table>
      </div>

      <div class="terms">
        <h3>Terms and Conditions</h3>
        <div style="white-space: pre-wrap; padding: 15px; background-color: #f9f9f9; border-radius: 5px;">
${contract.terms}
        </div>
      </div>

      <div class="signature-section">
        <h3>Signatures</h3>
        
        <div class="party-section">
          <h4>Performer</h4>
          <div class="signature-box signed-box">
            <p><strong>Signed by:</strong> ${businessName}</p>
            <p><strong>Date:</strong> ${new Date(contract.createdAt).toLocaleDateString('en-GB')}</p>
            <p><strong>Status:</strong> Agreed by sending contract</p>
          </div>
        </div>

        <div class="party-section">
          <h4>Client</h4>
          <div class="signature-box ${contract.status === 'signed' ? 'signed-box' : ''}">
            ${contract.status === 'signed' && signatureDetails ? `
              <p><strong>Signed by:</strong> ${signatureDetails.signatureName || 'Digital Signature'}</p>
              <p><strong>Date:</strong> ${signatureDetails.signedAt.toLocaleDateString('en-GB')} at ${signatureDetails.signedAt.toLocaleTimeString('en-GB')}</p>
              <p><strong>Status:</strong> Digitally Signed</p>
            ` : `
              <p><strong>Status:</strong> Awaiting Signature</p>
              <p>This contract has been sent to ${contract.clientEmail} for digital signature.</p>
            `}
          </div>
        </div>
      </div>

      <div style="margin-top: 50px; padding: 20px; background-color: #f0f0f0; border-radius: 5px; font-size: 12px; color: #666;">
        <p><strong>Document Information:</strong></p>
        <p>Contract Number: ${contract.contractNumber}</p>
        <p>Generated: ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB')}</p>
        <p>This is a legally binding agreement between the parties named above.</p>
      </div>
    </body>
    </html>
  `;
}