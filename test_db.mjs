import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function test() {
  await client.connect();
  const res = await client.query(`SELECT * FROM users WHERE email = 'jcarter@yahoo.co.uk'`);
  console.log('User fields:', Object.keys(res.rows[0]));
  console.log('\nUser data:');
  const user = res.rows[0];
  console.log('tier:', user.tier);
  console.log('plan:', user.plan);
  console.log('created_via_stripe:', user.created_via_stripe);
  console.log('trial_status:', user.trial_status);
  await client.end();
}

test().catch(console.error);
