import { drizzle } from "drizzle-orm/neon-http";
import { neon, neonConfig } from "@neondatabase/serverless";
import * as schema from "../../shared/schema";

// Configure Neon for better stability
neonConfig.fetchEndpoint = (host, port, { jwtAuth, ...options }) => {
  const protocol = options.ssl !== false ? 'https' : 'http';
  return `${protocol}://${host}:${port || (options.ssl !== false ? 443 : 80)}/sql`;
};

// Environment-aware database URL selection with backwards compatibility
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

let connectionString: string;

// Development: use proper development database
if (isDevelopment && process.env.DATABASE_URL_DEV) {
  connectionString = process.env.DATABASE_URL_DEV;
  console.log('🔧 DEVELOPMENT: Using DATABASE_URL_DEV');
} else if (isDevelopment && process.env.PGHOST) {
  // Build development URL from PG environment variables
  const user = process.env.PGUSER || 'neondb_owner';
  const password = process.env.PGPASSWORD;
  const host = process.env.PGHOST;
  const database = process.env.PGDATABASE || 'neondb';
  connectionString = `postgresql://${user}:${password}@${host}/${database}?sslmode=require`;
  console.log('🔧 DEVELOPMENT: Using new development database (PG variables)');
} else if (process.env.DATABASE_URL_PROD && isProduction) {
  connectionString = process.env.DATABASE_URL_PROD;
  console.log('🏭 PRODUCTION: Using DATABASE_URL_PROD');
} else if (process.env.DATABASE_URL) {
  connectionString = process.env.DATABASE_URL;
  if (isDevelopment) {
    console.log('🔧 DEVELOPMENT: Using DATABASE_URL (fallback - CAUTION: may be production!)');
  } else if (isProduction) {
    console.log('🏭 PRODUCTION: Using DATABASE_URL');
  } else {
    console.log(`🔍 UNKNOWN ENV: Using DATABASE_URL for ${process.env.NODE_ENV || 'unknown'}`);
  }
} else {
  throw new Error('DATABASE_URL environment variable is required');
}

// Log database connection details (without exposing credentials)
const dbHost = connectionString.match(/@([^:/]+)/)?.[1] || 'unknown';
const envLabel = isDevelopment ? 'DEV' : isProduction ? 'PROD' : 'UNKNOWN';
console.log(`📊 Database: ${envLabel} environment → ${dbHost}`);

const sql = neon(connectionString, {
  fetchOptions: {
    cache: 'no-cache',
  },
});

export const db = drizzle(sql, { schema });

export async function testDatabaseConnection(): Promise<boolean> {
  let retries = 3;
  while (retries > 0) {
    try {
      await sql`SELECT 1 as test`;
      console.log('✅ Database connection successful');
      return true;
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