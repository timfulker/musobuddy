/**
 * Simple R2 test using direct S3 client
 */

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

async function testR2Direct() {
  try {
    console.log('🧪 Testing R2 direct connection...');
    
    // R2 configuration
    const s3Client = new S3Client({
      region: 'auto',
      endpoint: 'https://a730a594e40d8b4629555407dc8e4413.r2.cloudflarestorage.com',
      credentials: {
        accessKeyId: 'Hkmu_3Tbqq2DYHLo24b8oMAoV2vHbLcGTOOFHq',
        secretAccessKey: 'Hkmu_3Tbqq2DYHLo24b8oMAoV2vHbLcGTOOFHq',
      },
    });
    
    // Create test content
    const testContent = Buffer.from('Test R2 upload - ' + new Date().toISOString());
    const testKey = 'test-uploads/test-' + Date.now() + '.txt';
    
    console.log('📤 Uploading test file to R2...');
    
    const command = new PutObjectCommand({
      Bucket: 'musobuddy-documents',
      Key: testKey,
      Body: testContent,
      ContentType: 'text/plain',
    });
    
    const result = await s3Client.send(command);
    
    console.log('✅ Upload successful!');
    console.log('📋 Upload result:', result);
    console.log('🔑 File key:', testKey);
    console.log('🔗 Public URL: https://a730a594e40d8b4629555407dc8e4413.r2.cloudflarestorage.com/musobuddy-documents/' + testKey);
    
  } catch (error) {
    console.error('❌ R2 test failed:', error);
    console.error('Error details:', error.message);
    
    if (error.name === 'InvalidAccessKeyId') {
      console.error('🔑 Invalid access key - check API token');
    } else if (error.name === 'SignatureDoesNotMatch') {
      console.error('🔐 Signature mismatch - check secret key');
    } else if (error.name === 'NoSuchBucket') {
      console.error('🪣 Bucket not found - check bucket name');
    }
  }
}

testR2Direct();