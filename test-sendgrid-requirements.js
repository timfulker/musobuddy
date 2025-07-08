/**
 * SendGrid Requirements Validation Test
 * Based on SendGrid support response from July 8, 2025
 */

import https from 'https';
import http from 'http';

async function testSendGridRequirements() {
  console.log('=== SendGrid Inbound Parse Requirements Test ===\n');
  
  // 1. Test MX Record Configuration
  console.log('1. Testing MX Record Configuration...');
  try {
    const response = await fetch('https://dns.google/resolve?name=musobuddy.com&type=MX');
    const data = await response.json();
    
    if (data.Answer && data.Answer.length > 0) {
      const mxRecord = data.Answer[0].data;
      console.log('✓ MX Record found:', mxRecord);
      
      if (mxRecord.includes('mx.sendgrid.net')) {
        console.log('✓ MX Record correctly points to mx.sendgrid.net');
      } else {
        console.log('✗ MX Record does not point to mx.sendgrid.net');
      }
    } else {
      console.log('✗ No MX record found');
    }
  } catch (error) {
    console.log('✗ Error checking MX record:', error.message);
  }
  
  // 2. Test Domain Authentication
  console.log('\n2. Testing Domain Authentication...');
  try {
    const response = await fetch('https://dns.google/resolve?name=em7242.musobuddy.com&type=CNAME');
    const data = await response.json();
    
    if (data.Answer && data.Answer.length > 0) {
      console.log('✓ Domain authentication CNAME records found');
      data.Answer.forEach(record => {
        console.log('  -', record.data);
      });
    } else {
      console.log('? Domain authentication records not found via DNS (may be configured in SendGrid)');
    }
  } catch (error) {
    console.log('? Error checking domain authentication:', error.message);
  }
  
  // 3. Test Webhook URL Accessibility
  console.log('\n3. Testing Webhook URL Accessibility...');
  const webhookUrl = 'https://musobuddy.com/api/webhook/sendgrid';
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'to=leads@musobuddy.com&from=test@example.com&subject=Test&text=Test message'
    });
    
    console.log('✓ Webhook URL is accessible');
    console.log('  Status:', response.status);
    console.log('  Status Text:', response.statusText);
    
    if (response.status >= 200 && response.status < 300) {
      console.log('✓ Webhook returns 2xx status code');
    } else {
      console.log('✗ Webhook does not return 2xx status code');
    }
    
    // Check for redirects
    if (response.redirected) {
      console.log('✗ Webhook URL redirects (SendGrid requirement: no redirects)');
    } else {
      console.log('✓ Webhook URL does not redirect');
    }
    
  } catch (error) {
    console.log('✗ Error accessing webhook URL:', error.message);
  }
  
  // 4. Test Webhook Response Content
  console.log('\n4. Testing Webhook Response Content...');
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'to=leads@musobuddy.com&from=test@example.com&subject=Test Enquiry&text=Hello, I need a quote for my wedding'
    });
    
    const responseText = await response.text();
    console.log('✓ Webhook response received');
    console.log('  Response:', responseText);
    
  } catch (error) {
    console.log('✗ Error testing webhook response:', error.message);
  }
  
  // 5. Test DNS propagation
  console.log('\n5. Testing DNS Propagation...');
  try {
    const response = await fetch('https://dns.google/resolve?name=musobuddy.com&type=A');
    const data = await response.json();
    
    if (data.Answer && data.Answer.length > 0) {
      console.log('✓ A record found:', data.Answer[0].data);
    } else {
      console.log('✗ No A record found');
    }
  } catch (error) {
    console.log('✗ Error checking A record:', error.message);
  }
  
  // 6. Summary and Recommendations
  console.log('\n=== SUMMARY ===');
  console.log('Based on SendGrid requirements:');
  console.log('1. MX Record: Should point to mx.sendgrid.net with priority 10');
  console.log('2. Domain Authentication: Must be configured in SendGrid dashboard');
  console.log('3. Webhook URL: Must return 2xx status and not redirect');
  console.log('4. Subdomain uniqueness: leads@musobuddy.com should be unique');
  console.log('5. Message size: Must not exceed 30MB');
  console.log('\nNext steps:');
  console.log('- Verify domain authentication in SendGrid dashboard');
  console.log('- Test with actual email to leads@musobuddy.com');
  console.log('- Check SendGrid logs for any error messages');
}

// Run the test
testSendGridRequirements().catch(console.error);