/**
 * Test the PDF fixes for contract generation
 * This will verify if the client address/phone fields are now included
 * and if the "undefined" terms issue is resolved
 */
import fs from 'fs';

async function testPDFGeneration() {
  console.log('🔍 Testing PDF generation fixes...');
  
  try {
    // First, get the list of contracts to find one to test with
    const response = await fetch('https://musobuddy.replit.app/api/contracts', {
      headers: {
        'Cookie': 'connect.sid=s%3AJJ4E6KJ_-hNKcbFdXSXsJZMFWCkzQrQW.rjBUNJbfRwfgaKGAhCfNnUdKgQXmRaIjDpQBJJlEGhk'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const contracts = await response.json();
    console.log(`📄 Found ${contracts.length} contracts`);
    
    if (contracts.length === 0) {
      console.log('❌ No contracts found to test with');
      return;
    }
    
    // Test with the first contract
    const contract = contracts[0];
    console.log('🎯 Testing with contract:', contract.contractNumber);
    console.log('📋 Client info:', {
      name: contract.clientName,
      email: contract.clientEmail,
      phone: contract.clientPhone || 'NOT SET',
      address: contract.clientAddress || 'NOT SET'
    });
    
    // Test PDF download
    console.log('📥 Downloading PDF...');
    const pdfResponse = await fetch(`https://musobuddy.replit.app/api/contracts/${contract.id}/download`, {
      headers: {
        'Cookie': 'connect.sid=s%3AJJ4E6KJ_-hNKcbFdXSXsJZMFWCkzQrQW.rjBUNJbfRwfgaKGAhCfNnUdKgQXmRaIjDpQBJJlEGhk'
      }
    });
    
    if (!pdfResponse.ok) {
      throw new Error(`PDF download failed! status: ${pdfResponse.status}`);
    }
    
    const pdfBuffer = await pdfResponse.arrayBuffer();
    const pdfData = Buffer.from(pdfBuffer);
    
    // Save PDF for inspection
    fs.writeFileSync('test-contract-fix.pdf', pdfData);
    console.log('✅ PDF saved as test-contract-fix.pdf');
    console.log('📏 PDF size:', pdfData.length, 'bytes');
    
    // Convert PDF to text for basic validation (simplified check)
    const pdfText = pdfData.toString('utf8');
    
    // Check if client address/phone are included
    const hasClientPhone = contract.clientPhone && pdfText.includes(contract.clientPhone);
    const hasClientAddress = contract.clientAddress && pdfText.includes(contract.clientAddress);
    
    console.log('🔍 Validation results:');
    console.log('  - Client phone in PDF:', hasClientPhone ? '✅ YES' : '❌ NO');
    console.log('  - Client address in PDF:', hasClientAddress ? '✅ YES' : '❌ NO');
    console.log('  - Contains "undefined":', pdfText.includes('undefined') ? '❌ YES (issue remains)' : '✅ NO (fixed)');
    
  } catch (error) {
    console.error('❌ Error testing PDF generation:', error.message);
  }
}

// Run the test
testPDFGeneration();