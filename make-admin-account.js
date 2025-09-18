// Make timfulkermusic@gmail.com an admin account
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL_PROD,
  process.env.SUPABASE_SERVICE_KEY_PROD
);

async function makeAdminAccount() {
  console.log('👑 Making timfulkermusic@gmail.com an ADMIN account...\n');

  try {
    const email = 'timfulkermusic@gmail.com';

    // Update existing user to be admin
    console.log('🔧 Updating user to admin status...');
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        is_admin: true,
        first_name: 'Tim',
        last_name: 'Fulker',
        has_paid: true,
        tier: 'premium',
        email_verified: true,
        trial_ends_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year trial
        updated_at: new Date().toISOString()
      })
      .eq('email', email)
      .select()
      .single();

    if (updateError) {
      console.log('❌ Update error:', updateError.message);
    } else {
      console.log('✅ User updated to admin:', updatedUser);
    }

    // Verify the update
    console.log('\n🔍 Verifying admin status...');
    const { data: verifyUser } = await supabaseAdmin
      .from('users')
      .select('email, is_admin, first_name, last_name, tier, has_paid')
      .eq('email', email)
      .single();

    if (verifyUser) {
      console.log('✅ Verified user:', verifyUser);
    }

    console.log('\n👑 ADMIN ACCOUNT READY!');
    console.log('📧 Email: timfulkermusic@gmail.com');
    console.log('🔑 Password: musicpass123');
    console.log('👑 Admin Status: ✅');
    console.log('💎 Tier: Premium');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

makeAdminAccount();