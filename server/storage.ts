import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { eq, desc, and, or } from 'drizzle-orm';
import * as schema from '../shared/schema.js';
import type { 
  User, InsertUser, 
  Enquiry, InsertEnquiry,
  Contract, InsertContract,
  Invoice, InsertInvoice,
  Booking, InsertBooking,
  Compliance, InsertCompliance
} from '../shared/schema.js';

// Database connection
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

export interface IStorage {
  // User operations
  createUser(user: InsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | null>;
  getUserById(id: string): Promise<User | null>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User>;

  // Enquiry operations
  createEnquiry(enquiry: InsertEnquiry): Promise<Enquiry>;
  getEnquiriesByUser(userId: string): Promise<Enquiry[]>;
  getEnquiryById(id: string): Promise<Enquiry | null>;
  updateEnquiry(id: string, updates: Partial<InsertEnquiry>): Promise<Enquiry>;
  deleteEnquiry(id: string): Promise<void>;

  // Contract operations
  createContract(contract: InsertContract): Promise<Contract>;
  getContractsByUser(userId: string): Promise<Contract[]>;
  getContractById(id: string): Promise<Contract | null>;
  updateContract(id: string, updates: Partial<InsertContract>): Promise<Contract>;
  deleteContract(id: string): Promise<void>;

  // Invoice operations
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  getInvoicesByUser(userId: string): Promise<Invoice[]>;
  getInvoiceById(id: string): Promise<Invoice | null>;
  updateInvoice(id: string, updates: Partial<InsertInvoice>): Promise<Invoice>;
  deleteInvoice(id: string): Promise<void>;

  // Booking operations
  createBooking(booking: InsertBooking): Promise<Booking>;
  getBookingsByUser(userId: string): Promise<Booking[]>;
  getBookingById(id: string): Promise<Booking | null>;
  updateBooking(id: string, updates: Partial<InsertBooking>): Promise<Booking>;
  deleteBooking(id: string): Promise<void>;

  // Compliance operations
  createCompliance(compliance: InsertCompliance): Promise<Compliance>;
  getComplianceByUser(userId: string): Promise<Compliance[]>;
  getComplianceById(id: string): Promise<Compliance | null>;
  updateCompliance(id: string, updates: Partial<InsertCompliance>): Promise<Compliance>;
  deleteCompliance(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(schema.users).values(user).returning();
    return created;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email));
    return user || null;
  }

  async getUserById(id: string): Promise<User | null> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id));
    return user || null;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User> {
    const [updated] = await db.update(schema.users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(schema.users.id, id))
      .returning();
    return updated;
  }

  // Enquiry operations
  async createEnquiry(enquiry: InsertEnquiry): Promise<Enquiry> {
    const [created] = await db.insert(schema.enquiries).values(enquiry).returning();
    return created;
  }

  async getEnquiriesByUser(userId: string): Promise<Enquiry[]> {
    return await db.select().from(schema.enquiries)
      .where(eq(schema.enquiries.userId, userId))
      .orderBy(desc(schema.enquiries.createdAt));
  }

  async getEnquiryById(id: string): Promise<Enquiry | null> {
    const [enquiry] = await db.select().from(schema.enquiries).where(eq(schema.enquiries.id, id));
    return enquiry || null;
  }

  async updateEnquiry(id: string, updates: Partial<InsertEnquiry>): Promise<Enquiry> {
    const [updated] = await db.update(schema.enquiries)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(schema.enquiries.id, id))
      .returning();
    return updated;
  }

  async deleteEnquiry(id: string): Promise<void> {
    await db.delete(schema.enquiries).where(eq(schema.enquiries.id, id));
  }

  // Contract operations
  async createContract(contract: InsertContract): Promise<Contract> {
    const [created] = await db.insert(schema.contracts).values(contract).returning();
    return created;
  }

  async getContractsByUser(userId: string): Promise<Contract[]> {
    return await db.select().from(schema.contracts)
      .where(eq(schema.contracts.userId, userId))
      .orderBy(desc(schema.contracts.createdAt));
  }

  async getContractById(id: string): Promise<Contract | null> {
    const [contract] = await db.select().from(schema.contracts).where(eq(schema.contracts.id, id));
    return contract || null;
  }

  async updateContract(id: string, updates: Partial<InsertContract>): Promise<Contract> {
    const [updated] = await db.update(schema.contracts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(schema.contracts.id, id))
      .returning();
    return updated;
  }

  async deleteContract(id: string): Promise<void> {
    await db.delete(schema.contracts).where(eq(schema.contracts.id, id));
  }

  // Invoice operations
  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [created] = await db.insert(schema.invoices).values(invoice).returning();
    return created;
  }

  async getInvoicesByUser(userId: string): Promise<Invoice[]> {
    return await db.select().from(schema.invoices)
      .where(eq(schema.invoices.userId, userId))
      .orderBy(desc(schema.invoices.createdAt));
  }

  async getInvoiceById(id: string): Promise<Invoice | null> {
    const [invoice] = await db.select().from(schema.invoices).where(eq(schema.invoices.id, id));
    return invoice || null;
  }

  async updateInvoice(id: string, updates: Partial<InsertInvoice>): Promise<Invoice> {
    const [updated] = await db.update(schema.invoices)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(schema.invoices.id, id))
      .returning();
    return updated;
  }

  async deleteInvoice(id: string): Promise<void> {
    await db.delete(schema.invoices).where(eq(schema.invoices.id, id));
  }

  // Booking operations
  async createBooking(booking: InsertBooking): Promise<Booking> {
    const [created] = await db.insert(schema.bookings).values(booking).returning();
    return created;
  }

  async getBookingsByUser(userId: string): Promise<Booking[]> {
    return await db.select().from(schema.bookings)
      .where(eq(schema.bookings.userId, userId))
      .orderBy(desc(schema.bookings.eventDate));
  }

  async getBookingById(id: string): Promise<Booking | null> {
    const [booking] = await db.select().from(schema.bookings).where(eq(schema.bookings.id, id));
    return booking || null;
  }

  async updateBooking(id: string, updates: Partial<InsertBooking>): Promise<Booking> {
    const [updated] = await db.update(schema.bookings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(schema.bookings.id, id))
      .returning();
    return updated;
  }

  async deleteBooking(id: string): Promise<void> {
    await db.delete(schema.bookings).where(eq(schema.bookings.id, id));
  }

  // Compliance operations
  async createCompliance(compliance: InsertCompliance): Promise<Compliance> {
    const [created] = await db.insert(schema.compliance).values(compliance).returning();
    return created;
  }

  async getComplianceByUser(userId: string): Promise<Compliance[]> {
    return await db.select().from(schema.compliance)
      .where(eq(schema.compliance.userId, userId))
      .orderBy(desc(schema.compliance.expiryDate));
  }

  async getComplianceById(id: string): Promise<Compliance | null> {
    const [compliance] = await db.select().from(schema.compliance).where(eq(schema.compliance.id, id));
    return compliance || null;
  }

  async updateCompliance(id: string, updates: Partial<InsertCompliance>): Promise<Compliance> {
    const [updated] = await db.update(schema.compliance)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(schema.compliance.id, id))
      .returning();
    return updated;
  }

  async deleteCompliance(id: string): Promise<void> {
    await db.delete(schema.compliance).where(eq(schema.compliance.id, id));
  }
}

export const storage = new DatabaseStorage();