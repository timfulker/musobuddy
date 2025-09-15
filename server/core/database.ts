import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../../shared/schema";

// Environment-aware database connection
const isDevelopment = process.env.NODE_ENV === 'development';
const connectionString = isDevelopment
  ? (process.env.DATABASE_URL_DEV || process.env.DATABASE_URL)
  : (process.env.DATABASE_URL_PROD || process.env.DATABASE_URL);

if (!connectionString) {
  const envType = isDevelopment ? 'development' : 'production';
  const envVar = isDevelopment ? 'DATABASE_URL_DEV or DATABASE_URL' : 'DATABASE_URL_PROD or DATABASE_URL';
  throw new Error(`${envVar} environment variable is required for ${envType} mode`);
}

// Log database connection (without exposing credentials)
const dbHost = connectionString.match(/@([^:/]+)/)?.[1] || 'unknown';
console.log(`📊 Connected to database: ${dbHost}`);

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export const db = drizzle(pool, { schema });

export async function testDatabaseConnection(): Promise<boolean> {
  let retries = 3;
  while (retries > 0) {
    try {
      const client = await pool.connect();
      try {
        await client.query('SELECT 1 as test');
        console.log('✅ Database connection successful');
        return true;
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error(`❌ Database connection attempt ${4 - retries} failed:`, error.message);
      retries--;
      if (retries > 0) {
        console.log('🔄 Retrying database connection...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  return false;
}

// Enhanced connection with retry logic for storage operations
export async function withRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      console.error(`❌ Database operation failed (attempt ${i + 1}/${maxRetries}):`, error.message);
      
      // If it's a connection termination, wait before retry
      if (error.code === '57P01' || error.message.includes('terminating connection')) {
        if (i < maxRetries - 1) {
          console.log('🔄 Connection terminated, retrying in 2 seconds...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } else {
        // For non-connection errors, don't retry
        throw error;
      }
    }
  }
  
  throw lastError;
}