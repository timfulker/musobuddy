import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Use Supabase admin client (bypasses all connection issues)
const supabaseUrl = process.env.SUPABASE_URL_PROD;
const serviceKey = process.env.SUPABASE_SERVICE_KEY_PROD;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing production Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function deleteUnwantedUsers() {
  try {
    console.log('🔍 Listing production users via Supabase API...');
    
    // Get all users using Supabase client
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, firstName, lastName');
    
    if (error) {
      console.error('❌ Error fetching users:', error);
      return;
    }
    
    console.log(`\nFound ${users.length} users:`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.firstName} ${user.lastName}) [ID: ${user.id}]`);
    });
    
    // Keep only these emails
    const keepEmails = ['timfulker@gmail.com', 'timfulkermusic@gmail.com'];
    
    const usersToDelete = users.filter(user => !keepEmails.includes(user.email));
    
    if (usersToDelete.length === 0) {
      console.log('\n✅ Only the users you want to keep are present.');
      return;
    }
    
    console.log(`\n🗑️ Deleting ${usersToDelete.length} user(s):`);
    
    for (const user of usersToDelete) {
      console.log(`   Deleting: ${user.email}...`);
      
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id);
      
      if (deleteError) {
        console.log(`   ❌ Error deleting ${user.email}:`, deleteError.message);
      } else {
        console.log(`   ✅ Deleted ${user.email}`);
      }
    }
    
    console.log('\n🎉 Done! Only timfulker@gmail.com and timfulkermusic@gmail.com should remain.');
    
    // Verify final state
    console.log('\n🔍 Verifying final users...');
    const { data: finalUsers } = await supabase
      .from('users')
      .select('email');
    
    console.log('Remaining users:');
    finalUsers.forEach(user => console.log(`  - ${user.email}`));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

deleteUnwantedUsers();