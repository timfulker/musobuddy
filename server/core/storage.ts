/**
 * Storage class - Main delegation layer for all storage operations
 * This class delegates all operations to modular storage classes
 * Phase 2 refactoring complete - All methods delegate to specialized storage modules
 */

import { randomBytes } from 'crypto';
import bcrypt from 'bcrypt';

// Import modular storage classes
import { UserStorage } from '../storage/user-storage';
import { BookingStorage } from '../storage/booking-storage';
import { ContractStorage } from '../storage/contract-storage';
import { InvoiceStorage } from '../storage/invoice-storage';
import { SettingsStorage } from '../storage/settings-storage';
import { MiscStorage } from '../storage/misc-storage';

// Initialize storage modules
const userStorage = new UserStorage();
const bookingStorage = new BookingStorage();
const contractStorage = new ContractStorage();
const invoiceStorage = new InvoiceStorage();
const settingsStorage = new SettingsStorage();
const miscStorage = new MiscStorage();

export class Storage {
  // ===== USER METHODS =====
  async getUserById(id: string) {
    return userStorage.getUserById(id);
  }

  async getUserByEmail(email: string) {
    return userStorage.getUserByEmail(email);
  }

  async getUserByFirebaseUid(firebaseUid: string) {
    return userStorage.getUserByFirebaseUid(firebaseUid);
  }

  async getUserBySupabaseUid(supabaseUid: string) {
    return userStorage.getUserBySupabaseUid(supabaseUid);
  }

  async getUserByPhone(phoneNumber: string) {
    return userStorage.getUserByPhone(phoneNumber);
  }

  async getUserByStripeCustomerId(stripeCustomerId: string) {
    return userStorage.getUserByStripeCustomerId(stripeCustomerId);
  }

  async getUserByEmailPrefix(emailPrefix: string) {
    return userStorage.getUserByEmailPrefix(emailPrefix);
  }

  async getUserByQuickAddToken(token: string) {
    return userStorage.getUserByQuickAddToken(token);
  }

  async getUserByResetToken(token: string) {
    return userStorage.getUserByResetToken(token);
  }

  async generateQuickAddToken(userId: string) {
    return userStorage.generateQuickAddToken(userId);
  }

  async updateUserWidgetInfo(userId: string, widgetUrl: string, qrCode: string): Promise<void> {
    return userStorage.updateUserWidgetInfo(userId, widgetUrl, qrCode);
  }

  async resetUserWidget(userId: string): Promise<void> {
    return userStorage.resetUserWidget(userId);
  }

  async authenticateUser(email: string, password: string) {
    return userStorage.authenticateUser(email, password);
  }

  async createUser(userData: any) {
    return userStorage.createUser(userData);
  }

  async updateUser(id: string, updates: any) {
    return userStorage.updateUser(id, updates);
  }

  async updateUserInfo(id: string, updates: any) {
    return userStorage.updateUser(id, updates);
  }

  async updateUserPassword(id: string, password: string) {
    const hashedPassword = await bcrypt.hash(password, 10);
    return userStorage.updateUser(id, { password: hashedPassword });
  }

  async deleteUser(id: string) {
    return userStorage.deleteUser(id);
  }

  async deleteUserAccount(id: string) {
    return userStorage.deleteUser(id);
  }

  async getAllUsers() {
    return userStorage.getAllUsers();
  }

  async getTotalUserCount() {
    return userStorage.getTotalUserCount();
  }

  // ===== SMS VERIFICATION METHODS =====
  async createSmsVerification(email: string, firstName: string, lastName: string, phoneNumber: string, hashedPassword: string, verificationCode: string, expiresAt: Date) {
    return userStorage.createSmsVerification(email, firstName, lastName, phoneNumber, hashedPassword, verificationCode, expiresAt);
  }

  async getSmsVerificationByEmail(email: string) {
    return userStorage.getSmsVerificationByEmail(email);
  }

