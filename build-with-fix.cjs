// Build script that includes the deployment fix
// This ensures the production server works after build

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔨 Building application with deployment fix...');

try {
  // Run the original build command
  console.log('📦 Running Vite build...');
  execSync('vite build', { stdio: 'inherit' });
  
  console.log('🔧 Running esbuild...');
  execSync('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', { stdio: 'inherit' });
  
  console.log('✅ Build completed successfully');
  
  // Now run the post-build fix
  console.log('🔧 Applying deployment fix...');
  execSync('node post-build.js', { stdio: 'inherit' });
  
  console.log('✅ Deployment fix applied successfully');
  console.log('🚀 Ready for deployment!');
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}