import { db } from './database';
import { users, userSettings, fraudPreventionLog } from '../../shared/schema';
import { eq, and, sql } from 'drizzle-orm';

export interface FraudAlert {
  type: 'duplicate_ip' | 'duplicate_device' | 'multiple_signals';
  newUserId: string;
  newUserEmail: string;
  matchingUsers: Array<{
    userId: string;
    email: string;
    createdAt: Date;
    trialStatus: string;
  }>;
  riskScore: number;
  details: string;
}

export class FraudDetectionService {
  
  /**
   * Check for fraud patterns when a new user signs up
   * Called after user creation but before they access the system
   */
  async checkNewUserForFraud(userId: string): Promise<FraudAlert[]> {
    const alerts: FraudAlert[] = [];
    
    try {
      const user = await db.select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
        
      if (!user || user.length === 0) {
        console.log(`⚠️ [FRAUD-CHECK] User ${userId} not found`);
        return alerts;
      }
      
      const currentUser = user[0];
      console.log(`🔍 [FRAUD-CHECK] Checking user ${currentUser.email} for suspicious patterns`);
      
      // Get user settings for business address check
      const settings = await db.select()
        .from(userSettings)
        .where(eq(userSettings.userId, userId))
        .limit(1);
        
      // Business address check removed - column no longer exists
      
      // Check 2: IP Address Duplicates  
      if (currentUser.signupIpAddress) {
        const ipMatches = await this.checkIpAddressDuplicates(
          userId,
          currentUser.signupIpAddress
        );
        if (ipMatches.length > 0) {
          alerts.push({
            type: 'duplicate_ip',
            newUserId: userId,
            newUserEmail: currentUser.email || '',
            matchingUsers: ipMatches,
            riskScore: 60, // Medium-high risk
            details: `IP address ${currentUser.signupIpAddress} matches ${ipMatches.length} existing accounts`
          });
        }
      }
      
      // Check 3: Device Fingerprint Duplicates
      if (currentUser.deviceFingerprint) {
        const deviceMatches = await this.checkDeviceFingerprintDuplicates(
          userId,
          currentUser.deviceFingerprint
        );
        if (deviceMatches.length > 0) {
          alerts.push({
            type: 'duplicate_device',
            newUserId: userId,
            newUserEmail: currentUser.email || '',
            matchingUsers: deviceMatches,
            riskScore: 70, // High risk
            details: `Device fingerprint matches ${deviceMatches.length} existing accounts`
          });
        }
      }
      
      // Check 4: Multiple Signal Detection (highest risk)
      if (alerts.length >= 2) {
        const combinedMatches = this.combineMatches(alerts);
        alerts.push({
          type: 'multiple_signals',
          newUserId: userId,
          newUserEmail: currentUser.email || '',
          matchingUsers: combinedMatches,
          riskScore: 95, // Critical risk
          details: `Multiple fraud signals detected: ${alerts.map(a => a.type).join(', ')}`
        });
      }
      
      // Log fraud events to database
      for (const alert of alerts) {
        await this.logFraudEvent(alert);
      }
      
      // Update user fraud score
      if (alerts.length > 0) {
        const maxRiskScore = Math.max(...alerts.map(a => a.riskScore));
        await this.updateUserFraudScore(userId, maxRiskScore);
      }
      
      return alerts;
      
    } catch (error) {
      console.error(`❌ [FRAUD-CHECK] Error checking user ${userId}:`, error);
      return alerts;
    }
  }
  
  // Business address duplicate check removed - column no longer exists
  
  /**
   * Check for IP address duplicates in last 30 days
   */
  private async checkIpAddressDuplicates(
    excludeUserId: string,
    ipAddress: string
  ): Promise<Array<{userId: string; email: string; createdAt: Date; trialStatus: string}>> {
    const matches = await db
      .select({
        userId: users.id,
        email: users.email,
        createdAt: users.createdAt,
        trialStatus: users.trialStatus
      })
      .from(users)
      .where(
        and(
          eq(users.signupIpAddress, ipAddress),
          sql`${users.id} != ${excludeUserId}`,
          sql`${users.createdAt} > NOW() - INTERVAL '30 days'`
        )
      );
      
    return matches.map(m => ({
      userId: m.userId,
      email: m.email || '',
      createdAt: m.createdAt || new Date(),
      trialStatus: m.trialStatus || 'unknown'
    }));
  }
  
  /**
   * Check for device fingerprint duplicates in last 60 days
   */
  private async checkDeviceFingerprintDuplicates(
    excludeUserId: string,
    deviceFingerprint: string
  ): Promise<Array<{userId: string; email: string; createdAt: Date; trialStatus: string}>> {
    const matches = await db
      .select({
        userId: users.id,
        email: users.email,
        createdAt: users.createdAt,
        trialStatus: users.trialStatus
      })
      .from(users)
      .where(
        and(
          eq(users.deviceFingerprint, deviceFingerprint),
          sql`${users.id} != ${excludeUserId}`,
          sql`${users.createdAt} > NOW() - INTERVAL '60 days'`
        )
      );
      
    return matches.map(m => ({
      userId: m.userId,
      email: m.email || '',
      createdAt: m.createdAt || new Date(),
      trialStatus: m.trialStatus || 'unknown'
    }));
  }
  
  /**
   * Combine matching users from multiple alerts
   */
  private combineMatches(alerts: FraudAlert[]): Array<{userId: string; email: string; createdAt: Date; trialStatus: string}> {
    const allMatches = alerts.flatMap(alert => alert.matchingUsers);
    const uniqueMatches = allMatches.filter((match, index, self) => 
      self.findIndex(m => m.userId === match.userId) === index
    );
    return uniqueMatches;
  }
  
  /**
   * Log fraud event to database
   */
  private async logFraudEvent(alert: FraudAlert): Promise<void> {
    try {
      await db.insert(fraudPreventionLog).values({
        userId: alert.newUserId,
        emailAddress: alert.newUserEmail,
        actionTaken: 'admin_notification',
        reason: alert.details,
        riskScore: alert.riskScore,
        createdAt: new Date()
      });
      
      console.log(`📝 [FRAUD-LOG] Logged ${alert.type} for user ${alert.newUserEmail}`);
    } catch (error) {
      console.error(`❌ [FRAUD-LOG] Failed to log fraud event:`, error);
    }
  }
  
  /**
   * Update user fraud score
   */
  private async updateUserFraudScore(userId: string, riskScore: number): Promise<void> {
    try {
      await db.update(users)
        .set({ fraudScore: riskScore })
        .where(eq(users.id, userId));
        
      console.log(`📊 [FRAUD-SCORE] Updated user ${userId} fraud score to ${riskScore}`);
    } catch (error) {
      console.error(`❌ [FRAUD-SCORE] Failed to update fraud score:`, error);
    }
  }
  
  /**
   * Get fraud alerts for admin dashboard
   */
  async getRecentFraudAlerts(days: number = 7): Promise<any[]> {
    try {
      const alerts = await db
        .select()
        .from(fraudPreventionLog)
        .where(sql`${fraudPreventionLog.createdAt} > NOW() - INTERVAL '${days} days'`)
        .orderBy(sql`${fraudPreventionLog.createdAt} DESC`);
        
      return alerts;
    } catch (error) {
      console.error(`❌ [FRAUD-ALERTS] Failed to get recent alerts:`, error);
      return [];
    }
  }
}

export const fraudDetection = new FraudDetectionService();