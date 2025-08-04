// Contract Cloud Storage - Direct R2 Upload for Contracts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { nanoid } from 'nanoid';

// Initialize R2 client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

export async function uploadContractToCloud(
  contract: any,
  userSettings: any
): Promise<{ success: boolean; url?: string; key?: string; error?: string }> {
  try {
    console.log(`☁️ Uploading contract #${contract.id} to cloud storage...`);
    
    // Generate PDF using the professional contract PDF generator
    const { generateContractPDF } = await import('./contract-pdf-generator');
    const pdfBuffer = await generateContractPDF(contract, userSettings);
    
    console.log(`📄 Contract PDF generated, size: ${pdfBuffer.length} bytes`);
    
    // Create storage key with date folder structure and security token
    const contractDate = new Date(contract.created_at || contract.createdAt || new Date());
    const dateFolder = contractDate.toISOString().split('T')[0]; // 2025-08-04
    
    // Generate cryptographically secure random token
    const securityToken = nanoid(16);
    const contractNumber = contract.contract_number || contract.contractNumber || `CON-${contract.id}`;
    const filename = `${contractNumber.replace(/[^a-zA-Z0-9-_]/g, '-')}-${securityToken}.pdf`;
    const storageKey = `contracts/${dateFolder}/${filename}`;
    
    console.log(`🔑 Contract storage key: ${storageKey}`);
    
    // Upload to R2
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME || 'musobuddy-storage',
      Key: storageKey,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
      ContentDisposition: `inline; filename="${filename}"`,
      Metadata: {
        'contract-id': contract.id.toString(),
        'contract-number': contractNumber,
        'client-name': contract.client_name || contract.clientName || 'Unknown',
        'uploaded-at': new Date().toISOString()
      }
    });
    
    await r2Client.send(uploadCommand);
    
    console.log(`✅ Contract PDF uploaded successfully to R2: ${storageKey}`);
    
    // Direct Cloudflare R2 public URL (permanent access)
    const publicUrl = `https://pub-446248abf8164fb99bee2fc3dc3c513c.r2.dev/${storageKey}`;
    
    console.log(`🔗 Direct R2 public URL: ${publicUrl}`);
    
    return {
      success: true,
      url: publicUrl, // Direct public URL that never expires
      key: storageKey
    };
    
  } catch (error: any) {
    console.error('❌ Failed to upload contract to cloud storage:', error);
    return {
      success: false,
      error: error.message || 'Contract upload failed'
    };
  }
}

export async function updateContractInCloud(
  contract: any,
  userSettings: any
): Promise<{ success: boolean; url?: string; key?: string; error?: string }> {
  // For updates, we overwrite the existing file with the same key
  // This ensures the URL stays the same but content is updated
  console.log(`🔄 Updating contract #${contract.id} in cloud storage...`);
  
  if (contract.cloud_storage_key || contract.cloudStorageKey) {
    // Use existing key to overwrite
    const existingKey = contract.cloud_storage_key || contract.cloudStorageKey;
    console.log(`🔑 Using existing storage key: ${existingKey}`);
    
    try {
      // Generate updated PDF
      const { generateContractPDF } = await import('./contract-pdf-generator');
      const pdfBuffer = await generateContractPDF(contract, userSettings);
      
      console.log(`📄 Updated contract PDF generated, size: ${pdfBuffer.length} bytes`);
      
      // Upload with same key (overwrites existing)
      const uploadCommand = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME || 'musobuddy-storage',
        Key: existingKey,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
        ContentDisposition: `inline; filename="${existingKey.split('/').pop()}"`,
        Metadata: {
          'contract-id': contract.id.toString(),
          'contract-number': contract.contract_number || contract.contractNumber || `CON-${contract.id}`,
          'client-name': contract.client_name || contract.clientName || 'Unknown',
          'updated-at': new Date().toISOString()
        }
      });
      
      await r2Client.send(uploadCommand);
      
      console.log(`✅ Contract PDF updated successfully in R2: ${existingKey}`);
      
      // Return existing URL (same as before)
      const publicUrl = `https://pub-446248abf8164fb99bee2fc3dc3c513c.r2.dev/${existingKey}`;
      
      return {
        success: true,
        url: publicUrl,
        key: existingKey
      };
      
    } catch (error: any) {
      console.error('❌ Failed to update contract in cloud storage:', error);
      return {
        success: false,
        error: error.message || 'Contract update failed'
      };
    }
  } else {
    // No existing key, create new
    return uploadContractToCloud(contract, userSettings);
  }
}