import { services } from './server/core/services';

async function sendGlockappTestNow() {
  const glockappTestId = '2025-08-11-19:29:07:339t';
  
  // The specific emails from GlockApps for this test
  const seedEmails = [
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
  
  console.log('🚀 Sending GlockApps Test');
  console.log('================================');
  console.log(`Test ID: ${glockappTestId}`);
  console.log(`Total emails: ${seedEmails.length}`);
  console.log('');
  
  let totalSent = 0;
  let totalFailed = 0;
  
  for (const email of seedEmails) {
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
      const delay = isYahooAol ? 3000 : 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      
    } catch (error: any) {
      totalFailed++;
      console.log(`❌ ${email} - ${error.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESULTS');
  console.log('='.repeat(60));
  console.log(`✅ Successfully sent: ${totalSent}/${seedEmails.length}`);
  console.log(`❌ Failed: ${totalFailed}/${seedEmails.length}`);
  console.log('');
  console.log('✅ Test emails sent to GlockApps!');
  console.log('');
  console.log('📧 Check your results at:');
  console.log('   https://glockapps.com/spam-testing/');
  console.log(`   Test ID: ${glockappTestId}`);
  console.log('');
  console.log('⏰ Results should appear within 5-10 minutes');
}

sendGlockappTestNow().catch(console.error);