#!/usr/bin/env node
// Direct production startup - bypasses all build complexity
import { execSync } from 'child_process';

console.log('🚀 MusoBuddy Production Direct Start');
console.log('Environment: production');

// Set environment variables for production
process.env.NODE_ENV = 'production';
process.env.USE_VITE = 'true';

try {
  // Run the server directly with tsx
  execSync('npx tsx server/index.ts', { 
    stdio: 'inherit',
    env: { 
      ...process.env, 
      NODE_ENV: 'production',
      USE_VITE: 'true'
    }
  });
} catch (error) {
  console.error('❌ Failed to start production server:', error.message);
  process.exit(1);
}