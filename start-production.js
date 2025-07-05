#!/usr/bin/env node

// Simple production starter that uses tsx to run TypeScript directly
// This bypasses the complex build process that times out during deployment

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set production environment but use Vite for serving
process.env.NODE_ENV = 'production';
process.env.USE_VITE = 'true';

// Run the server using tsx (TypeScript runtime)
const serverPath = join(__dirname, 'server', 'index.ts');

console.log('Starting MusoBuddy in production mode with TypeScript runtime...');
console.log('Server path:', serverPath);

const child = spawn('npx', ['tsx', serverPath], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production'
  }
});

child.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

child.on('exit', (code) => {
  console.log(`Server exited with code ${code}`);
  process.exit(code);
});

// Handle process termination
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  child.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  child.kill('SIGINT');
});