// ⚠️  PROTECTED FILE - INVOICE PDF GENERATOR - DO NOT MODIFY ⚠️
// This file generates professional invoices with optimized CSS and secure R2 storage
// BACKUP LOCATION: server/core/invoice-pdf-generator.backup.ts
// LAST STABLE VERSION: August 4, 2025 - 120px logo, midnight blue theme
// ⚠️  Changes to this file could break invoice generation system ⚠️

import puppeteer from 'puppeteer';
import chromium from '@sparticuz/chromium';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { Invoice, UserSettings, Booking } from '@shared/schema';
import { storage } from './storage';
import { aiPDFOptimizer } from './ai-pdf-optimizer';

// Helper function to generate configurable invoice terms
function generateInvoiceTerms(userSettings: UserSettings | null, businessContactEmail: string): string {
  console.log('🔍 GENERATING INVOICE TERMS - UserSettings:', JSON.stringify({
    hasInvoiceClauses: !!userSettings?.invoiceClauses,
    invoiceClauses: userSettings?.invoiceClauses,
    hasCustomInvoiceClauses: !!(userSettings?.customInvoiceClauses && Array.isArray(userSettings.customInvoiceClauses)),
    customInvoiceClauses: userSettings?.customInvoiceClauses
  }, null, 2));

  const termsList: string[] = [];

  // Standard invoice clauses mapping - expanded set
  const clauseMap = {
    // Legacy clause names (for backward compatibility)
    paymentTerms: "Payment is due as specified above",
    vatStatus: "VAT Status: Not VAT registered - no VAT charged",
    publicLiability: "Public Liability Insurance: Covered for all services",
    latePayment: "Late Payment: Additional charges apply for overdue invoices",
    disputeProcess: "Disputes: Contact within 30 days of invoice date",
    // New expanded invoice clauses
    paymentDue: "Payment Due: Payment required within 14 days of invoice date",
    latePaymentCharge: "Late Payment: Additional 5% charge per week or statutory interest under the Late Payment of Commercial Debts Act",
    depositPolicy: "Deposit Policy: Any deposit already paid is non-refundable and deducted from the final balance",
    cancellation: "Cancellation: Client cancellations within 7 days of the event incur full invoice amount",
    paymentMethods: "Payment Methods: Accepted by bank transfer (details provided), no cash/cheques unless agreed in advance",
    bankDetails: "Bank Details: See payment section for account details",
    expenses: "Expenses: Travel, parking, tolls, and accommodation (if agreed) will be added where applicable",
    ownershipRecordings: "Ownership of Recordings: Any recordings, videos, or photographs taken by the performer remain the property of the performer unless otherwise agreed",
    taxCompliance: "Tax Compliance: This invoice is issued in accordance with HMRC guidelines",
    queries: "Queries: Any disputes or questions about this invoice must be raised within 7 days of issue"
  };

  // Check for invoice clauses (new structure)
  if (userSettings?.invoiceClauses) {
    const clauses = userSettings.invoiceClauses;
    console.log('✅ Using NEW invoiceClauses structure:', clauses);
    
    // Add all selected clauses from the mapping
    for (const [key, value] of Object.entries(clauseMap)) {
      if (clauses[key as keyof typeof clauseMap]) {
        termsList.push(value);
      }
    }
  }
  
  // Add custom invoice clauses - handle new format with {text, enabled} objects
  if (userSettings?.customInvoiceClauses && Array.isArray(userSettings.customInvoiceClauses)) {
    userSettings.customInvoiceClauses.forEach(clause => {
      // Handle new format: {text: string, enabled: boolean}
      if (typeof clause === 'object' && clause.text && clause.enabled) {
        termsList.push(clause.text);
      }
      // Handle legacy format: string
      else if (typeof clause === 'string' && clause.trim() !== '') {
        termsList.push(clause);
      }
    });
    console.log('✅ Using NEW customInvoiceClauses (processed):', termsList);
  }

  // Legacy code removed - only using new clause structure

  console.log('📋 Final terms list:', termsList);

  // If no terms selected, provide a minimal default set
  if (termsList.length === 0) {
    console.log('⚠️ No terms found, using minimal default');
    return `• Payment is due as specified above<br>
            • For queries about this invoice, please contact ${businessContactEmail}`;
  }

  return termsList.map(term => `• ${term}`).join('<br>');
}

