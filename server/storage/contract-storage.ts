import { db } from "../core/database";
import { contracts } from "../../shared/schema";
import { eq, and, desc, sql, or } from "drizzle-orm";

export class ContractStorage {
  private db = db;

  // ===== CONTRACT METHODS =====
  
  async getContract(id: number) {
    const result = await db.select().from(contracts).where(eq(contracts.id, id));
    const contract = result[0] || null;

    // Fetch payment terms from linked booking if enquiryId exists
    if (contract?.enquiryId) {
      try {
        const { storage } = await import("../core/storage");
        const booking = await storage.getBooking(contract.enquiryId);
        if (booking) {
          console.log(`💰 [CONTRACT-STORAGE] Attaching payment terms from booking ${contract.enquiryId} to contract ${contract.id}:`, {
            bookingPaymentTerms: booking.paymentTerms,
            bookingDueDate: booking.dueDate,
            bookingPaymentTermsCustomized: booking.paymentTermsCustomized
          });
          // Attach payment terms from booking to contract
          (contract as any).paymentTerms = booking.paymentTerms;
          (contract as any).dueDate = booking.dueDate;
          (contract as any).paymentTermsCustomized = booking.paymentTermsCustomized;
        } else {
          console.warn(`⚠️ [CONTRACT-STORAGE] No booking found for enquiryId ${contract.enquiryId}`);
        }
      } catch (err) {
        console.warn(`⚠️ Failed to fetch payment terms from booking ${contract.enquiryId}:`, err);
      }
    } else {
      console.log(`⚠️ [CONTRACT-STORAGE] Contract ${contract.id} has no enquiryId, cannot fetch payment terms from booking`);
    }

    return contract;
  }

  async getContractByIdAndUser(id: number, userId: string) {
    const result = await db.select().from(contracts)
      .where(and(eq(contracts.id, id), eq(contracts.userId, userId)));
    const contract = result[0] || null;

    // Fetch payment terms from linked booking if enquiryId exists
    if (contract?.enquiryId) {
      try {
        const { storage } = await import("../core/storage");
        const booking = await storage.getBooking(contract.enquiryId);
        if (booking) {
          // Attach payment terms from booking to contract
          (contract as any).paymentTerms = booking.paymentTerms;
          (contract as any).dueDate = booking.dueDate;
          (contract as any).paymentTermsCustomized = booking.paymentTermsCustomized;
        }
      } catch (err) {
        console.warn(`⚠️ Failed to fetch payment terms from booking ${contract.enquiryId}:`, err);
      }
    }

    return contract;
  }

  // FIXED: Remove reference to non-existent signingUrl column
  async getContractBySigningPageUrl(signingPageUrl: string) {
    const result = await db.select().from(contracts)
      .where(eq(contracts.signingPageUrl, signingPageUrl));
    const contract = result[0] || null;

    // Fetch payment terms from linked booking if enquiryId exists
    if (contract?.enquiryId) {
      try {
        const { storage } = await import("../core/storage");
        const booking = await storage.getBooking(contract.enquiryId);
        if (booking) {
          // Attach payment terms from booking to contract
          (contract as any).paymentTerms = booking.paymentTerms;
          (contract as any).dueDate = booking.dueDate;
          (contract as any).paymentTermsCustomized = booking.paymentTermsCustomized;
        }
      } catch (err) {
        console.warn(`⚠️ Failed to fetch payment terms from booking ${contract.enquiryId}:`, err);
      }
    }

    return contract;
  }

  async getContractsByUser(userId: string) {
    return await db.select().from(contracts)
      .where(eq(contracts.userId, userId))
      .orderBy(desc(contracts.createdAt));
  }

  async getContractsByEnquiryId(enquiryId: number) {
    return await db.select().from(contracts)
      .where(eq(contracts.enquiryId, enquiryId))
      .orderBy(desc(contracts.createdAt));
  }

  async getAllContracts() {
    return await db.select().from(contracts).orderBy(desc(contracts.createdAt));
  }

