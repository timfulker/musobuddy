import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../../shared/schema";
import { ENV } from "./environment";

// Environment-aware database connection using centralized ENV detection
const isDeployment = ENV.isProduction;
const isDevelopment = ENV.isDevelopment;

// Construct PostgreSQL connection string from Supabase credentials using Transaction Pooler
function buildSupabaseConnectionString(supabaseUrl: string, dbPassword: string): string {
  const projectMatch = supabaseUrl.match(/https:\/\/([a-z0-9]+)\.supabase\.co/);
  if (!projectMatch) {
    throw new Error('Invalid Supabase URL format');
  }
  const projectId = projectMatch[1];
  // Use Supabase Transaction Pooler format with correct database password
  return `postgresql://postgres:${dbPassword}@db.${projectId}.supabase.co:6543/postgres?sslmode=require`;
}

let connectionString: string;

if (ENV.isDevelopment) {
  // Development: Use direct database connection string (no hostname construction)
  // Priority: 1) SUPABASE_DB_URL_DEV (exact string from dashboard), 2) Constructed, 3) DATABASE_URL fallback
  const directDbUrl = process.env.SUPABASE_DB_URL_DEV;
  
  if (directDbUrl) {
    connectionString = directDbUrl;
  } else {
    // Fallback: try to construct from Supabase credentials
    const supabaseUrl = process.env.SUPABASE_URL_DEV;
    const dbPassword = process.env.SUPABASE_DB_PASSWORD_DEV;
    
    if (supabaseUrl && dbPassword) {
      connectionString = buildSupabaseConnectionString(supabaseUrl, dbPassword);
    } else {
      // Final fallback to DATABASE_URL
      connectionString = process.env.DATABASE_URL;
    }
  }
} else {
  // Production: Use direct database connection string (no hostname construction)
  const directDbUrl = process.env.SUPABASE_DB_URL_PROD;
  
  if (directDbUrl) {
    connectionString = directDbUrl;
  } else {
    // Fallback: try to construct from Supabase credentials
    const supabaseUrl = process.env.SUPABASE_URL_PROD;
    const dbPassword = process.env.SUPABASE_DB_PASSWORD_PROD;
    
    if (supabaseUrl && dbPassword) {
      connectionString = buildSupabaseConnectionString(supabaseUrl, dbPassword);
    } else {
      throw new Error('SUPABASE_URL_PROD and SUPABASE_DB_PASSWORD_PROD are required for production/deployment mode');
    }
  }
}

if (!connectionString) {
  const envType = ENV.isDevelopment ? 'development' : 'production';
  const envVar = ENV.isDevelopment ? 'SUPABASE_URL_DEV + SUPABASE_DB_PASSWORD_DEV' : 'SUPABASE_URL_PROD + SUPABASE_DB_PASSWORD_PROD';
  throw new Error(`${envVar} environment variables are required for ${envType} mode`);
}

// Log database connection (without exposing credentials)
const dbHost = connectionString.match(/@([^:/]+)/)?.[1] || 'unknown';
console.log(`📊 Connected to database: ${dbHost}`);
console.log(`🔍 Environment detection via ENV: isProduction=${ENV.isProduction}, isDevelopment=${ENV.isDevelopment}`);
console.log(`🔍 Resolved mode: ${ENV.isDevelopment ? 'DEVELOPMENT' : 'PRODUCTION'}`);

// Report connection source for debugging
const envPrefix = ENV.isDevelopment ? 'DEV' : 'PROD';
const directDbVar = ENV.isDevelopment ? 'SUPABASE_DB_URL_DEV' : 'SUPABASE_DB_URL_PROD';
const hasDirectUrl = ENV.isDevelopment ? process.env.SUPABASE_DB_URL_DEV : process.env.SUPABASE_DB_URL_PROD;

if (hasDirectUrl) {
  console.log(`🔍 Using direct connection: ${directDbVar}`);
} else if (connectionString === process.env.DATABASE_URL) {
  console.log(`🔍 Using fallback: DATABASE_URL`);
} else {
  console.log(`🔍 Using constructed connection: SUPABASE_URL_${envPrefix}`);
}
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

// Create PostgreSQL connection pool with optimized settings
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 10, // Increase connection limit for Neon
  min: 2, // Keep connections alive  
  idleTimeoutMillis: 30000, // Shorter idle timeout
  acquireTimeoutMillis: 5000, // Shorter acquire timeout
  connectionTimeoutMillis: 3000,
  statement_timeout: 15000, // Add statement timeout
  idle_in_transaction_session_timeout: 10000, // Prevent hung transactions
});

export const db = drizzle(pool, { schema });

// Add pool monitoring for debugging connection issues
setInterval(() => {
  const stats = {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };
  if (stats.waitingCount > 0 || stats.totalCount > 8) {
    console.log('🔍 DB Pool Status:', stats);
  }
}, 30000); // Log every 30 seconds if there are issues

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