import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { Contract, Invoice, UserSettings } from '@shared/schema';
import { generateContractPDF, generateInvoicePDF } from './pdf-generator';

// Static PDF storage directory
const STATIC_PDF_DIR = join(process.cwd(), 'static-pdfs');

// Ensure static PDF directory exists
if (!existsSync(STATIC_PDF_DIR)) {
  mkdirSync(STATIC_PDF_DIR, { recursive: true });
}

interface StaticPDFResult {
  success: boolean;
  filePath?: string;
  publicUrl?: string;
  error?: string;
}

/**
 * Generate and store a static contract PDF that can be accessed without the app running
 */
export async function generateStaticContractPDF(
  contract: Contract,
  userSettings: UserSettings | null,
  signatureDetails?: {
    signedAt: Date;
    signatureName?: string;
    clientIpAddress?: string;
  }
): Promise<StaticPDFResult> {
  try {
    console.log('📄 Generating static contract PDF for:', contract.contractNumber);
    
    // Generate PDF buffer
    const pdfBuffer = await generateContractPDF(contract, userSettings, signatureDetails);
    
    // Create filename with contract number and timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `contract-${contract.contractNumber}-${timestamp}.pdf`;
    const filePath = join(STATIC_PDF_DIR, filename);
    
    // Save PDF to static directory
    writeFileSync(filePath, pdfBuffer);
    
    // Generate public URL (this would be accessible via web server)
    const currentDomain = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
    const publicUrl = `https://${currentDomain}/static-pdfs/${filename}`;
    
    console.log('✅ Static contract PDF generated:', filename);
    console.log('🔗 Public URL:', publicUrl);
    
    return {
      success: true,
      filePath,
      publicUrl,
    };
  } catch (error) {
    console.error('❌ Error generating static contract PDF:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Generate and store a static invoice PDF that can be accessed without the app running
 */
export async function generateStaticInvoicePDF(
  invoice: Invoice,
  contract: Contract | null,
  userSettings: UserSettings | null
): Promise<StaticPDFResult> {
  try {
    console.log('📄 Generating static invoice PDF for:', invoice.invoiceNumber);
    
    // Generate PDF buffer
    const pdfBuffer = await generateInvoicePDF(invoice, contract, userSettings);
    
    // Create filename with invoice number and timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `invoice-${invoice.invoiceNumber}-${timestamp}.pdf`;
    const filePath = join(STATIC_PDF_DIR, filename);
    
    // Save PDF to static directory
    writeFileSync(filePath, pdfBuffer);
    
    // Generate public URL (this would be accessible via web server)
    const currentDomain = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
    const publicUrl = `https://${currentDomain}/static-pdfs/${filename}`;
    
    console.log('✅ Static invoice PDF generated:', filename);
    console.log('🔗 Public URL:', publicUrl);
    
    return {
      success: true,
      filePath,
      publicUrl,
    };
  } catch (error) {
    console.error('❌ Error generating static invoice PDF:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Generate a static HTML page for contract signing that includes fallback PDF download
 */
export async function generateStaticContractSigningPage(
  contract: Contract,
  userSettings: UserSettings | null
): Promise<StaticPDFResult> {
  try {
    console.log('📄 Generating static contract signing page for:', contract.contractNumber);
    
    // Generate static PDF first
    const pdfResult = await generateStaticContractPDF(contract, userSettings);
    if (!pdfResult.success) {
      return pdfResult;
    }
    
    // Create static HTML signing page
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const htmlFilename = `contract-signing-${contract.contractNumber}-${timestamp}.html`;
    const htmlFilePath = join(STATIC_PDF_DIR, htmlFilename);
    
    // Generate HTML content
    const htmlContent = generateContractSigningHTML(contract, userSettings, pdfResult.publicUrl!);
    
    // Save HTML to static directory
    writeFileSync(htmlFilePath, htmlContent);
    
    // Generate public URL for HTML page
    const currentDomain = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
    const publicUrl = `https://${currentDomain}/static-pdfs/${htmlFilename}`;
    
    console.log('✅ Static contract signing page generated:', htmlFilename);
    console.log('🔗 Public URL:', publicUrl);
    
    return {
      success: true,
      filePath: htmlFilePath,
      publicUrl,
    };
  } catch (error) {
    console.error('❌ Error generating static contract signing page:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Generate HTML content for static contract signing page
 */
function generateContractSigningHTML(
  contract: Contract,
  userSettings: UserSettings | null,
  pdfDownloadUrl: string
): string {
  const businessName = userSettings?.businessName || 'MusoBuddy';
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Contract Signing - ${contract.contractNumber}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          line-height: 1.6;
          color: #333;
        }
        .header {
          text-align: center;
          border-bottom: 3px solid #9333ea;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .contract-details {
          background-color: #f9f9f9;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        .contract-details h3 {
          color: #9333ea;
          margin-top: 0;
        }
        .detail-row {
          display: flex;
          margin-bottom: 10px;
        }
        .detail-label {
          font-weight: bold;
          width: 150px;
          color: #666;
        }
        .detail-value {
          flex: 1;
        }
        .download-section {
          background-color: #e8f5e8;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
          margin-bottom: 30px;
        }
        .download-button {
          background-color: #4CAF50;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 5px;
          font-weight: bold;
          display: inline-block;
          margin: 10px;
        }
        .download-button:hover {
          background-color: #45a049;
        }
        .note {
          background-color: #fff3cd;
          padding: 15px;
          border-radius: 5px;
          border-left: 4px solid #ffc107;
          margin-top: 20px;
        }
        .footer {
          text-align: center;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          color: #666;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Performance Contract</h1>
        <h2>${contract.contractNumber}</h2>
      </div>
      
      <div class="contract-details">
        <h3>Contract Details</h3>
        <div class="detail-row">
          <div class="detail-label">Client:</div>
          <div class="detail-value">${contract.clientName}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Event Date:</div>
          <div class="detail-value">${new Date(contract.eventDate).toLocaleDateString()}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Event Time:</div>
          <div class="detail-value">${contract.eventTime}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Venue:</div>
          <div class="detail-value">${contract.venue}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Performance Fee:</div>
          <div class="detail-value">£${contract.fee}</div>
        </div>
      </div>
      
      <div class="download-section">
        <h3>Download Contract</h3>
        <p>Click the button below to download the complete contract document:</p>
        <a href="${pdfDownloadUrl}" class="download-button" download>📄 Download Contract PDF</a>
      </div>
      
      <div class="note">
        <p><strong>Note:</strong> This is a static version of your contract. The full contract signing system is temporarily unavailable. Please download the PDF above to review the complete contract terms.</p>
        <p>For any questions or to proceed with contract signing, please contact ${businessName} directly.</p>
      </div>
      
      <div class="footer">
        <p>Powered by MusoBuddy – less admin, more music</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Clean up old static PDF files (run periodically)
 */
export function cleanupOldStaticPDFs(olderThanDays: number = 30): void {
  try {
    const fs = require('fs');
    const path = require('path');
    
    if (!existsSync(STATIC_PDF_DIR)) return;
    
    const files = fs.readdirSync(STATIC_PDF_DIR);
    const cutoffDate = new Date(Date.now() - (olderThanDays * 24 * 60 * 60 * 1000));
    
    files.forEach((file: string) => {
      const filePath = path.join(STATIC_PDF_DIR, file);
      const stats = fs.statSync(filePath);
      
      if (stats.mtime < cutoffDate) {
        fs.unlinkSync(filePath);
        console.log('🗑️ Cleaned up old static PDF:', file);
      }
    });
  } catch (error) {
    console.error('❌ Error cleaning up static PDFs:', error);
  }
}