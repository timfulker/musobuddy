// Direct test of SMS sending
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

console.log('🔧 Direct Twilio Test');
console.log('- Account SID exists:', !!accountSid);
console.log('- Auth Token exists:', !!authToken);
console.log('- From Number:', fromNumber || 'NOT SET');

if (!accountSid || !authToken || !fromNumber) {
  console.error('❌ Missing Twilio credentials');
  process.exit(1);
}

try {
  const client = twilio(accountSid, authToken);
  
  console.log('📱 Sending test SMS...');
  
  const message = await client.messages.create({
    body: 'MusoBuddy Test: Your verification code is 123456',
    from: fromNumber,
    to: '+447764190034'
  });
  
  console.log('✅ SMS sent successfully! SID:', message.sid);
  console.log('Message details:', {
    to: message.to,
    from: message.from,
    status: message.status,
    dateCreated: message.dateCreated
  });
  
} catch (error: any) {
  console.error('❌ SMS send failed:', error.message);
  console.error('Error code:', error.code);
  console.error('More info:', error.moreInfo);
}