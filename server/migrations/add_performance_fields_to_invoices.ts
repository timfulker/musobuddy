import { db } from '../core/database';
import { sql } from 'drizzle-orm';

(async () => {
  try {
    console.log('🔧 Adding performance fields to invoices table...');
    
    // Add performance_duration column
    await db.execute(sql`
      ALTER TABLE invoices 
      ADD COLUMN IF NOT EXISTS performance_duration TEXT
    `);
    
    // Add gig_type column  
    await db.execute(sql`
      ALTER TABLE invoices 
      ADD COLUMN IF NOT EXISTS gig_type TEXT
    `);
    
    console.log('✅ Successfully added performance_duration and gig_type columns to invoices table');
    
    // Check the columns were added
    const result = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'invoices' 
      AND column_name IN ('performance_duration', 'gig_type')
    `);
    
    console.log('📋 New columns:', result.rows);
    
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
  }
  process.exit(0);
})();