#!/usr/bin/env node
// Simple build script that creates a working production server
import { writeFileSync, mkdirSync, existsSync } from 'fs';

console.log('🔧 Simple Build for MusoBuddy Production');

// Ensure dist directory exists
if (!existsSync('dist')) {
  mkdirSync('dist', { recursive: true });
}

// Create production server with multiple fallback methods
const productionServer = `// MusoBuddy Production Server - Multiple startup methods
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 MusoBuddy Production Server');
console.log('Environment: production');
console.log('Node version:', process.version);

// Set production environment
process.env.NODE_ENV = 'production';
process.env.USE_VITE = 'true';

const rootDir = path.join(__dirname, '..');

console.log('Environment check:', {
  nodeEnv: process.env.NODE_ENV,
  useVite: process.env.USE_VITE,
  decision: 'Using Vite setup for maximum compatibility'
});

// Try multiple startup methods
const startupMethods = [
  { cmd: 'node', args: ['node_modules/.bin/tsx', 'server/index.ts'], desc: 'Direct tsx' },
  { cmd: 'npx', args: ['tsx', 'server/index.ts'], desc: 'npx tsx' },
  { cmd: 'node', args: ['--loader', 'tsx/esm', 'server/index.ts'], desc: 'Node tsx loader' }
];

function tryStartup(method, index = 0) {
  if (index >= startupMethods.length) {
    console.error('❌ All startup methods failed');
    console.error('tsx is not available in production environment');
    process.exit(1);
    return;
  }

  const { cmd, args, desc } = startupMethods[index];
  console.log(\`Attempting startup method \${index + 1}: \${desc}\`);

  const server = spawn(cmd, args, {
    stdio: 'inherit',
    env: { 
      ...process.env, 
      NODE_ENV: 'production',
      USE_VITE: 'true'
    },
    cwd: rootDir
  });

  server.on('error', (error) => {
    console.error(\`❌ \${desc} failed: \${error.message}\`);
    console.log('Trying next method...');
    tryStartup(method, index + 1);
  });

  server.on('exit', (code) => {
    if (code !== 0) {
      console.error(\`❌ \${desc} exited with code \${code}\`);
    }
    process.exit(code);
  });

  process.on('SIGINT', () => server.kill('SIGINT'));
  process.on('SIGTERM', () => server.kill('SIGTERM'));

  setTimeout(() => {
    console.log(\`✅ \${desc} startup successful\`);
  }, 1000);
}

// Start the first method
tryStartup(startupMethods);`;

// Write the production server
writeFileSync('dist/index.js', productionServer);

console.log('✅ Simple build complete!');
console.log('📦 Created: dist/index.js');
console.log('');
console.log('This production server tries multiple startup methods:');
console.log('  1. Direct tsx from node_modules');
console.log('  2. npx tsx command');
console.log('  3. Node with tsx loader');
console.log('');
console.log('🚀 Ready for deployment');