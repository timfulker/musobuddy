/**
 * Check MX records for musobuddy.com to verify email routing
 */

import dns from 'dns';

async function checkMXRecords() {
  console.log('🔍 CHECKING MX RECORDS FOR musobuddy.com');
  
  try {
    const records = await dns.resolveMx('musobuddy.com');
    console.log('✅ MX Records found:');
    records.forEach((record, index) => {
      console.log(`${index + 1}. Priority: ${record.priority}, Exchange: ${record.exchange}`);
    });
    
    // Check if Mailgun MX record exists
    const mailgunMX = records.find(record => 
      record.exchange.includes('mailgun') || 
      record.exchange.includes('mg') ||
      record.exchange === 'mxa.mailgun.org' ||
      record.exchange === 'mxb.mailgun.org'
    );
    
    if (mailgunMX) {
      console.log('✅ Mailgun MX record found:', mailgunMX.exchange);
    } else {
      console.log('❌ NO MAILGUN MX RECORD FOUND!');
      console.log('This means emails to musobuddy.com are NOT going to Mailgun');
      console.log('You need to set up MX records to point to Mailgun');
    }
    
  } catch (error) {
    console.log('❌ Could not resolve MX records:', error.message);
  }
}

async function checkDNSConfiguration() {
  console.log('\n🔍 CHECKING DNS CONFIGURATION');
  
  try {
    // Check A record
    const aRecords = await dns.resolve4('musobuddy.com');
    console.log('A Records:', aRecords);
    
    // Check if there's a mail subdomain
    try {
      const mailRecords = await dns.resolve4('mail.musobuddy.com');
      console.log('mail.musobuddy.com A Records:', mailRecords);
    } catch (e) {
      console.log('No mail.musobuddy.com A record found');
    }
    
  } catch (error) {
    console.log('DNS check error:', error.message);
  }
}

async function runDiagnostic() {
  await checkMXRecords();
  await checkDNSConfiguration();
  
  console.log('\n🔍 DIAGNOSIS:');
  console.log('If no Mailgun MX records are found, that\'s the problem!');
  console.log('Emails to leads@musobuddy.com won\'t reach Mailgun servers.');
  console.log('\nTo fix this, you need to:');
  console.log('1. Go to your domain registrar (Namecheap, etc.)');
  console.log('2. Add MX records pointing to Mailgun');
  console.log('3. Set up proper email routing to Mailgun');
}

runDiagnostic();