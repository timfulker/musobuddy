// reliability.ts - Circuit breaker and failure isolation for contracts vs invoices
import type { Invoice, Contract, UserSettings } from '@shared/schema';

// Circuit breaker states
enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failures detected, circuit is open
  HALF_OPEN = 'HALF_OPEN' // Testing if service has recovered
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime: number = 0;
  private successCount = 0;
  
  constructor(
    private name: string,
    private failureThreshold: number = 5,
    private timeout: number = 60000, // 1 minute
    private successThreshold: number = 3
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
        console.log(`🔄 Circuit breaker ${this.name}: Moving to HALF_OPEN state`);
      } else {
        throw new Error(`Circuit breaker ${this.name} is OPEN - service temporarily unavailable`);
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
        console.log(`✅ Circuit breaker ${this.name}: Service recovered, moving to CLOSED state`);
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.successCount = 0;

    if (this.failureCount >= this.failureThreshold) {
      this.state = CircuitState.OPEN;
      console.log(`🚨 Circuit breaker ${this.name}: OPENED after ${this.failureCount} failures`);
    }
  }

  private shouldAttemptReset(): boolean {
    return Date.now() - this.lastFailureTime >= this.timeout;
  }

  getState(): { state: CircuitState; failureCount: number; lastFailureTime: number } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime
    };
  }
}

// Separate circuit breakers for each service
const invoicePDFCircuit = new CircuitBreaker('InvoicePDF', 3, 30000); // More sensitive for invoices
const contractPDFCircuit = new CircuitBreaker('ContractPDF', 5, 60000);
const cloudStorageCircuit = new CircuitBreaker('CloudStorage', 3, 45000);

// SAFE PDF GENERATION with circuit breaker protection
export async function safeGenerateInvoicePDF(
  invoice: Invoice,
  userSettings: UserSettings | null
): Promise<{ success: boolean; data?: Buffer; error?: string; fallback?: boolean }> {
  try {
    console.log(`🛡️ Safe invoice PDF generation for: ${invoice.invoiceNumber}`);
    
    const pdfBuffer = await invoicePDFCircuit.execute(async () => {
      const { generateInvoicePDF } = await import('./pdf-generator');
      return await generateInvoicePDF(invoice, userSettings);
    });
    
    return { success: true, data: pdfBuffer };
    
  } catch (error: any) {
    console.error(`❌ Invoice PDF generation failed for ${invoice.invoiceNumber}:`, error.message);
    
    // FALLBACK: Generate basic text-based invoice
    try {
      const fallbackPdf = await generateFallbackInvoicePDF(invoice, userSettings);
      console.log(`🔄 Generated fallback invoice PDF for ${invoice.invoiceNumber}`);
      return { success: true, data: fallbackPdf, fallback: true };
    } catch (fallbackError: any) {
      console.error(`❌ Fallback invoice PDF also failed:`, fallbackError.message);
      return { success: false, error: error.message };
    }
  }
}

export async function safeGenerateContractPDF(
  contract: Contract,
  userSettings: UserSettings | null,
  signatureDetails?: any
): Promise<{ success: boolean; data?: Buffer; error?: string; fallback?: boolean }> {
  try {
    console.log(`🛡️ Safe contract PDF generation for: ${contract.contractNumber}`);
    
    const pdfBuffer = await contractPDFCircuit.execute(async () => {
      const { generateContractPDF } = await import('./pdf-generator');
      return await generateContractPDF(contract, userSettings, signatureDetails);
    });
    
    return { success: true, data: pdfBuffer };
    
  } catch (error: any) {
    console.error(`❌ Contract PDF generation failed for ${contract.contractNumber}:`, error.message);
    
    // FALLBACK: Generate basic text-based contract
    try {
      const fallbackPdf = await generateFallbackContractPDF(contract, userSettings);
      console.log(`🔄 Generated fallback contract PDF for ${contract.contractNumber}`);
      return { success: true, data: fallbackPdf, fallback: true };
    } catch (fallbackError: any) {
      console.error(`❌ Fallback contract PDF also failed:`, fallbackError.message);
      return { success: false, error: error.message };
    }
  }
}

// SAFE CLOUD STORAGE with independent failure handling
export async function safeUploadToCloud(
  fileBuffer: Buffer,
  storageKey: string,
  metadata: Record<string, string>
): Promise<{ success: boolean; url?: string; error?: string; stored?: 'cloud' | 'local' }> {
  try {
    const result = await cloudStorageCircuit.execute(async () => {
      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
      
      const r2Client = new S3Client({
        region: 'auto',
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
        },
      });
      
      const uploadCommand = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME || 'musobuddy-storage',
        Key: storageKey,
        Body: fileBuffer,
        ContentType: 'application/pdf',
        ContentDisposition: `inline; filename="${storageKey.split('/').pop()}"`,
        Metadata: metadata
      });
      
      await r2Client.send(uploadCommand);
      
      const publicUrl = `https://pub-446248abf8164fb99bee2fc3dc3c513c.r2.dev/${storageKey}`;
      return publicUrl;
    });
    
    return { success: true, url: result, stored: 'cloud' };
    
  } catch (error: any) {
    console.error(`❌ Cloud storage failed for ${storageKey}:`, error.message);
    
    // FALLBACK: Store locally and schedule retry
    try {
      const localPath = await storeFileLocally(fileBuffer, storageKey);
      scheduleCloudRetry(storageKey, localPath);
      
      return { 
        success: true, 
        url: `/local/${storageKey}`, 
        error: 'Using local storage - cloud upload will retry',
        stored: 'local'
      };
    } catch (fallbackError: any) {
      return { success: false, error: error.message };
    }
  }
}

