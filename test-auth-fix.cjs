const fetch = require('node-fetch');

async function testAuthentication() {
  console.log('🧪 Testing authentication after fixes...');
  
  const baseUrl = 'https://musobuddy.replit.app';
  
  // Test 1: Admin login
  console.log('\n1️⃣ Testing admin login...');
  const loginResponse = await fetch(`${baseUrl}/api/auth/admin-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'timfulker@gmail.com',
      password: 'MusoBuddy2025!'
    })
  });
  
  const loginData = await loginResponse.json();
  console.log('Login response:', loginResponse.status, loginData.success ? 'SUCCESS' : 'FAILED');
  
  // Extract cookie from login response
  const setCookieHeader = loginResponse.headers.get('set-cookie');
  console.log('Set-Cookie header:', setCookieHeader ? 'PRESENT' : 'MISSING');
  
  if (loginResponse.status === 200 && setCookieHeader) {
    // Test 2: Auth check with session cookie
    console.log('\n2️⃣ Testing auth check with session cookie...');
    const authResponse = await fetch(`${baseUrl}/api/auth/user`, {
      headers: {
        'Cookie': setCookieHeader
      }
    });
    
    const authData = await authResponse.json();
    console.log('Auth check response:', authResponse.status, authResponse.status === 200 ? 'SUCCESS' : 'FAILED');
    
    if (authResponse.status === 200) {
      console.log('✅ AUTHENTICATION COMPLETELY FIXED! Session persistence working!');
      console.log('✅ User data received:', authData.email, '- Admin:', authData.isAdmin);
    } else {
      console.log('❌ Auth check still failing with 401');
      console.log('❌ Error:', authData);
    }
  } else {
    console.log('❌ Login failed - cannot test session persistence');
  }
  
  // Test 3: Test if signup endpoint exists now
  console.log('\n3️⃣ Testing signup endpoint availability...');
  const signupTestResponse = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firstName: 'Test',
      lastName: 'User', 
      email: 'test@example.com',
      phoneNumber: '07123456789',
      password: 'testpass123'
    })
  });
  
  console.log('Signup endpoint status:', signupTestResponse.status);
  if (signupTestResponse.status === 404) {
    console.log('❌ SIGNUP ENDPOINT STILL MISSING');
  } else {
    console.log('✅ SIGNUP ENDPOINT NOW EXISTS!');
    const signupData = await signupTestResponse.json();
    console.log('Response:', signupData.error || signupData.message || 'Success');
  }
}

testAuthentication().catch(console.error);