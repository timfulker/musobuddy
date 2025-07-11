/**
 * Check DNS status using Google's DNS API
 */

const checkDNS = async () => {
  console.log('Checking DNS records...');
  
  try {
    // Check MX records
    const mxResponse = await fetch('https://dns.google/resolve?name=musobuddy.com&type=MX');
    const mxData = await mxResponse.json();
    console.log('MX Records:', mxData.Answer?.map(r => r.data) || 'None found');
    
    // Check SPF record
    const spfResponse = await fetch('https://dns.google/resolve?name=musobuddy.com&type=TXT');
    const spfData = await spfResponse.json();
    const spfRecords = spfData.Answer?.filter(r => r.data.includes('spf1')) || [];
    console.log('SPF Records:', spfRecords.map(r => r.data));
    
    // Check DMARC record
    const dmarcResponse = await fetch('https://dns.google/resolve?name=_dmarc.musobuddy.com&type=TXT');
    const dmarcData = await dmarcResponse.json();
    console.log('DMARC Records:', dmarcData.Answer?.map(r => r.data) || 'None found');
    
  } catch (error) {
    console.error('Error checking DNS:', error);
  }
};

checkDNS();