  async createContract(contractData: any) {
    console.log(`📥 [CONTRACT-STORAGE] Incoming contract data:`, {
      enquiryId: contractData.enquiryId,
      eventTime: contractData.eventTime,
      eventEndTime: contractData.eventEndTime,
      hasEventTime: !!contractData.eventTime,
      hasEventEndTime: !!contractData.eventEndTime
    });

    try {
      // FIXED: Align with actual schema fields
      const result = await db.insert(contracts).values({
        userId: contractData.userId,
        enquiryId: contractData.enquiryId || null,
        contractNumber: contractData.contractNumber,
        clientName: contractData.clientName,
        clientAddress: contractData.clientAddress || null,
        clientPhone: contractData.clientPhone || null,
        clientEmail: contractData.clientEmail || null,
        venue: contractData.venue || null,
        venueAddress: contractData.venueAddress || null,
        eventDate: contractData.eventDate ? new Date(contractData.eventDate) : new Date(),
        eventTime: contractData.eventTime || null,
        eventEndTime: contractData.eventEndTime || null,
        performanceDuration: contractData.performanceDuration || null,
        fee: contractData.fee || "0.00", // Required by database until schema migration
        deposit: contractData.deposit || "0.00",
        depositDays: contractData.depositDays || 7,
        travelExpenses: contractData.travelExpenses || "0.00",
        paymentInstructions: contractData.paymentInstructions || null,
        equipmentRequirements: contractData.equipmentRequirements || null,
        specialRequirements: contractData.specialRequirements || null,
        clientFillableFields: contractData.clientFillableFields || null,
        status: contractData.status || "draft",
        template: contractData.template || "professional",
        signedAt: contractData.signedAt ? new Date(contractData.signedAt) : null,
        cloudStorageUrl: contractData.cloudStorageUrl || null,
        cloudStorageKey: contractData.cloudStorageKey || null,
        signingPageUrl: contractData.signingPageUrl || null,
        signingPageKey: contractData.signingPageKey || null,
        signingUrlCreatedAt: contractData.signingUrlCreatedAt ? new Date(contractData.signingUrlCreatedAt) : null,
        clientSignature: contractData.clientSignature || null,
        clientIpAddress: contractData.clientIpAddress || null,
        clientPortalUrl: contractData.clientPortalUrl || null,
        clientPortalToken: contractData.clientPortalToken || null,
        clientPortalQrCode: contractData.clientPortalQrCode || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      console.log(`📊 [CONTRACT-STORAGE] Created contract with:`, {
        id: result[0]?.id,
        enquiryId: result[0]?.enquiryId,
        eventTime: result[0]?.eventTime,
        eventEndTime: result[0]?.eventEndTime,
        hasEventTime: !!result[0]?.eventTime,
        hasEventEndTime: !!result[0]?.eventEndTime
      });

      return result[0];
    } catch (error: any) {
      // Handle potential duplicate contract numbers by adding suffix
      if (error.code === '23505' && error.constraint === 'contracts_contract_number_unique') {
        const newContractNumber = `${contractData.contractNumber}-${Date.now()}`;
        return await this.createContract({
          ...contractData,
          contractNumber: newContractNumber
        });
      }
      throw error;
    }
  }

  async updateContract(
    id: number,
    updates: any,
    userId?: string
  ) {
    // FIXED: Only include fields that exist in schema
    const setData: any = {
      updatedAt: new Date(),
    };

    // Only set fields that are provided and exist in schema
    if (updates.enquiryId !== undefined) setData.enquiryId = updates.enquiryId;
    if (updates.contractNumber !== undefined) setData.contractNumber = updates.contractNumber;
    if (updates.clientName !== undefined) setData.clientName = updates.clientName;
    if (updates.clientAddress !== undefined) setData.clientAddress = updates.clientAddress;
    if (updates.clientPhone !== undefined) setData.clientPhone = updates.clientPhone;
    if (updates.clientEmail !== undefined) setData.clientEmail = updates.clientEmail;
    if (updates.venue !== undefined) setData.venue = updates.venue;
    if (updates.venueAddress !== undefined) setData.venueAddress = updates.venueAddress;
    if (updates.eventDate !== undefined) setData.eventDate = updates.eventDate ? new Date(updates.eventDate) : null;
    if (updates.eventTime !== undefined) setData.eventTime = updates.eventTime;
    if (updates.eventEndTime !== undefined) setData.eventEndTime = updates.eventEndTime;
    if (updates.performanceDuration !== undefined) setData.performanceDuration = updates.performanceDuration;
    // fee: removed - use bookings.fee as single source of truth
    if (updates.deposit !== undefined) setData.deposit = updates.deposit;
    if (updates.paymentInstructions !== undefined) setData.paymentInstructions = updates.paymentInstructions;
    if (updates.equipmentRequirements !== undefined) setData.equipmentRequirements = updates.equipmentRequirements;
    if (updates.specialRequirements !== undefined) setData.specialRequirements = updates.specialRequirements;
    if (updates.clientFillableFields !== undefined) setData.clientFillableFields = updates.clientFillableFields;
    if (updates.status !== undefined) setData.status = updates.status;
    if (updates.template !== undefined) setData.template = updates.template;
    if (updates.signedAt !== undefined) setData.signedAt = updates.signedAt ? new Date(updates.signedAt) : null;
    if (updates.cloudStorageUrl !== undefined) setData.cloudStorageUrl = updates.cloudStorageUrl;
    if (updates.cloudStorageKey !== undefined) setData.cloudStorageKey = updates.cloudStorageKey;
    if (updates.signingPageUrl !== undefined) setData.signingPageUrl = updates.signingPageUrl;
    if (updates.signingPageKey !== undefined) setData.signingPageKey = updates.signingPageKey;
    if (updates.signingUrlCreatedAt !== undefined) setData.signingUrlCreatedAt = updates.signingUrlCreatedAt ? new Date(updates.signingUrlCreatedAt) : null;
    if (updates.clientSignature !== undefined) setData.clientSignature = updates.clientSignature;
    if (updates.clientIpAddress !== undefined) setData.clientIpAddress = updates.clientIpAddress;
    if (updates.clientPortalUrl !== undefined) setData.clientPortalUrl = updates.clientPortalUrl;
    if (updates.clientPortalToken !== undefined) setData.clientPortalToken = updates.clientPortalToken;
    if (updates.clientPortalQrCode !== undefined) setData.clientPortalQrCode = updates.clientPortalQrCode;
    if (updates.supersededBy !== undefined) setData.supersededBy = updates.supersededBy;
    if (updates.originalContractId !== undefined) setData.originalContractId = updates.originalContractId;

    // Build query conditions based on whether userId is provided
    const conditions = userId
      ? and(eq(contracts.id, id), eq(contracts.userId, userId))
      : eq(contracts.id, id);

    const result = await db.update(contracts)
      .set(setData)
      .where(conditions)
      .returning();
    
    return result[0];
  }

  async deleteContract(id: number, userId: string) {
    const result = await db.delete(contracts)
      .where(and(eq(contracts.id, id), eq(contracts.userId, userId)))
      .returning();
    return result[0];
  }

  // ===== CONTRACT SIGNATURE METHODS =====
  
  async createContractSignature(data: {
    contractId: number;
    signerName: string;
    signerRole: string;
    signatureData: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    // Update contract with signature data
    const result = await db.update(contracts)
      .set({
        clientSignature: data.signatureData,
        clientIpAddress: data.ipAddress,
        signedAt: new Date(),
        status: 'signed',
        updatedAt: new Date(),
      })
      .where(eq(contracts.id, data.contractId))
      .returning();
    return result[0];
  }

  async getContractSignatures(contractId: number) {
    // Return contract with signature data if it exists
    const contract = await this.getContract(contractId);
    if (!contract || !contract.clientSignature) return [];
    
    return [{
      contractId,
      signatureData: contract.clientSignature,
      signedAt: contract.signedAt,
      ipAddress: contract.clientIpAddress,
    }];
  }

  async getContractSignature(contractId: number, signerRole: string) {
    // For now, we only support client signatures
    if (signerRole !== 'client') return null;
    
    const contract = await this.getContract(contractId);
    if (!contract || !contract.clientSignature) return null;
    
    return {
      contractId,
      signerRole,
      signatureData: contract.clientSignature,
      signedAt: contract.signedAt,
      ipAddress: contract.clientIpAddress,
    };
  }

  // ===== CONTRACT STATISTICS =====
  
  async getContractStats(userId: string) {
    const result = await db.select({
      total: sql<number>`count(*)`,
      signed: sql<number>`count(case when status = 'signed' then 1 end)`,
      pending: sql<number>`count(case when status = 'sent' then 1 end)`,
      draft: sql<number>`count(case when status = 'draft' then 1 end)`,
    })
    .from(contracts)
    .where(eq(contracts.userId, userId));
    
    return result[0] || { total: 0, signed: 0, pending: 0, draft: 0 };
  }

  async getRecentContracts(userId: string, limit: number = 5) {
    return await db.select().from(contracts)
      .where(eq(contracts.userId, userId))
      .orderBy(desc(contracts.createdAt))
      .limit(limit);
  }

  async getContractsByStatus(userId: string, status: string) {
    return await db.select().from(contracts)
      .where(and(
        eq(contracts.userId, userId),
        eq(contracts.status, status)
      ))
      .orderBy(desc(contracts.createdAt));
  }

  // ===== ALIAS METHODS FOR COMPATIBILITY =====
  
  // Alias for getContractsByUser to match route expectations
  async getContracts(userId: string) {
    return this.getContractsByUser(userId);
  }

  // ===== ADMIN METHODS =====
  
  async getAllContractsCount() {
    const result = await db.select({ count: sql<number>`count(*)` }).from(contracts);
    return result[0]?.count || 0;
  }

  async getTotalContractCount() {
    return this.getAllContractsCount();
  }
}

export const contractStorage = new ContractStorage();