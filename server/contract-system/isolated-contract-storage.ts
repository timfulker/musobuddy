// ISOLATED CONTRACT CLOUD STORAGE - COMPLETELY INDEPENDENT  
// Version: 2025.08.04.002 - CONTRACT SYSTEM ISOLATION
// NO IMPORTS FROM MAIN SYSTEM - PREVENTS CASCADING FAILURES

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import type { IsolatedContractData, IsolatedUserSettings, IsolatedUploadResult } from './isolated-contract-types';
import { generateIsolatedContractPDF } from './isolated-contract-pdf';

const R2_ENDPOINT = 'https://446248abf8164fb99bee2fc3dc3c513c.r2.cloudflarestorage.com';
const PUBLIC_URL_BASE = 'https://pub-446248abf8164fb99bee2fc3dc3c513c.r2.dev';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

export class IsolatedContractStorage {
  
  private generateStorageKey(contract: IsolatedContractData): string {
    const date = new Date();
    const dateFolder = date.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Clean filename for storage
    const cleanName = contract.clientName
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
    
    const eventDateStr = new Date(contract.eventDate)
      .toLocaleDateString('en-GB')
      .replace(/\//g, '-');
    
    // Generate random suffix for uniqueness
    const randomSuffix = Math.random().toString(36).substring(2, 18);
    
    return `contracts/${dateFolder}/-${eventDateStr}---${cleanName}--${randomSuffix}.pdf`;
  }

  async uploadContractPDF(
    contract: IsolatedContractData, 
    userSettings: IsolatedUserSettings | null,
    templateName: string = 'professional'
  ): Promise<IsolatedUploadResult> {
    try {
      console.log(`☁️ Uploading contract #${contract.id} to cloud storage...`);
      
      // Generate PDF
      const pdfBuffer = await generateIsolatedContractPDF(contract, userSettings, templateName);
      console.log(`📄 Contract PDF generated, size: ${pdfBuffer.length} bytes`);
      
      // Generate storage key
      const storageKey = this.generateStorageKey(contract);
      console.log(`🔑 Contract storage key: ${storageKey}`);
      
      // Upload to R2
      const uploadCommand = new PutObjectCommand({
        Bucket: 'default',
        Key: storageKey,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
        CacheControl: 'public, max-age=31536000', // 1 year cache
        Metadata: {
          'contract-id': contract.id.toString(),
          'client-name': contract.clientName,
          'event-date': contract.eventDate.toISOString(),
          'generated-at': new Date().toISOString()
        }
      });

      await r2Client.send(uploadCommand);
      
      const publicUrl = `${PUBLIC_URL_BASE}/${storageKey}`;
      console.log(`✅ Contract PDF uploaded successfully to R2: ${storageKey}`);
      console.log(`🔗 Direct R2 public URL: ${publicUrl}`);
      
      return {
        success: true,
        url: publicUrl,
        key: storageKey
      };

    } catch (error: any) {
      console.error(`❌ Failed to upload contract #${contract.id} to R2:`, error);
      return {
        success: false,
        error: error.message || 'Unknown upload error'
      };
    }
  }

  async getContractURL(storageKey: string): Promise<string> {
    return `${PUBLIC_URL_BASE}/${storageKey}`;
  }
}

// Export singleton instance
export const isolatedContractStorage = new IsolatedContractStorage();