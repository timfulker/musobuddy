import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

// Use the main DATABASE_URL (development)
const sql = neon(process.env.DATABASE_URL);

async function deleteUnwantedUsers() {
  try {
    console.log('🔍 Checking users in database...');
    
    const users = await sql`SELECT id, email, first_name, last_name FROM users ORDER BY email`;
    
    console.log('\nCurrent users:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.first_name} ${user.last_name})`);
    });
    
    // Keep only these two
    const keepEmails = ['timfulker@gmail.com', 'timfulkermusic@gmail.com'];
    const usersToDelete = users.filter(user => !keepEmails.includes(user.email));
    
    if (usersToDelete.length === 0) {
      console.log('\n✅ Only the users you want to keep are present.');
      return;
    }
    
    console.log(`\n🗑️  Deleting ${usersToDelete.length} unwanted user(s)...`);
    
    for (const user of usersToDelete) {
      console.log(`   Deleting: ${user.email}...`);
      
      try {
        await sql`DELETE FROM users WHERE id = ${user.id}`;
        console.log(`   ✅ Deleted ${user.email}`);
      } catch (error) {
        console.log(`   ❌ Error deleting ${user.email}:`, error.message);
      }
    }
    
    console.log('\n🎉 Done!');
    
    // Show final state
    const finalUsers = await sql`SELECT email FROM users ORDER BY email`;
    console.log('\nRemaining users:');
    finalUsers.forEach(user => console.log(`   - ${user.email}`));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

deleteUnwantedUsers();