// FALLBACK PDF GENERATORS (simple, fast, reliable)
async function generateFallbackInvoicePDF(
  invoice: Invoice,
  userSettings: UserSettings | null
): Promise<Buffer> {
  // Simple text-based PDF that always works
  const PDFDocument = await import('pdfkit').then(m => m.default);
  const doc = new PDFDocument();
  
  const chunks: Buffer[] = [];
  doc.on('data', chunk => chunks.push(chunk));
  
  return new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    
    // Simple, reliable content
    doc.fontSize(20).text('INVOICE', 50, 50);
    doc.fontSize(12);
    doc.text(`Invoice Number: ${invoice.invoiceNumber}`, 50, 100);
    doc.text(`Client: ${invoice.clientName}`, 50, 120);
    doc.text(`Amount: £${invoice.amount}`, 50, 140);
    doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, 50, 160);
    doc.text(`Created: ${new Date(invoice.createdAt || new Date()).toLocaleDateString()}`, 50, 180);
    
    if (userSettings?.businessName) {
      doc.text(`From: ${userSettings.businessName}`, 50, 220);
    }
    
    doc.text('This is a simplified invoice due to system issues.', 50, 260);
    doc.text('Please contact us for the full invoice if needed.', 50, 280);
    
    doc.end();
  });
}

async function generateFallbackContractPDF(
  contract: Contract,
  userSettings: UserSettings | null
): Promise<Buffer> {
  const PDFDocument = await import('pdfkit').then(m => m.default);
  const doc = new PDFDocument();
  
  const chunks: Buffer[] = [];
  doc.on('data', chunk => chunks.push(chunk));
  
  return new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    
    doc.fontSize(20).text('CONTRACT', 50, 50);
    doc.fontSize(12);
    doc.text(`Contract Number: ${contract.contractNumber}`, 50, 100);
    doc.text(`Client: ${contract.clientName}`, 50, 120);
    doc.text(`Event Date: ${new Date(contract.eventDate).toLocaleDateString()}`, 50, 140);
    doc.text(`Fee: £${contract.fee}`, 50, 160);
    doc.text(`Venue: ${contract.venue || 'TBD'}`, 50, 180);
    
    if (userSettings?.businessName) {
      doc.text(`Performer: ${userSettings.businessName}`, 50, 220);
    }
    
    doc.text('This is a simplified contract due to system issues.', 50, 260);
    doc.text('Full contract terms available upon request.', 50, 280);
    
    doc.end();
  });
}

// LOCAL STORAGE FALLBACK
async function storeFileLocally(buffer: Buffer, storageKey: string): Promise<string> {
  const fs = await import('fs/promises');
  const path = await import('path');
  
  const localDir = path.join(process.cwd(), 'local-storage');
  const filePath = path.join(localDir, storageKey);
  const dirPath = path.dirname(filePath);
  
  await fs.mkdir(dirPath, { recursive: true });
  await fs.writeFile(filePath, buffer);
  
  console.log(`💾 Stored file locally: ${filePath}`);
  return filePath;
}

// RETRY MECHANISM for failed cloud uploads
const retryQueue: Array<{ storageKey: string; localPath: string; attempts: number }> = [];

function scheduleCloudRetry(storageKey: string, localPath: string): void {
  retryQueue.push({ storageKey, localPath, attempts: 0 });
  
  // Process retry queue every 5 minutes
  setTimeout(processRetryQueue, 5 * 60 * 1000);
}

async function processRetryQueue(): Promise<void> {
  if (retryQueue.length === 0) return;
  
  console.log(`🔄 Processing ${retryQueue.length} failed cloud uploads...`);
  
  for (let i = retryQueue.length - 1; i >= 0; i--) {
    const item = retryQueue[i];
    item.attempts++;
    
    try {
      const fs = await import('fs/promises');
      const buffer = await fs.readFile(item.localPath);
      
      const result = await safeUploadToCloud(buffer, item.storageKey, {
        'retry-attempt': item.attempts.toString(),
        'original-failure': 'cloud-storage-retry'
      });
      
      if (result.success && result.stored === 'cloud') {
        console.log(`✅ Retry successful for ${item.storageKey}`);
        retryQueue.splice(i, 1);
        await fs.unlink(item.localPath); // Clean up local file
      }
    } catch (error) {
      console.error(`❌ Retry failed for ${item.storageKey}:`, error);
      
      if (item.attempts >= 3) {
        console.log(`❌ Giving up on ${item.storageKey} after 3 attempts`);
        retryQueue.splice(i, 1);
      }
    }
  }
  
  // Schedule next retry if items remain
  if (retryQueue.length > 0) {
    setTimeout(processRetryQueue, 10 * 60 * 1000); // 10 minutes
  }
}

// HEALTH CHECK ENDPOINTS
export function getSystemHealth(): {
  invoicePDF: any;
  contractPDF: any;
  cloudStorage: any;
  retryQueue: number;
} {
  return {
    invoicePDF: invoicePDFCircuit.getState(),
    contractPDF: contractPDFCircuit.getState(),
    cloudStorage: cloudStorageCircuit.getState(),
    retryQueue: retryQueue.length
  };
}