#!/usr/bin/env node

/**
 * Safe database operations CLI
 * Prevents accidental prod database operations
 */

import { execSync } from 'child_process';

const args = process.argv.slice(2);
const operation = args[0];
const env = args[1] || process.env.NODE_ENV || 'development';

// Production safety guard
if (env === 'production' && !process.env.ALLOW_PROD_DB_OPERATIONS) {
  console.error('🚨 PRODUCTION DATABASE OPERATIONS BLOCKED');
  console.error('Set ALLOW_PROD_DB_OPERATIONS=true to enable prod operations');
  process.exit(1);
}

console.log(`🔧 Running ${operation} on ${env.toUpperCase()} database`);

switch (operation) {
  case 'push:dev':
    execSync('NODE_ENV=development drizzle-kit push', { stdio: 'inherit' });
    break;
    
  case 'push:prod':
    if (!process.env.ALLOW_PROD_DB_OPERATIONS) {
      console.error('🚨 Production operations require ALLOW_PROD_DB_OPERATIONS=true');
      process.exit(1);
    }
    console.log('⚠️ PRODUCTION DATABASE OPERATION - Proceed with caution');
    execSync('NODE_ENV=production drizzle-kit push', { stdio: 'inherit' });
    break;
    
  case 'migrate:dev':
    execSync('NODE_ENV=development drizzle-kit migrate', { stdio: 'inherit' });
    break;
    
  case 'migrate:prod':
    if (!process.env.ALLOW_PROD_DB_OPERATIONS) {
      console.error('🚨 Production operations require ALLOW_PROD_DB_OPERATIONS=true');
      process.exit(1);
    }
    console.log('⚠️ PRODUCTION DATABASE OPERATION - Proceed with caution');
    execSync('NODE_ENV=production drizzle-kit migrate', { stdio: 'inherit' });
    break;
    
  default:
    console.log('Usage: node scripts/db-operations.js [push:dev|push:prod|migrate:dev|migrate:prod]');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/db-operations.js push:dev    # Safe dev push');
    console.log('  ALLOW_PROD_DB_OPERATIONS=true node scripts/db-operations.js push:prod');
    process.exit(1);
}