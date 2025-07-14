/**
 * Test enhanced contract system with new fields and cloud signing
 */

const REPLIT_URL = 'https://musobuddy.replit.app';

async function testEnhancedContractSystem() {
  console.log('🎯 Testing Enhanced Contract System...\n');

  try {
    // 1. Test contract creation with new fields
    console.log('📋 Testing contract creation with enhanced fields...');
    
    const contractData = {
      contractNumber: `TEST-${Date.now()}`,
      clientName: 'Sarah Johnson',
      clientEmail: 'sarah.johnson@example.com',
      clientPhone: '07123 456789',
      eventDate: '2025-08-15',
      eventTime: '7:00 PM',
      venue: 'The Grand Hotel',
      venueAddress: '123 Main Street, London, SW1A 1AA',
      eventType: 'wedding',
      gigType: 'saxophone',
      setupTime: '30 minutes before performance',
      soundCheckTime: '15 minutes before performance',
      equipmentProvided: 'Microphone, amplifier, music stands',
      clientRequirements: 'First dance: "At Last" by Etta James, cocktail jazz during reception',
      dressCode: 'Black tie formal',
      fee: '1200.00',
      deposit: '400.00',
      terms: 'Payment due on performance date. Cancellation policy applies.',
      reminderEnabled: true,
      reminderDays: 3
    };

    const response = await fetch(`${REPLIT_URL}/api/contracts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(contractData),
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`Contract creation failed: ${response.status} ${response.statusText}`);
    }

    const createdContract = await response.json();
    console.log('✅ Contract created successfully:', {
      id: createdContract.id,
      contractNumber: createdContract.contractNumber,
      eventType: createdContract.eventType,
      gigType: createdContract.gigType,
      setupTime: createdContract.setupTime,
      cloudStorageUrl: createdContract.cloudStorageUrl ? '✅ Cloud URL Generated' : '❌ No Cloud URL'
    });

    // 2. Test cloud signing URL generation
    console.log('\n🔗 Testing cloud signing URL generation...');
    
    const publicResponse = await fetch(`${REPLIT_URL}/api/contracts/public/${createdContract.id}`, {
      method: 'GET'
    });

    if (publicResponse.ok) {
      const publicContract = await publicResponse.json();
      console.log('✅ Cloud signing page accessible:', {
        status: publicContract.status,
        hasCloudUrl: !!publicContract.cloudStorageUrl,
        signingUrlCreated: !!publicContract.signingUrlCreatedAt
      });
    } else {
      console.log('❌ Cloud signing page not accessible:', publicResponse.status);
    }

    // 3. Test contract email sending
    console.log('\n📧 Testing contract email sending...');
    
    const emailResponse = await fetch(`${REPLIT_URL}/api/contracts/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contractId: createdContract.id,
        customMessage: 'Looking forward to performing at your wedding!'
      }),
      credentials: 'include'
    });

    if (emailResponse.ok) {
      const emailResult = await emailResponse.json();
      console.log('✅ Contract email sent successfully:', {
        success: emailResult.success,
        hasCloudUrl: !!emailResult.cloudStorageUrl
      });
    } else {
      console.log('❌ Contract email sending failed:', emailResponse.status);
    }

    // 4. Test contract status after sending
    console.log('\n📊 Testing contract status after sending...');
    
    const statusResponse = await fetch(`${REPLIT_URL}/api/contracts`, {
      method: 'GET',
      credentials: 'include'
    });

    if (statusResponse.ok) {
      const contracts = await statusResponse.json();
      const updatedContract = contracts.find(c => c.id === createdContract.id);
      console.log('✅ Contract status updated:', {
        status: updatedContract.status,
        hasCloudUrl: !!updatedContract.cloudStorageUrl,
        reminderEnabled: updatedContract.reminderEnabled,
        reminderDays: updatedContract.reminderDays
      });
    }

    console.log('\n🎉 Enhanced contract system test completed successfully!');

  } catch (error) {
    console.error('❌ Enhanced contract system test failed:', error.message);
    console.error('Full error:', error);
  }
}

// Run the test
testEnhancedContractSystem();