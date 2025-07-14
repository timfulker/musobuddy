/**
 * Simple R2 test using direct S3 client
 */

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

// Set up R2 credentials from user setup
const R2_ACCESS_KEY_ID = 'Hkmu_3Tbqq2DYHLo24b8oMAoV2vHbLcGTOOFHq';
const R2_SECRET_ACCESS_KEY = 'Hkmu_3Tbqq2DYHLo24b8oMAoV2vHbLcGTOOFHq';
const R2_ACCOUNT_ID = 'a730a594e40d8b4629555407dc8e4413';
const R2_BUCKET_NAME = 'musobuddy-documents';

async function testR2Direct() {
  console.log('🔧 Testing R2 connection directly...');
  
  try {
    // Create S3 client for R2
    const s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });
    
    // Test file
    const testContent = 'MusoBuddy R2 Test - ' + new Date().toISOString();
    const testKey = 'test/r2-connection-test.txt';
    
    console.log('📤 Testing upload to R2...');
    const uploadCommand = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: testKey,
      Body: testContent,
      ContentType: 'text/plain',
    });
    
    const uploadResult = await s3Client.send(uploadCommand);
    console.log('✅ Upload successful!');
    console.log('📍 ETag:', uploadResult.ETag);
    
    console.log('📥 Testing download from R2...');
    const downloadCommand = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: testKey,
    });
    
    const downloadResult = await s3Client.send(downloadCommand);
    const downloadedContent = await downloadResult.Body.transformToString();
    
    console.log('✅ Download successful!');
    console.log('📄 Content matches:', downloadedContent === testContent);
    console.log('🎉 R2 storage is working correctly!');
    
    // Set environment variables for the app
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = R2_ACCESS_KEY_ID;
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = R2_SECRET_ACCESS_KEY;
    process.env.CLOUDFLARE_R2_ACCOUNT_ID = R2_ACCOUNT_ID;
    process.env.CLOUDFLARE_R2_BUCKET_NAME = R2_BUCKET_NAME;
    process.env.CLOUDFLARE_R2_ENDPOINT = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
    
    console.log('✅ Environment variables set for MusoBuddy');
    
  } catch (error) {
    console.error('❌ R2 test failed:', error.message);
    if (error.Code) {
      console.error('Error code:', error.Code);
    }
  }
}

testR2Direct();