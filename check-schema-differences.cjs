const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL_DEV,
  process.env.SUPABASE_SERVICE_KEY_DEV
);

async function compareSchemas() {
  // Get Supabase columns
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .limit(1);

  if (!data || data.length === 0) {
    console.log('No data to check');
    return;
  }

  const supabaseColumns = Object.keys(data[0]).sort();

  // These are the columns your Firebase/Neon app expects based on the code
  const expectedColumns = [
    'user_id', 'title', 'client_name', 'client_email', 'client_phone',
    'client_address', 'venue', 'venue_address', 'event_date', 'event_time',
    'event_end_time', 'fee', 'final_amount', 'deposit', 'status', 'notes',
    'gig_type', 'event_type', 'equipment_requirements', 'special_requirements',
    'performance_duration', 'styles', 'equipment_provided', 'whats_included',
    'dress_code', 'contact_person', 'contact_phone', 'parking_info',
    'venue_contact_info', 'travel_expense', 'what3words', 'mileage',
    'google_place_id', 'latitude', 'longitude', 'venue_contact',
    'sound_tech_contact', 'stage_size', 'power_equipment', 'style_mood',
    'must_play_songs', 'avoid_songs', 'set_order', 'first_dance_song',
    'processional_song', 'signing_register_song', 'recessional_song',
    'special_dedications', 'guest_announcements', 'load_in_info',
    'sound_check_time', 'weather_contingency', 'parking_permit_required',
    'meal_provided', 'dietary_requirements', 'shared_notes', 'reference_tracks',
    'photo_permission', 'encore_allowed', 'encore_suggestions'
  ];

  console.log('🔍 Schema Comparison Report:');
  console.log('============================\n');

  const missing = expectedColumns.filter(col => !supabaseColumns.includes(col));
  const existing = expectedColumns.filter(col => supabaseColumns.includes(col));

  console.log('✅ Columns that EXIST in Supabase: ' + existing.length + '/' + expectedColumns.length);
  console.log('❌ Columns that are MISSING: ' + missing.length + '/' + expectedColumns.length);

  if (missing.length > 0) {
    console.log('\n❌ Missing columns (Firebase has, Supabase doesn\'t):');
    missing.forEach(col => console.log('  - ' + col));
  }

  // Check for column name variations
  console.log('\n🔄 Detected column name differences:');
  if (missing.includes('deposit') && supabaseColumns.includes('deposit_amount')) {
    console.log('  - "deposit" → "deposit_amount" (different name)');
  }
  if (missing.includes('google_place_id')) {
    console.log('  - "google_place_id" → missing (not migrated)');
  }
  if (missing.includes('latitude') && supabaseColumns.includes('map_latitude')) {
    console.log('  - "latitude" → "map_latitude" (different name)');
  }
  if (missing.includes('longitude') && supabaseColumns.includes('map_longitude')) {
    console.log('  - "longitude" → "map_longitude" (different name)');
  }
  if (missing.includes('contact_person')) {
    console.log('  - "contact_person" → missing (not in Supabase at all)');
  }

  console.log('\n📊 Summary:');
  console.log('  - Supabase has ' + supabaseColumns.length + ' total columns');
  console.log('  - Your app expects ' + expectedColumns.length + ' columns');
  console.log('  - ' + missing.length + ' columns need to be added or mapped differently');

  console.log('\n💡 This explains why the migration seemed incomplete!');
  console.log('   The schemas don\'t match perfectly between Firebase/Neon and Supabase.');
}

compareSchemas();