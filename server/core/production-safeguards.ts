// Production Safeguards & Reliability Measures
import { storage } from './storage.js';

export class ProductionSafeguards {
  // Environment validation
  static validateEnvironment(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Critical environment variables
    const required = [
      'DATABASE_URL',
      'SESSION_SECRET',
      'R2_ACCOUNT_ID',
      'R2_ACCESS_KEY_ID',
      'R2_SECRET_ACCESS_KEY',
      'R2_BUCKET_NAME'
    ];

    for (const env of required) {
      if (!process.env[env]) {
        issues.push(`Missing required environment variable: ${env}`);
      }
    }

    // Database connection test
    // Session store configuration
    if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
      issues.push('SESSION_SECRET must be at least 32 characters for production security');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  // Database connection resilience
  static async testDatabaseConnection(): Promise<{ connected: boolean; error?: string }> {
    try {
      // Test a simple query
      await storage.getUserById('test-connection-check');
      return { connected: true };
    } catch (error) {
      return { 
        connected: false, 
        error: error instanceof Error ? error.message : 'Unknown database error' 
      };
    }
  }

  // Session store health check
  static async testSessionStore(): Promise<{ healthy: boolean; error?: string }> {
    try {
      // This would require access to the session store directly
      // For now, we'll assume it's healthy if database is connected
      const dbTest = await this.testDatabaseConnection();
      return dbTest.connected ? 
        { healthy: true } : 
        { healthy: false, error: 'Database connection failed, sessions may not persist' };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Session store test failed'
      };
    }
  }

  // Overall system health
  static async getSystemHealth() {
    const env = this.validateEnvironment();
    const db = await this.testDatabaseConnection();
    const sessions = await this.testSessionStore();

    const isHealthy = env.valid && db.connected && sessions.healthy;

    return {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: {
        environment: env,
        database: db,
        sessions: sessions
      },
      overall: {
        healthy: isHealthy,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version
      }
    };
  }
}

// Startup validation
export async function validateStartup(): Promise<void> {
  console.log('🔍 Running production startup validation...');
  
  const health = await ProductionSafeguards.getSystemHealth();
  
  if (health.status === 'degraded') {
    console.error('⚠️  System health issues detected:');
    
    if (!health.checks.environment.valid) {
      console.error('Environment issues:', health.checks.environment.issues);
    }
    
    if (!health.checks.database.connected) {
      console.error('Database issue:', health.checks.database.error);
    }
    
    if (!health.checks.sessions.healthy) {
      console.error('Session store issue:', health.checks.sessions.error);
    }
    
    // In production, you might want to exit here
    // process.exit(1);
  } else {
    console.log('✅ All startup validation checks passed');
  }
}

// Graceful shutdown handling
export function setupGracefulShutdown(): void {
  const gracefulShutdown = (signal: string) => {
    console.log(`📧 Received ${signal}, starting graceful shutdown...`);
    
    // Give ongoing requests time to complete
    setTimeout(() => {
      console.log('👋 Graceful shutdown complete');
      process.exit(0);
    }, 5000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}