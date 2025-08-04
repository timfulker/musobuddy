import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
import { join } from 'path';
import { generateProfessionalContractHTML } from './contract-templates.js';
import type { Contract, UserSettings } from '@shared/schema';

function getLogoBase64(): string {
  try {
    const logoPath = join(process.cwd(), 'client/public/musobuddy-logo-purple.png');
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
  },
  templateType: 'basic' | 'professional' = 'basic'
): Promise<Buffer> {
  console.log('Starting contract PDF generation for:', contract.contractNumber);
  console.log('🎨 Template selected:', templateType);
  
  // Simple, reliable Puppeteer configuration
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  try {
    const page = await browser.newPage();
    console.log('🎨 Generating HTML with template:', templateType);
    const html = templateType === 'professional' 
      ? generateProfessionalContractHTML(contract, userSettings)
      : generateContractHTML(contract, userSettings, signatureDetails);
    console.log('📄 HTML generated, first 200 chars:', html.substring(0, 200));
    
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    
    console.log('Contract PDF generated successfully:', pdf.length, 'bytes');
    return Buffer.from(pdf);
  } finally {
    await browser.close();
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
  // Use basic template from contract-templates.ts instead of hardcoded HTML
  const { generateBasicContractHTML } = require('./contract-templates.js');
  return generateBasicContractHTML(contract, userSettings);
}