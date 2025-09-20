// Debug script to check user settings
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://soihodadevudjohibmbw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvaWhvZGFkZXZ1ZGpvaGlibWJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODExNjM3NiwiZXhwIjoyMDczNjkyMzc2fQ.koxbsDh-9DdQwc3OaDD7zLST2f3RWH_3WFOu-CdkCkM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugUserSettings() {
  try {
    const userId = "a-f3aXjxMXJHdSTujnAO5";

    // Get user settings
    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    console.log('User Settings:', JSON.stringify(settings, null, 2));
    if (settingsError) console.log('Settings Error:', settingsError);

    // Get all bookings for this user (no filtering)
    const { data: allBookings, error: allBookingsError } = await supabase
      .from('bookings')
      .select('id, user_id, client_name, event_date, status, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    console.log('All User Bookings (raw):', JSON.stringify(allBookings, null, 2));
    if (allBookingsError) console.log('All Bookings Error:', allBookingsError);

  } catch (error) {
    console.error('Error:', error);
  }
}

debugUserSettings();