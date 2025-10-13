import { services } from './server/core/services';
import { storage } from './server/core/storage';

async function runFullGlockappTest() {
  console.log('🚀 Starting Full Glockapp Spam Test');
  console.log('================================');
  
  // All 91 Glockapp seed emails
  const allSeedEmails = [
    // Batch 1 (1-25)
    "elizabeaver@auth.glockdb.com",
    "juliarspivey@aol.com", 
    "davidvcampbell@aol.com",
    "lynettedweyand@protonmail.com",
    "bbarretthenryhe@gmail.com",
    "luisl417@yahoo.com",
    "jerrybrucedath@gmail.com",
    "verify79@web.de",
    "simonetgrimard@laposte.net",
    "irenem@userflowhq.com",
    "comwhitttakarticjt@gmx.de",
    "verifynewssl@zoho.com",
    "yadiraalfordbj@hotmail.com",
    "dannakbond@aol.com",
    "allanb@glockapps.awsapps.com",
    "eliza@spamcombat.com",
    "eugenedandy576@gmail.com",
    "pprestondasavis@gmx.com",
    "alisonnlawrence@gmail.com",
    "verifycom79@gmx.com",
    "b2bdeliver79@mail.com",
    "romanespor11@icloud.com",
    "joereddison@outlook.com",
    "martin@glockapps.tech",
    "verify79@buyemailsoftware.com",
    // Batch 2 (26-50)
    "gailllitle@att.net",
    "jeffsayerss@yahoo.com",
    "johnnyjonesjake@hotmail.com",
    "heavenpeck@freenet.de",
    "virginia@buyemailsoftware.com",
    "creissantdubois@laposte.net",
    "tristonreevestge@outlook.com.br",
    "irene@postmasterpro.email",
    "jessicalisa6054@gmail.com",
    "blaircourtneye@outlook.com",
    "lashawnrheidrick@yahoo.com",
    "loganalan654@gmail.com",
    "assa@auth.glockdb.com",
    "emilliesunnyk@gmail.com",
    "williamhensley54@yahoo.com",
    "debrajhammons@outlook.com",
    "racheljavierera@hotmail.com",
    "williamhbishopp@yahoo.com",
    "anmeiyudobaihq@gmx.de",
    "cierawilliamsonwq@gmail.com",
    "frankdesalvo@mailo.com",
    "jamesjng@outlook.com",
    "davidkdoyle@hotmail.com",
    "gd@desktopemail.com",
    "bookerttubbs@zohomail.eu",
    // Batch 3 (51-75)
    "lenorebayerd@gmail.com",
    "taverasbrianvg@gmail.com",
    "johntberman@yahoo.com",
    "raphaelewiley@aol.com",
    "keenanblooms@gmail.com",
    "carollpooool@outlook.com",
    "catherinedwilsonn@aol.com",
    "mbell@fastdirectorysubmitter.com",
    "martinawm@gemings.awsapps.com",
    "luanajortega@yahoo.com",
    "markjenningson@hotmail.com",
    "naomimartinsn@hotmail.com",
    "brittanyrocha@outlook.de",
    "larrycellis@aol.com",
    "madeleinecagleks@gmail.com",
    "geraldmbautista@outlook.com",
    "williamtkozlowsk@gmail.com",
    "aileenjamesua@outlook.com",
    "paul@userflowhq.com",
    "carlbilly605@gmail.com",
    "alfredohoffman@fastdirectorysubmitter.com",
    "tinamallahancr@gmail.com",
    "verifyde79@gmx.de",
    "andrewheggins@mailo.com",
    "johnsimonskh@gmail.com",
    // Batch 4 (76-91)
    "jurgeneberhartdd@web.de",
    "bobbybagdgddwins@mailo.com",
    "elizabethbetty6054@gmail.com",
    "deweymadddax@currently.com",
    "leoefraser@yahoo.com",
    "glencabrera@outlook.fr",
    "clyde@trustycheck.pro",
    "candacechall@aol.com",
    "augustinlidermann@t-online.de",
    "wilcoxginax@gmail.com",
    "daishacorwingx@gmail.com",
    "louiepettydr@gmail.com",
    "carloscohenm@freenet.de",
    "michaelrwoodd@yahoo.com",
    "fredmrivenburg@aol.com"
  ];
  
  // Test configuration
  const testId = `glockapp-test-${new Date().toISOString().split('T')[0]}`;
  const batchSize = 25; // Send in batches to avoid rate limiting
  const delayBetweenBatches = 30000; // 30 seconds between batches
  const delayBetweenEmails = 100; // 100ms between individual emails
  
  console.log(`📊 Test Configuration:`);
  console.log(`   - Test ID: ${testId}`);
  console.log(`   - Total emails: ${allSeedEmails.length}`);
  console.log(`   - Batch size: ${batchSize}`);
  console.log(`   - Delay between batches: ${delayBetweenBatches/1000}s`);
  console.log('');
  
  let totalSent = 0;
  let totalFailed = 0;
  const results: any[] = [];
  
  // Process emails in batches
  for (let i = 0; i < allSeedEmails.length; i += batchSize) {
    const batchNumber = Math.floor(i / batchSize) + 1;
    const batch = allSeedEmails.slice(i, i + batchSize);
    
    console.log(`\n📦 Processing Batch ${batchNumber} (${batch.length} emails)`);
    console.log('─'.repeat(50));
    
    for (const email of batch) {
      try {
        const emailData = {
          to: email,
          from: 'MusoBuddy <noreply@enquiries.musobuddy.com>',
          subject: `Email Deliverability Test - ${testId}`,
          html: `
            <html>
              <body style="font-family: Arial, sans-serif; line-height: 1.6;">
                <h2>MusoBuddy Email Deliverability Test</h2>
                <p>This is an automated test email for checking email deliverability and spam scores.</p>
                <p><strong>Test Details:</strong></p>
                <ul>
                  <li>Test ID: ${testId}</li>
                  <li>Batch: ${batchNumber}</li>
                  <li>Timestamp: ${new Date().toISOString()}</li>
                </ul>
                <p>This email is part of our regular email deliverability monitoring to ensure our communications reach your inbox.</p>
                <hr>
                <p style="color: #666; font-size: 12px;">
                  MusoBuddy - Professional Booking Management for Musicians<br>
                  <a href="https://musobuddy.com">musobuddy.com</a>
                </p>
                <!-- Glockapps Test ID: ${testId} -->
              </body>
            </html>
          `,
          headers: {
            'X-Glockapps-Test-ID': testId,
            'X-Campaign-ID': testId,
            'X-Test-ID': testId,
            'X-Batch': batchNumber.toString()
          }
        };
        
        const result = await services.sendEmail(emailData);
        
        if (result.success) {
          totalSent++;
          console.log(`✅ ${email} - Sent (${result.messageId})`);
          results.push({ email, status: 'sent', messageId: result.messageId });
        } else {
          totalFailed++;
          console.log(`❌ ${email} - Failed: ${result.error}`);
          results.push({ email, status: 'failed', error: result.error });
        }
        
        // Small delay between emails
        await new Promise(resolve => setTimeout(resolve, delayBetweenEmails));
        
      } catch (error: any) {
        totalFailed++;
        console.log(`❌ ${email} - Error: ${error.message}`);
        results.push({ email, status: 'error', error: error.message });
      }
    }
    
    // If not the last batch, wait before continuing
    if (i + batchSize < allSeedEmails.length) {
      console.log(`\n⏳ Waiting ${delayBetweenBatches/1000}s before next batch...`);
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }
  
  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL RESULTS');
  console.log('='.repeat(60));
  console.log(`✅ Successfully sent: ${totalSent}/${allSeedEmails.length}`);
  console.log(`❌ Failed: ${totalFailed}/${allSeedEmails.length}`);
  console.log(`📈 Success rate: ${((totalSent/allSeedEmails.length) * 100).toFixed(1)}%`);
  console.log('');
  console.log('📧 Check your GlockApps dashboard in 10-15 minutes for results:');
  console.log('   https://glockapps.com/spam-testing/');
  console.log('');
  console.log(`🔍 Look for Test ID: ${testId}`);
  
  // Save results to file
  const resultsFile = `/home/runner/workspace/glockapp-results-${Date.now()}.json`;
  const fs = await import('fs/promises');
  await fs.writeFile(resultsFile, JSON.stringify({
    testId,
    timestamp: new Date().toISOString(),
    totalSent,
    totalFailed,
    results
  }, null, 2));
  
  console.log(`\n💾 Results saved to: ${resultsFile}`);
}

// Run the test
runFullGlockappTest().catch(console.error);