  async deleteSmsVerification(email: string) {
    return userStorage.deleteSmsVerification(email);
  }

  async deleteExpiredSmsVerifications() {
    return userStorage.deleteExpiredSmsVerifications();
  }

  async getTotalBookingCount() {
    return bookingStorage.getTotalBookingCount();
  }

  async getTotalContractCount() {
    return contractStorage.getTotalContractCount();
  }

  async getTotalInvoiceCount() {
    return invoiceStorage.getTotalInvoiceCount();
  }

  // ===== BOOKING METHODS =====
  async getBookings(userId: string) {
    return bookingStorage.getBookingsByUser(userId);
  }

  async getBooking(id: number) {
    return bookingStorage.getBooking(id);
  }

  async getBookingByIdAndUser(id: number, userId: string) {
    return bookingStorage.getBookingByIdAndUser(id, userId);
  }

  async createBooking(bookingData: any) {
    return bookingStorage.createBooking(bookingData);
  }

  async updateBooking(id: number, updates: any, userId: string) {
    return bookingStorage.updateBooking(id, updates, userId);
  }

  async deleteBooking(id: number, userId: string) {
    return bookingStorage.deleteBooking(id, userId);
  }

  async getBookingsByDateRange(userId: string, startDate: Date, endDate: Date) {
    return bookingStorage.getBookingsByDateRange(userId, startDate, endDate);
  }

  async checkBookingConflicts(userId: string, eventDate: Date, eventTime: string, eventEndTime: string, excludeId?: number) {
    return bookingStorage.checkBookingConflicts(userId, eventDate, eventTime, eventEndTime, excludeId);
  }

  async createBookingConflict(data: any) {
    return bookingStorage.createBookingConflict(data);
  }

  async getBookingConflicts(userId: string, enquiryId: number) {
    return bookingStorage.getBookingConflicts(userId, enquiryId);
  }

  async resolveBookingConflict(id: number, resolution: string, notes?: string) {
    return bookingStorage.resolveBookingConflict(id, resolution, notes);
  }

  async getAllUserConflicts(userId: string) {
    return bookingStorage.getAllUserConflicts(userId);
  }

  async updateBookingContractDocument(id: number, cloudUrl: string, storageKey: string, filename: string) {
    return bookingStorage.updateBookingContractDocument(id, cloudUrl, storageKey, filename);
  }

  async updateBookingInvoiceDocument(id: number, cloudUrl: string, storageKey: string, filename: string) {
    return bookingStorage.updateBookingInvoiceDocument(id, cloudUrl, storageKey, filename);
  }


  async getAllBookings() {
    return bookingStorage.getAllBookings();
  }

  async getAllContracts() {
    return contractStorage.getAllContracts();
  }

  async getAllInvoices() {
    return invoiceStorage.getAllInvoices();
  }

  // ===== CONTRACT METHODS =====
  async getContract(id: number) {
    return contractStorage.getContract(id);
  }

  async getContractByIdAndUser(id: number, userId: string) {
    return contractStorage.getContractByIdAndUser(id, userId);
  }

  async getContractBySigningUrl(signingUrl: string) {
    return contractStorage.getContractBySigningUrl(signingUrl);
  }

  async getContracts(userId: string) {
    return contractStorage.getContractsByUser(userId);
  }

  async getContractsByUser(userId: string) {
    return contractStorage.getContractsByUser(userId);
  }

  async createContract(contractData: any) {
    return contractStorage.createContract(contractData);
  }

  async updateContract(id: number, updates: any, userId?: string) {
    return contractStorage.updateContract(id, updates, userId);
  }

  async deleteContract(id: number, userId: string) {
    return contractStorage.deleteContract(id, userId);
  }

  async createContractSignature(data: any) {
    return contractStorage.createContractSignature(data);
  }

  async getContractSignatures(contractId: number) {
    return contractStorage.getContractSignatures(contractId);
  }

