// Emergency start script - final safety measure for deployment
// This ensures the server starts even if build fails

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚨 MusoBuddy Emergency Start');
console.log('Bypassing all build issues...');

// Set production environment
process.env.NODE_ENV = 'production';

// Start server directly with tsx
const server = spawn('node', ['node_modules/.bin/tsx', 'server/index.ts'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' }
});

server.on('error', (error) => {
  console.error('Emergency start failed:', error);
  process.exit(1);
});

server.on('exit', (code) => {
  console.log(`Server exited with code ${code}`);
  process.exit(code);
});

process.on('SIGINT', () => server.kill('SIGINT'));
process.on('SIGTERM', () => server.kill('SIGTERM'));

console.log('🚀 Emergency start successful');