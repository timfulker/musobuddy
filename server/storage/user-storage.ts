import { db } from "../core/database";
import { users, sessions, smsVerifications } from "../../shared/schema";
import { eq, lt, desc, sql } from "drizzle-orm";
import bcrypt from "bcrypt";
import { randomBytes } from 'crypto';

export class UserStorage {
  private db = db;

  // ===== USER METHODS =====
  
  async getUser(id: string) {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0] || null;
  }

  async getUserById(id: string) {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0] || null;
  }

  async getUserByStripeCustomerId(stripeCustomerId: string) {
    const result = await db.select().from(users).where(eq(users.stripeCustomerId, stripeCustomerId));
    return result[0] || null;
  }

  async getUserByEmail(email: string) {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0] || null;
  }

  async getUserByFirebaseUid(firebaseUid: string) {
    const result = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid));
    return result[0] || null;
  }

  async getUserByPhone(phoneNumber: string) {
    const result = await db.select().from(users).where(eq(users.phoneNumber, phoneNumber));
    return result[0] || null;
  }

  /**
   * Get user by email prefix
   * Used for admin email prefix management and validation
   * @param emailPrefix - The email prefix to search for (e.g., "saxweddings")
   * @returns User object or null if not found
   */
  async getUserByEmailPrefix(emailPrefix: string) {
    const result = await db.select().from(users)
      .where(eq(users.emailPrefix, emailPrefix.toLowerCase()));
    return result[0] || null;
  }

  async getUserByQuickAddToken(token: string) {
    const result = await db.select().from(users)
      .where(eq(users.quickAddToken, token));
    return result[0] || null;
  }

  async getUserByResetToken(token: string) {
    const result = await db.select().from(users)
      .where(eq(users.passwordResetToken, token));
    return result[0] || null;
  }

  async generateQuickAddToken(userId: string) {
    const requestId = Date.now().toString();
    
    try {
      console.log(`🔧 [${requestId}] Storage: Generating token for user ${userId}`);
      console.log(`🔧 [${requestId}] User ID type: ${typeof userId}, length: ${userId?.length}`);
      
      const token = randomBytes(32).toString('hex');
      console.log(`🎲 [${requestId}] Generated token: ${token.substring(0, 8)}... (length: ${token.length})`);
      
      // Verify user exists first
      console.log(`🔍 [${requestId}] Verifying user exists before token update...`);
      const existingUser = await db.select().from(users).where(eq(users.id, userId));
      
      if (existingUser.length === 0) {
        console.error(`❌ [${requestId}] User ${userId} not found in database before token update`);
        return null;
      }
      
      console.log(`✅ [${requestId}] User ${userId} found, proceeding with token update...`);
      
      // Update user with new token
      const result = await db.update(users)
        .set({ 
          quickAddToken: token, 
          updatedAt: new Date() 
        })
        .where(eq(users.id, userId))
        .returning();
      
      console.log(`💾 [${requestId}] Database update result:`, {
        resultCount: result.length,
        success: result.length > 0,
        returnedToken: result[0]?.quickAddToken ? `${result[0].quickAddToken.substring(0, 8)}...` : null
      });
      
      if (result.length === 0) {
        console.error(`❌ [${requestId}] No rows updated for user ${userId} - user may not exist`);
        return null;
      }
      
      const returnedToken = result[0]?.quickAddToken;
      
      if (!returnedToken) {
        console.error(`❌ [${requestId}] Token was not saved to database - returned object missing quickAddToken`);
        return null;
      }
      
      if (returnedToken !== token) {
        console.error(`❌ [${requestId}] Token mismatch - generated: ${token.substring(0, 8)}..., returned: ${returnedToken.substring(0, 8)}...`);
        return null;
      }
      
      console.log(`✅ [${requestId}] Token generation successful for user ${userId}`);
      return returnedToken;
      
    } catch (error: any) {
      console.error(`❌ [${requestId}] Storage error in generateQuickAddToken:`, {
        userId,
        message: error.message,
        code: error.code,
        detail: error.detail,
        stack: error.stack?.split('\n').slice(0, 3)
      });
      throw error;
    }
  }

  async updateUserWidgetInfo(userId: string, widgetUrl: string, qrCode: string): Promise<void> {
    try {
      await db.update(users).set({ 
        widgetUrl: widgetUrl, 
        widgetQrCode: qrCode,
        updatedAt: new Date()
      }).where(eq(users.id, userId));
      console.log(`✅ Updated widget info for user ${userId}`);
    } catch (error: any) {
      console.error(`❌ Failed to update widget info for user ${userId}:`, error);
      throw error;
    }
  }

  async resetUserWidget(userId: string): Promise<void> {
    try {
      await db.update(users).set({ 
        widgetUrl: null, 
        widgetQrCode: null,
        quickAddToken: null,
        updatedAt: new Date()
      }).where(eq(users.id, userId));
      console.log(`✅ Reset widget for user ${userId}`);
    } catch (error: any) {
      console.error(`❌ Failed to reset widget for user ${userId}:`, error);
      throw error;
    }
  }

  async authenticateUser(email: string, password: string) {
    const user = await this.getUserByEmail(email);
    if (!user || !user.password) {
      return null;
    }
    
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return null;
    }
    
    return user;
  }

  async createUser(data: {
    id: string;
    email: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    phoneVerified?: boolean;
    tier?: string;
    isAdmin?: boolean;
    isBetaTester?: boolean;
    isAssigned?: boolean;
    hasPaid?: boolean;
    trialEndsAt?: Date | null;
    quickAddToken?: string;
    emailPrefix?: string | null;
    stripeCustomerId?: string | null;
    firebaseUid?: string;
    signupIpAddress?: string;
    deviceFingerprint?: string;
    lastLoginAt?: Date;
    lastLoginIP?: string;
    fraudScore?: number;
    createdAt?: Date;
  }) {
    // Password should already be hashed by caller
    const result = await db.insert(users).values({
      id: data.id,
      email: data.email,
      password: data.password || '',
      firstName: data.firstName,
      lastName: data.lastName,
      phoneNumber: data.phoneNumber,
      phoneVerified: data.phoneVerified || false,
      tier: data.tier || 'free',
      isAdmin: data.isAdmin || false,
      isBetaTester: data.isBetaTester || false,
      isAssigned: data.isAssigned || false,
      hasPaid: data.hasPaid || false,
      trialEndsAt: data.trialEndsAt || null,
      quickAddToken: data.quickAddToken,
      emailPrefix: data.emailPrefix,
      stripeCustomerId: data.stripeCustomerId,
      firebaseUid: data.firebaseUid,
      signupIpAddress: data.signupIpAddress,
      deviceFingerprint: data.deviceFingerprint,
      lastLoginAt: data.lastLoginAt,
      lastLoginIP: data.lastLoginIP,
      fraudScore: data.fraudScore || 0,
      createdAt: data.createdAt || new Date(),
      updatedAt: new Date(),
    }).returning();

    // Seed default email templates for new users
    try {
      const { SettingsStorage } = await import('./settings-storage.js');
      const settingsStorage = new SettingsStorage();
      await settingsStorage.seedDefaultEmailTemplates(data.id);
    } catch (error) {
      console.error(`Failed to seed default templates for user ${data.id}:`, error);
      // Don't fail user creation if template seeding fails
    }

    return result[0];
  }

  async updateUser(id: string, data: Partial<{
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    phoneVerified: boolean;
    tier: string;
    emailPrefix: string;
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    hasPaid: boolean;
    isAdmin: boolean;
    onboardingCompleted: boolean;
  }>) {
    const updateData: any = { ...data, updatedAt: new Date() };
    
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }
    
    const result = await db.update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async setPhoneVerified(phoneNumber: string) {
    const result = await db.update(users)
      .set({ phoneVerified: true, updatedAt: new Date() })
      .where(eq(users.phoneNumber, phoneNumber))
      .returning();
    return result[0];
  }

  async setEmailVerified(email: string) {
    const result = await db.update(users)
      .set({ updatedAt: new Date() })
      .where(eq(users.email, email))
      .returning();
    return result[0];
  }

  async getAllUsers() {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getAllUsersCount() {
    const result = await db.select({ count: sql<number>`count(*)` }).from(users);
    return result[0]?.count || 0;
  }

  async getTotalUserCount() {
    return this.getAllUsersCount();
  }

  // ===== SESSION METHODS =====
  
  async createSession(sid: string, sessionData: any) {
    const result = await db.insert(sessions).values({
      sid,
      sess: sessionData,
      expire: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    }).returning();
    return result[0];
  }

  async getSession(sid: string) {
    const result = await db.select().from(sessions).where(eq(sessions.sid, sid));
    return result[0] || null;
  }

  async updateSession(sid: string, sessionData: any) {
    const result = await db.update(sessions)
      .set({ sess: sessionData })
      .where(eq(sessions.sid, sid))
      .returning();
    return result[0];
  }

  async deleteSession(sid: string) {
    await db.delete(sessions).where(eq(sessions.sid, sid));
  }

  async deleteExpiredSessions() {
    await db.delete(sessions).where(lt(sessions.expire, new Date()));
  }

  // ===== SMS VERIFICATION METHODS =====
  
  async createSmsVerification(email: string, firstName: string, lastName: string, phoneNumber: string, hashedPassword: string, verificationCode: string, expiresAt: Date) {
    // First, clean up any existing verification for this email
    await this.deleteSmsVerification(email);
    
    const result = await db.insert(smsVerifications).values({
      email,
      firstName,
      lastName,
      phoneNumber,
      password: hashedPassword,
      verificationCode,
      expiresAt,
    }).returning();
    return result[0];
  }

  async getSmsVerificationByEmail(email: string) {
    const result = await db.select().from(smsVerifications).where(eq(smsVerifications.email, email));
    return result[0] || null;
  }

  async deleteSmsVerification(email: string) {
    await db.delete(smsVerifications).where(eq(smsVerifications.email, email));
  }

  async deleteExpiredSmsVerifications() {
    const now = new Date();
    const result = await db.delete(smsVerifications).where(lt(smsVerifications.expiresAt, now));
    console.log(`🧹 Cleaned up expired SMS verifications: ${result.rowCount || 0} removed`);
  }

  async updateLoginActivity(userId: string, loginTime: Date, loginIP: string) {
    try {
      await db.update(users)
        .set({
          lastLoginAt: loginTime,
          lastLoginIp: loginIP
        })
        .where(eq(users.id, userId));
      
      console.log(`📍 Updated login activity for user ${userId}: ${loginIP} at ${loginTime.toISOString()}`);
    } catch (error) {
      console.error('❌ Failed to update login activity:', error);
      throw error;
    }
  }

  async lockUser(userId: string, lockedUntil: Date, reason?: string) {
    try {
      await db.update(users)
        .set({
          lockedUntil: lockedUntil
        })
        .where(eq(users.id, userId));
      
      console.log(`🔒 Locked user ${userId} until ${lockedUntil.toISOString()}. Reason: ${reason || 'No reason provided'}`);
    } catch (error) {
      console.error('❌ Failed to lock user:', error);
      throw error;
    }
  }

  async unlockUser(userId: string) {
    try {
      await db.update(users)
        .set({
          lockedUntil: null
        })
        .where(eq(users.id, userId));
      
      console.log(`🔓 Unlocked user ${userId}`);
    } catch (error) {
      console.error('❌ Failed to unlock user:', error);
      throw error;
    }
  }

  async getLockedUsers() {
    try {
      const result = await db.select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        lockedUntil: users.lockedUntil,
        lastLoginAt: users.lastLoginAt,
        lastLoginIp: users.lastLoginIp
      }).from(users).where(sql`locked_until > NOW()`);
      
      return result;
    } catch (error) {
      console.error('❌ Failed to get locked users:', error);
      throw error;
    }
  }
}

export const userStorage = new UserStorage();