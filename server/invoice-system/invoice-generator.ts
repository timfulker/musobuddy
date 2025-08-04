// ⚠️  COMPLETELY ISOLATED INVOICE SYSTEM ⚠️
// This file is 100% self-contained with NO dependencies on any other system
// Last Updated: August 4, 2025
// DO NOT IMPORT ANYTHING FROM CONTRACT SYSTEM

import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
import { join } from 'path';

// ISOLATED TYPE DEFINITIONS - NO SHARED SCHEMA IMPORTS
export interface IsolatedInvoice {
  id?: number;
  invoiceNumber: string;
  clientName: string;
  clientEmail?: string;
  clientAddress?: string;
  amount: string;
  performanceFee?: string;
  depositPaid?: string;
  performanceDate: string;
  dueDate: string;
  venueAddress?: string;
  createdAt?: string;
  status?: string;
  userId: number;
}

export interface IsolatedUserSettings {
  businessName?: string;
  primaryInstrument?: string;
  phone?: string;
  email?: string;
  website?: string;
  addressLine1?: string;
  city?: string;
  county?: string;
  postcode?: string;
  taxNumber?: string;
  bankDetails?: string;
  accountNumber?: string;
  sortCode?: string;
  bankName?: string;
}

function getLogoBase64(): string {
  try {
    const logoPath = join(process.cwd(), 'client/public/musobuddy-logo-midnight-blue.png');
    const logoBuffer = readFileSync(logoPath);
    return logoBuffer.toString('base64');
  } catch (error) {
    console.error('Error loading logo:', error);
    return '';
  }
}

