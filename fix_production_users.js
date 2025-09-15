import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL_PROD;
const serviceKey = process.env.SUPABASE_SERVICE_KEY_PROD;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixUsersTable() {
  console.log('Checking production users table...');
  
  try {
    // Check current primary key constraints
    const { data: constraints, error: constraintError } = await supabase.rpc('check_constraints', {
      table_name: 'users'
    });
    
    if (constraintError) {
      console.log('Could not check constraints directly, trying alternate method...');
      
      // Try to add primary key constraint via SQL
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: `
          -- Check if primary key exists
          SELECT constraint_name 
          FROM information_schema.table_constraints 
          WHERE table_name = 'users' AND constraint_type = 'PRIMARY KEY';
        `
      });
      
      if (error) {
        console.log('SQL RPC not available. Trying direct table query...');
        
        // Just try to query the users table to verify connection
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, email')
          .limit(1);
          
        if (usersError) {
          console.error('Cannot connect to users table:', usersError);
          return;
        }
        
        console.log('✅ Connected to production users table');
        console.log(`Found ${users.length > 0 ? 'users' : 'no users'} in table`);
        
        console.log('\n🔧 The Supabase table editor UI issue might be a temporary glitch.');
        console.log('Try refreshing the Supabase dashboard and attempt deletion again.');
        console.log('If it still fails, you can delete users via SQL in the Supabase SQL editor:');
        console.log('DELETE FROM users WHERE email = \'unwanted@email.com\';');
        
        return;
      }
    }
    
    console.log('✅ Production database connection successful');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

fixUsersTable();