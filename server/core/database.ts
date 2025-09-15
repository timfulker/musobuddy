import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../../shared/schema";

// Environment-aware database connection
const isDevelopment = process.env.NODE_ENV === 'development';

// Construct PostgreSQL connection string from Supabase credentials
function buildSupabaseConnectionString(supabaseUrl: string, serviceKey: string): string {
  const projectMatch = supabaseUrl.match(/https:\/\/([a-z0-9]+)\.supabase\.co/);
  if (!projectMatch) {
    throw new Error('Invalid Supabase URL format');
  }
  const projectId = projectMatch[1];
  return `postgresql://postgres.${projectId}:${serviceKey}@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require`;
}

let connectionString: string;
if (isDevelopment) {
  // Development: Use Supabase dev credentials
  const supabaseUrl = process.env.SUPABASE_URL_DEV;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY_DEV;
  
  if (supabaseUrl && serviceKey) {
    connectionString = buildSupabaseConnectionString(supabaseUrl, serviceKey);
  } else {
    // Fallback to DATABASE_URL if Supabase creds not available
    connectionString = process.env.DATABASE_URL;
  }
} else {
  // Production: Use Supabase prod credentials
  const supabaseUrl = process.env.SUPABASE_URL_PROD;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY_PROD;
  
  if (supabaseUrl && serviceKey) {
    connectionString = buildSupabaseConnectionString(supabaseUrl, serviceKey);
  } else {
    // Fallback to DATABASE_URL_PROD if Supabase creds not available
    connectionString = process.env.DATABASE_URL_PROD || process.env.DATABASE_URL;
  }
}

if (!connectionString) {
  const envType = isDevelopment ? 'development' : 'production';
  const envVar = isDevelopment ? 'SUPABASE_URL_DEV + SUPABASE_SERVICE_KEY_DEV' : 'SUPABASE_URL_PROD + SUPABASE_SERVICE_KEY_PROD';
  throw new Error(`${envVar} environment variables are required for ${envType} mode`);
}

// Log database connection (without exposing credentials)
const dbHost = connectionString.match(/@([^:/]+)/)?.[1] || 'unknown';
console.log(`📊 Connected to database: ${dbHost}`);
console.log(`🔍 Using connection from: ${isDevelopment ? 'DATABASE_URL_DEV' : 'DATABASE_URL_PROD'}`);
// Debug: Show connection string structure to verify format
const parts = connectionString.match(/^postgresql:\/\/([^:]+):([^@]+)@([^\/]+)\/([^?]+)(\?.*)?$/);
if (parts) {
  const [, username, , host, database, options] = parts;
  console.log(`🔍 Connection structure:`);
  console.log(`   Username: ${username}`);
  console.log(`   Host: ${host}`);
  console.log(`   Database: ${database}`);
  console.log(`   Has options: ${options ? 'Yes' : 'No'}`);
  if (options) {
    console.log(`   Options: ${options.substring(0, 50)}...`);
  }
} else {
  console.log(`⚠️ Connection string doesn't match expected format`);
}

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