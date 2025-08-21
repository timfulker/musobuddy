// Script to regenerate signing page for existing contracts
import { db } from './server/core/database';
import { contracts, userSettings } from './shared/schema';
import { eq } from 'drizzle-orm';
import { uploadContractSigningPage } from './server/core/cloud-storage';

async function regenerateSigningPage(contractId: number) {
  try {
    console.log(`🔄 Regenerating signing page for contract #${contractId}...`);
    
    // Fetch the contract
    const [contract] = await db.select().from(contracts).where(eq(contracts.id, contractId));
    
    if (!contract) {
      console.error(`❌ Contract #${contractId} not found`);
      return;
    }
    
    console.log(`✅ Found contract #${contractId}: ${contract.contractNumber}`);
    console.log(`📋 Client details:`, {
      name: contract.clientName,
      phone: contract.clientPhone,
      address: contract.clientAddress
    });
    
    // Fetch user settings
    const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, contract.userId));
    
    console.log(`🎨 User settings theme color: ${settings?.themeAccentColor || 'default'}`);
    
    // Regenerate the signing page with the updated generator
    const result = await uploadContractSigningPage(contract, settings);
    
    if (result.success) {
      console.log(`✅ Successfully regenerated signing page for contract #${contractId}`);
      console.log(`🔗 New signing URL: ${result.url}`);
      
      // Update the contract with new signing URL
      await db.update(contracts)
        .set({ 
          signingPageUrl: result.url,
          updatedAt: new Date()
        })
        .where(eq(contracts.id, contractId));
        
      console.log(`✅ Contract updated with new signing page URL`);
    } else {
      console.error(`❌ Failed to regenerate signing page:`, result.error);
    }
    
  } catch (error) {
    console.error(`❌ Error regenerating signing page:`, error);
  }
}

// Regenerate for contract 841
regenerateSigningPage(841).then(() => {
  console.log('✅ Regeneration complete');
  process.exit(0);
}).catch(err => {
  console.error('❌ Failed:', err);
  process.exit(1);
});