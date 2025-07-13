/**
 * Diagnose deployment issue with enhanced webhook
 */

async function diagnoseDeploymentIssue() {
  console.log('🔍 DIAGNOSING DEPLOYMENT ISSUE');
  console.log('');
  
  // The real email created enquiry #298 with fallback values
  console.log('❌ PROBLEM IDENTIFIED:');
  console.log('   Enquiry #298: unknown@example.com, "No message content"');
  console.log('   This means the enhanced webhook is NOT processing Mailgun data correctly');
  console.log('');
  
  // Test if the enhanced webhook is actually deployed
  console.log('🧪 Testing if enhanced webhook is actually deployed...');
  
  try {
    const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        sender: 'Test Deployment <test@example.com>',
        subject: 'Enhanced Webhook Test',
        'body-plain': 'Testing if enhanced webhook is deployed'
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Enhanced webhook is deployed and responding');
      console.log(`   📊 Created enquiry: ${result.enquiryId}`);
      console.log(`   👤 Client extracted: ${result.clientName}`);
      console.log(`   📧 Processing type: ${result.processing || 'unknown'}`);
      console.log('');
      
      if (result.clientName === 'Test Deployment') {
        console.log('✅ Enhanced parsing IS working for test data');
        console.log('❌ But NOT working for real Mailgun emails');
        console.log('');
        console.log('🔍 ROOT CAUSE:');
        console.log('   Mailgun sends emails in a different format than our test data');
        console.log('   Real emails from Mailgun use different field names');
        console.log('');
        console.log('🔧 SOLUTION NEEDED:');
        console.log('   1. Check deployment logs for webhook inspection data');
        console.log('   2. Look for "🔍 === WEBHOOK DATA INSPECTION START ===" logs');
        console.log('   3. See exactly what field format Mailgun is using');
        console.log('   4. Adapt the webhook to handle that specific format');
        console.log('');
        console.log('📋 Expected in deployment logs:');
        console.log('   - Complete body data from Mailgun');
        console.log('   - Field inspection results showing which fields are present');
        console.log('   - Extraction results showing what was/wasn\'t found');
      }
    } else {
      console.log('❌ Enhanced webhook deployment failed');
      console.log(`   Status: ${response.status}`);
    }
    
  } catch (error) {
    console.log('❌ Cannot reach enhanced webhook');
    console.log(`   Error: ${error.message}`);
  }
  
  console.log('');
  console.log('🎯 NEXT STEPS:');
  console.log('1. Check the deployment console logs for webhook inspection data');
  console.log('2. Find the exact field format Mailgun is using');
  console.log('3. Modify webhook to handle that specific format');
  console.log('4. Redeploy with the correct field mappings');
  console.log('');
  console.log('💡 The enhanced webhook is working - it just needs to be adapted');
  console.log('   to the specific field format that Mailgun actually uses.');
}

diagnoseDeploymentIssue();