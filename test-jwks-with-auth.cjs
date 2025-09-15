/**
 * Test JWKS endpoint with proper Supabase authentication
 */

const https = require('https');

async function testJWKSWithAuth() {
  console.log('🔍 Testing JWKS Endpoint with Authentication\n');

  // Environment check
  const isDev = process.env.NODE_ENV === 'development';
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'unknown'} (isDev: ${isDev})`);

  // Get Supabase URL and keys
  const supabaseUrl = isDev 
    ? process.env.SUPABASE_URL_DEV 
    : process.env.SUPABASE_URL_PROD;
    
  const anonKey = isDev
    ? process.env.SUPABASE_ANON_KEY_DEV
    : process.env.SUPABASE_ANON_KEY_PROD;

  if (!supabaseUrl || !anonKey) {
    console.error('❌ Missing Supabase environment variables');
    console.error(`   SUPABASE_URL: ${supabaseUrl ? 'exists' : 'missing'}`);
    console.error(`   ANON_KEY: ${anonKey ? 'exists' : 'missing'}`);
    process.exit(1);
  }

  console.log(`🔗 Supabase URL: ${supabaseUrl}`);
  console.log(`🔑 Anon Key: ${anonKey.substring(0, 20)}...`);
  
  // Construct JWKS URL
  const jwksUrl = `${supabaseUrl}/auth/v1/jwks`;
  console.log(`🔑 JWKS URL: ${jwksUrl}\n`);

  // Test with API key authentication
  console.log('🧪 Test: JWKS endpoint with API key');
  try {
    const response = await makeAuthenticatedRequest(jwksUrl, anonKey);
    console.log(`✅ Status Code: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      try {
        const jwks = JSON.parse(response.body);
        console.log(`🔑 Keys found: ${jwks.keys ? jwks.keys.length : 0}`);
        console.log(`📋 First key info:`, jwks.keys?.[0] ? {
          kty: jwks.keys[0].kty,
          use: jwks.keys[0].use,
          alg: jwks.keys[0].alg,
          kid: jwks.keys[0].kid
        } : 'No keys');
        return { success: true, jwks };
      } catch (e) {
        console.log(`⚠️ Response is not valid JSON`);
        console.log(`📄 Raw response:`, response.body.substring(0, 500));
      }
    } else {
      console.log(`❌ Failed with status ${response.statusCode}`);
      console.log(`📄 Response:`, response.body.substring(0, 300));
    }
  } catch (error) {
    console.error(`❌ Authenticated JWKS request failed:`, error.message);
  }

  return { success: false };
}

function makeAuthenticatedRequest(url, apikey) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      timeout: 10000,
      headers: {
        'User-Agent': 'MusoBuddy-JWKS-Test/1.0',
        'Accept': 'application/json',
        'apikey': apikey,
        'Authorization': `Bearer ${apikey}`
      }
    };

    const req = https.request(options, (res) => {
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
testJWKSWithAuth().then(result => {
  if (result.success) {
    console.log('\n✅ JWKS endpoint working with authentication!');
    console.log('🔧 Next: Update JWT verification to use authenticated requests');
  } else {
    console.log('\n❌ JWKS endpoint still failing');
  }
}).catch(console.error);