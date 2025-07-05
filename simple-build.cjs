// Simple build replacement that skips the complex Vite build
// This creates the dist/index.js that deployment needs

const fs = require('fs');
const path = require('path');

console.log('🔧 Creating simple deployment build...');

// Ensure dist directory exists
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist', { recursive: true });
}

// Create the production server content
const productionServer = `// Production server for MusoBuddy deployment
// Uses tsx to run TypeScript directly, bypassing build complexity

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('MusoBuddy Production Server');
console.log('Environment:', process.env.NODE_ENV || 'production');

process.env.NODE_ENV = 'production';

const server = spawn('node', ['node_modules/.bin/tsx', 'server/index.ts'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' },
  cwd: path.join(__dirname, '..')
});

server.on('error', (error) => {
  console.error('Server start failed:', error);
  process.exit(1);
});

server.on('exit', (code) => process.exit(code));

process.on('SIGINT', () => server.kill('SIGINT'));
process.on('SIGTERM', () => server.kill('SIGTERM'));
`;

// Write the production server
fs.writeFileSync(path.join('dist', 'index.js'), productionServer);

console.log('✅ Simple build complete');
console.log('✅ dist/index.js created for deployment');
console.log('✅ Ready for deployment');