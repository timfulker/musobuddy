const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL_DEV;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY_DEV;

console.log('Testing booking creation with real user ID...');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRealBooking() {
  try {
    // Use a real user ID from the database
    const realUserId = 'a-f3aXjxMXJHdSTujnAO5';

    const testBooking = {
      user_id: realUserId,
      title: 'Test Booking - Debug',
      client_name: 'Debug Client',
      client_email: 'debug@example.com',
      venue: 'Debug Venue',
      event_date: '2024-02-15',
      status: 'new',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📝 Creating booking with real user ID:', realUserId);

    const { data, error } = await supabase
      .from('bookings')
      .insert([testBooking])
      .select()
      .maybeSingle();

    if (error) {
      console.error('❌ Failed to create booking:', error);
    } else {
      console.log('✅ Booking created successfully with ID:', data.id);
      console.log('   Client:', data.client_name);
      console.log('   User ID:', data.user_id);

      // Clean up
      const { error: deleteError } = await supabase
        .from('bookings')
        .delete()
        .eq('id', data.id);

      if (deleteError) {
        console.error('⚠️ Failed to clean up test booking:', deleteError);
      } else {
        console.log('🧹 Test booking cleaned up successfully');
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testRealBooking();