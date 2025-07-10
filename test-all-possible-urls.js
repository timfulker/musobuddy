/**
 * Test all possible URL formats to find the correct one
 */

import https from 'https';

async function testURL(url) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: '/api/webhook/sendgrid',
      method: 'GET',
      timeout: 3000
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ success: true, status: res.statusCode, url });
      });
    });
    
    req.on('error', () => resolve({ success: false, url }));
    req.on('timeout', () => resolve({ success: false, url }));
    req.setTimeout(3000);
    req.end();
  });
}

async function findCorrectURL() {
  console.log('=== TESTING ALL POSSIBLE REPLIT URLS ===');
  
  // Based on the REPLIT_ID: f19aba74-886b-4308-a2de-cc9ba5e94af8
  const replit_id = 'f19aba74-886b-4308-a2de-cc9ba5e94af8';
  
  const urlsToTest = [
    'https://musobuddy.replit.app',
    'https://musobuddy--timfulker.replit.app',
    'https://musobuddy.timfulker.replit.app',
    'https://workspace--timfulker.replit.app',
    'https://workspace.timfulker.replit.app',
    `https://${replit_id}.replit.app`,
    `https://${replit_id}--timfulker.replit.app`,
    'https://musobuddy.replit.dev',
    'https://musobuddy--timfulker.replit.dev',
    'https://workspace--timfulker.replit.dev'
  ];
  
  const results = await Promise.all(urlsToTest.map(testURL));
  
  console.log('\n=== RESULTS ===');
  results.forEach(result => {
    if (result.success) {
      console.log(`✅ ${result.url} - Status: ${result.status}`);
    } else {
      console.log(`❌ ${result.url} - Failed`);
    }
  });
  
  const workingUrls = results.filter(r => r.success);
  if (workingUrls.length > 0) {
    console.log('\n=== WORKING URLS ===');
    workingUrls.forEach(url => {
      console.log(`🎯 ${url.url}/api/webhook/sendgrid`);
    });
    console.log('\n🔥 UPDATE SENDGRID WITH THE CORRECT URL ABOVE! 🔥');
  } else {
    console.log('\n❌ No working URLs found - this is unexpected');
  }
}

findCorrectURL();