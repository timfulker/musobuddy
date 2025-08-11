import { services } from './server/core/services';

async function testGlockappSpam() {
  console.log('🧪 Testing Glockapp spam delivery directly...');
  
  // Test with a single email first
  const testEmail = 'elizabeaver@auth.glockdb.com';
  const testId = `test-${Date.now()}`;
  
  const emailData = {
    to: testEmail,
    from: 'MusoBuddy Test <noreply@enquiries.musobuddy.com>',
    subject: 'Glockapp Spam Test',
    html: `
      <html>
        <body style="font-family: Arial, sans-serif;">
          <h2>Glockapp Deliverability Test</h2>
          <p>This is a test email for spam checking.</p>
          <p>Test ID: ${testId}</p>
          <!-- Glockapps Test ID: ${testId} -->
        </body>
      </html>
    `,
    headers: {
      'X-Glockapps-Test-ID': testId,
      'X-Campaign-ID': testId,
      'X-Test-ID': testId
    }
  };
  
  try {
    console.log('📧 Sending test email to:', testEmail);
    const result = await services.sendEmail(emailData);
    
    if (result.success) {
      console.log('✅ Email sent successfully!');
      console.log('Message ID:', result.messageId);
      console.log('Status:', result.status);
    } else {
      console.error('❌ Failed to send email:', result.error);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the test
testGlockappSpam().catch(console.error);