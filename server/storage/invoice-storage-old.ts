import { db } from "../core/database";
import { invoices } from "../../shared/schema";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";

export class InvoiceStorage {
  private db = db;

  // ===== INVOICE METHODS =====
  
  async getInvoice(id: number) {
    const result = await db.select().from(invoices).where(eq(invoices.id, id));
    return result[0] || null;
  }

  async getInvoiceByIdAndUser(id: number, userId: string) {
    const result = await db.select().from(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.userId, userId)));
    return result[0] || null;
  }

  async getInvoicesByUser(userId: string) {
    return await db.select().from(invoices)
      .where(eq(invoices.userId, userId))
      .orderBy(desc(invoices.createdAt));
  }

  async createInvoice(invoiceData: any) {
    const result = await db.insert(invoices).values({
      ...invoiceData,
      issueDate: invoiceData.issueDate ? new Date(invoiceData.issueDate) : new Date(),
      dueDate: invoiceData.dueDate ? new Date(invoiceData.dueDate) : new Date(),
      eventDate: invoiceData.eventDate ? new Date(invoiceData.eventDate) : new Date(),
      paidDate: invoiceData.paidDate ? new Date(invoiceData.paidDate) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return result[0];
  }

  async updateInvoice(id: number, updates: any, userId: string) {
    const setData = {
      ...updates,
      issueDate: updates.issueDate ? new Date(updates.issueDate) : undefined,
      dueDate: updates.dueDate ? new Date(updates.dueDate) : undefined,
      eventDate: updates.eventDate ? new Date(updates.eventDate) : undefined,
      paidDate: updates.paidDate ? new Date(updates.paidDate) : undefined,
      updatedAt: new Date(),
    };

    const result = await db.update(invoices)
      .set(setData)
      .where(and(eq(invoices.id, id), eq(invoices.userId, userId)))
      .returning();
    
    return result[0];
  }

  async deleteInvoice(id: number, userId: string) {
    const result = await db.delete(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.userId, userId)))
      .returning();
    return result[0];
  }

  // ===== INVOICE STATISTICS =====
  
  async getInvoiceStats(userId: string) {
    const result = await db.select({
      total: sql<number>`count(*)`,
      paid: sql<number>`count(case when status = 'paid' then 1 end)`,
      pending: sql<number>`count(case when status = 'pending' then 1 end)`,
      overdue: sql<number>`count(case when status = 'overdue' then 1 end)`,
      totalRevenue: sql<number>`sum(amount)`,
      paidRevenue: sql<number>`sum(case when status = 'paid' then amount else 0 end)`,
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

  async getRecentInvoices(userId: string, limit: number = 5) {
    return await db.select().from(invoices)
      .where(eq(invoices.userId, userId))
      .orderBy(desc(invoices.createdAt))
      .limit(limit);
  }

  async getInvoicesByStatus(userId: string, status: string) {
    return await db.select().from(invoices)
      .where(and(
        eq(invoices.userId, userId),
        eq(invoices.status, status)
      ))
      .orderBy(desc(invoices.dueDate));
  }

  async getInvoicesByDateRange(userId: string, startDate: Date, endDate: Date) {
    return await db.select().from(invoices)
      .where(and(
        eq(invoices.userId, userId),
        gte(invoices.issueDate, startDate),
        lte(invoices.issueDate, endDate)
      ))
      .orderBy(desc(invoices.issueDate));
  }

  async getOverdueInvoices(userId: string) {
    const today = new Date();
    return await db.select().from(invoices)
      .where(and(
        eq(invoices.userId, userId),
        eq(invoices.status, 'pending'),
        lte(invoices.dueDate, today)
      ))
      .orderBy(desc(invoices.dueDate));
  }

  async markInvoiceAsPaid(id: number, userId: string) {
    const result = await db.update(invoices)
      .set({ 
        status: 'paid', 
        paidDate: new Date(),
        updatedAt: new Date()
      })
      .where(and(eq(invoices.id, id), eq(invoices.userId, userId)))
      .returning();
    
    return result[0];
  }

  async getUnpaidInvoicesByContract(contractId: number, userId: string) {
    return await db.select().from(invoices)
      .where(and(
        eq(invoices.userId, userId),
        eq(invoices.contractId, contractId),
        eq(invoices.status, 'pending')
      ))
      .orderBy(desc(invoices.dueDate));
  }

  // ===== ADMIN METHODS =====
  
  async getAllInvoicesCount() {
    const result = await db.select({ count: sql<number>`count(*)` }).from(invoices);
    return result[0]?.count || 0;
  }
}

export const invoiceStorage = new InvoiceStorage();