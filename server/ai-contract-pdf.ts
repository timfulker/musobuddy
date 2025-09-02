import puppeteer from 'puppeteer';
import chromium from '@sparticuz/chromium';
import { aiContractGenerator } from './core/ai-contract-generator';
import type { Contract, UserSettings } from '../shared/schema';

interface SignatureDetails {
  performerSigned: boolean;
  performerSignedAt?: string;
  clientSigned: boolean;
  clientSignedAt?: string;
}

// Main export function matching unified-contract-pdf interface
export async function generateAIContractPDF(
  contract: Contract,
  userSettings: UserSettings | null,
  type: 'initial' | 'signing' | 'final' = 'initial',
  signatureDetails?: {
    signedAt: Date;
    signatureName?: string;
    clientIpAddress?: string;
  }
): Promise<Buffer> {
  console.log('🤖 AI CONTRACT: Starting AI-powered contract generation with Haiku for:', contract.contractNumber);
  console.log('🤖 AI CONTRACT: Type:', type, 'Status:', contract.status);
  
  // Convert signatureDetails to internal format
  const internalSignatureDetails: SignatureDetails | undefined = signatureDetails ? {
    performerSigned: true, // Always signed when contract is sent
    performerSignedAt: new Date(contract.createdAt || new Date()).toISOString(),
    clientSigned: !!signatureDetails.signedAt,
    clientSignedAt: signatureDetails.signedAt?.toISOString()
  } : undefined;

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
    
    // Generate HTML with AI using Haiku
    console.log('🤖 AI CONTRACT: Calling Haiku model to generate custom HTML...');
    const result = await aiContractGenerator.generateContract({
      contract,
      userSettings: userSettings || {} as UserSettings,
      type,
      signatureDetails: internalSignatureDetails
    });

    if (!result.success) {
      throw new Error(`AI generation failed: ${result.reasoning}`);
    }
    
    console.log('🤖 AI Layout Decisions:', result.layoutDecisions);
    console.log('🧠 AI Reasoning:', result.reasoning);
    
    await page.setContent(result.html, { waitUntil: 'domcontentloaded' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0.75in',
        right: '0.75in', 
        bottom: '0.75in',
        left: '0.75in'
      }
    });

    console.log('✅ AI CONTRACT: PDF generated successfully with Haiku:', pdfBuffer.length, 'bytes');
    return pdfBuffer;
    
  } finally {
    await browser.close();
  }
}

export async function generateInitialContractPDF(
  contract: Contract, 
  userSettings: UserSettings | null
): Promise<Buffer> {
  return generateAIContractPDF(contract, userSettings, 'initial');
}

export async function generateSigningPageHTML(
  contract: Contract, 
  userSettings: UserSettings | null
): Promise<string> {
  console.log('🤖 AI CONTRACT: Generating signing page HTML with Haiku for:', contract.contractNumber);
  
  const result = await aiContractGenerator.generateContract({
    contract,
    userSettings: userSettings || {} as UserSettings,
    type: 'signing'
  });

  if (!result.success) {
    throw new Error(`AI signing page generation failed: ${result.reasoning}`);
  }

  console.log('✅ AI CONTRACT: Signing page HTML generated with Haiku');
  return result.html;
}

export async function generateFinalContractPDF(
  contract: Contract, 
  userSettings: UserSettings | null,
  signatureDetails: {
    signedAt: Date;
    signatureName?: string;
    clientIpAddress?: string;
  }
): Promise<Buffer> {
  return generateAIContractPDF(contract, userSettings, 'final', signatureDetails);
}