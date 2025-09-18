/**
 * Debug Authentication Environment Configuration
 * Check what Supabase instances are being used
 */

import dotenv from 'dotenv';
dotenv.config();

console.log('🔍 DEBUGGING AUTHENTICATION ENVIRONMENT');
console.log('='.repeat(50));

// Check NODE_ENV
console.log('📍 Environment Variables:');
console.log('   NODE_ENV:', process.env.NODE_ENV || 'undefined');
console.log('   npm_lifecycle_event:', process.env.npm_lifecycle_event || 'undefined');

console.log('\n📊 Backend Configuration:');
console.log('   Development URL:', process.env.SUPABASE_URL_DEV?.substring(0, 30) + '...');
console.log('   Production URL:', process.env.SUPABASE_URL_PROD?.substring(0, 30) + '...');

// Show which one would be selected
const selectedUrl = process.env.NODE_ENV === 'production'
  ? process.env.SUPABASE_URL_PROD
  : process.env.SUPABASE_URL_DEV;

console.log('\n🎯 Backend would use:');
console.log('   Selected URL:', selectedUrl?.substring(0, 30) + '...');
console.log('   Is Production?:', process.env.NODE_ENV === 'production');

console.log('\n📱 Frontend Configuration (from .env):');
console.log('   VITE_SUPABASE_URL_DEV:', process.env.VITE_SUPABASE_URL_DEV?.substring(0, 30) + '...');
console.log('   VITE_SUPABASE_URL_PRODUCTION:', process.env.VITE_SUPABASE_URL_PRODUCTION?.substring(0, 30) + '...');

console.log('\n🔍 Instance Analysis:');
if (process.env.SUPABASE_URL_DEV) {
  const devInstance = process.env.SUPABASE_URL_DEV.split('.')[0].split('//')[1];
  console.log('   DEV Instance:', devInstance);
}
if (process.env.SUPABASE_URL_PROD) {
  const prodInstance = process.env.SUPABASE_URL_PROD.split('.')[0].split('//')[1];
  console.log('   PROD Instance:', prodInstance);
}
if (process.env.VITE_SUPABASE_URL_DEV) {
  const frontendDevInstance = process.env.VITE_SUPABASE_URL_DEV.split('.')[0].split('//')[1];
  console.log('   Frontend DEV Instance:', frontendDevInstance);
}
if (process.env.VITE_SUPABASE_URL_PRODUCTION) {
  const frontendProdInstance = process.env.VITE_SUPABASE_URL_PRODUCTION.split('.')[0].split('//')[1];
  console.log('   Frontend PROD Instance:', frontendProdInstance);
}

console.log('\n🚨 Potential Issues:');
const backendUrl = process.env.NODE_ENV === 'production' ? process.env.SUPABASE_URL_PROD : process.env.SUPABASE_URL_DEV;
const frontendUrl = process.env.VITE_SUPABASE_URL_PRODUCTION; // Assuming production build

if (backendUrl && frontendUrl && backendUrl !== frontendUrl) {
  console.log('   ❌ MISMATCH: Backend and Frontend using different Supabase instances!');
  console.log('   Backend:', backendUrl.split('.')[0].split('//')[1]);
  console.log('   Frontend:', frontendUrl.split('.')[0].split('//')[1]);
} else {
  console.log('   ✅ Backend and Frontend configurations look aligned');
}

// Check if we're using development credentials in production
if (process.env.NODE_ENV === 'production') {
  const prodInstance = process.env.SUPABASE_URL_PROD?.includes('soihodadevudjohibmbw');
  const frontendProdInstance = process.env.VITE_SUPABASE_URL_PRODUCTION?.includes('soihodadevudjohibmbw');

  if (prodInstance || frontendProdInstance) {
    console.log('   ⚠️  WARNING: Using development instance (soihodadevudjohibmbw) in production!');
  }
}