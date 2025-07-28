// Check verification codes in database
import { db } from './server/db.js';
import { verificationCodes } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function checkVerificationCodes() {
  console.log('🔍 Checking verification codes in database...');
  
  try {
    // Get all verification codes for the phone number
    const codes = await db.select().from(verificationCodes).where(eq(verificationCodes.phoneNumber, '+447764190034'));
    
    console.log(`Found ${codes.length} verification codes for +447764190034:`);
    codes.forEach((code, i) => {
      console.log(`${i + 1}. Code: ${code.code}`);
      console.log(`   Expires: ${code.expiresAt}`);
      console.log(`   Created: ${code.createdAt}`);
      console.log(`   Expired: ${new Date() > code.expiresAt ? 'YES' : 'NO'}`);
      console.log('');
    });
    
    // Get the most recent valid code
    const validCodes = codes.filter(c => new Date() < c.expiresAt);
    if (validCodes.length > 0) {
      const latest = validCodes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
      console.log(`🔑 Current valid code: ${latest.code}`);
      console.log(`🕐 Expires in: ${Math.round((latest.expiresAt - new Date()) / 1000 / 60)} minutes`);
    } else {
      console.log('❌ No valid verification codes found');
    }
    
  } catch (error) {
    console.error('❌ Error checking verification codes:', error);
  }
  
  process.exit(0);
}

checkVerificationCodes();