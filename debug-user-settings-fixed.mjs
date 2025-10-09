// Debug script to check user settings with correct table name
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://soihodadevudjohibmbw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvaWhvZGFkZXZ1ZGpvaGlibWJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODExNjM3NiwiZXhwIjoyMDczNjkyMzc2fQ.koxbsDh-9DdQwc3OaDD7zLST2f3RWH_3WFOu-CdkCkM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugUserSettings() {
  try {
    const userId = "a-f3aXjxMXJHdSTujnAO5";

    // Try both table names to see which one exists
    const { data: userSettings, error: userSettingsError } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    console.log('User Settings (user_settings table):', JSON.stringify(userSettings, null, 2));
    if (userSettingsError) console.log('User Settings Error:', userSettingsError);

    // List all tables to see what's available
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_table_names');

    if (tablesError) {
      // Alternative way to see what tables exist
      console.log('Could not get table names, trying direct query...');
    } else {
      console.log('Available tables:', tables);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

debugUserSettings();