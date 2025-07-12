#!/usr/bin/env node

/**
 * Test Enhanced Mailgun Webhook Handler
 * Tests all consultant's improvements
 */

import https from 'https';
import querystring from 'querystring';

async function testEnhancedWebhook() {
  console.log('🧪 Testing Enhanced Mailgun Webhook Handler...');
  
  // Enhanced test data with realistic email format
  const testData = {
    // Mailgun webhook fields
    sender: 'Sarah Johnson <sarah.johnson@gmail.com>',
    recipient: 'leads@musobuddy.com',
    subject: 'Wedding Saxophone Enquiry - August 15th',
    'body-plain': `Hi there,

My name is Sarah Johnson and I'm getting married on August 15th, 2025. 
I'm looking for a saxophone player for our wedding reception at The Grand Hotel in Brighton.

The event will be from 7pm to 11pm, and we'd love some smooth jazz during dinner and dancing music later.

Please let me know your availability and rates.

My contact details:
Phone: 07789 123456
Email: sarah.johnson@gmail.com

Looking forward to hearing from you!

Best regards,
Sarah Johnson`,
    'body-html': `<p>Hi there,</p>

<p>My name is Sarah Johnson and I'm getting married on August 15th, 2025.</p>
<p>I'm looking for a saxophone player for our wedding reception at The Grand Hotel in Brighton.</p>

<p>The event will be from 7pm to 11pm, and we'd love some smooth jazz during dinner and dancing music later.</p>

<p>Please let me know your availability and rates.</p>

<p>My contact details:<br>
Phone: 07789 123456<br>
Email: sarah.johnson@gmail.com</p>

<p>Looking forward to hearing from you!</p>

<p>Best regards,<br>
Sarah Johnson</p>`,
    timestamp: Math.floor(Date.now() / 1000),
    token: 'test-token-123',
    signature: 'test-signature'
  };

  // Convert to form data format
  const postData = querystring.stringify(testData);
  
  const options = {
    hostname: 'musobuddy.replit.app',
    port: 443,
    path: '/api/webhook/mailgun',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData),
      'User-Agent': 'Mailgun/Test'
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('📧 Response Status:', res.statusCode);
        console.log('📧 Response Headers:', res.headers);
        console.log('📧 Response Body:', data);
        
        try {
          const response = JSON.parse(data);
          if (res.statusCode === 200 && response.enquiryId) {
            console.log('✅ Enhanced webhook test PASSED!');
            console.log('📋 Created enquiry ID:', response.enquiryId);
            console.log('📧 Processed subject:', response.subject);
            console.log('📧 Processed from:', response.from);
            resolve(response);
          } else {
            console.log('❌ Enhanced webhook test FAILED');
            console.log('Expected 200 status with enquiryId, got:', res.statusCode);
            resolve(null);
          }
        } catch (error) {
          console.log('❌ Failed to parse response:', error.message);
          resolve(null);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request error:', error.message);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// Test the enhanced parsing capabilities
async function testEnhancedParsing() {
  console.log('\n🧪 Testing Enhanced Email Parsing...');
  
  const testCases = [
    {
      name: 'Wedding with venue and date',
      data: {
        sender: 'Emma Wilson <emma@example.com>',
        recipient: 'leads@musobuddy.com',
        subject: 'Wedding Saxophone - September 20th',
        'body-plain': 'Hi, my name is Emma Wilson. I need a saxophonist for my wedding on September 20th, 2025 at The Royal Gardens Hotel. Please call me on 07891 234567.'
      }
    },
    {
      name: 'Corporate event with phone',
      data: {
        sender: 'John Smith <j.smith@company.com>',
        recipient: 'leads@musobuddy.com',
        subject: 'Corporate Event Music',
        'body-plain': 'Hello, this is John Smith from ABC Corp. We need music for our corporate event on October 15th, 2025. The venue is City Conference Center. Contact: 07892 345678'
      }
    },
    {
      name: 'Birthday party casual',
      data: {
        sender: 'party.planner@gmail.com',
        recipient: 'leads@musobuddy.com',
        subject: 'Birthday Party Entertainment',
        'body-plain': 'Hi there! I\'m organizing a birthday party for November 3rd at the Community Hall. We need some live music. Phone me on 07893 456789.'
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📧 Testing: ${testCase.name}`);
    
    const postData = querystring.stringify(testCase.data);
    
    const options = {
      hostname: 'musobuddy.replit.app',
      port: 443,
      path: '/api/webhook/mailgun',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'Mailgun/Test'
      }
    };

    try {
      const response = await new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => data += chunk);
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              resolve({ status: res.statusCode, data: parsed });
            } catch (error) {
              resolve({ status: res.statusCode, data: data });
            }
          });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
      });

      console.log(`   Status: ${response.status}`);
      if (response.status === 200 && response.data.enquiryId) {
        console.log(`   ✅ Success - Enquiry ID: ${response.data.enquiryId}`);
      } else {
        console.log(`   ❌ Failed - ${JSON.stringify(response.data)}`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
}

async function runAllTests() {
  console.log('🚀 Running Enhanced Webhook Tests...\n');
  
  // Test 1: Enhanced webhook handler
  await testEnhancedWebhook();
  
  // Test 2: Enhanced parsing capabilities
  await testEnhancedParsing();
  
  console.log('\n🏁 All tests completed!');
  console.log('\n📋 Next Steps:');
  console.log('1. Add DMARC DNS records (see dmarc-critical-fix.md)');
  console.log('2. Update Mailgun route to point to webhook URL');
  console.log('3. Test real email forwarding to leads@musobuddy.com');
}

runAllTests().catch(console.error);