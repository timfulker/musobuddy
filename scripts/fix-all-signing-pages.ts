#!/usr/bin/env tsx

import { neon } from '@neondatabase/serverless';
import { uploadContractSigningPage } from '../server/core/cloud-storage';

// Environment variables are already loaded
const sql = neon(process.env.DATABASE_URL!);

async function fixAllSigningPages() {
    console.log('🔧 Starting to fix all contract signing pages...\n');
    
    try {
        // Get all contracts with signing pages
        const contracts = await sql`
            SELECT * FROM contracts 
            WHERE status IN ('sent', 'draft') 
            AND signing_page_url IS NOT NULL
            ORDER BY created_at DESC
        `;
        console.log(`📋 Found ${contracts.length} contracts to fix\n`);
        
        let fixed = 0;
        let errors = 0;
        
        for (const contract of contracts) {
            try {
                console.log(`Processing contract #${contract.id}: ${contract.contract_number}...`);
                
                // Get user settings
                const settingsResult = await sql`
                    SELECT * FROM user_settings 
                    WHERE user_id = ${contract.user_id} 
                    LIMIT 1
                `;
                const userSettings = settingsResult[0] || {};
                
                // Regenerate the signing page with fixed JavaScript
                const uploadResult = await uploadContractSigningPage(contract, userSettings);
                
                if (uploadResult.success && uploadResult.url) {
                    // Update the contract with new signing page URL
                    await sql`
                        UPDATE contracts 
                        SET signing_page_url = ${uploadResult.url} 
                        WHERE id = ${contract.id}
                    `;
                    
                    console.log(`✅ Fixed contract #${contract.id}: ${contract.contract_number}`);
                    console.log(`   New URL: ${uploadResult.url}\n`);
                    fixed++;
                } else {
                    console.error(`❌ Failed to upload new signing page for contract #${contract.id}\n`);
                    errors++;
                }
            } catch (error) {
                console.error(`❌ Error fixing contract #${contract.id}:`, error, '\n');
                errors++;
            }
        }
        
        console.log('\n' + '='.repeat(60));
        console.log(`✅ COMPLETED: Fixed ${fixed} signing pages`);
        if (errors > 0) {
            console.log(`⚠️  ${errors} contracts had errors`);
        }
        console.log('='.repeat(60));
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    }
}

// Run the fix
fixAllSigningPages();