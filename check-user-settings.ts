import { db } from './server/core/database';
import { userSettings, users } from './shared/schema';
import { eq } from 'drizzle-orm';

async function checkUserSettings() {
  console.log('Checking user settings for both accounts...\n');
  
  // Check timfulker@gmail.com
  const user1 = await db.select().from(users).where(eq(users.email, 'timfulker@gmail.com')).limit(1);
  if (user1.length > 0) {
    console.log('User 1: timfulker@gmail.com');
    console.log('User ID:', user1[0].id);
    
    const settings1 = await db.select().from(userSettings).where(eq(userSettings.userId, user1[0].id)).limit(1);
    if (settings1.length > 0) {
      console.log('Settings found for timfulker@gmail.com:');
      console.log('- Booking Display Limit:', settings1[0].bookingDisplayLimit);
      console.log('- Distance Units:', settings1[0].distanceUnits);
      console.log('- Full settings object:');
      console.log(JSON.stringify(settings1[0], null, 2));
    } else {
      console.log('No settings found for timfulker@gmail.com');
    }
  } else {
    console.log('User timfulker@gmail.com not found');
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Check timfulkermusic@gmail.com
  const user2 = await db.select().from(users).where(eq(users.email, 'timfulkermusic@gmail.com')).limit(1);
  if (user2.length > 0) {
    console.log('User 2: timfulkermusic@gmail.com');
    console.log('User ID:', user2[0].id);
    
    const settings2 = await db.select().from(userSettings).where(eq(userSettings.userId, user2[0].id)).limit(1);
    if (settings2.length > 0) {
      console.log('Settings found for timfulkermusic@gmail.com:');
      console.log('- Booking Display Limit:', settings2[0].bookingDisplayLimit);
      console.log('- Distance Units:', settings2[0].distanceUnits);
      console.log('- Full settings object:');
      console.log(JSON.stringify(settings2[0], null, 2));
    } else {
      console.log('No settings found for timfulkermusic@gmail.com');
    }
  } else {
    console.log('User timfulkermusic@gmail.com not found');
  }
  
  process.exit(0);
}

checkUserSettings().catch(console.error);