import {
  users,
  contracts,
  invoices,
  bookings,
  complianceDocuments,
  userSettings,
  type User,
  type UpsertUser,
  type Enquiry,
  type InsertEnquiry,
  type Contract,
  type InsertContract,
  type Invoice,
  type InsertInvoice,
  type Booking,
  type InsertBooking,
  type ComplianceDocument,
  type InsertComplianceDocument,
  type UserSettings,
  type InsertUserSettings,
  emailTemplates,
  type EmailTemplate,
  type InsertEmailTemplate,
  clients,
  type Client,
  type InsertClient,
  bookingConflicts,
  type BookingConflict,
  type InsertBookingConflict,
  instrumentMappings,
  type InstrumentMapping,
  type InsertInstrumentMapping,
  globalGigTypes,
  feedback,
  type Feedback,
  type InsertFeedback,
  userActivity,
  type UserActivity,
  type InsertUserActivity,
  userLoginHistory,
  type UserLoginHistory,
  type InsertUserLoginHistory,
  userMessages,
  type UserMessage,
  type InsertUserMessage,
  supportTickets,
  type SupportTicket,
  type InsertSupportTicket,
  userAuditLogs,
  type UserAuditLog,
  type InsertUserAuditLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, ne, or } from "drizzle-orm";

export interface IStorage {
  // User operations - mandatory for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: any): Promise<User>;
  updateUserInfo(userId: string, updates: any): Promise<boolean>;
  
  // Admin operations
  getUsersWithStats(): Promise<any[]>;
  getAdminStats(): Promise<any>;
  updateUserTier(userId: string, tier: string): Promise<boolean>;
  toggleUserAdmin(userId: string): Promise<boolean>;
  deleteUserAccount(userId: string): Promise<boolean>;
  getRecentBookingsAdmin(): Promise<any[]>;
  
  // Enquiry operations
  getEnquiries(userId: string): Promise<Enquiry[]>;
  getEnquiry(id: number, userId: string): Promise<Enquiry | undefined>;
  createEnquiry(enquiry: InsertEnquiry): Promise<Enquiry>;
  updateEnquiry(id: number, enquiry: Partial<InsertEnquiry>, userId: string): Promise<Enquiry | undefined>;
  deleteEnquiry(id: number, userId: string): Promise<boolean>;
  
  // New bookings operations - parallel to enquiries for migration
  getBookingsNew(userId: string): Promise<Enquiry[]>;
  getBookingNew(id: number, userId: string): Promise<Enquiry | undefined>;
  createBookingNew(booking: InsertEnquiry): Promise<Enquiry>;
  updateBookingNew(id: number, booking: Partial<InsertEnquiry>, userId: string): Promise<Enquiry | undefined>;
  deleteBookingNew(id: number, userId: string): Promise<boolean>;
  
  // Contract operations
  getContracts(userId: string): Promise<Contract[]>;
  getAllContracts(): Promise<Contract[]>; // For reminder service
  getContract(id: number, userId: string): Promise<Contract | undefined>;
  getContractById(id: number): Promise<Contract | undefined>; // Public access for signing
  createContract(contract: InsertContract): Promise<Contract>;
  updateContract(id: number, contract: Partial<InsertContract>, userId: string): Promise<Contract | undefined>;
  deleteContract(id: number, userId: string): Promise<boolean>;
  signContract(id: number, signatureData: { signatureName: string; clientIP: string; signedAt: Date; clientPhone?: string; clientAddress?: string; venueAddress?: string }): Promise<Contract | undefined>;
  
