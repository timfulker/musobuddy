import { db } from "./database";
import { bookings, contracts, invoices, users, sessions, userSettings } from "../../shared/schema";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import bcrypt from "bcrypt";

export class Storage {
  // Users
  async getUser(id: string) {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0] || null;
  }

  async getUserByEmail(email: string) {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0] || null;
  }

  async createUser(userData: any) {
    const hashedPassword = userData.password ? await bcrypt.hash(userData.password, 10) : null;
    const result = await db.insert(users).values({
      ...userData,
      password: hashedPassword
    }).returning();
    return result[0];
  }

  async updateUserInfo(id: string, updates: any) {
    const result = await db.update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  // Bookings
  async getBookings(userId: string) {
    return await db.select().from(bookings)
      .where(eq(bookings.userId, userId))
      .orderBy(desc(bookings.createdAt));
  }

  async getBooking(id: number) {
    const result = await db.select().from(bookings).where(eq(bookings.id, id));
    return result[0] || null;
  }

  async createBooking(bookingData: any) {
    // Convert date strings to Date objects for timestamp fields
    const processedData = {
      ...bookingData,
      eventDate: bookingData.eventDate ? new Date(bookingData.eventDate) : null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.insert(bookings).values(processedData).returning();
    return result[0];
  }

  async updateBooking(id: number, updates: any) {
    // Convert date strings to Date objects for timestamp fields
    const processedUpdates = {
      ...updates,
      eventDate: updates.eventDate ? new Date(updates.eventDate) : updates.eventDate,
      updatedAt: new Date()
    };
    
    const result = await db.update(bookings)
      .set(processedUpdates)
      .where(eq(bookings.id, id))
      .returning();
    return result[0];
  }

  async deleteBooking(id: number) {
    await db.delete(bookings).where(eq(bookings.id, id));
    return true;
  }

  // Contracts
  async getContracts(userId: string) {
    return await db.select().from(contracts)
      .where(eq(contracts.userId, userId))
      .orderBy(desc(contracts.createdAt));
  }

  async getContract(id: number) {
    const result = await db.select().from(contracts).where(eq(contracts.id, id));
    return result[0] || null;
  }

  async createContract(contractData: any) {
    // Convert date strings to Date objects for timestamp fields
    const processedData = {
      ...contractData,
      eventDate: contractData.eventDate ? new Date(contractData.eventDate) : null,
      signedAt: contractData.signedAt ? new Date(contractData.signedAt) : null,
      signingUrlCreatedAt: contractData.signingUrlCreatedAt ? new Date(contractData.signingUrlCreatedAt) : null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.insert(contracts).values(processedData).returning();
    return result[0];
  }

  async updateContract(id: number, updates: any) {
    // Convert date strings to Date objects for timestamp fields
    const processedUpdates = {
      ...updates,
      eventDate: updates.eventDate ? new Date(updates.eventDate) : updates.eventDate,
      signedAt: updates.signedAt ? new Date(updates.signedAt) : updates.signedAt,
      signingUrlCreatedAt: updates.signingUrlCreatedAt ? new Date(updates.signingUrlCreatedAt) : updates.signingUrlCreatedAt,
      updatedAt: new Date()
    };
    
    const result = await db.update(contracts)
      .set(processedUpdates)
      .where(eq(contracts.id, id))
      .returning();
    return result[0];
  }

  async deleteContract(id: number) {
    await db.delete(contracts).where(eq(contracts.id, id));
    return true;
  }

  // Invoices
  async getInvoices(userId: string) {
    return await db.select().from(invoices)
      .where(eq(invoices.userId, userId))
      .orderBy(desc(invoices.createdAt));
  }

  async getInvoice(id: number) {
    const result = await db.select().from(invoices).where(eq(invoices.id, id));
    return result[0] || null;
  }

  async createInvoice(invoiceData: any) {
    const result = await db.insert(invoices).values(invoiceData).returning();
    return result[0];
  }

  async updateInvoice(id: number, updates: any) {
    const result = await db.update(invoices)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(invoices.id, id))
      .returning();
    return result[0];
  }

  async deleteInvoice(id: number) {
    await db.delete(invoices).where(eq(invoices.id, id));
    return true;
  }

  // Settings
  async getSettings(userId: string) {
    const result = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
    return result[0] || null;
  }

  async updateSettings(userId: string, settingsData: any) {
    const existing = await this.getSettings(userId);
    
    if (existing) {
      const result = await db.update(userSettings)
        .set({ ...settingsData, updatedAt: new Date() })
        .where(eq(userSettings.userId, userId))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(userSettings)
        .values({ userId, ...settingsData })
        .returning();
      return result[0];
    }
  }

  // Compliance - simplified for now
  async getCompliance(userId: string) {
    return [];
  }

  async createCompliance(complianceData: any) {
    return complianceData;
  }

  async updateCompliance(id: number, updates: any) {
    return { id, ...updates };
  }

  // Contract signing methods (missing methods that routes.ts calls)
  async getContractById(id: number) {
    const result = await db.select().from(contracts).where(eq(contracts.id, id));
    return result[0] || null;
  }

  async getUserSettings(userId: string) {
    const result = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
    return result[0] || null;
  }

  async signContract(contractId: number, signatureData: any) {
    console.log('🗄️ STORAGE: signContract called with:', { contractId, signatureData });
    
    try {
      const updateData = {
        status: 'signed',
        signedAt: signatureData.signedAt,
        clientPhone: signatureData.clientPhone,
        clientAddress: signatureData.clientAddress,
        venueAddress: signatureData.venueAddress,
        updatedAt: new Date()
      };
      
      console.log('🗄️ STORAGE: About to update contract with data:', updateData);
      
      const result = await db.update(contracts)
        .set(updateData)
        .where(eq(contracts.id, contractId))
        .returning();
      
      console.log('🗄️ STORAGE: Database update result:', result);
      console.log('🗄️ STORAGE: Number of updated records:', result.length);
      
      if (result.length > 0) {
        console.log('🗄️ STORAGE: Contract successfully updated, new status:', result[0].status);
        return result[0];
      } else {
        console.log('🗄️ STORAGE: ERROR - No records updated, contract may not exist');
        return null;
      }
    } catch (error) {
      console.error('🗄️ STORAGE: Error updating contract:', error);
      throw error;
    }
  }

  // Admin functions
  async getAllUsers() {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getAllBookings() {
    return await db.select().from(bookings).orderBy(desc(bookings.createdAt));
  }

  async getStats() {
    const userCount = await db.select({ count: sql<number>`count(*)` }).from(users);
    const bookingCount = await db.select({ count: sql<number>`count(*)` }).from(bookings);
    const contractCount = await db.select({ count: sql<number>`count(*)` }).from(contracts);
    const invoiceCount = await db.select({ count: sql<number>`count(*)` }).from(invoices);

    return {
      users: userCount[0].count,
      bookings: bookingCount[0].count,
      contracts: contractCount[0].count,
      invoices: invoiceCount[0].count
    };
  }
}

export const storage = new Storage();