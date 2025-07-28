// Delete test user account
import { db } from './server/db.js';
import { users } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function deleteTestUser() {
  console.log('🗑️ Deleting test user tim@saxweddings.com...');
  
  try {
    const result = await db.delete(users).where(eq(users.email, 'tim@saxweddings.com'));
    console.log('✅ User deleted successfully');
    
  } catch (error) {
    console.error('❌ Error deleting user:', error);
  }
  
  process.exit(0);
}

deleteTestUser();