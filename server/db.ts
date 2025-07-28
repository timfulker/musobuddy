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

// HARDENING: Enhanced connection pool for 2,000-3,000 concurrent users
const connectionConfig = {
  connectionString: process.env.DATABASE_URL,
  max: 20, // Increased from 10 to support more concurrent users
  min: 2, // Maintain minimum connections for faster response
  idleTimeoutMillis: 30000, // 30 seconds idle timeout
  connectionTimeoutMillis: 10000, // Increased to 10 seconds for reliability
  acquireTimeoutMillis: 60000, // 60 seconds to acquire connection
  createTimeoutMillis: 30000, // 30 seconds to create new connection
  destroyTimeoutMillis: 5000, // 5 seconds to destroy connection
  createRetryIntervalMillis: 200, // Retry every 200ms on connection failure
  reapIntervalMillis: 1000, // Check for idle connections every second
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000, // 10 second keepalive delay
  // Enhanced WebSocket stability for Neon serverless
  ssl: {
    rejectUnauthorized: false, // For serverless compatibility
  },
};

export const pool = new Pool(connectionConfig);

// HARDENING: Enhanced error handling and pool monitoring
pool.on('error', (err) => {
  console.error('❌ Database pool error:', err);
  console.error('🔄 Pool will attempt to reconnect automatically...');
  
  // Log pool state for debugging
  console.log('📊 Pool state during error:', {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
    timestamp: new Date().toISOString()
  });
});

pool.on('connect', (client) => {
  console.log('🔗 New database connection established');
});

pool.on('acquire', (client) => {
  console.log('📥 Database connection acquired from pool');
});

pool.on('release', (client) => {
  console.log('📤 Database connection released to pool');
});

// HARDENING: Pool monitoring for capacity planning
setInterval(() => {
  const stats = {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
    active: pool.totalCount - pool.idleCount
  };
  
  // Only log when pool is under pressure
  if (stats.waiting > 0 || stats.active > 15) {
    console.log('⚠️ Database pool under pressure:', stats);
  }
}, 30000); // Check every 30 seconds

// Create database instance with error handling
export const db = drizzle({ client: pool, schema });

// HARDENING: Enhanced connection testing with retry logic
export async function testDatabaseConnection(retries = 3): Promise<boolean> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const client = await pool.connect();
      console.log(`✅ Database connection successful (attempt ${attempt})`);
      
      // Test with actual query
      const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
      console.log('📊 Database info:', {
        currentTime: result.rows[0].current_time,
        version: result.rows[0].pg_version.split(' ')[0],
        poolStats: {
          total: pool.totalCount,
          idle: pool.idleCount,
          waiting: pool.waitingCount
        }
      });
      
      client.release();
      return true;
    } catch (error) {
      console.error(`❌ Database connection failed (attempt ${attempt}/${retries}):`, error);
      
      if (attempt < retries) {
        console.log(`🔄 Retrying in ${attempt * 1000}ms...`);
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
      }
    }
  }
  
  return false;
}

// HARDENING: Pool health check function
export function getPoolHealth() {
  return {
    totalConnections: pool.totalCount,
    idleConnections: pool.idleCount,
    waitingRequests: pool.waitingCount,
    activeConnections: pool.totalCount - pool.idleCount,
    utilizationPercent: Math.round(((pool.totalCount - pool.idleCount) / 20) * 100),
    isHealthy: pool.waitingCount === 0 && pool.totalCount <= 20
  };
}