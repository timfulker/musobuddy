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

  async getAllInvoices() {
    return await db.select().from(invoices).orderBy(desc(invoices.createdAt));
  }

  async getInvoiceByToken(token: string) {
    const result = await db.select().from(invoices)
      .where(eq(invoices.shareToken, token));
    return result[0] || null;
  }

  async createInvoice(invoiceData: any) {
    // Generate secure share token for invoice access
    const { randomBytes } = await import('crypto');
    const shareToken = randomBytes(32).toString('hex'); // 64-character secure token
    
    try {
      // FIXED: Align with actual schema fields from shared/schema.ts
      const result = await db.insert(invoices).values({
        userId: invoiceData.userId,
        contractId: invoiceData.contractId || null,
        bookingId: invoiceData.bookingId || null,
        invoiceNumber: invoiceData.invoiceNumber,
        clientName: invoiceData.clientName,
        clientEmail: invoiceData.clientEmail || null,
        ccEmail: invoiceData.ccEmail || null,
        clientAddress: invoiceData.clientAddress || null,
        venueAddress: invoiceData.venueAddress || null,
        eventDate: invoiceData.eventDate ? new Date(invoiceData.eventDate) : null,
        // fee: removed - use bookings.fee as single source of truth
        depositPaid: invoiceData.depositPaid || "0",
        amount: invoiceData.amount,
        dueDate: new Date(invoiceData.dueDate),
        status: invoiceData.status || "draft",
        paidAt: invoiceData.paidAt ? new Date(invoiceData.paidAt) : null, // FIXED: Use paidAt not paidDate
        performanceDuration: invoiceData.performanceDuration || null,
        gigType: invoiceData.gigType || null,
        invoiceType: invoiceData.invoiceType || 'performance',
        description: invoiceData.description || null,
        cloudStorageUrl: invoiceData.cloudStorageUrl || null,
        cloudStorageKey: invoiceData.cloudStorageKey || null,
        shareToken: shareToken, // Secure token for public access
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      return result[0];
    } catch (error: any) {
      // If duplicate invoice number, generate a new one with timestamp
      if (error.code === '23505' && error.constraint === 'invoices_invoice_number_unique') {
        console.log('⚠️ Duplicate invoice number detected, generating unique one...');
        const uniqueInvoiceData = {
          ...invoiceData,
          invoiceNumber: `${invoiceData.invoiceNumber}-${Date.now()}`
        };
        
        // Retry with unique invoice number
        const result = await db.insert(invoices).values({
          userId: uniqueInvoiceData.userId,
          contractId: uniqueInvoiceData.contractId || null,
          bookingId: uniqueInvoiceData.bookingId || null,
          invoiceNumber: uniqueInvoiceData.invoiceNumber,
          clientName: uniqueInvoiceData.clientName,
          clientEmail: uniqueInvoiceData.clientEmail || null,
          ccEmail: uniqueInvoiceData.ccEmail || null,
          clientAddress: uniqueInvoiceData.clientAddress || null,
          venueAddress: uniqueInvoiceData.venueAddress || null,
          eventDate: uniqueInvoiceData.eventDate ? new Date(uniqueInvoiceData.eventDate) : null,
          // fee: removed - use bookings.fee as single source of truth
          depositPaid: uniqueInvoiceData.depositPaid || "0",
          amount: uniqueInvoiceData.amount,
          dueDate: new Date(uniqueInvoiceData.dueDate),
          status: uniqueInvoiceData.status || "draft",
          paidAt: uniqueInvoiceData.paidAt ? new Date(uniqueInvoiceData.paidAt) : null,
          performanceDuration: uniqueInvoiceData.performanceDuration || null,
          gigType: uniqueInvoiceData.gigType || null,
          invoiceType: uniqueInvoiceData.invoiceType || 'performance',
          description: uniqueInvoiceData.description || null,
          cloudStorageUrl: uniqueInvoiceData.cloudStorageUrl || null,
          cloudStorageKey: uniqueInvoiceData.cloudStorageKey || null,
          shareToken: shareToken,
          createdAt: new Date(),
          updatedAt: new Date(),
        }).returning();
        return result[0];
      }
      throw error;
    }
  }

  async updateInvoice(id: number, userId: string, updates: any) {
    // FIXED: Only include fields that exist in schema
    const setData: any = {
      updatedAt: new Date(),
    };

    // Only set fields that are provided and exist in schema
    if (updates.contractId !== undefined) setData.contractId = updates.contractId;
    if (updates.bookingId !== undefined) setData.bookingId = updates.bookingId;
    if (updates.invoiceNumber !== undefined) setData.invoiceNumber = updates.invoiceNumber;
    if (updates.clientName !== undefined) setData.clientName = updates.clientName;
    if (updates.clientEmail !== undefined) setData.clientEmail = updates.clientEmail;
    if (updates.ccEmail !== undefined) setData.ccEmail = updates.ccEmail;
    if (updates.clientAddress !== undefined) setData.clientAddress = updates.clientAddress;
    if (updates.venueAddress !== undefined) setData.venueAddress = updates.venueAddress;
    if (updates.eventDate !== undefined) setData.eventDate = updates.eventDate ? new Date(updates.eventDate) : null;
    // fee: removed - use bookings.fee as single source of truth
    if (updates.depositPaid !== undefined) setData.depositPaid = updates.depositPaid;
    if (updates.amount !== undefined) setData.amount = updates.amount;
    if (updates.dueDate !== undefined) setData.dueDate = new Date(updates.dueDate);
    if (updates.status !== undefined) setData.status = updates.status;
    if (updates.paidAt !== undefined) setData.paidAt = updates.paidAt ? new Date(updates.paidAt) : null;
    if (updates.performanceDuration !== undefined) setData.performanceDuration = updates.performanceDuration;
    if (updates.gigType !== undefined) setData.gigType = updates.gigType;
    if (updates.cloudStorageUrl !== undefined) setData.cloudStorageUrl = updates.cloudStorageUrl;
    if (updates.cloudStorageKey !== undefined) setData.cloudStorageKey = updates.cloudStorageKey;

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
      sent: sql<number>`count(case when status = 'sent' then 1 end)`, // FIXED: Use 'sent' instead of 'pending'
      overdue: sql<number>`count(case when status = 'overdue' then 1 end)`,
      totalRevenue: sql<number>`sum(amount)`,
      paidRevenue: sql<number>`sum(case when status = 'paid' then amount else 0 end)`,
    })
    .from(invoices)
    .where(eq(invoices.userId, userId));
    
    return result[0] || { 
      total: 0, 
      paid: 0, 
      sent: 0, 
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
        gte(invoices.createdAt, startDate), // FIXED: Use createdAt since issueDate doesn't exist
        lte(invoices.createdAt, endDate)
      ))
      .orderBy(desc(invoices.createdAt));
  }

  async getOverdueInvoices(userId: string) {
    const today = new Date();
    return await db.select().from(invoices)
      .where(and(
        eq(invoices.userId, userId),
        eq(invoices.status, 'sent'), // FIXED: Use 'sent' instead of 'pending'
        lte(invoices.dueDate, today)
      ))
      .orderBy(desc(invoices.dueDate));
  }

  async markInvoiceAsPaid(id: number, userId: string) {
    const result = await db.update(invoices)
      .set({ 
        status: 'paid', 
        paidAt: new Date(), // FIXED: Use paidAt not paidDate
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
        eq(invoices.status, 'sent') // FIXED: Use 'sent' instead of 'pending'
      ))
      .orderBy(desc(invoices.dueDate));
  }

  // ===== ALIAS METHODS FOR COMPATIBILITY =====
  
  // Alias for getInvoicesByUser to match route expectations
  async getInvoices(userId: string) {
    return this.getInvoicesByUser(userId);
  }

  // ===== ADMIN METHODS =====
  
  async getAllInvoicesCount() {
    const result = await db.select({ count: sql<number>`count(*)` }).from(invoices);
    return result[0]?.count || 0;
  }

  async getTotalInvoiceCount() {
    return this.getAllInvoicesCount();
  }

  // ===== NOTIFICATION COUNT METHODS =====
  
  async getOverdueInvoicesCount(userId: string) {
    // Count invoices that are overdue and not paid
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(invoices)
      .where(and(
        eq(invoices.userId, userId),
        eq(invoices.status, 'sent'), // Only sent invoices can be overdue
        sql`${invoices.dueDate} <= CURRENT_DATE`, // Due date has passed
        sql`${invoices.paidAt} IS NULL` // Not paid yet
      ));
    // Ensure we return a number, not a string
    return parseInt(String(result[0]?.count || 0), 10);
  }

  async getPendingInvoicesAmount(userId: string): Promise<number> {
    // Get total amount of unpaid invoices
    const result = await db.select({ 
      total: sql<number>`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)` 
    })
      .from(invoices)
      .where(and(
        eq(invoices.userId, userId),
        eq(invoices.status, 'sent'),
        sql`${invoices.paidAt} IS NULL`
      ));
    
    return Number(result[0]?.total || 0);
  }
}

export const invoiceStorage = new InvoiceStorage();