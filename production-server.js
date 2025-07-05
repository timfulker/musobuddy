// MusoBuddy Production Server - Direct TypeScript Import
import { register } from 'tsx/esm';
import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 MusoBuddy Production Server Starting...');
console.log('Environment: production');

// Register tsx to handle TypeScript imports
register();

// Set production environment
process.env.NODE_ENV = 'production';
process.env.USE_VITE = 'true';

console.log('Environment check:', {
  nodeEnv: process.env.NODE_ENV,
  useVite: process.env.USE_VITE,
  decision: 'Using Vite setup for maximum compatibility'
});

// Import and run the TypeScript server directly
const serverPath = path.join(__dirname, 'server', 'index.ts');
const serverUrl = pathToFileURL(serverPath).href;

console.log('Loading server from:', serverPath);

try {
  // Dynamically import the TypeScript server
  await import(serverUrl);
  console.log('✅ Production server loaded successfully');
} catch (error) {
  console.error('❌ Failed to load production server:', error);
  process.exit(1);
}