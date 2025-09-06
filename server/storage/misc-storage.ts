import { db } from "../core/database";
import { complianceDocuments, clients, conflictResolutions, unparseableMessages, messageNotifications, googleCalendarIntegration, eventSyncMapping, bookings, betaInvites, betaInviteCodes } from "../../shared/schema";
import { eq, and, desc, sql, lte, gte, ne } from "drizzle-orm";

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
    subject?: string;
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
      .where(and(
        eq(unparseableMessages.userId, userId),
        ne(unparseableMessages.status, 'converted')  // Filter out converted messages
      ))
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

  // ===== GOOGLE CALENDAR INTEGRATION METHODS =====

  async saveGoogleCalendarIntegration(userId: string, data: {
    googleRefreshToken: string;
    googleCalendarId?: string;
    syncEnabled?: boolean;
    autoSyncBookings?: boolean;
    autoImportEvents?: boolean;
    syncDirection?: string;
  }) {
    const result = await db.insert(googleCalendarIntegration).values({
      userId,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return result[0];
  }

  async getGoogleCalendarIntegration(userId: string) {
    const result = await db.select().from(googleCalendarIntegration)
      .where(eq(googleCalendarIntegration.userId, userId));
    return result[0] || null;
  }

  async getGoogleCalendarIntegrationByChannelId(channelId: string) {
    const result = await db.select().from(googleCalendarIntegration)
      .where(eq(googleCalendarIntegration.webhookChannelId, channelId));
    return result[0] || null;
  }

  async updateGoogleCalendarIntegration(userId: string, updates: {
    syncEnabled?: boolean;
    lastSyncAt?: Date;
    syncToken?: string;
    webhookChannelId?: string;
    webhookExpiration?: Date;
    autoSyncBookings?: boolean;
    autoImportEvents?: boolean;
    syncDirection?: string;
  }) {
    const result = await db.update(googleCalendarIntegration)
      .set({ 
        ...updates, 
        updatedAt: new Date() 
      })
      .where(eq(googleCalendarIntegration.userId, userId))
      .returning();
    return result[0];
  }

  async deleteGoogleCalendarIntegration(userId: string) {
    const result = await db.delete(googleCalendarIntegration)
      .where(eq(googleCalendarIntegration.userId, userId))
      .returning();
    return result[0];
  }

  async saveEventSyncMapping(userId: string, data: {
    musobuddyId: number;
    musobuddyType: string;
    googleEventId: string;
    googleCalendarId?: string;
    syncDirection: string;
  }) {
    const result = await db.insert(eventSyncMapping).values({
      userId,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return result[0];
  }

  async getEventSyncMapping(userId: string, musobuddyId: number, musobuddyType: string) {
    const result = await db.select().from(eventSyncMapping)
      .where(and(
        eq(eventSyncMapping.userId, userId),
        eq(eventSyncMapping.musobuddyId, musobuddyId),
        eq(eventSyncMapping.musobuddyType, musobuddyType)
      ));
    return result[0] || null;
  }

  async getEventSyncMappingByGoogleId(userId: string, googleEventId: string) {
    const result = await db.select().from(eventSyncMapping)
      .where(and(
        eq(eventSyncMapping.userId, userId),
        eq(eventSyncMapping.googleEventId, googleEventId)
      ));
    return result[0] || null;
  }

  async deleteEventSyncMapping(id: number) {
    const result = await db.delete(eventSyncMapping)
      .where(eq(eventSyncMapping.id, id))
      .returning();
    return result[0];
  }

  async deleteEventSyncMappings(userId: string) {
    const result = await db.delete(eventSyncMapping)
      .where(eq(eventSyncMapping.userId, userId))
      .returning();
    return result;
  }

  // ===== NOTIFICATION COUNT METHODS =====
  
  async getUnparseableMessagesCount(userId: string) {
    // Count only 'new' unparseable messages that need attention
    const result = await db
      .select({ count: sql<string>`count(*)` })
      .from(unparseableMessages)
      .where(
        and(
          eq(unparseableMessages.userId, userId),
          eq(unparseableMessages.status, 'new')
        )
      );
    
    return parseInt(result[0]?.count || '0', 10);
  }


  // ===== MESSAGE NOTIFICATION METHODS =====

  async createMessageNotification(data: {
    userId: string;
    bookingId: number;
    senderEmail: string;
    subject: string;
    messageUrl: string;
  }) {
    const result = await db.insert(messageNotifications).values({
      ...data,
      isRead: false,
      createdAt: new Date()
    }).returning();
    return result[0];
  }

  async getMessageNotifications(userId: string, isRead?: boolean) {
    // Always exclude dismissed messages from the notifications view
    const baseConditions = [
      eq(messageNotifications.userId, userId),
      eq(messageNotifications.isDismissed, false)
    ];
    
    const whereClause = isRead !== undefined
      ? and(...baseConditions, eq(messageNotifications.isRead, isRead))
      : and(...baseConditions);

    const result = await db.select({
      id: messageNotifications.id,
      userId: messageNotifications.userId,
      bookingId: messageNotifications.bookingId,
      senderEmail: messageNotifications.senderEmail,
      subject: messageNotifications.subject,
      messageUrl: messageNotifications.messageUrl,
      isRead: messageNotifications.isRead,
      createdAt: messageNotifications.createdAt,
      // Join booking data
      clientName: bookings.clientName,
      eventDate: bookings.eventDate,
      venue: bookings.venue
    })
    .from(messageNotifications)
    .leftJoin(bookings, eq(messageNotifications.bookingId, bookings.id))
    .where(whereClause)
    .orderBy(desc(messageNotifications.createdAt));
    return result;
  }

  async getUnreadMessageNotificationsCount(userId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(messageNotifications)
      .where(and(
        eq(messageNotifications.userId, userId),
        eq(messageNotifications.isRead, false)
      ));
    // Ensure we return a number, not a string
    return parseInt(String(result[0]?.count || 0), 10);
  }

  async markMessageNotificationAsRead(id: number) {
    const result = await db.update(messageNotifications)
      .set({ isRead: true })
      .where(eq(messageNotifications.id, id))
      .returning();
    return result[0];
  }

  async markAllBookingMessageNotificationsAsRead(bookingId: number, userId: string) {
    const result = await db.update(messageNotifications)
      .set({ isRead: true })
      .where(and(
        eq(messageNotifications.bookingId, bookingId),
        eq(messageNotifications.userId, userId),
        eq(messageNotifications.isRead, false)
      ))
      .returning();
    return result;
  }

  async dismissMessageNotification(id: number) {
    const result = await db.update(messageNotifications)
      .set({ isDismissed: true })
      .where(eq(messageNotifications.id, id))
      .returning();
    return result[0];
  }

  async deleteMessageNotification(id: number) {
    const result = await db.delete(messageNotifications)
      .where(eq(messageNotifications.id, id))
      .returning();
    return result[0];
  }

  // ===== BETA INVITE METHODS =====

  async getBetaInviteByEmail(email: string) {
    const result = await db.select().from(betaInvites)
      .where(eq(betaInvites.email, email.toLowerCase()));
    return result[0] || null;
  }

  async createBetaInvite(data: {
    email: string;
    invitedBy: string;
    notes?: string;
    cohort?: string;
  }) {
    const result = await db.insert(betaInvites).values({
      email: data.email.toLowerCase(),
      invitedBy: data.invitedBy,
      notes: data.notes || null,
      cohort: data.cohort || '2025_beta',
      status: 'pending'
    }).returning();
    return result[0];
  }

  async markBetaInviteAsUsed(email: string, usedBy: string) {
    const result = await db.update(betaInvites)
      .set({ 
        status: 'used',
        usedAt: new Date(),
        usedBy: usedBy
      })
      .where(eq(betaInvites.email, email.toLowerCase()))
      .returning();
    return result[0];
  }

  async getAllBetaInvites() {
    return await db.select().from(betaInvites)
      .orderBy(desc(betaInvites.invitedAt));
  }

  async deleteBetaInvite(email: string) {
    const result = await db.delete(betaInvites)
      .where(eq(betaInvites.email, email.toLowerCase()))
      .returning();
    return result[0];
  }

  // ===== BETA INVITE CODE METHODS =====

  async createBetaInviteCode(data: {
    code: string;
    maxUses?: number;
    trialDays?: number;
    description?: string;
    createdBy: string;
    expiresAt?: Date;
  }) {
    const result = await db.insert(betaInviteCodes).values({
      code: data.code.toUpperCase(),
      maxUses: data.maxUses || 1,
      trialDays: data.trialDays || 365,
      description: data.description || null,
      createdBy: data.createdBy,
      expiresAt: data.expiresAt || null,
      status: 'active',
      currentUses: 0
    }).returning();
    return result[0];
  }

  async getBetaInviteCodeByCode(code: string) {
    const result = await db.select().from(betaInviteCodes)
      .where(eq(betaInviteCodes.code, code.toUpperCase()));
    return result[0] || null;
  }

  async getAllBetaInviteCodes() {
    return await db.select().from(betaInviteCodes)
      .orderBy(desc(betaInviteCodes.createdAt));
  }

  async markBetaInviteCodeAsUsed(code: string, usedBy: string) {
    // First get the current code
    const currentCode = await this.getBetaInviteCodeByCode(code);
    if (!currentCode) return null;

    const result = await db.update(betaInviteCodes)
      .set({ 
        currentUses: currentCode.currentUses + 1,
        lastUsedAt: new Date(),
        lastUsedBy: usedBy
      })
      .where(eq(betaInviteCodes.code, code.toUpperCase()))
      .returning();
    return result[0];
  }

  async updateBetaInviteCode(id: number, updates: {
    status?: string;
    maxUses?: number;
    trialDays?: number;
    description?: string;
    expiresAt?: Date;
  }) {
    const result = await db.update(betaInviteCodes)
      .set(updates)
      .where(eq(betaInviteCodes.id, id))
      .returning();
    return result[0];
  }

  async deleteBetaInviteCode(id: number) {
    const result = await db.delete(betaInviteCodes)
      .where(eq(betaInviteCodes.id, id))
      .returning();
    return result[0];
  }

}

export const miscStorage = new MiscStorage();