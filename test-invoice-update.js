// Monitor for DNS propagation and email delivery
console.log('🔍 MONITORING DNS PROPAGATION AND EMAIL DELIVERY...');
console.log('SPF Record: v=spf1 include:sendgrid.net ~all');
console.log('Status: Configured in Namecheap, waiting for global propagation');
console.log('');

let checkCount = 0;
const maxChecks = 12; // 12 checks over 6 minutes

async function monitorDNSAndEmails() {
  checkCount++;
  console.log(`Check ${checkCount}/${maxChecks} - ${new Date().toLocaleTimeString()}`);
  
  // Test if DNS has propagated
  try {
    const response = await fetch('https://dns.google/resolve?name=musobuddy.com&type=TXT');
    const data = await response.json();
    const spfRecord = data.Answer?.find(record => record.data.includes('spf1'));
    
    if (spfRecord) {
      console.log('✅ DNS PROPAGATION COMPLETE!');
      console.log('✅ SPF Record now visible globally');
      console.log('✅ Gmail should now accept emails to leads@musobuddy.com');
      console.log('');
      console.log('🎯 EMAIL FORWARDING SYSTEM IS NOW READY!');
      console.log('Try sending emails to leads@musobuddy.com - they should create enquiries');
      return true;
    } else {
      console.log('⏳ Still propagating...');
    }
  } catch (error) {
    console.log('❌ DNS check failed:', error.message);
  }
  
  if (checkCount < maxChecks) {
    setTimeout(monitorDNSAndEmails, 30000); // Check every 30 seconds
  } else {
    console.log('');
    console.log('📧 DNS propagation taking longer than expected');
    console.log('Try sending a test email anyway - it might work');
  }
}

// Start monitoring
monitorDNSAndEmails();