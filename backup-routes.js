// backup-routes.js - Backup your current routes.ts before making changes
// Run: node backup-routes.js

import fs from 'fs';
import path from 'path';

function backupRoutes() {
  console.log('💾 Backing up routes.ts file...\n');
  
  const routesPath = path.join(process.cwd(), 'server/core/routes.ts');
  
  if (!fs.existsSync(routesPath)) {
    console.error('❌ routes.ts file not found at:', routesPath);
    return;
  }
  
  // Create backup with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupPath = path.join(process.cwd(), `server/core/routes.backup.${timestamp}.ts`);
  
  try {
    fs.copyFileSync(routesPath, backupPath);
    console.log('✅ Backup created:', backupPath);
    
    // Also create a simple backup without timestamp
    const simpleBackupPath = path.join(process.cwd(), 'server/core/routes.backup.ts');
    fs.copyFileSync(routesPath, simpleBackupPath);
    console.log('✅ Simple backup created:', simpleBackupPath);
    
    // Show file sizes
    const originalSize = fs.statSync(routesPath).size;
    const backupSize = fs.statSync(backupPath).size;
    
    console.log(`\n📊 File info:`);
    console.log(`   Original: ${Math.round(originalSize/1024)}KB`);
    console.log(`   Backup: ${Math.round(backupSize/1024)}KB`);
    
    if (originalSize === backupSize) {
      console.log('✅ Backup verified - file sizes match');
    } else {
      console.log('⚠️  File sizes don\'t match - backup may be incomplete');
    }
    
    console.log('\n💡 To restore backup later:');
    console.log(`   cp "${simpleBackupPath}" "${routesPath}"`);
    
  } catch (error) {
    console.error('❌ Backup failed:', error.message);
  }
}

// Create minimal routes template
function createMinimalTemplate() {
  console.log('\n📝 Creating minimal routes template...');
  
  const minimalTemplate = `import { type Express } from "express";
import { storage } from "./storage";

// Simple authentication middleware
const isAuthenticated = async (req: any, res: any, next: any) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

export async function registerRoutes(app: Express) {
  console.log('🚀 Routes registration started');
  
  // Basic test route
  app.get('/api/test-basic', (req, res) => {
    res.json({ 
      message: 'Basic routing works', 
      timestamp: new Date().toISOString(),
      server: 'running'
    });
  });
  
  // AI status route
  app.get('/api/ai/status', (req, res) => {
    res.json({
      status: 'AI routes loaded',
      timestamp: new Date().toISOString(),
      openaiConfigured: !!process.env.OPENAI_API_KEY
    });
  });
  
  // Add your other routes here...
  
  console.log('✅ Routes registration completed');
}`;
  
  const templatePath = path.join(process.cwd(), 'server/core/routes.minimal.ts');
  
  try {
    fs.writeFileSync(templatePath, minimalTemplate);
    console.log('✅ Minimal template created:', templatePath);
    console.log('\n💡 To use minimal template:');
    console.log(`   cp "${templatePath}" "server/core/routes.ts"`);
  } catch (error) {
    console.error('❌ Failed to create template:', error.message);
  }
}

// Run backup and create template
backupRoutes();
createMinimalTemplate();

console.log('\n🎯 Next steps:');
console.log('1. Run: node routes-diagnostic.js (to identify issues)');
console.log('2. Fix issues or use minimal template');
console.log('3. Run: chmod +x quick-test.sh && ./quick-test.sh (to test)');
console.log('4. Gradually add back your routes one section at a time');