// Trigger subscription activation manually using the most recent checkout session
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_TEST_SECRET_KEY, {
  apiVersion: '2023-10-16'
});

async function triggerConfirmationEmails() {
  try {
    console.log('🔍 Getting most recent checkout session...\n');

    // Get the most recent checkout session
    const sessions = await stripe.checkout.sessions.list({ 
      limit: 1,
      status: 'complete'
    });
    
    if (sessions.data.length === 0) {
      console.log('❌ No completed checkout sessions found');
      return;
    }

    const session = sessions.data[0];
    console.log('📝 Session details:');
    console.log('   ID:', session.id);
    console.log('   Customer:', session.customer);
    console.log('   Status:', session.status);
    console.log('   Payment status:', session.payment_status);
    console.log('   Amount total:', session.amount_total);
    console.log('   Currency:', session.currency);

    // Make direct API call to our webhook endpoint
    console.log('\n🔧 Sending webhook to our server...');
    
    const webhookPayload = {
      id: 'evt_test_' + Date.now(),
      object: 'event',
      api_version: '2023-10-16',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: session
      },
      livemode: false,
      pending_webhooks: 1,
      request: {
        id: null,
        idempotency_key: null
      },
      type: 'checkout.session.completed'
    };

    const payloadString = JSON.stringify(webhookPayload);
    const timestamp = Math.floor(Date.now() / 1000);
    
    // Create proper signature
    const crypto = await import('crypto');
    const secret = process.env.STRIPE_WEBHOOK_SECRET.replace('whsec_', '');
    const signedPayload = timestamp + '.' + payloadString;
    const signature = crypto.createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex');
    const stripeSignature = `t=${timestamp},v1=${signature}`;

    console.log('🔧 Making webhook request with signature...');
    
    const fetch = (await import('node-fetch')).default;
    const response = await fetch('https://musobuddy.replit.app/api/stripe-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': stripeSignature
      },
      body: payloadString
    });
    
    console.log('✅ Response status:', response.status);
    const responseText = await response.text();
    console.log('✅ Response:', responseText);
    
    if (response.status === 200) {
      console.log('\n🎉 Webhook processed successfully! Check user subscription status.');
    }

  } catch (error) {
    console.error('❌ Error triggering webhook:', error.message);
  }
}

triggerConfirmationEmails();