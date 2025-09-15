import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

// Use the main DATABASE_URL (development for now to test)
const sql = neon(process.env.DATABASE_URL);

async function listUsers() {
  try {
    console.log('🔍 Current users in database:');
    
    const users = await sql`SELECT id, email, first_name, last_name FROM users ORDER BY email`;
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.first_name} ${user.last_name}) [ID: ${user.id}]`);
    });
    
    console.log(`\nTotal: ${users.length} users`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

listUsers();