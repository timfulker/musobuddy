/**
 * Check DMARC record propagation
 */

async function checkDmarcPropagation() {
  console.log('🔍 Checking DMARC record propagation...');
  
  try {
    // Check DMARC record via DNS lookup
    const response = await fetch('https://dns.google/resolve?name=_dmarc.musobuddy.com&type=TXT');
    const data = await response.json();
    
    console.log('📧 DMARC DNS Response:', JSON.stringify(data, null, 2));
    
    if (data.Answer) {
      const dmarcRecord = data.Answer.find(record => 
        record.data.includes('v=DMARC1') && 
        record.data.includes('rua=mailto:dcd00fb8@dmarc.mailgun.org')
      );
      
      if (dmarcRecord) {
        console.log('✅ DMARC record propagated successfully!');
        console.log('📧 Record:', dmarcRecord.data);
        console.log('🎯 Ready to test email forwarding');
        return true;
      } else {
        console.log('❌ DMARC record not yet propagated');
        return false;
      }
    } else {
      console.log('❌ No DMARC record found');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error checking DMARC:', error);
    return false;
  }
}

async function monitorPropagation() {
  console.log('🎯 Monitoring DMARC propagation...');
  
  const checkInterval = setInterval(async () => {
    const propagated = await checkDmarcPropagation();
    if (propagated) {
      console.log('🎉 DMARC is ready! You can now test email forwarding.');
      clearInterval(checkInterval);
    }
  }, 60000); // Check every minute
  
  // Stop monitoring after 30 minutes
  setTimeout(() => {
    clearInterval(checkInterval);
    console.log('⏰ Monitoring stopped after 30 minutes');
  }, 1800000);
}

// Run initial check
checkDmarcPropagation();