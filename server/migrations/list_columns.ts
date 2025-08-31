import { db } from "../core/database";

// List all columns in user_settings table
export async function listColumns() {
  try {
    console.log('📋 Listing all columns in user_settings table...');
    
    const result = await db.execute(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'user_settings' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📊 All columns in user_settings table:');
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.column_name} (${row.data_type}) - ${row.is_nullable === 'YES' ? 'nullable' : 'not null'}`);
    });
    
  } catch (error) {
    console.error('❌ Failed to list columns:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  listColumns()
    .then(() => {
      console.log('\n✅ Column listing completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Column listing failed:', error);
      process.exit(1);
    });
}