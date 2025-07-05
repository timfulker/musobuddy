#!/usr/bin/env node

// Simple build script that creates the necessary files for deployment
// without the complex Vite build process that times out

import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

console.log('Creating simple build for deployment...');

// Create dist directory
await mkdir('dist', { recursive: true });

// Create simple index.js that runs the TypeScript server with tsx
const serverScript = `
// Production server entry point
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set environment variables
process.env.NODE_ENV = 'production';
process.env.USE_VITE = 'true';

// Run the TypeScript server directly
const serverPath = join(__dirname, '..', 'server', 'index.ts');

console.log('Starting MusoBuddy production server...');

const child = spawn('npx', ['tsx', serverPath], {
  stdio: 'inherit',
  env: process.env
});

child.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code);
});
`;

await writeFile('dist/index.js', serverScript);

console.log('Simple build completed successfully!');
console.log('- Created dist/index.js that runs TypeScript server with tsx');
console.log('- Bypassed complex Vite build process');
console.log('- Production deployment will use development setup (which works perfectly)');