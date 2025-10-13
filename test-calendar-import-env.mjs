// Test script to verify calendar import environment detection
import { config } from 'dotenv';
config();

console.log('🔍 Testing Calendar Import Environment Detection:\n');
console.log('Current NODE_ENV:', process.env.NODE_ENV);

// Test the logic used in calendar import
const isDevelopment = process.env.NODE_ENV !== 'production';
const supabaseUrl = process.env.NODE_ENV === 'production'
  ? process.env.SUPABASE_URL_PROD
  : process.env.SUPABASE_URL_DEV;

const supabaseKey = process.env.NODE_ENV === 'production'
  ? process.env.SUPABASE_SERVICE_KEY_PROD
  : process.env.SUPABASE_SERVICE_KEY_DEV;

console.log('\n📊 Results:');
console.log('- isDevelopment:', isDevelopment);
console.log('- Selected URL:', supabaseUrl?.substring(0, 40) + '...');
console.log('- Has Key:', !!supabaseKey);

// Extract project ID from URL
const projectId = supabaseUrl?.split('.')[0].split('//')[1];
console.log('- Project ID:', projectId);

const expectedProd = 'dknmckqaraedpimxdsqq';
const expectedDev = 'soihodadevudjohibmbw';

console.log('\n✅ Validation:');
if (process.env.NODE_ENV === 'production') {
  console.log('In PRODUCTION mode:');
  console.log('- Should use:', expectedProd);
  console.log('- Actually using:', projectId);
  console.log('- Correct?', projectId === expectedProd ? '✅ YES' : '❌ NO');
} else {
  console.log('In DEVELOPMENT mode:');
  console.log('- Should use:', expectedDev);
  console.log('- Actually using:', projectId);
  console.log('- Correct?', projectId === expectedDev ? '✅ YES' : '❌ NO');
}