/**
 * Test cloud storage configuration
 */

async function testCloudStorage() {
  console.log('Testing cloud storage configuration...');
  
  // Check environment variables
  const required = [
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY', 
    'R2_ACCOUNT_ID',
    'R2_BUCKET_NAME'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.log('❌ Missing required environment variables:', missing);
    return false;
  }
  
  console.log('✅ All R2 environment variables are present');
  console.log('🔧 Account ID:', process.env.R2_ACCOUNT_ID);
  console.log('🔧 Bucket Name:', process.env.R2_BUCKET_NAME);
  console.log('🔧 Access Key ID:', process.env.R2_ACCESS_KEY_ID?.substring(0, 10) + '...');
  
  return true;
}

testCloudStorage().then(result => {
  if (result) {
    console.log('☁️ Cloud storage configuration looks good!');
  } else {
    console.log('❌ Cloud storage configuration incomplete');
  }
}).catch(console.error);