import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

async function checkSchema() {
  const supabase = createClient(
    process.env.SUPABASE_URL_DEV,
    process.env.SUPABASE_SERVICE_KEY_DEV
  );

  // Get a sample booking to see the actual column names
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .limit(1);

  if (error) {
    console.log('Error:', error);
  } else if (data && data.length > 0) {
    console.log('Bookings table columns:');
    console.log(Object.keys(data[0]));
    console.log('\nSample booking:');
    console.log(JSON.stringify(data[0], null, 2));
  }
}

checkSchema().catch(console.error);