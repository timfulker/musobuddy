/**
 * Test the fix for timfulkermusic@gmail.com email processing
 * This simulates exactly what Mailgun should send for this email address
 */

async function testTimfulkermusicFix() {
  console.log('🎯 TESTING TIMFULKERMUSIC@GMAIL.COM FIX');
  console.log('');
  
  const testData = {
    // Mailgun format for timfulkermusic@gmail.com
    sender: 'timfulkermusic@gmail.com',
    from: 'timfulkermusic@gmail.com',
    subject: 'Wedding Enquiry - September 15th',
    'body-plain': `Hi there,

I hope this email finds you well. I'm reaching out regarding a potential booking for my wedding.

Event Details:
- Date: September 15th, 2025
- Time: 2:30pm
- Venue: The Grand Hotel, Brighton
- Event Type: Wedding ceremony and reception

I'm looking for a saxophonist to perform during the ceremony and cocktail hour. Could you please let me know your availability and pricing?

Looking forward to hearing from you.

Best regards,
Tim Fulker
Phone: 07123 456789
Email: timfulkermusic@gmail.com`,
    to: 'leads@musobuddy.com',
    recipient: 'leads@musobuddy.com'
  };
  
  try {
    console.log('📧 Sending test request to webhook...');
    const response = await fetch('http://localhost:5000/api/webhook/mailgun', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(testData).toString()
    });
    
    const result = await response.json();
    console.log('');
    console.log('📧 WEBHOOK RESPONSE:');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (response.status === 200 && result.success) {
      console.log('');
      console.log('✅ SUCCESS! Expected results:');
      console.log('   - Client Name: "timfulkermusic" (from email username)');
      console.log('   - Client Email: "timfulkermusic@gmail.com"');
      console.log('   - Phone: "07123 456789" (extracted from body)');
      console.log('   - Event Date: "September 15th, 2025"');
      console.log('   - Venue: "The Grand Hotel" (extracted from body)');
      console.log('   - Event Type: "wedding"');
      console.log('');
      console.log('🎯 ACTUAL EXTRACTED DATA:');
      console.log('   - Client Name:', result.clientName);
      console.log('   - Phone:', result.extracted.phone);
      console.log('   - Event Date:', result.extracted.eventDate);
      console.log('   - Venue:', result.extracted.venue);
      console.log('   - Event Type:', result.extracted.eventType);
      console.log('   - Gig Type:', result.extracted.gigType);
      
      if (result.clientName && result.clientName !== 'unknown' && result.clientName !== 'Unknown Client') {
        console.log('');
        console.log('🎉 FIX VERIFIED: Client name extraction working!');
        console.log('   No more "unknown" or "Unknown Client" fallback values');
      } else {
        console.log('');
        console.log('❌ FIX FAILED: Still getting fallback values');
      }
    } else {
      console.log('');
      console.log('❌ WEBHOOK FAILED:');
      console.log('   Response:', result);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testTimfulkermusicFix();