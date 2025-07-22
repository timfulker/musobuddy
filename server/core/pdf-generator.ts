import puppeteer from 'puppeteer';
import chromium from '@sparticuz/chromium';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { Contract, UserSettings, Invoice } from '@shared/schema';

function getLogoBase64(): string {
  try {
    const logoPath = join(process.cwd(), 'server/public/musobuddy-logo-purple.png');
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
  console.log('Starting contract PDF generation for:', contract.contractNumber);
  
  let browser;
  try {
    // Use Sparticuz Chromium for better production compatibility
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
    
    const page = await browser.newPage();
    const html = generateContractHTML(contract, userSettings, signatureDetails);
    
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    
    console.log('Contract PDF generated successfully:', pdf.length, 'bytes');
    return Buffer.from(pdf);
  } catch (error) {
    console.error('Error generating contract PDF:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export async function generateInvoicePDF(
  invoice: Invoice,
  contract: Contract | null,
  userSettings: UserSettings | null
): Promise<Buffer> {
  console.log('Starting invoice PDF generation for:', invoice.invoiceNumber);
  
  let browser;
  try {
    // Use Sparticuz Chromium for better production compatibility
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
    
    const page = await browser.newPage();
    const html = generateInvoiceHTML(invoice, contract, userSettings);
    
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    
    console.log('Invoice PDF generated successfully:', pdf.length, 'bytes');
    return Buffer.from(pdf);
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
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
  const logoBase64 = getLogoBase64();
  const logoHtml = logoBase64 ? `<img src="data:image/png;base64,${logoBase64}" style="height: 40px; width: auto;" alt="Logo" />` : '';
  
  const formatDate = (date: any) => {
    if (!date) return 'Date TBC';
    return new Date(date).toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  const signatureSection = signatureDetails ? `
    <div class="signature-section">
      <h3>Contract Signed</h3>
      <p><strong>Signed by:</strong> ${signatureDetails.signatureName || 'Client'}</p>
      <p><strong>Date signed:</strong> ${formatDate(signatureDetails.signedAt)}</p>
      ${signatureDetails.clientIpAddress ? `<p><strong>IP Address:</strong> ${signatureDetails.clientIpAddress}</p>` : ''}
    </div>
  ` : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Contract ${contract.contractNumber}</title>
      <style>
        @page { margin: 40px; size: A4; }
        body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.4; color: #333; margin: 0; padding: 0; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #9333ea; padding-bottom: 20px; }
        .title { font-size: 24px; font-weight: bold; color: #222; margin: 15px 0; }
        .section { margin: 25px 0; }
        .section-title { font-size: 16px; font-weight: bold; color: #222; margin-bottom: 15px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
        .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin: 20px 0; }
        .detail-item { margin-bottom: 10px; }
        .detail-label { font-weight: bold; color: #555; }
        .terms { margin: 20px 0; }
        .terms ul { margin: 10px 0; padding-left: 20px; }
        .signature-section { margin-top: 30px; padding: 15px; background: #f9f9f9; border: 1px solid #ddd; }
        .fee-highlight { background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #3b82f6; }
      </style>
    </head>
    <body>
      <div class="header">
        ${logoHtml}
        <div class="title">Performance Contract</div>
        <div>${contract.contractNumber}</div>
      </div>

      <div class="details-grid">
        <div>
          <div class="section-title">Client Details</div>
          <div class="detail-item">
            <span class="detail-label">Name:</span> ${contract.clientName}
          </div>
          <div class="detail-item">
            <span class="detail-label">Email:</span> ${contract.clientEmail}
          </div>
          <div class="detail-item">
            <span class="detail-label">Phone:</span> ${contract.clientPhone || 'Not provided'}
          </div>
          <div class="detail-item">
            <span class="detail-label">Address:</span> ${contract.clientAddress || 'Not provided'}
          </div>
        </div>
        
        <div>
          <div class="section-title">Performance Details</div>
          <div class="detail-item">
            <span class="detail-label">Date:</span> ${formatDate(contract.eventDate)}
          </div>
          <div class="detail-item">
            <span class="detail-label">Time:</span> ${contract.eventTime || 'TBC'}
          </div>
          <div class="detail-item">
            <span class="detail-label">End Time:</span> ${contract.eventEndTime || 'TBC'}
          </div>
          <div class="detail-item">
            <span class="detail-label">Venue:</span> ${contract.venue}
          </div>
          <div class="detail-item">
            <span class="detail-label">Address:</span> ${contract.venueAddress || 'Not provided'}
          </div>
        </div>
      </div>

      <div class="fee-highlight">
        <div class="detail-item">
          <span class="detail-label">Performance Fee:</span> £${contract.fee}
        </div>
      </div>

      <div class="section">
        <div class="section-title">Equipment & Requirements</div>
        <p>${contract.equipmentRequirements || 'Standard setup'}</p>
        ${contract.specialRequirements ? `<p><strong>Special Requirements:</strong> ${contract.specialRequirements}</p>` : ''}
      </div>

      <div class="section">
        <div class="section-title">Terms and Conditions</div>
        <div class="terms">
          <h4>Payment Terms</h4>
          <ul>
            <li>A deposit of 50% is required to secure the booking</li>
            <li>The remaining balance is due on the performance date</li>
            <li>Payment can be made by bank transfer or cash</li>
          </ul>
          
          <h4>Cancellation Policy</h4>
          <ul>
            <li>More than 30 days: Full refund of deposit</li>
            <li>15-30 days: 50% of deposit refunded</li>
            <li>Less than 15 days: No refund</li>
            <li>Same day cancellation: Full fee due</li>
          </ul>
          
          <h4>Performance Conditions</h4>
          <ul>
            <li>Suitable power supply and weather protection must be provided</li>
            <li>Access for loading equipment must be available</li>
            <li>The performer reserves the right to substitute similar repertoire if required</li>
          </ul>
        </div>
      </div>

      ${signatureSection}

      <div style="margin-top: 40px; text-align: center; font-size: 11px; color: #666;">
        This contract is governed by the laws of England and Wales
      </div>
    </body>
    </html>
  `;
}

function generateInvoiceHTML(
  invoice: Invoice,
  contract: Contract | null,
  userSettings: UserSettings | null
): string {
  const businessName = userSettings?.businessName || 'MusoBuddy';
  const logoBase64 = getLogoBase64();
  const logoHtml = logoBase64 ? `<img src="data:image/png;base64,${logoBase64}" style="height: 40px; width: auto;" alt="Logo" />` : '';

  const formatDate = (date: any) => {
    if (!date) return 'Date TBC';
    return new Date(date).toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Invoice ${invoice.invoiceNumber}</title>
      <style>
        @page { margin: 40px; size: A4; }
        body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.4; color: #333; margin: 0; padding: 0; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; border-bottom: 3px solid #9333ea; padding-bottom: 20px; }
        .logo-section { display: flex; align-items: center; gap: 12px; }
        .invoice-details { text-align: right; }
        .invoice-number { font-size: 24px; font-weight: bold; color: #9333ea; }
        .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin: 20px 0; }
        .detail-item { margin-bottom: 10px; }
        .detail-label { font-weight: bold; color: #555; }
        .amount-section { background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6; }
        .total-amount { font-size: 24px; font-weight: bold; color: #1e40af; }
        .payment-info { background: #fef7e0; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo-section">
          ${logoHtml}
          <div>
            <div style="font-size: 20px; font-weight: bold; color: #9333ea;">${businessName}</div>
          </div>
        </div>
        <div class="invoice-details">
          <div class="invoice-number">INVOICE</div>
          <div>${invoice.invoiceNumber}</div>
          <div>Date: ${formatDate(invoice.dateIssued)}</div>
          ${invoice.dateDue ? `<div>Due: ${formatDate(invoice.dateDue)}</div>` : ''}
        </div>
      </div>

      <div class="details-grid">
        <div>
          <h3>Bill To:</h3>
          <div class="detail-item">${invoice.clientName}</div>
          <div class="detail-item">${invoice.clientEmail}</div>
          ${invoice.clientPhone ? `<div class="detail-item">${invoice.clientPhone}</div>` : ''}
          ${invoice.clientAddress ? `<div class="detail-item">${invoice.clientAddress}</div>` : ''}
        </div>
        
        <div>
          <h3>Service Details:</h3>
          ${contract ? `
            <div class="detail-item"><strong>Event:</strong> ${contract.venue}</div>
            <div class="detail-item"><strong>Date:</strong> ${formatDate(contract.eventDate)}</div>
            <div class="detail-item"><strong>Time:</strong> ${contract.eventTime || 'TBC'}</div>
          ` : ''}
          <div class="detail-item"><strong>Description:</strong> ${invoice.description || 'Performance services'}</div>
        </div>
      </div>

      <div class="amount-section">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 16px; font-weight: bold;">Amount Due:</div>
            <div style="color: #6b7280;">Performance Fee</div>
          </div>
          <div class="total-amount">£${invoice.amount}</div>
        </div>
      </div>

      <div class="payment-info">
        <h3 style="margin-top: 0; color: #92400e;">Payment Information</h3>
        <p>Please make payment by bank transfer to the following account:</p>
        <div style="margin: 10px 0;">
          <div><strong>Account Name:</strong> ${userSettings?.businessName || businessName}</div>
          <div><strong>Sort Code:</strong> ${userSettings?.bankSortCode || '12-34-56'}</div>
          <div><strong>Account Number:</strong> ${userSettings?.bankAccountNumber || '12345678'}</div>
          <div><strong>Reference:</strong> ${invoice.invoiceNumber}</div>
        </div>
      </div>

      <div style="margin-top: 40px; text-align: center; font-size: 11px; color: #666;">
        Thank you for your business
      </div>
    </body>
    </html>
  `;
}