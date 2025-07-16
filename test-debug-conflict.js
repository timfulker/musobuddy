/**
 * Test conflict detection with debug output
 */

async function testConflictDebug() {
  console.log('🧪 Testing conflict detection with debug output...');
  
  const formData = new URLSearchParams();
  formData.append('from', 'Debug Test <debug@example.com>');
  formData.append('subject', 'Debug conflict test');
  formData.append('body-plain', 'Testing conflict detection for February 8, 2026 at the Sports Center.');
  formData.append('timestamp', Math.floor(Date.now() / 1000).toString());
  formData.append('token', 'test-token');
  formData.append('signature', 'test-signature');
  
  try {
    const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString()
    });
    
    const result = await response.json();
    console.log('✅ Response:', result);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testConflictDebug();