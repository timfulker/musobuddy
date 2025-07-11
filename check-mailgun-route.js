/**
 * Check Mailgun route configuration
 */

console.log('Checking Mailgun route configuration...');

// Test if the route is properly configured
const testRoute = async () => {
  try {
    console.log('Testing webhook endpoint accessibility...');
    
    const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
      method: 'GET'
    });
    
    console.log('Webhook endpoint status:', response.status);
    
    if (response.ok) {
      console.log('✅ Webhook endpoint is accessible');
    } else {
      console.log('❌ Webhook endpoint issue:', response.status);
    }
    
  } catch (error) {
    console.log('❌ Webhook endpoint not accessible:', error.message);
  }
};

const checkEmailRouting = () => {
  console.log('\n📧 Email routing check:');
  console.log('Domain: musobuddy.com');
  console.log('Email: leads@musobuddy.com');
  console.log('Expected flow: Email → Mailgun → Webhook → Enquiry');
  console.log('Webhook URL: https://musobuddy.replit.app/api/webhook/mailgun');
  console.log('\nNext steps:');
  console.log('1. Check Mailgun dashboard for route configuration');
  console.log('2. Verify route points to correct webhook URL');
  console.log('3. Check Mailgun logs for email delivery attempts');
};

testRoute();
checkEmailRouting();