import { storage } from './storage';

/**
 * Silent URL Maintenance Service
 * 
 * This service handles URL regeneration without sending emails.
 * It runs separately from the user's reminder system to ensure
 * contract signing URLs never expire while allowing users to
 * control their own reminder schedules.
 */
export class URLMaintenanceService {
  /**
   * Silently regenerate URLs that are approaching expiration
   * This runs without sending emails - just keeps URLs fresh
   */
  async maintainContractSigningUrls() {
    try {
      console.log('🔧 Starting silent URL maintenance...');
      
      // Get contracts with URLs that need regeneration
      const contractsNeedingUrlMaintenance = await this.getContractsNeedingUrlMaintenance();
      
      if (contractsNeedingUrlMaintenance.length === 0) {
        console.log('🔧 No URLs need maintenance at this time');
        return { processed: 0, regenerated: 0, failed: 0 };
      }

      console.log(`🔧 Found ${contractsNeedingUrlMaintenance.length} contracts needing URL maintenance`);

      let regenerated = 0;
      let failed = 0;

      for (const contract of contractsNeedingUrlMaintenance) {
        try {
          await this.silentlyRegenerateUrl(contract);
          regenerated++;
          console.log(`🔧 Silently regenerated URL for contract #${contract.contractNumber}`);
        } catch (error) {
          failed++;
          console.error(`🔧 Failed to regenerate URL for contract #${contract.contractNumber}:`, error);
        }
      }

      console.log(`🔧 URL maintenance complete: ${regenerated} regenerated, ${failed} failed`);
      return { processed: contractsNeedingUrlMaintenance.length, regenerated, failed };
    } catch (error) {
      console.error('🔧 Error in URL maintenance:', error);
      throw error;
    }
  }

  /**
   * Get contracts that need URL maintenance (6+ days old)
   */
  private async getContractsNeedingUrlMaintenance() {
    try {
      const allContracts = await storage.getAllContracts();
      const now = new Date();
      
      return allContracts.filter(contract => {
        // Only maintain URLs for contracts that are sent but not signed
        if (contract.status !== 'sent' || contract.signedAt) {
          return false;
        }

        // Only contracts with cloud storage URLs
        if (!contract.cloudStorageKey || !contract.signingUrlCreatedAt) {
          return false;
        }

        // Check if URL is 6+ days old and needs regeneration
        const urlAge = now.getTime() - contract.signingUrlCreatedAt.getTime();
        const sixDaysInMs = 6 * 24 * 60 * 60 * 1000;
        
        return urlAge >= sixDaysInMs;
      });
    } catch (error) {
      console.error('🔧 Error getting contracts needing URL maintenance:', error);
      throw error;
    }
  }

  /**
   * Silently regenerate a contract's signing URL without sending email
   */
  private async silentlyRegenerateUrl(contract: any) {
    try {
      const { regenerateContractSigningUrl, isCloudStorageConfigured } = await import('./cloud-storage');
      
      if (!isCloudStorageConfigured()) {
        throw new Error('Cloud storage not configured');
      }

      // Regenerate the URL
      const newUrl = await regenerateContractSigningUrl(contract.cloudStorageKey);
      
      if (!newUrl) {
        throw new Error('Failed to regenerate signing URL');
      }

      // Update the contract with new URL timestamp
      await storage.updateContract(contract.id, {
        cloudStorageUrl: newUrl,
        signingUrlCreatedAt: new Date()
      }, contract.userId);

      console.log(`🔧 URL regenerated for contract #${contract.contractNumber}`);
    } catch (error) {
      console.error(`🔧 Error regenerating URL for contract #${contract.contractNumber}:`, error);
      throw error;
    }
  }
}

export const urlMaintenanceService = new URLMaintenanceService();