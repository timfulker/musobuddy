import { db } from "./database";
import { bookings, contracts, invoices, users, sessions, userSettings, emailTemplates, complianceDocuments } from "../../shared/schema";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import bcrypt from "bcrypt";

export class Storage {
  private db = db;
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

  async updateUser(id: string, updates: any) {
    const result = await db.update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async updateUserPassword(id: string, password: string) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.update(users)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async deleteUser(id: string) {
    const result = await db.delete(users)
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
    
    // Remove undefined values to prevent database errors
    Object.keys(processedUpdates).forEach(key => {
      if (processedUpdates[key] === undefined) {
        delete processedUpdates[key];
      }
    });
    
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

  // FIXED: updateContract method with flexible signature to handle both authenticated and public calls
  async updateContract(id: number, updates: any, userId?: string) {
    // Convert date strings to Date objects for timestamp fields
    const processedUpdates = {
      ...updates,
      eventDate: updates.eventDate ? new Date(updates.eventDate) : updates.eventDate,
      signedAt: updates.signedAt ? new Date(updates.signedAt) : updates.signedAt,
      signingUrlCreatedAt: updates.signingUrlCreatedAt ? new Date(updates.signingUrlCreatedAt) : updates.signingUrlCreatedAt,
      updatedAt: new Date()
    };
    
    // Build query conditions based on whether userId is provided
    let whereCondition;
    if (userId) {
      // Authenticated update - verify ownership
      whereCondition = and(eq(contracts.id, id), eq(contracts.userId, userId));
    } else {
      // Public update (e.g., contract signing) - no ownership check
      whereCondition = eq(contracts.id, id);
    }
    
    const result = await db.update(contracts)
      .set(processedUpdates)
      .where(whereCondition)
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

  // ADDED: Missing updateInvoiceCloudStorage method that mailgun-email-restored.ts calls
  async updateInvoiceCloudStorage(id: number, cloudStorageUrl: string, cloudStorageKey: string, userId: string) {
    const result = await db.update(invoices)
      .set({ 
        cloudStorageUrl, 
        cloudStorageKey, 
        updatedAt: new Date() 
      })
      .where(and(eq(invoices.id, id), eq(invoices.userId, userId)))
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
    try {
      const documents = await this.db
        .select()
        .from(complianceDocuments)
        .where(eq(complianceDocuments.userId, userId))
        .orderBy(desc(complianceDocuments.createdAt));
      
      return documents;
    } catch (error) {
      console.error('Error fetching compliance documents:', error);
      return [];
    }
  }

  async createCompliance(complianceData: any) {
    try {
      const [document] = await this.db
        .insert(complianceDocuments)
        .values(complianceData)
        .returning();
      
      return document;
    } catch (error) {
      console.error('Error creating compliance document:', error);
      throw new Error('Failed to create compliance document');
    }
  }

  async deleteCompliance(documentId: number, userId: string) {
    try {
      const [deleted] = await this.db
        .delete(complianceDocuments)
        .where(and(
          eq(complianceDocuments.id, documentId),
          eq(complianceDocuments.userId, userId)
        ))
        .returning();
      
      return deleted;
    } catch (error) {
      console.error('Error deleting compliance document:', error);
      throw new Error('Failed to delete compliance document');
    }
  }

  async updateCompliance(id: number, updates: any) {
    return { id, ...updates };
  }

  // Contract signing methods (missing methods that routes.ts calls)
  async getContractById(id: number) {
    const result = await db.select().from(contracts).where(eq(contracts.id, id));
    return result[0] || null;
  }

  // Add overloaded getContract method that routes.ts expects
  async getContract(id: number, userId?: string) {
    if (userId) {
      const result = await db.select().from(contracts)
        .where(and(eq(contracts.id, id), eq(contracts.userId, userId)));
      return result[0] || null;
    } else {
      const result = await db.select().from(contracts).where(eq(contracts.id, id));
      return result[0] || null;
    }
  }

  async getUserSettings(userId: string) {
    const result = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
    return result[0] || null;
  }

  async signContract(contractId: number, signatureData: any) {
    console.log('🗄️ STORAGE: signContract called with:', { contractId, signatureData });
    
    try {
      // Verify the contract exists and can be signed
      const existingContract = await this.getContractById(contractId);
      if (!existingContract) {
        console.log('❌ STORAGE: Contract not found:', contractId);
        throw new Error('Contract not found');
      }
      
      console.log('🔍 STORAGE: Current contract status:', existingContract.status);
      
      // CRITICAL: Check if already signed (prevent double signing)
      if (existingContract.status === 'signed') {
        console.log('❌ STORAGE: Contract already signed, preventing duplicate');
        throw new Error('Contract has already been signed');
      }
      
      if (existingContract.status !== 'sent') {
        console.log('❌ STORAGE: Contract not available for signing, status:', existingContract.status);
        throw new Error('Contract is not available for signing');
      }
      
      // Prepare update data with comprehensive field mapping
      const updateData = {
        status: 'signed' as const,
        signedAt: signatureData.signedAt || new Date(),
        clientSignature: signatureData.signatureName,
        clientPhone: signatureData.clientPhone || existingContract.clientPhone,
        clientAddress: signatureData.clientAddress || existingContract.clientAddress,
        venueAddress: signatureData.venueAddress || existingContract.venueAddress,
        updatedAt: new Date()
      };
      
      console.log('📝 STORAGE: Updating contract with data:', updateData);
      
      // FIXED: Use the flexible updateContract method without userId for public signing
      const result = await this.updateContract(contractId, updateData);
      
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

  // Email Template functions
  async getEmailTemplates(userId: string) {
    // First check if user has any templates
    const userTemplates = await db.select().from(emailTemplates)
      .where(eq(emailTemplates.userId, userId))
      .orderBy(desc(emailTemplates.createdAt));
    
    // If no user templates, create default stock templates
    if (userTemplates.length === 0) {
      console.log('🔧 Creating default templates for user:', userId);
      await this.createDefaultTemplates(userId);
      
      // Fetch templates again after creating defaults
      return await db.select().from(emailTemplates)
        .where(eq(emailTemplates.userId, userId))
        .orderBy(desc(emailTemplates.createdAt));
    }
    
    return userTemplates;
  }

  async createDefaultTemplates(userId: string) {
    const defaultTemplates = [
      {
        userId,
        name: "Enquiry Response - Available",
        subject: "Re: Your Music Enquiry",
        emailBody: `Dear [Client Name],

Thank you for your enquiry about live music for your event.

I'm delighted to confirm that I'm available on [Event Date] and would love to perform at [Venue]. 

Event Details:
• Date: [Event Date]
• Time: [Event Time]
• Venue: [Venue]
• Performance Fee: £[Fee]

I'll send over a contract shortly for your review and signature. If you have any questions or need to discuss any details, please don't hesitate to get in touch.

Looking forward to performing for you!

Best regards,
Tim Fulker
MusoBuddy Professional`,
        smsBody: "Hi [Client Name], thanks for your enquiry. I'm available on [Event Date] and would love to perform. Fee: £[Fee]. Contract to follow. Tim",
        isDefault: true,
        isAutoRespond: false
      },
      {
        userId,
        name: "Enquiry Response - Not Available", 
        subject: "Re: Your Music Enquiry",
        emailBody: `Dear [Client Name],

Thank you for thinking of me for your event on [Event Date].

Unfortunately, I'm not available on that date as I already have a booking. 

However, I'd be happy to recommend some excellent musicians who might be able to help, or if you have any flexibility with dates, please let me know and I'll check my availability.

Thank you again for considering me.

Best regards,
Tim Fulker
MusoBuddy Professional`,
        smsBody: "Hi [Client Name], thanks for your enquiry. Unfortunately I'm not available on [Event Date]. Happy to recommend others or check alternative dates. Tim",
        isDefault: false,
        isAutoRespond: false
      },
      {
        userId,
        name: "Quote Follow-up",
        subject: "Following up on your music enquiry", 
        emailBody: `Dear [Client Name],

I hope this email finds you well. I wanted to follow up on the music enquiry for your event on [Event Date] at [Venue].

I'm still very interested in performing for you and wanted to confirm if you're still looking for live music. The quoted fee remains £[Fee] for the performance.

If you need any additional information or would like to discuss the booking further, please don't hesitate to reach out.

I look forward to hearing from you.

Best regards,
Tim Fulker
MusoBuddy Professional`,
        smsBody: "Hi [Client Name], following up on your music enquiry for [Event Date]. Still interested in performing - fee £[Fee]. Let me know if you'd like to proceed. Tim",
        isDefault: false,
        isAutoRespond: false
      },
      {
        userId,
        name: "Contract Reminder",
        subject: "Contract awaiting signature",
        emailBody: `Dear [Client Name],

I hope you're well. I wanted to follow up on the performance contract I sent for your event on [Event Date] at [Venue].

The contract is still awaiting your signature, and I'd like to get this confirmed so I can reserve the date in my diary.

If you have any questions about the contract terms or need any clarification, please don't hesitate to get in touch.

Looking forward to hearing from you soon.

Best regards,
Tim Fulker
MusoBuddy Professional`,
        smsBody: "Hi [Client Name], just a reminder that your contract for [Event Date] is awaiting signature. Any questions just ask! Tim",
        isDefault: false,
        isAutoRespond: false
      },
      {
        userId,
        name: "Thank You After Event",
        subject: "Thank you for a wonderful event!",
        emailBody: `Dear [Client Name],

Thank you so much for having me perform at your event on [Event Date] at [Venue]. I thoroughly enjoyed playing for you and your guests, and I hope the music added to making your occasion truly special.

It was a pleasure working with you, and I would be delighted to perform for any future events you may have. Please keep me in mind for anniversaries, celebrations, or any other occasions where live music would enhance the atmosphere.

If you were happy with my performance, I would be incredibly grateful if you could leave a review or recommendation, as word-of-mouth referrals are invaluable to musicians like myself.

Thank you once again for choosing me to be part of your special day.

Warm regards and best wishes,

[Business Signature]`,
        smsBody: "Hi [Client Name], thank you for having me perform at your event on [Event Date]. It was wonderful and I'd love to play for any future occasions you have! Best regards, Tim",
        isDefault: false,
        isAutoRespond: false
      }
    ];

    for (const template of defaultTemplates) {
      await db.insert(emailTemplates).values(template);
    }
    
    console.log(`✅ Created ${defaultTemplates.length} default templates for user`);
  }

  async createEmailTemplate(templateData: any) {
    const [template] = await db.insert(emailTemplates)
      .values(templateData)
      .returning();
    return template;
  }

  async updateEmailTemplate(id: number, updates: any, userId: string) {
    const [template] = await db.update(emailTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(emailTemplates.id, id), eq(emailTemplates.userId, userId)))
      .returning();
    return template;
  }

  async deleteEmailTemplate(id: number, userId: string) {
    await db.delete(emailTemplates)
      .where(and(eq(emailTemplates.id, id), eq(emailTemplates.userId, userId)));
    return true;
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