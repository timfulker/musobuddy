// routes-diagnostic.js - Check for common routing issues
// Run: node routes-diagnostic.js

import fs from 'fs';
import path from 'path';

function analyzeRoutesFile() {
  console.log('🔍 Analyzing routes.ts file for common issues...\n');
  
  try {
    const routesPath = path.join(process.cwd(), 'server/core/routes.ts');
    
    if (!fs.existsSync(routesPath)) {
      console.error('❌ routes.ts file not found at:', routesPath);
      return;
    }
    
    const content = fs.readFileSync(routesPath, 'utf8');
    
    console.log('✅ routes.ts file found, analyzing...\n');
    
    // Check for common syntax issues
    const issues = [];
    
    // Check for missing imports
    if (!content.includes('import { type Express }')) {
      issues.push('Missing Express import');
    }
    
    // Check for registerRoutes function
    if (!content.includes('export async function registerRoutes')) {
      issues.push('Missing registerRoutes export function');
    }
    
    // Check for duplicate route definitions
    const aiRoutes = content.match(/app\.(get|post|put|patch|delete)\(['"][^'"]*\/api\/ai/g);
    if (aiRoutes && aiRoutes.length > 0) {
      console.log(`📊 Found ${aiRoutes.length} AI-related routes`);
    }
    
    // Check for unclosed braces/parentheses
    const openBraces = (content.match(/\{/g) || []).length;
    const closeBraces = (content.match(/\}/g) || []).length;
    const openParens = (content.match(/\(/g) || []).length;
    const closeParens = (content.match(/\)/g) || []).length;
    
    if (openBraces !== closeBraces) {
      issues.push(`Mismatched braces: ${openBraces} open, ${closeBraces} close`);
    }
    
    if (openParens !== closeParens) {
      issues.push(`Mismatched parentheses: ${openParens} open, ${closeParens} close`);
    }
    
    // Check for async/await issues
    const asyncFunctions = content.match(/async \(/g) || [];
    console.log(`📊 Found ${asyncFunctions.length} async functions`);
    
    // Check for missing error handlers
    if (!content.includes('app.use((err:')) {
      issues.push('Missing global error handler');
    }
    
    // Check for duplicate exports
    const exportMatches = content.match(/export async function registerRoutes/g) || [];
    if (exportMatches.length > 1) {
      issues.push('Duplicate registerRoutes exports found');
    }
    
    // Check for missing semicolons in critical places
    const lines = content.split('\n');
    const suspiciousLines = lines.filter(line => 
      line.trim().includes('app.') && 
      !line.trim().endsWith(';') && 
      !line.trim().endsWith('{') &&
      !line.trim().endsWith('}')
    );
    
    if (suspiciousLines.length > 0) {
      console.log('⚠️ Lines that might be missing semicolons:');
      suspiciousLines.slice(0, 5).forEach(line => {
        console.log(`   ${line.trim()}`);
      });
    }
    
    // Report findings
    if (issues.length === 0) {
      console.log('✅ No obvious syntax issues found in routes.ts');
    } else {
      console.log('❌ Issues found:');
      issues.forEach(issue => console.log(`   - ${issue}`));
    }
    
    // Check file size
    const fileSizeKB = Math.round(content.length / 1024);
    console.log(`📊 File size: ${fileSizeKB}KB (${content.split('\n').length} lines)`);
    
    // Check for specific AI route patterns
    const aiGenerateRoute = content.includes('/api/ai/generate-response');
    const aiDiagnosticRoute = content.includes('/api/ai/diagnostic');
    const aiTestRoute = content.includes('/api/ai/test');
    
    console.log('\n🤖 AI Routes Status:');
    console.log(`   Generate Response: ${aiGenerateRoute ? '✅' : '❌'}`);
    console.log(`   Diagnostic: ${aiDiagnosticRoute ? '✅' : '❌'}`);
    console.log(`   Test: ${aiTestRoute ? '✅' : '❌'}`);
    
    return { issues, aiRoutes: { aiGenerateRoute, aiDiagnosticRoute, aiTestRoute } };
    
  } catch (error) {
    console.error('❌ Error analyzing routes file:', error.message);
    return null;
  }
}

// Check TypeScript compilation
function checkTypeScriptIssues() {
  console.log('\n🔧 TypeScript Suggestions:');
  console.log('1. Run `npx tsc --noEmit` to check for TypeScript errors');
  console.log('2. Check your IDE/LSP for red squiggly lines');
  console.log('3. Look for import/export issues');
  console.log('4. Verify all async functions have proper error handling');
}

function generateMinimalRoutes() {
  console.log('\n🛠️ Minimal routes template to test with:');
  
  const minimalRoutes = `
import { type Express } from "express";

export async function registerRoutes(app: Express) {
  console.log('✅ Routes registration started');
  
  // Test endpoint
  app.get('/api/test', (req, res) => {
    res.json({ message: 'Routes working', timestamp: new Date().toISOString() });
  });
  
  // AI test endpoint - minimal version
  app.post('/api/ai/test', (req: any, res) => {
    try {
      res.json({ 
        success: true, 
        message: 'AI test endpoint reached',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  console.log('✅ Routes registration completed');
}`;
  
  console.log(minimalRoutes);
  console.log('\n💡 Save this as routes-minimal.ts to test basic routing first');
}

// Run the analysis
const results = analyzeRoutesFile();
checkTypeScriptIssues();

if (results && results.issues.length > 0) {
  generateMinimalRoutes();
}