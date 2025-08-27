import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function check() {
  await client.connect();
  const res = await client.query(`SELECT email, tier, plan, created_via_stripe FROM users WHERE email LIKE 'jcarter%'`);
  console.log('Users with jcarter:');
  res.rows.forEach(user => {
    console.log(`${user.email}: tier="${user.tier}", plan="${user.plan}", created_via_stripe=${user.created_via_stripe}`);
  });
  await client.end();
}

check().catch(console.error);
