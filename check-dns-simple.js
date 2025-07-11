/**
 * Simple DNS check using Google's DNS API
 */

async function checkDNS() {
  console.log('🔍 CHECKING DNS RECORDS FOR musobuddy.com');
  
  try {
    // Use Google's DNS-over-HTTPS API
    const response = await fetch('https://dns.google/resolve?name=musobuddy.com&type=MX');
    const data = await response.json();
    
    console.log('✅ DNS Response:', JSON.stringify(data, null, 2));
    
    if (data.Answer && data.Answer.length > 0) {
      console.log('\n📧 MX Records found:');
      data.Answer.forEach((record, index) => {
        console.log(`${index + 1}. ${record.data}`);
        if (record.data.includes('mailgun') || record.data.includes('mg')) {
          console.log('   ✅ MAILGUN MX RECORD FOUND');
        }
      });
    } else {
      console.log('❌ NO MX RECORDS FOUND');
      console.log('This means emails to @musobuddy.com will not be delivered!');
    }
    
  } catch (error) {
    console.log('❌ DNS check failed:', error.message);
  }
}

checkDNS();