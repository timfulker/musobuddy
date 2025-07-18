import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure WebSocket with proper error handling
neonConfig.webSocketConstructor = ws;

// Set WebSocket options for better stability
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineConnect = false;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create connection pool with better error handling and recovery
const connectionConfig = {
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 0,
  // Additional WebSocket stability configurations
  ssl: {
    rejectUnauthorized: false, // For serverless compatibility
  },
};

export const pool = new Pool(connectionConfig);

// Handle pool errors gracefully
pool.on('error', (err) => {
  console.error('Database pool error:', err);
  console.error('Pool will attempt to reconnect automatically...');
});

// Create database instance with error handling
export const db = drizzle({ client: pool, schema });

// Add connection test function
export async function testDatabaseConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    await client.query('SELECT NOW()');
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}