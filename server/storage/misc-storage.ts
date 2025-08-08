import { db } from "../core/database";
import { complianceDocuments, clients, conflictResolutions, unparseableMessages } from "../../shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

interface ComplianceDocumentData {
  userId: string;
  type: string;
  name: string;
  expiryDate?: Date;
  status?: string;
  documentUrl?: string;
  cloudStorageKey?: string;
  notes?: string;
}

interface ComplianceDocumentUpdate {
  type?: string;
  name?: string;
  expiryDate?: Date;
  status?: string;
  documentUrl?: string;
  cloudStorageKey?: string;
  notes?: string;
}

interface ClientData {
  userId: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

interface ClientUpdate {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

interface ConflictResolutionData {
  userId: string;
  bookingIds: number[];
  resolutionType: string;
  resolvedBy: string;
  notes?: string;
}

interface UnparseableMessageData {
  userId: string;
  source: string;
  fromContact?: string;
  rawMessage: string;
  clientAddress?: string;
  messageType?: string;
  parsingErrorDetails?: string;
}

interface UnparseableMessageUpdate {
  status?: string;
  reviewNotes?: string;
  convertedToBookingId?: number;
}

export class MiscStorage {
  private db = db;

  // ==== COMPLIANCE DOCUMENT METHODS ====
  
  async getComplianceDocumentsByUser(userId: string): Promise<any[]> {
    return await db.select().from(complianceDocuments)
      .where(eq(complianceDocuments.userId, userId))
      .orderBy(desc(complianceDocuments.expiryDate));
  }

  async getComplianceDocument(id: number): Promise<any | null> {
    const result = await db.select().from(complianceDocuments)
      .where(eq(complianceDocuments.id, id));
    return result[0] || null;
  }

  async createComplianceDocument(data: ComplianceDocumentData): Promise<any> {
    const result = await db.insert(complianceDocuments).values({
      ...data,
      status: data.status || 'valid',
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return result[0];
  }

  async updateComplianceDocument(id: number, userId: string, updates: ComplianceDocumentUpdate): Promise<any> {
    const result = await db.update(complianceDocuments)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(
        eq(complianceDocuments.id, id),
        eq(complianceDocuments.userId, userId)
      ))
      .returning();
    
    return result[0];
  }

  async deleteComplianceDocument(id: number, userId: string): Promise<any> {
    const result = await db.delete(complianceDocuments)
      .where(and(
        eq(complianceDocuments.id, id),
        eq(complianceDocuments.userId, userId)
      ))
      .returning();
    return result[0];
  }

  // ==== CLIENT METHODS ====
  
  async getClientsByUser(userId: string): Promise<any[]> {
    return await db.select().from(clients)
      .where(eq(clients.userId, userId))
      .orderBy(clients.name);
  }

  async getClient(id: number): Promise<any | null> {
    const result = await db.select().from(clients)
      .where(eq(clients.id, id));
    return result[0] || null;
  }

  async createClient(data: ClientData): Promise<any> {
    const result = await db.insert(clients).values({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return result[0];
  }

  async updateClient(id: number, userId: string, updates: ClientUpdate): Promise<any> {
    const result = await db.update(clients)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(
        eq(clients.id, id),
        eq(clients.userId, userId)
      ))
      .returning();
    
    return result[0];
  }

  async deleteClient(id: number, userId: string): Promise<any> {
    const result = await db.delete(clients)
      .where(and(
        eq(clients.id, id),
        eq(clients.userId, userId)
      ))
      .returning();
    return result[0];
  }

  // ==== CONFLICT RESOLUTION METHODS ====
  
  async createConflictResolution(data: ConflictResolutionData): Promise<any> {
    const sortedIds = [...data.bookingIds].sort((a, b) => a - b);
    
    const result = await db.insert(conflictResolutions).values({
      userId: data.userId,
      bookingIds: JSON.stringify(sortedIds),
      conflictDate: new Date(),
      resolvedBy: data.resolvedBy,
      notes: data.notes,
    }).returning();
    return result[0];
  }

  async getConflictResolution(userId: string, bookingIds: number[]): Promise<any | null> {
    const sortedIds = [...bookingIds].sort((a, b) => a - b);
    const sortedIdsString = JSON.stringify(sortedIds);
    
    const result = await db.select().from(conflictResolutions)
      .where(and(
        eq(conflictResolutions.userId, userId),
        eq(conflictResolutions.bookingIds, sortedIdsString)
      ));
    return result[0] || null;
  }

  async getConflictResolutions(userId: string): Promise<any[]> {
    return await db.select().from(conflictResolutions)
      .where(eq(conflictResolutions.userId, userId))
      .orderBy(desc(conflictResolutions.resolvedAt));
  }

  async deleteConflictResolution(userId: string, bookingIds: number[]): Promise<any> {
    const sortedIds = [...bookingIds].sort((a, b) => a - b);
    const sortedIdsString = JSON.stringify(sortedIds);
    
    const result = await db.delete(conflictResolutions)
      .where(and(
        eq(conflictResolutions.userId, userId),
        eq(conflictResolutions.bookingIds, sortedIdsString)
      ))
      .returning();
    return result[0];
  }

  // ==== UNPARSEABLE MESSAGES METHODS ====
  
  async createUnparseableMessage(data: UnparseableMessageData): Promise<any> {
    const result = await db.insert(unparseableMessages).values({
      ...data,
      messageType: data.messageType || 'general',
      createdAt: new Date()
    }).returning();
    return result[0];
  }

  async getUnparseableMessages(userId: string): Promise<any[]> {
    return await db.select().from(unparseableMessages)
      .where(eq(unparseableMessages.userId, userId))
      .orderBy(desc(unparseableMessages.createdAt));
  }

  async getUnparseableMessage(id: number): Promise<any | null> {
    const result = await db.select().from(unparseableMessages)
      .where(eq(unparseableMessages.id, id));
    return result[0] || null;
  }

  async updateUnparseableMessage(id: number, updates: UnparseableMessageUpdate): Promise<any> {
    const result = await db.update(unparseableMessages)
      .set({ 
        ...updates, 
        reviewedAt: new Date() 
      })
      .where(eq(unparseableMessages.id, id))
      .returning();
    return result[0];
  }

  async deleteUnparseableMessage(id: number): Promise<any> {
    const result = await db.delete(unparseableMessages)
      .where(eq(unparseableMessages.id, id))
      .returning();
    return result[0];
  }
}

export const miscStorage = new MiscStorage();