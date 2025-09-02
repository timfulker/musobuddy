// UNIFIED: contract-pdf-generator.ts - Single source of truth for contract PDF generation
import puppeteer from 'puppeteer';
import chromium from '@sparticuz/chromium';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { Contract, UserSettings } from '../shared/schema';
import { aiPDFOptimizer } from './core/ai-pdf-optimizer';
// Import the booking calculation functions
// Note: We'll inline the logic to avoid import issues between server and client

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

// Helper function to generate terms section (moved out of template literal to avoid parsing issues)
function getTermsSection(userSettings: UserSettings | null, contract?: any): string {
  // Standard clauses mapping - expanded set
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
  
  // Helper function to escape HTML
  const escapeHtml = (text: string): string => {
    return text
      .split('&').join('&amp;')
      .split('<').join('&lt;')
      .split('>').join('&gt;')
      .split('"').join('&quot;')
      .split("'").join('&#39;')
      .split('`').join('&#96;')
      .split('$').join('&#36;');
  };
  
  // Get selected standard clauses
  const selectedClauses: string[] = [];
  if (userSettings?.contractClauses) {
    for (const [key, value] of Object.entries(userSettings.contractClauses)) {
      if (value && clauseMap[key as keyof typeof clauseMap]) {
        selectedClauses.push(clauseMap[key as keyof typeof clauseMap]);
      }
    }
  }
  
  // Get custom clauses - handle new format with {text, enabled} objects
  const customClauses: string[] = [];
  if (userSettings?.customClauses && Array.isArray(userSettings.customClauses)) {
    userSettings.customClauses.forEach(clause => {
      // Handle new format: {text: string, enabled: boolean}
      if (typeof clause === 'object' && clause.text && clause.enabled) {
        customClauses.push(clause.text);
      }
      // Handle legacy format: string
      else if (typeof clause === 'string' && clause.trim()) {
        customClauses.push(clause);
      }
    });
  }
  // Add conditional deposit clause if deposit amount is specified
  if (contract && contract.deposit && parseFloat(contract.deposit) > 0) {
    const depositAmount = parseFloat(contract.deposit).toFixed(2);
    const depositDays = contract.depositDays || 7;
    const depositClause = `This Agreement becomes legally binding upon signature by both parties. The Client agrees to pay a non-refundable booking fee of £${depositAmount} within ${depositDays} days of signing. The booking will not be confirmed until the booking fee is received, and the Artist reserves the right to release the date if payment is not made.`;
    selectedClauses.unshift(depositClause); // Add at the beginning since it's a critical clause
  }
  
  const allClauses = [...selectedClauses, ...customClauses].filter(clause => clause && clause.trim());
  
  // Group terms by category for better organization (matching signing page)
  const paymentTerms: string[] = [];
  const performanceTerms: string[] = [];
  const cancellationTerms: string[] = [];
  const generalTerms: string[] = [];
  
  // Categorize each clause based on keywords
  allClauses.forEach(clause => {
    const lowerClause = clause.toLowerCase();
    if (lowerClause.includes('payment') || lowerClause.includes('deposit') || lowerClause.includes('fee') || 
        lowerClause.includes('£') || lowerClause.includes('charged') || lowerClause.includes('overtime')) {
      paymentTerms.push(clause);
    } else if (lowerClause.includes('cancellation') || lowerClause.includes('cancel') || 
               lowerClause.includes('reschedul') || lowerClause.includes('refund')) {
      cancellationTerms.push(clause);
    } else if (lowerClause.includes('performance') || lowerClause.includes('equipment') || 
               lowerClause.includes('venue') || lowerClause.includes('stage') || lowerClause.includes('setup') ||
               lowerClause.includes('access') || lowerClause.includes('power') || lowerClause.includes('sound')) {
      performanceTerms.push(clause);
    } else {
      generalTerms.push(clause);
    }
  });
  
  let termsHtml = '';
  
  // If user has selected clauses, organize them into categories
  if (allClauses.length > 0) {
    termsHtml = `
    <!-- Terms & Conditions -->
    <div class="section">
        <h2 class="section-title">Terms & Conditions</h2>`;
    
    // Add Performance & Equipment section if there are terms
    if (performanceTerms.length > 0) {
      termsHtml += `
        <div class="terms-subsection">
          <h3 class="terms-subtitle">Performance & Equipment</h3>
          <div class="requirements-box">
            ${performanceTerms.map(term => `• ${escapeHtml(term)}`).join('<br>')}
          </div>
        </div>`;
    }
    
    // Add Payment Terms section if there are terms
    if (paymentTerms.length > 0) {
      termsHtml += `
        <div class="terms-subsection">
          <h3 class="terms-subtitle">Payment Terms</h3>
          <div class="requirements-box">
            ${paymentTerms.map(term => `• ${escapeHtml(term)}`).join('<br>')}
          </div>
        </div>`;
    }
    
    // Add Cancellation & Rescheduling section if there are terms
    if (cancellationTerms.length > 0) {
      termsHtml += `
        <div class="terms-subsection">
          <h3 class="terms-subtitle">Cancellation & Rescheduling</h3>
          <div class="requirements-box">
            ${cancellationTerms.map(term => `• ${escapeHtml(term)}`).join('<br>')}
          </div>
        </div>`;
    }
    
    // Add General Terms section if there are terms
    if (generalTerms.length > 0) {
      termsHtml += `
        <div class="terms-subsection">
          <h3 class="terms-subtitle">General Terms</h3>
          <div class="requirements-box">
            ${generalTerms.map(term => `• ${escapeHtml(term)}`).join('<br>')}
          </div>
        </div>`;
    }
    
    // If no categorization happened (shouldn't occur), fall back to simple list
    if (performanceTerms.length === 0 && paymentTerms.length === 0 && 
        cancellationTerms.length === 0 && generalTerms.length === 0) {
      termsHtml += `
        <div class="terms-section">
          <div class="requirements-box">
            ${allClauses.map(clause => `• ${escapeHtml(clause)}`).join('<br>')}
          </div>
        </div>`;
    }
    
    termsHtml += `
    </div>`;
  } else {
    // Fallback to default terms if no custom terms are configured
    const defaultTerms = [
      "Payment due within 30 days of performance",
      "50% deposit required to secure booking (non-refundable)",
      "Cancellations within 7 days forfeit deposit",
      "All equipment remains property of performer",
      "Client must provide adequate and safe power supply",
      "Client must provide safe and reasonable venue access for load-in/out",
      "Client must provide weather protection for outdoor events",
      "No recording or broadcasting without performer's written consent",
      "Neither party liable for cancellation due to events beyond their control"
    ];
    
    termsHtml = `
    <!-- Terms & Conditions -->
    <div class="section">
        <h2 class="section-title">Terms & Conditions</h2>
        <div class="terms-section">
          <div class="requirements-box">
            ${defaultTerms.map(term => `• ${escapeHtml(term)}`).join('<br>')}
          </div>
        </div>
    </div>`;
  }
  
  return termsHtml;
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
    
    // AI-powered PDF optimization
    try {
      console.log('🤖 Analyzing contract content for AI optimization...');
      
      // Extract selected clauses for AI analysis
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
          deposit: "50% deposit required to secure booking (non-refundable)",
          balancePayment: "Remaining fee due before event / on the day",
          cancellation: "Cancellations within 7 days forfeit deposit",
          equipment: "All equipment remains property of performer",
          power: "Client must provide adequate and safe power supply",
          access: "Client must provide safe and reasonable venue access",
          weather: "Client must provide weather protection for outdoor events",
          numbers: "Final guest numbers must be confirmed 48 hours prior",
          recording: "No recording or broadcasting without written consent",
          forceMajeure: "Neither party liable for cancellation due to force majeure",
          publicLiability: "Public Liability Insurance: Covered for all performance services",
          alcoholPolicy: "Alcohol Policy: Performer reserves the right to refuse service in unsafe environments",
          soundLevels: "Sound Levels: Performance will comply with venue and local authority requirements",
          overtime: "Overtime: Additional charges apply for performances extending beyond agreed time",
          merchandising: "Merchandising: Performer retains rights to sell merchandise unless otherwise agreed",
          imageRights: "Image Rights: Performer may use event images/videos for promotional purposes unless restricted",
          substitution: "Substitution: Performer may provide suitable substitute if unable to perform due to illness",
          disputes: "Disputes: Any disagreements will be resolved through mediation before legal action"
        };
        
        for (const [key, value] of Object.entries(clauseMap)) {
          if (userSettings.contractClauses[key as keyof typeof clauseMap]) {
            selectedClauses.push(value);
          }
        }
      }
      
      // Add custom clauses - handle new format with {text, enabled} objects
      if (userSettings?.customClauses && Array.isArray(userSettings.customClauses)) {
        userSettings.customClauses.forEach(clause => {
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
      
      // Apply AI adjustments to HTML
      if (Object.keys(aiOptimization.adjustments).length > 0) {
        console.log('✅ Applying AI adjustments:', aiOptimization.reasoning);
        
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
        .container {
          ${customCSS}
        }
        .section {
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

  const logoBase64 = getLogoBase64();
  const logoHtml = logoBase64 ? `<img src="data:image/png;base64,${logoBase64}" style="height: 50px; width: auto;" alt="MusoBuddy Logo" />` : '';

  // Determine if contract is signed and get signature info
  const isSigned = contract.status === 'signed' || signatureDetails;
  const signedAt = signatureDetails?.signedAt || (contract.signedAt ? new Date(contract.signedAt) : null);
  const signatureName = signatureDetails?.signatureName || contract.clientSignature || 'Digital Signature';

  // Get dynamic theme colors
  const primaryColor = getThemeColor(userSettings);
  const secondaryColor = getSecondaryColor(primaryColor);
  
  // Calculate WCAG 2.0 text contrast (same as invoice system)
  const headerTextColor = getContrastTextColor(primaryColor);
  const luminanceValue = getLuminance(primaryColor);
  
  // Make logo text luminance-aware for better visibility
  const logoColor = headerTextColor; // Use same luminance logic as header text
  
  console.log(`🎨 CONTRACT PDF: Using theme colors - Primary: ${primaryColor}, Secondary: ${secondaryColor}`);
  console.log(`🎨 LUMINANCE: Color ${primaryColor} has luminance ${luminanceValue.toFixed(3)} → Text color: ${headerTextColor}`);
  console.log(`🎨 LOGO: Using luminance-aware logo text (${logoColor}) for optimal visibility`);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Performance Contract - ${contract.contractNumber}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            background: #ffffff;
        }
        
        .contract-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
            border-radius: 12px;
            overflow: hidden;
        }
        
        /* Header */
        .contract-header {
            background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%);
            color: ${headerTextColor};
            padding: 40px;
            text-align: center;
            position: relative;
        }
        
        .logo-section {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 25px;
            margin-bottom: 30px;
        }
        
        .metronome-container {
            width: 80px;
            height: 80px;
            background: #191970;
            border-radius: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 10px 30px rgba(25, 25, 112, 0.3);
            flex-shrink: 0;
        }
        
        .metronome-body {
            width: 24px;
            height: 38px;
            background: white;
            clip-path: polygon(25% 0%, 75% 0%, 100% 100%, 0% 100%);
            position: relative;
        }
        
        .metronome-arm {
            position: absolute;
            top: 8px;
            left: 50%;
            transform: translateX(-50%) rotate(10deg);
            width: 2.5px;
            height: 24px;
            background: #191970;
            border-radius: 1px;
            transform-origin: bottom center;
        }
        
        .company-name {
            font-size: 42px;
            font-weight: 700;
            letter-spacing: -1px;
            color: ${logoColor};
            line-height: 1;
            margin-bottom: 8px;
        }
        
        .tagline {
            font-size: 18px;
            color: ${headerTextColor};
            opacity: 0.8;
            font-style: italic;
            font-weight: 500;
        }
        
        .contract-title {
            font-size: 32px;
            font-weight: 800;
            margin: 25px 0 15px 0;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        
        .contract-number {
            font-size: 16px;
            opacity: 0.9;
            font-weight: 500;
        }
        
        /* Status Badge */
        .status-badge {
            position: absolute;
            top: 20px;
            right: 20px;
            padding: 10px 18px;
            border-radius: 25px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
            backdrop-filter: blur(10px);
        }
        
        .status-signed {
            background: rgba(16, 185, 129, 0.9);
            color: white;
        }
        
        .status-sent {
            background: rgba(59, 130, 246, 0.9);
            color: white;
        }
        
        .status-draft {
            background: rgba(107, 114, 128, 0.9);
            color: white;
        }
        
        /* Content */
        .contract-content {
            padding: 40px;
        }
        
        .section {
            margin-bottom: 35px;
            break-inside: avoid-page;
        }
        
        .section-title {
            font-size: 22px;
            font-weight: 700;
            color: #000000;
            margin-bottom: 25px;
            padding-bottom: 10px;
            border-bottom: 3px solid ${secondaryColor};
        }
        
        /* Parties Section */
        .parties-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 25px;
        }
        
        .party-box {
            background: linear-gradient(135deg, #f8f9ff 0%, #e3e7ff 100%);
            padding: 25px;
            border-radius: 12px;
            border-left: 4px solid \${primaryColor};
            border: 1px solid #e2e8f0;
        }
        
        .party-title {
            font-size: 16px;
            font-weight: 700;
            color: #000000;
            margin-bottom: 15px;
        }
        
        .party-details {
            font-size: 15px;
            line-height: 1.6;
        }
        
        .party-details {
            color: #4a5568;
        }
        
        .party-details strong {
            color: #2d3748;
        }
        
        /* Event Details Grid */
        .event-details {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin-bottom: 25px;
            break-inside: avoid;
            page-break-inside: avoid;
        }
        
        .detail-card {
            background: linear-gradient(135deg, #f8f9ff 0%, #e3e7ff 100%);
            padding: 20px;
            border-radius: 10px;
            border-left: 4px solid \${primaryColor};
            border: 1px solid #e2e8f0;
            break-inside: avoid;
            page-break-inside: avoid;
        }
        
        .detail-label {
            font-size: 12px;
            font-weight: 600;
            color: #000000;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
        }
        
        .detail-value {
            font-size: 18px;
            font-weight: 700;
            color: #2d3748;
        }
        
        /* Venue Details Group - Keep venue fields together */
        .venue-details-group {
            break-inside: avoid;
            page-break-inside: avoid;
            break-before: avoid;
        }
        
        /* Payment Section - Updated to remove red and match invoice style */
        .payment-section {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border: 2px solid \${primaryColor};
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 20px;
        }
        
        .payment-title {
            font-size: 20px;
            font-weight: 700;
            color: #000000;
            text-align: center;
            margin-bottom: 25px;
        }
        
        .payment-details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 20px;
            margin-bottom: 25px;
        }
        
        .payment-item {
            text-align: center;
            padding: 20px;
            background: white;
            border-radius: 10px;
            border: 2px solid #e2e8f0;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        
        .payment-label {
            font-size: 12px;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 10px;
        }
        
        .payment-amount {
            font-size: 26px;
            font-weight: 800;
            color: #000000;
        }
        
        .payment-instructions {
            background: white;
            padding: 20px;
            border-radius: 10px;
            border: 2px solid #e2e8f0;
            margin-top: 20px;
        }
        
        .payment-instructions strong {
            color: #000000;
            font-size: 16px;
        }
        
        /* Terms */
        .terms-section {
            margin-top: 20px;
        }
        
        .terms-subsection {
            margin-bottom: 25px;
        }
        
        .terms-subsection:last-child {
            margin-bottom: 0;
        }
        
        .terms-subtitle {
            font-size: 16px;
            font-weight: 700;
            color: #1f2937;
            margin-bottom: 12px;
            padding-bottom: 6px;
            border-bottom: 2px solid #e5e7eb;
        }
        
        .terms-list {
            list-style: none;
            padding: 0;
        }
        
        .terms-list li {
            background: #f9fafb;
            margin-bottom: 10px;
            padding: 15px 20px;
            border-radius: 8px;
            border-left: 4px solid \${primaryColor};
            position: relative;
            color: #4a5568;
        }
        
        .terms-list li:before {
            content: "✓";
            color: \${primaryColor};
            font-weight: bold;
            margin-right: 10px;
        }
        
        .requirements-box {
            background: #f9fafb;
            padding: 20px;
            border-radius: 10px;
            border-left: 4px solid \${primaryColor};
            border: 1px solid #e2e8f0;
            color: #4a5568;
            line-height: 1.8;
            font-size: 15px;
        }
        

        
        /* Signature section */
        .signature-section {
            margin-top: 50px;
            padding-top: 40px;
            border-top: 2px dashed #cbd5e1;
            page-break-inside: avoid;
        }
        
        .signature-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-top: 30px;
        }
        
        .signature-box {
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            border: 2px dashed #94a3b8;
            border-radius: 12px;
            padding: 30px;
            text-align: center;
            min-height: 150px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }
        
        .signed-box {
            border: 2px solid \${primaryColor};
            background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
        }
        
        .signature-role {
            font-size: 14px;
            font-weight: 600;
            color: #64748b;
            margin-bottom: 20px;
        }
        
        .signature-line {
            border-top: 2px solid #334155;
            margin: 20px auto;
            width: 200px;
        }
        
        .signature-name {
            font-size: 16px;
            font-weight: 700;
            color: #1e293b;
            margin-top: 15px;
        }
        
        .signature-date {
            font-size: 13px;
            color: #64748b;
            margin-top: 10px;
        }
        
        .signature-status {
            font-size: 11px;
            margin-top: 10px;
        }
        
        /* Footer */
        .contract-footer {
            background: #f8f9fa;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
            margin-top: 30px;
        }
        
        .footer-text {
            font-size: 12px;
            color: #64748b;
            line-height: 1.6;
        }
        
        .footer-logo {
            font-weight: 700;
            color: ${primaryColor};
        }
        
        /* Print optimizations */
        @media print {
            .contract-container {
                box-shadow: none;
                border-radius: 0;
            }
            
            .signature-section {
                page-break-inside: avoid;
                break-inside: avoid;
            }
            
            .signature-grid {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="contract-container">
        <!-- Header -->
        <div class="contract-header">
            <div class="status-badge status-${contract.status}">
                ${contract.status.toUpperCase()}
            </div>
            <div class="logo-section">
                <div class="metronome-container">
                    <div class="metronome-body">
                        <div class="metronome-arm"></div>
                    </div>
                </div>
                <div>
                    <div class="company-name">MusoBuddy</div>
                    <div class="tagline">Less admin, more music</div>
                </div>
            </div>
            <div class="contract-title">Performance Contract</div>
            <div class="contract-number">Contract #${contract.contractNumber}</div>
        </div>

        <!-- Main Content -->
        <div class="contract-content">
            <!-- Parties Section -->
            <div class="section">
                <h2 class="section-title">Contract Parties</h2>
                <div class="parties-section">
                    <div class="party-box">
                        <div class="party-title">🎵 PERFORMER</div>
                        <div class="party-details">
                            <strong>${businessName}</strong><br>
                            ${userSettings?.businessEmail ? `Email: ${userSettings.businessEmail}<br>` : ''}
                            ${userSettings?.phone ? `Phone: ${userSettings.phone}<br>` : ''}
                            ${formatBusinessAddress(userSettings)}
                        </div>
                    </div>
                    <div class="party-box">
                        <div class="party-title">👤 CLIENT</div>
                        <div class="party-details">
                            <strong>${contract.clientName}</strong><br>
                            ${contract.clientEmail ? `Email: ${contract.clientEmail}<br>` : ''}
                            ${contract.clientPhone ? `Phone: ${contract.clientPhone}<br>` : ''}
                            ${contract.clientAddress ? contract.clientAddress.replace(/\n/g, '<br>') : ''}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Event Details -->
            <div class="section">
                <h2 class="section-title">Performance Details</h2>
                <div class="event-details">
                    <div class="detail-card">
                        <div class="detail-label">Event Date</div>
                        <div class="detail-value">${eventDateStr}</div>
                    </div>
                    <div class="detail-card">
                        <div class="detail-label">Performance Time</div>
                        <div class="detail-value">${contract.eventTime || 'TBC'} - ${contract.eventEndTime || 'TBC'}</div>
                    </div>
                </div>
                
                <!-- Venue details in separate group to avoid page breaks -->
                <div class="venue-details-group">
                    <div class="event-details">
                        <div class="detail-card">
                            <div class="detail-label">Venue</div>
                            <div class="detail-value">${contract.venue || 'TBC'}</div>
                        </div>
                        <div class="detail-card">
                            <div class="detail-label">Venue Address</div>
                            <div class="detail-value">${contract.venueAddress || 'See venue name'}</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Payment Terms -->
            <div class="section">
                <h2 class="section-title">Financial Terms</h2>
                <div class="payment-section">
                    <div class="payment-title">Performance Fee Structure</div>
                    <div class="payment-details">
                        ${(() => {
                            const totals = calculateContractTotals(contract, userSettings);
                            const depositAmount = parseFloat(contract.deposit || '0');
                            return totals.showSeparateTravel ? `
                        <div class="payment-item">
                            <div class="payment-label">Performance Fee</div>
                            <div class="payment-amount">£${totals.performanceFee.toFixed(2)}</div>
                        </div>
                        <div class="payment-item">
                            <div class="payment-label">Travel Expenses</div>
                            <div class="payment-amount">£${totals.travelExpenses.toFixed(2)}</div>
                        </div>
                        <div class="payment-item" style="border-top: 1px solid #e5e7eb; padding-top: 8px; margin-top: 8px; font-weight: bold;">
                            <div class="payment-label">Total Fee</div>
                            <div class="payment-amount">£${totals.totalAmount.toFixed(2)}</div>
                        </div>
                        ${depositAmount > 0 ? `
                        <div class="payment-item">
                            <div class="payment-label">Deposit Required</div>
                            <div class="payment-amount">£${depositAmount.toFixed(2)}</div>
                        </div>
                        <div class="payment-item">
                            <div class="payment-label">Balance Due</div>
                            <div class="payment-amount">£${(totals.totalAmount - depositAmount).toFixed(2)}</div>
                        </div>
                        ` : ''}
                        ` : `
                        <div class="payment-item">
                            <div class="payment-label">Total Performance Fee</div>
                            <div class="payment-amount">£${totals.totalAmount.toFixed(2)}</div>
                        </div>
                        ${depositAmount > 0 ? `
                        <div class="payment-item">
                            <div class="payment-label">Deposit Required</div>
                            <div class="payment-amount">£${depositAmount.toFixed(2)}</div>
                        </div>
                        <div class="payment-item">
                            <div class="payment-label">Balance Due</div>
                            <div class="payment-amount">£${(totals.totalAmount - depositAmount).toFixed(2)}</div>
                        </div>
                        ` : ''}
                        `;
                        })()}
                    </div>
                    
                    ${contract.paymentInstructions ? `
                    <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #fecaca;">
                        <strong>Payment Instructions:</strong><br>
                        ${contract.paymentInstructions.replace(/\n/g, '<br>')}
                    </div>
                    ` : ''}
                </div>
            </div>

            <!-- Requirements -->
            ${(contract.equipmentRequirements || contract.specialRequirements) ? `
            <div class="section">
                <h2 class="section-title">Performance Requirements</h2>
                ${contract.equipmentRequirements ? `
                <div class="terms-section">
                    <div class="terms-subtitle">Equipment Requirements</div>
                    <p style="background: #f9fafb; padding: 15px; border-radius: 8px; border-left: 3px solid ${primaryColor};">
                        ${contract.equipmentRequirements.replace(/\n/g, '<br>')}
                    </p>
                </div>
                ` : ''}
                ${contract.specialRequirements ? `
                <div class="terms-section">
                    <div class="terms-subtitle">Special Requirements</div>
                    <p style="background: #f9fafb; padding: 15px; border-radius: 8px; border-left: 3px solid ${primaryColor};">
                        ${contract.specialRequirements.replace(/\n/g, '<br>')}
                    </p>
                </div>
                ` : ''}
            </div>
            ` : ''}

${userSettings?.themeShowTerms !== false ? getTermsSection(userSettings, contract) : ''}
            </div>

            <!-- Signature Section -->
            <div class="signature-section">
                <h2 class="section-title">Digital Signatures</h2>
                <p style="text-align: center; color: #64748b; margin-bottom: 20px;">
                    By signing below, both parties agree to the terms and conditions set forth in this contract.
                </p>
                
                <div class="signature-grid">
                    <!-- Performer Signature -->
                    <div class="signature-box signed-box">
                        <div class="signature-role">PERFORMER</div>
                        <div class="signature-line"></div>
                        <div class="signature-name">${businessName}</div>
                        <div class="signature-date">Digital signature by contract generation</div>
                        <div class="signature-status" style="color: #10b981;">✓ Signed on ${new Date(contract.createdAt || new Date()).toLocaleDateString('en-GB')}</div>
                    </div>
                    
                    <!-- Client Signature -->
                    <div class="signature-box ${isSigned ? 'signed-box' : ''}">
                        <div class="signature-role">CLIENT</div>
                        ${isSigned && signedAt ? `
                            <div class="signature-line"></div>
                            <div class="signature-name">${signatureName}</div>
                            <div class="signature-date">Digitally signed on ${signedAt.toLocaleDateString('en-GB')}</div>
                            <div class="signature-status" style="color: ${primaryColor};">✓ Signed at ${signedAt.toLocaleTimeString('en-GB')}</div>
                        ` : `
                            <div class="signature-line"></div>
                            <div class="signature-name">${contract.clientName}</div>
                            <div class="signature-date">Date: _______________</div>
                            <div class="signature-status" style="color: #94a3b8;">${contract.status === 'sent' ? 'Awaiting digital signature' : 'Unsigned'}</div>
                        `}
                    </div>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <div class="contract-footer">
            <div class="footer-text">
                Contract generated on ${new Date(contract.createdAt || new Date()).toLocaleDateString('en-GB')}<br>
                <span class="footer-logo">MusoBuddy</span> - Less admin, more music<br>
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