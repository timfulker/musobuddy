/**
 * Transfer existing enquiries to calendar - one-time migration script
 */

async function transferEnquiries() {
  try {
    console.log('🚀 Starting transfer of existing enquiries to calendar...');
    
    // First get authentication cookie
    const authResponse = await fetch('http://localhost:5000/api/auth/user', {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!authResponse.ok) {
      console.log('⚠️  Authentication needed - this script requires running from the app interface');
      console.log('📝 Please run the Transfer to Calendar function from the Calendar page in your browser');
      return;
    }
    
    const response = await fetch('http://localhost:5000/api/transfer-enquiries-to-calendar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Transfer completed successfully!');
      console.log(`📊 Results: ${result.details.transferred} transferred, ${result.details.skipped} skipped out of ${result.details.total} total enquiries`);
      console.log(`📅 Message: ${result.message}`);
    } else {
      console.error('❌ Transfer failed:', result.message);
    }
    
  } catch (error) {
    console.error('❌ Error during transfer:', error);
  }
}

// Run the transfer
transferEnquiries();