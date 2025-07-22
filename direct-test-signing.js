// Direct test of signing endpoint to verify it's working
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function directTestSigning() {
  console.log('Testing signing endpoint directly with curl...');
  
  try {
    const curlCommand = `curl -X POST "https://musobuddy.replit.app/api/contracts/sign/349" \\
      -H "Content-Type: application/json" \\
      -d '{
        "signature": "Direct Test Signature",
        "clientPhone": "07111111111",
        "clientAddress": "Direct Test Address",
        "agreedToTerms": true,
        "signedAt": "'${new Date().toISOString()}'",
        "ipAddress": "Direct Test IP"
      }'`;
    
    console.log('Executing curl command...');
    const { stdout, stderr } = await execAsync(curlCommand);
    
    if (stderr) {
      console.log('stderr:', stderr);
    }
    
    console.log('Response:', stdout);
    
    // Parse response
    try {
      const result = JSON.parse(stdout);
      if (result.success) {
        console.log('✅ Direct signing test successful');
        console.log('📧 Check server logs now for signing activity');
      } else {
        console.log('❌ Direct signing test failed:', result.error);
      }
    } catch (parseError) {
      console.log('Raw response (could not parse as JSON):', stdout);
    }
    
  } catch (error) {
    console.error('Direct test error:', error.message);
  }
}

directTestSigning();