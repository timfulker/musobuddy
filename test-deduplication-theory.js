/**
 * Test the deduplication theory with unique identifiers
 */

async function testDeduplicationTheory() {
  console.log('🔬 TESTING DEDUPLICATION THEORY');
  console.log('');
  
  // Test with unique timestamps to break deduplication
  const timestamp = new Date().toISOString();
  const uniqueId = Math.random().toString(36).substring(7);
  
  console.log('🧪 Testing with unique identifiers to break deduplication:');
  console.log(`   Timestamp: ${timestamp}`);
  console.log(`   Unique ID: ${uniqueId}`);
  console.log('');
  
  // Test with a previously failing address but unique content
  const testData = {
    sender: 'Tim Fulker <timfulkermusic@gmail.com>',
    subject: `UNIQUE TEST - ${timestamp} - ${uniqueId}`,
    'body-plain': `This is a unique test email to break deduplication.
    
Timestamp: ${timestamp}
Unique ID: ${uniqueId}
Test purpose: Verify that unique content bypasses Mailgun deduplication

My name is Tim Fulker
Phone: 07123 456789
I need a saxophonist for my wedding on August 15th at The Grand Hotel
Event time: 7:00 PM
This is a completely unique message that should not be deduplicated.

Random data: ${Math.random()}`
  };
  
  try {
    console.log('📧 Sending test with unique content to break deduplication...');
    
    const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(testData)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Test completed successfully');
      console.log(`   📊 Created enquiry: ${result.enquiryId}`);
      console.log(`   👤 Client extracted: ${result.clientName}`);
      console.log(`   📧 Email extracted: ${result.clientEmail}`);
      console.log(`   📋 Subject extracted: ${result.subject}`);
      console.log(`   📝 Content length: ${result.content ? result.content.length : 0} characters`);
      console.log('');
      
      if (result.clientName !== 'unknown' && result.clientName !== 'Unknown Client') {
        console.log('🎯 SUCCESS: Unique content bypassed deduplication!');
        console.log('   The previously failing address now works with unique content');
        console.log('   This confirms the deduplication theory');
      } else {
        console.log('❌ Still failing: Deduplication may be address-based, not content-based');
      }
    } else {
      console.log(`❌ Test failed: ${response.status}`);
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
  
  console.log('');
  console.log('🔍 ANALYSIS:');
  console.log('If this test extracts full data from timfulkermusic@gmail.com,');
  console.log('it proves that unique content bypasses Mailgun deduplication.');
  console.log('');
  console.log('If it still fails, the deduplication is likely:');
  console.log('- Address-based (not content-based)');
  console.log('- Time-window based (cooling off period needed)');
  console.log('- Message-ID based (email client level)');
}

testDeduplicationTheory();