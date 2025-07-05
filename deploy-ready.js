#!/usr/bin/env node
// Clean deployment-ready startup script
import { spawn } from 'child_process';
import { existsSync } from 'fs';

console.log('🚀 MusoBuddy Clean Deployment');
console.log('Environment: production');

// Set environment for production with Vite compatibility
process.env.NODE_ENV = 'production';
process.env.USE_VITE = 'true';

// Check for tsx
const tsxExists = existsSync('./node_modules/.bin/tsx');
console.log('tsx available:', tsxExists);

if (!tsxExists) {
  console.error('❌ tsx not found - deployment requires tsx');
  process.exit(1);
}

// Start server with tsx directly
const server = spawn('./node_modules/.bin/tsx', ['server/index.ts'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production',
    USE_VITE: 'true'
  }
});

server.on('error', (error) => {
  console.error('❌ Server startup failed:', error.message);
  process.exit(1);
});

server.on('exit', (code) => {
  console.log(`Server exited with code ${code}`);
  process.exit(code || 0);
});

// Handle shutdown
['SIGINT', 'SIGTERM'].forEach(signal => {
  process.on(signal, () => {
    console.log(`Received ${signal}, shutting down...`);
    server.kill(signal);
  });
});

console.log('✅ Clean deployment server started');