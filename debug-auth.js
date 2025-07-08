// Check SendGrid configuration status
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

if (!SENDGRID_API_KEY) {
  console.log('❌ No SendGrid API key found');
  process.exit(1);
}

console.log('=== SENDGRID CONFIGURATION CHECK ===\n');

// Check Inbound Parse settings
async function checkInboundParse() {
  console.log('1. CHECKING INBOUND PARSE CONFIGURATION');
  console.log('------------------------------------------');
  
  try {
    const response = await fetch('https://api.sendgrid.com/v3/user/webhooks/parse', {
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log('Response status:', response.status);
    
    if (response.status === 200) {
      console.log('✅ Inbound Parse API accessible');
      
      if (data.length === 0) {
        console.log('❌ NO INBOUND PARSE CONFIGURATIONS FOUND');
        console.log('   This explains why emails are not being processed!');
      } else {
        console.log('✅ Found Inbound Parse configurations:');
        data.forEach((config, index) => {
          console.log(`   ${index + 1}. Hostname: ${config.hostname}`);
          console.log(`      URL: ${config.url}`);
          console.log(`      Spam Check: ${config.spam_check}`);
        });
        
        // Check if musobuddy.com is configured
        const hasMusoBuddy = data.some(config => 
          config.hostname === 'musobuddy.com' || 
          config.hostname === '*.musobuddy.com'
        );
        
        if (hasMusoBuddy) {
          console.log('✅ musobuddy.com is configured for Inbound Parse');
        } else {
          console.log('❌ musobuddy.com is NOT configured for Inbound Parse');
          console.log('   Found hostnames:', data.map(c => c.hostname).join(', '));
        }
      }
    } else {
      console.log('❌ Inbound Parse API error:', data);
    }
  } catch (error) {
    console.log('❌ Error checking Inbound Parse:', error.message);
  }
  
  console.log('');
}

// Check domain authentication
async function checkDomainAuth() {
  console.log('2. CHECKING DOMAIN AUTHENTICATION');
  console.log('-----------------------------------');
  
  try {
    const response = await fetch('https://api.sendgrid.com/v3/whitelabel/domains', {
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (response.status === 200) {
      console.log('✅ Domain authentication API accessible');
      
      if (data.length === 0) {
        console.log('❌ No authenticated domains found');
      } else {
        data.forEach((domain, index) => {
          console.log(`   ${index + 1}. Domain: ${domain.domain}`);
          console.log(`      Valid: ${domain.valid}`);
          console.log(`      Legacy: ${domain.legacy}`);
        });
      }
    } else {
      console.log('❌ Domain authentication error:', data);
    }
  } catch (error) {
    console.log('❌ Error checking domain auth:', error.message);
  }
  
  console.log('');
}

async function provideSolution() {
  console.log('3. SOLUTION REQUIRED');
  console.log('--------------------');
  console.log('Based on your Namecheap DNS settings, you need to:');
  console.log('');
  console.log('1. Go to SendGrid Dashboard → Settings → Inbound Parse');
  console.log('2. Click "Add Host & URL"');
  console.log('3. Configure:');
  console.log('   - Hostname: musobuddy.com');
  console.log('   - Destination URL: https://musobuddy.replit.app/webhook/sendgrid');
  console.log('   - Check "POST the raw, full MIME message"');
  console.log('4. Save the configuration');
  console.log('');
  console.log('This is separate from domain authentication (em7583.musobuddy.com)');
  console.log('Domain auth = sending emails');
  console.log('Inbound Parse = receiving emails');
}

async function runDiagnostic() {
  await checkInboundParse();
  await checkDomainAuth();
  await provideSolution();
}

runDiagnostic().catch(console.error);