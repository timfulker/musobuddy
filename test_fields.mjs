import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function test() {
  await client.connect();
  const res = await client.query(`SELECT * FROM users WHERE email = 'jcarter@yahoo.co.uk' LIMIT 1`);
  const user = res.rows[0];
  
  // Show what fields are actually in the database
  console.log('Database field mapping:');
  console.log('user.tier =', user.tier);
  console.log('user.plan =', user.plan);
  console.log('user.created_via_stripe =', user.created_via_stripe);
  console.log('user.trial_status =', user.trial_status);
  console.log('user.is_subscribed =', user.is_subscribed);
  console.log('user.stripe_customer_id =', user.stripe_customer_id);
  console.log('user.is_beta_tester =', user.is_beta_tester);
  console.log('user.onboarding_completed =', user.onboarding_completed);
  
  await client.end();
}

test().catch(console.error);
