/**
 * Check DNS status using Google's DNS API
 */

async function checkDNS() {
  console.log('🔍 Checking DNS configuration for musobuddy.com...\n');
  
  const recordTypes = ['MX', 'TXT', 'CNAME', 'A'];
  
  for (const type of recordTypes) {
    try {
      const response = await fetch(`https://dns.google/resolve?name=musobuddy.com&type=${type}`);
      const data = await response.json();
      
      console.log(`${type} Records:`);
      if (data.Answer) {
        data.Answer.forEach(record => {
          console.log(`  ${record.data}`);
        });
      } else {
        console.log(`  No ${type} records found`);
      }
      console.log('');
    } catch (error) {
      console.log(`❌ Error checking ${type} records: ${error.message}\n`);
    }
  }
  
  // Check specific subdomains that might have conflicting records
  console.log('Checking subdomains:');
  const subdomains = ['em8608.musobuddy.com', 'url8608.musobuddy.com', 's1._domainkey.musobuddy.com', 's2._domainkey.musobuddy.com'];
  
  for (const subdomain of subdomains) {
    try {
      const response = await fetch(`https://dns.google/resolve?name=${subdomain}&type=CNAME`);
      const data = await response.json();
      
      if (data.Answer) {
        console.log(`✅ ${subdomain} → ${data.Answer[0].data}`);
      }
    } catch (error) {
      // Silent - subdomain might not exist
    }
  }
}

checkDNS();