  async getContractSignature(contractId: number, signerRole: string) {
    return contractStorage.getContractSignature(contractId, signerRole);
  }

  async getContractStats(userId: string) {
    return contractStorage.getContractStats(userId);
  }

  async getRecentContracts(userId: string, limit?: number) {
    return contractStorage.getRecentContracts(userId, limit);
  }

  async getContractsByStatus(userId: string, status: string) {
    return contractStorage.getContractsByStatus(userId, status);
  }

  async updateContractSigningUrl(contractId: number, signingPageUrl: string) {
    try {
      await db.query('UPDATE contracts SET signing_page_url = $1 WHERE id = $2', [signingPageUrl, contractId]);
      return true;
    } catch (error) {
      console.error('Failed to update contract signing URL:', error);
      return false;
    }
  }

  // Legacy contract signing method for backward compatibility
  async signContract(contractId: number, signatureData: any) {
    try {
      console.log('📝 STORAGE: Signing contract', contractId);
      
      const existingContract = await contractStorage.getContract(contractId);
      if (!existingContract) {
        throw new Error('Contract not found');
      }
      
      if (existingContract.status === 'signed') {
        throw new Error('Contract is already signed');
      }
      
      if (existingContract.status !== 'sent') {
        throw new Error('Contract is not available for signing');
      }
      
      // Check if this is an amended contract
      const isAmendedContract = existingContract.originalContractId;
      
      // Update contract with signature data
      const updateData = {
        status: 'signed' as const,
        signedAt: signatureData.signedAt || new Date(),
        clientSignature: signatureData.clientSignature || signatureData.signatureName,
        clientPhone: signatureData.clientPhone || existingContract.clientPhone,
        clientAddress: signatureData.clientAddress || existingContract.clientAddress,
        venueAddress: signatureData.venueAddress || existingContract.venueAddress,
        clientIpAddress: signatureData.clientIP || signatureData.clientIpAddress,
        updatedAt: new Date()
      };
      
      console.log('📝 STORAGE: Updating contract with data:', updateData);
      
      // Use flexible updateContract without userId for public signing
      const result = await contractStorage.updateContract(contractId, updateData);
      
      if (result && isAmendedContract) {
        // If this is an amended contract being signed, void the original contract
        console.log('⚖️ LEGAL: Amended contract signed - voiding original contract', existingContract.originalContractId);
        await contractStorage.updateContract(existingContract.originalContractId, {
          status: 'voided',
          updatedAt: new Date()
        });
        console.log('✅ LEGAL: Original contract voided due to signed amendment');
      }
      
      if (result) {
        console.log('✅ STORAGE: Contract successfully signed');
        return result;
      } else {
        throw new Error('Failed to update contract');
      }
    } catch (error) {
      console.error('🗄️ STORAGE: Error signing contract:', error);
      throw error;
    }
  }

  // ===== INVOICE METHODS =====
  async getInvoice(id: number) {
    return invoiceStorage.getInvoice(id);
  }

  async getInvoiceByIdAndUser(id: number, userId: string) {
    return invoiceStorage.getInvoiceByIdAndUser(id, userId);
  }

  async getInvoices(userId: string) {
    return invoiceStorage.getInvoicesByUser(userId);
  }

  async getInvoicesByUser(userId: string) {
    return invoiceStorage.getInvoicesByUser(userId);
  }

  async createInvoice(invoiceData: any) {
    return invoiceStorage.createInvoice(invoiceData);
  }

  async updateInvoice(id: number, userId: string, updates: any) {
    return invoiceStorage.updateInvoice(id, userId, updates);
  }

  async deleteInvoice(id: number, userId: string) {
    return invoiceStorage.deleteInvoice(id, userId);
  }

  async getInvoiceStats(userId: string) {
    return invoiceStorage.getInvoiceStats(userId);
  }

  async getRecentInvoices(userId: string, limit?: number) {
    return invoiceStorage.getRecentInvoices(userId, limit);
  }

