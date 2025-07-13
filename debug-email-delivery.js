/**
 * Debug email delivery issue - check if emails are reaching webhook
 */

async function debugEmailDelivery() {
    console.log('=== EMAIL DELIVERY DEBUG ===');
    
    // First, test if webhook is accessible externally
    try {
        console.log('1. Testing webhook accessibility...');
        const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'sender=debug@test.com&subject=Debug Test&body-plain=Testing webhook accessibility'
        });
        
        const result = await response.json();
        console.log('✅ Webhook accessible:', result);
        
        if (result.enquiryId) {
            console.log(`✅ Enquiry created: #${result.enquiryId}`);
        }
    } catch (error) {
        console.error('❌ Webhook not accessible:', error.message);
    }
    
    // Check recent enquiries to see if any emails came through
    try {
        console.log('\n2. Checking recent enquiries...');
        const enquiriesResponse = await fetch('https://musobuddy.replit.app/api/enquiries');
        
        if (enquiriesResponse.ok) {
            const enquiries = await enquiriesResponse.json();
            console.log(`Found ${enquiries.length} total enquiries`);
            
            // Show last 3 enquiries
            const recent = enquiries.slice(0, 3);
            recent.forEach(enquiry => {
                console.log(`- #${enquiry.id}: "${enquiry.title}" from ${enquiry.clientName} (${enquiry.clientEmail})`);
            });
        } else {
            console.log('❌ Could not fetch enquiries (authentication required)');
        }
    } catch (error) {
        console.error('❌ Error checking enquiries:', error.message);
    }
    
    console.log('\n=== DIAGNOSIS ===');
    console.log('If webhook is accessible but no real emails are creating enquiries:');
    console.log('1. Check Mailgun route configuration');
    console.log('2. Verify DNS propagation');
    console.log('3. Check Mailgun logs for delivery failures');
    console.log('4. Test with different email providers');
}

debugEmailDelivery().catch(console.error);