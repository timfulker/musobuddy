/**
 * Check if the latest email to leads@mg.musobuddy.com was received
 */

async function checkWebhookActivity() {
    console.log('=== CHECKING WEBHOOK ACTIVITY ===');
    
    // Test webhook accessibility
    try {
        const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'sender=check@test.com&subject=Activity Check&body-plain=Checking if webhook is receiving requests'
        });
        
        const result = await response.json();
        console.log('✅ Webhook still active:', result);
        console.log(`Latest test enquiry: #${result.enquiryId}`);
    } catch (error) {
        console.error('❌ Webhook error:', error.message);
    }
    
    console.log('\n=== ANALYSIS ===');
    console.log('If no new enquiry was created from your email to leads@mg.musobuddy.com:');
    console.log('1. The route might need updating to handle mg.musobuddy.com');
    console.log('2. DNS propagation might still be pending');
    console.log('3. The route expression might only match musobuddy.com');
    console.log('');
    console.log('Next steps:');
    console.log('1. Check Mailgun logs for incoming emails');
    console.log('2. Update route to: match_recipient("leads@mg.musobuddy.com")');
    console.log('3. Or add catch_all() to handle all domains');
}

checkWebhookActivity().catch(console.error);