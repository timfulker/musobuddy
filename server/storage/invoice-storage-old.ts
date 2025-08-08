import { db } from "../core/database";
import { invoices } from "../../shared/schema";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";

interface InvoiceData {
  userId: string;
  contractId?: number;
  invoiceNumber: string;
  clientName: string;
  clientEmail?: string;
  clientAddress?: string;
  amount: string;
  status?: string;
  issueDate?: Date;
  dueDate?: Date;
  eventDate?: Date;
  paidDate?: Date;
  description?: string;
  items?: any;
  notes?: string;
  cloudStorageUrl?: string;
  cloudStorageKey?: string;
}

interface InvoiceUpdate {
  contractId?: number;
  invoiceNumber?: string;
  clientName?: string;
  clientEmail?: string;
  clientAddress?: string;
  amount?: string;
  status?: string;
  issueDate?: Date;
  dueDate?: Date;
  eventDate?: Date;
  paidDate?: Date;
  description?: string;
  items?: any;
  notes?: string;
  cloudStorageUrl?: string;
  cloudStorageKey?: string;
}

interface InvoiceStats {
  total: number;
  paid: number;
  pending: number;
  overdue: number;
  totalRevenue: number;
  paidRevenue: number;
}

export class InvoiceStorage {
  private db = db;

  // ==== INVOICE METHODS ====
  
  async getInvoice(id: number): Promise<any | null> {
    const result = await db.select().from(invoices).where(eq(invoices.id, id));
    return result[0] || null;
  }

  async getInvoiceByIdAndUser(id: number, userId: string): Promise<any | null> {
    const result = await db.select().from(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.userId, userId)));
    return result[0] || null;
  }

  async getInvoicesByUser(userId: string): Promise<any[]> {
    return await db.select().from(invoices)
      .where(eq(invoices.userId, userId))
      .orderBy(desc(invoices.createdAt));
  }

  async createInvoice(invoiceData: InvoiceData): Promise<any> {
    const result = await db.insert(invoices).values({
      userId: invoiceData.userId,
      contractId: invoiceData.contractId,
      invoiceNumber: invoiceData.invoiceNumber,
      clientName: invoiceData.clientName,
      clientEmail: invoiceData.clientEmail,
      clientAddress: invoiceData.clientAddress,
      amount: invoiceData.amount,
      dueDate: invoiceData.dueDate ? new Date(invoiceData.dueDate) : new Date(),
      eventDate: invoiceData.eventDate ? new Date(invoiceData.eventDate) : null,
      paidAt: invoiceData.paidDate ? new Date(invoiceData.paidDate) : null,
      status: invoiceData.status || 'pending',
      cloudStorageUrl: invoiceData.cloudStorageUrl,
      cloudStorageKey: invoiceData.cloudStorageKey,
    }).returning();
    return result[0];
  }

  async updateInvoice(id: number, updates: InvoiceUpdate, userId: string): Promise<any> {
    const setData: any = {
      ...updates,
      updatedAt: new Date(),
    };

    // Handle date conversions
    if (updates.dueDate !== undefined) {
      setData.dueDate = updates.dueDate ? new Date(updates.dueDate) : null;
    }
    if (updates.eventDate !== undefined) {
      setData.eventDate = updates.eventDate ? new Date(updates.eventDate) : null;
    }
    if (updates.paidDate !== undefined) {
      setData.paidAt = updates.paidDate ? new Date(updates.paidDate) : null;
    }

    const result = await db.update(invoices)
      .set(setData)
      .where(and(eq(invoices.id, id), eq(invoices.userId, userId)))
      .returning();
    
    return result[0];
  }

  async deleteInvoice(id: number, userId: string): Promise<any> {
    const result = await db.delete(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.userId, userId)))
      .returning();
    return result[0];
  }

  // ==== INVOICE STATISTICS ====
  
  async getInvoiceStats(userId: string): Promise<InvoiceStats> {
    const result = await db.select({
      total: sql<number>`count(*)`,
      paid: sql<number>`count(case when status = 'paid' then 1 end)`,
      pending: sql<number>`count(case when status = 'pending' then 1 end)`,
      overdue: sql<number>`count(case when status = 'overdue' then 1 end)`,
      totalRevenue: sql<number>`sum(cast(amount as decimal))`,
      paidRevenue: sql<number>`sum(case when status = 'paid' then cast(amount as decimal) else 0 end)`,
    })
    .from(invoices)
    .where(eq(invoices.userId, userId));
    
    return result[0] || { 
      total: 0, 
      paid: 0, 
      pending: 0, 
      overdue: 0,
      totalRevenue: 0,
      paidRevenue: 0
    };
  }

  async getRecentInvoices(userId: string, limit: number = 5): Promise<any[]> {
    return await db.select().from(invoices)
      .where(eq(invoices.userId, userId))
      .orderBy(desc(invoices.createdAt))
      .limit(limit);
  }

  async getInvoicesByStatus(userId: string, status: string): Promise<any[]> {
    return await db.select().from(invoices)
      .where(and(
        eq(invoices.userId, userId),
        eq(invoices.status, status)
      ))
      .orderBy(desc(invoices.dueDate));
  }

  async getInvoicesByDateRange(userId: string, startDate: Date, endDate: Date): Promise<any[]> {
    return await db.select().from(invoices)
      .where(and(
        eq(invoices.userId, userId),
        gte(invoices.eventDate, startDate),
        lte(invoices.eventDate, endDate)
      ))
      .orderBy(desc(invoices.eventDate));
  }

  async getOverdueInvoices(userId: string): Promise<any[]> {
    const today = new Date();
    return await db.select().from(invoices)
      .where(and(
        eq(invoices.userId, userId),
        eq(invoices.status, 'pending'),
        lte(invoices.dueDate, today)
      ))
      .orderBy(desc(invoices.dueDate));
  }

  async markInvoiceAsPaid(id: number, userId: string): Promise<any> {
    const result = await db.update(invoices)
      .set({ 
        status: 'paid', 
        paidAt: new Date(),
      })
      .where(and(eq(invoices.id, id), eq(invoices.userId, userId)))
      .returning();
    
    return result[0];
  }

  async getUnpaidInvoicesByContract(contractId: number, userId: string): Promise<any[]> {
    return await db.select().from(invoices)
      .where(and(
        eq(invoices.userId, userId),
        eq(invoices.contractId, contractId),
        eq(invoices.status, 'pending')
      ))
      .orderBy(desc(invoices.dueDate));
  }

  // ==== ADMIN METHODS ====
  
  async getAllInvoicesCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(invoices);
    return result[0]?.count || 0;
  }
}

export const invoiceStorage = new InvoiceStorage();