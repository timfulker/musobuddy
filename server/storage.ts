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
  getContract(id: number, userId: string): Promise<Contract | undefined>;
  getContractById(id: number): Promise<Contract | undefined>; // Public access for signing
  createContract(contract: InsertContract): Promise<Contract>;
  updateContract(id: number, contract: Partial<InsertContract>, userId: string): Promise<Contract | undefined>;
  deleteContract(id: number, userId: string): Promise<boolean>;
  signContract(id: number, signatureData: { signatureName: string; clientIP: string; signedAt: Date }): Promise<Contract | undefined>;
  
  // Invoice operations
  getInvoices(userId: string): Promise<Invoice[]>;
  getInvoice(id: number, userId: string): Promise<Invoice | undefined>;
  getInvoiceById(id: number): Promise<Invoice | undefined>; // Public access for viewing
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, invoice: Partial<InsertInvoice>, userId: string): Promise<Invoice | undefined>;
  deleteInvoice(id: number, userId: string): Promise<boolean>;
  
  // Booking operations
  getBookings(userId: string): Promise<Booking[]>;
  getUpcomingBookings(userId: string): Promise<Booking[]>;
  getBooking(id: number, userId: string): Promise<Booking | undefined>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: number, booking: Partial<InsertBooking>, userId: string): Promise<Booking | undefined>;
  
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
  
  // Email template operations
  getEmailTemplates(userId: string): Promise<EmailTemplate[]>;
  createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate>;
  updateEmailTemplate(id: number, updates: Partial<EmailTemplate>, userId: string): Promise<EmailTemplate | undefined>;
  deleteEmailTemplate(id: number, userId: string): Promise<boolean>;
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
    const [newEnquiry] = await db
      .insert(enquiries)
      .values(enquiry)
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

  async signContract(id: number, signatureData: { signatureName: string; clientIP: string; signedAt: Date }): Promise<Contract | undefined> {
    const [signedContract] = await db
      .update(contracts)
      .set({
        status: 'signed',
        signedAt: signatureData.signedAt,
        updatedAt: new Date()
      })
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

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    // Get user settings to get next invoice number
    const settings = await this.getUserSettings(invoice.userId);
    let nextNumber = settings?.nextInvoiceNumber || 256;
    
    // Find the next available invoice number by checking existing invoices
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      const invoiceNumber = nextNumber.toString().padStart(5, '0');
      
      // Check if this invoice number already exists
      const [existingInvoice] = await db
        .select()
        .from(invoices)
        .where(and(
          eq(invoices.userId, invoice.userId),
          eq(invoices.invoiceNumber, invoiceNumber)
        ))
        .limit(1);
      
      if (!existingInvoice) {
        // Invoice number is available, create the invoice
        try {
          const [newInvoice] = await db
            .insert(invoices)
            .values({
              ...invoice,
              invoiceNumber,
            })
            .returning();
          
          // Update the next invoice number in user settings
          await db
            .update(userSettings)
            .set({ nextInvoiceNumber: nextNumber + 1 })
            .where(eq(userSettings.userId, invoice.userId));
          
          return newInvoice;
        } catch (error: any) {
          // Handle race condition - another invoice might have been created
          if (error.code === '23505' && error.constraint === 'invoices_invoice_number_unique') {
            nextNumber++;
            attempts++;
            continue;
          }
          throw error;
        }
      }
      
      // Invoice number exists, try the next one
      nextNumber++;
      attempts++;
    }
    
    throw new Error('Unable to generate unique invoice number after multiple attempts');
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
    const result = await db.delete(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.userId, userId)));
    return result.rowCount > 0;
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

    // Active bookings (upcoming)
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

    // Pending invoices
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
      conversionRate: Math.round(conversionRate),
    };
  }

  // User settings operations
  async getUserSettings(userId: string): Promise<UserSettings | undefined> {
    const [settings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId));
    return settings;
  }

  async upsertUserSettings(settings: InsertUserSettings): Promise<UserSettings> {
    // First try to find existing settings
    const [existingSettings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, settings.userId));

    if (existingSettings) {
      // Update existing settings
      const [updatedSettings] = await db
        .update(userSettings)
        .set({
          ...settings,
          updatedAt: new Date(),
        })
        .where(eq(userSettings.userId, settings.userId))
        .returning();
      return updatedSettings;
    } else {
      // Insert new settings
      const [newSettings] = await db
        .insert(userSettings)
        .values({
          ...settings,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      return newSettings;
    }
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
}

export const storage = new DatabaseStorage();
