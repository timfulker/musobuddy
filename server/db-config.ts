import { drizzle } from "drizzle-orm/neon-http";
import { neon, neonConfig } from "@neondatabase/serverless";
import * as schema from "../../shared/schema";

// Configure Neon for better stability
neonConfig.fetchConnectionCache = true;
neonConfig.fetchEndpoint = (host, port, { jwtAuth, ...options }) => {
  const protocol = options.ssl !== false ? 'https' : 'http';
  return `${protocol}://${host}:${port || (options.ssl !== false ? 443 : 80)}/sql`;
};

// Database connection setup with connection pooling
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Database connection attempt ${4 - retries} failed:`, errorMessage);
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
  let lastError: unknown;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error: unknown) {
      lastError = error;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorCode = (error as any)?.code;
      
      console.error(`❌ Database operation failed (attempt ${i + 1}/${maxRetries}):`, errorMessage);
      
      // If it's a connection termination, wait before retry
      if (errorCode === '57P01' || errorMessage.includes('terminating connection')) {
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