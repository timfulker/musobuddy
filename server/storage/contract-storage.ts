import { db } from "../core/database";
import { contracts } from "../../shared/schema";
import { eq, and, desc, sql, or } from "drizzle-orm";

// Type definitions
interface ContractData {
  userId: string;
  enquiryId?: number | null;
  contractNumber: string;
  clientName: string;
  clientAddress?: string | null;
  clientPhone?: string | null;
  clientEmail?: string | null;
  venue?: string | null;
  venueAddress?: string | null;
  eventDate?: Date | string;
  eventTime?: string | null;
  eventEndTime?: string | null;
  fee?: string;
  deposit?: string;
  paymentInstructions?: string | null;
  equipmentRequirements?: string | null;
  specialRequirements?: string | null;
  clientFillableFields?: string | null;
  status?: string;
  template?: string;
  signedAt?: Date | string | null;
  cloudStorageUrl?: string | null;
  cloudStorageKey?: string | null;
  signingPageUrl?: string | null;
  signingPageKey?: string | null;
  signingUrlCreatedAt?: Date | string | null;
  clientSignature?: string | null;
  clientIpAddress?: string | null;
}

interface ContractUpdate extends Partial<ContractData> {}

interface Contract extends ContractData {
  id: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ContractSignatureData {
  contractId: number;
  signerName: string;
  signerRole: string;
  signatureData: string;
  ipAddress?: string;
  userAgent?: string;
}

interface ContractSignature {
  contractId: number;
  signatureData: string;
  signedAt: Date | null;
  ipAddress: string | null;
  signerRole?: string;
}

interface ContractStats {
  total: number;
  signed: number;
  pending: number;
  draft: number;
}

interface DatabaseError extends Error {
  code?: string;
  constraint?: string;
}

export class ContractStorage {
  private db = db;

  // ===== CONTRACT METHODS =====
  
  async getContract(id: number): Promise<Contract | null> {
    const result = await db.select().from(contracts).where(eq(contracts.id, id));
    return (result[0] as Contract) || null;
  }

  async getContractByIdAndUser(id: number, userId: string): Promise<Contract | null> {
    const result = await db.select().from(contracts)
      .where(and(eq(contracts.id, id), eq(contracts.userId, userId)));
    return (result[0] as Contract) || null;
  }

  async getContractBySigningPageUrl(signingPageUrl: string): Promise<Contract | null> {
    const result = await db.select().from(contracts)
      .where(eq(contracts.signingPageUrl, signingPageUrl));
    return (result[0] as Contract) || null;
  }

  async getContractsByUser(userId: string): Promise<Contract[]> {
    const result = await db.select().from(contracts)
      .where(eq(contracts.userId, userId))
      .orderBy(desc(contracts.createdAt));
    return result as Contract[];
  }

  async createContract(contractData: ContractData): Promise<Contract> {
    try {
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
        fee: contractData.fee || "0.00",
        deposit: contractData.deposit || "0.00",
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
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      return result[0] as Contract;
    } catch (error) {
      const dbError = error as DatabaseError;
      // Handle potential duplicate contract numbers by adding suffix
      if (dbError.code === '23505' && dbError.constraint === 'contracts_contract_number_unique') {
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
    updates: ContractUpdate,
    userId?: string
  ): Promise<Contract | undefined> {
    const setData: Record<string, any> = {
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
    if (updates.fee !== undefined) setData.fee = updates.fee;
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

    // Build query conditions based on whether userId is provided
    const conditions = userId
      ? and(eq(contracts.id, id), eq(contracts.userId, userId))
      : eq(contracts.id, id);

    const result = await db.update(contracts)
      .set(setData)
      .where(conditions!)
      .returning();
    
    return result[0] as Contract | undefined;
  }

  async deleteContract(id: number, userId: string): Promise<Contract | undefined> {
    const result = await db.delete(contracts)
      .where(and(eq(contracts.id, id), eq(contracts.userId, userId)))
      .returning();
    return result[0] as Contract | undefined;
  }

  // ===== CONTRACT SIGNATURE METHODS =====
  
  async createContractSignature(data: ContractSignatureData): Promise<Contract> {
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
    return result[0] as Contract;
  }

  async getContractSignatures(contractId: number): Promise<ContractSignature[]> {
    // Return contract with signature data if it exists
    const contract = await this.getContract(contractId);
    if (!contract || !contract.clientSignature) return [];
    
    return [{
      contractId,
      signatureData: contract.clientSignature,
      signedAt: contract.signedAt as Date | null,
      ipAddress: contract.clientIpAddress || null,
    }];
  }

  async getContractSignature(contractId: number, signerRole: string): Promise<ContractSignature | null> {
    // For now, we only support client signatures
    if (signerRole !== 'client') return null;
    
    const contract = await this.getContract(contractId);
    if (!contract || !contract.clientSignature) return null;
    
    return {
      contractId,
      signerRole,
      signatureData: contract.clientSignature,
      signedAt: contract.signedAt as Date | null,
      ipAddress: contract.clientIpAddress || null,
    };
  }

  // ===== CONTRACT STATISTICS =====
  
  async getContractStats(userId: string): Promise<ContractStats> {
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

  async getRecentContracts(userId: string, limit: number = 5): Promise<Contract[]> {
    const result = await db.select().from(contracts)
      .where(eq(contracts.userId, userId))
      .orderBy(desc(contracts.createdAt))
      .limit(limit);
    return result as Contract[];
  }

  async getContractsByStatus(userId: string, status: string): Promise<Contract[]> {
    const result = await db.select().from(contracts)
      .where(and(
        eq(contracts.userId, userId),
        eq(contracts.status, status)
      ))
      .orderBy(desc(contracts.createdAt));
    return result as Contract[];
  }

  // ===== ALIAS METHODS FOR COMPATIBILITY =====
  
  // Alias for getContractsByUser to match route expectations
  async getContracts(userId: string): Promise<Contract[]> {
    return this.getContractsByUser(userId);
  }

  // ===== ADMIN METHODS =====
  
  async getAllContractsCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(contracts);
    return result[0]?.count || 0;
  }

  async getAllContractsForAdmin(): Promise<Contract[]> {
    // Admin method: Get all contracts across all users
    const result = await db.select().from(contracts)
      .orderBy(desc(contracts.createdAt));
    return result as Contract[];
  }
}

export const contractStorage = new ContractStorage();