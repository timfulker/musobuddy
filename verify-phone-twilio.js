// Verify phone number in Twilio to enable SMS sending
const twilioSid = process.env.TWILIO_ACCOUNT_SID;
const twilioToken = process.env.TWILIO_AUTH_TOKEN;

async function verifyPhoneNumber() {
  try {
    const { default: twilio } = await import('twilio');
    const client = twilio(twilioSid, twilioToken);
    
    console.log('🔍 Checking current verified numbers...');
    
    // List current verified numbers
    const validationRequests = await client.validationRequests.list();
    console.log('Current verified numbers:', validationRequests.map(v => v.phoneNumber));
    
    // Add your phone number to verified list
    const phoneNumber = '+447764190034';
    
    console.log('📱 Attempting to verify phone number:', phoneNumber);
    
    // Create validation request
    const validationRequest = await client.validationRequests.create({
      phoneNumber: phoneNumber,
      friendlyName: 'MusoBuddy Owner Phone'
    });
    
    console.log('✅ Verification request created:', validationRequest.sid);
    console.log('📞 You should receive a call to verify this number');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    // Alternative: Try to send test SMS directly with better error handling
    console.log('\n🔄 Attempting direct SMS test...');
    
    const { default: twilio } = await import('twilio');
    const client = twilio(twilioSid, twilioToken);
    
    try {
      const message = await client.messages.create({
        body: 'MusoBuddy verification: Your code is 101600',
        from: process.env.TWILIO_PHONE_NUMBER,
        to: '+447764190034'
      });
      console.log('✅ SMS sent successfully:', message.sid);
    } catch (smsError) {
      console.error('❌ SMS Error:', smsError.message);
      console.log('\n💡 Solution: Go to https://console.twilio.com/us1/develop/phone-numbers/manage/verified');
      console.log('Click "Add a new number" and verify +447764190034');
    }
  }
}

verifyPhoneNumber();