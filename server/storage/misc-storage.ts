import { db } from "../core/database";
import { complianceDocuments, clients, conflictResolutions, unparseableMessages, messageNotifications, googleCalendarIntegration, eventSyncMapping, bookings, betaInvites, betaInviteCodes, betaEmailTemplates, emailDeliveryFailures, suppressedEmails } from "../../shared/schema";
import { eq, and, desc, sql, lte, gte, ne, isNull } from "drizzle-orm";

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
    console.log('🔍 [MISC-STORAGE] getUnparseableMessages called for user:', userId);
    console.log('🔍 [MISC-STORAGE] Database connection info:', {
      NODE_ENV: process.env.NODE_ENV,
      REPLIT_DEPLOYMENT: process.env.REPLIT_DEPLOYMENT,
      dbConfigured: !!db
    });

    try {
      // First, check total messages for debugging
      const totalForUser = await db.select().from(unparseableMessages)
        .where(eq(unparseableMessages.userId, userId));

      console.log('🔍 [MISC-STORAGE] Total messages for user:', totalForUser.length);

      const result = await db.select().from(unparseableMessages)
        .where(and(
          eq(unparseableMessages.userId, userId),
          ne(unparseableMessages.status, 'converted')  // Filter out converted messages
        ))
        .orderBy(desc(unparseableMessages.createdAt));

      console.log('🔍 [MISC-STORAGE] After filtering converted, found', result?.length || 0, 'messages');

      if (totalForUser.length > 0) {
        const statuses = totalForUser.map(m => ({ id: m.id, status: m.status }));
        console.log('🔍 [MISC-STORAGE] All message statuses:', statuses);
      }

      if (result && result.length > 0) {
        console.log('🔍 [MISC-STORAGE] Returned message IDs:', result.slice(0, 3).map(m => m.id));
      }

      return result;
    } catch (error) {
      console.error('❌ [MISC-STORAGE] Database query failed:', error);
      throw error;
    }
  }

  async getUnparseableMessage(id: number) {
    const result = await db.select().from(unparseableMessages)
      .where(eq(unparseableMessages.id, id));
    return result[0] || null;
  }

  // TEMPORARY DEBUG METHOD - Get ALL unparseable messages without filtering
  async getAllUnparseableMessagesDebug(userId: string) {
    const result = await db.select().from(unparseableMessages)
      .where(eq(unparseableMessages.userId, userId))
      .orderBy(desc(unparseableMessages.createdAt));
    return result;
  }

  // CLEANUP METHOD - Remove orphaned converted messages (status='converted' but no booking exists)
  async cleanupOrphanedUnparseableMessages(userId: string) {
    // Delete messages that are marked as 'converted' but have no booking associated
    // (either converted_to_booking_id is null, or the booking doesn't exist)
    const result = await db.delete(unparseableMessages)
      .where(and(
        eq(unparseableMessages.userId, userId),
        eq(unparseableMessages.status, 'converted'),
        isNull(unparseableMessages.convertedToBookingId)
      ))
      .returning({ id: unparseableMessages.id });

    console.log(`🧹 Cleaned up ${result.length} orphaned unparseable messages for user ${userId}`);
    return result.length;
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
    // Count 'pending' unparseable messages that need attention (not 'reviewed', 'converted', or 'discarded')
    const result = await db
      .select({ count: sql<string>`count(*)` })
      .from(unparseableMessages)
      .where(
        and(
          eq(unparseableMessages.userId, userId),
          eq(unparseableMessages.status, 'pending')
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

  async getAllMessageNotificationsForBooking(userId: string, bookingId: number) {
    // Get ALL notifications for a specific booking (including dismissed ones for conversation view)
    const result = await db.select({
      id: messageNotifications.id,
      userId: messageNotifications.userId,
      bookingId: messageNotifications.bookingId,
      senderEmail: messageNotifications.senderEmail,
      subject: messageNotifications.subject,
      messageUrl: messageNotifications.messageUrl,
      isRead: messageNotifications.isRead,
      isDismissed: messageNotifications.isDismissed,
      createdAt: messageNotifications.createdAt,
      // Join booking data
      clientName: bookings.clientName,
      eventDate: bookings.eventDate,
      venue: bookings.venue
    })
    .from(messageNotifications)
    .leftJoin(bookings, eq(messageNotifications.bookingId, bookings.id))
    .where(and(
      eq(messageNotifications.userId, userId),
      eq(messageNotifications.bookingId, bookingId)
    ))
    .orderBy(desc(messageNotifications.createdAt));
    return result;
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
    console.log('🔍 [MISC-STORAGE] getBetaInviteCodeByCode called with:', {
      code,
      upperCaseCode: code.toUpperCase()
    });

    const result = await db.select().from(betaInviteCodes)
      .where(eq(betaInviteCodes.code, code.toUpperCase()));

    console.log('🔍 [MISC-STORAGE] getBetaInviteCodeByCode result:', {
      found: result.length > 0,
      result: result[0] || null
    });

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

  async incrementBetaInviteCodeUsage(code: string) {
    // Get the current code
    const currentCode = await this.getBetaInviteCodeByCode(code);
    if (!currentCode) return null;

    // Increment the usage count
    const result = await db.update(betaInviteCodes)
      .set({
        currentUses: currentCode.currentUses + 1,
        lastUsedAt: new Date()
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

  // ===== BETA EMAIL TEMPLATE METHODS =====

  async createBetaEmailTemplate(data: {
    name: string;
    description?: string;
    subject: string;
    htmlBody: string;
    textBody: string;
    isActive?: boolean;
    createdBy: string;
  }) {
    // If this template is being set as active, deactivate all others first
    if (data.isActive) {
      await db.update(betaEmailTemplates)
        .set({ isActive: false });
    }

    const result = await db.insert(betaEmailTemplates).values({
      name: data.name,
      description: data.description || null,
      subject: data.subject,
      htmlBody: data.htmlBody,
      textBody: data.textBody,
      isActive: data.isActive ?? false,
      createdBy: data.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return result[0];
  }

  async getActiveBetaEmailTemplate() {
    const result = await db.select().from(betaEmailTemplates)
      .where(eq(betaEmailTemplates.isActive, true));
    return result[0] || null;
  }

  async getBetaEmailTemplateById(id: number) {
    const result = await db.select().from(betaEmailTemplates)
      .where(eq(betaEmailTemplates.id, id));
    return result[0] || null;
  }

  async getAllBetaEmailTemplates() {
    return await db.select().from(betaEmailTemplates)
      .orderBy(desc(betaEmailTemplates.updatedAt));
  }

  async updateBetaEmailTemplate(id: number, updates: {
    name?: string;
    description?: string;
    subject?: string;
    htmlBody?: string;
    textBody?: string;
    isActive?: boolean;
  }) {
    // If setting this template as active, deactivate all others first
    if (updates.isActive === true) {
      await db.update(betaEmailTemplates)
        .set({ isActive: false });
    }

    const result = await db.update(betaEmailTemplates)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(betaEmailTemplates.id, id))
      .returning();
    return result[0];
  }

  async deleteBetaEmailTemplate(id: number) {
    const result = await db.delete(betaEmailTemplates)
      .where(eq(betaEmailTemplates.id, id))
      .returning();
    return result[0];
  }

  // ===== EMAIL DELIVERY FAILURE METHODS =====

  /**
   * Create a new email delivery failure record
   */
  async createEmailDeliveryFailure(data: {
    userId: string;
    bookingId?: number;
    communicationId?: number;
    recipientEmail: string;
    recipientName?: string;
    emailType: string;
    subject?: string;
    failureType: string;
    failureReason?: string;
    provider?: string;
    providerMessageId?: string;
    priority?: string;
  }) {
    const result = await db.insert(emailDeliveryFailures).values({
      userId: data.userId,
      bookingId: data.bookingId || null,
      communicationId: data.communicationId || null,
      recipientEmail: data.recipientEmail.toLowerCase(),
      recipientName: data.recipientName || null,
      emailType: data.emailType,
      subject: data.subject || null,
      failureType: data.failureType,
      failureReason: data.failureReason || null,
      provider: data.provider || null,
      providerMessageId: data.providerMessageId || null,
      retryCount: 0,
      resolved: false,
      priority: data.priority || 'medium',
      notifiedUser: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return result[0];
  }

  /**
   * Get unresolved email failures for a user
   */
  async getUnresolvedEmailFailures(userId: string) {
    const result = await db.select({
      id: emailDeliveryFailures.id,
      userId: emailDeliveryFailures.userId,
      bookingId: emailDeliveryFailures.bookingId,
      communicationId: emailDeliveryFailures.communicationId,
      recipientEmail: emailDeliveryFailures.recipientEmail,
      recipientName: emailDeliveryFailures.recipientName,
      emailType: emailDeliveryFailures.emailType,
      subject: emailDeliveryFailures.subject,
      failureType: emailDeliveryFailures.failureType,
      failureReason: emailDeliveryFailures.failureReason,
      provider: emailDeliveryFailures.provider,
      retryCount: emailDeliveryFailures.retryCount,
      priority: emailDeliveryFailures.priority,
      createdAt: emailDeliveryFailures.createdAt,
      // Join booking data if available
      clientName: bookings.clientName,
      eventDate: bookings.eventDate,
      venue: bookings.venue
    })
    .from(emailDeliveryFailures)
    .leftJoin(bookings, eq(emailDeliveryFailures.bookingId, bookings.id))
    .where(and(
      eq(emailDeliveryFailures.userId, userId),
      eq(emailDeliveryFailures.resolved, false)
    ))
    .orderBy(desc(emailDeliveryFailures.createdAt));

    return result;
  }

  /**
   * Get count of unresolved email failures for notification badge
   */
  async getUnresolvedEmailFailuresCount(userId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(emailDeliveryFailures)
      .where(and(
        eq(emailDeliveryFailures.userId, userId),
        eq(emailDeliveryFailures.resolved, false)
      ));

    return parseInt(String(result[0]?.count || 0), 10);
  }

  /**
   * Get all email failures (for admin dashboard) with optional filters
   */
  async getAllEmailFailures(filters?: {
    provider?: string;
    failureType?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }) {
    let query = db.select({
      id: emailDeliveryFailures.id,
      userId: emailDeliveryFailures.userId,
      recipientEmail: emailDeliveryFailures.recipientEmail,
      emailType: emailDeliveryFailures.emailType,
      failureType: emailDeliveryFailures.failureType,
      failureReason: emailDeliveryFailures.failureReason,
      provider: emailDeliveryFailures.provider,
      retryCount: emailDeliveryFailures.retryCount,
      resolved: emailDeliveryFailures.resolved,
      priority: emailDeliveryFailures.priority,
      createdAt: emailDeliveryFailures.createdAt
    })
    .from(emailDeliveryFailures);

    // Apply filters if provided
    const conditions = [];
    if (filters?.provider) {
      conditions.push(eq(emailDeliveryFailures.provider, filters.provider));
    }
    if (filters?.failureType) {
      conditions.push(eq(emailDeliveryFailures.failureType, filters.failureType));
    }
    if (filters?.startDate) {
      conditions.push(gte(emailDeliveryFailures.createdAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(emailDeliveryFailures.createdAt, filters.endDate));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    query = query.orderBy(desc(emailDeliveryFailures.createdAt)) as any;

    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }

    return await query;
  }

  /**
   * Get email failure analytics grouped by provider (for admin dashboard)
   */
  async getEmailFailureAnalytics(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await db.select({
      provider: emailDeliveryFailures.provider,
      failureType: emailDeliveryFailures.failureType,
      count: sql<number>`count(*)`,
      totalRetries: sql<number>`sum(${emailDeliveryFailures.retryCount})`
    })
    .from(emailDeliveryFailures)
    .where(gte(emailDeliveryFailures.createdAt, startDate))
    .groupBy(emailDeliveryFailures.provider, emailDeliveryFailures.failureType);

    return result;
  }

  /**
   * Mark an email failure as resolved
   */
  async markEmailFailureAsResolved(id: number, actionTaken?: string) {
    const result = await db.update(emailDeliveryFailures)
      .set({
        resolved: true,
        resolvedAt: new Date(),
        actionTaken: actionTaken || null,
        updatedAt: new Date()
      })
      .where(eq(emailDeliveryFailures.id, id))
      .returning();

    return result[0];
  }

  /**
   * Increment retry count for an email failure
   */
  async incrementEmailFailureRetry(id: number) {
    // First get the current record
    const current = await db.select()
      .from(emailDeliveryFailures)
      .where(eq(emailDeliveryFailures.id, id));

    if (!current[0]) return null;

    const result = await db.update(emailDeliveryFailures)
      .set({
        retryCount: current[0].retryCount + 1,
        lastRetryAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(emailDeliveryFailures.id, id))
      .returning();

    return result[0];
  }

  /**
   * Mark that user was notified about an email failure
   */
  async markEmailFailureAsNotified(id: number) {
    const result = await db.update(emailDeliveryFailures)
      .set({
        notifiedUser: true,
        notifiedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(emailDeliveryFailures.id, id))
      .returning();

    return result[0];
  }

  /**
   * Get email failure by ID
   */
  async getEmailFailureById(id: number) {
    const result = await db.select()
      .from(emailDeliveryFailures)
      .where(eq(emailDeliveryFailures.id, id));

    return result[0] || null;
  }

  /**
   * Delete an email failure record (for cleanup/admin)
   */
  async deleteEmailFailure(id: number) {
    const result = await db.delete(emailDeliveryFailures)
      .where(eq(emailDeliveryFailures.id, id))
      .returning();

    return result[0];
  }

  // ===== SUPPRESSED EMAIL METHODS (FOR BOUNCE HANDLER) =====

  /**
   * Add email to suppression list
   */
  async addSuppressedEmail(data: {
    email: string;
    reason: string;
    firstBounceDate: Date;
    bounceCount: number;
    provider: string;
    notes?: string;
  }): Promise<void> {
    try {
      // Check if email already exists
      const existing = await this.getSuppressedEmail(data.email);

      if (existing) {
        // Update existing record
        await db.update(suppressedEmails)
          .set({
            bounceCount: data.bounceCount,
            notes: data.notes || existing.notes,
            updatedAt: new Date()
          })
          .where(eq(suppressedEmails.email, data.email.toLowerCase()));

        console.log(`📝 [SUPPRESSION] Updated suppression for: ${data.email}`);
      } else {
        // Insert new suppression record
        await db.insert(suppressedEmails).values({
          email: data.email.toLowerCase(),
          reason: data.reason,
          firstBounceDate: data.firstBounceDate,
          bounceCount: data.bounceCount,
          provider: data.provider,
          notes: data.notes || null,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        console.log(`📝 [SUPPRESSION] Added suppression for: ${data.email} (reason: ${data.reason})`);
      }
    } catch (error: any) {
      console.error(`❌ [SUPPRESSION] Failed to add suppressed email ${data.email}:`, error.message);
      throw error;
    }
  }

  /**
   * Check if email is suppressed
   */
  async getSuppressedEmail(email: string): Promise<{
    email: string;
    reason: string;
    bounceCount: number;
    notes?: string;
  } | null> {
    try {
      const result = await db.select({
        email: suppressedEmails.email,
        reason: suppressedEmails.reason,
        bounceCount: suppressedEmails.bounceCount,
        notes: suppressedEmails.notes
      })
      .from(suppressedEmails)
      .where(eq(suppressedEmails.email, email.toLowerCase()));

      return result[0] || null;
    } catch (error: any) {
      console.error(`❌ [SUPPRESSION] Failed to get suppressed email ${email}:`, error.message);
      throw error;
    }
  }

  /**
   * Remove email from suppression list
   */
  async removeSuppressedEmail(email: string): Promise<void> {
    try {
      const result = await db.delete(suppressedEmails)
        .where(eq(suppressedEmails.email, email.toLowerCase()))
        .returning();

      if (result.length > 0) {
        console.log(`📝 [SUPPRESSION] Removed suppression for: ${email}`);
      } else {
        console.log(`⚠️ [SUPPRESSION] Email not found in suppression list: ${email}`);
      }
    } catch (error: any) {
      console.error(`❌ [SUPPRESSION] Failed to remove suppressed email ${email}:`, error.message);
      throw error;
    }
  }

  /**
   * Get all suppressed emails
   */
  async getAllSuppressedEmails(): Promise<Array<{
    id: number;
    email: string;
    reason: string;
    bounceCount: number;
    firstBounceDate: Date;
    provider: string;
    notes?: string;
    createdAt: Date;
  }>> {
    try {
      const result = await db.select({
        id: suppressedEmails.id,
        email: suppressedEmails.email,
        reason: suppressedEmails.reason,
        bounceCount: suppressedEmails.bounceCount,
        firstBounceDate: suppressedEmails.firstBounceDate,
        provider: suppressedEmails.provider,
        notes: suppressedEmails.notes,
        createdAt: suppressedEmails.createdAt
      })
      .from(suppressedEmails)
      .orderBy(desc(suppressedEmails.createdAt));

      return result;
    } catch (error: any) {
      console.error(`❌ [SUPPRESSION] Failed to get all suppressed emails:`, error.message);
      throw error;
    }
  }

}

export const miscStorage = new MiscStorage();