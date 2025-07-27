// Check all verified numbers in Twilio account
const twilioSid = process.env.TWILIO_ACCOUNT_SID;
const twilioToken = process.env.TWILIO_AUTH_TOKEN;

async function checkVerifiedNumbers() {
  try {
    const { default: twilio } = await import('twilio');
    const client = twilio(twilioSid, twilioToken);
    
    console.log('🔍 Checking all verified caller IDs...');
    
    // List all verified outgoing caller IDs
    const outgoingCallerIds = await client.outgoingCallerIds.list();
    
    console.log('\n📱 Verified Caller IDs:');
    outgoingCallerIds.forEach((callerId, index) => {
      console.log(`${index + 1}. ${callerId.phoneNumber} (${callerId.friendlyName})`);
    });
    
    // Check if our target number is in the list
    const targetNumber = '+447764190034';
    const isVerified = outgoingCallerIds.some(id => id.phoneNumber === targetNumber);
    
    console.log(`\n🎯 Target number ${targetNumber} verified:`, isVerified ? '✅ YES' : '❌ NO');
    
    if (!isVerified) {
      console.log('\n💡 The number might be formatted differently in Twilio.');
      console.log('Trying different formats...');
      
      // Try with different formats
      const formats = ['+447764190034', '447764190034', '+44 7764 190034'];
      formats.forEach(format => {
        const found = outgoingCallerIds.some(id => id.phoneNumber.replace(/\s/g, '') === format.replace(/\s/g, ''));
        console.log(`Format ${format}:`, found ? '✅ FOUND' : '❌ NOT FOUND');
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking verified numbers:', error.message);
  }
}

checkVerifiedNumbers();