/**
 * Direct Mailgun test to validate configuration
 */

import formData from 'form-data';
import Mailgun from 'mailgun.js';

async function testMailgunDirect() {
  console.log('🧪 Testing Mailgun configuration directly...');
  
  // Check environment variables
  console.log('MAILGUN_API_KEY exists:', !!process.env.MAILGUN_API_KEY);
  console.log('MAILGUN_DOMAIN:', process.env.MAILGUN_DOMAIN);
  
  if (!process.env.MAILGUN_API_KEY) {
    console.error('❌ Missing required environment variables');
    return;
  }
  
  // Test custom domain
  console.log('\n🧪 Testing custom domain: mg.musobuddy.com');
  
  try {
    // Initialize Mailgun
    const mailgun = new Mailgun(formData);
    
    // Try both US and EU endpoints
    const endpoints = [
      'https://api.mailgun.net',
      'https://api.eu.mailgun.net'
    ];
    
    for (const endpoint of endpoints) {
      console.log(`\n🔍 Testing endpoint: ${endpoint}`);
      
      const mg = mailgun.client({
        username: 'api',
        key: process.env.MAILGUN_API_KEY,
        url: endpoint
      });
      
      // Test custom domain
      try {
        const domain = await mg.domains.get('mg.musobuddy.com');
        console.log('✅ Custom domain info retrieved:', domain.name);
        console.log('✅ Domain state:', domain.state);
        console.log('✅ This endpoint works with custom domain!');
        break;
      } catch (error) {
        console.error('❌ Error with custom domain on', endpoint, ':', error.message);
        console.error('Status:', error.status);
        console.error('Type:', error.type);
      }
    }
  } catch (error) {
    console.error('❌ General error:', error.message);
    console.error('Full error:', error);
  }
}

testMailgunDirect();