export async function generateInvoicePDF(
  invoice: IsolatedInvoice,
  userSettings: IsolatedUserSettings | null
): Promise<Buffer> {
  console.log('🚀 ISOLATED INVOICE: Starting PDF generation for:', invoice.invoiceNumber);
  
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  try {
    const page = await browser.newPage();
    const html = generateInvoiceHTML(invoice, userSettings);
    
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    const pdf = await page.pdf({ 
      format: 'A4', 
      printBackground: true,
      margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' }
    });
    
    console.log('✅ ISOLATED INVOICE: PDF generated successfully:', pdf.length, 'bytes');
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

function generateInvoiceHTML(
  invoice: IsolatedInvoice,
  userSettings: IsolatedUserSettings | null
): string {
  const logoBase64 = getLogoBase64();
  const logoHtml = logoBase64 ? 
    `<img src="data:image/png;base64,${logoBase64}" alt="MusoBuddy Logo" style="height: 120px;">` : 
    `<div style="width: 120px; height: 40px; background: #1e3a8a; border-radius: 8px; display: inline-block;"></div>`;

  const businessName = userSettings?.businessName || 'MusoBuddy';
  
  // Build business address with proper line breaks
  const addressParts = [
    userSettings?.addressLine1,
    userSettings?.city,
    userSettings?.county,
    userSettings?.postcode
  ].filter(Boolean);
  const businessAddress = addressParts.length > 0 ? addressParts.join('<br>') : '';
  
  const businessPhone = userSettings?.phone || '';
  const businessEmail = userSettings?.email || '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Invoice ${invoice.invoiceNumber}</title>
      <style>
        /* ISOLATED INVOICE STYLING - LOCKED FOR RELIABILITY */
        body {
          font-family: 'Arial', sans-serif;
          margin: 0;
          padding: 20px;
          color: #333;
          background: #fff;
          font-size: 13px;
          line-height: 1.4;
        }
        
        .invoice-container {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          border-radius: 8px;
          overflow: hidden;
        }
        
        .invoice-header {
          background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
          color: white;
          padding: 30px;
          position: relative;
        }
        
        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 40px;
        }
        
        .logo-section {
          flex: 1;
        }
        
        .invoice-title {
          flex: 1;
          text-align: right;
        }
        
        .invoice-title h1 {
          font-size: 36px;
          margin: 0 0 10px 0;
          font-weight: 700;
          letter-spacing: 2px;
        }
        
        .invoice-number {
          font-size: 18px;
          opacity: 0.9;
          margin: 0;
        }
        
        .invoice-body {
          padding: 40px;
        }
        
        .invoice-details {
          display: flex;
          justify-content: space-between;
          margin-bottom: 40px;
          gap: 40px;
        }
        
        .detail-section {
          flex: 1;
        }
        
        .detail-section h3 {
          color: #1e3a8a;
          font-size: 16px;
          margin-bottom: 15px;
          font-weight: 600;
          border-bottom: 2px solid #1e3a8a;
          padding-bottom: 5px;
        }
        
        .detail-content p {
          margin: 8px 0;
          line-height: 1.6;
        }
        
        .performance-table {
          width: 100%;
          border-collapse: collapse;
          margin: 5px 0;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        
        .performance-table th {
          background: #1e3a8a;
          color: white;
          padding: 15px;
          text-align: left;
          font-weight: 600;
        }
        
        .performance-table td {
          padding: 15px;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .performance-table tr:last-child td {
          border-bottom: none;
        }
        
        .performance-table tr:nth-child(even) {
          background: #f8fafc;
        }
        
        .amount-highlight {
          background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
          border: 2px solid #1e3a8a;
          border-radius: 8px;
          padding: 25px;
          text-align: center;
          margin: 5px 0 15px 0;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          page-break-before: avoid !important;
          break-before: avoid !important;
        }
        
        .amount-highlight .amount {
          font-size: 36px;
          font-weight: 700;
          color: #1e3a8a;
          margin: 0;
        }
        
        .amount-highlight .label {
          font-size: 14px;
          color: #64748b;
          margin: 5px 0 0 0;
        }
        
        .payment-terms {
          background: #f8fafc;
          border-left: 4px solid #1e3a8a;
          padding: 20px;
          margin: 20px 0;
          border-radius: 0 8px 8px 0;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        
        .payment-terms h4 {
          color: #1e3a8a;
          margin-top: 0;
          margin-bottom: 15px;
          font-size: 16px;
        }
        
        .bank-details {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        
        .bank-details h4 {
          color: #1e3a8a;
          margin-top: 0;
          margin-bottom: 15px;
          font-size: 16px;
        }
        
        .bank-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }
        
        .bank-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #f1f5f9;
        }
        
        .bank-item:last-child {
          border-bottom: none;
        }
        
        .bank-label {
          font-weight: 600;
          color: #475569;
        }
        
        .bank-value {
          color: #1e3a8a;
          font-weight: 600;
        }
        
        .invoice-footer {
          background: #f8fafc;
          padding: 30px;
          text-align: center;
          border-top: 2px solid #e5e7eb;
          page-break-before: avoid;
          break-before: avoid;
        }
        
        .footer-content {
          color: #64748b;
          font-size: 12px;
          line-height: 1.6;
        }
        
        .footer-brand {
          color: #1e3a8a;
          font-weight: 700;
          font-size: 16px;
          margin-bottom: 5px;
        }
        
        /* CRITICAL: Keep table and totals together */
        .table-totals-group {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        
        /* Page break controls for printing */
        @media print {
          body { margin: 0; -webkit-print-color-adjust: exact; color-adjust: exact; }
          .invoice-container { box-shadow: none; }
          .invoice-header { background: #1e3a8a !important; }
          .performance-table th { background: #1e3a8a !important; }
          .amount-highlight { background: #f1f5f9 !important; }
          .table-totals-group { page-break-inside: avoid !important; break-inside: avoid !important; }
          .performance-table { page-break-inside: avoid !important; break-inside: avoid !important; }
          .amount-highlight { page-break-inside: avoid !important; break-inside: avoid !important; page-break-before: avoid !important; break-before: avoid !important; }
          .payment-terms { page-break-inside: avoid !important; break-inside: avoid !important; }
          .bank-details { page-break-inside: avoid !important; break-inside: avoid !important; }
          .invoice-footer { page-break-before: avoid !important; break-before: avoid !important; }
        }
        
        @media (max-width: 700px) {
          .header-content, .invoice-details { flex-direction: column; gap: 20px; }
          .bank-grid { grid-template-columns: 1fr; }
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <!-- Header -->
        <div class="invoice-header">
          <div class="header-content">
            <div class="logo-section">
              ${logoHtml}
              <div style="margin-top: 15px;">
                <div style="font-size: 20px; font-weight: 600;">${businessName}</div>
                ${businessAddress ? `<div style="margin-top: 8px; opacity: 0.9;">${businessAddress}</div>` : ''}
                ${businessPhone ? `<div style="margin-top: 5px; opacity: 0.9;">Phone: ${businessPhone}</div>` : ''}
                ${businessEmail ? `<div style="margin-top: 5px; opacity: 0.9;">Email: ${businessEmail}</div>` : ''}
                ${userSettings?.website ? `<div style="margin-top: 5px; opacity: 0.9;">Website: ${userSettings.website}</div>` : ''}
              </div>
            </div>
            <div class="invoice-title">
              <h1>INVOICE</h1>
              <p class="invoice-number">${invoice.invoiceNumber}</p>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Date: ${new Date(invoice.createdAt || new Date()).toLocaleDateString('en-GB')}</p>
              <p style="margin: 5px 0 0 0; opacity: 0.9;">Due: ${new Date(invoice.dueDate).toLocaleDateString('en-GB')}</p>
            </div>
          </div>
        </div>

        <!-- Body -->
        <div class="invoice-body">
          <!-- Invoice Details -->
          <div class="invoice-details">
            <div class="detail-section">
              <h3>Bill To:</h3>
              <div class="detail-content">
                <p><strong>${invoice.clientName}</strong></p>
                ${invoice.clientEmail ? `<p>Email: ${invoice.clientEmail}</p>` : ''}
                ${invoice.clientAddress ? `<p>${invoice.clientAddress}</p>` : ''}
              </div>
            </div>
            <div class="detail-section">
              <h3>Performance Details:</h3>
              <div class="detail-content">
                <p><strong>Date:</strong> ${new Date(invoice.performanceDate).toLocaleDateString('en-GB', {
                  weekday: 'long',
                  day: 'numeric', 
                  month: 'long',
                  year: 'numeric'
                })}</p>
                ${invoice.venueAddress ? `<p><strong>Venue:</strong> ${invoice.venueAddress}</p>` : ''}
                <p><strong>Performance Type:</strong> ${userSettings?.primaryInstrument ? `${userSettings.primaryInstrument} Performance` : 'Live Music Performance'}</p>
              </div>
            </div>
          </div>

          <!-- CRITICAL: Table and totals must stay together -->
          <div class="table-totals-group">
            <!-- Performance Table -->
            <table class="performance-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th style="text-align: center;">Quantity</th>
                  <th style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>Live Music Performance</strong><br>
                    <span style="color: #64748b; font-size: 12px;">
                      ${userSettings?.primaryInstrument ? `${userSettings.primaryInstrument} performance` : 'Professional music performance'} 
                      on ${new Date(invoice.performanceDate).toLocaleDateString('en-GB')}
                      ${invoice.venueAddress ? ` at ${invoice.venueAddress}` : ''}
                    </span>
                  </td>
                  <td style="text-align: center;">1</td>
                  <td style="text-align: right; font-weight: 600;">£${parseFloat(invoice.performanceFee || invoice.amount).toFixed(2)}</td>
                </tr>
                ${invoice.depositPaid && parseFloat(invoice.depositPaid) > 0 ? `
                  <tr>
                    <td>
                      <strong>Deposit Paid</strong><br>
                      <span style="color: #64748b; font-size: 12px;">Advance payment received</span>
                    </td>
                    <td style="text-align: center;">1</td>
                    <td style="text-align: right; font-weight: 600; color: #059669;">-£${parseFloat(invoice.depositPaid).toFixed(2)}</td>
                  </tr>
                ` : ''}
              </tbody>
            </table>

            <!-- Amount Highlight -->
            <div class="amount-highlight">
              <p class="amount">£${parseFloat(invoice.amount).toFixed(2)}</p>
              <p class="label">Total Amount Due</p>
            </div>
          </div>

          <!-- Payment Terms -->
          <div class="payment-terms">
            <h4>Payment Terms & Information</h4>
            <p><strong>Payment Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString('en-GB')}</p>
            <p><strong>Payment Methods:</strong> Bank transfer (preferred) or cash payment</p>
            <p><strong>Late Payment:</strong> Overdue invoices may incur a £25 administration fee plus 2% monthly interest</p>
            ${userSettings?.taxNumber ? `<p><strong>VAT Status:</strong> ${userSettings.taxNumber.includes('VAT') ? 'VAT Registered' : 'VAT Number'}: ${userSettings.taxNumber}</p>` : ''}
          </div>

          <!-- Bank Details -->
          ${userSettings?.bankDetails || userSettings?.sortCode || userSettings?.accountNumber ? `
            <div class="bank-details">
              <h4>Bank Transfer Details</h4>
              <div class="bank-grid">
                ${userSettings?.accountNumber ? `
                  <div class="bank-item">
                    <span class="bank-label">Account Number:</span>
                    <span class="bank-value">${userSettings.accountNumber}</span>
                  </div>
                ` : ''}
                ${userSettings?.sortCode ? `
                  <div class="bank-item">
                    <span class="bank-label">Sort Code:</span>
                    <span class="bank-value">${userSettings.sortCode}</span>
                  </div>
                ` : ''}
                ${userSettings?.bankName ? `
                  <div class="bank-item">
                    <span class="bank-label">Bank Name:</span>
                    <span class="bank-value">${userSettings.bankName}</span>
                  </div>
                ` : ''}
                <div class="bank-item">
                  <span class="bank-label">Account Name:</span>
                  <span class="bank-value">${businessName}</span>
                </div>
              </div>
              ${userSettings?.bankDetails ? `<p style="margin-top: 15px; font-size: 12px; color: #64748b;">${userSettings.bankDetails}</p>` : ''}
            </div>
          ` : ''}
        </div>

        <!-- Footer -->
        <div class="invoice-footer">
          <div class="footer-content">
            <div class="footer-brand">MusoBuddy</div>
            <p>Professional Music Business Management</p>
            <p>Invoice Reference: ${invoice.invoiceNumber} • Generated: ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-GB')}</p>
            ${invoice.id ? `<p>Invoice ID: ${invoice.id}</p>` : ''}
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}