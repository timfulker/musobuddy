import { db } from "../core/database";
import { contracts } from "../../shared/schema";
import { eq, and, desc, sql, or } from "drizzle-orm";

export class ContractStorage {
  private db = db;

  // ===== CONTRACT METHODS =====
  
  async getContract(id: number) {
    const result = await db.select().from(contracts).where(eq(contracts.id, id));
    return result[0] || null;
  }

  async getContractByIdAndUser(id: number, userId: string) {
    const result = await db.select().from(contracts)
      .where(and(eq(contracts.id, id), eq(contracts.userId, userId)));
    return result[0] || null;
  }

  async getContractBySigningUrl(signingUrl: string) {
    const result = await db.select().from(contracts)
      .where(eq(contracts.signingUrl, signingUrl));
    return result[0] || null;
  }

  async getContractsByUser(userId: string) {
    return await db.select().from(contracts)
      .where(eq(contracts.userId, userId))
      .orderBy(desc(contracts.createdAt));
  }

  async createContract(contractData: any) {
    try {
      const result = await db.insert(contracts).values({
        ...contractData,
        eventDate: contractData.eventDate ? new Date(contractData.eventDate) : new Date(),
        signedAt: contractData.signedAt ? new Date(contractData.signedAt) : null,
        lastReminderSent: contractData.lastReminderSent ? new Date(contractData.lastReminderSent) : null,
        signingUrlCreatedAt: contractData.signingUrlCreatedAt ? new Date(contractData.signingUrlCreatedAt) : null,
        createdAt: new Date(),
        updatedAt: new Date(),
        eventTime: contractData.eventTime || "",
        eventEndTime: contractData.eventEndTime || "",
      }).returning();
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
    const setData = {
      ...updates,
      eventDate: updates.eventDate ? new Date(updates.eventDate) : undefined,
      signedAt: updates.signedAt ? new Date(updates.signedAt) : undefined,
      lastReminderSent: updates.lastReminderSent ? new Date(updates.lastReminderSent) : undefined,
      signingUrlCreatedAt: updates.signingUrlCreatedAt ? new Date(updates.signingUrlCreatedAt) : undefined,
      updatedAt: new Date(),
    };

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
  // Signature data is stored directly in the contracts table
  
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

  // ===== ADMIN METHODS =====
  
  async getAllContractsCount() {
    const result = await db.select({ count: sql<number>`count(*)` }).from(contracts);
    return result[0]?.count || 0;
  }
}

export const contractStorage = new ContractStorage();