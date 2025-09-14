const { BookingStorage } = require('./server/storage/booking-storage.ts');
require('dotenv').config();

async function debugAdapterRouting() {
  console.log('🔍 Debugging Adapter Routing');
  console.log('============================\n');

  // Check environment variables
  console.log('📊 Environment Variables:');
  console.log('  NODE_ENV:', process.env.NODE_ENV);
  console.log('  USE_SUPABASE:', process.env.USE_SUPABASE);
  console.log('  SUPABASE_MIGRATION_MODE:', process.env.SUPABASE_MIGRATION_MODE);
  console.log('  SUPABASE_URL_DEV:', process.env.SUPABASE_URL_DEV ? 'Set' : 'Missing');
  console.log('  SUPABASE_SERVICE_KEY_DEV:', process.env.SUPABASE_SERVICE_KEY_DEV ? 'Set' : 'Missing');

  try {
    // Initialize booking storage
    const bookingStorage = new BookingStorage();
    console.log('\n✅ BookingStorage initialized successfully');

    // Test the adapter initialization
    console.log('\n🧪 Testing Supabase Adapter:');

    // Check if supabaseStorage exists
    console.log('  - Adapter exists:', !!bookingStorage.supabaseStorage);

    if (bookingStorage.supabaseStorage) {
      console.log('  - Is enabled:', bookingStorage.supabaseStorage.isSupabaseEnabled());
      console.log('  - Migration mode:', bookingStorage.supabaseStorage.getMigrationMode());

      // Test the routing condition
      const shouldUseSupabase = bookingStorage.supabaseStorage.isSupabaseEnabled() &&
                               bookingStorage.supabaseStorage.getMigrationMode() === 'supabase-primary';

      console.log('  - Should use Supabase:', shouldUseSupabase);
      console.log('');

      if (shouldUseSupabase) {
        console.log('✅ Adapter should route to Supabase');
        console.log('   READ operations should use Supabase');
        console.log('   WRITE operations should use Supabase');
      } else {
        console.log('❌ Adapter will route to Firebase');
        console.log('   This explains the data mismatch!');

        if (!bookingStorage.supabaseStorage.isSupabaseEnabled()) {
          console.log('   Reason: Supabase not enabled');
        }
        if (bookingStorage.supabaseStorage.getMigrationMode() !== 'supabase-primary') {
          console.log('   Reason: Migration mode is not "supabase-primary"');
        }
      }
    } else {
      console.log('❌ Supabase adapter not initialized!');
    }

  } catch (error) {
    console.error('❌ Error initializing BookingStorage:', error.message);
  }
}

debugAdapterRouting();