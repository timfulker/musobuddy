// Check user in database
import { db } from './server/core/database.js';
import { users } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function checkUser() {
  console.log('🔍 Checking user tim@saxweddings.com in database...');
  
  try {
    const user = await db.select().from(users).where(eq(users.email, 'tim@saxweddings.com'));
    console.log('\nUser found:', user.length > 0);
    
    if (user.length > 0) {
      console.log('User details:', {
        id: user[0].id,
        email: user[0].email,
        phoneNumber: user[0].phoneNumber,
        isVerified: user[0].isVerified,
        isActive: user[0].isActive,
        isSubscribed: user[0].isSubscribed,
        role: user[0].role,
        createdAt: user[0].createdAt
      });
    } else {
      console.log('❌ User not found in database');
    }
    
    // Also check all users
    console.log('\n📊 All users in database:');
    const allUsers = await db.select({
      email: users.email,
      phoneNumber: users.phoneNumber,
      isVerified: users.isVerified,
      role: users.role
    }).from(users);
    
    allUsers.forEach((u, i) => {
      console.log(`${i + 1}. ${u.email} | Phone: ${u.phoneNumber} | Verified: ${u.isVerified} | Role: ${u.role}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

checkUser();