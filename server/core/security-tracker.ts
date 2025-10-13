import { db } from './database';
import { securityMonitoring, userSecurityStatus } from '../../shared/schema';
import { eq } from 'drizzle-orm';

export interface ApiUsageData {
  userId: string;
  apiService: 'openai' | 'claude' | 'googlemaps' | 'mailgun' | 'stripe';
  endpoint?: string;
  requestCount?: number;
  estimatedCost?: number;
  ipAddress?: string;
  userAgent?: string;
}

export class SecurityTracker {
  
  // Track API usage for security monitoring (not limits)
  static async trackApiUsage(data: ApiUsageData): Promise<void> {
    try {
      // Check if user is blocked first
      const securityStatus = await db
        .select({ isBlocked: userSecurityStatus.isBlocked })
        .from(userSecurityStatus)
        .where(eq(userSecurityStatus.userId, data.userId))
        .limit(1);

      if (securityStatus.length > 0 && securityStatus[0].isBlocked) {
        console.log(`🚫 Blocked user ${data.userId} attempted API call to ${data.apiService}`);
        return; // Don't track usage for blocked users
      }

      // Insert security monitoring record
      await db.insert(securityMonitoring).values({
        userId: data.userId,
        apiService: data.apiService,
        endpoint: data.endpoint || 'unknown',
        requestCount: data.requestCount || 1,
        estimatedCost: String(data.estimatedCost || 0),
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        suspicious: await this.detectSuspiciousActivity(data),
      });

      console.log(`📊 Tracked API usage: ${data.userId} -> ${data.apiService} (${data.requestCount || 1} requests, $${data.estimatedCost || 0})`);

    } catch (error) {
      console.error('❌ Error tracking API usage:', error);
      // Don't throw - security tracking shouldn't break API calls
    }
  }

  // Basic suspicious activity detection
  private static async detectSuspiciousActivity(data: ApiUsageData): Promise<boolean> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      // Count recent requests from this user for this service
      const recentActivity = await db
        .select({ requestCount: securityMonitoring.requestCount })
        .from(securityMonitoring)
        .where(eq(securityMonitoring.userId, data.userId))
        .where(eq(securityMonitoring.apiService, data.apiService));

      const totalRecentRequests = recentActivity.reduce((sum, record) => 
        sum + (record.requestCount || 0), 0);

      // Flag as suspicious if more than 50 requests per hour for any service
      if (totalRecentRequests > 50) {
        console.log(`🚨 Suspicious activity detected: User ${data.userId} made ${totalRecentRequests} ${data.apiService} requests in the last hour`);
        return true;
      }

      return false;

    } catch (error) {
      console.error('❌ Error detecting suspicious activity:', error);
      return false;
    }
  }

  // Check if user is blocked
  static async isUserBlocked(userId: string): Promise<boolean> {
    try {
      const result = await db
        .select({ isBlocked: userSecurityStatus.isBlocked })
        .from(userSecurityStatus)
        .where(eq(userSecurityStatus.userId, userId))
        .limit(1);

      return result.length > 0 && result[0].isBlocked;
    } catch (error) {
      console.error('❌ Error checking user block status:', error);
      return false; // Default to not blocked if we can't check
    }
  }

  // Update user risk score
  static async updateRiskScore(userId: string, newScore: number): Promise<void> {
    try {
      await db
        .insert(userSecurityStatus)
        .values({
          userId,
          riskScore: newScore,
          lastReviewAt: new Date(),
        })
        .onConflictDoUpdate({
          target: userSecurityStatus.userId,
          set: {
            riskScore: newScore,
            lastReviewAt: new Date(),
            updatedAt: new Date(),
          }
        });

      console.log(`📊 Updated risk score for user ${userId}: ${newScore}`);
    } catch (error) {
      console.error('❌ Error updating risk score:', error);
    }
  }
}

// Export for easy import
export const trackApiUsage = SecurityTracker.trackApiUsage;
export const isUserBlocked = SecurityTracker.isUserBlocked;