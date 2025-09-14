// Copy just the clients table
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseDev = createClient(
  process.env.SUPABASE_URL_DEV,
  process.env.SUPABASE_SERVICE_KEY_DEV
);

const supabaseProd = createClient(
  process.env.SUPABASE_URL_PROD,
  process.env.SUPABASE_SERVICE_KEY_PROD
);

async function copyClients() {
  console.log('📋 Copying clients...');

  try {
    // Get all clients from development
    const { data, error } = await supabaseDev
      .from('clients')
      .select('*');

    if (error) {
      console.log('❌ Error fetching clients:', error.message);
      return;
    }

    console.log(`📊 Found ${data.length} clients to copy`);

    // Clear existing clients in production
    await supabaseProd.from('clients').delete().neq('id', 0);

    // Insert in batches
    const batchSize = 100;
    let copied = 0;

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, Math.min(i + batchSize, data.length));

      const { error: insertError } = await supabaseProd
        .from('clients')
        .insert(batch);

      if (insertError) {
        console.log(`❌ Error inserting clients batch ${i}:`, insertError.message);
        return;
      }

      copied += batch.length;
      console.log(`  📈 Progress: ${copied}/${data.length} (${Math.round((copied/data.length)*100)}%)`);
    }

    console.log(`✅ Successfully copied ${copied} clients!`);

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

copyClients();