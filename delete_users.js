import { neon } from '@neondatabase/serverless';

// Use production Supabase connection
const sql = neon(process.env.SUPABASE_URL_PROD.replace('https://', 'postgres://postgres:' + process.env.SUPABASE_SERVICE_KEY_PROD + '@').replace('.supabase.co', '.pooler.supabase.com:5432/postgres'));

async function deleteUnwantedUsers() {
  try {
    console.log('Checking production users...');
    
    // First, list all users
    const users = await sql`SELECT id, email, first_name, last_name FROM users ORDER BY email`;
    
    console.log('\nCurrent users in production:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.first_name} ${user.last_name})`);
    });
    
    // Keep only the two you want
    const keepEmails = ['timfulker@gmail.com', 'timfulkermusic@gmail.com'];
    
    const toDelete = users.filter(user => !keepEmails.includes(user.email));
    
    if (toDelete.length === 0) {
      console.log('\nNo users to delete - only the ones you want to keep are present.');
      return;
    }
    
    console.log(`\nDeleting ${toDelete.length} unwanted users...`);
    
    for (const user of toDelete) {
      console.log(`Deleting: ${user.email}`);
      await sql`DELETE FROM users WHERE id = ${user.id}`;
      console.log(`✅ Deleted ${user.email}`);
    }
    
    console.log('\n✅ All unwanted users deleted!');
    
    // Verify final state
    const finalUsers = await sql`SELECT email FROM users ORDER BY email`;
    console.log('\nRemaining users:');
    finalUsers.forEach(user => console.log(`- ${user.email}`));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

deleteUnwantedUsers();