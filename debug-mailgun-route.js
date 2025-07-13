/**
 * Debug Mailgun route configuration
 */

async function checkMailgunRoute() {
  console.log('🔍 MAILGUN ROUTE CONFIGURATION DEBUG');
  console.log('=====================================');
  
  console.log('\n📧 Current understanding:');
  console.log('- Test emails work perfectly (enquiries #319-321)');
  console.log('- Real emails arrive with empty fields (enquiry #315)');
  console.log('- Webhook receives the request but fields are missing');
  console.log('- This indicates Mailgun route is not forwarding email content');
  
  console.log('\n🔍 Likely root cause:');
  console.log('- Mailgun route expression is too restrictive');
  console.log('- Route might be: match_recipient("leads@musobuddy.com")');
  console.log('- Should be: catch_all() for subdomain forwarding');
  
  console.log('\n✅ Solution required:');
  console.log('1. Update Mailgun route from specific recipient matching to catch_all()');
  console.log('2. Ensure route forwards ALL email fields (sender, subject, body-plain, etc.)');
  console.log('3. Verify route priority is set correctly');
  
  console.log('\n📋 Expected route configuration:');
  console.log('Expression: catch_all()');
  console.log('Action: forward("https://musobuddy.replit.app/api/webhook/mailgun")');
  console.log('Description: Forward all emails to MusoBuddy webhook');
  console.log('Priority: 0 (highest)');
  
  console.log('\n🔧 Test after route update:');
  console.log('Send email to leads@musobuddy.com and verify it creates enquiry with proper data');
}

checkMailgunRoute();