// Check Twilio account status and upgrade options
const twilioSid = process.env.TWILIO_ACCOUNT_SID;
const twilioToken = process.env.TWILIO_AUTH_TOKEN;

async function checkTwilioAccount() {
  try {
    const { default: twilio } = await import('twilio');
    const client = twilio(twilioSid, twilioToken);
    
    // Get account info
    const account = await client.api.accounts(twilioSid).fetch();
    
    console.log('📊 Twilio Account Status:');
    console.log('Account SID:', account.sid);
    console.log('Status:', account.status);
    console.log('Type:', account.type);
    console.log('Friendly Name:', account.friendlyName);
    
    // Get balance
    const balance = await client.balance.fetch();
    console.log('💰 Current Balance:', balance.balance, balance.currency);
    
    // Check if trial account
    if (account.type === 'Trial') {
      console.log('\n🚨 TRIAL ACCOUNT DETECTED');
      console.log('❌ Trial accounts can only send SMS to verified numbers');
      console.log('✅ SOLUTION: Upgrade to paid account for unlimited SMS');
      console.log('💳 Cost: ~$20/month + SMS usage (~$0.04 per message)');
      console.log('🔗 Upgrade at: https://console.twilio.com/billing');
    } else {
      console.log('\n✅ PAID ACCOUNT - Should work for all numbers');
    }
    
  } catch (error) {
    console.error('❌ Error checking account:', error.message);
  }
}

checkTwilioAccount();