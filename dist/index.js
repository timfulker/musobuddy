#!/usr/bin/env node
// MusoBuddy Production Server - Clean & Simple
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

console.log('🚀 MusoBuddy Production Server');
console.log('Environment: production');

// Set production environment with Vite compatibility
process.env.NODE_ENV = 'production';
process.env.USE_VITE = 'true';

// Change to root directory
process.chdir(rootDir);

// Check for tsx
const tsxPath = path.join(rootDir, 'node_modules', '.bin', 'tsx');
console.log('tsx path:', tsxPath);
console.log('tsx exists:', existsSync(tsxPath));

if (!existsSync(tsxPath)) {
  console.error('❌ tsx not found - production requires tsx');
  process.exit(1);
}

console.log('Starting production server with tsx...');

// Start server with tsx directly - same as development
const server = spawn('node', [tsxPath, 'server/index.ts'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production',
    USE_VITE: 'true'
  },
  cwd: rootDir
});

server.on('error', (error) => {
  console.error('❌ Production server startup failed:', error.message);
  process.exit(1);
});

server.on('exit', (code) => {
  if (code && code !== 0) {
    console.error(`❌ Production server exited with code ${code}`);
  }
  process.exit(code || 0);
});

// Handle shutdown gracefully
['SIGINT', 'SIGTERM'].forEach(signal => {
  process.on(signal, () => {
    console.log(`Received ${signal}, shutting down gracefully...`);
    server.kill(signal);
  });
});

console.log('✅ Production server startup initiated');