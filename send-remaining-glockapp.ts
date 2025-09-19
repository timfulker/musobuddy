import { services } from './server/core/services';

async function sendRemainingGlockappEmails() {
  const glockappTestId = '2025-08-11-19:29:07:339t';
  
  // Emails already sent in the first batch
  const alreadySent = [
    "elizabeaver@auth.glockdb.com",
    "verifycom79@gmx.com",
    "andrewheggins@mailo.com",
    "lashawnrheidrick@yahoo.com",
    "raphaelewiley@aol.com",
    "jessicalisa6054@gmail.com",
    "johnsimonskh@gmail.com",
    "gailllitle@att.net",
    "jeffsayerss@yahoo.com",
    "leoefraser@yahoo.com",
    "lynettedweyand@protonmail.com",
    "verify79@buyemailsoftware.com",
    "johntberman@yahoo.com",
    "wilcoxginax@gmail.com",
    "yadiraalfordbj@hotmail.com",
    "irene@postmasterpro.email",
    "michaelrwoodd@yahoo.com",
    "catherinedwilsonn@aol.com",
    "romanespor11@icloud.com",
    "deweymadddax@currently.com",
    "carollpooool@outlook.com",
    "dannakbond@aol.com",
    "williamhensley54@yahoo.com",
    "juliarspivey@aol.com",
    "larrycellis@aol.com"
  ];
  
  // All emails from the new list
  const allEmails = [
    "elizabeaver@auth.glockdb.com", "verifycom79@gmx.com", "andrewheggins@mailo.com",
    "lashawnrheidrick@yahoo.com", "raphaelewiley@aol.com", "jessicalisa6054@gmail.com",
    "johnsimonskh@gmail.com", "gailllitle@att.net", "jeffsayerss@yahoo.com",
    "leoefraser@yahoo.com", "lynettedweyand@protonmail.com", "verify79@buyemailsoftware.com",
    "johntberman@yahoo.com", "wilcoxginax@gmail.com", "yadiraalfordbj@hotmail.com",
    "irene@postmasterpro.email", "michaelrwoodd@yahoo.com", "catherinedwilsonn@aol.com",
    "romanespor11@icloud.com", "deweymadddax@currently.com", "carollpooool@outlook.com",
    "dannakbond@aol.com", "williamhensley54@yahoo.com", "juliarspivey@aol.com",
    "larrycellis@aol.com", "williamtkozlowsk@gmail.com", "markjenningson@hotmail.com",
    "virginia@buyemailsoftware.com", "b2bdeliver79@mail.com", "fredmrivenburg@aol.com",
    "luanajortega@yahoo.com", "davidvcampbell@aol.com", "emilliesunnyk@gmail.com",
    "alfredohoffman@fastdirectorysubmitter.com", "gd@desktopemail.com", "irenem@userflowhq.com",
    "daishacorwingx@gmail.com", "blaircourtneye@outlook.com", "candacechall@aol.com",
    "pprestondasavis@gmx.com", "martin@glockapps.tech", "bbarretthenryhe@gmail.com",
    "alisonnlawrence@gmail.com", "keenanblooms@gmail.com", "assa@auth.glockdb.com",
    "johnnyjonesjake@hotmail.com", "naomimartinsn@hotmail.com", "jerrybrucedath@gmail.com",
    "allanb@glockapps.awsapps.com", "taverasbrianvg@gmail.com", "louiepettydr@gmail.com",
    "verifynewssl@zoho.com", "tristonreevestge@outlook.com.br", "frankdesalvo@mailo.com",
    "jamesjng@outlook.com", "loganalan654@gmail.com", "racheljavierera@hotmail.com",
    "eugenedandy576@gmail.com", "debrajhammons@outlook.com", "davidkdoyle@hotmail.com",
    "cierawilliamsonwq@gmail.com", "williamhbishopp@yahoo.com", "aileenjamesua@outlook.com",
    "paul@userflowhq.com", "madeleinecagleks@gmail.com", "martinawm@gemings.awsapps.com",
    "bobbybagdgddwins@mailo.com", "bookerttubbs@zohomail.eu", "tinamallahancr@gmail.com",
    "mbell@fastdirectorysubmitter.com", "carlbilly605@gmail.com", "geraldmbautista@outlook.com",
    "lenorebayerd@gmail.com", "luisl417@yahoo.com", "clyde@trustycheck.pro",
    "eliza@spamcombat.com", "elizabethbetty6054@gmail.com", "joereddison@outlook.com"
  ];
  
  // Find emails not yet sent
  const notYetSent = allEmails.filter(email => !alreadySent.includes(email));
  
  console.log('🚀 Sending Remaining GlockApps Emails');
  console.log('=====================================');
  console.log(`Test ID: ${glockappTestId}`);
  console.log(`New emails to send: ${notYetSent.length}`);
  console.log('');
  console.log('New addresses:');
  notYetSent.forEach(email => console.log(`  - ${email}`));
  console.log('');
  
  let totalSent = 0;
  let totalFailed = 0;
  
  for (const email of notYetSent) {
    try {
      // Check if it's a Yahoo/AOL domain that needs slower sending
      const isYahooAol = email.includes('@yahoo') || email.includes('@aol') || email.includes('@att.net');
      
      const emailData = {
        to: email,
        from: 'MusoBuddy <noreply@enquiries.musobuddy.com>',
        subject: 'Professional Booking Management for Musicians',
        html: `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #673ab7;">Welcome to MusoBuddy</h2>
                
                <p>Dear Music Professional,</p>
                
                <p>We're excited to introduce you to MusoBuddy, the professional booking management platform designed specifically for musicians and bands.</p>
                
                <h3>What MusoBuddy Offers:</h3>
                <ul>
                  <li>Streamlined booking management</li>
                  <li>Professional contract generation</li>
                  <li>Automated client communications</li>
                  <li>Financial tracking and reporting</li>
                  <li>Calendar integration</li>
                </ul>
                
                <p>Join thousands of musicians who are already using MusoBuddy to manage their professional bookings more efficiently.</p>
                
                <p style="margin: 30px 0;">
                  <a href="https://musobuddy.com" style="background: #673ab7; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">
                    Learn More
                  </a>
                </p>
                
                <p>Best regards,<br>
                The MusoBuddy Team</p>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
                
                <p style="font-size: 12px; color: #666;">
                  MusoBuddy - Professional Booking Management<br>
                  <a href="https://musobuddy.com" style="color: #673ab7;">musobuddy.com</a> | 
                  <a href="mailto:support@musobuddy.com" style="color: #673ab7;">support@musobuddy.com</a>
                </p>
              </div>
              
              <!-- GlockApps Test ID: ${glockappTestId} -->
            </body>
          </html>
        `,
        headers: {
          'X-Glockapps-Test-ID': glockappTestId,
          'X-Campaign-ID': glockappTestId,
          'X-Test-ID': glockappTestId
        }
      };
      
      const result = await services.sendEmail(emailData);
      
      if (result.success) {
        totalSent++;
        console.log(`✅ ${email}`);
      } else {
        totalFailed++;
        console.log(`❌ ${email} - ${result.error}`);
      }
      
      // Longer delay for Yahoo/AOL domains to avoid rate limiting
      const delay = isYahooAol ? 4000 : 1500;
      await new Promise(resolve => setTimeout(resolve, delay));
      
    } catch (error: any) {
      totalFailed++;
      console.log(`❌ ${email} - ${error.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESULTS');
  console.log('='.repeat(60));
  console.log(`✅ Successfully sent: ${totalSent}/${notYetSent.length}`);
  console.log(`❌ Failed: ${totalFailed}/${notYetSent.length}`);
  console.log('');
  console.log('✅ Additional test emails sent to GlockApps!');
  console.log('');
  console.log('📧 Total emails now sent for this test: ' + (alreadySent.length + totalSent));
  console.log('');
  console.log('Check your results at:');
  console.log('   https://glockapps.com/spam-testing/');
  console.log(`   Test ID: ${glockappTestId}`);
}

sendRemainingGlockappEmails().catch(console.error);