  async getInvoicesByStatus(userId: string, status: string) {
    return invoiceStorage.getInvoicesByStatus(userId, status);
  }

  async getInvoicesByDateRange(userId: string, startDate: Date, endDate: Date) {
    return invoiceStorage.getInvoicesByDateRange(userId, startDate, endDate);
  }

  async getOverdueInvoices(userId: string) {
    return invoiceStorage.getOverdueInvoices(userId);
  }

  async markInvoiceAsPaid(id: number, userId: string) {
    return invoiceStorage.markInvoiceAsPaid(id, userId);
  }

  async getUnpaidInvoicesByContract(contractId: number, userId: string) {
    return invoiceStorage.getUnpaidInvoicesByContract(contractId, userId);
  }

  async getInvoiceByToken(token: string) {
    return invoiceStorage.getInvoiceByToken(token);
  }

  // ===== SETTINGS METHODS =====
  async getSettings(userId: string) {
    return settingsStorage.getSettings(userId);
  }

  async createSettings(data: any) {
    return settingsStorage.createSettings(data);
  }

  async updateSettings(userId: string, updates: any) {
    return settingsStorage.updateSettings(userId, updates);
  }

  async getEmailTemplates(userId: string) {
    return settingsStorage.getEmailTemplates(userId);
  }

  async seedDefaultEmailTemplates(userId: string) {
    return settingsStorage.seedDefaultEmailTemplates(userId);
  }

  async getEmailTemplate(userId: string, type: string) {
    return settingsStorage.getEmailTemplate(userId, type);
  }

  async createEmailTemplate(data: any) {
    return settingsStorage.createEmailTemplate(data);
  }

  async updateEmailTemplate(id: number, updates: any, userId: string) {
    return settingsStorage.updateEmailTemplate(id, userId, updates);
  }

  async deleteEmailTemplate(id: number, userId: string) {
    return settingsStorage.deleteEmailTemplate(id, userId);
  }

  async setDefaultEmailTemplate(id: number, userId: string) {
    return settingsStorage.setDefaultEmailTemplate(id, userId);
  }

  // Removed redundant global gig types methods - now using only customGigTypes in userSettings

  async createDefaultTemplates(userId: string) {
    return settingsStorage.createDefaultTemplates(userId);
  }

  // ===== COMPLIANCE METHODS =====
  async getComplianceDocuments(userId: string) {
    return miscStorage.getComplianceDocumentsByUser(userId);
  }

  async getComplianceDocumentsByUser(userId: string) {
    return miscStorage.getComplianceDocumentsByUser(userId);
  }

  async getComplianceDocument(id: number) {
    return miscStorage.getComplianceDocument(id);
  }

  async createComplianceDocument(data: any) {
    return miscStorage.createComplianceDocument(data);
  }

  async updateComplianceDocument(id: number, updates: any, userId?: string) {
    return miscStorage.updateComplianceDocument(id, userId!, updates);
  }

  async deleteComplianceDocument(id: number, userId?: string) {
    return miscStorage.deleteComplianceDocument(id, userId!);
  }

  // ===== CLIENT METHODS =====
  async getClients(userId: string) {
    return miscStorage.getClientsByUser(userId);
  }

  async getClientsByUser(userId: string) {
    return miscStorage.getClientsByUser(userId);
  }

  async getClient(id: number) {
    return miscStorage.getClient(id);
  }

  async createClient(userId: string, data: any) {
    return miscStorage.createClient({ userId, ...data });
  }

  async updateClient(userId: string, id: number, updates: any) {
    return miscStorage.updateClient(id, userId, updates);
  }

  async deleteClient(userId: string, id: number) {
    return miscStorage.deleteClient(id, userId);
  }

  // ===== CONFLICT RESOLUTION METHODS =====
  async createConflictResolution(data: any) {
    return miscStorage.createConflictResolution(data);
  }

