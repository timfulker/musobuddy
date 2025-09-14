// Check what data exists for timfulkermusic@gmail.com in development database
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Development database
const supabaseDev = createClient(
  process.env.SUPABASE_URL_DEV,
  process.env.SUPABASE_SERVICE_KEY_DEV
);

async function checkUserData() {
  const userEmail = 'timfulkermusic@gmail.com';

  console.log('🔍 Checking data for:', userEmail);
  console.log('=' .repeat(50));

  try {
    // 1. Check user record
    const { data: user, error: userError } = await supabaseDev
      .from('users')
      .select('*')
      .eq('email', userEmail)
      .single();

    if (userError) {
      console.log('❌ User not found:', userError.message);
      return;
    }

    console.log('✅ User found:');
    console.log('  - ID:', user.user_id);
    console.log('  - Name:', user.first_name, user.last_name);
    console.log('  - Supabase UID:', user.supabase_uid);
    console.log('');

    const userId = user.user_id;

    // Also check using email since user_id might be undefined
    console.log('  Checking with user_id:', userId);

    // 2. Check bookings - try both user_id and email
    let { data: bookings, error: bookingsError } = await supabaseDev
      .from('bookings')
      .select('id, venue_name, date, client_name, status, user_id')
      .or(`user_id.eq.${userId},client_email.eq.${userEmail}`)
      .order('date', { ascending: false });

    // If no bookings found, check all bookings to see what user_ids exist
    if (!bookings || bookings.length === 0) {
      const { data: allBookings } = await supabaseDev
        .from('bookings')
        .select('user_id')
        .not('user_id', 'is', null)
        .limit(10);
      console.log('  Sample user_ids in bookings:', allBookings?.map(b => b.user_id).join(', '));
    }

    console.log(`📅 Bookings: ${bookings?.length || 0} found`);
    if (bookings && bookings.length > 0) {
      console.log('  Recent bookings:');
      bookings.slice(0, 5).forEach(b => {
        console.log(`    - ${b.date}: ${b.venue_name} (${b.client_name}) - ${b.status}`);
      });
    }
    console.log('');

    // 3. Check clients
    const { data: clients, error: clientsError } = await supabaseDev
      .from('clients')
      .select('id, name, email')
      .eq('user_id', userId)
      .limit(5);

    console.log(`👥 Clients: ${clients?.length || 0} found`);
    if (clients && clients.length > 0) {
      console.log('  Sample clients:');
      clients.forEach(c => {
        console.log(`    - ${c.name} (${c.email})`);
      });
    }
    console.log('');

    // 4. Check contracts
    const { data: contracts, error: contractsError } = await supabaseDev
      .from('contracts')
      .select('id, contract_number, status')
      .eq('user_id', userId)
      .limit(5);

    console.log(`📄 Contracts: ${contracts?.length || 0} found`);
    if (contracts && contracts.length > 0) {
      contracts.forEach(c => {
        console.log(`    - ${c.contract_number}: ${c.status}`);
      });
    }
    console.log('');

    // 5. Check invoices
    const { data: invoices, error: invoicesError } = await supabaseDev
      .from('invoices')
      .select('id, invoice_number, status, total_amount')
      .eq('user_id', userId)
      .limit(5);

    console.log(`💰 Invoices: ${invoices?.length || 0} found`);
    if (invoices && invoices.length > 0) {
      invoices.forEach(i => {
        console.log(`    - ${i.invoice_number}: $${i.total_amount} - ${i.status}`);
      });
    }
    console.log('');

    // 6. Check user settings
    const { data: settings, error: settingsError } = await supabaseDev
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    console.log(`⚙️ User Settings: ${settings ? 'Found' : 'Not found'}`);
    if (settings) {
      console.log(`    - Theme: ${settings.theme}`);
      console.log(`    - Email notifications: ${settings.email_notifications}`);
    }

    console.log('');
    console.log('=' .repeat(50));
    console.log('Summary:');
    console.log(`This user has data in ${[bookings?.length > 0 && 'bookings', clients?.length > 0 && 'clients', contracts?.length > 0 && 'contracts', invoices?.length > 0 && 'invoices', settings && 'settings'].filter(Boolean).join(', ') || 'no'} tables.`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkUserData();