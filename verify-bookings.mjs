// Direct database verification script
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://soihodadevudjohibmbw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvaWhvZGFkZXZ1ZGpvaGlibWJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODExNjM3NiwiZXhwIjoyMDczNjkyMzc2fQ.koxbsDh-9DdQwc3OaDD7zLST2f3RWH_3WFOu-CdkCkM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyBookings() {
  const userId = "a-f3aXjxMXJHdSTujnAO5";

  console.log('=== VERIFICATION REPORT ===\n');

  // 1. Check total bookings for this user
  const { data: allBookings, error: allError } = await supabase
    .from('bookings')
    .select('id, user_id, client_name, event_date, status')
    .eq('user_id', userId);

  console.log(`✅ Total bookings for user ${userId}:`, allBookings?.length || 0);

  // 2. Check recently imported bookings (last hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: recentBookings, error: recentError } = await supabase
    .from('bookings')
    .select('id, client_name, created_at')
    .eq('user_id', userId)
    .gte('created_at', oneHourAgo)
    .order('created_at', { ascending: false });

  console.log(`📅 Bookings imported in last hour:`, recentBookings?.length || 0);
  if (recentBookings?.length > 0) {
    console.log('Recent imports:', recentBookings.slice(0, 3).map(b =>
      `  - ${b.client_name} (${new Date(b.created_at).toLocaleTimeString()})`
    ).join('\n'));
  }

  // 3. Check unique user IDs in bookings table
  const { data: uniqueUsers, error: usersError } = await supabase
    .from('bookings')
    .select('user_id')
    .limit(1000);

  const uniqueUserIds = [...new Set(uniqueUsers?.map(b => b.user_id) || [])];
  console.log(`\n👥 Unique user IDs in bookings table:`, uniqueUserIds.length);
  uniqueUserIds.forEach(id => {
    const count = uniqueUsers?.filter(b => b.user_id === id).length || 0;
    console.log(`  - ${id}: ${count} bookings`);
  });

  // 4. Check the exact query the API would run
  console.log(`\n🔍 Testing exact API query:`);
  const { data: apiQuery, error: apiError } = await supabase
    .from('bookings')
    .select('*')
    .eq('user_id', userId)
    .order('event_date', { ascending: false });

  console.log(`Result: ${apiQuery?.length || 0} bookings`);

  if (apiError) {
    console.log('❌ API Query Error:', apiError);
  }

  // 5. Sample booking structure
  if (allBookings && allBookings.length > 0) {
    console.log('\n📋 Sample booking structure:');
    console.log(JSON.stringify(allBookings[0], null, 2));
  }
}

verifyBookings().catch(console.error);