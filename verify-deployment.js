/**
 * Verify enhanced webhook deployment
 */

async function verifyDeployment() {
  console.log('🚀 Verifying enhanced webhook deployment...');
  
  // Test with the exact format that should work
  const testData = {
    sender: 'Tim Fulker <timfulkermusic@gmail.com>',
    subject: 'Deployment Test - Wedding Enquiry',
    'body-plain': 'Hi, my name is Tim Fulker. I need a saxophonist for my wedding on August 15th at The Grand Hotel. Please contact me on 07123 456789.'
  };
  
  console.log('📤 Testing production webhook with enhanced data...');
  
  try {
    const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(testData)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ DEPLOYMENT SUCCESSFUL!');
      console.log('📊 Enhanced webhook is live and working');
      console.log('');
      console.log('🎯 Test Results:');
      console.log(`   📊 Enquiry ID: ${result.enquiryId}`);
      console.log(`   👤 Client Name: ${result.clientName}`);
      console.log(`   📧 Email: ${result.debug?.extractedEmail || 'Check console logs'}`);
      console.log(`   📝 Subject: ${result.debug?.extractedSubject || 'Check console logs'}`);
      console.log(`   📄 Body Length: ${result.debug?.bodyLength || 'Check console logs'}`);
      console.log(`   🎯 Processing: ${result.processing || 'dedicated-handler'}`);
      console.log('');
      
      if (result.extracted) {
        console.log('🔍 Enhanced Extraction Results:');
        console.log(`   📞 Phone: ${result.extracted.phone || 'None detected'}`);
        console.log(`   📅 Event Type: ${result.extracted.eventType || 'None detected'}`);
        console.log(`   🏢 Venue: ${result.extracted.venue || 'None detected'}`);
        console.log(`   🎵 Gig Type: ${result.extracted.gigType || 'None detected'}`);
      }
      
      console.log('');
      console.log('🎉 Ready for real email test!');
      console.log('📧 Send an email from timfulkermusic@gmail.com to leads@musobuddy.com');
      console.log('   The enhanced webhook should now extract full content and client details');
      
    } else {
      console.log('❌ DEPLOYMENT ISSUE');
      console.log(`   Status: ${response.status}`);
      const error = await response.text();
      console.log(`   Error: ${error}`);
      console.log('');
      console.log('🔧 This might mean:');
      console.log('   - Deployment is still in progress');
      console.log('   - Production server needs to restart');
      console.log('   - Try again in a few minutes');
    }
    
  } catch (error) {
    console.log('❌ CONNECTION ERROR');
    console.log(`   Error: ${error.message}`);
    console.log('');
    console.log('🔧 This might mean:');
    console.log('   - Deployment is still in progress');
    console.log('   - Network connectivity issue');
    console.log('   - Try again in a few minutes');
  }
}

// Wait a moment for deployment to complete, then test
setTimeout(verifyDeployment, 5000);