// Quick test to see what the backend environment looks like
import fetch from 'node-fetch';

const BASE_URL = 'https://www.musobuddy.com';

console.log('🔍 Testing backend environment detection...\n');

// Test the debug endpoint
try {
  console.log('1. Testing /api/debug-user endpoint...');
  const debugResponse = await fetch(`${BASE_URL}/api/debug-user`, {
    headers: {
      'Authorization': 'Bearer test'
    }
  });

  console.log('Status:', debugResponse.status);
  if (debugResponse.status === 401) {
    console.log('✅ Debug endpoint exists (returned 401 as expected without auth)');
  } else {
    const text = await debugResponse.text();
    console.log('Response:', text.substring(0, 200));
  }
} catch (error) {
  console.log('❌ Debug endpoint error:', error.message);
}

// Test the environment check endpoint
try {
  console.log('\n2. Testing /api/env-check endpoint...');
  const envResponse = await fetch(`${BASE_URL}/api/env-check`);
  console.log('Status:', envResponse.status);

  if (envResponse.ok) {
    const envData = await envResponse.json();
    console.log('✅ Environment data:', envData);
  } else {
    const text = await envResponse.text();
    console.log('❌ Error response:', text.substring(0, 200));
  }
} catch (error) {
  console.log('❌ Environment check error:', error.message);
}

console.log('\n3. Summary:');
console.log('- If debug endpoint returns 401: Backend is running');
console.log('- If env-check returns data: We can see environment');
console.log('- If both fail: Route registration issue');