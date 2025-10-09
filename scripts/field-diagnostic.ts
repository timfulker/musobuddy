#!/usr/bin/env ts-node
/**
 * Field Mapping Diagnostic Tool
 * 
 * Run this to check:
 * 1. Current database schema field names
 * 2. TypeScript type definitions
 * 3. Component field usage
 * 4. Identify exact LSP errors
 * 
 * Usage: npx ts-node scripts/field-diagnostic.ts
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

interface DiagnosticResult {
  schemaFields: { bookings: string[]; contracts: string[] };
  componentErrors: Array<{ file: string; line: number; error: string }>;
  typeDefinitions: Record<string, string[]>;
  recommendations: string[];
}

class FieldDiagnostic {
  private result: DiagnosticResult = {
    schemaFields: { bookings: [], contracts: [] },
    componentErrors: [],
    typeDefinitions: {},
    recommendations: []
  };

  async runDiagnostic(): Promise<DiagnosticResult> {
    console.log('🔍 Running Field Mapping Diagnostic...\n');

    this.checkSchemaFields();
    this.checkTypeDefinitions();
    this.checkComponentUsage();
    this.checkTSCErrors();
    this.generateRecommendations();

    return this.result;
  }

  private checkSchemaFields() {
    console.log('📋 Checking schema field definitions...');
    
    try {
      const schemaPath = path.join(process.cwd(), 'shared/schema.ts');
      if (!existsSync(schemaPath)) {
        console.log('❌ Schema file not found at shared/schema.ts');
        return;
      }

      const schemaContent = readFileSync(schemaPath, 'utf8');
      
      // Extract bookings table fields
      const bookingsMatch = schemaContent.match(/export const bookings = pgTable\("bookings", \{([^}]+)\}/s);
      if (bookingsMatch) {
        const bookingsFields = this.extractFields(bookingsMatch[1]);
        this.result.schemaFields.bookings = bookingsFields;
        console.log('✅ Bookings fields:', bookingsFields.filter(f => f.includes('Time')));
      }

      // Extract contracts table fields  
      const contractsMatch = schemaContent.match(/export const contracts = pgTable\("contracts", \{([^}]+)\}/s);
      if (contractsMatch) {
        const contractsFields = this.extractFields(contractsMatch[1]);
        this.result.schemaFields.contracts = contractsFields;
        console.log('✅ Contracts fields:', contractsFields.filter(f => f.includes('Time')));
      }

    } catch (error) {
      console.log('❌ Error reading schema:', error);
    }
  }

  private extractFields(tableDefinition: string): string[] {
    const fieldPattern = /(\w+):\s*(varchar|text|timestamp|integer|decimal|boolean)/g;
    const fields: string[] = [];
    let match;
    
    while ((match = fieldPattern.exec(tableDefinition)) !== null) {
      fields.push(match[1]);
    }
    
    return fields;
  }

  private checkTypeDefinitions() {
    console.log('\n📝 Checking TypeScript type definitions...');
    
    try {
      const schemaPath = path.join(process.cwd(), 'shared/schema.ts');
      const schemaContent = readFileSync(schemaPath, 'utf8');
      
      // Check for FormattedBooking interface
      const formattedBookingMatch = schemaContent.match(/interface FormattedBooking[^}]+\}/s);
      if (formattedBookingMatch) {
        const timeFields = this.extractInterfaceFields(formattedBookingMatch[0])
          .filter(f => f.includes('Time'));
        this.result.typeDefinitions.FormattedBooking = timeFields;
        console.log('✅ FormattedBooking time fields:', timeFields);
      }

      // Check for Booking type
      const bookingTypeMatch = schemaContent.match(/type Booking = typeof bookings\.\$inferSelect/);
      if (bookingTypeMatch) {
        console.log('✅ Booking type found (inferred from schema)');
      }

    } catch (error) {
      console.log('❌ Error checking type definitions:', error);
    }
  }

  private extractInterfaceFields(interfaceDefinition: string): string[] {
    const fieldPattern = /(\w+)[\?\:]?\s*:/g;
    const fields: string[] = [];
    let match;
    
    while ((match = fieldPattern.exec(interfaceDefinition)) !== null) {
      fields.push(match[1]);
    }
    
    return fields;
  }

  private checkComponentUsage() {
    console.log('\n🔧 Checking component field usage...');
    
    const componentFiles = [
      'client/src/pages/contracts.tsx',
      'client/src/components/BookingDetailsDialog.tsx',
      'client/src/pages/bookings.tsx',
      'client/src/components/kanban-board.tsx'
    ];

    componentFiles.forEach(filePath => {
      try {
        if (!existsSync(filePath)) {
          console.log(`⚠️  ${filePath} not found`);
          return;
        }

        const content = readFileSync(filePath, 'utf8');
        
        // Check for eventTime/eventEndTime usage
        const eventTimeUsage = content.match(/\.eventTime|eventTime[^\w]/g) || [];
        const eventEndTimeUsage = content.match(/\.eventEndTime|eventEndTime[^\w]/g) || [];
        
        if (eventTimeUsage.length > 0 || eventEndTimeUsage.length > 0) {
          console.log(`📍 ${path.basename(filePath)}:`);
          console.log(`   eventTime: ${eventTimeUsage.length} references`);
          console.log(`   eventEndTime: ${eventEndTimeUsage.length} references`);
        }

      } catch (error) {
        console.log(`❌ Error reading ${filePath}:`, error);
      }
    });
  }

  private checkTSCErrors() {
    console.log('\n🔍 Checking TypeScript compilation errors...');
    
    try {
      // Run TypeScript compiler to get errors
      execSync('npx tsc --noEmit --skipLibCheck', {
        encoding: 'utf8',
        stdio: 'pipe'
      });
      console.log('✅ No TypeScript compilation errors found');
    } catch (error: any) {
      const output = error.stdout || error.stderr || '';
      
      // Parse TSC errors for field-related issues
      const fieldErrors = output.split('\n')
        .filter(line => 
          line.includes('eventTime') || 
          line.includes('eventEndTime') ||
          line.includes('does not exist') ||
          line.includes('Property') && line.includes('missing')
        );

      if (fieldErrors.length > 0) {
        console.log('❌ TypeScript field errors found:');
        fieldErrors.forEach(error => {
          console.log(`   ${error.trim()}`);
          this.result.componentErrors.push({
            file: 'unknown',
            line: 0,
            error: error.trim()
          });
        });
      }
    }
  }

  private generateRecommendations() {
    console.log('\n💡 Generating recommendations...');
    
    const recommendations: string[] = [];

    // Check if database fields are consistent
    const bookingsTimeFields = this.result.schemaFields.bookings.filter(f => f.includes('Time'));
    const contractsTimeFields = this.result.schemaFields.contracts.filter(f => f.includes('Time'));

    if (!bookingsTimeFields.includes('eventTime') || !bookingsTimeFields.includes('eventEndTime')) {
      recommendations.push('Run database migration to rename time fields in bookings table');
    }

    if (this.result.componentErrors.length > 0) {
      recommendations.push('Update component TypeScript imports to use FormattedBooking type');
      recommendations.push('Ensure all booking objects are processed through formatBooking() function');
    }

    if (!this.result.typeDefinitions.FormattedBooking?.includes('eventTime')) {
      recommendations.push('Update FormattedBooking interface to include eventTime and eventEndTime fields');
    }

    recommendations.push('Test contract creation and booking editing to verify field mapping works end-to-end');

    this.result.recommendations = recommendations;

    console.log('📋 Recommendations:');
    recommendations.forEach((rec, i) => {
      console.log(`   ${i + 1}. ${rec}`);
    });
  }
}

// Run diagnostic if this file is executed directly
if (require.main === module) {
  const diagnostic = new FieldDiagnostic();
  diagnostic.runDiagnostic().then(result => {
    console.log('\n✅ Diagnostic complete');
    
    if (result.componentErrors.length > 0) {
      console.log(`\n⚠️  Found ${result.componentErrors.length} field-related errors`);
      process.exit(1);
    } else {
      console.log('\n🎉 No critical field mapping issues found');
      process.exit(0);
    }
  }).catch(error => {
    console.error('❌ Diagnostic failed:', error);
    process.exit(1);
  });
}

export { FieldDiagnostic };