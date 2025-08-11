import { services } from './server/core/services';

async function testGlockappSmall() {
  console.log('🧪 Running Small Glockapp Test (5 emails)');
  console.log('=========================================');
  
  // Test with first 5 emails
  const testEmails = [
    "elizabeaver@auth.glockdb.com",
    "juliarspivey@aol.com", 
    "davidvcampbell@aol.com",
    "lynettedweyand@protonmail.com",
    "bbarretthenryhe@gmail.com"
  ];
  
  const testId = `glockapp-small-${Date.now()}`;
  
  console.log(`Test ID: ${testId}`);
  console.log(`Sending to ${testEmails.length} addresses...\n`);
  
  let sent = 0;
  let failed = 0;
  
  for (const email of testEmails) {
    const emailData = {
      to: email,
      from: 'MusoBuddy <noreply@enquiries.musobuddy.com>',
      subject: `Deliverability Test - ${testId}`,
      html: `
        <html>
          <body style="font-family: Arial, sans-serif;">
            <h2>MusoBuddy Deliverability Test</h2>
            <p>This is a test email for spam checking.</p>
            <p>Test ID: ${testId}</p>
            <p>Timestamp: ${new Date().toISOString()}</p>
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
      const result = await services.sendEmail(emailData);
      
      if (result.success) {
        sent++;
        console.log(`✅ ${email} - Sent`);
      } else {
        failed++;
        console.log(`❌ ${email} - Failed: ${result.error}`);
      }
      
      // Small delay between emails
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error: any) {
      failed++;
      console.log(`❌ ${email} - Error: ${error.message}`);
    }
  }
  
  console.log('\n📊 Results:');
  console.log(`   Sent: ${sent}/${testEmails.length}`);
  console.log(`   Failed: ${failed}/${testEmails.length}`);
  console.log(`\n✅ Test complete! Check GlockApps dashboard in 10-15 minutes.`);
  console.log(`   Test ID: ${testId}`);
}

// Run the test
testGlockappSmall().catch(console.error);