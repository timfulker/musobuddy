// Post-build script to restore the correct production server
// This runs after the build process and ensures deployment works

const fs = require('fs');
const path = require('path');

console.log('🔧 Post-build: Restoring production server configuration...');

// The correct production server content that bypasses build issues
const productionServerContent = `// Production server that ensures deployment works
// This file is restored after build to fix deployment issues

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 MusoBuddy Production Server Starting...');
console.log('Environment:', process.env.NODE_ENV || 'production');
console.log('Using tsx runtime for TypeScript compatibility');

// Ensure production environment
process.env.NODE_ENV = 'production';

// Start the server using tsx
const server = spawn('node', ['node_modules/.bin/tsx', 'server/index.ts'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production'
  }
});

server.on('error', (error) => {
  console.error('❌ Failed to start server:', error);
  console.error('Error details:', error.message);
  process.exit(1);
});

server.on('exit', (code) => {
  console.log(\`Server exited with code \${code}\`);
  process.exit(code);
});

// Graceful shutdown handlers
process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  server.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  server.kill('SIGTERM');
});

console.log('✅ Production server launcher ready');
`;

// Write the production server to dist/index.js
const distPath = path.join(__dirname, 'dist', 'index.js');
fs.writeFileSync(distPath, productionServerContent);

console.log('✅ Production server configuration restored to dist/index.js');
console.log('✅ Deployment is ready - server will use tsx runtime');