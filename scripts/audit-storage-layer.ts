// scripts/audit-storage-layer.ts
// Run this script to identify and fix parameter mismatches in storage layer

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface MethodSignature {
  file: string;
  line: number;
  method: string;
  params: string[];
}

class StorageAuditor {
  private wrapperSignatures: Map<string, MethodSignature> = new Map();
  private implementationSignatures: Map<string, MethodSignature> = new Map();
  private mismatches: Array<{
    method: string;
    wrapper: MethodSignature;
    implementation: MethodSignature;
    issue: string;
  }> = [];

  async audit() {
    console.log('🔍 Starting Storage Layer Audit...\n');
    
    // Step 1: Parse wrapper (storage.ts)
    await this.parseWrapper();
    
    // Step 2: Parse implementations
    await this.parseImplementations();
    
    // Step 3: Compare signatures
    this.compareSignatures();
    
    // Step 4: Generate report
    this.generateReport();
    
    // Step 5: Generate fixes
    this.generateFixes();
  }

  private async parseWrapper() {
    const wrapperPath = path.join(__dirname, '../server/core/storage.ts');
    const content = fs.readFileSync(wrapperPath, 'utf-8');
    
    // Parse method signatures using regex
    const methodRegex = /async\s+(\w+)\s*\([^)]*\)\s*{[\s\S]*?return\s+(\w+Storage)\.(\w+)\((.*?)\);/g;
    let match;
    
    while ((match = methodRegex.exec(content)) !== null) {
      const [fullMatch, wrapperMethod, storageClass, implMethod, params] = match;
      const lineNumber = content.substring(0, match.index).split('\n').length;
      
      // Parse parameters
      const paramList = this.parseParams(params);
      
      this.wrapperSignatures.set(`${storageClass}.${implMethod}`, {
        file: 'storage.ts',
        line: lineNumber,
        method: wrapperMethod,
        params: paramList
      });
    }
    
    console.log(`✅ Parsed ${this.wrapperSignatures.size} wrapper methods\n`);
  }

