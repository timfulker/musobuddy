import { storage } from '../server/core/storage';
import { uploadContractSigningPage } from '../server/core/cloud-storage';
import { db } from '../server/core/database';

async function regenerateAllSigningPages() {
  console.log('🔄 Starting regeneration of all contract signing pages...');
  
  try {
    // Get all contracts that need signing pages (sent or draft status)
    const contracts = await db.query(`
      SELECT id, contract_number, status, user_id 
      FROM contracts 
      WHERE status IN ('sent', 'draft')
      ORDER BY created_at DESC
    `);
    
    console.log(`📋 Found ${contracts.rows.length} contracts to regenerate`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const contractRow of contracts.rows) {
      try {
        console.log(`\n🔧 Processing contract #${contractRow.id} (${contractRow.contract_number})`);
        
        // Get full contract details
        const contract = await storage.getContract(contractRow.id);
        if (!contract) {
          console.log(`⚠️ Contract #${contractRow.id} not found in storage`);
          errorCount++;
          continue;
        }
        
        // Get user settings
        const userSettings = await storage.getSettings(contract.userId);
        
        // Generate and upload new signing page
        const result = await uploadContractSigningPage(contract, userSettings);
        
        if (result.success) {
          // Update the contract with new signing page URL
          await db.query(
            `UPDATE contracts SET signing_page_url = $1 WHERE id = $2`,
            [result.url, contract.id]
          );
          
          console.log(`✅ Regenerated signing page: ${result.url}`);
          successCount++;
        } else {
          console.log(`❌ Failed to regenerate: ${result.error}`);
          errorCount++;
        }
        
      } catch (error) {
        console.error(`❌ Error processing contract #${contractRow.id}:`, error);
        errorCount++;
      }
    }
    
    console.log('\n📊 Regeneration Complete:');
    console.log(`✅ Success: ${successCount} contracts`);
    console.log(`❌ Errors: ${errorCount} contracts`);
    
  } catch (error) {
    console.error('❌ Fatal error during regeneration:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the regeneration
regenerateAllSigningPages();