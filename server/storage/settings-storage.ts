import { db } from "../core/database";
import { userSettings, emailTemplates, globalGigTypes } from "../../shared/schema";
import { eq, and, desc } from "drizzle-orm";

interface UserSettingsData {
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
  gigTypes?: string[];
  defaultTheme?: string;
  nextInvoiceNumber?: number;
  defaultInvoiceDueDays?: number;
  emailSignature?: string;
  paymentInstructions?: string;
}

interface EmailTemplateData {
  userId: string;
  type: string;
  name: string;
  subject: string;
  body: string;
  variables?: any;
}

interface UserSettingsUpdate {
  businessName?: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  businessWebsite?: string;
  businessBio?: string;
  logoUrl?: string;
  bankDetails?: any;
  notificationPreferences?: any;
  gigTypes?: string[];
  defaultTheme?: string;
  nextInvoiceNumber?: number;
  defaultInvoiceDueDays?: number;
  emailSignature?: string;
  paymentInstructions?: string;
}

interface EmailTemplateUpdate {
  type?: string;
  name?: string;
  subject?: string;
  body?: string;
  variables?: any;
}

export class SettingsStorage {
  private db = db;

  // ==== USER SETTINGS METHODS ====
  
  async getSettings(userId: string): Promise<any | null> {
    const result = await db.select().from(userSettings)
      .where(eq(userSettings.userId, userId));
    return result[0] || null;
  }

  async createSettings(data: UserSettingsData): Promise<any> {
    const result = await db.insert(userSettings).values({
      ...data,
    }).returning();
    return result[0];
  }

  async updateSettings(userId: string, updates: UserSettingsUpdate): Promise<any> {
    const existing = await this.getSettings(userId);
    
    if (!existing) {
      return await this.createSettings({ userId, ...updates });
    }

    const result = await db.update(userSettings)
      .set(updates)
      .where(eq(userSettings.userId, userId))
      .returning();
    
    return result[0];
  }

  // ==== EMAIL TEMPLATE METHODS ====
  
  async getEmailTemplates(userId: string): Promise<any[]> {
    return await db.select().from(emailTemplates)
      .where(eq(emailTemplates.userId, userId));
  }

  async getEmailTemplate(userId: string, name: string): Promise<any | null> {
    const result = await db.select().from(emailTemplates)
      .where(and(
        eq(emailTemplates.userId, userId),
        eq(emailTemplates.name, name)
      ));
    return result[0] || null;
  }

  async createEmailTemplate(data: EmailTemplateData): Promise<any> {
    const result = await db.insert(emailTemplates).values({
      userId: data.userId,
      name: data.name,
      subject: data.subject,
      emailBody: data.body,
      smsBody: data.variables?.smsBody,
    }).returning();
    return result[0];
  }

  async updateEmailTemplate(id: number, userId: string, updates: EmailTemplateUpdate): Promise<any> {
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.subject !== undefined) updateData.subject = updates.subject;
    if (updates.body !== undefined) updateData.emailBody = updates.body;
    if (updates.variables?.smsBody !== undefined) updateData.smsBody = updates.variables.smsBody;
    
    const result = await db.update(emailTemplates)
      .set(updateData)
      .where(and(
        eq(emailTemplates.id, id),
        eq(emailTemplates.userId, userId)
      ))
      .returning();
    
    return result[0];
  }

  async deleteEmailTemplate(id: number, userId: string): Promise<any> {
    const result = await db.delete(emailTemplates)
      .where(and(
        eq(emailTemplates.id, id),
        eq(emailTemplates.userId, userId)
      ))
      .returning();
    return result[0];
  }

  // ==== GLOBAL GIG TYPES METHODS ====
  
  async getGlobalGigTypes(userId: string): Promise<string[]> {
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

  async setGlobalGigTypes(userId: string, gigTypes: string[]): Promise<any> {
    const gigTypesJson = JSON.stringify(gigTypes);
    
    const existing = await db.select().from(globalGigTypes)
      .where(eq(globalGigTypes.userId, userId));
    
    if (existing[0]) {
      const result = await db.update(globalGigTypes)
        .set({ gigTypes: gigTypesJson })
        .where(eq(globalGigTypes.userId, userId))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(globalGigTypes).values({
        userId,
        gigTypes: gigTypesJson,
      }).returning();
      return result[0];
    }
  }

  async getAllUserSettingsForGigTypes(): Promise<Array<{ userId: string; gigTypes: string[] }>> {
    const result = await db.select({
      userId: userSettings.userId,
      gigTypes: userSettings.gigTypes,
    }).from(userSettings);

    return result.map(row => ({
      userId: row.userId,
      gigTypes: typeof row.gigTypes === 'string' ? JSON.parse(row.gigTypes) : (row.gigTypes || [])
    }));
  }
}

export const settingsStorage = new SettingsStorage();