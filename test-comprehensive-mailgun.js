/**
 * Comprehensive test for all Mailgun route forwarding scenarios
 * Tests different email formats that might be causing the "Failed" status
 */

const testScenarios = [
  {
    name: "Gmail Standard Format",
    data: {
      'recipient': 'leads@musobuddy.com',
      'sender': 'client@gmail.com',
      'from': 'Sarah Johnson <client@gmail.com>',
      'subject': 'Corporate Event Music',
      'body-plain': `Hi,

I need a musician for a corporate event on September 20th at The Business Center.

Please let me know your availability and rates.

Best regards,
Sarah Johnson
Phone: 07987 654321`,
      'stripped-text': `Hi,

I need a musician for a corporate event on September 20th at The Business Center.

Please let me know your availability and rates.

Best regards,
Sarah Johnson
Phone: 07987 654321`,
      'timestamp': Math.floor(Date.now() / 1000).toString(),
      'token': 'test-token-123',
      'signature': 'test-signature-456'
    }
  },
  {
    name: "Outlook/Hotmail Format",
    data: {
      'recipient': 'leads@musobuddy.com',
      'sender': 'client@outlook.com',
      'from': 'client@outlook.com',
      'subject': 'Birthday Party Music',
      'body-plain': `Hello,

Looking for live music for my birthday party on October 5th.

Venue: The Community Hall
Time: 7pm-11pm

Thanks,
Mike Thompson
Mobile: 07123 987654`,
      'body-html': `<div>Hello,<br><br>Looking for live music for my birthday party on October 5th.<br><br>Venue: The Community Hall<br>Time: 7pm-11pm<br><br>Thanks,<br>Mike Thompson<br>Mobile: 07123 987654</div>`,
      'stripped-text': `Hello,

Looking for live music for my birthday party on October 5th.

Venue: The Community Hall
Time: 7pm-11pm

Thanks,
Mike Thompson
Mobile: 07123 987654`,
      'timestamp': Math.floor(Date.now() / 1000).toString(),
      'token': 'test-token-789',
      'signature': 'test-signature-012'
    }
  },
  {
    name: "Apple Mail Format",
    data: {
      'recipient': 'leads@musobuddy.com',
      'sender': 'client@icloud.com',
      'from': 'Emma Davies <client@icloud.com>',
      'subject': 'Wedding Music Inquiry',
      'body-plain': `Dear Musician,

We are getting married on November 12th at St. Mary's Church and would love to have live music for our ceremony.

Could you please provide a quote for acoustic guitar and vocals?

Kind regards,
Emma Davies
Tel: 07456 123789
Email: client@icloud.com`,
      'stripped-text': `Dear Musician,

We are getting married on November 12th at St. Mary's Church and would love to have live music for our ceremony.

Could you please provide a quote for acoustic guitar and vocals?

Kind regards,
Emma Davies
Tel: 07456 123789
Email: client@icloud.com`,
      'message-headers': JSON.stringify([
        ['From', 'Emma Davies <client@icloud.com>'],
        ['To', 'leads@musobuddy.com'],
        ['Subject', 'Wedding Music Inquiry'],
        ['Date', 'Sat, 13 Jul 2025 11:30:00 +0000']
      ]),
      'timestamp': Math.floor(Date.now() / 1000).toString(),
      'token': 'test-token-345',
      'signature': 'test-signature-678'
    }
  },
  {
    name: "Business Email Format",
    data: {
      'recipient': 'leads@musobuddy.com',
      'sender': 'events@company.co.uk',
      'from': 'Company Events <events@company.co.uk>',
      'subject': 'Annual Company Party Entertainment',
      'body-plain': `Good morning,

We are organizing our annual company party and require live entertainment.

Event Details:
- Date: December 15th, 2025
- Time: 6:00 PM - 11:00 PM
- Venue: The Grand Ballroom, Hotel Plaza
- Expected guests: 150 people
- Music style: Jazz/Swing

Please send us your availability and pricing.

Best regards,
Jennifer Walsh
Event Coordinator
Company Ltd
Direct: 020 7123 4567`,
      'stripped-text': `Good morning,

We are organizing our annual company party and require live entertainment.

Event Details:
- Date: December 15th, 2025
- Time: 6:00 PM - 11:00 PM
- Venue: The Grand Ballroom, Hotel Plaza
- Expected guests: 150 people
- Music style: Jazz/Swing

Please send us your availability and pricing.

Best regards,
Jennifer Walsh
Event Coordinator
Company Ltd
Direct: 020 7123 4567`,
      'timestamp': Math.floor(Date.now() / 1000).toString(),
      'token': 'test-token-901',
      'signature': 'test-signature-234'
    }
  },
  {
    name: "Minimal Email Format",
    data: {
      'recipient': 'leads@musobuddy.com',
      'sender': 'simple@email.com',
      'subject': 'Music needed',
      'body-plain': 'Need music for event. Call me 07999 888777',
      'timestamp': Math.floor(Date.now() / 1000).toString()
    }
  }
];

async function testAllScenarios() {
  console.log('🔍 COMPREHENSIVE MAILGUN ROUTE TESTING');
  console.log('====================================');
  
  for (const scenario of testScenarios) {
    console.log(`\n📧 Testing: ${scenario.name}`);
    console.log('─'.repeat(40));
    
    try {
      const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mailgun'
        },
        body: new URLSearchParams(scenario.data).toString()
      });

      console.log('Status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ SUCCESS');
        console.log('Enquiry ID:', result.enquiryId);
        console.log('Client Name:', result.clientName);
        console.log('Extracted Data:', JSON.stringify(result.extracted, null, 2));
      } else {
        console.log('❌ FAILED');
        const errorText = await response.text();
        console.log('Error:', errorText);
      }
    } catch (error) {
      console.error('❌ REQUEST FAILED:', error.message);
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n🔍 All tests completed!');
}

testAllScenarios();