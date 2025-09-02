// UNIFIED: contract-pdf-generator.ts - Single source of truth for contract PDF generation
import puppeteer from 'puppeteer';
import chromium from '@sparticuz/chromium';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { Contract, UserSettings } from '../shared/schema';
import { aiPDFOptimizer } from './core/ai-pdf-optimizer';

// Simplified contract totals calculation - TRAVEL ALWAYS INCLUDED IN PERFORMANCE FEE
function calculateContractTotals(contract: any, userSettings?: UserSettings) {
  const fee = parseFloat(contract.fee || '0');
  const travelExpenses = parseFloat(contract.travelExpenses || contract.travel_expenses || contract.travelExpense || contract.travel_expense || '0');
  
  console.log('💰 PDF Calculation Debug (SIMPLIFIED):', {
    contractId: contract.id,
    fee,
    travelExpenses,
    totalAmount: fee + travelExpenses,
    note: 'Travel always included in performance fee - no separate display'
  });
  
  // Always include travel in performance fee - no separate display
  return {
    performanceFee: fee + travelExpenses,
    travelExpenses: 0, // Never show separately
    totalAmount: fee + travelExpenses,
    showSeparateTravel: false // Never show travel separately
  };
}

// Theme color mapping for PDF generation
function getThemeColor(userSettings: UserSettings | null): string {
  // Use user's selected theme accent color if available
  if (userSettings?.themeAccentColor) {
    return userSettings.themeAccentColor;
  }
  
  // Default fallback to purple (original theme)
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

// Helper function to convert payment terms setting to readable text
function getPaymentTermsText(paymentTerms: string): string {
  switch (paymentTerms) {
    case "28_days_before": return "Payment due 28 days prior to performance date";
    case "14_days_before": return "Payment due 14 days prior to performance date";
    case "7_days_before": return "Payment due 7 days prior to performance date";
    case "on_performance": return "Payment due on date of performance";
    case "7_days_after": return "Payment due within 7 days of performance";
    case "14_days_after": return "Payment due within 14 days of performance";
    case "28_days_after": return "Payment due within 28 days of performance";
    // Legacy terms (for backward compatibility)
    case "on_receipt": return "Payment due on receipt of invoice";
    case "3_days": return "Payment due within 3 days";
    case "7_days": return "Payment due within 7 days";
    case "14_days": return "Payment due within 14 days";
    case "30_days": return "Payment due within 30 days";
    case "cash_as_agreed": return "Cash payment as agreed";
    default: return "Payment due within 7 days of performance";
  }
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

// WCAG 2.0 luminance calculation for proper text contrast (same as invoice system)
function getLuminance(color: string): number {
  const hex = color.replace('#', '');
  const fullHex = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex;
  
  let r = parseInt(fullHex.substring(0, 2), 16) / 255;
  let g = parseInt(fullHex.substring(2, 4), 16) / 255;
  let b = parseInt(fullHex.substring(4, 6), 16) / 255;
  
  const gammaCorrect = (channel: number) => {
    return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
  };
  
  r = gammaCorrect(r);
  g = gammaCorrect(g);
  b = gammaCorrect(b);
  
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function getContrastTextColor(backgroundColor: string): 'white' | 'black' {
  const luminance = getLuminance(backgroundColor);
  // Using same threshold as frontend and invoices: 0.5
  return luminance > 0.5 ? 'black' : 'white';
}

function formatBusinessAddress(userSettings: UserSettings | null): string {
  if (!userSettings) return '';
  
  // Use individual address fields: addressLine1, addressLine2, city, county, postcode
  const addressParts: string[] = [];
  
  if (userSettings.addressLine1) {
    addressParts.push(userSettings.addressLine1);
  }
  
  if (userSettings.addressLine2) {
    addressParts.push(userSettings.addressLine2);
  }
  
  if (userSettings.city) {
    addressParts.push(userSettings.city);
  }
  
  if (userSettings.county) {
    addressParts.push(userSettings.county);
  }
  
  if (userSettings.postcode) {
    addressParts.push(userSettings.postcode);
  }
  
  // Join the address parts with line breaks
  return addressParts.length > 0 ? addressParts.join('<br>') : 'Address not provided';
}

// Helper function to escape HTML
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Enhanced terms section with smart page breaking
function generateTermsSection(userSettings: UserSettings | null, contract?: any): string {
  const clauseMap = {
    // Legacy clause names (for backward compatibility)
    payment30: "Payment due within 30 days of performance",
    deposit50: "50% deposit required to secure booking (non-refundable)", 
    cancellation7: "Cancellations within 7 days forfeit deposit",
    equipmentOwnership: "All equipment remains property of performer",
    powerSupply: "Client must provide adequate and safe power supply",
    venueAccess: "Client must provide safe and reasonable venue access for load-in/out",
    weatherProtection: "Client must provide weather protection for outdoor events",
    finalNumbers: "Final guest numbers must be confirmed 48 hours prior",
    noRecording: "No recording or broadcasting without performer's written consent",
    forcemajeure: "Neither party liable for cancellation due to events beyond their control",
    
    // New expanded clause names
    deposit: "50% deposit required to secure booking (non-refundable)",
    balancePayment: "Remaining fee due before event / on the day",
    cancellation: "Client cancellations within 7 days of event incur full fee",
    performerCancellation: "Performer will use best efforts to provide a suitable replacement",
    access: "Client must provide safe and reasonable venue access for load-in/out",
    power: "Client must provide adequate and safe power supply",
    equipment: "All equipment remains property of performer; client responsible for damage caused by guests",
    spaceAndSafety: "Stage/performance area must be flat, covered, and safe",
    weather: "Client must provide weather protection for outdoor events",
    soundLimits: "Client responsible for venue sound restrictions or curfews",
    overtime: "Extra performance time charged at £100 per 30 minutes",
    guestNumbers: "Final numbers must be confirmed 48 hours prior",
    mealsRefreshments: "Client to provide suitable food and drink if performance exceeds 3 hours including setup",
    parkingTravel: "Client to cover parking fees; accommodation required if venue is over 50 miles or finish after midnight",
    recording: "No recording or broadcasting without performer's written consent",
    insurance: "Performer holds Public Liability Insurance; client responsible for venue licences (PRS/PPL)",
    forceMajeure: "Neither party liable for cancellation due to events beyond their control (illness, accidents, extreme weather, etc.)",
    governingLaw: "Contract subject to the laws of England & Wales"
  };

  const selectedClauses: string[] = [];
  const customClauses: string[] = [];

  // Collect selected standard clauses
  if (userSettings?.contractClauses) {
    for (const [key, value] of Object.entries(userSettings.contractClauses)) {
      if (value && clauseMap[key as keyof typeof clauseMap]) {
        selectedClauses.push(clauseMap[key as keyof typeof clauseMap]);
      }
    }
  }

  // Add payment terms if set
  if (userSettings?.contractClauses?.paymentTerms) {
    selectedClauses.push(getPaymentTermsText(userSettings.contractClauses.paymentTerms));
  }

  // Collect custom clauses
  if (userSettings?.customClauses && Array.isArray(userSettings.customClauses)) {
    userSettings.customClauses.forEach(clause => {
      if (typeof clause === 'object' && clause.text && clause.enabled) {
        customClauses.push(clause.text);
      } else if (typeof clause === 'string' && clause.trim()) {
        customClauses.push(clause);
      }
    });
  }

  // Add deposit clause if applicable
  if (contract && contract.deposit && parseFloat(contract.deposit) > 0) {
    const depositAmount = parseFloat(contract.deposit).toFixed(2);
    const depositDays = contract.depositDays || 7;
    selectedClauses.unshift(`This Agreement becomes legally binding upon signature. A non-refundable booking fee of £${depositAmount} is required within ${depositDays} days.`);
  }

  const allClauses = [...selectedClauses, ...customClauses].filter(clause => clause && clause.trim());

  if (allClauses.length === 0) {
    return ''; // No terms to display
  }

  // Categorize clauses
  const categories: { [key: string]: string[] } = {
    'Payment Terms': [],
    'Performance & Equipment': [],
    'Cancellation & Rescheduling': [],
    'General Terms': []
  };

  allClauses.forEach(clause => {
    const lower = clause.toLowerCase();
    if (lower.includes('payment') || lower.includes('deposit') || lower.includes('fee') || lower.includes('£')) {
      categories['Payment Terms'].push(clause);
    } else if (lower.includes('cancel') || lower.includes('reschedul')) {
      categories['Cancellation & Rescheduling'].push(clause);
    } else if (lower.includes('equipment') || lower.includes('venue') || lower.includes('performance') || 
               lower.includes('stage') || lower.includes('power') || lower.includes('access')) {
      categories['Performance & Equipment'].push(clause);
    } else {
      categories['General Terms'].push(clause);
    }
  });

  let termsHtml = `
    <div class="section">
        <h2 class="section-title">Terms & Conditions</h2>
        <div class="terms-container">`;

  for (const [category, terms] of Object.entries(categories)) {
    if (terms.length > 0) {
      termsHtml += `
        <div class="terms-category">
            <h3 class="terms-category-title">${category}</h3>
            <div class="terms-list">
                ${terms.map(term => `<div class="term-item">${escapeHtml(term)}</div>`).join('')}
            </div>
        </div>`;
    }
  }

  termsHtml += `
        </div>
    </div>`;

  return termsHtml;
}

// MAIN EXPORT: Unified contract PDF generator
export async function generateContractPDF(
  contract: Contract,
  userSettings: UserSettings | null,
  signatureDetails?: {
    signedAt: Date;
    signatureName?: string;
    clientIpAddress?: string;
  }
): Promise<Buffer> {
  console.log('🚀 UNIFIED: Starting contract PDF generation for:', contract.contractNumber);
  console.log('🚀 UNIFIED: Contract status:', contract.status);
  console.log('🚀 UNIFIED: Contract data received:', {
    id: contract.id,
    fee: contract.fee,
    travelExpenses: contract.travelExpenses,
    note: 'Travel expenses always included in performance fee'
  });
  console.log('🚀 UNIFIED: Has signature details:', !!signatureDetails);
  
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
    let html = generateUnifiedContractHTML(contract, userSettings, signatureDetails);
    
    // AI-powered PDF optimization (keeping your existing logic)
    try {
      console.log('🤖 Analyzing contract content for AI optimization...');
      
      const selectedClauses: string[] = [];
      const customClauses: string[] = [];
      
      if (userSettings?.contractClauses) {
        const clauseMap = {
          payment30: "Payment due within 30 days of performance",
          deposit50: "50% deposit required to secure booking (non-refundable)",
          cancellation7: "Cancellations within 7 days forfeit deposit",
          equipmentOwnership: "All equipment remains property of performer",
          powerSupply: "Client must provide adequate and safe power supply",
          venueAccess: "Client must provide safe and reasonable venue access for load-in/out",
          weatherProtection: "Client must provide weather protection for outdoor events",
          finalNumbers: "Final guest numbers must be confirmed 48 hours prior",
          noRecording: "No recording or broadcasting without performer's written consent",
          forcemajeure: "Neither party liable for cancellation due to events beyond their control",
        };
        
        for (const [key, value] of Object.entries(clauseMap)) {
          if (userSettings.contractClauses[key as keyof typeof clauseMap]) {
            selectedClauses.push(value);
          }
        }
        
        if (userSettings.contractClauses.paymentTerms) {
          const paymentTermsText = getPaymentTermsText(userSettings.contractClauses.paymentTerms);
          selectedClauses.push(paymentTermsText);
        }
      }
      
      if (userSettings?.customClauses && Array.isArray(userSettings.customClauses)) {
        userSettings.customClauses.forEach(clause => {
          if (typeof clause === 'object' && clause.text && clause.enabled) {
            customClauses.push(clause.text);
          } else if (typeof clause === 'string' && clause.trim() !== '') {
            customClauses.push(clause);
          }
        });
      }
      
      const totals = calculateContractTotals(contract, userSettings);
      
      const aiOptimization = await aiPDFOptimizer.optimizeContractLayout({
        clientName: contract.clientName || 'Client Name TBC',
        venue: contract.venue || 'Venue TBC',
        venueAddress: contract.venueAddress || 'Venue Address TBC',
        eventDate: contract.eventDate || 'Date TBC',
        selectedClauses,
        customClauses,
        performanceFee: `£${totals.totalAmount.toFixed(2)}`,
        depositAmount: contract.deposit ? `£${parseFloat(contract.deposit).toFixed(2)}` : undefined,
        additionalNotes: contract.specialRequirements || contract.equipmentRequirements
      });
      
      if (Object.keys(aiOptimization.adjustments).length > 0) {
        console.log('✅ Applying AI adjustments:', aiOptimization.reasoning);
        
        const customCSS = Object.entries(aiOptimization.adjustments)
          .map(([property, value]) => {
            const cssProperty = property.replace(/([A-Z])/g, '-$1').toLowerCase();
            return `${cssProperty}: ${value};`;
          })
          .join(' ');
        
        html = html.replace(
          '<style>',
          `<style>
        /* AI PDF Optimization Adjustments */
        .container {
          ${customCSS}
        }`
        );
      } else {
        console.log('ℹ️ No AI adjustments needed for this contract');
      }
    } catch (aiError) {
      console.warn('⚠️ AI optimization failed, continuing with default layout:', aiError.message);
    }
    
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    const pdf = await page.pdf({ 
      format: 'A4', 
      printBackground: true,
      margin: {
        top: '0.75in',
        right: '0.75in',
        bottom: '0.75in',
        left: '0.75in'
      }
    });
    
    console.log('✅ UNIFIED: Contract PDF generated successfully:', pdf.length, 'bytes');
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

function generateUnifiedContractHTML(
  contract: Contract,
  userSettings: UserSettings | null,
  signatureDetails?: {
    signedAt: Date;
    signatureName?: string;
    clientIpAddress?: string;
  }
): string {
  const businessName = userSettings?.businessName || 'MusoBuddy Professional Services';
  const eventDate = contract.eventDate ? new Date(contract.eventDate) : null;
  const eventDateStr = eventDate ? eventDate.toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric', 
    month: 'long',
    day: 'numeric'
  }) : 'Date TBC';

  const isSigned = contract.status === 'signed' || signatureDetails;
  const signedAt = signatureDetails?.signedAt || (contract.signedAt ? new Date(contract.signedAt) : null);
  const signatureName = signatureDetails?.signatureName || contract.clientSignature || 'Digital Signature';

  const primaryColor = getThemeColor(userSettings);
  const secondaryColor = getSecondaryColor(primaryColor);
  const headerTextColor = getContrastTextColor(primaryColor);

  // Calculate totals for display
  const totals = calculateContractTotals(contract, userSettings);
  const depositAmount = parseFloat(contract.deposit || '0');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Performance Contract - ${contract.contractNumber}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        @page {
            size: A4;
            margin: 15mm;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            line-height: 1.6;
            color: #1f2937;
            background: white;
            font-size: 10pt;
        }
        
        /* CRITICAL: Page break control classes */
        .page-break-before {
            page-break-before: always;
        }
        
        .avoid-break {
            page-break-inside: avoid;
            break-inside: avoid;
        }
        
        .keep-together {
            page-break-inside: avoid;
            break-inside: avoid;
            orphans: 4;
            widows: 4;
        }
        
        /* Container */
        .contract-container {
            max-width: 100%;
            margin: 0 auto;
            background: white;
        }
        
        /* Professional Header */
        .contract-header {
            background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%);
            color: ${headerTextColor};
            padding: 30px;
            border-radius: 12px 12px 0 0;
            position: relative;
            margin-bottom: 30px;
            page-break-inside: avoid;
            page-break-after: avoid;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        
        .header-content {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
        }
        
        .logo-section {
            flex-grow: 1;
        }
        
        .company-name {
            font-size: 28pt;
            font-weight: 800;
            letter-spacing: -0.5px;
            margin-bottom: 4px;
        }
        
        .tagline {
            font-size: 11pt;
            opacity: 0.9;
            font-style: italic;
        }
        
        .contract-title {
            font-size: 20pt;
            font-weight: 700;
            margin-top: 20px;
            margin-bottom: 8px;
        }
        
        .contract-number {
            font-size: 9pt;
            opacity: 0.85;
            font-family: 'Courier New', monospace;
        }
        
        .status-badge {
            background: rgba(255, 255, 255, 0.25);
            backdrop-filter: blur(10px);
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 9pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border: 2px solid rgba(255, 255, 255, 0.3);
        }
        
        .status-signed {
            background: #10b981;
            border-color: #059669;
            color: white;
        }
        
        .status-sent {
            background: #3b82f6;
            border-color: #2563eb;
            color: white;
        }
        
        .status-draft {
            background: #6b7280;
            border-color: #4b5563;
            color: white;
        }
        
        /* Content sections with page break control */
        .section {
            margin-bottom: 25px;
            page-break-inside: avoid;
        }
        
        .section-title {
            font-size: 14pt;
            font-weight: 700;
            color: #111827;
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 2px solid ${primaryColor};
            page-break-after: avoid;
        }
        
        /* Two-column party section */
        .parties-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
            page-break-inside: avoid;
        }
        
        .party-card {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 16px;
            border-left: 3px solid ${primaryColor};
            page-break-inside: avoid;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }
        
        .party-label {
            font-size: 9pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #6b7280;
            margin-bottom: 8px;
        }
        
        .party-name {
            font-size: 11pt;
            font-weight: 600;
            color: #111827;
            margin-bottom: 8px;
        }
        
        .party-details {
            font-size: 9pt;
            color: #6b7280;
            line-height: 1.5;
        }
        
        /* Event details grid */
        .event-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 25px;
            page-break-inside: avoid;
        }
        
        .event-card {
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 16px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }
        
        .event-label {
            font-size: 9pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #6b7280;
            margin-bottom: 8px;
        }
        
        .event-value {
            font-size: 11pt;
            color: #111827;
            font-weight: 500;
        }
        
        /* Venue details - grouped to prevent page breaks */
        .venue-group {
            page-break-inside: avoid;
            break-inside: avoid;
        }
        
        .venue-name {
            font-size: 12pt;
            font-weight: 600;
            color: #111827;
            margin-bottom: 4px;
        }
        
        .venue-address {
            font-size: 10pt;
            color: #6b7280;
            line-height: 1.5;
        }
        
        /* Financial section */
        .financial-section {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 25px;
            page-break-inside: avoid;
        }
        
        .financial-title {
            font-size: 13pt;
            font-weight: 700;
            color: #111827;
            margin-bottom: 16px;
            text-align: center;
        }
        
        .fee-breakdown {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 12px;
            align-items: center;
        }
        
        .fee-label {
            font-size: 10pt;
            color: #4b5563;
        }
        
        .fee-amount {
            font-size: 12pt;
            font-weight: 600;
            color: #111827;
            text-align: right;
        }
        
        .total-row {
            border-top: 2px solid ${primaryColor};
            padding-top: 12px;
            margin-top: 12px;
        }
        
        .total-label {
            font-size: 11pt;
            font-weight: 700;
            color: #111827;
        }
        
        .total-amount {
            font-size: 16pt;
            font-weight: 800;
            color: ${primaryColor};
            text-align: right;
        }
        
        .deposit-info {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 6px;
            padding: 12px;
            margin-top: 16px;
            font-size: 9pt;
            color: #92400e;
        }
        
        /* Terms section */
        .terms-container {
            page-break-inside: avoid;
        }
        
        .terms-category {
            margin-bottom: 20px;
            page-break-inside: avoid;
        }
        
        .terms-category-title {
            font-size: 11pt;
            font-weight: 600;
            color: #374151;
            margin-bottom: 8px;
            padding-bottom: 4px;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .terms-list {
            margin-left: 0;
        }
        
        .term-item {
            font-size: 9pt;
            line-height: 1.6;
            color: #4b5563;
            margin-bottom: 6px;
            padding-left: 16px;
            position: relative;
        }
        
        .term-item:before {
            content: "•";
            color: ${primaryColor};
            font-weight: bold;
            position: absolute;
            left: 0;
        }
        
        /* Signature section */
        .signature-section {
            page-break-before: auto;
            page-break-inside: avoid;
            margin-top: 40px;
            padding-top: 30px;
            border-top: 3px solid ${primaryColor};
        }
        
        .signature-title {
            font-size: 14pt;
            font-weight: 700;
            color: #111827;
            text-align: center;
            margin-bottom: 20px;
        }
        
        .signature-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-top: 30px;
        }
        
        .signature-box {
            text-align: center;
            page-break-inside: avoid;
        }
        
        .signature-line {
            height: 2px;
            background: #e5e7eb;
            margin-bottom: 8px;
            position: relative;
        }
        
        .signature-label {
            font-size: 9pt;
            color: #6b7280;
            margin-bottom: 20px;
        }
        
        .signature-name {
            font-size: 10pt;
            font-weight: 600;
            color: #111827;
            margin-bottom: 4px;
        }
        
        .signature-date {
            font-size: 8pt;
            color: #6b7280;
        }
        
        .signed-indicator {
            background: #10b981;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 8pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            display: inline-block;
            margin-bottom: 12px;
        }
        
        /* Footer */
        .contract-footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            font-size: 8pt;
            color: #9ca3af;
            page-break-inside: avoid;
        }
        
        .powered-by {
            margin-top: 12px;
            font-style: italic;
        }
        
        /* Print optimizations */
        @media print {
            .contract-container {
                box-shadow: none;
            }
            
            .contract-header {
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
            }
            
            .page-break-before {
                page-break-before: always;
            }
        }
    </style>
