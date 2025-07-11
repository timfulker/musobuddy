import puppeteer from 'puppeteer';
import type { Contract, UserSettings, Invoice } from '@shared/schema';

export async function generateContractPDF(
  contract: Contract,
  userSettings: UserSettings | null,
  signatureDetails?: {
    signedAt: Date;
    signatureName?: string;
    clientIpAddress?: string;
  }
): Promise<Buffer> {
  // Try to detect the correct Chromium path for both development and production
  let executablePath;
  try {
    // Check if development path exists
    const devPath = '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium';
    const fs = await import('fs');
    if (fs.existsSync(devPath)) {
      executablePath = devPath;
    } else {
      // Try to find chromium in common locations
      const possiblePaths = [
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable'
      ];
      
      for (const path of possiblePaths) {
        if (fs.existsSync(path)) {
          executablePath = path;
          break;
        }
      }
    }
  } catch (error) {
    console.error('Error checking Chromium paths:', error);
  }
  
  console.log('Using Chromium executable:', executablePath || 'default');
  
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: executablePath,
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--single-process'
    ]
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

export async function generateInvoicePDF(
  invoice: Invoice,
  contract: Contract | null,
  userSettings: UserSettings | null
): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--single-process'
    ]
  });
  
  try {
    const page = await browser.newPage();
    
    // Generate HTML content for the invoice
    const html = generateInvoiceHTML(invoice, contract, userSettings);
    
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    // Generate PDF
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });
    
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

function generateInvoiceHTML(
  invoice: Invoice,
  contract: Contract | null,
  userSettings: UserSettings | null
): string {
  const businessName = userSettings?.businessName || 'MusoBuddy';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Invoice ${invoice.invoiceNumber}</title>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          margin: 0;
          padding: 20px;
          color: #333;
          line-height: 1.6;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 40px;
          border-bottom: 3px solid #0EA5E9;
          padding-bottom: 20px;
        }
        .logo {
          font-size: 32px;
          font-weight: bold;
          color: #0EA5E9;
        }
        .invoice-details {
          text-align: right;
        }
        .invoice-number {
          font-size: 24px;
          font-weight: bold;
          color: #333;
          margin-bottom: 5px;
        }
        .invoice-date {
          color: #666;
          font-size: 14px;
        }
        .billing-section {
          display: flex;
          justify-content: space-between;
          margin-bottom: 40px;
        }
        .billing-info {
          width: 45%;
        }
        .billing-info h3 {
          color: #333;
          margin-bottom: 15px;
          font-size: 16px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .billing-info p {
          margin: 5px 0;
          color: #666;
        }
        .billing-info strong {
          color: #333;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        .items-table th {
          background-color: #f8f9fa;
          padding: 15px;
          text-align: left;
          border-bottom: 2px solid #dee2e6;
          font-weight: bold;
          color: #333;
        }
        .items-table td {
          padding: 15px;
          border-bottom: 1px solid #dee2e6;
        }
        .items-table .amount {
          text-align: right;
          font-weight: bold;
        }
        .total-section {
          text-align: right;
          margin-top: 30px;
        }
        .total-row {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 8px;
        }
        .total-label {
          width: 150px;
          text-align: right;
          padding-right: 20px;
          color: #666;
        }
        .total-amount {
          width: 100px;
          text-align: right;
          font-weight: bold;
        }
        .grand-total {
          font-size: 20px;
          color: #0EA5E9;
          border-top: 2px solid #0EA5E9;
          padding-top: 15px;
          margin-top: 15px;
        }
        .payment-info {
          margin-top: 40px;
          padding: 20px;
          background-color: #f8f9fa;
          border-radius: 8px;
        }
        .payment-info h3 {
          color: #333;
          margin-bottom: 15px;
        }
        .payment-info p {
          margin: 5px 0;
          color: #666;
        }
        .terms {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #dee2e6;
        }
        .terms h3 {
          color: #333;
          margin-bottom: 10px;
        }
        .terms p {
          color: #666;
          line-height: 1.5;
        }
        .status-badge {
          display: inline-block;
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .status-draft {
          background-color: #fef3c7;
          color: #92400e;
        }
        .status-sent {
          background-color: #dbeafe;
          color: #1e40af;
        }
        .status-paid {
          background-color: #d1fae5;
          color: #065f46;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">${businessName}</div>
        <div class="invoice-details">
          <div class="invoice-number">Invoice ${invoice.invoiceNumber}</div>
          <div class="invoice-date">${new Date(invoice.createdAt || '').toLocaleDateString('en-GB')}</div>
          <div style="margin-top: 10px;">
            <span class="status-badge status-${invoice.status}">${invoice.status}</span>
          </div>
        </div>
      </div>

      <div class="billing-section">
        <div class="billing-info">
          <h3>From:</h3>
          <p><strong>${businessName}</strong></p>
          ${userSettings?.businessAddress ? `<p>${userSettings.businessAddress.replace(/\n/g, '<br>')}</p>` : ''}
          ${userSettings?.phone ? `<p>Phone: ${userSettings.phone}</p>` : ''}
          ${userSettings?.businessEmail ? `<p>Email: ${userSettings.businessEmail}</p>` : ''}
          ${userSettings?.website ? `<p>Website: ${userSettings.website}</p>` : ''}
        </div>
        <div class="billing-info">
          <h3>Bill To:</h3>
          <p><strong>${invoice.clientName}</strong></p>
          ${contract?.clientEmail ? `<p>${contract.clientEmail}</p>` : ''}
          ${contract?.clientPhone ? `<p>${contract.clientPhone}</p>` : ''}
          ${invoice.businessAddress ? `<p>${invoice.businessAddress.replace(/\n/g, '<br>')}</p>` : ''}
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Event Date</th>
            <th>Performance Fee</th>
            <th>Deposit Paid</th>
            <th class="amount">Amount Due</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Music Performance - ${invoice.clientName}</td>
            <td>${invoice.performanceDate ? new Date(invoice.performanceDate).toLocaleDateString('en-GB') : 'TBD'}</td>
            <td>£${parseFloat(invoice.performanceFee || '0').toFixed(2)}</td>
            <td>£${parseFloat(invoice.depositPaid || '0').toFixed(2)}</td>
            <td class="amount">£${parseFloat(invoice.amount).toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <div class="total-section">
        <div class="total-row">
          <div class="total-label">Performance Fee:</div>
          <div class="total-amount">£${parseFloat(invoice.performanceFee || '0').toFixed(2)}</div>
        </div>
        <div class="total-row">
          <div class="total-label">Deposit Paid:</div>
          <div class="total-amount">-£${parseFloat(invoice.depositPaid || '0').toFixed(2)}</div>
        </div>
        <div class="total-row grand-total">
          <div class="total-label">Total Due:</div>
          <div class="total-amount">£${parseFloat(invoice.amount).toFixed(2)}</div>
        </div>
      </div>

      <div class="payment-info">
        <h3>Payment Information</h3>
        <p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString('en-GB')}</p>
        ${userSettings?.bankDetails ? `<p><strong>Bank Details:</strong><br>${userSettings.bankDetails.replace(/\n/g, '<br>')}</p>` : ''}
      </div>

      <div class="terms">
        <h3>Terms & Conditions</h3>
        <p>${userSettings?.defaultTerms || 'Payment is due within 30 days of the invoice date. Thank you for your business!'}</p>
      </div>
    </body>
    </html>
  `;
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
            <p><strong>Date:</strong> ${contract.createdAt ? new Date(contract.createdAt.toString()).toLocaleDateString('en-GB') : 'Unknown'}</p>
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