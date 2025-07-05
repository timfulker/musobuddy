// Emergency production server that bypasses all build issues
// This file uses a simple approach to start the server with tsx

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 MusoBuddy Emergency Production Server');
console.log('Bypassing build issues by running TypeScript directly with tsx');

// Set environment to production
process.env.NODE_ENV = 'production';

// Start the server using tsx directly
const server = spawn('node', ['node_modules/.bin/tsx', 'server/index.ts'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production'
  }
});

server.on('error', (error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

server.on('exit', (code) => {
  console.log(`Server exited with code ${code}`);
  process.exit(code);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  server.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  server.kill('SIGTERM');
});

console.log('✅ Production server started successfully');