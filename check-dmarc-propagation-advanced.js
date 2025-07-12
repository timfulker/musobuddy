/**
 * Advanced DMARC propagation check using multiple DNS servers
 * This will check DMARC record propagation across different DNS providers
 */

import https from 'https';

async function checkDNSServer(server, record) {
  return new Promise((resolve, reject) => {
    const url = `https://${server}/resolve?name=${record}&type=TXT`;
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const dmarcRecord = parsed.Answer?.find(answer => 
            answer.data.includes('v=DMARC1')
          );
          
          resolve({
            server: server,
            found: !!dmarcRecord,
            record: dmarcRecord ? dmarcRecord.data : null,
            status: parsed.Status
          });
        } catch (error) {
          resolve({
            server: server,
            found: false,
            error: error.message,
            status: 'error'
          });
        }
      });
    }).on('error', (err) => {
      resolve({
        server: server,
        found: false,
        error: err.message,
        status: 'error'
      });
    });
  });
}

async function checkDmarcPropagation() {
  console.log('🔍 Checking DMARC propagation across multiple DNS servers...\n');
  
  const dnsServers = [
    'dns.google',           // Google DNS
    'cloudflare-dns.com',   // Cloudflare DNS
    'dns.quad9.net',        // Quad9 DNS
  ];
  
  const record = '_dmarc.mg.musobuddy.com';
  
  const results = await Promise.all(
    dnsServers.map(server => checkDNSServer(server, record))
  );
  
  console.log(`📊 DMARC Record Propagation Results for: ${record}\n`);
  
  let propagatedCount = 0;
  
  results.forEach(result => {
    const status = result.found ? '✅ FOUND' : '❌ NOT FOUND';
    console.log(`${result.server}: ${status}`);
    
    if (result.found) {
      propagatedCount++;
      console.log(`   Record: ${result.record}`);
    } else if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    console.log('');
  });
  
  console.log(`📈 Propagation Status: ${propagatedCount}/${dnsServers.length} DNS servers`);
  
  if (propagatedCount === 0) {
    console.log('⚠️  DMARC record not propagated yet');
    console.log('💡 This explains why Gmail may not be accepting emails');
  } else if (propagatedCount === dnsServers.length) {
    console.log('🎉 DMARC record fully propagated!');
    console.log('📧 Gmail should now accept emails to leads@musobuddy.com');
  } else {
    console.log('⏳ DMARC record partially propagated');
    console.log('🔄 Full propagation typically takes 2-24 hours');
  }
}

// Also check the root domain for comparison
async function checkRootDomain() {
  console.log('\n🔍 Checking root domain DMARC for comparison...\n');
  
  const record = '_dmarc.musobuddy.com';
  const result = await checkDNSServer('dns.google', record);
  
  console.log(`Root domain DMARC: ${result.found ? '✅ FOUND' : '❌ NOT FOUND'}`);
  if (result.found) {
    console.log(`Record: ${result.record}`);
  }
}

async function runAllChecks() {
  await checkDmarcPropagation();
  await checkRootDomain();
  
  console.log('\n📋 Summary:');
  console.log('- If subdomain DMARC is not propagated, Gmail will reject emails');
  console.log('- If only some servers show the record, wait for full propagation');
  console.log('- Full propagation across all DNS servers means Gmail will accept emails');
}

runAllChecks().catch(console.error);