// Theme color mapping for PDF generation
function getThemeColor(userSettings: UserSettings | null): string {
  console.log('🎨 INVOICE PDF DEBUG: userSettings received:', {
    hasUserSettings: !!userSettings,
    userId: userSettings?.userId,
    themeAccentColor: userSettings?.themeAccentColor,
    businessName: userSettings?.businessName
  });
  
  // Use user's selected theme accent color if available
  if (userSettings?.themeAccentColor) {
    console.log(`🎨 INVOICE PDF: Using user's theme color: ${userSettings.themeAccentColor}`);
    return userSettings.themeAccentColor;
  }
  
  // Default fallback to purple (original theme)
  console.log('🎨 INVOICE PDF: Using default fallback color: #8b5cf6');
  return '#8b5cf6';
}

// Generate secondary color (darker shade) from primary color
function getSecondaryColor(primaryColor: string): string {
  // Simple approach: if it's a known theme color, use predefined secondary
  const colorMap: Record<string, string> = {
    '#8b5cf6': '#a855f7', // Purple
    '#0ea5e9': '#0284c7', // Ocean Blue
    '#34d399': '#10b981', // Forest Green
    '#f87171': '#9ca3af', // Clean Pro Audio
    '#191970': '#1e3a8a', // Midnight Blue
  };
  
  return colorMap[primaryColor] || primaryColor; // Fallback to same color
}

function getLogoBase64(): string {
  try {
    const logoPath = join(process.cwd(), 'client/public/musobuddy-logo-midnight-blue.png');
    const logoBuffer = readFileSync(logoPath);
    return logoBuffer.toString('base64');
  } catch (error) {
    console.error('Error loading logo:', error);
    // Fallback to empty string if logo not found
    return '';
  }
}


// Helper function to generate dynamic service description based on booking details
function generateServiceDescription(invoice: Invoice, booking: Booking | null, userSettings: UserSettings | null): string {
  // Get gig type from booking - this should indicate what services were actually requested
  const gigType = booking?.gigType || invoice.gigType || booking?.eventType || '';
  
  // Analyze the gig type to determine what services are being provided
  let services: string[] = [];
  
  if (gigType) {
    const gigTypeLower = gigType.toLowerCase();
    
    // Check for specific instrument mentions in the gig type
    if (gigTypeLower.includes('saxophone') || gigTypeLower.includes('sax')) {
      services.push('Saxophone');
    } else if (gigTypeLower.includes('piano')) {
      services.push('Piano');
    } else if (gigTypeLower.includes('guitar')) {
      services.push('Guitar');
    } else if (gigTypeLower.includes('violin')) {
      services.push('Violin');
    } else if (gigTypeLower.includes('trumpet')) {
      services.push('Trumpet');
    } else if (gigTypeLower.includes('vocal') || gigTypeLower.includes('singer') || gigTypeLower.includes('singing')) {
      services.push('Vocal');
    }
    
    // Check for DJ services
    if (gigTypeLower.includes('dj') || gigTypeLower.includes('disco') || gigTypeLower.includes('dance')) {
      services.push('DJ');
    }
    
    // If no specific instruments found, try to infer from general gig types
    if (services.length === 0) {
      if (gigTypeLower.includes('wedding') || gigTypeLower.includes('ceremony') || gigTypeLower.includes('cocktail') || gigTypeLower.includes('background')) {
        // For these types, use primary instrument as default
        const primaryInstrument = userSettings?.primaryInstrument;
        if (primaryInstrument) {
          const instrumentName = primaryInstrument.charAt(0).toUpperCase() + primaryInstrument.slice(1);
          services.push(instrumentName);
        }
      }
    }
  }
  
  // If still no services identified, use primary instrument from settings
  if (services.length === 0 && userSettings?.primaryInstrument) {
    const instrumentName = userSettings.primaryInstrument.charAt(0).toUpperCase() + userSettings.primaryInstrument.slice(1);
    services.push(instrumentName);
  }
  
  // Build the service description
  if (services.length === 0) {
    return 'Live Music Performance';
  } else if (services.length === 1) {
    return `Live ${services[0]} Performance`;
  } else {
    // Multiple services - join with & for the last one
    const lastService = services.pop();
    return `Live ${services.join(', ')} & ${lastService} Performance`;
  }
}

export async function generateInvoicePDF(
  invoice: Invoice,
  userSettings: UserSettings | null
): Promise<Buffer> {
  console.log('🚀 Starting FAST invoice PDF generation for:', invoice.invoiceNumber);
  
  // Fetch booking data if bookingId is available
  let booking: Booking | null = null;
  if (invoice.bookingId) {
    try {
      booking = await storage.getBookingByIdAndUser(invoice.bookingId, invoice.userId);
    } catch (error) {
      console.warn('⚠️ Could not fetch booking data for invoice:', error);
    }
  }
  
  // Deployment-ready Puppeteer configuration
  const browser = await puppeteer.launch({
    args: [
      ...chromium.args,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-extensions'
    ],
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });
  
  try {
    const page = await browser.newPage();
    
    // CSS-OPTIMIZED: Generate HTML with built-in page break controls + AI enhancement
    console.log('📄 Using CSS-optimized invoice template with AI optimization...');
    let html = generateOptimizedInvoiceHTML(invoice, userSettings, booking);
    
    // AI-powered PDF optimization
    try {
      console.log('🤖 Analyzing invoice content for AI optimization...');
      
      // Extract selected clauses for AI analysis
      const selectedClauses: string[] = [];
      const customClauses: string[] = [];
      
      if (userSettings?.invoiceClauses) {
        const clauseMap = {
          paymentTerms: "Payment is due as specified above",
          vatStatus: "VAT Status: Not VAT registered - no VAT charged",
          publicLiability: "Public Liability Insurance: Covered for all services",
          latePayment: "Late Payment: Additional charges apply for overdue invoices",
          disputeProcess: "Disputes: Contact within 30 days of invoice date",
          paymentDue: "Payment Due: Payment required within 14 days of invoice date",
          latePaymentCharge: "Late Payment: Additional 5% charge per week or statutory interest under the Late Payment of Commercial Debts Act",
          depositPolicy: "Deposit Policy: Any deposit already paid is non-refundable and deducted from the final balance",
          cancellation: "Cancellation: Client cancellations within 7 days of the event incur full invoice amount",
          paymentMethods: "Payment Methods: Accepted by bank transfer (details provided), no cash/cheques unless agreed in advance",
          bankDetails: "Bank Details: See payment section for account details",
          expenses: "Expenses: Travel, parking, tolls, and accommodation (if agreed) will be added where applicable",
          ownershipRecordings: "Ownership of Recordings: Any recordings, videos, or photographs taken by the performer remain the property of the performer unless otherwise agreed",
          taxCompliance: "Tax Compliance: This invoice is issued in accordance with HMRC guidelines",
          queries: "Queries: Any disputes or questions about this invoice must be raised within 7 days of issue"
        };
        
        for (const [key, value] of Object.entries(clauseMap)) {
          if (userSettings.invoiceClauses[key as keyof typeof clauseMap]) {
            selectedClauses.push(value);
          }
        }
      }
      
      // Add custom clauses - handle new format with {text, enabled} objects
      if (userSettings?.customInvoiceClauses && Array.isArray(userSettings.customInvoiceClauses)) {
        userSettings.customInvoiceClauses.forEach(clause => {
          // Handle new format: {text: string, enabled: boolean}
          if (typeof clause === 'object' && clause.text && clause.enabled) {
            customClauses.push(clause.text);
          }
          // Handle legacy format: string
          else if (typeof clause === 'string' && clause.trim() !== '') {
            customClauses.push(clause);
          }
        });
      }
      
      // Extract line items
      const items = [];
      if (invoice.description && invoice.amount) {
        items.push({
          description: invoice.description,
          amount: `£${parseFloat(invoice.amount).toFixed(2)}`
        });
      }
      
      const aiOptimization = await aiPDFOptimizer.optimizeInvoiceLayout({
        clientName: invoice.clientName || 'Client Name TBC',
        venue: booking?.venue || 'Venue TBC',
        venueAddress: booking?.venueAddress || 'Venue Address TBC',
        eventDate: booking?.eventDate || invoice.eventDate || 'Date TBC',
        selectedClauses,
        customClauses,
        totalAmount: `£${parseFloat(invoice.amount || '0').toFixed(2)}`,
        items,
        additionalNotes: invoice.notes
      });
      
      // Apply AI adjustments to HTML
      if (Object.keys(aiOptimization.adjustments).length > 0) {
        console.log('✅ Applying AI adjustments to invoice:', aiOptimization.reasoning);
        
        // Build custom CSS from AI adjustments
        const customCSS = Object.entries(aiOptimization.adjustments)
          .map(([property, value]) => {
            const cssProperty = property.replace(/([A-Z])/g, '-$1').toLowerCase();
            return `${cssProperty}: ${value};`;
          })
          .join(' ');
        
        // Inject AI optimizations into the HTML
        html = html.replace(
          '<style>',
          `<style>
        /* AI PDF Optimization Adjustments */
        .invoice-container {
          ${customCSS}
        }
        .invoice-section {
          ${aiOptimization.adjustments.pageBreakBefore ? `page-break-before: ${aiOptimization.adjustments.pageBreakBefore};` : ''}
          ${aiOptimization.adjustments.pageBreakAfter ? `page-break-after: ${aiOptimization.adjustments.pageBreakAfter};` : ''}
          ${aiOptimization.adjustments.paddingTop ? `padding-top: ${aiOptimization.adjustments.paddingTop};` : ''}
          ${aiOptimization.adjustments.paddingBottom ? `padding-bottom: ${aiOptimization.adjustments.paddingBottom};` : ''}
        }
        .terms-section {
          ${aiOptimization.adjustments.lineHeight ? `line-height: ${aiOptimization.adjustments.lineHeight};` : ''}
          ${aiOptimization.adjustments.fontSize ? `font-size: ${aiOptimization.adjustments.fontSize};` : ''}
        }`
        );
      } else {
        console.log('ℹ️ No AI adjustments needed for this invoice');
      }
    } catch (aiError) {
      console.warn('⚠️ AI optimization failed, continuing with default layout:', aiError.message);
    }
    
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    const pdf = await page.pdf({ 
      format: 'A4', 
      printBackground: true,
      margin: {
        top: '15mm',
        right: '12mm', 
        bottom: '15mm',
        left: '12mm'
      }
    });
    
    console.log('✅ FAST invoice PDF generated successfully:', pdf.length, 'bytes');
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

function generateOptimizedInvoiceHTML(invoice: Invoice, userSettings: UserSettings | null, booking: Booking | null): string {
  // Extract business details from user settings
  const businessName = userSettings?.businessName || 'Tim Fulker | SaxDJ';
  const businessPhone = userSettings?.phone || '07764 190034';
  const businessContactEmail = userSettings?.businessContactEmail || 'timfulkermusic@gmail.com';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice ${invoice.invoiceNumber}</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #2c3e50;
                background: #f8f9fa;
                padding: 20px;
            }
            
            /* Page structure note */
            .print-note {
                background: #fff3cd;
                color: #856404;
                padding: 10px;
                margin-bottom: 20px;
                border-radius: 4px;
                font-size: 12px;
                text-align: center;
            }
            
            @media print {
                .print-note {
                    display: none;
                }
            }
            
            .invoice-container {
                max-width: 800px;
                margin: 0 auto;
                background: white;
                box-shadow: 0 0 20px rgba(0,0,0,0.1);
                border-radius: 8px;
                overflow: hidden;
            }
            
            .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px 40px;
            }
            
            .header-top {
                display: flex;
                justify-content: flex-end;
                margin-bottom: 25px;
            }
            
            .musobuddy-logo {
                display: flex;
                align-items: center;
                gap: 10px;
                background: rgba(255,255,255,0.15);
                padding: 8px 16px;
                border-radius: 25px;
            }
            
            .musobuddy-text {
                font-size: 16px;
                font-weight: 600;
                color: white;
            }
            
            .header-main {
                display: flex;
                justify-content: space-between;
                align-items: flex-end;
            }
            
            .business-title {
                font-size: 36px;
                font-weight: bold;
                margin-bottom: 5px;
            }
            
            .business-tagline {
                font-size: 14px;
                opacity: 0.9;
            }
            
            .invoice-badge {
                text-align: right;
            }
            
            .invoice-number {
                font-size: 12px;
                opacity: 0.8;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 8px;
            }
            
            .invoice-id {
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 8px;
            }
            
            .invoice-date {
                font-size: 14px;
                opacity: 0.9;
            }
            
            .main-content {
                padding: 30px;
            }
            
            .parties-section {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 30px;
                margin-bottom: 25px;
                padding: 20px;
                background: #f8f9fa;
                border-radius: 8px;
            }
            
            .party-block h3 {
                color: #667eea;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 15px;
                font-weight: 600;
            }
            
            .party-name {
                font-size: 18px;
                font-weight: bold;
                color: #2c3e50;
                margin-bottom: 10px;
            }
            
            .party-details {
                font-size: 14px;
                line-height: 1.8;
                color: #5a6c7d;
            }
            
            .contact-item {
                display: flex;
                align-items: center;
                margin: 5px 0;
            }
            
            .contact-icon {
                width: 16px;
                height: 16px;
                margin-right: 8px;
                opacity: 0.6;
            }
            
            .services-section {
                margin-bottom: 25px;
            }
            
            .section-title {
                font-size: 16px;
                font-weight: 600;
                color: #2c3e50;
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 2px solid #667eea;
            }
            
            .service-table {
                width: 100%;
                border-collapse: collapse;
            }
            
            .service-table th {
                background: #f8f9fa;
                padding: 12px;
                text-align: left;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: #5a6c7d;
                font-weight: 600;
            }
            
            .service-table td {
                padding: 12px;
                border-bottom: 1px solid #e9ecef;
                font-size: 14px;
            }
            
            .service-description {
                font-weight: 500;
                color: #2c3e50;
            }
            
            .service-details {
                font-size: 12px;
                color: #6c757d;
                margin-top: 5px;
            }
            
            .amount {
                text-align: right;
                font-weight: 600;
                color: #2c3e50;
            }
            
            .totals-section {
                background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                padding: 20px;
                border-radius: 8px;
                margin-bottom: 20px;
            }
            
            .total-row {
                display: flex;
                justify-content: space-between;
                margin: 8px 0;
                font-size: 14px;
            }
            
            .total-label {
                color: #5a6c7d;
            }
            
            .total-divider {
                border-top: 2px solid #dee2e6;
                margin: 15px 0;
            }
            
            .grand-total {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 24px;
                font-weight: bold;
                color: #667eea;
            }
            
            .payment-section {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                padding: 15px;
                background: #fafbfc;
                border-radius: 6px;
                margin-bottom: 15px;
            }
            
            .payment-block h4 {
                font-size: 13px;
                color: #667eea;
                margin-bottom: 10px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .payment-details {
                font-size: 12px;
                line-height: 1.4;
                color: #5a6c7d;
            }
            
            .bank-detail {
                background: white;
                padding: 4px 8px;
                margin: 2px 0;
                border-radius: 3px;
                border-left: 3px solid #667eea;
            }
            
            .due-date-highlight {
                background: #fff3cd;
                color: #856404;
                padding: 6px 10px;
                border-radius: 3px;
                font-weight: 600;
                display: inline-block;
                margin-top: 6px;
            }
            
            .terms-section {
                padding: 10px 15px;
                background: #f8f9fa;
                border-top: 1px solid #dee2e6;
            }
            
            .terms-title {
                font-size: 11px;
                font-weight: 600;
                color: #5a6c7d;
                margin-bottom: 6px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .terms-content {
                font-size: 10px;
                color: #6c757d;
                line-height: 1.3;
            }
            
            .footer {
                background: #2c3e50;
                color: white;
                padding: 20px;
                text-align: center;
                font-size: 12px;
            }
            
            .footer a {
                color: #667eea;
                text-decoration: none;
            }
            
            .thank-you-note {
                background: #e8f4f8;
                border-left: 4px solid #667eea;
                padding: 15px 20px;
                margin-bottom: 30px;
                border-radius: 4px;
                color: #2c3e50;
                font-style: italic;
            }
            
            /* Page Break Indicators - visible only on screen */
            .page-break {
                margin: 20px 0;
                border-top: 2px dashed #dee2e6;
                position: relative;
                page-break-after: always;
            }
            
            .page-break::before {
                content: "Page Break (for printing)";
                position: absolute;
                top: -10px;
                left: 50%;
                transform: translateX(-50%);
                background: white;
                padding: 0 10px;
                color: #adb5bd;
                font-size: 11px;
                font-style: italic;
            }
            
            @media print {
                body {
                    background: white;
                    padding: 0;
                }
                
                .invoice-container {
                    box-shadow: none;
                    max-width: 100%;
                }
                
                /* PAGE 1 CONTENT - Keep together */
                .header, 
                .parties-section,
                .services-section,
                .thank-you-note,
                .totals-section {
                    page-break-inside: avoid;
                }
                
                /* Force page break after totals */
                .page-break {
                    page-break-after: always;
                    break-after: page;
                    height: 0;
                    border: none;
                    margin: 0;
                    padding: 0;
                }
                
                .page-break::before {
                    display: none;
                }
                
                /* Show page 2 header only in print */
                .page-2-header {
                    display: block !important;
                }
                
                /* PAGE 2 CONTENT - Keep together */
                .payment-section,
                .terms-section {
                    page-break-inside: avoid;
                }
                
                /* Hide web-only footer in print */
                .footer {
                    display: none;
                }
            }
            
            /* Page size configuration for printing */
            @page {
                size: A4;
                margin: 15mm 12mm;
                
                @bottom-center {
                    content: "Page " counter(page) " of 2";
                    font-size: 10px;
                    color: #6c757d;
                }
            }
        </style>
    </head>
    <body>
        <!-- Print Note - Only visible on screen -->
        <div class="print-note">
            📄 This invoice is designed to print on 2 A4 pages. Page 1: Invoice details & totals | Page 2: Payment information & terms
        </div>
        
        <div class="invoice-container">
            <!-- Header -->
            <div class="header">
                <!-- Top row with MusoBuddy logo -->
                <div class="header-top">
                    <div class="musobuddy-logo">
                        <svg width="32" height="32" viewBox="0 0 32 32" style="background: #5A4FCF; border-radius: 6px; padding: 6px;">
                            <!-- Metronome A shape -->
                            <text x="16" y="22" text-anchor="middle" fill="white" font-size="18" font-weight="bold">A</text>
                            <!-- Simple pendulum -->
                            <line x1="16" y1="10" x2="20" y2="16" stroke="white" stroke-width="2"/>
                            <circle cx="20" cy="16" r="2" fill="white"/>
                        </svg>
                        <span class="musobuddy-text">MusoBuddy</span>
                    </div>
                </div>
                
                <!-- Main header content -->
                <div class="header-main">
                    <div>
                        <div class="business-title">${businessName}</div>
                        <div class="business-tagline">Professional Music Performance Services</div>
                    </div>
                    <div class="invoice-badge">
                        <div class="invoice-number">Invoice</div>
                        <div class="invoice-id">#${invoice.invoiceNumber}</div>
                        <div class="invoice-date">${invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')}</div>
                    </div>
                </div>
            </div>
            
            <!-- Main Content -->
            <div class="main-content">
                <!-- Parties Section -->
                <div class="parties-section">
                    <div class="party-block">
                        <h3>From</h3>
                        <div class="party-name">${businessName.split('|')[0]?.trim() || 'Tim Fulker'}</div>
                        <div class="party-details">
                            Sole Trader<br>
                            ${userSettings?.addressLine1 || '59 Gloucester Road'}<br>
                            ${userSettings?.city || 'Bournemouth'}, ${userSettings?.county || 'Dorset'}<br>
                            ${userSettings?.postcode || 'BH7 6JA'}<br>
                            <div class="contact-item">
                                <span class="contact-icon">📞</span> ${businessPhone}
                            </div>
                            <div class="contact-item">
                                <span class="contact-icon">✉️</span> ${businessContactEmail}
                            </div>
                            <div class="contact-item">
                                <span class="contact-icon">🌐</span> www.saxdj.co.uk
                            </div>
                        </div>
                    </div>
                    
                    <div class="party-block">
                        <h3>Bill To</h3>
                        <div class="party-name">${invoice.clientName}</div>
                        <div class="party-details">
                            ${invoice.clientAddress ? invoice.clientAddress.replace(/,\s*/g, '<br>') : '[Billing Address Required]'}<br>
                            ${invoice.clientEmail ? `<div class="contact-item"><span class="contact-icon">✉️</span> ${invoice.clientEmail}</div>` : ''}
                            ${invoice.clientPhone ? `<div class="contact-item"><span class="contact-icon">📞</span> ${invoice.clientPhone}</div>` : ''}
                        </div>
                    </div>
                </div>
                
                <!-- Services Section -->
                <div class="services-section">
                    <h2 class="section-title">Services Provided</h2>
                    <table class="service-table">
                        <thead>
                            <tr>
                                <th>Description</th>
                                <th>Date</th>
                                <th style="text-align: right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>
                                    <div class="service-description">Live Saxophone & DJ Performance</div>
                                    <div class="service-details">
                                        Venue: ${invoice.venueAddress || 'TBD'}<br>
                                        Duration: ${invoice.performanceDuration || booking?.performanceDuration || 'Standard Set (approx. 3 hours)'}<br>
                                        Event Type: ${invoice.gigType || booking?.gigType || 'Music Performance'}
                                    </div>
                                </td>
                                <td>${invoice.eventDate ? new Date(invoice.eventDate).toLocaleDateString('en-GB') : 'TBD'}</td>
                                <td class="amount">£${invoice.amount}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                <!-- Thank You Note -->
                <div class="thank-you-note">
                    Thank you for choosing ${businessName.split('|')[0]?.trim() || 'Tim Fulker'} Music Services. It was a pleasure performing at your event!
                </div>
                
                <!-- PAGE BREAK - Page 2 starts here when printed -->
                <div class="page-break"></div>
                
                <!-- Page 2 Header (visible only in print) -->
                <div style="display: none; padding: 10px 0 15px 0; border-bottom: 2px solid #667eea; margin-bottom: 15px;" class="page-2-header">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <span style="font-size: 14px; font-weight: bold; color: #2c3e50;">${businessName}</span>
                            <span style="font-size: 11px; color: #6c757d; margin-left: 12px;">Invoice #${invoice.invoiceNumber} (Page 2 of 2)</span>
                        </div>
                        <span style="font-size: 11px; color: #6c757d;">${invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')}</span>
                    </div>
                </div>
                
                <!-- Totals Section -->
                <div class="totals-section">
                    <div class="total-row">
                        <span class="total-label">Performance Fee</span>
                        <span>£${invoice.fee || invoice.amount}</span>
                    </div>
                    <div class="total-row">
                        <span class="total-label">Deposit Paid</span>
                        <span>£${invoice.depositPaid || '0.00'}</span>
                    </div>
                    <div class="total-row">
                        <span class="total-label">VAT (Not VAT Registered)</span>
                        <span>£0.00</span>
                    </div>
                    <div class="total-divider"></div>
                    <div class="grand-total">
                        <span>Total Due</span>
                        <span>£${invoice.amount}</span>
                    </div>
                </div>
                
                <!-- Payment Section -->
                <div class="payment-section">
                    <div class="payment-block">
                        <h4>Payment Details</h4>
                        <div class="payment-details">
                            <div class="bank-detail">
                                <strong>Account Name:</strong> Mr T Fulker
                            </div>
                            <div class="bank-detail">
                                <strong>Account Number:</strong> 09851259
                            </div>
                            <div class="bank-detail">
                                <strong>Sort Code:</strong> 54-21-30
                            </div>
                            <div class="bank-detail">
                                <strong>Reference:</strong> ${invoice.invoiceNumber}
                            </div>
                        </div>
                    </div>
                    
                    <div class="payment-block">
                        <h4>Payment Terms</h4>
                        <div class="payment-details">
                            <div class="due-date-highlight">
                                Due: ${new Date(invoice.dueDate).toLocaleDateString('en-GB')}
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Terms Section -->
                <div class="terms-section">
                    <div class="terms-title">Terms & Conditions</div>
                    <div class="terms-content">
                        ${generateInvoiceTerms(userSettings, businessContactEmail)}
                    </div>
                </div>
            </div>
            
            <!-- Footer -->
            <div class="footer">
                ${businessName.split('|')[0]?.trim() || 'Tim Fulker'} Music Services | Bournemouth, UK | <a href="https://www.saxdj.co.uk">www.saxdj.co.uk</a><br>
                <small style="opacity: 0.7; margin-top: 10px; display: block;">Powered by MusoBuddy - Less admin, more music</small>
            </div>
        </div>
    </body>
    </html>
  `;
}