import { drizzle } from "drizzle-orm/neon-http";
import { neon, neonConfig } from "@neondatabase/serverless";
import * as schema from "../../shared/schema";

// Configure Neon for better stability
neonConfig.fetchConnectionCache = true;
neonConfig.fetchEndpoint = (host, port, { jwtAuth, ...options }) => {
  const protocol = options.ssl !== false ? 'https' : 'http';
  return `${protocol}://${host}:${port || (options.ssl !== false ? 443 : 80)}/sql`;
};

// Environment-aware database URL selection
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

let connectionString: string;

if (isDevelopment && process.env.DATABASE_URL_DEV) {
  connectionString = process.env.DATABASE_URL_DEV;
  console.log('🔧 DEVELOPMENT: Using DATABASE_URL_DEV');
} else if (isProduction && process.env.DATABASE_URL) {
  connectionString = process.env.DATABASE_URL;
  console.log('🏭 PRODUCTION: Using DATABASE_URL');
} else if (process.env.DATABASE_URL) {
  connectionString = process.env.DATABASE_URL;
  console.log(`🔍 FALLBACK: Using DATABASE_URL for ${process.env.NODE_ENV || 'unknown'} environment`);
} else {
  throw new Error('DATABASE_URL (or DATABASE_URL_DEV for dev) environment variable is required');
}

// Log database connection details (without exposing full URL)
const dbHost = connectionString.match(/@([^:/]+)/)?.[1] || 'unknown';
console.log(`📊 Database: ${isDevelopment ? 'DEV' : isProduction ? 'PROD' : 'UNKNOWN'} environment → ${dbHost}`);

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