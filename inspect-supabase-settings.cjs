/**
 * Inspect Supabase settings to understand the project configuration
 */

const https = require('https');

async function inspectSupabaseSettings() {
  console.log('🔍 Inspecting Supabase Project Settings\n');

  const isDev = process.env.NODE_ENV === 'development';
  const supabaseUrl = isDev ? process.env.SUPABASE_URL_DEV : process.env.SUPABASE_URL_PROD;
  const anonKey = isDev ? process.env.SUPABASE_ANON_KEY_DEV : process.env.SUPABASE_ANON_KEY_PROD;

  if (!supabaseUrl || !anonKey) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
  }

  console.log(`🔗 Supabase URL: ${supabaseUrl}`);

  try {
    // Get full settings
    const settingsUrl = `${supabaseUrl}/auth/v1/settings`;
    const response = await makeRequest(settingsUrl, anonKey);
    
    if (response.statusCode === 200) {
      console.log('✅ Supabase Settings Retrieved Successfully\n');
      
      const settings = JSON.parse(response.body);
      
      console.log('📋 Project Configuration:');
      console.log('==========================================');
      console.log(JSON.stringify(settings, null, 2));
      
      // Look for JWT-related settings
      console.log('\n🔍 JWT & Authentication Analysis:');
      console.log('==========================================');
      
      if (settings.jwt_secret) {
        console.log(`✅ JWT Secret: Present (${settings.jwt_secret.substring(0, 20)}...)`);
      } else {
        console.log('❌ JWT Secret: Missing');
      }
      
      if (settings.jwt_aud) {
        console.log(`✅ JWT Audience: ${settings.jwt_aud}`);
      } else {
        console.log('⚠️ JWT Audience: Not specified');
      }
      
      if (settings.jwt_exp) {
        console.log(`✅ JWT Expiry: ${settings.jwt_exp}`);
      }

      // Check external providers
      console.log('\n🔌 External Providers:');
      if (settings.external) {
        Object.entries(settings.external).forEach(([provider, enabled]) => {
          if (enabled) {
            console.log(`  ✅ ${provider}: enabled`);
          }
        });
      }

      // Look for any mentions of JWKS or keys
      const settingsStr = JSON.stringify(settings);
      if (settingsStr.includes('jwks') || settingsStr.includes('keys') || settingsStr.includes('public_key')) {
        console.log('\n🔑 Key-related settings found:');
        // Extract relevant parts
        const keyWords = ['jwks', 'key', 'public', 'cert'];
        keyWords.forEach(word => {
          if (settingsStr.toLowerCase().includes(word)) {
            console.log(`  Contains "${word}"`);
          }
        });
      }

      return settings;
      
    } else {
      console.log(`❌ Failed to get settings: ${response.statusCode}`);
      console.log(`📄 Response:`, response.body);
    }
  } catch (error) {
    console.error(`❌ Error inspecting settings:`, error.message);
  }

  return null;
}

function makeRequest(url, apikey) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      timeout: 10000,
      headers: {
        'User-Agent': 'MusoBuddy-Settings-Inspector/1.0',
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

// Run the inspection
inspectSupabaseSettings().then(settings => {
  if (settings) {
    console.log('\n🎯 Next Steps Based on Configuration:');
    console.log('==========================================');
    
    // Check if we have what we need for JWT verification
    if (settings.jwt_secret) {
      console.log('1. ✅ We have JWT secret - can verify tokens directly');
      console.log('2. 🔧 JWKS endpoint may not be needed - use direct HS256 verification');
      console.log('3. 🧪 Test JWT verification using the secret instead of JWKS');
    } else {
      console.log('1. ❌ No JWT secret found');
      console.log('2. 🔍 Need to investigate alternative auth methods');
    }
  }
}).catch(console.error);