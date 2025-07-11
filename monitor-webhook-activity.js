/**
 * Monitor webhook activity in real-time
 */

console.log('🔍 Monitoring webhook activity...');
console.log('Current time:', new Date().toISOString());
console.log('Webhook endpoint: https://musobuddy.replit.app/api/webhook/mailgun');
console.log('Waiting for incoming emails...');

// Check if webhook is still accessible
const testWebhook = async () => {
  try {
    const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
      method: 'GET'
    });
    
    if (response.ok) {
      console.log('✅ Webhook endpoint is accessible');
    } else {
      console.log('❌ Webhook endpoint returned:', response.status);
    }
  } catch (error) {
    console.log('❌ Webhook endpoint not accessible:', error.message);
  }
};

testWebhook();