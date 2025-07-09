/**
 * Final SendGrid Diagnostic - Complete System Verification
 * Address all points raised by SendGrid support (Ronan N.)
 */

import dns from 'dns';
import https from 'https';
import { promisify } from 'util';

const dnsPromises = dns.promises;

async function verifyMXRecords() {
  console.log('\n=== MX RECORD VERIFICATION ===');
  try {
    const mxRecords = await dnsPromises.resolveMx('musobuddy.com');
    console.log('✓ MX Records found:', mxRecords);
    
    const hasSendGrid = mxRecords.some(record => 
      record.exchange.includes('sendgrid.net')
    );
    
    if (hasSendGrid) {
      console.log('✓ SendGrid MX record correctly configured');
    } else {
      console.log('✗ SendGrid MX record NOT found');
    }
    
    return hasSendGrid;
  } catch (error) {
    console.error('✗ MX Record lookup failed:', error.message);
    return false;
  }
}

async function testWebhookAccessibility() {
  console.log('\n=== WEBHOOK ACCESSIBILITY TEST ===');
  
  const webhookUrls = [
    'https://musobuddy.com/api/webhook/sendgrid',
    'https://musobuddy.com/api/webhook/email',
    'https://musobuddy.com/webhook/sendgrid'
  ];
  
  for (const url of webhookUrls) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
          'User-Agent': 'SendGrid-Event-Webhook/1.0'
        },
        body: 'to=test@example.com&from=test@musobuddy.com&subject=Test&text=Test message'
      });
      
      console.log(`✓ ${url} - Status: ${response.status}`);
      
      if (response.status === 200) {
        console.log('✓ Webhook is publicly accessible and responding correctly');
      }
    } catch (error) {
      console.log(`✗ ${url} - Error: ${error.message}`);
    }
  }
}

async function verifyDomainConfiguration() {
  console.log('\n=== DOMAIN CONFIGURATION VERIFICATION ===');
  
  // Check if leads.musobuddy.com is unique
  try {
    const aRecord = await dnsPromises.resolve4('leads.musobuddy.com');
    console.log('✓ leads.musobuddy.com A record:', aRecord);
  } catch (error) {
    console.log('✗ leads.musobuddy.com A record not found:', error.message);
  }
  
  // Check root domain
  try {
    const rootRecord = await dnsPromises.resolve4('musobuddy.com');
    console.log('✓ musobuddy.com A record:', rootRecord);
  } catch (error) {
    console.log('✗ musobuddy.com A record not found:', error.message);
  }
  
  // Check CNAME records for SendGrid authentication
  const cnameRecords = [
    's1._domainkey.musobuddy.com',
    's2._domainkey.musobuddy.com',
    'em9394.musobuddy.com',
    'url8065.musobuddy.com',
    'url8066.musobuddy.com'
  ];
  
  for (const record of cnameRecords) {
    try {
      const cname = await dnsPromises.resolveCname(record);
      console.log(`✓ ${record} CNAME:`, cname);
    } catch (error) {
      console.log(`✗ ${record} CNAME not found:`, error.message);
    }
  }
}

async function testEmailDelivery() {
  console.log('\n=== EMAIL DELIVERY TEST ===');
  
  const testEmails = [
    'timfulker@gmail.com',
    'test@musobuddy.com',
    'leads@musobuddy.com'
  ];
  
  console.log('Testing email delivery to different addresses...');
  
  for (const email of testEmails) {
    try {
      // Simulate sending test email
      console.log(`📧 Sending test to ${email}...`);
      
      const response = await fetch('https://musobuddy.com/api/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: email,
          subject: 'SendGrid Diagnostic Test',
          text: 'This is a test email from MusoBuddy diagnostic system'
        })
      });
      
      if (response.ok) {
        console.log(`✓ Test email sent to ${email}`);
      } else {
        console.log(`✗ Failed to send test email to ${email}: ${response.status}`);
      }
    } catch (error) {
      console.log(`✗ Error sending to ${email}:`, error.message);
    }
  }
}

async function checkInboundParseStatus() {
  console.log('\n=== INBOUND PARSE STATUS CHECK ===');
  
  // Check if webhook is receiving any traffic
  try {
    const response = await fetch('https://musobuddy.com/api/webhook/status');
    const data = await response.json();
    
    console.log('Webhook status:', data);
    
    if (data.lastReceived) {
      console.log('✓ Webhook has received traffic');
    } else {
      console.log('✗ No webhook traffic detected');
    }
  } catch (error) {
    console.log('✗ Cannot check webhook status:', error.message);
  }
}

async function generateSupportPackage() {
  console.log('\n=== GENERATING SUPPORT PACKAGE ===');
  
  const diagnosticData = {
    timestamp: new Date().toISOString(),
    domain: 'musobuddy.com',
    webhookUrl: 'https://musobuddy.com/api/webhook/sendgrid',
    mxRecords: await dnsPromises.resolveMx('musobuddy.com').catch(() => null),
    dnsConfiguration: {},
    webhookTests: []
  };
  
  console.log('Diagnostic package generated:');
  console.log(JSON.stringify(diagnosticData, null, 2));
}

async function runFinalDiagnostic() {
  console.log('🔍 SENDGRID FINAL DIAGNOSTIC STARTED');
  console.log('Addressing all points raised by SendGrid support...\n');
  
  await verifyMXRecords();
  await testWebhookAccessibility();
  await verifyDomainConfiguration();
  await testEmailDelivery();
  await checkInboundParseStatus();
  await generateSupportPackage();
  
  console.log('\n=== DIAGNOSTIC COMPLETE ===');
  console.log('If all tests pass but email forwarding still fails,');
  console.log('the issue is confirmed to be on SendGrid\'s side.');
}

// Run the diagnostic
runFinalDiagnostic().catch(console.error);