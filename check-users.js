import { db } from './server/core/database.js';
import { users } from './shared/schema.js';

(async () => {
  try {
    const allUsers = await db.select().from(users);
    console.log('All users in database:');
    allUsers.forEach(u => {
      console.log('User ID:', u.id, '| Email:', u.email, '| Prefix:', u.emailPrefix || 'NONE');
    });
    
    // Check specifically for the user IDs mentioned
    const user1 = allUsers.find(u => u.id === '1754488522516');
    const user2 = allUsers.find(u => u.id === '43963086');
    
    console.log('\n=== Specific Users ===');
    console.log('Your account (1754488522516):', user1 ? `${user1.email} | Prefix: ${user1.emailPrefix || 'NONE'}` : 'NOT FOUND');
    console.log('Other user (43963086):', user2 ? `${user2.email} | Prefix: ${user2.emailPrefix || 'NONE'}` : 'NOT FOUND');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();