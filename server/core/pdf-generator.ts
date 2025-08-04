import puppeteer from 'puppeteer';
import type { Contract, UserSettings, Invoice } from '../../shared/schema';

function getLogoBase64(): string | null {
  // Return base64 encoded logo if available
  return null;
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
  console.log('🔄 Generating professional contract PDF...');

  try {
    const htmlContent = generateContractHTML(contract, userSettings, signatureDetails);

    const browser = await puppeteer.launch({
      headless: true,
      executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-extensions',
        '--no-first-run'
      ]
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      }
    });

    await browser.close();
    console.log('✅ PDF generated successfully');
    return pdfBuffer;

  } catch (error) {
    console.error('❌ PDF generation failed:', error);
    throw new Error(`PDF generation failed: ${error.message}`);
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
  // Professional contract template created by external AI with complete MusoBuddy branding
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MusoBuddy Performance Contract</title>
    <style>
        /* Import Google Fonts for professional typography */
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        /* Reset and base styles */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', Arial, sans-serif;
            line-height: 1.6;
            color: #1e293b;
            background: #ffffff;
            font-size: 12px;
        }

        .container {
            max-width: 210mm;
            margin: 0 auto;
            padding: 20mm 15mm;
            background: white;
            min-height: 297mm;
            line-height: 1.4;
        }

        /* Header Section */
        .header {
            background: linear-gradient(135deg, #9333ea 0%, #7c3aed 100%);
            color: white;
            padding: 25px 30px;
            margin: -20mm -15mm 30px -15mm;
            text-align: center;
            border-radius: 0;
        }

        .header h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
            letter-spacing: 1px;
        }

        .header .subtitle {
            font-size: 14px;
            opacity: 0.9;
            font-weight: 400;
        }

        /* Section Headers */
        .section-header {
            background: #2563eb;
            color: white;
            padding: 12px 20px;
            margin: 25px 0 15px 0;
            font-size: 16px;
            font-weight: 600;
            border-radius: 6px;
        }

        /* Two Column Layout */
        .two-column {
            display: flex;
            gap: 30px;
            margin-bottom: 25px;
        }

        .column {
            flex: 1;
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #9333ea;
        }

        .column h3 {
            color: #9333ea;
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .column p {
            margin-bottom: 6px;
            font-size: 13px;
        }

        .column strong {
            color: #1e293b;
            font-weight: 600;
        }

        /* Event Details Table */
        .event-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .event-table th {
            background: #2563eb;
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: 600;
            font-size: 13px;
        }

        .event-table td {
            padding: 15px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 13px;
        }

        .event-table tr:last-child td {
            border-bottom: none;
        }

        .event-table .label {
            font-weight: 600;
            color: #475569;
            width: 30%;
        }

        /* Fee Highlight */
        .fee-highlight {
            background: linear-gradient(135deg, #059669 0%, #047857 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            margin: 25px 0;
            box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
        }

        .fee-highlight .amount {
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 5px;
        }

        .fee-highlight .label {
            font-size: 14px;
            opacity: 0.9;
        }

        /* Terms Section */
        .terms-section {
            background: #f1f5f9;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #2563eb;
        }

        .terms-section h4 {
            color: #2563eb;
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 12px;
            text-transform: uppercase;
        }

        .terms-section p, .terms-section ul {
            font-size: 11px;
            line-height: 1.4;
            margin-bottom: 8px;
            color: #475569;
        }

        .terms-section ul {
            padding-left: 20px;
        }

        .terms-section li {
            margin-bottom: 5px;
        }

        /* Signature Section */
        .signature-section {
            margin-top: 40px;
            display: flex;
            gap: 40px;
        }

        .signature-box {
            flex: 1;
            border: 2px solid #9333ea;
            border-radius: 8px;
            padding: 25px;
            text-align: center;
            background: #fefefe;
            min-height: 120px;
            position: relative;
        }

        .signature-box h4 {
            color: #9333ea;
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 15px;
        }

        .signature-line {
            border-bottom: 2px solid #9333ea;
            margin: 20px 0 10px 0;
            height: 40px;
        }

        .signature-box .date-line {
            font-size: 11px;
            color: #64748b;
            margin-top: 10px;
        }

        .signed-indicator {
            background: #059669;
            color: white;
            padding: 8px 15px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 600;
            display: inline-block;
            margin-top: 10px;
        }

        /* Footer */
        .footer {
            background: linear-gradient(135deg, #9333ea 0%, #7c3aed 100%);
            color: white;
            padding: 20px 30px;
            margin: 40px -15mm -20mm -15mm;
            text-align: center;
            font-size: 11px;
        }

        .footer .brand {
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 5px;
        }

        .footer .tagline {
            opacity: 0.8;
            margin-bottom: 10px;
        }

        .footer .contract-ref {
            font-size: 10px;
            opacity: 0.7;
        }

        /* Print Styles - Enhanced for proper page breaks */
        @media print {
            body {
                margin: 0;
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
            }

            .container {
                margin: 0;
                padding: 20mm 15mm;
                max-width: none;
            }

            .header, .footer {
                background: linear-gradient(135deg, #9333ea 0%, #7c3aed 100%) !important;
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
            }

            .section-header {
                background: #2563eb !important;
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
                page-break-after: avoid;
                page-break-inside: avoid;
            }

            .fee-highlight {
                background: linear-gradient(135deg, #059669 0%, #047857 100%) !important;
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
                page-break-inside: avoid;
                page-break-after: avoid;
            }

            .event-table {
                page-break-inside: avoid;
                page-break-after: avoid;
            }

            .event-table th {
                background: #2563eb !important;
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
            }

            .two-column {
                page-break-inside: avoid;
                page-break-after: avoid;
            }

            .terms-section {
                page-break-inside: avoid;
                margin-bottom: 15px;
            }

            .terms-section:last-of-type {
                page-break-after: avoid;
            }

            .signature-section {
                page-break-inside: avoid;
                page-break-before: auto;
                margin-top: 20px;
            }

            .footer {
                page-break-inside: avoid;
            }

            /* Ensure sections don't split awkwardly */
            .section-header + .terms-section {
                page-break-before: avoid;
            }

            .section-header + .event-table {
                page-break-before: avoid;
            }

            .section-header + .two-column {
                page-break-before: avoid;
            }

            .section-header + .fee-highlight {
                page-break-before: avoid;
            }
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
            .two-column {
                flex-direction: column;
                gap: 20px;
            }

            .signature-section {
                flex-direction: column;
                gap: 20px;
            }

            .container {
                padding: 15px;
            }

            .header, .footer {
                margin-left: -15px;
                margin-right: -15px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header Section -->
        <div class="header">
            <h1>PERFORMANCE CONTRACT</h1>
            <div class="subtitle">Contract #${contract.contractNumber || 'DRAFT'} • Generated ${new Date().toLocaleDateString('en-GB')}</div>
        </div>

        <!-- Parties Section -->
        <div class="two-column">
            <div class="column">
                <h3>Performer Details</h3>
                <p><strong>${userSettings?.businessName || 'Professional Musician'}</strong></p>
                ${userSettings?.businessEmail ? `<p>Email: ${userSettings.businessEmail}</p>` : ''}
                ${userSettings?.phone ? `<p>Phone: ${userSettings.phone}</p>` : ''}
                ${(() => {
                    if (!userSettings) return '';
                    const addressParts = [
                        userSettings.addressLine1,
                        userSettings.addressLine2,
                        userSettings.city,
                        userSettings.county,
                        userSettings.postcode
                    ].filter(Boolean);
                    return addressParts.length > 0 ? `<p>Address: ${addressParts.join(', ')}</p>` : '';
                })()}
                ${userSettings?.website ? `<p>Website: ${userSettings.website}</p>` : ''}
                ${userSettings?.taxNumber ? `<p>VAT/Tax No: ${userSettings.taxNumber}</p>` : ''}
            </div>

            <div class="column">
                <h3>Client Details</h3>
                <p><strong>${contract.clientName}</strong></p>
                ${contract.clientEmail ? `<p>Email: ${contract.clientEmail}</p>` : ''}
                ${contract.clientPhone ? `<p>Phone: ${contract.clientPhone}</p>` : ''}
                ${contract.clientAddress ? `<p>Address: ${contract.clientAddress}</p>` : ''}
            </div>
        </div>

        <!-- Event Details Section -->
        <div class="section-header">Event Details</div>

        <table class="event-table">
            <tr>
                <td class="label">Event Date:</td>
                <td><strong>${contract.eventDate ? new Date(contract.eventDate).toLocaleDateString('en-GB', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                }) : 'To be confirmed'}</strong></td>
            </tr>
            <tr>
                <td class="label">Event Time:</td>
                <td>${contract.eventTime || 'TBC'} - ${contract.eventEndTime || 'TBC'}</td>
            </tr>
            <tr>
                <td class="label">Venue:</td>
                <td><strong>${contract.venue || 'To be confirmed'}</strong></td>
            </tr>
            <tr>
                <td class="label">Venue Address:</td>
                <td>${contract.venueAddress || 'To be confirmed'}</td>
            </tr>
            <tr>
                <td class="label">Performance Type:</td>
                <td>${userSettings?.primaryInstrument ? `${userSettings.primaryInstrument} Performance` : 'Live Music Performance'}</td>
            </tr>
        </table>

        <!-- Fee Highlight -->
        <div class="fee-highlight">
            <div class="amount">£${contract.fee || '0.00'}</div>
            <div class="label">Total Performance Fee</div>
            ${contract.deposit && parseFloat(contract.deposit) > 0 ? `<div style="margin-top: 10px; font-size: 12px;">Deposit Required: £${contract.deposit}</div>` : ''}
        </div>

        <!-- Equipment & Special Requirements -->
        ${(contract.equipmentRequirements || contract.specialRequirements) ? `
        <div class="section-header">Requirements & Specifications</div>
        <div class="terms-section">
            ${contract.equipmentRequirements ? `
            <h4>Equipment Requirements</h4>
            <p>${contract.equipmentRequirements}</p>
            ` : ''}
            ${contract.specialRequirements ? `
            <h4>Special Requirements</h4>
            <p>${contract.specialRequirements}</p>
            ` : ''}
        </div>
        ` : ''}

        <!-- Terms & Conditions -->
        <div class="section-header">Terms & Conditions</div>

        <div class="terms-section">
            <h4>Payment Terms</h4>
            <p>${contract.paymentInstructions || 'Payment is due within 30 days of the performance date unless otherwise agreed in writing. Payment can be made by bank transfer, cheque, or cash.'}</p>
            ${userSettings?.bankDetails ? `<p><strong>Payment Details:</strong> ${userSettings.bankDetails}</p>` : ''}
        </div>

        <div class="terms-section">
            <h4>Cancellation Policy</h4>
            <ul>
                <li><strong>More than 4 weeks notice:</strong> Full refund of any deposit paid</li>
                <li><strong>2-4 weeks notice:</strong> 50% of total fee payable</li>
                <li><strong>Less than 2 weeks notice:</strong> Full fee payable</li>
                <li><strong>Same day cancellation:</strong> Full fee plus additional costs incurred</li>
            </ul>
        </div>

        <div class="terms-section">
            <h4>Performance Standards</h4>
            <ul>
                <li>Professional entertainment will be provided for the agreed duration</li>
                <li>Appropriate attire will be worn suitable for the event</li>
                <li>All equipment will be PAT tested and public liability insurance is held</li>
                <li>Performance will commence promptly at the agreed time</li>
            </ul>
        </div>

        <div class="terms-section">
            <h4>Force Majeure</h4>
            <p>Neither party shall be liable for any failure to perform due to circumstances beyond their reasonable control, including but not limited to acts of God, government restrictions, pandemic measures, extreme weather, or venue closure.</p>
        </div>

        <div class="terms-section">
            <h4>Additional Terms</h4>
            <ul>
                <li>This contract constitutes the entire agreement between the parties</li>
                <li>Any modifications must be agreed in writing by both parties</li>
                <li>This contract is governed by the laws of England and Wales</li>
                <li>Both parties confirm they have the authority to enter into this agreement</li>
            </ul>
            ${userSettings?.defaultTerms ? `<p><strong>Additional Terms:</strong> ${userSettings.defaultTerms}</p>` : ''}
        </div>

        <!-- Signature Section -->
        <div class="signature-section">
            <div class="signature-box">
                <h4>Client Signature</h4>
                <div class="signature-line"></div>
                <p><strong>${contract.clientName}</strong></p>
                <div class="date-line">Date: ________________</div>
                ${signatureDetails?.signedAt && signatureDetails?.signatureName ? `
                <div class="signed-indicator">
                    ✓ Signed on ${new Date(signatureDetails.signedAt).toLocaleDateString('en-GB')}
                </div>
                ` : ''}
            </div>

            <div class="signature-box">
                <h4>Performer Signature</h4>
                <div class="signature-line"></div>
                <p><strong>${userSettings?.businessName || 'Performer'}</strong></p>
                <div class="date-line">Date: ________________</div>
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <div class="brand">MusoBuddy</div>
            <div class="tagline">Professional Music Business Management</div>
            <div class="contract-ref">
                Contract Reference: ${contract.contractNumber || 'DRAFT'} • 
                Generated: ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-GB')}
                ${contract.id ? ` • ID: ${contract.id}` : ''}
            </div>
        </div>
    </div>
</body>
</html>`;
}

export async function generateInvoicePDF(
  invoice: Invoice,
  userSettings: UserSettings | null
): Promise<Buffer> {
  console.log('🔄 Generating professional invoice PDF...');

  try {
    const htmlContent = generateInvoiceHTML(invoice, userSettings);

    const browser = await puppeteer.launch({
      headless: true,
      executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-extensions',
        '--no-first-run'
      ]
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      }
    });

    await browser.close();
    console.log('✅ Invoice PDF generated successfully');
    return pdfBuffer;

  } catch (error) {
    console.error('❌ Invoice PDF generation failed:', error);
    throw new Error(`Invoice PDF generation failed: ${error.message}`);
  }
}

function generateInvoiceHTML(
  invoice: Invoice,
  userSettings: UserSettings | null
): string {
  const businessName = userSettings?.businessName || 'Professional Musician';
  const businessEmail = userSettings?.businessEmail || '';
  const businessAddress = userSettings?.businessAddress || '';
  const businessPhone = userSettings?.phone || '';

  const logoBase64 = getLogoBase64();
  const logoHtml = logoBase64 ? 
    `<img src="data:image/png;base64,${logoBase64}" alt="MusoBuddy Logo" style="height: 40px; margin-bottom: 10px;">` : 
    '<div style="color: #9333ea; font-weight: bold; font-size: 24px; margin-bottom: 10px;">MusoBuddy</div>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
    /* ... continue with existing invoice styles ... */
  </style>
</head>
<body>
  <!-- Invoice content continues with existing template -->
</body>
</html>`;
}