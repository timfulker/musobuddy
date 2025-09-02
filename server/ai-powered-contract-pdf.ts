// AI-POWERED: Complete HTML generation for contract PDFs
import puppeteer from 'puppeteer';
import chromium from '@sparticuz/chromium';
import type { Contract, UserSettings } from '../shared/schema';
import { aiCompleteContractGenerator } from './core/ai-complete-contract-generator';

/**
 * Generate contract PDF using AI-generated HTML
 * This replaces the old template-based system with dynamic AI generation
 */
export async function generateAIContractPDF(
  contract: Contract,
  userSettings: UserSettings | null,
  signatureDetails?: {
    signedAt: Date;
    signatureName?: string;
    clientIpAddress?: string;
  }
): Promise<Buffer> {
  console.log('🤖 AI-POWERED: Starting complete contract PDF generation for:', contract.contractNumber);
  
  // Generate complete HTML using AI
  const result = await aiCompleteContractGenerator.generateCompleteContractHTML(
    contract,
    userSettings,
    {
      isSigningPage: false,
      signatureDetails
    }
  );
  
  console.log('✅ AI generated HTML:', result.reasoning);
  
  // Launch Puppeteer for PDF generation
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
    
    // Set the AI-generated HTML
    await page.setContent(result.html, { waitUntil: 'domcontentloaded' });
    
    // Generate PDF with optimized settings
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
    
    console.log('✅ AI-POWERED: Contract PDF generated successfully:', pdf.length, 'bytes');
    return Buffer.from(pdf);
    
  } finally {
    await browser.close();
  }
}

/**
 * Generate signing page HTML using AI
 * For when clients need to sign contracts online
 */
export async function generateAIContractSigningHTML(
  contract: Contract,
  userSettings: UserSettings | null
): Promise<string> {
  console.log('🤖 AI-POWERED: Generating contract signing page HTML for:', contract.contractNumber);
  
  const result = await aiCompleteContractGenerator.generateCompleteContractHTML(
    contract,
    userSettings,
    {
      isSigningPage: true
    }
  );
  
  console.log('✅ AI generated signing HTML:', result.reasoning);
  return result.html;
}

// Export for backward compatibility
export default {
  generateAIContractPDF,
  generateAIContractSigningHTML
};