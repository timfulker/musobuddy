import {
  users,
  enquiries,
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

} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, ne } from "drizzle-orm";

export interface IStorage {
  // User operations - mandatory for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Enquiry operations
  getEnquiries(userId: string): Promise<Enquiry[]>;
  getEnquiry(id: number, userId: string): Promise<Enquiry | undefined>;
  createEnquiry(enquiry: InsertEnquiry): Promise<Enquiry>;
  updateEnquiry(id: number, enquiry: Partial<InsertEnquiry>, userId: string): Promise<Enquiry | undefined>;
  deleteEnquiry(id: number, userId: string): Promise<boolean>;
  
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
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
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

  // Enquiry operations
  async getEnquiries(userId: string): Promise<Enquiry[]> {
    return await db
      .select()
      .from(enquiries)
      .where(eq(enquiries.userId, userId))
      .orderBy(desc(enquiries.createdAt));
  }

  async getEnquiry(id: number, userId: string): Promise<Enquiry | undefined> {
    const [enquiry] = await db
      .select()
      .from(enquiries)
      .where(and(eq(enquiries.id, id), eq(enquiries.userId, userId)));
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
      .insert(enquiries)
      .values(processedEnquiry)
      .returning();
    return newEnquiry;
  }

  async updateEnquiry(id: number, enquiry: Partial<InsertEnquiry>, userId: string): Promise<Enquiry | undefined> {
    const [updatedEnquiry] = await db
      .update(enquiries)
      .set({ ...enquiry, updatedAt: new Date() })
      .where(and(eq(enquiries.id, id), eq(enquiries.userId, userId)))
      .returning();
    return updatedEnquiry;
  }

  async deleteEnquiry(id: number, userId: string): Promise<boolean> {
    const result = await db
      .delete(enquiries)
      .where(and(eq(enquiries.id, id), eq(enquiries.userId, userId)));
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
    const result = await db.delete(contracts)
      .where(and(eq(contracts.id, id), eq(contracts.userId, userId)));
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
    conversionRate: number;
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

    // Active bookings (upcoming confirmed bookings)
    const activeBookingsCount = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.userId, userId),
          eq(bookings.status, "confirmed"),
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

    // Conversion rate (confirmed bookings / total enquiries)
    const totalEnquiries = await db
      .select()
      .from(enquiries)
      .where(eq(enquiries.userId, userId));

    const confirmedBookingsCount = await db
      .select()
      .from(enquiries)
      .where(
        and(
          eq(enquiries.userId, userId),
          eq(enquiries.status, "confirmed")
        )
      );

    const conversionRate = totalEnquiries.length > 0 
      ? (confirmedBookingsCount.length / totalEnquiries.length) * 100 
      : 0;

    return {
      monthlyRevenue,
      activeBookings: activeBookingsCount.length,
      pendingInvoices,
      overdueInvoices: overdueInvoicesCount.length,
      conversionRate: Math.round(conversionRate),
    };
  }

  // User settings operations
  async getUserSettings(userId: string): Promise<UserSettings | undefined> {
    try {
      const [settings] = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, userId));
      
      // Handle missing columns gracefully
      if (settings) {
        return {
          ...settings,
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
    
    // First try to find existing settings
    const [existingSettings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, settings.userId));

    console.log('🔥 STORAGE: Existing settings found:', existingSettings ? 'YES' : 'NO');

    if (existingSettings) {
      // Update existing settings
      console.log('🔥 STORAGE: Updating existing settings');
      const [updatedSettings] = await db
        .update(userSettings)
        .set({
          ...settings,
          updatedAt: new Date(),
        })
        .where(eq(userSettings.userId, settings.userId))
        .returning();
      console.log('🔥 STORAGE: Updated settings result:', JSON.stringify(updatedSettings, null, 2));
      return updatedSettings;
    } else {
      // Insert new settings
      console.log('🔥 STORAGE: Creating new settings');
      const [newSettings] = await db
        .insert(userSettings)
        .values({
          ...settings,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      console.log('🔥 STORAGE: Created settings result:', JSON.stringify(newSettings, null, 2));
      return newSettings;
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
}

export const storage = new DatabaseStorage();
