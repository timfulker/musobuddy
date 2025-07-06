#!/usr/bin/env node

// Deployment API Test Script
// Usage: node deployment-api-test.js [deployed-url]

const deployed_url = process.argv[2] || 'http://localhost:5000';

console.log('🧪 Testing MusoBuddy API Endpoints');
console.log('📍 Base URL:', deployed_url);
console.log('⏰ Started at:', new Date().toISOString());
console.log('='.repeat(50));

async function testEndpoint(method, path, body = null, expectedStatus = 200) {
  const url = `${deployed_url}${path}`;
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    console.log(`\n🔍 ${method} ${path}`);
    console.log(`   Full URL: ${url}`);
    
    const response = await fetch(url, options);
    const status = response.status;
    const success = status === expectedStatus;
    
    console.log(`   Status: ${status} ${success ? '✅' : '❌'}`);
    
    if (response.headers.get('content-type')?.includes('application/json')) {
      const data = await response.json();
      console.log(`   Response:`, JSON.stringify(data, null, 2).substring(0, 200) + '...');
    } else {
      const text = await response.text();
      console.log(`   Response:`, text.substring(0, 100) + '...');
    }
    
    return { success, status, path };
  } catch (error) {
    console.log(`   Error: ${error.message} ❌`);
    return { success: false, status: 'ERROR', path, error: error.message };
  }
}

async function runTests() {
  const results = [];
  
  // Test 1: Health check
  results.push(await testEndpoint('GET', '/api/deployment-test'));
  
  // Test 2: Get a public contract (should exist if we have test data)
  results.push(await testEndpoint('GET', '/api/contracts/public/75', null, 200));
  
  // Test 3: Try to sign a contract (should fail with validation or "already signed")
  results.push(await testEndpoint('POST', '/api/contracts/sign/75', 
    { signatureName: 'Test Deployment User' }, 
    400 // Expect 400 since contract might already be signed
  ));
  
  // Test 4: Test email endpoint
  results.push(await testEndpoint('POST', '/api/test/email', 
    { to: 'test@example.com', subject: 'Deployment Test', message: 'Testing deployment' }
  ));
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);
  
  if (passed === total) {
    console.log('\n🎉 ALL TESTS PASSED - Deployment is working correctly!');
  } else {
    console.log('\n⚠️  Some tests failed - Check logs above for details');
    
    const failed = results.filter(r => !r.success);
    failed.forEach(test => {
      console.log(`   ❌ ${test.path} (${test.status})`);
      if (test.error) console.log(`      Error: ${test.error}`);
    });
  }
  
  console.log('\n⏰ Completed at:', new Date().toISOString());
}

// Import fetch for Node.js environments that don't have it
let fetch;
try {
  fetch = globalThis.fetch;
} catch {
  try {
    fetch = require('node-fetch');
  } catch {
    console.error('❌ This script requires fetch. Install node-fetch or use Node.js 18+');
    process.exit(1);
  }
}

runTests().catch(console.error);