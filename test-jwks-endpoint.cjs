/**
 * Test script to diagnose JWKS endpoint connectivity issues
 */

const https = require('https');
const http = require('http');

async function testJWKSEndpoint() {
  console.log('🔍 Testing JWKS Endpoint Connectivity\n');

  // Environment check
  const isDev = process.env.NODE_ENV === 'development';
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'unknown'} (isDev: ${isDev})`);

  // Get Supabase URL
  const supabaseUrl = isDev 
    ? process.env.SUPABASE_URL_DEV 
    : process.env.SUPABASE_URL_PROD;

  if (!supabaseUrl) {
    const envVar = isDev ? 'SUPABASE_URL_DEV' : 'SUPABASE_URL_PROD';
    console.error(`❌ Missing environment variable: ${envVar}`);
    process.exit(1);
  }

  console.log(`🔗 Supabase URL: ${supabaseUrl}`);
  
  // Construct JWKS URL
  const jwksUrl = `${supabaseUrl}/auth/v1/jwks`;
  console.log(`🔑 JWKS URL: ${jwksUrl}\n`);

  // Test 1: Direct HTTP request to JWKS endpoint
  console.log('🧪 Test 1: Direct JWKS endpoint request');
  try {
    const response = await makeHttpRequest(jwksUrl);
    console.log(`✅ Status Code: ${response.statusCode}`);
    console.log(`📋 Headers:`, response.headers);
    console.log(`📄 Response Body:`, response.body.substring(0, 500));
    
    if (response.statusCode === 200) {
      try {
        const jwks = JSON.parse(response.body);
        console.log(`🔑 Keys found: ${jwks.keys ? jwks.keys.length : 0}`);
      } catch (e) {
        console.log(`⚠️ Response is not valid JSON`);
      }
    }
  } catch (error) {
    console.error(`❌ JWKS request failed:`, error.message);
    console.error(`📋 Error details:`, error);
  }

  console.log('\n🧪 Test 2: Test basic Supabase connectivity');
  try {
    const healthUrl = `${supabaseUrl}/rest/v1/`;
    const response = await makeHttpRequest(healthUrl);
    console.log(`✅ Supabase API Status: ${response.statusCode}`);
    if (response.statusCode >= 400) {
      console.log(`📄 Error response:`, response.body.substring(0, 300));
    }
  } catch (error) {
    console.error(`❌ Supabase API test failed:`, error.message);
  }

  console.log('\n🧪 Test 3: DNS Resolution test');
  try {
    const url = new URL(supabaseUrl);
    const dns = require('dns').promises;
    const addresses = await dns.lookup(url.hostname);
    console.log(`✅ DNS Resolution: ${url.hostname} -> ${JSON.stringify(addresses)}`);
  } catch (error) {
    console.error(`❌ DNS Resolution failed:`, error.message);
  }

  console.log('\n🧪 Test 4: Test with curl (if available)');
  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    const { stdout, stderr } = await execAsync(`curl -v "${jwksUrl}" 2>&1`, { timeout: 10000 });
    console.log(`📋 Curl output:`, stdout.substring(0, 1000));
    if (stderr) {
      console.log(`⚠️ Curl stderr:`, stderr.substring(0, 500));
    }
  } catch (error) {
    console.log(`⚠️ Curl test failed:`, error.message);
  }
}

function makeHttpRequest(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      timeout: 10000,
      headers: {
        'User-Agent': 'MusoBuddy-JWKS-Test/1.0',
        'Accept': 'application/json'
      }
    };

    const req = client.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

// Run the test
testJWKSEndpoint().catch(console.error);