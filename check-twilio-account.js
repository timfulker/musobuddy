// Check Twilio account status
import twilio from 'twilio';

async function checkTwilioAccount() {
  console.log('📱 Checking Twilio account status...');
  
  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    
    // Check account information
    const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
    console.log('Account Status:', account.status);
    console.log('Account Type:', account.type);
    
    // Check if account is in trial mode
    console.log('Account SID:', process.env.TWILIO_ACCOUNT_SID);
    console.log('From Number:', process.env.TWILIO_PHONE_NUMBER);
    
    // Check recent messages (last 5)
    console.log('\n📧 Recent SMS Messages:');
    const messages = await client.messages.list({ limit: 5 });
    
    messages.forEach((message, i) => {
      console.log(`${i + 1}. SID: ${message.sid}`);
      console.log(`   To: ${message.to}`);
      console.log(`   Status: ${message.status}`);
      console.log(`   Date: ${message.dateCreated}`);
      console.log(`   Error: ${message.errorCode || 'None'}`);
      console.log('');
    });
    
    // Check if +447764190034 is a verified number (trial accounts only)
    try {
      console.log('\n📞 Checking verified numbers:');
      const outgoingCallerIds = await client.outgoingCallerIds.list();
      console.log('Verified numbers:', outgoingCallerIds.map(id => id.phoneNumber));
    } catch (error) {
      console.log('Could not fetch verified numbers (might not be trial account)');
    }
    
  } catch (error) {
    console.error('❌ Twilio error:', error);
  }
  
  process.exit(0);
}

checkTwilioAccount();