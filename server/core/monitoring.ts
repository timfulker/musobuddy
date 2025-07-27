/**
 * Production Monitoring System for MusoBuddy
 * Tracks authentication health, system performance, and critical failures
 */

import { ENV } from './environment.js';

interface AuthMetrics {
  successful_logins: number;
  failed_logins: number;
  session_creations: number;
  session_failures: number;
  verification_attempts: number;
  verification_failures: number;
  last_reset: Date;
}

interface SystemAlert {
  type: 'auth_failure' | 'session_error' | 'database_error' | 'sms_failure' | 'high_error_rate';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  count: number;
  first_occurrence: Date;
  last_occurrence: Date;
}

class ProductionMonitor {
  private metrics: AuthMetrics = {
    successful_logins: 0,
    failed_logins: 0,
    session_creations: 0,
    session_failures: 0,
    verification_attempts: 0,
    verification_failures: 0,
    last_reset: new Date()
  };

  private alerts: Map<string, SystemAlert> = new Map();
  private readonly ERROR_THRESHOLD = 5; // Alert after 5 failures in 5 minutes
  private readonly CRITICAL_THRESHOLD = 10; // Critical alert after 10 failures

  /**
   * Track successful authentication events
   */
  trackAuthSuccess(type: 'login' | 'session' | 'verification'): void {
    switch (type) {
      case 'login':
        this.metrics.successful_logins++;
        break;
      case 'session':
        this.metrics.session_creations++;
        break;
      case 'verification':
        this.metrics.verification_attempts++;
        break;
    }
    
    if (ENV.isProduction) {
      console.log(`✅ AUTH SUCCESS: ${type} - Total: ${this.getSuccessCount(type)}`);
    }
  }

  /**
   * Track authentication failures and trigger alerts
   */
  trackAuthFailure(type: 'login' | 'session' | 'verification' | 'database' | 'sms', error: string): void {
    switch (type) {
      case 'login':
        this.metrics.failed_logins++;
        break;
      case 'session':
        this.metrics.session_failures++;
        break;
      case 'verification':
        this.metrics.verification_failures++;
        break;
    }

    const alertKey = `${type}_failure_${Date.now().toString().slice(-8)}`;
    const now = new Date();

    // Update or create alert
    const existingAlert = this.alerts.get(alertKey) || {
      type: `${type}_${type === 'database' ? 'error' : 'failure'}` as any,
      severity: 'medium' as const,
      message: error,
      count: 0,
      first_occurrence: now,
      last_occurrence: now
    };

    existingAlert.count++;
    existingAlert.last_occurrence = now;
    
    // Escalate severity based on frequency
    if (existingAlert.count >= this.CRITICAL_THRESHOLD) {
      existingAlert.severity = 'critical';
    } else if (existingAlert.count >= this.ERROR_THRESHOLD) {
      existingAlert.severity = 'high';
    }

    this.alerts.set(alertKey, existingAlert);

    // Log the failure
    console.error(`🚨 AUTH FAILURE: ${type.toUpperCase()} - ${error}`);
    console.error(`📊 Failure count: ${this.getFailureCount(type)} | Alert severity: ${existingAlert.severity}`);

    // Trigger immediate alert for critical issues
    if (existingAlert.severity === 'critical') {
      this.sendCriticalAlert(existingAlert);
    }
  }

  /**
   * Get authentication health status
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'critical';
    metrics: AuthMetrics;
    active_alerts: SystemAlert[];
    error_rates: Record<string, number>;
  } {
    const activeAlerts = Array.from(this.alerts.values());
    const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');
    const highAlerts = activeAlerts.filter(a => a.severity === 'high');

    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (criticalAlerts.length > 0) {
      status = 'critical';
    } else if (highAlerts.length > 0) {
      status = 'degraded';
    }

    const totalAttempts = this.metrics.successful_logins + this.metrics.failed_logins;
    const loginErrorRate = totalAttempts > 0 ? (this.metrics.failed_logins / totalAttempts) * 100 : 0;
    
    const totalSessions = this.metrics.session_creations + this.metrics.session_failures;
    const sessionErrorRate = totalSessions > 0 ? (this.metrics.session_failures / totalSessions) * 100 : 0;

    return {
      status,
      metrics: this.metrics,
      active_alerts: activeAlerts,
      error_rates: {
        login_failure_rate: Math.round(loginErrorRate * 100) / 100,
        session_failure_rate: Math.round(sessionErrorRate * 100) / 100
      }
    };
  }

  /**
   * Send critical alert (in production, this would integrate with monitoring services)
   */
  private sendCriticalAlert(alert: SystemAlert): void {
    const message = `🚨 CRITICAL AUTHENTICATION ISSUE 🚨
Type: ${alert.type}
Message: ${alert.message}
Failure Count: ${alert.count}
First Occurred: ${alert.first_occurrence.toISOString()}
Latest: ${alert.last_occurrence.toISOString()}

This may affect all users. Immediate investigation required.`;

    console.error('='.repeat(80));
    console.error(message);
    console.error('='.repeat(80));

    // In production, integrate with:
    // - Slack webhooks
    // - PagerDuty
    // - Email alerts
    // - SMS notifications
    if (ENV.isProduction) {
      // Example webhook integration:
      // await this.sendSlackAlert(message);
      // await this.sendPagerDutyAlert(alert);
    }
  }

  /**
   * Reset metrics (called hourly)
   */
  resetMetrics(): void {
    this.metrics = {
      successful_logins: 0,
      failed_logins: 0,
      session_creations: 0,
      session_failures: 0,
      verification_attempts: 0,
      verification_failures: 0,
      last_reset: new Date()
    };
    
    // Clean old alerts (older than 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    for (const [key, alert] of this.alerts.entries()) {
      if (alert.last_occurrence < oneHourAgo) {
        this.alerts.delete(key);
      }
    }

    console.log('📊 Monitoring metrics reset');
  }

  private getSuccessCount(type: string): number {
    switch (type) {
      case 'login': return this.metrics.successful_logins;
      case 'session': return this.metrics.session_creations;
      case 'verification': return this.metrics.verification_attempts;
      default: return 0;
    }
  }

  private getFailureCount(type: string): number {
    switch (type) {
      case 'login': return this.metrics.failed_logins;
      case 'session': return this.metrics.session_failures;
      case 'verification': return this.metrics.verification_failures;
      default: return 0;
    }
  }

  /**
   * Check if authentication system is experiencing issues
   */
  isAuthenticationHealthy(): boolean {
    const health = this.getHealthStatus();
    return health.status === 'healthy';
  }

  /**
   * Get summary for dashboard or API
   */
  getSummary(): string {
    const health = this.getHealthStatus();
    const uptime = Date.now() - this.metrics.last_reset.getTime();
    const uptimeMinutes = Math.floor(uptime / (1000 * 60));

    return `Auth Health: ${health.status.toUpperCase()} | ` +
           `Logins: ${this.metrics.successful_logins}✅/${this.metrics.failed_logins}❌ | ` +
           `Sessions: ${this.metrics.session_creations}✅/${this.metrics.session_failures}❌ | ` +
           `Uptime: ${uptimeMinutes}m | ` +
           `Alerts: ${health.active_alerts.length}`;
  }
}

// Export singleton instance
export const monitor = new ProductionMonitor();

// Reset metrics every hour
if (ENV.isProduction) {
  setInterval(() => {
    monitor.resetMetrics();
  }, 60 * 60 * 1000); // 1 hour
}