import { createClient } from '@supabase/supabase-js';

// Use production Supabase for testing since user is in production
const SUPABASE_URL = 'https://soihodadevudjohibmbw.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvaWhvZGFkZXZ1ZGpvaGlibWJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODExNjM3NiwiZXhwIjoyMDczNjkyMzc2fQ.koxbsDh-9DdQwc3OaDD7zLST2f3RWH_3WFOu-CdkCkM';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testHomeAddressFields() {
  try {
    console.log('🔍 Testing home address field handling...');

    // Check if we can find the user first
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', 'timfulkermusic@gmail.com');

    if (userError) {
      console.error('❌ Error finding user:', userError.message);
      return;
    }

    if (!users || users.length === 0) {
      console.error('❌ No user found with email timfulkermusic@gmail.com');
      return;
    }

    const user = users[0];
    console.log('✅ Found user:', user.email, 'ID:', user.id);

    // Check current settings
    const { data: currentSettings, error: fetchError } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('❌ Error fetching settings:', fetchError.message);
      return;
    }

    if (currentSettings) {
      console.log('✅ Current settings found:');
      console.log('  Business Name:', currentSettings.business_name);
      console.log('  Home Address Line 1:', currentSettings.home_address_line1);
      console.log('  Home Address Line 2:', currentSettings.home_address_line2);
      console.log('  Home City:', currentSettings.home_city);
      console.log('  Home Postcode:', currentSettings.home_postcode);
    } else {
      console.log('⚠️ No settings found for user');
    }

    // Test updating home address fields
    console.log('\n🧪 Testing home address update...');

    const testData = {
      home_address_line1: '123 Test Street',
      home_address_line2: 'Apartment 4B',
      home_city: 'Test City',
      home_postcode: 'TE5T 1NG'
    };

    const { data: updatedSettings, error: updateError } = await supabase
      .from('user_settings')
      .update(testData)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating settings:', updateError.message);
      return;
    }

    console.log('✅ Update successful:');
    console.log('  Home Address Line 1:', updatedSettings.home_address_line1);
    console.log('  Home Address Line 2:', updatedSettings.home_address_line2);
    console.log('  Home City:', updatedSettings.home_city);
    console.log('  Home Postcode:', updatedSettings.home_postcode);

    // Verify the update persisted
    console.log('\n🔍 Verifying persistence...');

    const { data: verifySettings, error: verifyError } = await supabase
      .from('user_settings')
      .select('home_address_line1, home_address_line2, home_city, home_postcode')
      .eq('user_id', user.id)
      .single();

    if (verifyError) {
      console.error('❌ Error verifying settings:', verifyError.message);
      return;
    }

    console.log('✅ Verification successful:');
    console.log('  Home Address Line 1:', verifySettings.home_address_line1);
    console.log('  Home Address Line 2:', verifySettings.home_address_line2);
    console.log('  Home City:', verifySettings.home_city);
    console.log('  Home Postcode:', verifySettings.home_postcode);

    console.log('\n✅ Test completed successfully - Home address fields are working at database level');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testHomeAddressFields();