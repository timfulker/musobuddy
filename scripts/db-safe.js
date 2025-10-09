#!/usr/bin/env node

/**
 * Safe database operations for MusoBuddy
 * Prevents accidental production database operations
 */

import { execSync } from 'child_process';

const args = process.argv.slice(2);
const operation = args[0];

// Production safety guard
const isProduction = process.env.NODE_ENV === 'production';
const allowProdOps = process.env.ALLOW_PROD_DB_OPERATIONS === 'true';

if (isProduction && !allowProdOps) {
  console.error('🚨 PRODUCTION DATABASE OPERATIONS BLOCKED');
  console.error('🔒 Set ALLOW_PROD_DB_OPERATIONS=true to enable production database operations');
  console.error('⚠️  This prevents accidental data loss on live systems');
  process.exit(1);
}

console.log(`🔧 Database operation: ${operation}`);
console.log(`🌍 Environment: ${process.env.NODE_ENV || 'unknown'}`);

if (isProduction) {
  console.log('⚠️  PRODUCTION DATABASE OPERATION - Proceed with extreme caution');
}

switch (operation) {
  case 'push':
    console.log('📤 Pushing schema changes to database...');
    execSync('drizzle-kit push', { stdio: 'inherit' });
    console.log('✅ Schema push completed');
    break;
    
  case 'migrate':
    console.log('🔄 Running database migrations...');
    execSync('drizzle-kit migrate', { stdio: 'inherit' });
    console.log('✅ Migrations completed');
    break;
    
  case 'studio':
    console.log('🎨 Opening Drizzle Studio...');
    execSync('drizzle-kit studio', { stdio: 'inherit' });
    break;
    
  default:
    console.log('📋 Safe Database Operations CLI');
    console.log('');
    console.log('Usage: node scripts/db-safe.js [operation]');
    console.log('');
    console.log('Available operations:');
    console.log('  push      Push schema changes to database');
    console.log('  migrate   Run database migrations');
    console.log('  studio    Open Drizzle Studio');
    console.log('');
    console.log('Development examples:');
    console.log('  node scripts/db-safe.js push');
    console.log('');
    console.log('Production examples (requires explicit permission):');
    console.log('  ALLOW_PROD_DB_OPERATIONS=true node scripts/db-safe.js push');
    console.log('');
    console.log('🛡️  Production operations are blocked by default to prevent data loss');
    process.exit(1);
}