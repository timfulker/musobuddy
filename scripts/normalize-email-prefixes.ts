/**
 * Migration Script: Normalize Email Prefixes to Lowercase
 *
 * This script converts all existing email prefixes in the Supabase database to lowercase
 * to ensure case-insensitive matching works correctly.
 *
 * Background:
 * - Email prefixes were previously stored with mixed case (e.g., "DT1")
 * - The query logic always converted to lowercase when searching
 * - This caused a mismatch where "DT1" in DB wouldn't match "dt1" search
 *
 * Solution:
 * - Normalize all email prefixes to lowercase on save
 * - This migration updates existing records in Supabase
 *
 * Usage:
 *   npm run migrate:email-prefixes
 *   or
 *   npx tsx scripts/normalize-email-prefixes.ts
 */

import { db } from '../server/core/database';
import { users } from '../shared/schema';
import { isNotNull, eq } from 'drizzle-orm';

async function normalizeEmailPrefixes() {
  console.log('🔄 Starting email prefix normalization for Supabase...');
  console.log(`🔍 Environment: ${process.env.NODE_ENV || 'development'}`);

  try {
    // Find all users with email prefixes that contain uppercase letters
    const usersToUpdate = await db.select({
      id: users.id,
      email: users.email,
      emailPrefix: users.emailPrefix
    })
    .from(users)
    .where(isNotNull(users.emailPrefix));

    console.log(`📊 Found ${usersToUpdate.length} users with email prefixes`);

    let updatedCount = 0;
    let alreadyLowercase = 0;

    for (const user of usersToUpdate) {
      const currentPrefix = user.emailPrefix!;
      const lowercasePrefix = currentPrefix.toLowerCase();

      if (currentPrefix !== lowercasePrefix) {
        console.log(`🔧 Updating user ${user.id} (${user.email}): "${currentPrefix}" → "${lowercasePrefix}"`);

        await db.update(users)
          .set({
            emailPrefix: lowercasePrefix,
            updatedAt: new Date()
          })
          .where(eq(users.id, user.id));

        updatedCount++;
      } else {
        alreadyLowercase++;
      }
    }

    console.log('\n✅ Migration complete!');
    console.log(`   - Updated: ${updatedCount} prefixes`);
    console.log(`   - Already lowercase: ${alreadyLowercase} prefixes`);
    console.log(`   - Total processed: ${usersToUpdate.length} users`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run the migration
normalizeEmailPrefixes()
  .then(() => {
    console.log('🎉 Migration successful!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration error:', error);
    process.exit(1);
  });
