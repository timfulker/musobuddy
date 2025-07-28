// Direct SMS test
import { smsService } from './server/core/sms-service.js';

async function testSMSDirect() {
  console.log('📱 Testing SMS service directly...');
  
  // Check service configuration
  const config = smsService.getConfigurationStatus();
  console.log('SMS Configuration:', config);
  console.log('Service configured:', smsService.isServiceConfigured());
  
  // Test sending SMS
  try {
    console.log('\n📱 Attempting to send test SMS to +447764190034...');
    const result = await smsService.sendVerificationCode('+447764190034', '123456');
    console.log('SMS send result:', result);
  } catch (error) {
    console.error('SMS send error:', error);
  }
  
  process.exit(0);
}

testSMSDirect();