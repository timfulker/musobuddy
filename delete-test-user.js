// Delete test user account
import { db } from './server/db.js';
import { users } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function deleteTestUser() {
  console.log('🗑️ Deleting test user tim@saxweddings.com...');
  
  try {
    const result = await db.delete(users).where(eq(users.email, 'tim@saxweddings.com'));
    console.log('✅ User deleted successfully');
    
    // Also delete any verification codes for this phone number
    const { verificationCodes } = await import('./shared/schema.js');
    await db.delete(verificationCodes).where(eq(verificationCodes.phoneNumber, '+447764190034'));
    console.log('✅ Verification codes cleaned up');
    
  } catch (error) {
    console.error('❌ Error deleting user:', error);
  }
  
  process.exit(0);
}

deleteTestUser();