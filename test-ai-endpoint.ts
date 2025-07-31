// test-ai-endpoint.ts - Test AI endpoints directly
import fetch from 'node-fetch';

async function testAIEndpoints() {
  console.log('🧪 Testing AI endpoints...\n');
  
  const baseUrl = 'https://f19aba74-886b-4308-a2de-cc9ba5e94af8-00-2ux7uy3ch9t9f.janeway.replit.dev';
  
  // Test 1: AI Status (no auth required)
  console.log('1. Testing /api/ai/status');
  try {
    const response = await fetch(`${baseUrl}/api/ai/status`);
    const data = await response.json();
    console.log('✅ Status:', response.status);
    console.log('📋 Response:', data);
  } catch (error: any) {
    console.log('❌ Status test failed:', error.message);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test 2: AI Diagnostic (requires auth - will get 401)
  console.log('2. Testing /api/ai/diagnostic (should return 401)');
  try {
    const response = await fetch(`${baseUrl}/api/ai/diagnostic`);
    const data = await response.json();
    console.log('✅ Status:', response.status);
    console.log('📋 Response:', data);
    
    if (response.status === 401) {
      console.log('✅ Authentication working correctly - returned 401 as expected');
    }
  } catch (error: any) {
    console.log('❌ Diagnostic test failed:', error.message);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test 3: AI Generate (requires auth - will get 401)
  console.log('3. Testing /api/ai/generate-response (should return 401)');
  try {
    const response = await fetch(`${baseUrl}/api/ai/generate-response`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'respond',
        customPrompt: 'Generate a test response',
        tone: 'professional'
      })
    });
    const data = await response.json();
    console.log('✅ Status:', response.status);
    console.log('📋 Response:', data);
    
    if (response.status === 401) {
      console.log('✅ Authentication working correctly - returned 401 as expected');
    }
  } catch (error: any) {
    console.log('❌ Generate test failed:', error.message);
  }
  
  console.log('\n🎯 Summary:');
  console.log('- If /api/ai/status returns 200: AI routes are loaded');
  console.log('- If other endpoints return 401: Authentication is working');
  console.log('- Next step: Test with actual session cookie from browser');
}

testAIEndpoints();