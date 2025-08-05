import { generateWorkingContractPDF } from '../working-contract-pdf';
import { uploadToCloudflareR2 } from './cloud-storage';

export async function uploadContractToCloud(contract: any, userSettings: any) {
  try {
    console.log(`🔄 Uploading contract #${contract.id} to cloud storage...`);
    
    // Generate PDF using working system
    const pdfBuffer = await generateWorkingContractPDF(contract, userSettings);
    
    // Create cloud storage key
    const date = new Date();
    const dateFolder = date.toISOString().split('T')[0];
    const randomSuffix = Math.random().toString(36).substring(2, 15);
    const cloudStorageKey = `contracts/${dateFolder}/${contract.contractNumber}-${randomSuffix}.pdf`;
    
    // Upload to R2
    const uploadResult = await uploadToCloudflareR2(pdfBuffer, cloudStorageKey, 'application/pdf');
    
    if (uploadResult.success && uploadResult.url) {
      console.log(`✅ Contract #${contract.id} uploaded to R2: ${uploadResult.url}`);
      return {
        success: true,
        url: uploadResult.url,
        key: uploadResult.key || cloudStorageKey
      };
    } else {
      console.error(`❌ Failed to upload contract #${contract.id}:`, uploadResult.error);
      return {
        success: false,
        error: uploadResult.error || 'Failed to upload to cloud storage'
      };
    }
    
  } catch (error: any) {
    console.error(`❌ Contract cloud upload error:`, error);
    return {
      success: false,
      error: error.message || 'Unknown upload error'
    };
  }
}