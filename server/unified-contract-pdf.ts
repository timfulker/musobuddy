// UNIFIED: contract-pdf-generator.ts - Single source of truth for contract PDF generation
import puppeteer from 'puppeteer';
import chromium from '@sparticuz/chromium';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { Contract, UserSettings } from '../shared/schema';
import { aiPDFOptimizer } from './core/ai-pdf-optimizer';
import { LRUCache } from 'lru-cache';

// Cache for AI optimization results based on terms pattern
// Key: "terms_count:payment_count:performance_count:cancellation_count:general_count:has_requirements"
const aiOptimizationCache = new LRUCache<string, any>({
  max: 100, // Store up to 100 different patterns
  ttl: 1000 * 60 * 60 * 24 * 7, // Cache for 7 days
});

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
    '#8b5cf6': '#7c3aed', // Purple - darker
    '#0ea5e9': '#0284c7', // Ocean Blue
    '#34d399': '#10b981', // Forest Green
    '#f87171': '#ef4444', // Clean Pro Audio
    '#191970': '#000051', // Midnight Blue - darker
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
    'Performance & Equipment': [],
    'Payment Terms': [],
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
    <!-- Terms & Conditions -->
    <div class="terms-section-container">
        <h2 class="section-header">
            <span class="section-number">04</span>
            <span class="section-title-text">Terms & Conditions</span>
        </h2>`;

  let hasTerms = false;

  // Performance & Equipment first (if exists)
  if (categories['Performance & Equipment'].length > 0) {
    hasTerms = true;
    termsHtml += `
        <div class="terms-category">
            <h3 class="terms-category-title">Performance & Equipment</h3>
            <ul class="terms-list">
                ${categories['Performance & Equipment'].map(term => 
                  `<li class="term-item">${escapeHtml(term)}</li>`
                ).join('')}
            </ul>
        </div>`;
  }

  // Payment Terms (if exists)  
  if (categories['Payment Terms'].length > 0) {
    hasTerms = true;
    termsHtml += `
        <div class="terms-category">
            <h3 class="terms-category-title">Payment Terms</h3>
            <ul class="terms-list">
                ${categories['Payment Terms'].map(term => 
                  `<li class="term-item">${escapeHtml(term)}</li>`
                ).join('')}
            </ul>
        </div>`;
  }

  // Cancellation (if exists)
  if (categories['Cancellation & Rescheduling'].length > 0) {
    hasTerms = true;
    termsHtml += `
        <div class="terms-category">
            <h3 class="terms-category-title">Cancellation & Rescheduling</h3>
            <ul class="terms-list">
                ${categories['Cancellation & Rescheduling'].map(term => 
                  `<li class="term-item">${escapeHtml(term)}</li>`
                ).join('')}
            </ul>
        </div>`;
  }

  // General Terms (if exists)
  if (categories['General Terms'].length > 0) {
    hasTerms = true;
    termsHtml += `
        <div class="terms-category">
            <h3 class="terms-category-title">General Terms</h3>
            <ul class="terms-list">
                ${categories['General Terms'].map(term => 
                  `<li class="term-item">${escapeHtml(term)}</li>`
                ).join('')}
            </ul>
        </div>`;
  }

  termsHtml += `
    </div>`;

  return hasTerms ? termsHtml : '';
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

      // Calculate terms categorization for cache key
      const allClauses = [...selectedClauses, ...customClauses];
      const categories = {
        payment: 0,
        performance: 0,
        cancellation: 0,
        general: 0
      };
      
      allClauses.forEach(clause => {
        const lower = clause.toLowerCase();
        if (lower.includes('payment') || lower.includes('deposit') || lower.includes('fee') || lower.includes('£')) {
          categories.payment++;
        } else if (lower.includes('cancel') || lower.includes('reschedul')) {
          categories.cancellation++;
        } else if (lower.includes('equipment') || lower.includes('venue') || lower.includes('performance') || 
                   lower.includes('stage') || lower.includes('power') || lower.includes('access')) {
          categories.performance++;
        } else {
          categories.general++;
        }
      });
      
      const hasRequirements = !!(contract.specialRequirements || contract.equipmentRequirements);
      const cacheKey = `${allClauses.length}:${categories.payment}:${categories.performance}:${categories.cancellation}:${categories.general}:${hasRequirements}`;
      
      console.log(`🔑 AI optimization cache key: ${cacheKey}`);
      
      // Check cache first
      let aiOptimization = aiOptimizationCache.get(cacheKey);
      
      if (aiOptimization) {
        console.log('✨ Using cached AI optimization (no API call)');
      } else {
        console.log('🤖 Calling AI for new optimization pattern');
        aiOptimization = await aiPDFOptimizer.optimizeContractLayout({
          clientName: contract.clientName || 'Client Name TBC',
          venue: contract.venue || 'Venue TBC',
          venueAddress: contract.venueAddress || 'Venue Address TBC',
          eventDate: contract.eventDate || 'Date TBC',
          selectedClauses,
          customClauses,
          performanceFee: `£${totals.totalAmount.toFixed(2)}`,
          depositAmount: contract.deposit ? `£${parseFloat(contract.deposit).toFixed(2)}` : undefined,
          additionalNotes: contract.specialRequirements || contract.equipmentRequirements,
          // Add terms categorization data for better AI decisions
          termsCount: allClauses.length,
          hasRequirementsSection: hasRequirements,
          categorizedTermsCounts: {
            payment: categories.payment,
            performance: categories.performance,
            cancellation: categories.cancellation,
            general: categories.general
          }
        });
        
        // Cache the result
        aiOptimizationCache.set(cacheKey, aiOptimization);
        console.log(`💾 Cached AI optimization for future use`);
      }

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
        top: '10mm',
        right: '10mm', 
        bottom: '10mm',
        left: '10mm'
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
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap');

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        @page {
            size: A4;
            margin: 0;
        }

        body {
            font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif;
            line-height: 1.6;
            color: #1a1a1a;
            background: white;
            font-size: 11pt;
        }

        /* Page break controls */
        .avoid-break {
            page-break-inside: avoid;
            break-inside: avoid;
        }

        .keep-together {
            page-break-inside: avoid;
            break-inside: avoid;
            orphans: 3;
            widows: 3;
        }

        /* Main container */
        .contract-wrapper {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            background: white;
            position: relative;
        }

        /* BOLD MODERN HEADER */
        .contract-header {
            background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%);
            padding: 40px 40px 30px;
            position: relative;
            overflow: hidden;
        }

        .contract-header::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -10%;
            width: 60%;
            height: 200%;
            background: rgba(255, 255, 255, 0.05);
            transform: rotate(35deg);
        }

        .header-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 25px;
            position: relative;
            z-index: 1;
        }

        .logo-group {
            color: ${headerTextColor};
        }

        .company-name {
            font-size: 32pt;
            font-weight: 800;
            letter-spacing: -1px;
            line-height: 1;
            margin-bottom: 5px;
        }

        .tagline {
            font-size: 13pt;
            opacity: 0.85;
            font-style: italic;
            font-weight: 500;
        }

        .status-badge {
            padding: 10px 24px;
            border-radius: 30px;
            font-size: 11pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .status-draft {
            background: #fbbf24;
            color: #78350f;
        }

        .status-sent {
            background: #60a5fa;
            color: #1e3a8a;
        }

        .status-signed {
            background: #34d399;
            color: #064e3b;
        }

        .header-main {
            position: relative;
            z-index: 1;
        }

        .contract-title {
            font-size: 36pt;
            font-weight: 800;
            color: ${headerTextColor};
            margin-bottom: 10px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .contract-number {
            font-size: 10pt;
            color: ${headerTextColor};
            opacity: 0.8;
            font-family: 'Courier New', monospace;
            letter-spacing: 0.5px;
        }

        /* Content area */
        .contract-content {
            padding: 40px;
        }

        /* Section headers with numbers */
        .section-header {
            display: flex;
            align-items: center;
            margin-bottom: 25px;
            position: relative;
        }

        .section-number {
            background: ${primaryColor};
            color: white;
            width: 35px;
            height: 35px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 14pt;
            margin-right: 15px;
            box-shadow: 0 3px 10px rgba(0,0,0,0.15);
        }

        .section-title-text {
            font-size: 18pt;
            font-weight: 700;
            color: #111;
            flex-grow: 1;
        }

        .section-header::after {
            content: '';
            position: absolute;
            bottom: -8px;
            left: 50px;
            right: 0;
            height: 2px;
            background: linear-gradient(90deg, ${primaryColor}, transparent);
        }

        /* MODERN CARD LAYOUTS */
        .parties-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 25px;
            margin: 30px 0;
        }

        .party-card {
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%);
            border-radius: 15px;
            padding: 25px;
            position: relative;
            overflow: hidden;
            box-shadow: 0 4px 15px rgba(0,0,0,0.08);
            border: 1px solid #e2e8f0;
        }

        .party-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 5px;
            height: 100%;
            background: ${primaryColor};
        }

        .party-type {
            font-size: 10pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            color: ${primaryColor};
            margin-bottom: 15px;
            display: flex;
            align-items: center;
        }

        .party-icon {
            font-size: 16pt;
            margin-right: 10px;
        }

        .party-name {
            font-size: 14pt;
            font-weight: 700;
            color: #111;
            margin-bottom: 12px;
        }

        .party-details {
            font-size: 10pt;
            color: #4b5563;
            line-height: 1.8;
        }

        .party-details strong {
            color: #1f2937;
            font-weight: 600;
        }

        /* Performance details grid */
        .details-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin: 30px 0;
        }

        .detail-card {
            background: white;
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            padding: 20px;
            transition: all 0.3s;
            box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }

        .detail-card:hover {
            border-color: ${primaryColor};
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }

        .detail-label {
            font-size: 9pt;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #6b7280;
            margin-bottom: 8px;
        }

        .detail-value {
            font-size: 14pt;
            font-weight: 700;
            color: #111;
        }

        /* FINANCIAL SECTION - BOLD & MODERN */
        .financial-container {
            background: linear-gradient(135deg, ${primaryColor}15 0%, ${secondaryColor}10 100%);
            border: 3px solid ${primaryColor};
            border-radius: 20px;
            padding: 30px;
            margin: 30px 0;
            position: relative;
            box-shadow: 0 8px 25px rgba(0,0,0,0.08);
        }

        .financial-title {
            text-align: center;
            font-size: 16pt;
            font-weight: 700;
            color: ${primaryColor};
            margin-bottom: 25px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .payment-boxes {
            display: flex;
            justify-content: space-around;
            gap: 20px;
        }

        .payment-box {
            background: white;
            border-radius: 15px;
            padding: 20px;
            text-align: center;
            flex: 1;
            box-shadow: 0 4px 15px rgba(0,0,0,0.06);
            border: 2px solid transparent;
        }

        .payment-box.highlight {
            border-color: ${primaryColor};
            transform: scale(1.05);
        }

        .payment-label {
            font-size: 9pt;
            font-weight: 600;
            text-transform: uppercase;
            color: #6b7280;
            margin-bottom: 10px;
            letter-spacing: 0.5px;
        }

        .payment-amount {
            font-size: 24pt;
            font-weight: 800;
            color: ${primaryColor};
            line-height: 1;
        }

        .payment-note {
            font-size: 8pt;
            color: #6b7280;
            margin-top: 8px;
        }

        /* Requirements section */
        .requirements-container {
            margin: 30px 0;
        }

        .requirement-box {
            background: #fef3c7;
            border-left: 5px solid #f59e0b;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 15px;
        }

        .requirement-title {
            font-size: 11pt;
            font-weight: 700;
            color: #92400e;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .requirement-text {
            font-size: 10pt;
            color: #78350f;
            line-height: 1.8;
        }

        /* TERMS SECTION - CLEAN & ORGANIZED */
        .terms-section-container {
            margin: 40px 0;
            page-break-inside: auto;
        }

        .terms-category {
            background: #f9fafb;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
            border: 1px solid #e5e7eb;
            page-break-inside: avoid;
        }

        .terms-category-title {
            font-size: 12pt;
            font-weight: 700;
            color: #1f2937;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid ${primaryColor}30;
        }

        .terms-list {
            list-style: none;
            padding: 0;
        }

        .term-item {
            position: relative;
            padding-left: 30px;
            margin-bottom: 12px;
            font-size: 10pt;
            color: #4b5563;
            line-height: 1.8;
            page-break-inside: avoid;
        }

        .term-item::before {
            content: '✓';
            position: absolute;
            left: 0;
            top: 0;
            width: 20px;
            height: 20px;
            background: ${primaryColor};
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: bold;
        }

        /* SIGNATURE SECTION - PROFESSIONAL */
        .signature-container {
            margin-top: 50px;
            padding: 30px;
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            border-radius: 20px;
            page-break-inside: avoid;
        }

        .signature-header {
            text-align: center;
            margin-bottom: 30px;
        }

        .signature-title {
            font-size: 18pt;
            font-weight: 700;
            color: #111;
            margin-bottom: 10px;
        }

        .signature-instruction {
            font-size: 10pt;
            color: #6b7280;
        }

        .signature-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
        }

        .signature-box {
            background: white;
            border: 3px dashed #cbd5e1;
            border-radius: 15px;
            padding: 30px;
            text-align: center;
            min-height: 180px;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }

        .signature-box.signed {
            border: 3px solid ${primaryColor};
            background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
        }

        .signer-role {
            font-size: 10pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #6b7280;
            margin-bottom: 15px;
        }

        .signer-name {
            font-size: 14pt;
            font-weight: 700;
            color: #111;
            margin: 10px 0;
        }

        .signature-date {
            font-size: 9pt;
            color: #6b7280;
            margin-top: 10px;
        }

        .signature-checkmark {
            color: #10b981;
            font-size: 20pt;
            margin-bottom: 10px;
        }

        /* Footer */
        .contract-footer {
            background: #1f2937;
            color: white;
            padding: 30px 40px;
            text-align: center;
            margin-top: 50px;
        }

        .footer-content {
            font-size: 9pt;
            opacity: 0.9;
            line-height: 1.8;
        }

        .footer-brand {
            font-weight: 700;
            font-size: 11pt;
            color: ${primaryColor};
        }

        /* Print optimizations */
        @media print {
            body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
            }

            .contract-header {
                break-after: avoid;
            }

            .keep-together {
                break-inside: avoid;
            }

            .signature-container {
                break-before: auto;
                break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="contract-wrapper">
        <!-- BOLD MODERN HEADER -->
        <div class="contract-header avoid-break">
            <div class="header-top">
                <div class="logo-group">
                    <div class="company-name">MusoBuddy</div>
                    <div class="tagline">Less admin, more music</div>
                </div>
                <div class="status-badge status-${contract.status}">
                    ${contract.status === 'draft' ? 'DRAFT' : contract.status === 'sent' ? 'SENT' : 'EXECUTED'}
                </div>
            </div>
            <div class="header-main">
                <h1 class="contract-title">Performance Contract</h1>
                <div class="contract-number">Contract #${contract.contractNumber}</div>
            </div>
        </div>

        <div class="contract-content">
            <!-- CONTRACT PARTIES -->
            <div class="keep-together">
                <h2 class="section-header">
                    <span class="section-number">01</span>
                    <span class="section-title-text">Contract Parties</span>
                </h2>

                <div class="parties-container">
                    <div class="party-card">
                        <div class="party-type">
                            <span class="party-icon">🎵</span>
                            PERFORMER
                        </div>
                        <div class="party-name">${businessName}</div>
                        <div class="party-details">
                            ${userSettings?.businessEmail ? `<strong>Email:</strong> ${userSettings.businessEmail}<br>` : ''}
                            ${userSettings?.phone ? `<strong>Phone:</strong> ${userSettings.phone}<br>` : ''}
                            ${userSettings ? `<strong>Address:</strong><br>${formatBusinessAddress(userSettings)}` : ''}
                        </div>
                    </div>

                    <div class="party-card">
                        <div class="party-type">
                            <span class="party-icon">👤</span>
                            CLIENT
                        </div>
                        <div class="party-name">${contract.clientName || 'Client Name TBC'}</div>
                        <div class="party-details">
                            ${contract.clientEmail ? `<strong>Email:</strong> ${contract.clientEmail}<br>` : ''}
                            ${contract.clientPhone ? `<strong>Phone:</strong> ${contract.clientPhone}<br>` : ''}
                            ${contract.clientAddress ? `<strong>Address:</strong><br>${contract.clientAddress.replace(/\n/g, '<br>')}` : ''}
                        </div>
                    </div>
                </div>
            </div>

            <!-- PERFORMANCE DETAILS -->
            <div class="keep-together">
                <h2 class="section-header">
                    <span class="section-number">02</span>
                    <span class="section-title-text">Performance Details</span>
                </h2>

                <div class="details-grid">
                    <div class="detail-card">
                        <div class="detail-label">📅 Event Date</div>
                        <div class="detail-value">${eventDateStr.split(',')[0]}<br><span style="font-size: 11pt; font-weight: 500;">${eventDateStr.split(',').slice(1).join(',')}</span></div>
                    </div>
                    <div class="detail-card">
                        <div class="detail-label">⏰ Performance Time</div>
                        <div class="detail-value">${contract.eventTime || 'TBC'} - ${contract.eventEndTime || 'TBC'}</div>
                    </div>
                    <div class="detail-card">
                        <div class="detail-label">📍 Venue</div>
                        <div class="detail-value">${contract.venue || 'Venue TBC'}</div>
                    </div>
                    <div class="detail-card">
                        <div class="detail-label">🗺️ Venue Address</div>
                        <div class="detail-value" style="font-size: 11pt;">${contract.venueAddress || 'Address TBC'}</div>
                    </div>
                </div>
            </div>

            <!-- FINANCIAL TERMS -->
            <div class="keep-together">
                <h2 class="section-header">
                    <span class="section-number">03</span>
                    <span class="section-title-text">Financial Terms</span>
                </h2>

                <div class="financial-container">
                    <h3 class="financial-title">Performance Fee Structure</h3>
                    <div class="payment-boxes">
                        <div class="payment-box ${depositAmount === 0 ? 'highlight' : ''}">
                            <div class="payment-label">Total Performance Fee</div>
                            <div class="payment-amount">£${totals.totalAmount.toFixed(2)}</div>
                        </div>
                        ${depositAmount > 0 ? `
                        <div class="payment-box">
                            <div class="payment-label">Deposit Required</div>
                            <div class="payment-amount">£${depositAmount.toFixed(2)}</div>
                            <div class="payment-note">Non-refundable</div>
                        </div>
                        <div class="payment-box highlight">
                            <div class="payment-label">Balance Due</div>
                            <div class="payment-amount">£${(totals.totalAmount - depositAmount).toFixed(2)}</div>
                            <div class="payment-note">On performance day</div>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>

            <!-- PERFORMANCE REQUIREMENTS -->
            ${(contract.equipmentRequirements || contract.specialRequirements) ? `
            <div class="keep-together">
                <h2 class="section-header">
                    <span class="section-number">04</span>
                    <span class="section-title-text">Performance Requirements</span>
                </h2>

                <div class="requirements-container">
                    ${contract.equipmentRequirements ? `
                    <div class="requirement-box">
                        <div class="requirement-title">🎤 Equipment Requirements</div>
                        <div class="requirement-text">${contract.equipmentRequirements.replace(/\n/g, '<br>')}</div>
                    </div>
                    ` : ''}
                    ${contract.specialRequirements ? `
                    <div class="requirement-box">
                        <div class="requirement-title">⭐ Special Requirements</div>
                        <div class="requirement-text">${contract.specialRequirements.replace(/\n/g, '<br>')}</div>
                    </div>
                    ` : ''}
                </div>
            </div>
            ` : ''}

            <!-- TERMS & CONDITIONS -->
            ${userSettings?.themeShowTerms !== false ? generateTermsSection(userSettings, contract) : ''}

            <!-- SIGNATURE SECTION -->
            <div class="signature-container keep-together">
                <div class="signature-header">
                    <h2 class="signature-title">Digital Signatures</h2>
                    <p class="signature-instruction">
                        By signing below, both parties agree to the terms and conditions set forth in this contract.
                    </p>
                </div>

                <div class="signature-grid">
                    <div class="signature-box signed">
                        <div class="signature-checkmark">✓</div>
                        <div class="signer-role">PERFORMER</div>
                        <div class="signer-name">${businessName}</div>
                        <div class="signature-date">
                            Digitally signed on ${new Date(contract.createdAt || new Date()).toLocaleDateString('en-GB')}
                        </div>
                    </div>

                    <div class="signature-box ${isSigned ? 'signed' : ''}">
                        ${isSigned ? '<div class="signature-checkmark">✓</div>' : ''}
                        <div class="signer-role">CLIENT</div>
                        <div class="signer-name">${isSigned ? signatureName : contract.clientName}</div>
                        <div class="signature-date">
                            ${isSigned && signedAt ? 
                                `Digitally signed on ${signedAt.toLocaleDateString('en-GB')}` : 
                                'Awaiting signature'
                            }
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- FOOTER -->
        <div class="contract-footer avoid-break">
            <div class="footer-content">
                Contract generated on ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB')}<br>
                <span class="footer-brand">MusoBuddy</span> • Professional Music Business Management<br>
                Empowering musicians with professional business tools
            </div>
        </div>
    </div>
</body>
</html>
  `;
}

// Additional export for services.ts compatibility
export default {
  generateContractPDF
};