import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Use production Supabase
const supabaseUrl = process.env.SUPABASE_URL_PROD;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY_PROD;

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteUnwantedUsers() {
  try {
    console.log('🔍 Checking production users...');
    
    // Get all users
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name');
    
    if (error) {
      console.error('Error fetching users:', error);
      return;
    }
    
    console.log('\nCurrent users in production:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.first_name} ${user.last_name})`);
    });
    
    // Users to keep
    const keepEmails = ['timfulker@gmail.com', 'timfulkermusic@gmail.com'];
    
    const usersToDelete = users.filter(user => !keepEmails.includes(user.email));
    
    if (usersToDelete.length === 0) {
      console.log('\n✅ No unwanted users found - only the ones you want to keep are present.');
      return;
    }
    
    console.log(`\n🗑️  Deleting ${usersToDelete.length} unwanted user(s)...`);
    
    for (const user of usersToDelete) {
      console.log(`   Deleting: ${user.email}...`);
      
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id);
      
      if (deleteError) {
        console.error(`   ❌ Error deleting ${user.email}:`, deleteError);
      } else {
        console.log(`   ✅ Deleted ${user.email}`);
      }
    }
    
    console.log('\n🎉 Cleanup complete!');
    
    // Show final state
    const { data: finalUsers } = await supabase
      .from('users')
      .select('email')
      .order('email');
    
    console.log('\nRemaining users:');
    finalUsers?.forEach(user => console.log(`   - ${user.email}`));
    
  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

// Set NODE_ENV to production to use the right database
process.env.NODE_ENV = 'production';

deleteUnwantedUsers();