  async getConflictResolution(userId: string, bookingIds: number[]) {
    return miscStorage.getConflictResolution(userId, bookingIds);
  }

  async getConflictResolutions(userId: string) {
    return miscStorage.getConflictResolutions(userId);
  }

  async deleteConflictResolution(userId: string, bookingIds: number[]) {
    return miscStorage.deleteConflictResolution(userId, bookingIds);
  }

  async saveConflictResolution(data: any) {
    return miscStorage.saveConflictResolution(data);
  }

  // ===== UNPARSEABLE MESSAGES METHODS =====
  async createUnparseableMessage(data: any) {
    return miscStorage.createUnparseableMessage(data);
  }

  async getUnparseableMessages(userId: string) {
    return miscStorage.getUnparseableMessages(userId);
  }

  async getUnparseableMessage(id: number) {
    return miscStorage.getUnparseableMessage(id);
  }

  async updateUnparseableMessage(id: number, updates: any) {
    return miscStorage.updateUnparseableMessage(id, updates);
  }

  async deleteUnparseableMessage(id: number) {
    return miscStorage.deleteUnparseableMessage(id);
  }

  // ===== DASHBOARD STATS =====
  async getDashboardStats(userId: string) {
    const [bookingStats, contractStats, invoiceStats] = await Promise.all([
      bookingStorage.getBookingStats(userId),
      contractStorage.getContractStats(userId),
      invoiceStorage.getInvoiceStats(userId)
    ]);

    return {
      bookings: bookingStats,
      contracts: contractStats,
      invoices: invoiceStats,
      totalRevenue: invoiceStats.paidRevenue || 0,
      monthlyRevenue: invoiceStats.paidRevenue || 0 // For now, using total
    };
  }

  // ===== ADMIN STATS =====
  async getStats() {
    const [users, bookings, contracts, invoices] = await Promise.all([
      userStorage.getAllUsersCount(),
      bookingStorage.getAllBookingsCount(), 
      contractStorage.getAllContractsCount(),
      invoiceStorage.getAllInvoicesCount()
    ]);

    return { users, bookings, contracts, invoices };
  }

  // ===== GOOGLE CALENDAR INTEGRATION METHODS =====
  async saveGoogleCalendarIntegration(userId: string, data: any) {
    return miscStorage.saveGoogleCalendarIntegration(userId, data);
  }

  async getGoogleCalendarIntegration(userId: string) {
    return miscStorage.getGoogleCalendarIntegration(userId);
  }

  async getGoogleCalendarIntegrationByChannelId(channelId: string) {
    return miscStorage.getGoogleCalendarIntegrationByChannelId(channelId);
  }

  async updateGoogleCalendarIntegration(userId: string, updates: any) {
    return miscStorage.updateGoogleCalendarIntegration(userId, updates);
  }

  async deleteGoogleCalendarIntegration(userId: string) {
    return miscStorage.deleteGoogleCalendarIntegration(userId);
  }

  async saveEventSyncMapping(userId: string, data: any) {
    return miscStorage.saveEventSyncMapping(userId, data);
  }

  async getEventSyncMapping(userId: string, musobuddyId: number, musobuddyType: string) {
    return miscStorage.getEventSyncMapping(userId, musobuddyId, musobuddyType);
  }

  async getEventSyncMappingByGoogleId(userId: string, googleEventId: string) {
    return miscStorage.getEventSyncMappingByGoogleId(userId, googleEventId);
  }

  async deleteEventSyncMapping(id: number) {
    return miscStorage.deleteEventSyncMapping(id);
  }

  async deleteEventSyncMappings(userId: string) {
    return miscStorage.deleteEventSyncMappings(userId);
  }

  // ===== NOTIFICATION COUNT METHODS =====
  async getNewBookingsCount(userId: string) {
    return bookingStorage.getNewBookingsCount(userId);
  }

  async getUnparseableMessagesCount(userId: string) {
    return miscStorage.getUnparseableMessagesCount(userId);
  }

  async getOverdueInvoicesCount(userId: string) {
    return invoiceStorage.getOverdueInvoicesCount(userId);
  }


  // ===== MESSAGE NOTIFICATION METHODS =====
  async createMessageNotification(notificationData: any) {
    return miscStorage.createMessageNotification(notificationData);
  }

  async getMessageNotifications(userId: string, isRead?: boolean) {
    return miscStorage.getMessageNotifications(userId, isRead);
  }

  async getUnreadMessageNotificationsCount(userId: string): Promise<number> {
    return miscStorage.getUnreadMessageNotificationsCount(userId);
  }

  async markMessageNotificationAsRead(id: number) {
    return miscStorage.markMessageNotificationAsRead(id);
  }

  async markAllBookingMessageNotificationsAsRead(bookingId: number, userId: string) {
    return miscStorage.markAllBookingMessageNotificationsAsRead(bookingId, userId);
  }

  async dismissMessageNotification(id: number) {
    return miscStorage.dismissMessageNotification(id);
  }

  async getAllMessageNotificationsForBooking(userId: string, bookingId: number) {
    return miscStorage.getAllMessageNotificationsForBooking(userId, bookingId);
  }

  async deleteMessageNotification(id: number) {
    return miscStorage.deleteMessageNotification(id);
  }

  // ===== DASHBOARD STATS METHODS =====
  async getMonthlyRevenue(userId: string): Promise<number> {
    return bookingStorage.getMonthlyRevenue(userId);
  }

  async getActiveBookingsCount(userId: string): Promise<number> {
    return bookingStorage.getActiveBookingsCount(userId);
  }

  async getPendingInvoicesAmount(userId: string): Promise<number> {
    return invoiceStorage.getPendingInvoicesAmount(userId);
  }

  // ===== BETA INVITE METHODS =====
  async getBetaInviteByEmail(email: string) {
    return miscStorage.getBetaInviteByEmail(email);
  }

  async createBetaInvite(data: {
    email: string;
    invitedBy: string;
    notes?: string;
    cohort?: string;
  }) {
    return miscStorage.createBetaInvite(data);
  }

  async markBetaInviteAsUsed(email: string, usedBy: string) {
    return miscStorage.markBetaInviteAsUsed(email, usedBy);
  }

  async getAllBetaInvites() {
    return miscStorage.getAllBetaInvites();
  }

  async deleteBetaInvite(email: string) {
    return miscStorage.deleteBetaInvite(email);
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
    return miscStorage.createBetaInviteCode(data);
  }

  async getBetaInviteCodeByCode(code: string) {
    return miscStorage.getBetaInviteCodeByCode(code);
  }

  async getAllBetaInviteCodes() {
    return miscStorage.getAllBetaInviteCodes();
  }

  async markBetaInviteCodeAsUsed(code: string, usedBy: string) {
    return miscStorage.markBetaInviteCodeAsUsed(code, usedBy);
  }

  async updateBetaInviteCode(id: number, updates: {
    status?: string;
    maxUses?: number;
    trialDays?: number;
    description?: string;
    expiresAt?: Date;
  }) {
    return miscStorage.updateBetaInviteCode(id, updates);
  }

  async deleteBetaInviteCode(id: number) {
    return miscStorage.deleteBetaInviteCode(id);
  }

  // ===== DOCUMENT METHODS =====
  async getBookingDocuments(bookingId: number, userId: string) {
    return bookingStorage.getBookingDocuments(bookingId, userId);
  }

  async addBookingDocument(document: any) {
    return bookingStorage.addBookingDocument(document);
  }

  async deleteBookingDocument(documentId: number, userId: string) {
    return bookingStorage.deleteBookingDocument(documentId, userId);
  }

  async getBookingDocument(documentId: number, userId: string) {
    return bookingStorage.getBookingDocument(documentId, userId);
  }
}

export const storage = new Storage();