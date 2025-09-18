// Make timfulker@gmail.com an admin in DEV environment
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseAdminDev = createClient(
  process.env.SUPABASE_URL_DEV,
  process.env.SUPABASE_SERVICE_KEY_DEV
);

async function makeTimFulkerAdminDev() {
  console.log('👑 Making timfulker@gmail.com an admin in DEV environment...\n');

  try {
    const email = 'timfulker@gmail.com';

    // Update existing user to admin
    console.log('🔧 Updating user to admin status...');
    const { data: updatedUser, error: updateError } = await supabaseAdminDev
      .from('users')
      .update({
        is_admin: true,
        has_paid: true,
        is_active: true
      })
      .eq('email', email)
      .select()
      .single();

    if (updateError) {
      console.log('❌ Update error:', updateError.message);
    } else {
      console.log('✅ User updated to admin:', updatedUser);
    }

    // Verify admin status
    console.log('\n🔍 Verifying admin status...');
    const { data: verifyUser } = await supabaseAdminDev
      .from('users')
      .select('email, is_admin, first_name, last_name, has_paid, is_active')
      .eq('email', email)
      .single();

    if (verifyUser) {
      console.log('✅ VERIFIED USER STATUS:');
      console.log('📧 Email:', verifyUser.email);
      console.log('👑 Admin:', verifyUser.is_admin);
      console.log('💰 Paid:', verifyUser.has_paid);
      console.log('🟢 Active:', verifyUser.is_active);
      console.log('👤 Name:', verifyUser.first_name, verifyUser.last_name);
    }

    console.log('\n🎉 DEV ADMIN ACCOUNT READY!');
    console.log('📧 Email: timfulker@gmail.com');
    console.log('🔑 Password: devpass123');
    console.log('👑 Admin Status: ✅');
    console.log('🌍 Environment: DEVELOPMENT');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

makeTimFulkerAdminDev();