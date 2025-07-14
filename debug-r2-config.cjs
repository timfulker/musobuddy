/**
 * Debug R2 configuration
 */

console.log('🔍 Debugging R2 configuration...');

// Check token format
const token = 'Hkmu_3Tbqq2DYHLo24b8oMAoV2vHbLcGTOOFHq';
console.log('Token length:', token.length);
console.log('Token format check:', token.match(/^[A-Za-z0-9_-]+$/));

// Check endpoint format
const endpoint = 'https://a730a594e40d8b4629555407dc8e4413.r2.cloudflarestorage.com';
console.log('Endpoint:', endpoint);

// Expected R2 token format is typically 40+ characters
// Expected format: access key ID and secret access key are different
console.log('⚠️ Issue detected: Using same token for both access key and secret key');
console.log('✅ For R2, you need separate Access Key ID and Secret Access Key');
console.log('📋 In Cloudflare dashboard, look for:');
console.log('   - Access Key ID (shorter, like: abc123...)');
console.log('   - Secret Access Key (longer, like: xyz789...)');

console.log('\n🔧 Current configuration issue:');
console.log('   accessKeyId: ' + token);
console.log('   secretAccessKey: ' + token);
console.log('   ❌ These should be different values');