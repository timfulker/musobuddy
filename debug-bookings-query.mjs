// Debug script to check bookings query
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://soihodadevudjohibmbw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvaWhvZGFkZXZ1ZGpvaGlibWJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODExNjM3NiwiZXhwIjoyMDczNjkyMzc2fQ.koxbsDh-9DdQwc3OaDD7zLST2f3RWH_3WFOu-CdkCkM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugBookings() {
  try {
    // Get all users to see what user IDs exist
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    console.log('Recent Users:', JSON.stringify(users, null, 2));
    if (usersError) console.log('Users Error:', usersError);

    // Get recent bookings to see what user_ids they have
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, user_id, client_name, event_date, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    console.log('Recent Bookings:', JSON.stringify(bookings, null, 2));
    if (bookingsError) console.log('Bookings Error:', bookingsError);

    // Check for bookings created today (likely the imported ones)
    const today = new Date().toISOString().split('T')[0];
    const { data: todayBookings, error: todayError } = await supabase
      .from('bookings')
      .select('id, user_id, client_name, event_date, created_at')
      .gte('created_at', today + 'T00:00:00')
      .order('created_at', { ascending: false });

    console.log('Today\'s Bookings:', JSON.stringify(todayBookings, null, 2));
    if (todayError) console.log('Today Error:', todayError);

  } catch (error) {
    console.error('Error:', error);
  }
}

debugBookings();