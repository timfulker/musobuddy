// Add phone number to Twilio verified caller IDs
const twilioSid = process.env.TWILIO_ACCOUNT_SID;
const twilioToken = process.env.TWILIO_AUTH_TOKEN;

async function addVerifiedNumber() {
  try {
    const { default: twilio } = await import('twilio');
    const client = twilio(twilioSid, twilioToken);
    
    console.log('📱 Adding +447764190034 to verified caller IDs...');
    
    // Use the outgoingCallerIds API to add verified number
    const callerIdResource = await client.outgoingCallerIds.create({
      phoneNumber: '+447764190034',
      friendlyName: 'MusoBuddy Test Number'
    });
    
    console.log('✅ Verification initiated:', callerIdResource.sid);
    console.log('📞 You should receive a call with a verification code');
    console.log('🔢 Answer the call and enter the code to complete verification');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n📋 MANUAL STEPS REQUIRED:');
    console.log('1. Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/verified');
    console.log('2. Click "Add a new number"');
    console.log('3. Enter: +447764190034');
    console.log('4. Choose verification method (call or SMS)');
    console.log('5. Complete verification process');
  }
}

addVerifiedNumber();