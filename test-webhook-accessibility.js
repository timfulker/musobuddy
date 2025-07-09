/**
 * Test webhook accessibility from external sources
 */

import { spawn } from 'child_process';

async function testWebhookAccessibility() {
  console.log('🔍 Testing webhook accessibility...\n');
  
  const webhookUrls = [
    'https://musobuddy.com/api/webhook/sendgrid',
    'https://musobuddy.com/api/webhook/email',
    'https://musobuddy.com/api/webhook/parse'
  ];
  
  for (const url of webhookUrls) {
    console.log(`Testing: ${url}`);
    
    try {
      // Test with a simple GET request first
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SendGrid-Test)'
        }
      });
      
      console.log(`GET ${url}: ${response.status} ${response.statusText}`);
      
      // Test with POST request (what SendGrid would use)
      const postResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'SendGrid-Event-Webhook/1.0'
        },
        body: 'to=leads@musobuddy.com&from=test@example.com&subject=Test&text=Test message'
      });
      
      console.log(`POST ${url}: ${postResponse.status} ${postResponse.statusText}`);
      const responseText = await postResponse.text();
      console.log(`Response: ${responseText.substring(0, 100)}...`);
      
    } catch (error) {
      console.log(`Error testing ${url}:`, error.message);
    }
    
    console.log('---');
  }
}

// Run the test
testWebhookAccessibility().catch(console.error);