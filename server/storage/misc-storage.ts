import { db } from "../core/database";
import { complianceDocuments, clients, conflictResolutions, unparseableMessages } from "../../shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export class MiscStorage {
  private db = db;

  // ===== COMPLIANCE DOCUMENT METHODS =====
  
  async getComplianceDocumentsByUser(userId: string) {
    return await db.select().from(complianceDocuments)
      .where(eq(complianceDocuments.userId, userId))
      .orderBy(desc(complianceDocuments.expiryDate));
  }

  async getComplianceDocument(id: number) {
    const result = await db.select().from(complianceDocuments)
      .where(eq(complianceDocuments.id, id));
    return result[0] || null;
  }

  async createComplianceDocument(data: {
    userId: string;
    type: string;
    name: string;
    expiryDate?: Date;
    status?: string;
    documentUrl?: string;
    cloudStorageKey?: string;
    notes?: string;
  }) {
    const result = await db.insert(complianceDocuments).values({
      ...data,
      status: data.status || 'valid',
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return result[0];
  }

  async updateComplianceDocument(id: number, userId: string, updates: any) {
    const result = await db.update(complianceDocuments)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(
        eq(complianceDocuments.id, id),
        eq(complianceDocuments.userId, userId)
      ))
      .returning();
    
    return result[0];
  }

  async deleteComplianceDocument(id: number, userId: string) {
    const result = await db.delete(complianceDocuments)
      .where(and(
        eq(complianceDocuments.id, id),
        eq(complianceDocuments.userId, userId)
      ))
      .returning();
    return result[0];
  }

  // ===== CLIENT METHODS =====
  
  async getClientsByUser(userId: string) {
    return await db.select().from(clients)
      .where(eq(clients.userId, userId))
      .orderBy(clients.name);
  }

  async getClient(id: number) {
    const result = await db.select().from(clients)
      .where(eq(clients.id, id));
    return result[0] || null;
  }

  async createClient(data: {
    userId: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    notes?: string;
  }) {
    const result = await db.insert(clients).values({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return result[0];
  }

  async updateClient(id: number, userId: string, updates: any) {
    const result = await db.update(clients)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(
        eq(clients.id, id),
        eq(clients.userId, userId)
      ))
      .returning();
    
    return result[0];
  }

  async deleteClient(id: number, userId: string) {
    const result = await db.delete(clients)
      .where(and(
        eq(clients.id, id),
        eq(clients.userId, userId)
      ))
      .returning();
    return result[0];
  }

  // ===== CONFLICT RESOLUTION METHODS =====
  
  async createConflictResolution(data: {
    userId: string;
    bookingIds: number[];
    resolutionType: string;
    resolvedBy: string;
    notes?: string;
  }) {
    const sortedIds = [...data.bookingIds].sort((a, b) => a - b);
    
    const result = await db.insert(conflictResolutions).values({
      userId: data.userId,
      bookingIds: JSON.stringify(sortedIds),
      conflictDate: new Date(),
      resolutionType: data.resolutionType,
      resolvedAt: new Date(),
      resolvedBy: data.resolvedBy,
      notes: data.notes,
      createdAt: new Date()
    }).returning();
    return result[0];
  }

  async getConflictResolution(userId: string, bookingIds: number[]) {
    const sortedIds = [...bookingIds].sort((a, b) => a - b);
    const sortedIdsString = JSON.stringify(sortedIds);
    
    const result = await db.select().from(conflictResolutions)
      .where(and(
        eq(conflictResolutions.userId, userId),
        eq(conflictResolutions.bookingIds, sortedIdsString)
      ));
    return result[0] || null;
  }

  async getConflictResolutions(userId: string) {
    return await db.select().from(conflictResolutions)
      .where(eq(conflictResolutions.userId, userId))
      .orderBy(desc(conflictResolutions.resolvedAt));
  }

  async saveConflictResolution(data: {
    userId: string;
    bookingIds: string;
    resolution?: string;
    notes?: string;
    resolvedAt: string;
  }) {
    const result = await db.insert(conflictResolutions).values({
      userId: data.userId,
      bookingIds: data.bookingIds,
      conflictDate: new Date(),
      resolvedAt: new Date(data.resolvedAt),
      resolvedBy: data.userId,
      notes: data.notes || 'Conflict resolved via UI',
      createdAt: new Date()
    }).returning();
    return result[0];
  }

  async deleteConflictResolution(userId: string, bookingIds: number[]) {
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

  // ===== UNPARSEABLE MESSAGES METHODS =====
  
  async createUnparseableMessage(data: {
    userId: string;
    source: string;
    fromContact?: string;
    rawMessage: string;
    clientAddress?: string;
    messageType?: string;
    parsingErrorDetails?: string;
  }) {
    const result = await db.insert(unparseableMessages).values({
      ...data,
      messageType: data.messageType || 'general',
      createdAt: new Date()
    }).returning();
    return result[0];
  }

  async getUnparseableMessages(userId: string) {
    return await db.select().from(unparseableMessages)
      .where(eq(unparseableMessages.userId, userId))
      .orderBy(desc(unparseableMessages.createdAt));
  }

  async getUnparseableMessage(id: number) {
    const result = await db.select().from(unparseableMessages)
      .where(eq(unparseableMessages.id, id));
    return result[0] || null;
  }

  async updateUnparseableMessage(id: number, updates: {
    status?: string;
    reviewNotes?: string;
    convertedToBookingId?: number;
  }) {
    const result = await db.update(unparseableMessages)
      .set({ 
        ...updates, 
        reviewedAt: new Date() 
      })
      .where(eq(unparseableMessages.id, id))
      .returning();
    return result[0];
  }

  async deleteUnparseableMessage(id: number) {
    const result = await db.delete(unparseableMessages)
      .where(eq(unparseableMessages.id, id))
      .returning();
    return result[0];
  }
}

export const miscStorage = new MiscStorage();