  // Invoice operations
  getInvoices(userId: string): Promise<Invoice[]>;
  getInvoice(id: number, userId: string): Promise<Invoice | undefined>;
  getInvoiceById(id: number): Promise<Invoice | undefined>; // Public access for viewing
  getInvoiceByNumber(userId: string, invoiceNumber: string): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, invoice: Partial<InsertInvoice>, userId: string): Promise<Invoice | undefined>;
  deleteInvoice(id: number, userId: string): Promise<boolean>;
  
  // Booking operations
  getBookings(userId: string): Promise<Booking[]>;
  getUpcomingBookings(userId: string): Promise<Booking[]>;
  getBooking(id: number, userId: string): Promise<Booking | undefined>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: number, booking: Partial<InsertBooking>, userId: string): Promise<Booking | undefined>;
  deleteBooking(id: number, userId: string): Promise<boolean>;
  
  // Compliance operations
  getComplianceDocuments(userId: string): Promise<ComplianceDocument[]>;
  getComplianceDocument(id: number, userId: string): Promise<ComplianceDocument | undefined>;
  createComplianceDocument(document: InsertComplianceDocument): Promise<ComplianceDocument>;
  updateComplianceDocument(id: number, document: Partial<InsertComplianceDocument>, userId: string): Promise<ComplianceDocument | undefined>;
  
  // Dashboard stats
  getDashboardStats(userId: string): Promise<{
    monthlyRevenue: number;
    activeBookings: number;
    pendingInvoices: number;
    conversionRate: number;
  }>;
  
  // User settings operations
  getUserSettings(userId: string): Promise<UserSettings | undefined>;
  upsertUserSettings(settings: InsertUserSettings): Promise<UserSettings>;
  updateUserSettings(userId: string, settings: Partial<InsertUserSettings>): Promise<UserSettings | undefined>;
  
  // Email template operations
  getEmailTemplates(userId: string): Promise<EmailTemplate[]>;
  createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate>;
  updateEmailTemplate(id: number, updates: Partial<EmailTemplate>, userId: string): Promise<EmailTemplate | undefined>;
  deleteEmailTemplate(id: number, userId: string): Promise<boolean>;
  
  // Client operations
  getClients(userId: string): Promise<Client[]>;
  getClient(id: number, userId: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<InsertClient>, userId: string): Promise<Client | undefined>;
  deleteClient(id: number, userId: string): Promise<boolean>;
  
  // Booking conflict operations
  getUnresolvedConflicts(userId: string): Promise<BookingConflict[]>;
  createBookingConflict(conflict: InsertBookingConflict): Promise<BookingConflict>;
  resolveConflict(conflictId: number, resolution: string, notes?: string): Promise<BookingConflict | undefined>;
  
  // Instrument mapping operations
  getInstrumentMapping(instrument: string): Promise<InstrumentMapping | undefined>;
  createInstrumentMapping(mapping: InsertInstrumentMapping): Promise<InstrumentMapping>;
  getAllInstrumentMappings(): Promise<InstrumentMapping[]>;
  clearInstrumentMapping(instrument: string): Promise<boolean>;
  
  // Global gig types operations
  getGlobalGigTypes(userId: string): Promise<string[]>;
  saveGlobalGigTypes(userId: string, gigTypes: string[]): Promise<void>;
  
  // Auto-completion for past bookings
  autoCompletePastBookings(userId: string): Promise<number>;
  
  // Feedback operations
  getFeedback(userId?: string): Promise<Feedback[]>; // Get all feedback for admin, user's feedback if userId provided
  getFeedbackItem(id: string, userId?: string): Promise<Feedback | undefined>;
  createFeedback(feedback: InsertFeedback): Promise<Feedback>;
  updateFeedback(id: string, updates: Partial<InsertFeedback>, userId?: string): Promise<Feedback | undefined>;
  deleteFeedback(id: string, userId?: string): Promise<boolean>;
  updateFeedbackStatus(id: string, status: string, adminNotes?: string, resolvedBy?: string): Promise<Feedback | undefined>;

  // User Activity & Analytics
  logUserActivity(activity: InsertUserActivity): Promise<UserActivity>;
  getUserActivity(userId: string, limit?: number): Promise<UserActivity[]>;
  getUserLoginHistory(userId: string, limit?: number): Promise<UserLoginHistory[]>;
  logUserLogin(loginData: InsertUserLoginHistory): Promise<UserLoginHistory>;
  getUserAnalytics(userId: string): Promise<any>;
  getSystemAnalytics(): Promise<any>;

  // User Account Management
  suspendUser(userId: string, reason?: string): Promise<boolean>;
  activateUser(userId: string): Promise<boolean>;
  forcePasswordChange(userId: string): Promise<boolean>;
  updateUserPreferences(userId: string, preferences: any): Promise<boolean>;
  bulkUpdateUserTiers(userIds: string[], tier: string): Promise<boolean>;

  // Communication Features
  sendUserMessage(message: InsertUserMessage): Promise<UserMessage>;
  getUserMessages(userId: string): Promise<UserMessage[]>;
  markMessageAsRead(messageId: number): Promise<boolean>;
  broadcastAnnouncement(message: Omit<InsertUserMessage, 'toUserId'>): Promise<boolean>;

  // Support & Help
  createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket>;
  getSupportTickets(userId?: string): Promise<SupportTicket[]>;
  updateSupportTicket(id: number, updates: Partial<SupportTicket>): Promise<boolean>;
  assignSupportTicket(id: number, adminId: string): Promise<boolean>;

  // Audit & Security
  logUserAudit(auditLog: InsertUserAuditLog): Promise<UserAuditLog>;
  getUserAuditLogs(userId: string): Promise<UserAuditLog[]>;
  getSystemAuditLogs(): Promise<UserAuditLog[]>;

  // Bulk Operations
  exportUsersToCSV(): Promise<string>;
  importUsersFromCSV(csvData: string): Promise<{ success: number; errors: string[] }>;
  bulkDeleteUsers(userIds: string[]): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: any): Promise<User> {
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const [user] = await db
      .insert(users)
      .values({
        id: userId,
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName || null,
        lastName: userData.lastName || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return user;
  }

  // Enquiry operations
  async getEnquiries(userId: string): Promise<Enquiry[]> {
    return await db
      .select()
      .from(bookings)
      .where(eq(bookings.userId, userId))
      .orderBy(desc(bookings.createdAt));
  }

  async getEnquiry(id: number, userId: string): Promise<Enquiry | undefined> {
    const [enquiry] = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.id, id), eq(bookings.userId, userId)));
    return enquiry;
  }

  async createEnquiry(enquiry: InsertEnquiry): Promise<Enquiry> {
    console.log('🔍 Storage createEnquiry called');
    console.log('🔍 Enquiry title:', enquiry.title);
    console.log('🔍 Client name:', enquiry.clientName);
    console.log('🔍 Event date type:', typeof enquiry.eventDate);
    console.log('🔍 Event date instanceof Date:', enquiry.eventDate instanceof Date);
    
    // Ensure eventDate is properly handled
    const processedEnquiry = {
      ...enquiry,
      eventDate: enquiry.eventDate instanceof Date ? enquiry.eventDate : 
                enquiry.eventDate ? new Date(enquiry.eventDate) : null
    };
    
    console.log('🔍 Processed enquiry - eventDate:', processedEnquiry.eventDate);
    
    const [newEnquiry] = await db
      .insert(bookings)
      .values(processedEnquiry)
      .returning();
    return newEnquiry;
  }

  async updateEnquiry(id: number, enquiry: Partial<InsertEnquiry>, userId: string): Promise<Enquiry | undefined> {
    const [updatedEnquiry] = await db
      .update(bookings)
      .set({ ...enquiry, updatedAt: new Date() })
      .where(and(eq(bookings.id, id), eq(bookings.userId, userId)))
      .returning();
    return updatedEnquiry;
  }

  async deleteEnquiry(id: number, userId: string): Promise<boolean> {
    const result = await db
      .delete(bookings)
      .where(and(eq(bookings.id, id), eq(bookings.userId, userId)));
    return result.rowCount > 0;
  }

  // Phase 3: Bookings operations - now using main bookings table (renamed from bookings_new)
  async getBookings(userId: string): Promise<Enquiry[]> {
    return await db
      .select()
      .from(bookings)
      .where(eq(bookings.userId, userId))
      .orderBy(desc(bookings.createdAt));
  }

  // Get bookings with linked contracts and invoices
  async getBookingsWithRelations(userId: string): Promise<any[]> {
    const bookingsData = await db
      .select()
      .from(bookings)
      .where(eq(bookings.userId, userId))
      .orderBy(desc(bookings.createdAt));

    // Get contracts for these bookings
    const contractsData = await db
      .select()
      .from(contracts)
      .where(eq(contracts.userId, userId));

    // Get invoices for these bookings
    const invoicesData = await db
      .select()
      .from(invoices)
      .where(eq(invoices.userId, userId));

    // Combine the data
    return bookingsData.map(booking => {
      const relatedContracts = contractsData.filter(contract => contract.enquiryId === booking.id);
      const relatedInvoices = invoicesData.filter(invoice => 
        invoice.bookingId === booking.id || 
        relatedContracts.some(contract => contract.id === invoice.contractId)
      );

      return {
        ...booking,
        contracts: relatedContracts,
        invoices: relatedInvoices
      };
    });
  }

  async createBooking(data: InsertEnquiry): Promise<Enquiry> {
    const [booking] = await db.insert(bookings).values(data).returning();
    return booking;
  }

  async updateBooking(id: number, data: Partial<InsertEnquiry>, userId: string): Promise<Enquiry | null> {
    const [booking] = await db.update(bookings)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(bookings.id, id), eq(bookings.userId, userId)))
      .returning();
    return booking || null;
  }

  async deleteBooking(id: number, userId: string): Promise<boolean> {
    const result = await db.delete(bookings)
      .where(and(eq(bookings.id, id), eq(bookings.userId, userId)));
    return result.rowCount > 0;
  }

  async getBookingNew(id: number, userId: string): Promise<Enquiry | undefined> {
    const [booking] = await db
      .select()
      .from(bookingsNew)
      .where(and(eq(bookingsNew.id, id), eq(bookingsNew.userId, userId)));
    return booking;
  }

  async createBookingNew(booking: InsertEnquiry): Promise<Enquiry> {
    console.log('🔍 Storage createBookingNew called');
    console.log('🔍 Booking title:', booking.title);
    console.log('🔍 Client name:', booking.clientName);
    
    // Ensure eventDate is properly handled
    const processedBooking = {
      ...booking,
      eventDate: booking.eventDate instanceof Date ? booking.eventDate : 
                booking.eventDate ? new Date(booking.eventDate) : null
    };
    
    const [newBooking] = await db
      .insert(bookingsNew)
      .values(processedBooking)
      .returning();
    return newBooking;
  }

  async updateBookingNew(id: number, booking: Partial<InsertEnquiry>, userId: string): Promise<Enquiry | undefined> {
    const [updatedBooking] = await db
      .update(bookingsNew)
      .set({ ...booking, updatedAt: new Date() })
      .where(and(eq(bookingsNew.id, id), eq(bookingsNew.userId, userId)))
      .returning();
    return updatedBooking;
  }

  async deleteBookingNew(id: number, userId: string): Promise<boolean> {
    const result = await db
      .delete(bookingsNew)
      .where(and(eq(bookingsNew.id, id), eq(bookingsNew.userId, userId)));
    return result.rowCount > 0;
  }

  // Contract operations
  async getContracts(userId: string): Promise<Contract[]> {
    return await db
      .select()
      .from(contracts)
      .where(eq(contracts.userId, userId))
      .orderBy(desc(contracts.createdAt));
  }

  async getAllContracts(): Promise<Contract[]> {
    return await db
      .select()
      .from(contracts)
      .orderBy(desc(contracts.createdAt));
  }

  async getContract(id: number, userId: string): Promise<Contract | undefined> {
    const [contract] = await db
      .select()
      .from(contracts)
      .where(and(eq(contracts.id, id), eq(contracts.userId, userId)));
    return contract;
  }

  async createContract(contract: InsertContract): Promise<Contract> {
    const [newContract] = await db
      .insert(contracts)
      .values(contract)
      .returning();
    return newContract;
  }

  async updateContract(id: number, contract: Partial<InsertContract>, userId: string): Promise<Contract | undefined> {
    const [updatedContract] = await db
      .update(contracts)
      .set({ ...contract, updatedAt: new Date() })
      .where(and(eq(contracts.id, id), eq(contracts.userId, userId)))
      .returning();
    return updatedContract;
  }

  async updateContractCloudStorage(id: number, cloudStorageUrl: string, cloudStorageKey: string, userId: string): Promise<Contract | undefined> {
    console.log('☁️ Storage updateContractCloudStorage called:', { id, userId, cloudStorageUrl });
    
    const [updatedContract] = await db
      .update(contracts)
      .set({ 
        cloudStorageUrl,
        cloudStorageKey,
        updatedAt: new Date()
      })
      .where(and(eq(contracts.id, id), eq(contracts.userId, userId)))
      .returning();
    
    console.log('✅ Contract cloud storage updated:', updatedContract?.contractNumber);
    return updatedContract;
  }

  async deleteContract(id: number, userId: string): Promise<boolean> {
    console.log('🗑️ Deleting contract only - bookings are independent:', { contractId: id, userId });
    const result = await db.delete(contracts)
      .where(and(eq(contracts.id, id), eq(contracts.userId, userId)));
    console.log('✅ Contract deleted, bookings unaffected:', result.rowCount > 0);
    return result.rowCount > 0;
  }

  async getContractById(id: number): Promise<Contract | undefined> {
    const [contract] = await db
      .select()
      .from(contracts)
      .where(eq(contracts.id, id));
    return contract;
  }

  async signContract(id: number, signatureData: { signatureName: string; clientIP: string; signedAt: Date; clientPhone?: string; clientAddress?: string; venueAddress?: string }): Promise<Contract | undefined> {
    const updateData: any = {
      status: 'signed',
      signedAt: signatureData.signedAt,
      updatedAt: new Date()
    };
    
    // Add client-fillable fields if provided
    if (signatureData.clientPhone) {
      updateData.clientPhone = signatureData.clientPhone;
    }
    if (signatureData.clientAddress) {
      updateData.clientAddress = signatureData.clientAddress;
    }
    if (signatureData.venueAddress) {
      updateData.venueAddress = signatureData.venueAddress;
    }
    
    const [signedContract] = await db
      .update(contracts)
      .set(updateData)
      .where(eq(contracts.id, id))
      .returning();
    return signedContract;
  }

  // Invoice operations
  async getInvoices(userId: string): Promise<Invoice[]> {
    return await db
      .select()
      .from(invoices)
      .where(eq(invoices.userId, userId))
      .orderBy(desc(invoices.createdAt));
  }

  async getInvoice(id: number, userId: string): Promise<Invoice | undefined> {
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.userId, userId)));
    return invoice;
  }

  async getInvoiceById(id: number): Promise<Invoice | undefined> {
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, id));
    return invoice;
  }

  async getInvoiceByNumber(userId: string, invoiceNumber: string): Promise<Invoice | undefined> {
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.userId, userId), eq(invoices.invoiceNumber, invoiceNumber)));
    return invoice;
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    console.log('🔥 Storage.createInvoice called with:', JSON.stringify(invoice, null, 2));
    
    try {
      // Get user settings to determine next invoice number
      console.log('🔥 Getting user settings for user:', invoice.userId);
      const settings = await this.getUserSettings(invoice.userId);
      console.log('🔥 User settings:', JSON.stringify(settings, null, 2));
      
      let nextNumber = settings?.nextInvoiceNumber || 256;
      console.log('🔥 Starting with next invoice number:', nextNumber);
      
      // Find the next available invoice number by checking existing invoices
      let attempts = 0;
      const maxAttempts = 10;
      let finalInvoiceNumber: string | null = null;
      
      while (attempts < maxAttempts) {
        const candidateNumber = nextNumber.toString().padStart(5, '0');
        console.log(`🔥 Attempt ${attempts + 1}: Checking invoice number ${candidateNumber}`);
        
        // Check if this invoice number already exists
        const existingInvoice = await this.getInvoiceByNumber(invoice.userId, candidateNumber);
        
        if (!existingInvoice) {
          console.log(`✅ Invoice number ${candidateNumber} is available`);
          finalInvoiceNumber = candidateNumber;
          break;
        } else {
          console.log(`❌ Invoice number ${candidateNumber} already exists`);
          nextNumber++;
          attempts++;
        }
      }
      
      if (!finalInvoiceNumber) {
        console.error('❌ Unable to generate unique invoice number after', maxAttempts, 'attempts');
        throw new Error('Unable to generate unique invoice number after multiple attempts');
      }
      
      // Prepare the final invoice data
      const finalInvoiceData = {
        ...invoice,
        invoiceNumber: finalInvoiceNumber,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      console.log('🔥 Final invoice data for insertion:', JSON.stringify(finalInvoiceData, null, 2));
      
      // Create the invoice
      console.log('🔥 Inserting invoice into database...');
      const [newInvoice] = await db
        .insert(invoices)
        .values(finalInvoiceData)
        .returning();
      
      console.log('✅ Invoice inserted successfully:', JSON.stringify(newInvoice, null, 2));
      
      // Update the next invoice number in user settings
      console.log('🔥 Updating user settings with next invoice number:', nextNumber + 1);
      await this.updateUserSettings(invoice.userId, {
        nextInvoiceNumber: nextNumber + 1
      });
      
      console.log('✅ User settings updated successfully');
      console.log('🎉 Invoice creation completed successfully!');
      
      return newInvoice;
      
    } catch (error: any) {
      console.error('❌❌❌ STORAGE CREATEINVOICE ERROR ❌❌❌');
      console.error('Error type:', typeof error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      console.error('Error constraint:', error.constraint);
      console.error('Error detail:', error.detail);
      console.error('Error stack:', error.stack);
      console.error('Invoice data that failed:', JSON.stringify(invoice, null, 2));
      
      // Handle specific database errors
      if (error.code === '23505') {
        // Unique constraint violation - this might be a race condition
        console.error('❌ Unique constraint violation - likely race condition');
        throw new Error('Invoice number conflict - please try again');
      }
      
      if (error.code === '23503') {
        // Foreign key constraint violation
        console.error('❌ Foreign key constraint violation');
        throw new Error('Invalid reference to user or contract');
      }
      
      if (error.code === '23502') {
        // Not null constraint violation
        console.error('❌ Not null constraint violation');
        throw new Error('Missing required field');
      }
      
      // Re-throw the original error if we don't handle it specifically
      throw error;
    }
  }

  async updateInvoice(id: number, invoice: Partial<InsertInvoice>, userId: string): Promise<Invoice | undefined> {
    console.log('Storage updateInvoice called with:', { id, userId, invoice });
    try {
      // Clean the invoice data before update
      const cleanInvoiceData = { ...invoice };
      
      // Handle contractId - if it's null, undefined, or empty string, set to null
      if (cleanInvoiceData.contractId === null || cleanInvoiceData.contractId === undefined || cleanInvoiceData.contractId === '') {
        cleanInvoiceData.contractId = null;
      }
      
      // Convert string numbers to proper types for validation if needed
      if (typeof cleanInvoiceData.amount === 'string') {
        // Keep as string for Drizzle decimal handling
      }
      
      console.log('Clean invoice data for update:', JSON.stringify(cleanInvoiceData, null, 2));
      
      // Try the update with more specific error handling
      const updateResult = await db
        .update(invoices)
        .set({ ...cleanInvoiceData, updatedAt: new Date() })
        .where(and(eq(invoices.id, id), eq(invoices.userId, userId)))
        .returning();
        
      console.log('Update result count:', updateResult.length);
      
      if (updateResult.length === 0) {
        console.log('No rows updated - invoice not found or access denied');
        return undefined;
      }
      
      const updatedInvoice = updateResult[0];
      console.log('Storage update success:', updatedInvoice?.invoiceNumber);
      return updatedInvoice;
    } catch (error) {
      console.error('=== STORAGE ERROR DETAILS ===');
      console.error('Error message:', error.message);
      console.error('Error name:', error.name);
      console.error('Error code:', error.code);
      console.error('Error stack:', error.stack);
      console.error('Invoice data attempted:', JSON.stringify(invoice, null, 2));
      throw error;
    }
  }

  async deleteInvoice(id: number, userId: string): Promise<boolean> {
    console.log("🔥 Storage: Deleting invoice", id, "for user", userId);
    const result = await db.delete(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.userId, userId)));
    console.log("🔥 Storage: Delete result - rowCount:", result.rowCount);
    return result.rowCount > 0;
  }

  async updateInvoiceCloudStorage(id: number, cloudStorageUrl: string, cloudStorageKey: string, userId: string): Promise<Invoice | undefined> {
    console.log('☁️ Storage updateInvoiceCloudStorage called:', { id, userId, cloudStorageUrl });
    
    const [updatedInvoice] = await db
      .update(invoices)
      .set({ 
        cloudStorageUrl,
        cloudStorageKey,
        updatedAt: new Date()
      })
      .where(and(eq(invoices.id, id), eq(invoices.userId, userId)))
      .returning();
    
    console.log('✅ Invoice cloud storage updated:', updatedInvoice?.invoiceNumber);
    return updatedInvoice;
  }

  // Booking operations
  async getBookings(userId: string): Promise<Booking[]> {
    return await db
      .select()
      .from(bookings)
      .where(eq(bookings.userId, userId))
      .orderBy(desc(bookings.eventDate));
  }

  async getUpcomingBookings(userId: string): Promise<Booking[]> {
    const now = new Date();
    return await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.userId, userId), gte(bookings.eventDate, now)))
      .orderBy(bookings.eventDate)
      .limit(10);
  }

  async getBooking(id: number, userId: string): Promise<Booking | undefined> {
    const [booking] = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.id, id), eq(bookings.userId, userId)));
    return booking;
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const [newBooking] = await db
      .insert(bookings)
      .values(booking)
      .returning();
    return newBooking;
  }

  async updateBooking(id: number, booking: Partial<InsertBooking>, userId: string): Promise<Booking | undefined> {
    const [updatedBooking] = await db
      .update(bookings)
      .set({ ...booking, updatedAt: new Date() })
      .where(and(eq(bookings.id, id), eq(bookings.userId, userId)))
      .returning();
    return updatedBooking;
  }

  async deleteBooking(id: number, userId: string): Promise<boolean> {
    const result = await db.delete(bookings)
      .where(and(eq(bookings.id, id), eq(bookings.userId, userId)));
    return result.rowCount > 0;
  }

  // Compliance operations
  async getComplianceDocuments(userId: string): Promise<ComplianceDocument[]> {
    return await db
      .select()
      .from(complianceDocuments)
      .where(eq(complianceDocuments.userId, userId))
      .orderBy(complianceDocuments.expiryDate);
  }

  async getComplianceDocument(id: number, userId: string): Promise<ComplianceDocument | undefined> {
    const [document] = await db
      .select()
      .from(complianceDocuments)
      .where(and(eq(complianceDocuments.id, id), eq(complianceDocuments.userId, userId)));
    return document;
  }

  async createComplianceDocument(document: InsertComplianceDocument): Promise<ComplianceDocument> {
    const [newDocument] = await db
      .insert(complianceDocuments)
      .values(document)
      .returning();
    return newDocument;
  }

  async updateComplianceDocument(id: number, document: Partial<InsertComplianceDocument>, userId: string): Promise<ComplianceDocument | undefined> {
    const [updatedDocument] = await db
      .update(complianceDocuments)
      .set({ ...document, updatedAt: new Date() })
      .where(and(eq(complianceDocuments.id, id), eq(complianceDocuments.userId, userId)))
      .returning();
    return updatedDocument;
  }

  // Dashboard stats
  async getDashboardStats(userId: string): Promise<{
    monthlyRevenue: number;
    activeBookings: number;
    pendingInvoices: number;
    overdueInvoices: number;
    enquiriesRequiringResponse: number;
  }> {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Monthly revenue from paid invoices
    const monthlyInvoices = await db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.userId, userId),
          eq(invoices.status, "paid"),
          gte(invoices.paidAt, firstDayOfMonth),
          lte(invoices.paidAt, lastDayOfMonth)
        )
      );

    const monthlyRevenue = monthlyInvoices.reduce((sum, invoice) => sum + Number(invoice.amount), 0);

    // Active bookings (upcoming confirmed bookings - includes confirmed, contract_sent, and contract_received)
    const activeBookingsCount = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.userId, userId),
          or(
            eq(bookings.status, "confirmed"),
            eq(bookings.status, "contract_sent"),
            eq(bookings.status, "contract_received")
          ),
          gte(bookings.eventDate, now)
        )
      );

    // Pending invoices (sent status)
    const pendingInvoicesData = await db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.userId, userId),
          eq(invoices.status, "sent")
        )
      );

    const pendingInvoices = pendingInvoicesData.reduce((sum, invoice) => sum + Number(invoice.amount), 0);

    // Overdue invoices count
    const overdueInvoicesCount = await db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.userId, userId),
          eq(invoices.status, "overdue")
        )
      );

    // Enquiries requiring response (new and booking_in_progress status)
    const enquiriesRequiringResponseCount = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.userId, userId),
          or(
            eq(bookings.status, "new"),
            eq(bookings.status, "booking_in_progress")
          )
        )
      );

    return {
      monthlyRevenue,
      activeBookings: activeBookingsCount.length,
      pendingInvoices,
      overdueInvoices: overdueInvoicesCount.length,
      enquiriesRequiringResponse: enquiriesRequiringResponseCount.length,
    };
  }

  // User settings operations
  async getUserSettings(userId: string): Promise<UserSettings | undefined> {
    try {
      // Select all columns to handle missing columns gracefully
      const [settings] = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, userId));
      
      // Handle missing columns gracefully by only returning what exists
      if (settings) {
        return {
          ...settings,
          // Add default values for new columns that might not exist yet
          selectedInstruments: settings.selectedInstruments || null,
          aiGeneratedGigTypes: settings.aiGeneratedGigTypes || null,
          customGigTypes: settings.customGigTypes || null,
          gigTypes: settings.gigTypes || null,
          eventTypes: settings.eventTypes || null,
          instrumentsPlayed: settings.instrumentsPlayed || null,
          customInstruments: settings.customInstruments || null,
        };
      }
      return settings;
    } catch (error) {
      console.error('Error fetching user settings:', error);
      // Return default settings structure if columns don't exist
      return {
        userId,
        businessName: null,
        businessEmail: null,
        businessAddress: null,
        phone: null,
        website: null,
        taxNumber: null,
        bankDetails: null,
        defaultTerms: null,
        emailFromName: null,
        nextInvoiceNumber: 1,
        defaultSetupTime: 60,
        defaultBreakdownTime: 30,
        weddingBufferTime: 120,
        corporateBufferTime: 60,
        defaultBufferTime: 90,
        maxTravelDistance: 100,
        homePostcode: null,
        selectedInstruments: null,
        aiGeneratedGigTypes: null,
        customGigTypes: null,
        gigTypes: null,
        eventTypes: null,
        instrumentsPlayed: null,
        customInstruments: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as UserSettings;
    }
  }

  async upsertUserSettings(settings: InsertUserSettings): Promise<UserSettings> {
    console.log('🔥 STORAGE: upsertUserSettings called with:', JSON.stringify(settings, null, 2));
    
    try {
      const [result] = await db
        .insert(userSettings)
        .values({
          ...settings,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: userSettings.userId,
          set: {
            ...settings,
            updatedAt: new Date(),
          },
        })
        .returning();
      
      console.log('🔥 STORAGE: Settings upserted successfully:', result.id);
      return result;
    } catch (error) {
      console.error('🔥 STORAGE ERROR:', error);
      throw error;
    }
  }

  async updateUserSettings(userId: string, settings: Partial<InsertUserSettings>): Promise<UserSettings | undefined> {
    const [updatedSettings] = await db
      .update(userSettings)
      .set({
        ...settings,
        updatedAt: new Date(),
      })
      .where(eq(userSettings.userId, userId))
      .returning();
    return updatedSettings;
  }

  // Email template operations
  async getEmailTemplates(userId: string): Promise<EmailTemplate[]> {
    return await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.userId, userId))
      .orderBy(desc(emailTemplates.createdAt));
  }

  async createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate> {
    const result = await db.insert(emailTemplates).values(template).returning();
    return result[0];
  }

  async updateEmailTemplate(id: number, updates: Partial<EmailTemplate>, userId: string): Promise<EmailTemplate | undefined> {
    // If setting as default, first unset all other templates as default
    if (updates.isDefault === true) {
      await db
        .update(emailTemplates)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(and(eq(emailTemplates.userId, userId), ne(emailTemplates.id, id)));
    }
    
    const result = await db
      .update(emailTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(emailTemplates.id, id), eq(emailTemplates.userId, userId)))
      .returning();
    return result[0];
  }

  async deleteEmailTemplate(id: number, userId: string): Promise<boolean> {
    const result = await db.delete(emailTemplates)
      .where(and(eq(emailTemplates.id, id), eq(emailTemplates.userId, userId)));
    return result.rowCount > 0;
  }

  // Client operations
  async getClients(userId: string): Promise<Client[]> {
    return await db.select().from(clients).where(eq(clients.userId, userId)).orderBy(desc(clients.createdAt));
  }

  async getClient(id: number, userId: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(and(eq(clients.id, id), eq(clients.userId, userId)));
    return client;
  }

  async createClient(clientData: InsertClient): Promise<Client> {
    const [client] = await db.insert(clients).values(clientData).returning();
    return client;
  }

  async updateClient(id: number, updateData: Partial<InsertClient>, userId: string): Promise<Client | undefined> {
    const result = await db
      .update(clients)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(eq(clients.id, id), eq(clients.userId, userId)))
      .returning();
    return result[0];
  }

  async deleteClient(id: number, userId: string): Promise<boolean> {
    const result = await db.delete(clients).where(and(eq(clients.id, id), eq(clients.userId, userId)));
    return result.rowCount > 0;
  }

  // Booking conflict operations
  async getUnresolvedConflicts(userId: string): Promise<BookingConflict[]> {
    return await db
      .select()
      .from(bookingConflicts)
      .where(and(eq(bookingConflicts.userId, userId), eq(bookingConflicts.isResolved, false)))
      .orderBy(desc(bookingConflicts.createdAt));
  }

  async createBookingConflict(conflict: InsertBookingConflict): Promise<BookingConflict> {
    const [newConflict] = await db
      .insert(bookingConflicts)
      .values(conflict)
      .returning();
    return newConflict;
  }

  async resolveConflict(conflictId: number, resolution: string, notes?: string): Promise<BookingConflict | undefined> {
    const [resolvedConflict] = await db
      .update(bookingConflicts)
      .set({
        isResolved: true,
        resolution,
        notes,
        resolvedAt: new Date(),
      })
      .where(eq(bookingConflicts.id, conflictId))
      .returning();
    return resolvedConflict;
  }

  // Instrument mapping operations
  async getInstrumentMapping(instrument: string): Promise<InstrumentMapping | undefined> {
    const [mapping] = await db
      .select()
      .from(instrumentMappings)
      .where(eq(instrumentMappings.instrument, instrument.toLowerCase()));
    return mapping;
  }

  async createInstrumentMapping(mapping: InsertInstrumentMapping): Promise<InstrumentMapping> {
    const [newMapping] = await db
      .insert(instrumentMappings)
      .values({
        ...mapping,
        instrument: mapping.instrument.toLowerCase(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return newMapping;
  }

  async getAllInstrumentMappings(): Promise<InstrumentMapping[]> {
    return await db
      .select()
      .from(instrumentMappings)
      .orderBy(instrumentMappings.instrument);
  }

  async updateInstrumentMapping(instrument: string, mapping: InsertInstrumentMapping): Promise<InstrumentMapping> {
    const [updatedMapping] = await db
      .update(instrumentMappings)
      .set({
        ...mapping,
        instrument: mapping.instrument.toLowerCase(),
        updatedAt: new Date(),
      })
      .where(eq(instrumentMappings.instrument, instrument.toLowerCase()))
      .returning();
    return updatedMapping;
  }

  async clearInstrumentMapping(instrument: string): Promise<boolean> {
    const result = await db
      .delete(instrumentMappings)
      .where(eq(instrumentMappings.instrument, instrument.toLowerCase()));
    return result.rowCount! > 0;
  }

  // Global gig types operations
  async getGlobalGigTypes(userId: string): Promise<string[]> {
    const [result] = await db
      .select()
      .from(globalGigTypes)
      .where(eq(globalGigTypes.userId, userId));
    
    if (result) {
      return JSON.parse(result.gigTypes);
    }
    return [];
  }

  async saveGlobalGigTypes(userId: string, gigTypes: string[]): Promise<void> {
    // Validate that gigTypes is an array
    if (!Array.isArray(gigTypes)) {
      console.error("🔥 saveGlobalGigTypes: gigTypes is not an array:", typeof gigTypes, gigTypes);
      throw new Error("gigTypes must be an array");
    }
    
    // Ensure all elements are strings
    const validGigTypes = gigTypes.filter(item => typeof item === 'string');
    
    console.log("🔥 saveGlobalGigTypes: Saving gig types for user:", userId);
    console.log("🔥 saveGlobalGigTypes: Valid gig types:", validGigTypes);
    
    // Check if record exists
    const existingRecord = await db
      .select()
      .from(globalGigTypes)
      .where(eq(globalGigTypes.userId, userId));
    
    if (existingRecord.length > 0) {
      // Update existing record
      await db
        .update(globalGigTypes)
        .set({
          gigTypes: JSON.stringify(validGigTypes),
          updatedAt: new Date(),
        })
        .where(eq(globalGigTypes.userId, userId));
    } else {
      // Insert new record
      await db
        .insert(globalGigTypes)
        .values({
          userId,
          gigTypes: JSON.stringify(validGigTypes),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
    }
  }

  // Placeholder implementation for getBookingsNew (should be removed in actual implementation)
  async getBookingsNew(userId: string): Promise<Enquiry[]> {
    return this.getEnquiries(userId);
  }

  // Auto-completion for past bookings
  async autoCompletePastBookings(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    
    const pastBookings = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.userId, userId),
          lte(bookings.eventDate, today),
          ne(bookings.status, 'completed'),
          ne(bookings.status, 'rejected')
        )
      );

    let updatedCount = 0;
    
    for (const booking of pastBookings) {
      await db
        .update(bookings)
        .set({
          previousStatus: booking.status,
          status: 'completed',
          updatedAt: new Date(),
        })
        .where(eq(bookings.id, booking.id));
      
      updatedCount++;
    }
    
    return updatedCount;
  }

  // Admin operations
  async getUsersWithStats(): Promise<any[]> {
    const { sql } = await import('drizzle-orm');
    
    // Get all users with their stats
    const usersData = await db.select().from(users);
    
    const usersWithStats = await Promise.all(
      usersData.map(async (user) => {
        const [bookingsCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(bookings)
          .where(eq(bookings.userId, user.id));
        
        const [contractsCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(contracts)
          .where(eq(contracts.userId, user.id));
        
        const [invoicesCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(invoices)
          .where(eq(invoices.userId, user.id));
        
        // Calculate total revenue from contracts (not bookings)
        const [revenueData] = await db
          .select({ 
            total: sql<number>`COALESCE(SUM(CAST(fee AS DECIMAL)), 0)` 
          })
          .from(contracts)
          .where(
            and(
              eq(contracts.userId, user.id),
              ne(contracts.status, 'draft')
            )
          );
        
        return {
          ...user,
          bookingsCount: bookingsCount?.count || 0,
          contractsCount: contractsCount?.count || 0,
          invoicesCount: invoicesCount?.count || 0,
          totalRevenue: Number(revenueData?.total || 0),
        };
      })
    );
    
    return usersWithStats;
  }

  async getAdminStats(): Promise<any> {
    const { sql } = await import('drizzle-orm');
    
    const [totalUsers] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);
    
    const [totalBookings] = await db
      .select({ count: sql<number>`count(*)` })
      .from(bookings);
    
    const [totalContracts] = await db
      .select({ count: sql<number>`count(*)` })
      .from(contracts);
    
    const [totalInvoices] = await db
      .select({ count: sql<number>`count(*)` })
      .from(invoices);
    
    const [totalRevenue] = await db
      .select({ 
        total: sql<number>`COALESCE(SUM(CAST(fee AS DECIMAL)), 0)` 
      })
      .from(contracts)
      .where(ne(contracts.status, 'draft'));
    
    // New users this month
    const thisMonth = new Date();
    thisMonth.setDate(1);
    const [newUsersThisMonth] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(gte(users.createdAt, thisMonth));
    
    const avgBookingsPerUser = totalUsers?.count > 0 
      ? (totalBookings?.count || 0) / totalUsers.count 
      : 0;
    
    return {
      totalUsers: totalUsers?.count || 0,
      totalBookings: totalBookings?.count || 0,
      totalContracts: totalContracts?.count || 0,
      totalInvoices: totalInvoices?.count || 0,
      totalRevenue: Number(totalRevenue?.total || 0),
      newUsersThisMonth: newUsersThisMonth?.count || 0,
      activeUsers: totalUsers?.count || 0, // Can be refined later
      avgBookingsPerUser: Math.round(avgBookingsPerUser * 10) / 10,
    };
  }

  async updateUserTier(userId: string, tier: string): Promise<boolean> {
    const result = await db
      .update(users)
      .set({ tier, updatedAt: new Date() })
      .where(eq(users.id, userId));
    return result.rowCount > 0;
  }

  async toggleUserAdmin(userId: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) return false;
    
    const result = await db
      .update(users)
      .set({ isAdmin: !user.isAdmin, updatedAt: new Date() })
      .where(eq(users.id, userId));
    return result.rowCount > 0;
  }

  async deleteUserAccount(userId: string): Promise<boolean> {
    try {
      // Delete all user data in correct order (due to foreign key constraints)
      await db.delete(bookings).where(eq(bookings.userId, userId));
      await db.delete(contracts).where(eq(contracts.userId, userId));
      await db.delete(invoices).where(eq(invoices.userId, userId));
      await db.delete(complianceDocuments).where(eq(complianceDocuments.userId, userId));
      await db.delete(userSettings).where(eq(userSettings.userId, userId));
      await db.delete(emailTemplates).where(eq(emailTemplates.userId, userId));
      await db.delete(clients).where(eq(clients.userId, userId));
      await db.delete(users).where(eq(users.id, userId));
      
      return true;
    } catch (error) {
      console.error('Error deleting user account:', error);
      return false;
    }
  }

  async getRecentBookingsAdmin(): Promise<any[]> {
    const recentBookings = await db
      .select({
        id: bookings.id,
        clientName: bookings.clientName,
        eventDate: bookings.eventDate,
        venue: bookings.venue,
        status: bookings.status,
        estimatedValue: bookings.estimatedValue,
        userId: bookings.userId,
        userEmail: users.email,
      })
      .from(bookings)
      .leftJoin(users, eq(bookings.userId, users.id))
      .orderBy(desc(bookings.createdAt))
      .limit(50);
    
    return recentBookings;
  }

  async createUser(userData: any): Promise<any> {
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<any> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    return user;
  }

  async updateUserInfo(userId: string, updates: any): Promise<boolean> {
    const result = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, userId));
    return (result.rowCount ?? 0) > 0;
  }

  // Feedback operations
  async getFeedback(userId?: string): Promise<Feedback[]> {
    const query = db
      .select({
        id: feedback.id,
        userId: feedback.userId,
        type: feedback.type,
        title: feedback.title,
        description: feedback.description,
        priority: feedback.priority,
        status: feedback.status,
        page: feedback.page,
        userAgent: feedback.userAgent,
        createdAt: feedback.createdAt,
        updatedAt: feedback.updatedAt,
        adminNotes: feedback.adminNotes,
        resolvedAt: feedback.resolvedAt,
        resolvedBy: feedback.resolvedBy,
        userName: users.firstName,
        userEmail: users.email,
      })
      .from(feedback)
      .leftJoin(users, eq(feedback.userId, users.id))
      .orderBy(desc(feedback.createdAt));
    
    if (userId) {
      query.where(eq(feedback.userId, userId));
    }
    
    return await query;
  }

  async getFeedbackItem(id: string, userId?: string): Promise<Feedback | undefined> {
    const query = db
      .select()
      .from(feedback)
      .where(eq(feedback.id, id));
    
    if (userId) {
      query.where(and(eq(feedback.id, id), eq(feedback.userId, userId)));
    }
    
    const [item] = await query;
    return item;
  }

  async createFeedback(feedbackData: InsertFeedback): Promise<Feedback> {
    const { nanoid } = await import('nanoid');
    const [newFeedback] = await db
      .insert(feedback)
      .values({
        ...feedbackData,
        id: nanoid(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return newFeedback;
  }

  async updateFeedback(id: string, updates: Partial<InsertFeedback>, userId?: string): Promise<Feedback | undefined> {
    const query = db
      .update(feedback)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(feedback.id, id));
    
    if (userId) {
      query.where(and(eq(feedback.id, id), eq(feedback.userId, userId)));
    }
    
    const [updatedFeedback] = await query.returning();
    return updatedFeedback;
  }

  async deleteFeedback(id: string, userId?: string): Promise<boolean> {
    const query = db
      .delete(feedback)
      .where(eq(feedback.id, id));
    
    if (userId) {
      query.where(and(eq(feedback.id, id), eq(feedback.userId, userId)));
    }
    
    const result = await query;
    return (result.rowCount ?? 0) > 0;
  }

  async updateFeedbackStatus(id: string, status: string, adminNotes?: string, resolvedBy?: string): Promise<Feedback | undefined> {
    const updates: any = {
      status,
      updatedAt: new Date(),
    };
    
    if (adminNotes) {
      updates.adminNotes = adminNotes;
    }
    
    if (status === 'resolved' && resolvedBy) {
      updates.resolvedAt = new Date();
      updates.resolvedBy = resolvedBy;
    }
    
    const [updatedFeedback] = await db
      .update(feedback)
      .set(updates)
      .where(eq(feedback.id, id))
      .returning();
    
    return updatedFeedback;
  }

  // User Activity & Analytics
  async logUserActivity(activity: InsertUserActivity): Promise<UserActivity> {
    const [newActivity] = await db
      .insert(userActivity)
      .values({
        ...activity,
        createdAt: new Date(),
      })
      .returning();
    return newActivity;
  }

  async getUserActivity(userId: string, limit = 100): Promise<UserActivity[]> {
    return await db
      .select()
      .from(userActivity)
      .where(eq(userActivity.userId, userId))
      .orderBy(desc(userActivity.createdAt))
      .limit(limit);
  }

  async getUserLoginHistory(userId: string, limit = 50): Promise<UserLoginHistory[]> {
    return await db
      .select()
      .from(userLoginHistory)
      .where(eq(userLoginHistory.userId, userId))
      .orderBy(desc(userLoginHistory.loginTime))
      .limit(limit);
  }

  async logUserLogin(loginData: InsertUserLoginHistory): Promise<UserLoginHistory> {
    const [newLogin] = await db
      .insert(userLoginHistory)
      .values({
        ...loginData,
        loginTime: new Date(),
      })
      .returning();
    return newLogin;
  }

  async getUserAnalytics(userId: string): Promise<any> {
    const [bookingCount] = await db
      .select({ count: bookings.id })
      .from(bookings)
      .where(eq(bookings.userId, userId));
    
    const [contractCount] = await db
      .select({ count: contracts.id })
      .from(contracts)
      .where(eq(contracts.userId, userId));
    
    const [invoiceCount] = await db
      .select({ count: invoices.id })
      .from(invoices)
      .where(eq(invoices.userId, userId));

    return {
      bookings: bookingCount?.count || 0,
      contracts: contractCount?.count || 0,
      invoices: invoiceCount?.count || 0,
    };
  }

  async getSystemAnalytics(): Promise<any> {
    const totalUsers = await db.select().from(users);
    const totalBookings = await db.select().from(bookings);
    const totalContracts = await db.select().from(contracts);
    const totalInvoices = await db.select().from(invoices);

    return {
      totalUsers: totalUsers.length,
      totalBookings: totalBookings.length,
      totalContracts: totalContracts.length,
      totalInvoices: totalInvoices.length,
      activeUsers: totalUsers.filter(u => u.isActive).length
    };
  }

  // User Account Management
  async suspendUser(userId: string, reason?: string): Promise<boolean> {
    const result = await db
      .update(users)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(users.id, userId));
    
    return (result.rowCount ?? 0) > 0;
  }

  async activateUser(userId: string): Promise<boolean> {
    const result = await db
      .update(users)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(users.id, userId));
    
    return (result.rowCount ?? 0) > 0;
  }

  async forcePasswordChange(userId: string): Promise<boolean> {
    const result = await db
      .update(users)
      .set({ forcePasswordChange: true, updatedAt: new Date() })
      .where(eq(users.id, userId));
    
    return (result.rowCount ?? 0) > 0;
  }

  async updateUserPreferences(userId: string, preferences: any): Promise<boolean> {
    const result = await db
      .update(users)
      .set({ 
        notificationPreferences: preferences,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId));
    
    return (result.rowCount ?? 0) > 0;
  }

  async bulkUpdateUserTiers(userIds: string[], tier: string): Promise<boolean> {
    if (userIds.length === 0) return false;
    
    const result = await db
      .update(users)
      .set({ tier, updatedAt: new Date() })
      .where(or(...userIds.map(id => eq(users.id, id))));
    
    return (result.rowCount ?? 0) > 0;
  }

  // Communication Features
  async sendUserMessage(message: InsertUserMessage): Promise<UserMessage> {
    const [newMessage] = await db
      .insert(userMessages)
      .values({
        ...message,
        createdAt: new Date(),
      })
      .returning();
    return newMessage;
  }

  async getUserMessages(userId: string): Promise<UserMessage[]> {
    return await db
      .select()
      .from(userMessages)
      .where(or(eq(userMessages.toUserId, userId), eq(userMessages.toUserId, null)))
      .orderBy(desc(userMessages.createdAt));
  }

  async markMessageAsRead(messageId: number): Promise<boolean> {
    const result = await db
      .update(userMessages)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(userMessages.id, messageId));
    
    return (result.rowCount ?? 0) > 0;
  }

  async broadcastAnnouncement(message: Omit<InsertUserMessage, 'toUserId'>): Promise<boolean> {
    const result = await db
      .insert(userMessages)
      .values({
        ...message,
        toUserId: null,
        createdAt: new Date(),
      });
    
    return (result.rowCount ?? 0) > 0;
  }

  // Support & Help
  async createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket> {
    const [newTicket] = await db
      .insert(supportTickets)
      .values({
        ...ticket,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return newTicket;
  }

  async getSupportTickets(userId?: string): Promise<SupportTicket[]> {
    const query = db
      .select()
      .from(supportTickets)
      .orderBy(desc(supportTickets.createdAt));
    
    if (userId) {
      query.where(eq(supportTickets.userId, userId));
    }
    
    return await query;
  }

  async updateSupportTicket(id: number, updates: Partial<SupportTicket>): Promise<boolean> {
    const result = await db
      .update(supportTickets)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(supportTickets.id, id));
    
    return (result.rowCount ?? 0) > 0;
  }

  async assignSupportTicket(id: number, adminId: string): Promise<boolean> {
    const result = await db
      .update(supportTickets)
      .set({ 
        assignedToUserId: adminId,
        status: 'in_progress',
        updatedAt: new Date() 
      })
      .where(eq(supportTickets.id, id));
    
    return (result.rowCount ?? 0) > 0;
  }

  // Audit & Security
  async logUserAudit(auditLog: InsertUserAuditLog): Promise<UserAuditLog> {
    const [newAudit] = await db
      .insert(userAuditLogs)
      .values({
        ...auditLog,
        createdAt: new Date(),
      })
      .returning();
    return newAudit;
  }

  async getUserAuditLogs(userId: string): Promise<UserAuditLog[]> {
    return await db
      .select()
      .from(userAuditLogs)
      .where(eq(userAuditLogs.userId, userId))
      .orderBy(desc(userAuditLogs.createdAt));
  }

  async getSystemAuditLogs(): Promise<UserAuditLog[]> {
    return await db
      .select()
      .from(userAuditLogs)
      .orderBy(desc(userAuditLogs.createdAt))
      .limit(1000);
  }

  // Bulk Operations
  async exportUsersToCSV(): Promise<string> {
    const users = await this.getAllUsers();
    const headers = ['ID', 'First Name', 'Last Name', 'Email', 'Tier', 'Is Admin', 'Is Active', 'Created At'];
    const rows = users.map(user => [
      user.id,
      user.firstName || '',
      user.lastName || '',
      user.email || '',
      user.tier || '',
      user.isAdmin ? 'true' : 'false',
      user.isActive ? 'true' : 'false',
      user.createdAt?.toISOString() || ''
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
    
    return csvContent;
  }

  async importUsersFromCSV(csvData: string): Promise<{ success: number; errors: string[] }> {
    const lines = csvData.split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
    const dataLines = lines.slice(1);
    
    let successCount = 0;
    const errors: string[] = [];
    
    for (let i = 0; i < dataLines.length; i++) {
      try {
        const values = dataLines[i].split(',').map(v => v.replace(/"/g, ''));
        const userData = {
          id: values[0],
          firstName: values[1],
          lastName: values[2],
          email: values[3],
          tier: values[4] || 'free',
          isAdmin: values[5] === 'true',
          isActive: values[6] === 'true',
          password: 'temp123',
          forcePasswordChange: true,
        };
        
        await this.upsertUser(userData);
        successCount++;
      } catch (error) {
        errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }
    
    return { success: successCount, errors };
  }

  async bulkDeleteUsers(userIds: string[]): Promise<boolean> {
    if (userIds.length === 0) return false;
    
    const result = await db
      .delete(users)
      .where(or(...userIds.map(id => eq(users.id, id))));
    
    return (result.rowCount ?? 0) > 0;
  }

  // Advanced admin analytics
  async getBusinessIntelligence() {
    try {
      const [allUsers, allBookings, allContracts, allInvoices] = await Promise.all([
        db.select().from(users),
        db.select().from(bookings),
        db.select().from(contracts),
        db.select().from(invoices)
      ]);

      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const thisMonthBookings = allBookings.filter(b => b.createdAt >= thisMonth);
      const lastMonthBookings = allBookings.filter(b => b.createdAt >= lastMonth && b.createdAt < thisMonth);
      
      const thisMonthRevenue = allInvoices
        .filter(i => i.createdAt >= thisMonth)
        .reduce((sum, i) => sum + parseFloat(i.amount || '0'), 0);
      
      const lastMonthRevenue = allInvoices
        .filter(i => i.createdAt >= lastMonth && i.createdAt < thisMonth)
        .reduce((sum, i) => sum + parseFloat(i.amount || '0'), 0);

      const conversionRate = allBookings.length > 0 ? 
        (allContracts.length / allBookings.length) * 100 : 0;

      const averageBookingValue = allBookings.length > 0 ?
        allInvoices.reduce((sum, i) => sum + parseFloat(i.amount || '0'), 0) / allBookings.length : 0;

      return {
        totalUsers: allUsers.length,
        totalBookings: allBookings.length,
        totalContracts: allContracts.length,
        totalInvoices: allInvoices.length,
        bookingTrend: {
          thisMonth: thisMonthBookings.length,
          lastMonth: lastMonthBookings.length,
          percentChange: lastMonthBookings.length > 0 ? 
            ((thisMonthBookings.length - lastMonthBookings.length) / lastMonthBookings.length) * 100 : 0
        },
        revenueTrend: {
          thisMonth: thisMonthRevenue,
          lastMonth: lastMonthRevenue,
          percentChange: lastMonthRevenue > 0 ? 
            ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0
        },
        conversionRate,
        averageBookingValue
      };
    } catch (error) {
      console.error('Error getting business intelligence:', error);
      return {};
    }
  }

  async getGeographicDistribution() {
    try {
      const allBookings = await db.select().from(bookings);
      
      const distribution = allBookings.reduce((acc, booking) => {
        const venue = booking.venue || 'Unknown';
        const city = this.extractCityFromVenue(venue);
        acc[city] = (acc[city] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(distribution)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([city, count]) => ({ city, count }));
    } catch (error) {
      console.error('Error getting geographic distribution:', error);
      return [];
    }
  }

  async getTopPerformers(limit: number = 10) {
    try {
      const allUsers = await db.select().from(users);
      const allBookings = await db.select().from(bookings);
      const allInvoices = await db.select().from(invoices);

      const userPerformance = allUsers.map(user => {
        const userBookings = allBookings.filter(b => b.userId === user.id);
        const userInvoices = allInvoices.filter(i => i.userId === user.id);
        const totalRevenue = userInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount || '0'), 0);
        
        return {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          bookingCount: userBookings.length,
          totalRevenue,
          averageBookingValue: userBookings.length > 0 ? totalRevenue / userBookings.length : 0
        };
      });

      return userPerformance
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting top performers:', error);
      return [];
    }
  }

  private extractCityFromVenue(venue: string): string {
    // Simple city extraction logic - you can enhance this
    if (!venue) return 'Unknown';
    
    const parts = venue.split(',');
    if (parts.length >= 2) {
      return parts[parts.length - 2].trim();
    }
    return venue.trim();
  }

  // System health and monitoring
  async getSystemHealth() {
    try {
      const startTime = Date.now();
      
      // Test database connection
      const dbStart = Date.now();
      const userCount = await db.select().from(users).limit(1);
      const dbTime = Date.now() - dbStart;
      
      // Memory usage (if available)
      const memoryUsage = process.memoryUsage();
      
      // Check recent errors (last 24 hours)
      const last24Hours = new Date();
      last24Hours.setHours(last24Hours.getHours() - 24);
      
      const [recentBookings, recentContracts, recentInvoices] = await Promise.all([
        db.select().from(bookings).where(gte(bookings.createdAt, last24Hours)),
        db.select().from(contracts).where(gte(contracts.createdAt, last24Hours)),
        db.select().from(invoices).where(gte(invoices.createdAt, last24Hours))
      ]);
      
      const totalTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        timestamp: new Date(),
        database: {
          status: 'connected',
          responseTime: dbTime,
          recordsCount: userCount.length > 0 ? 'accessible' : 'empty'
        },
        memory: {
          used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          external: Math.round(memoryUsage.external / 1024 / 1024),
          rss: Math.round(memoryUsage.rss / 1024 / 1024)
        },
        activity: {
          last24Hours: {
            bookings: recentBookings.length,
            contracts: recentContracts.length,
            invoices: recentInvoices.length
          }
        },
        performance: {
          totalCheckTime: totalTime,
          dbResponseTime: dbTime
        }
      };
    } catch (error) {
      console.error('System health check failed:', error);
      return {
        status: 'unhealthy',
        timestamp: new Date(),
        error: error.message,
        database: { status: 'error' },
        memory: { status: 'unknown' },
        activity: { status: 'error' }
      };
    }
  }

  async getPlatformMetrics() {
    try {
      const [allUsers, allBookings, allContracts, allInvoices] = await Promise.all([
        db.select().from(users),
        db.select().from(bookings),
        db.select().from(contracts),
        db.select().from(invoices)
      ]);

      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const weeklyActivity = {
        users: allUsers.filter(u => u.createdAt >= oneWeekAgo).length,
        bookings: allBookings.filter(b => b.createdAt >= oneWeekAgo).length,
        contracts: allContracts.filter(c => c.createdAt >= oneWeekAgo).length,
        invoices: allInvoices.filter(i => i.createdAt >= oneWeekAgo).length
      };

      const monthlyActivity = {
        users: allUsers.filter(u => u.createdAt >= oneMonthAgo).length,
        bookings: allBookings.filter(b => b.createdAt >= oneMonthAgo).length,
        contracts: allContracts.filter(c => c.createdAt >= oneMonthAgo).length,
        invoices: allInvoices.filter(i => i.createdAt >= oneMonthAgo).length
      };

      // Calculate growth rates
      const userGrowthRate = allUsers.length > 0 ? 
        (weeklyActivity.users / allUsers.length) * 100 : 0;
      
      const bookingGrowthRate = allBookings.length > 0 ? 
        (weeklyActivity.bookings / allBookings.length) * 100 : 0;

      // Platform health score (0-100)
      const healthScore = Math.min(100, Math.max(0, 
        (weeklyActivity.users * 10) + 
        (weeklyActivity.bookings * 5) + 
        (weeklyActivity.contracts * 3) + 
        (weeklyActivity.invoices * 2)
      ));

      return {
        totals: {
          users: allUsers.length,
          bookings: allBookings.length,
          contracts: allContracts.length,
          invoices: allInvoices.length
        },
        weekly: weeklyActivity,
        monthly: monthlyActivity,
        growthRates: {
          users: userGrowthRate,
          bookings: bookingGrowthRate
        },
        healthScore,
        lastUpdated: now
      };
    } catch (error) {
      console.error('Error getting platform metrics:', error);
      return {
        error: error.message,
        totals: { users: 0, bookings: 0, contracts: 0, invoices: 0 },
        weekly: { users: 0, bookings: 0, contracts: 0, invoices: 0 },
        monthly: { users: 0, bookings: 0, contracts: 0, invoices: 0 },
        growthRates: { users: 0, bookings: 0 },
        healthScore: 0,
        lastUpdated: new Date()
      };
    }
  }
}

export const storage = new DatabaseStorage();
