/**
 * Test webhook with real Mailgun email format
 * This simulates exactly what Mailgun sends for real emails
 */

async function testRealMailgunFormat() {
  console.log('🔍 TESTING REAL MAILGUN FORMAT');
  
  // This is the exact format that Mailgun routes send according to their documentation
  const realMailgunData = {
    'recipient': 'leads@musobuddy.com',
    'sender': 'timfulkermusic@gmail.com',
    'from': 'Tim Fulker <timfulkermusic@gmail.com>',
    'subject': 'Wedding Saxophone Enquiry',
    'body-plain': `Hi there,

I'm looking for a saxophone player for my wedding on August 15th at The Grand Hotel.

We'd love to have some jazz music during the reception. Could you please let me know your availability and rates?

Best regards,
Tim Fulker
Phone: 07123 456789
Email: timfulkermusic@gmail.com`,
    'body-html': `<div dir="ltr">Hi there,<br><br>I'm looking for a saxophone player for my wedding on August 15th at The Grand Hotel.<br><br>We'd love to have some jazz music during the reception. Could you please let me know your availability and rates?<br><br>Best regards,<br>Tim Fulker<br>Phone: 07123 456789<br>Email: timfulkermusic@gmail.com</div>`,
    'stripped-text': `Hi there,

I'm looking for a saxophone player for my wedding on August 15th at The Grand Hotel.

We'd love to have some jazz music during the reception. Could you please let me know your availability and rates?

Best regards,
Tim Fulker
Phone: 07123 456789
Email: timfulkermusic@gmail.com`,
    'stripped-html': `<div dir="ltr">Hi there,<br><br>I'm looking for a saxophone player for my wedding on August 15th at The Grand Hotel.<br><br>We'd love to have some jazz music during the reception. Could you please let me know your availability and rates?<br><br>Best regards,<br>Tim Fulker<br>Phone: 07123 456789<br>Email: timfulkermusic@gmail.com</div>`,
    'message-headers': JSON.stringify([
      ['Received', 'from mail-lf1-f50.google.com (mail-lf1-f50.google.com [209.85.167.50])'],
      ['Return-Path', '<timfulkermusic@gmail.com>'],
      ['From', 'Tim Fulker <timfulkermusic@gmail.com>'],
      ['To', 'leads@musobuddy.com'],
      ['Subject', 'Wedding Saxophone Enquiry'],
      ['Date', 'Sat, 13 Jul 2025 11:30:00 +0000'],
      ['Message-ID', '<CABc123def456789@mail.gmail.com>'],
      ['Content-Type', 'text/html; charset=UTF-8']
    ]),
    'timestamp': '1752407400',
    'token': 'ca8c8e8d51da30b6b3f26e9b7d8d8c8a8b8c8d8e',
    'signature': 'b8c8d8e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6'
  };

  console.log('📧 Testing webhook with real Mailgun format...');
  
  try {
    const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mailgun'
      },
      body: new URLSearchParams(realMailgunData).toString()
    });

    const statusText = response.statusText;
    console.log('Status:', response.status);
    console.log('Status Text:', statusText);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ SUCCESS - Real Mailgun format working!');
      console.log('Response:', JSON.stringify(result, null, 2));
    } else {
      console.log('❌ FAILED - Status:', response.status);
      const errorText = await response.text();
      console.log('Error:', errorText);
    }
  } catch (error) {
    console.error('❌ REQUEST FAILED:', error.message);
  }
}

testRealMailgunFormat();