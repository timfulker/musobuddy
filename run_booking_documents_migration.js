import { neon } from "@neondatabase/serverless";

const isDevelopment = process.env.NODE_ENV === 'development';
const connectionString = isDevelopment && process.env.DATABASE_URL_DEV 
  ? process.env.DATABASE_URL_DEV 
  : process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('No database connection string found');
}

const sql = neon(connectionString);

async function runMigration() {
  try {
    console.log('🔄 Creating booking_documents table...');
    
    // Create the new booking_documents table
    await sql`
      CREATE TABLE IF NOT EXISTS booking_documents (
        id SERIAL PRIMARY KEY,
        booking_id INTEGER NOT NULL,
        user_id VARCHAR NOT NULL,
        document_type VARCHAR NOT NULL DEFAULT 'other',
        document_name VARCHAR NOT NULL,
        document_url TEXT NOT NULL,
        document_key TEXT NOT NULL,
        uploaded_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ Created booking_documents table');
    
    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_booking_documents_booking ON booking_documents(booking_id)`;
    console.log('✅ Created booking_id index');
    
    await sql`CREATE INDEX IF NOT EXISTS idx_booking_documents_user ON booking_documents(user_id)`;
    console.log('✅ Created user_id index');
    
    // Verify table exists
    const result = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'booking_documents'
    `;
    
    console.log('✅ Migration completed successfully!');
    console.log(`📋 Tables created: ${result.length} table(s) found`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();