import { db } from './server/core/database';
import { userSettings } from './shared/schema';
import { eq } from 'drizzle-orm';

async function fixEmptyClauses() {
  console.log('Fixing empty customInvoiceClauses for timfulkermusic@gmail.com...\n');
  
  // Update timfulkermusic@gmail.com settings to remove empty clause
  const result = await db.update(userSettings)
    .set({
      customInvoiceClauses: JSON.stringify([]) // Set to empty array instead of array with empty clause
    })
    .where(eq(userSettings.userId, '1754488522516'));
  
  console.log('Updated settings for timfulkermusic@gmail.com');
  console.log('Result:', result);
  
  // Verify the fix
  const updated = await db.select().from(userSettings).where(eq(userSettings.userId, '1754488522516')).limit(1);
  if (updated.length > 0) {
    console.log('\nVerification - customInvoiceClauses now:', updated[0].customInvoiceClauses);
  }
  
  process.exit(0);
}

fixEmptyClauses().catch(console.error);