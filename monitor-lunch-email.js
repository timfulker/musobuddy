/**
 * Monitor for new enquiries during lunch break
 */

const https = require('https');

async function checkForNewEnquiries() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'musobuddy.replit.app',
      port: 443,
      path: '/api/enquiries',
      method: 'GET',
      headers: {
        'Cookie': 'connect.sid=s%3A7J8nM2K9L4P6Q3R5.abc123' // This will need to be handled differently
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const enquiries = JSON.parse(data);
          resolve(enquiries);
        } catch (error) {
          resolve([]);
        }
      });
    });

    req.on('error', (error) => {
      resolve([]);
    });

    req.end();
  });
}

async function monitorDuringLunch() {
  console.log('🕐 Monitoring for new enquiries during lunch break...');
  console.log('📧 Waiting for test email to create enquiry...\n');

  let lastEnquiryId = 251; // Current latest enquiry ID
  let checkCount = 0;
  const maxChecks = 20; // Monitor for ~10 minutes

  const monitor = setInterval(async () => {
    checkCount++;
    
    try {
      const enquiries = await checkForNewEnquiries();
      
      if (enquiries.length > 0) {
        const latestEnquiry = enquiries[0];
        
        if (latestEnquiry.id > lastEnquiryId) {
          console.log('🎉 NEW ENQUIRY DETECTED!');
          console.log(`📧 Enquiry ID: ${latestEnquiry.id}`);
          console.log(`📝 Title: ${latestEnquiry.title}`);
          console.log(`👤 Client: ${latestEnquiry.clientName || 'Not specified'}`);
          console.log(`📅 Created: ${latestEnquiry.createdAt}`);
          console.log('\n✅ EMAIL FORWARDING SYSTEM IS WORKING!');
          
          clearInterval(monitor);
          return;
        }
      }
      
      if (checkCount >= maxChecks) {
        console.log('⏰ Monitoring period complete');
        console.log('📧 No new enquiries detected during lunch break');
        console.log('\n🔍 Possible issues:');
        console.log('1. Email still in transit (Gmail can take 5-15 minutes)');
        console.log('2. DMARC propagation incomplete on Gmail servers');
        console.log('3. Mailgun route configuration needs verification');
        console.log('4. Webhook endpoint accessibility issue');
        
        clearInterval(monitor);
      } else {
        console.log(`⏳ Check ${checkCount}/${maxChecks} - No new enquiries yet`);
      }
      
    } catch (error) {
      console.log(`❌ Error checking enquiries: ${error.message}`);
    }
  }, 30000); // Check every 30 seconds
}

monitorDuringLunch();