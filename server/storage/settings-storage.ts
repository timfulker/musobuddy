import { db } from "../core/database";
import { userSettings, emailTemplates, globalGigTypes } from "../../shared/schema";
import { eq, and, desc } from "drizzle-orm";

export class SettingsStorage {
  private db = db;

  // ===== USER SETTINGS METHODS =====
  
  async getSettings(userId: string) {
    const result = await db.select().from(userSettings)
      .where(eq(userSettings.userId, userId));
    return result[0] || null;
  }

  async createSettings(data: {
    userId: string;
    businessName?: string;
    businessAddress?: string;
    businessPhone?: string;
    businessEmail?: string;
    businessWebsite?: string;
    businessBio?: string;
    logoUrl?: string;
    bankDetails?: any;
    notificationPreferences?: any;
  }) {
    const result = await db.insert(userSettings).values({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return result[0];
  }

  async updateSettings(userId: string, updates: any) {
    const existing = await this.getSettings(userId);
    
    if (!existing) {
      return await this.createSettings({ userId, ...updates });
    }

    const result = await db.update(userSettings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userSettings.userId, userId))
      .returning();
    
    return result[0];
  }

  // ===== EMAIL TEMPLATE METHODS =====
  
  async getEmailTemplates(userId: string) {
    return await db.select().from(emailTemplates)
      .where(eq(emailTemplates.userId, userId))
      .orderBy(emailTemplates.type);
  }

  async getEmailTemplate(userId: string, type: string) {
    const result = await db.select().from(emailTemplates)
      .where(and(
        eq(emailTemplates.userId, userId),
        eq(emailTemplates.type, type)
      ));
    return result[0] || null;
  }

  async createEmailTemplate(data: {
    userId: string;
    type: string;
    name: string;
    subject: string;
    body: string;
    variables?: any;
  }) {
    const result = await db.insert(emailTemplates).values({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return result[0];
  }

  async updateEmailTemplate(id: number, userId: string, updates: any) {
    const result = await db.update(emailTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(
        eq(emailTemplates.id, id),
        eq(emailTemplates.userId, userId)
      ))
      .returning();
    
    return result[0];
  }

  async deleteEmailTemplate(id: number, userId: string) {
    const result = await db.delete(emailTemplates)
      .where(and(
        eq(emailTemplates.id, id),
        eq(emailTemplates.userId, userId)
      ))
      .returning();
    return result[0];
  }

  // ===== GLOBAL GIG TYPES METHODS =====
  
  async getGlobalGigTypes(userId: string) {
    const result = await db.select().from(globalGigTypes)
      .where(eq(globalGigTypes.userId, userId));
    
    if (result[0]) {
      try {
        return JSON.parse(result[0].gigTypes);
      } catch {
        return [];
      }
    }
    return [];
  }

  async setGlobalGigTypes(userId: string, gigTypes: string[]) {
    const gigTypesJson = JSON.stringify(gigTypes);
    
    const existing = await db.select().from(globalGigTypes)
      .where(eq(globalGigTypes.userId, userId));
    
    if (existing[0]) {
      const result = await db.update(globalGigTypes)
        .set({ 
          gigTypes: gigTypesJson,
          updatedAt: new Date()
        })
        .where(eq(globalGigTypes.userId, userId))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(globalGigTypes).values({
        userId,
        gigTypes: gigTypesJson,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      return result[0];
    }
  }

  async getAllUserSettingsForGigTypes() {
    const result = await db.select({
      userId: userSettings.userId,
      gigTypes: userSettings.gigTypes,
    }).from(userSettings);

    return result.map(row => ({
      userId: row.userId,
      gigTypes: row.gigTypes || []
    }));
  }
}

export const settingsStorage = new SettingsStorage();