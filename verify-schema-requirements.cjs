const fs = require('fs');
const path = require('path');

// Read the Neon schema
const schemaFile = fs.readFileSync(path.join(__dirname, 'shared/schema.ts'), 'utf8');

// Extract bookings table columns
const bookingsSection = schemaFile.match(/export const bookings = pgTable\("bookings", \{([\s\S]*?)\}\);/);

if (bookingsSection) {
  const columnDefinitions = bookingsSection[1];

  // Extract column names
  const columnMatches = columnDefinitions.matchAll(/(\w+):\s*(varchar|text|decimal|timestamp|boolean|integer|serial|jsonb)\(/g);

  const neonColumns = [];
  for (const match of columnMatches) {
    neonColumns.push(match[1]);
  }

  console.log('📊 Neon/Firebase Schema Columns:');
  console.log('================================');
  neonColumns.sort().forEach(col => console.log(`  - ${col}`));

  console.log('\n📋 SQL to add all missing columns to Supabase:');
  console.log('==============================================\n');

  // Generate SQL for each column
  console.log('-- Add all columns from Neon schema to Supabase');
  console.log('ALTER TABLE bookings');

  const sqlStatements = neonColumns.map(col => {
    // Determine the PostgreSQL type based on the column name and usage
    let sqlType = 'TEXT'; // default

    if (col.includes('Amount') || col === 'fee' || col === 'deposit' || col.includes('expense')) {
      sqlType = 'DECIMAL(10,2)';
    } else if (col.includes('At') || col.includes('Date') || col.includes('Time')) {
      sqlType = 'TIMESTAMP';
    } else if (col.includes('is') || col.includes('has') || col.includes('Paid') || col.includes('Sent') || col.includes('Signed')) {
      sqlType = 'BOOLEAN DEFAULT FALSE';
    } else if (col === 'id' || col.includes('Count')) {
      sqlType = 'INTEGER';
    } else if (col.includes('Url') || col.includes('Key') || col.includes('Content') || col.includes('Notes') || col.includes('Details') || col.includes('Requirements')) {
      sqlType = 'TEXT';
    } else if (col === 'mapLatitude' || col === 'latitude') {
      sqlType = 'DECIMAL(10,7)';
    } else if (col === 'mapLongitude' || col === 'longitude') {
      sqlType = 'DECIMAL(10,7)';
    }

    return `ADD COLUMN IF NOT EXISTS ${col} ${sqlType}`;
  });

  console.log(sqlStatements.join(',\n') + ';');

  console.log('\n-- Note: Review and adjust data types as needed');
  console.log('-- Some columns might already exist with different names');
  console.log('-- Run in Supabase SQL Editor to align schemas');
}