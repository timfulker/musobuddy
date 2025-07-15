/**
 * Test contract signing with client-fillable fields functionality
 */

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function testContractSigningWithFillableFields() {
  try {
    console.log('🔥 Testing contract signing with client-fillable fields...');
    
    // Create test contract with missing client fields
    const testContract = {
      contractNumber: 'TEST-2025-001',
      clientName: 'Test Client',
      clientEmail: 'test@example.com',
      clientPhone: null, // Missing - should be fillable
      clientAddress: null, // Missing - should be fillable  
      eventDate: '2025-08-15',
      eventTime: '18:00',
      eventEndTime: '22:00',
      venue: 'Test Venue',
      fee: '250.00',
      status: 'sent',
      userId: 'test-user-123',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Insert test contract
    const insertResult = await sql`
      INSERT INTO contracts (
        contract_number, client_name, client_email, client_phone, client_address,
        event_date, event_time, event_end_time, venue, fee, status, user_id, created_at, updated_at
      ) VALUES (
        ${testContract.contractNumber}, ${testContract.clientName}, ${testContract.clientEmail},
        ${testContract.clientPhone}, ${testContract.clientAddress}, ${testContract.eventDate},
        ${testContract.eventTime}, ${testContract.eventEndTime}, ${testContract.venue}, ${testContract.fee},
        ${testContract.status}, ${testContract.userId}, ${testContract.createdAt}, ${testContract.updatedAt}
      ) RETURNING *
    `;
    
    const contract = insertResult[0];
    console.log('✅ Test contract created:', contract.contract_number);
    
    // Test contract signing with filled client fields
    const signatureData = {
      signatureName: 'Test Client Signature',
      clientPhone: '07123 456789',
      clientAddress: '123 Test Street, London, SW1A 1AA'
    };
    
    console.log('📝 Simulating contract signing with client fields...');
    
    // Test the API endpoint
    const response = await fetch(`http://localhost:5000/api/contracts/sign/${contract.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(signatureData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Contract signing successful!');
      console.log('Response:', result);
      
      // Verify the contract was updated with client fields
      const updatedContract = await sql`
        SELECT * FROM contracts WHERE id = ${contract.id}
      `;
      
      const signed = updatedContract[0];
      console.log('📄 Updated contract details:');
      console.log('- Status:', signed.status);
      console.log('- Client Phone:', signed.client_phone);
      console.log('- Client Address:', signed.client_address);
      console.log('- Signed At:', signed.signed_at);
      
      if (signed.status === 'signed' && signed.client_phone && signed.client_address) {
        console.log('✅ Client-fillable fields successfully saved!');
      } else {
        console.log('❌ Client-fillable fields not saved properly');
      }
    } else {
      console.error('❌ Contract signing failed:', result);
    }
    
    // Clean up test data
    await sql`DELETE FROM contracts WHERE id = ${contract.id}`;
    console.log('🧹 Test data cleaned up');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testContractSigningWithFillableFields();