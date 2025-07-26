// Check recent Stripe events to see if webhooks are being sent
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_TEST_SECRET_KEY, {
  apiVersion: '2023-10-16'
});

async function checkRecentEvents() {
  try {
    console.log('🔍 Checking recent Stripe events...\n');

    // Check recent events
    const events = await stripe.events.list({
      limit: 20
    });
    
    console.log(`Found ${events.data.length} recent events:`);
    events.data.forEach((event, index) => {
      console.log(`${index + 1}. Type: ${event.type}`);
      console.log(`   ID: ${event.id}`);
      console.log(`   Created: ${new Date(event.created * 1000).toISOString()}`);
      console.log(`   Live mode: ${event.livemode}`);
      
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        console.log(`   Customer: ${session.customer}`);
        console.log(`   Payment status: ${session.payment_status}`);
      }
      console.log('');
    });

    // Check specifically for checkout sessions
    console.log('\n🔍 Checking recent checkout sessions...');
    const sessions = await stripe.checkout.sessions.list({
      limit: 10
    });
    
    console.log(`Found ${sessions.data.length} recent checkout sessions:`);
    sessions.data.forEach((session, index) => {
      console.log(`${index + 1}. ID: ${session.id}`);
      console.log(`   Status: ${session.status}`);
      console.log(`   Payment status: ${session.payment_status}`);
      console.log(`   Customer: ${session.customer}`);
      console.log(`   Created: ${new Date(session.created * 1000).toISOString()}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error checking events:', error.message);
  }
}

checkRecentEvents();