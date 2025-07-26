// Delete old webhook and create new one with correct API version
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_TEST_SECRET_KEY, {
  apiVersion: '2023-10-16'
});

async function recreateWebhook() {
  try {
    console.log('🔍 Recreating webhook with correct API version...\n');

    // 1. List existing webhooks
    const webhooks = await stripe.webhookEndpoints.list();
    console.log(`Found ${webhooks.data.length} existing webhooks`);

    // 2. Delete the old webhook with wrong API version
    const oldWebhook = webhooks.data.find(w => w.url === 'https://musobuddy.replit.app/api/stripe-webhook');
    if (oldWebhook) {
      console.log(`Deleting old webhook: ${oldWebhook.id} (API version: ${oldWebhook.api_version})`);
      await stripe.webhookEndpoints.del(oldWebhook.id);
      console.log('✅ Old webhook deleted');
    }

    // 3. Create new webhook with correct API version
    console.log('\nCreating new webhook with API version 2023-10-16...');
    const newWebhook = await stripe.webhookEndpoints.create({
      url: 'https://musobuddy.replit.app/api/stripe-webhook',
      enabled_events: [
        'checkout.session.completed',
        'customer.subscription.deleted', 
        'invoice.payment_failed',
        'customer.subscription.created',
        'invoice.payment_succeeded'
      ],
      api_version: '2023-10-16'
    });

    console.log('✅ New webhook created successfully!');
    console.log(`ID: ${newWebhook.id}`);
    console.log(`URL: ${newWebhook.url}`);
    console.log(`API Version: ${newWebhook.api_version}`);
    console.log(`Events: ${newWebhook.enabled_events.join(', ')}`);
    console.log(`Status: ${newWebhook.status}`);
    console.log(`\n🔑 NEW WEBHOOK SECRET: ${newWebhook.secret}`);
    console.log('\n⚠️  IMPORTANT: Copy the webhook secret above and update STRIPE_WEBHOOK_SECRET in Replit!');

  } catch (error) {
    console.error('❌ Error recreating webhook:', error.message);
  }
}

recreateWebhook();