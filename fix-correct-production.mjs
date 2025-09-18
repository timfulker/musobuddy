/**
 * Fix CORRECT Production User
 * Frontend is using soihodadevudjohibmbw, so create user there
 * Also fixing the email to match what you're typing
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// The CORRECT production Supabase that the frontend is actually using
const SUPABASE_URL = 'https://soihodadevudjohibmbw.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvaWhvZGFkZXZ1ZGpvaGliZGJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjQzOTMxMCwiZXhwIjoyMDUyMDE1MzEwfQ.example'; // You need to get this

console.log('🚀 Connecting to ACTUAL production Supabase:', SUPABASE_URL);

// You need to get the service key for soihodadevudjohibmbw
console.log('❌ STOPPED: We need the service key for soihodadevudjohibmbw');
console.log('');
console.log('Go to: https://supabase.com/dashboard/project/soihodadevudjohibmbw/settings/api');
console.log('Copy the "service_role" key and update this script');
console.log('');
console.log('The user should be created with email: timfulkermusic@gmail.com');
console.log('(without the extra "m")');

// Uncomment this when you have the correct service key:
/*
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function createCorrectUser() {
  try {
    console.log('Creating user: timfulkermusic@gmail.com');

    // Create auth user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: 'timfulkermusic@gmail.com',
      password: 'MusicPro2025!',
      email_confirm: true
    });

    if (authError) throw authError;
    console.log('✅ Created auth user:', authUser.user.id);

    // Create database user
    const { error: dbError } = await supabase
      .from('users')
      .insert({
        id: crypto.randomUUID(),
        email: 'timfulkermusic@gmail.com',
        supabase_uid: authUser.user.id,
        first_name: 'Tim',
        last_name: 'Fulker',
        is_admin: true,
        tier: 'premium',
        email_verified: true,
        phone_verified: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (dbError) throw dbError;
    console.log('✅ Created database user');

    console.log('');
    console.log('Login with:');
    console.log('Email: timfulkermusic@gmail.com');
    console.log('Password: MusicPro2025!');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

createCorrectUser();
*/