</head>
<body>
    <div class="contract-container">
        <!-- Professional Header -->
        <div class="contract-header">
            <div class="header-content">
                <div class="logo-section">
                    <div class="company-name">${businessName}</div>
                    <div class="tagline">Professional Music Services</div>
                    <div class="contract-title">Performance Contract</div>
                    <div class="contract-number">Contract #${contract.contractNumber}</div>
                </div>
                <div class="status-badge ${isSigned ? 'status-signed' : (contract.status === 'sent' ? 'status-sent' : 'status-draft')}">
                    ${isSigned ? 'Signed' : (contract.status === 'sent' ? 'Sent' : 'Draft')}
                </div>
            </div>
        </div>
        
        <!-- Parties Section -->
        <div class="section">
            <h2 class="section-title">Contracting Parties</h2>
            <div class="parties-grid">
                <div class="party-card">
                    <div class="party-label">Performer</div>
                    <div class="party-name">${businessName}</div>
                    <div class="party-details">
                        ${formatBusinessAddress(userSettings)}<br>
                        ${userSettings?.phone ? `Phone: ${userSettings.phone}<br>` : ''}
                        ${userSettings?.businessEmail ? `Email: ${userSettings.businessEmail}` : ''}
                    </div>
                </div>
                
                <div class="party-card">
                    <div class="party-label">Client</div>
                    <div class="party-name">${contract.clientName || 'Client Name TBC'}</div>
                    <div class="party-details">
                        ${contract.clientEmail ? `Email: ${contract.clientEmail}<br>` : ''}
                        ${contract.clientPhone ? `Phone: ${contract.clientPhone}<br>` : ''}
                        ${contract.clientAddress ? escapeHtml(contract.clientAddress) : 'Address TBC'}
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Event Details Section -->
        <div class="section">
            <h2 class="section-title">Event Details</h2>
            <div class="event-grid">
                <div class="event-card">
                    <div class="event-label">Event Date</div>
                    <div class="event-value">${eventDateStr}</div>
                </div>
                
                <div class="event-card">
                    <div class="event-label">Event Time</div>
                    <div class="event-value">${contract.eventTime || 'Time TBC'}</div>
                </div>
                
                <div class="event-card">
                    <div class="event-label">Event Type</div>
                    <div class="event-value">${contract.eventType || 'Performance'}</div>
                </div>
                
                <div class="event-card">
                    <div class="event-label">Duration</div>
                    <div class="event-value">${contract.duration || 'TBC'}</div>
                </div>
            </div>
            
            <!-- Venue Details (grouped to prevent breaks) -->
            <div class="event-card venue-group">
                <div class="event-label">Venue</div>
                <div class="venue-name">${contract.venue || 'Venue TBC'}</div>
                ${contract.venueAddress ? `<div class="venue-address">${escapeHtml(contract.venueAddress)}</div>` : '<div class="venue-address">Venue address TBC</div>'}
            </div>
        </div>
        
        <!-- Financial Section -->
        <div class="financial-section">
            <div class="financial-title">Financial Agreement</div>
            <div class="fee-breakdown">
                <div class="fee-label">Performance Fee (including travel)</div>
                <div class="fee-amount">£${totals.totalAmount.toFixed(2)}</div>
                
                ${depositAmount > 0 ? `
                <div class="fee-label total-row total-label">Booking Deposit Required</div>
                <div class="fee-amount total-row">£${depositAmount.toFixed(2)}</div>
                ` : ''}
                
                <div class="fee-label total-row total-label">Total Contract Value</div>
                <div class="total-amount total-row">£${totals.totalAmount.toFixed(2)}</div>
            </div>
            
            ${depositAmount > 0 ? `
            <div class="deposit-info">
                <strong>Deposit Required:</strong> A non-refundable booking deposit of £${depositAmount.toFixed(2)} is required within ${contract.depositDays || 7} days of signing this contract to secure the booking.
            </div>` : ''}
        </div>
        
        <!-- Terms & Conditions -->
        ${userSettings?.themeShowTerms !== false ? generateTermsSection(userSettings, contract) : ''}
        
        <!-- Signature Section -->
        <div class="signature-section">
            <div class="signature-title">Agreement Signatures</div>
            <p style="text-align: center; color: #6b7280; margin-bottom: 20px; font-size: 9pt;">
                By signing below, both parties agree to the terms and conditions set forth in this contract.
            </p>
            
            <div class="signature-grid">
                <div class="signature-box">
                    <div class="signature-label">Performer Signature</div>
                    <div class="signature-line"></div>
                    <div class="signature-name">${businessName}</div>
                    <div class="signature-date">Date: ${new Date().toLocaleDateString('en-GB')}</div>
                </div>
                
                <div class="signature-box">
                    <div class="signature-label">Client Signature</div>
                    ${isSigned ? `
                        <div class="signed-indicator">✓ Digitally Signed</div>
                        <div class="signature-name">${signatureName}</div>
                        <div class="signature-date">Signed: ${signedAt ? signedAt.toLocaleDateString('en-GB') + ' at ' + signedAt.toLocaleTimeString('en-GB') : 'Date TBC'}</div>
                    ` : `
                        <div class="signature-line"></div>
                        <div class="signature-name">${contract.clientName || 'Client Name'}</div>
                        <div class="signature-date">Date: _______________</div>
                    `}
                </div>
            </div>
        </div>
        
        <!-- Footer -->
        <div class="contract-footer">
            <div>This contract is generated and managed by MusoBuddy Professional Services</div>
            <div class="powered-by">Simplifying music business administration since 2024</div>
        </div>
    </div>
</body>
</html>`;
}