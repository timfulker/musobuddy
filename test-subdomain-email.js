/**
 * Test if emails work with mg.musobuddy.com subdomain
 */

async function testSubdomainEmail() {
    console.log('=== TESTING SUBDOMAIN EMAIL ===');
    
    // Test with subdomain format that matches your MX records
    console.log('Testing webhook with mg.musobuddy.com format...');
    
    try {
        const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'sender=test@example.com&subject=Subdomain Test&body-plain=Testing with mg.musobuddy.com format&recipient=leads@mg.musobuddy.com'
        });
        
        const result = await response.json();
        console.log('✅ Subdomain webhook test:', result);
        
        if (result.enquiryId) {
            console.log(`✅ Enquiry created: #${result.enquiryId}`);
        }
    } catch (error) {
        console.error('❌ Subdomain test failed:', error.message);
    }
    
    console.log('\n=== SOLUTION ===');
    console.log('The issue is domain mismatch:');
    console.log('- Your MX records point mg.musobuddy.com → Mailgun');
    console.log('- But you\'re sending emails to leads@musobuddy.com (main domain)');
    console.log('- Main domain musobuddy.com has no MX records pointing to Mailgun');
    console.log('');
    console.log('Fix options:');
    console.log('1. Send emails to leads@mg.musobuddy.com instead');
    console.log('2. Add MX records to main domain musobuddy.com');
    console.log('3. Update Mailgun route to handle both domains');
}

testSubdomainEmail().catch(console.error);