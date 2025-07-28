// Create test user account
import { db } from './server/db.js';
import { users } from './shared/schema.js';
import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';

async function createTestUser() {
  console.log('🔧 Creating test user tim@saxweddings.com...');
  
  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash('MusoBuddy123!', 10);
    
    // Create user
    const newUser = await db.insert(users).values({
      id: nanoid(),
      email: 'tim@saxweddings.com',
      password: hashedPassword,
      phoneNumber: '+447764190034',
      firstName: 'Tim',
      lastName: 'Fulker',
      businessName: 'Sax Weddings',
      role: 'user',
      tier: 'trial',
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      isVerified: false,
      isActive: true,
      isSubscribed: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    console.log('✅ User created successfully:', {
      id: newUser[0].id,
      email: newUser[0].email,
      phoneNumber: newUser[0].phoneNumber,
      tier: newUser[0].tier,
      trialEndsAt: newUser[0].trialEndsAt
    });
    
  } catch (error) {
    console.error('❌ Error creating user:', error);
  }
  
  process.exit(0);
}

createTestUser();