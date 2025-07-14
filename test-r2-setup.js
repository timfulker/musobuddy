/**
 * Test R2 setup and credentials
 */

// R2 credentials from user setup
const R2_ACCESS_KEY_ID = 'Hkmu_3Tbqq2DYHLo24b8oMAoV2vHbLcGTOOFHq';
const R2_SECRET_ACCESS_KEY = 'Hkmu_3Tbqq2DYHLo24b8oMAoV2vHbLcGTOOFHq';
const R2_ACCOUNT_ID = 'a730a594e40d8b4629555407dc8e4413';
const R2_BUCKET_NAME = 'musobuddy-documents';

// Test the R2 connection
async function testR2Setup() {
  console.log('🔧 Testing R2 setup...');
  
  try {
    // Import the cloud storage module
    const { uploadToCloudStorage, downloadFromCloudStorage } = await import('./server/cloud-storage.ts');
    
    // Test file content
    const testContent = 'Hello R2 Storage Test!';
    const testFileName = 'test-file.txt';
    
    console.log('📤 Testing upload to R2...');
    const uploadResult = await uploadToCloudStorage(testContent, testFileName, 'text/plain');
    
    if (uploadResult.success) {
      console.log('✅ Upload successful!');
      console.log('📍 File URL:', uploadResult.url);
      console.log('🔑 File key:', uploadResult.key);
      
      // Test download
      console.log('📥 Testing download from R2...');
      const downloadResult = await downloadFromCloudStorage(uploadResult.key);
      
      if (downloadResult.success) {
        console.log('✅ Download successful!');
        console.log('📄 Content matches:', downloadResult.content === testContent);
      } else {
        console.log('❌ Download failed:', downloadResult.error);
      }
    } else {
      console.log('❌ Upload failed:', uploadResult.error);
    }
    
  } catch (error) {
    console.error('❌ R2 setup test failed:', error.message);
  }
}

testR2Setup();