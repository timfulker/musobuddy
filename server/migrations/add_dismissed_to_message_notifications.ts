import { sql } from 'drizzle-orm';
import { db } from '../core/database';

export async function addDismissedToMessageNotifications() {
  console.log('Adding isDismissed column to message_notifications table...');
  
  try {
    // Add the isDismissed column with a default value of false
    await db.execute(sql`
      ALTER TABLE message_notifications 
      ADD COLUMN IF NOT EXISTS is_dismissed BOOLEAN DEFAULT false
    `);
    
    console.log('✅ Successfully added isDismissed column to message_notifications table');
  } catch (error) {
    console.error('❌ Error adding isDismissed column:', error);
    throw error;
  }
}

// Run the migration
addDismissedToMessageNotifications()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });