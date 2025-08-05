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

  async generateQuickAddToken(userId: string) {
    return userStorage.generateQuickAddToken(userId);
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
    return userStorage.updateUserPassword(id, password);
  }

  async deleteUser(id: string) {
    return userStorage.deleteUser(id);
  }

  async getAllUsers() {
    return userStorage.getAllUsers();
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

  async updateBooking(id: number, updates: any) {
    return bookingStorage.updateBooking(id, updates);
  }

  async deleteBooking(id: number) {
    return bookingStorage.deleteBooking(id);
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

  async updateBookingContractDocument(id: number, cloudUrl: string, storageKey: string, filename: string) {
    return bookingStorage.updateBookingContractDocument(id, cloudUrl, storageKey, filename);
  }

  async updateBookingInvoiceDocument(id: number, cloudUrl: string, storageKey: string, filename: string) {
    return bookingStorage.updateBookingInvoiceDocument(id, cloudUrl, storageKey, filename);
  }

  async addBookingDocument(id: number, cloudUrl: string, storageKey: string, filename: string, documentType: string) {
    return bookingStorage.addBookingDocument(id, cloudUrl, storageKey, filename, documentType);
  }

  async getAllBookings() {
    return bookingStorage.getAllBookings();
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

  async updateInvoice(id: number, updates: any, userId: string) {
    return invoiceStorage.updateInvoice(id, updates, userId);
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

  async getGlobalGigTypes(userId: string) {
    return settingsStorage.getGlobalGigTypes(userId);
  }

  async setGlobalGigTypes(userId: string, gigTypes: string[]) {
    return settingsStorage.setGlobalGigTypes(userId, gigTypes);
  }

  async getAllUserSettingsForGigTypes() {
    return settingsStorage.getAllUserSettingsForGigTypes();
  }

  async createDefaultTemplates(userId: string) {
    return settingsStorage.createDefaultTemplates(userId);
  }

  // ===== COMPLIANCE METHODS =====
  async getComplianceDocumentsByUser(userId: string) {
    return miscStorage.getComplianceDocumentsByUser(userId);
  }

  async getComplianceDocument(id: number) {
    return miscStorage.getComplianceDocument(id);
  }

  async createComplianceDocument(data: any) {
    return miscStorage.createComplianceDocument(data);
  }

  async updateComplianceDocument(id: number, userId: string, updates: any) {
    return miscStorage.updateComplianceDocument(id, userId, updates);
  }

  async deleteComplianceDocument(id: number, userId: string) {
    return miscStorage.deleteComplianceDocument(id, userId);
  }

  // ===== CLIENT METHODS =====
  async getClientsByUser(userId: string) {
    return miscStorage.getClientsByUser(userId);
  }

  async getClient(id: number) {
    return miscStorage.getClient(id);
  }

  async createClient(data: any) {
    return miscStorage.createClient(data);
  }

  async updateClient(id: number, userId: string, updates: any) {
    return miscStorage.updateClient(id, userId, updates);
  }

  async deleteClient(id: number, userId: string) {
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
}

export const storage = new Storage();