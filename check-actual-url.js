/**
 * Check what the actual accessible URL is for this Replit
 */

import https from 'https';

async function checkActualURL() {
  console.log('=== CHECKING ACTUAL REPLIT URL ===');
  
  // Test different possible URLs
  const possibleUrls = [
    'https://musobuddy.replit.app',
    'https://musobuddy--timfulker.replit.app',
    'https://musobuddy.timfulker.replit.app'
  ];
  
  for (const url of possibleUrls) {
    try {
      console.log(`\nTesting: ${url}/api/webhook/sendgrid`);
      
      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        port: 443,
        path: '/api/webhook/sendgrid',
        method: 'GET',
        timeout: 5000
      };
      
      const response = await new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            resolve({ status: res.statusCode, data, url });
          });
        });
        
        req.on('error', reject);
        req.on('timeout', () => reject(new Error('Timeout')));
        req.setTimeout(5000);
        req.end();
      });
      
      console.log(`✅ ${url} - Status: ${response.status}`);
      if (response.status === 200) {
        console.log(`🎯 WORKING URL FOUND: ${url}/api/webhook/sendgrid`);
        const data = JSON.parse(response.data);
        console.log('Response:', data);
        return url;
      }
      
    } catch (error) {
      console.log(`❌ ${url} - Error: ${error.message}`);
    }
  }
  
  console.log('\n=== ANALYSIS ===');
  console.log('The working URL should be used in SendGrid Inbound Parse settings');
}

checkActualURL();