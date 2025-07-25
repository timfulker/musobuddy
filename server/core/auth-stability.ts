// Authentication Stability & Monitoring System
import { Request, Response } from 'express';

export interface AuthMetrics {
  successfulLogins: number;
  failedLogins: number;
  sessionErrors: number;
  uptime: number;
  lastError: string | null;
  errorCount: number;
}

class AuthStabilityMonitor {
  private metrics: AuthMetrics = {
    successfulLogins: 0,
    failedLogins: 0,
    sessionErrors: 0,
    uptime: Date.now(),
    lastError: null,
    errorCount: 0
  };

  logSuccessfulLogin(userId: string) {
    this.metrics.successfulLogins++;
    console.log(`✅ AUTH SUCCESS: User ${userId} logged in successfully`);
  }

  logFailedLogin(email: string, reason: string) {
    this.metrics.failedLogins++;
    this.metrics.lastError = `Login failed for ${email}: ${reason}`;
    this.metrics.errorCount++;
    console.error(`❌ AUTH FAILURE: ${this.metrics.lastError}`);
  }

  logSessionError(error: string) {
    this.metrics.sessionErrors++;
    this.metrics.lastError = `Session error: ${error}`;
    this.metrics.errorCount++;
    console.error(`❌ SESSION ERROR: ${error}`);
  }

  getMetrics(): AuthMetrics & { uptimeHours: number; successRate: number } {
    const totalAttempts = this.metrics.successfulLogins + this.metrics.failedLogins;
    return {
      ...this.metrics,
      uptimeHours: (Date.now() - this.metrics.uptime) / (1000 * 60 * 60),
      successRate: totalAttempts > 0 ? (this.metrics.successfulLogins / totalAttempts) * 100 : 100
    };
  }

  // Health check endpoint for monitoring
  healthCheck(req: Request, res: Response) {
    const metrics = this.getMetrics();
    const isHealthy = metrics.successRate >= 95 && metrics.errorCount < 10;
    
    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      metrics
    });
  }
}

export const authMonitor = new AuthStabilityMonitor();

// Session validation with retry logic
export async function validateSession(req: any): Promise<{ valid: boolean; userId?: string; error?: string }> {
  try {
    // Multiple session format detection with priority
    const userId = req.session?.userId || 
                   req.session?.passport?.user || 
                   req.session?.user?.id ||
                   req.user?.id;

    if (userId) {
      return { valid: true, userId };
    }

    return { valid: false, error: 'No valid session found' };
  } catch (error) {
    authMonitor.logSessionError(error instanceof Error ? error.message : 'Unknown session error');
    return { valid: false, error: 'Session validation failed' };
  }
}

// Database connection resilience
export async function withDatabaseRetry<T>(operation: () => Promise<T>, retries = 3): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === retries) {
        authMonitor.logSessionError(`Database operation failed after ${retries} attempts: ${error}`);
        throw error;
      }
      
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
      console.warn(`Database operation attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Unreachable');
}