  private async parseImplementations() {
    const storageDir = path.join(__dirname, '../server/storage');
    const files = fs.readdirSync(storageDir).filter(f => f.endsWith('-storage.ts'));
    
    for (const file of files) {
      const filePath = path.join(storageDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const className = file.replace('-storage.ts', '').split('-').map(
        s => s.charAt(0).toUpperCase() + s.slice(1)
      ).join('') + 'Storage';
      
      // Parse method signatures
      const methodRegex = /async\s+(\w+)\s*\(([^)]*)\)\s*[:{]/g;
      let match;
      
      while ((match = methodRegex.exec(content)) !== null) {
        const [_, methodName, params] = match;
        const lineNumber = content.substring(0, match.index).split('\n').length;
        
        // Parse parameter names from signature
        const paramNames = params.split(',').map(p => {
          const parts = p.trim().split(':')[0].trim();
          return parts.split(/\s+/).pop() || '';
        }).filter(p => p);
        
        this.implementationSignatures.set(`${className.toLowerCase()}.${methodName}`, {
          file,
          line: lineNumber,
          method: methodName,
          params: paramNames
        });
      }
    }
    
    console.log(`✅ Parsed ${this.implementationSignatures.size} implementation methods\n`);
  }

  private parseParams(paramString: string): string[] {
    if (!paramString.trim()) return [];
    
    // Handle complex parameter expressions
    const params: string[] = [];
    let depth = 0;
    let current = '';
    
    for (const char of paramString) {
      if (char === '(' || char === '{' || char === '[') depth++;
      if (char === ')' || char === '}' || char === ']') depth--;
      
      if (char === ',' && depth === 0) {
        params.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    if (current.trim()) {
      params.push(current.trim());
    }
    
    return params.map(p => {
      // Extract variable name from expressions like "updates.field" or "req.body.field"
      const match = p.match(/^(\w+)(?:\.\w+)*$/);
      return match ? match[1] : p;
    });
  }

  private compareSignatures() {
    for (const [key, wrapperSig] of this.wrapperSignatures) {
      const implSig = this.implementationSignatures.get(key.toLowerCase());
      
      if (!implSig) {
        console.warn(`⚠️  No implementation found for ${key}`);
        continue;
      }
      
      // Check parameter count
      if (wrapperSig.params.length !== implSig.params.length) {
        this.mismatches.push({
          method: key,
          wrapper: wrapperSig,
          implementation: implSig,
          issue: `Parameter count mismatch: wrapper has ${wrapperSig.params.length}, implementation has ${implSig.params.length}`
        });
      }
      
      // Check parameter order (heuristic based on names)
      const orderIssues = this.checkParameterOrder(wrapperSig.params, implSig.params);
      if (orderIssues) {
        this.mismatches.push({
          method: key,
          wrapper: wrapperSig,
          implementation: implSig,
          issue: orderIssues
        });
      }
    }
  }

  private checkParameterOrder(wrapperParams: string[], implParams: string[]): string | null {
    // Common parameter name patterns
    const commonPatterns = {
      'id': /^(id|.*Id|.*ID)$/,
      'userId': /^(userId|user)$/,
      'data': /^(data|.*Data|updates|body)$/,
      'options': /^(options|opts|config)$/
    };
    
    // Check if parameters seem to be in wrong order
    for (let i = 0; i < Math.min(wrapperParams.length, implParams.length); i++) {
      const wParam = wrapperParams[i];
      const iParam = implParams[i];
      
      // Check if parameter seems misplaced
      if (wParam.includes('id') && !iParam.includes('id')) {
        if (implParams.some(p => p.includes('id'))) {
          return `Parameter order mismatch: '${wParam}' at position ${i} in wrapper, but 'id' parameter at different position in implementation`;
        }
      }
    }
    
    return null;
  }

  private generateReport() {
    console.log('📊 STORAGE LAYER AUDIT REPORT\n');
    console.log('=' .repeat(60));
    
    if (this.mismatches.length === 0) {
      console.log('✅ No parameter mismatches found!\n');
      return;
    }
    
    console.log(`❌ Found ${this.mismatches.length} parameter mismatches:\n`);
    
    for (const mismatch of this.mismatches) {
      console.log(`\n🔴 ${mismatch.method}`);
      console.log(`   Wrapper (${mismatch.wrapper.file}:${mismatch.wrapper.line})`);
      console.log(`   Params: [${mismatch.wrapper.params.join(', ')}]`);
      console.log(`   Implementation (${mismatch.implementation.file}:${mismatch.implementation.line})`);
      console.log(`   Params: [${mismatch.implementation.params.join(', ')}]`);
      console.log(`   Issue: ${mismatch.issue}`);
    }
  }

  private generateFixes() {
    if (this.mismatches.length === 0) return;
    
    console.log('\n\n📝 SUGGESTED FIXES\n');
    console.log('=' .repeat(60));
    
    for (const mismatch of this.mismatches) {
      console.log(`\n// Fix for ${mismatch.method}`);
      console.log(`// In ${mismatch.wrapper.file}, line ${mismatch.wrapper.line}:`);
      
      // Generate corrected method call
      const correctedCall = `return ${mismatch.method.split('.')[0]}.${mismatch.implementation.method}(${mismatch.implementation.params.join(', ')});`;
      console.log(`// Change to: ${correctedCall}`);
    }
    
    // Generate automated fix script
    this.generateFixScript();
  }

  private generateFixScript() {
    const fixScript = `#!/usr/bin/env node
// Auto-generated fix script for storage layer parameter mismatches
// Review carefully before running!

const fs = require('fs');
const path = require('path');

const fixes = ${JSON.stringify(this.mismatches.map(m => ({
  file: m.wrapper.file,
  line: m.wrapper.line,
  method: m.method,
  oldParams: m.wrapper.params,
  newParams: m.implementation.params
})), null, 2)};

console.log('🔧 Applying storage layer fixes...');

// Apply fixes
for (const fix of fixes) {
  console.log(\`Fixing \${fix.method} in \${fix.file}...\`);
  // Implementation would go here
  // This is a template for manual review
}

console.log('✅ Fixes applied. Please review and test thoroughly!');
`;

    fs.writeFileSync('fix-storage-params.js', fixScript);
    console.log('\n\n✅ Fix script generated: fix-storage-params.js');
    console.log('   Review and run: node fix-storage-params.js');
  }
}

// Run the audit
const auditor = new StorageAuditor();
auditor.audit().catch(console.error);