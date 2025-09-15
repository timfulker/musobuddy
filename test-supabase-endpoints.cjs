/**
 * Test different Supabase auth endpoints to find the correct JWKS path
 */

const https = require('https');

async function testSupabaseEndpoints() {
  console.log('🔍 Testing Supabase Auth Endpoints\n');

  // Environment check
  const isDev = process.env.NODE_ENV === 'development';
  const supabaseUrl = isDev ? process.env.SUPABASE_URL_DEV : process.env.SUPABASE_URL_PROD;
  const anonKey = isDev ? process.env.SUPABASE_ANON_KEY_DEV : process.env.SUPABASE_ANON_KEY_PROD;

  if (!supabaseUrl || !anonKey) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
  }

  console.log(`🔗 Supabase URL: ${supabaseUrl}`);

  // Test different possible JWKS endpoints
  const endpointsToTest = [
    `/auth/v1/jwks`,           // Standard path
    `/auth/v1/jwks.json`,      // With .json extension
    `/.well-known/jwks.json`,  // RFC standard location
    `/auth/v1/settings`,       // Settings endpoint (might reveal config)
    `/auth/v1/`,               // Auth root
    `/auth/v1/token`,          // Token endpoint
  ];

  console.log('🧪 Testing different auth endpoints:\n');

  for (const endpoint of endpointsToTest) {
    const url = `${supabaseUrl}${endpoint}`;
    console.log(`📍 Testing: ${endpoint}`);
    
    try {
      // Test without auth first
      const response1 = await makeRequest(url, null);
      console.log(`   Without auth: ${response1.statusCode} ${getStatusText(response1.statusCode)}`);
      
      // Test with auth
      const response2 = await makeRequest(url, anonKey);
      console.log(`   With auth: ${response2.statusCode} ${getStatusText(response2.statusCode)}`);
      
      if (response2.statusCode === 200) {
        console.log(`   ✅ SUCCESS! Body preview:`, response2.body.substring(0, 200));
        
        // Check if it's JWKS format
        try {
          const data = JSON.parse(response2.body);
          if (data.keys && Array.isArray(data.keys)) {
            console.log(`   🔑 This is a JWKS endpoint with ${data.keys.length} keys!`);
            console.log(`   📋 Key details:`, data.keys.map(k => ({ kty: k.kty, use: k.use, alg: k.alg, kid: k.kid?.substring(0, 8) })));
            return { endpoint, url, jwks: data };
          }
        } catch (e) {
          // Not JSON, that's fine
        }
      } else if (response2.statusCode !== 404) {
        console.log(`   📄 Response preview:`, response2.body.substring(0, 100));
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    console.log(); // Empty line for readability
  }

  // Test if we need to create a JWT token first
  console.log('🧪 Testing JWT token creation...');
  try {
    const tokenUrl = `${supabaseUrl}/auth/v1/token?grant_type=password`;
    // This is just to test if the endpoint exists, not to actually authenticate
    const response = await makeRequest(tokenUrl, anonKey, 'POST', JSON.stringify({
      email: 'test@example.com',
      password: 'test'
    }));
    console.log(`Token endpoint: ${response.statusCode} ${getStatusText(response.statusCode)}`);
  } catch (error) {
    console.log(`Token endpoint error: ${error.message}`);
  }

  return null;
}

function makeRequest(url, apikey, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const headers = {
      'User-Agent': 'MusoBuddy-Test/1.0',
      'Accept': 'application/json'
    };

    if (apikey) {
      headers['apikey'] = apikey;
      headers['Authorization'] = `Bearer ${apikey}`;
    }

    if (body) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(body);
    }
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: method,
      timeout: 8000,
      headers: headers
    };

    const req = https.request(options, (res) => {
      let responseBody = '';
      
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: responseBody
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

    if (body) {
      req.write(body);
    }

    req.end();
  });
}

function getStatusText(code) {
  const statusTexts = {
    200: 'OK',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    500: 'Internal Server Error'
  };
  return statusTexts[code] || 'Unknown';
}

// Run the test
testSupabaseEndpoints().then(result => {
  if (result) {
    console.log(`\n🎉 Found working JWKS endpoint: ${result.endpoint}`);
    console.log(`✅ Full URL: ${result.url}`);
  } else {
    console.log(`\n❌ No working JWKS endpoint found`);
    console.log(`🤔 This may mean Supabase uses a different auth method or the project config is wrong`);
  }
}).catch(console.error);