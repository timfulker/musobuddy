// Simple test to check authentication
import https from 'https';
import fs from 'fs';

// Read cookies from file
let cookies = '';
try {
  cookies = fs.readFileSync('cookies.txt', 'utf8').trim();
} catch (e) {
  console.log('No cookies file found');
}

// Test the debug route
const options = {
  hostname: 'musobuddy.replit.app',
  port: 443,
  path: '/api/debug-user',
  method: 'GET',
  headers: {
    'Cookie': cookies,
    'User-Agent': 'Mozilla/5.0 (compatible; test)',
  }
};

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
    try {
      const parsed = JSON.parse(data);
      console.log('Parsed:', JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('Could not parse JSON');
    }
  });
});

req.on('error', (e) => {
  console.error(`Request error: ${e.message}`);
});

req.end();