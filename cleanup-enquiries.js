/**
 * Clean up test enquiries, keeping only confirmed ones
 */

async function cleanupEnquiries() {
  console.log('🧹 CLEANING UP TEST ENQUIRIES');
  console.log('=============================');
  
  try {
    // Use direct API call to get enquiries
    const response = await fetch('https://musobuddy.replit.app/api/enquiries', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.log('❌ Failed to fetch enquiries');
      return;
    }
    
    const allEnquiries = await response.json();
    console.log(`📊 Total enquiries found: ${allEnquiries.length}`);
    
    // Show current enquiries
    console.log('\n📋 Current enquiries:');
    allEnquiries.slice(0, 15).forEach((e, index) => {
      console.log(`${index + 1}. ID: ${e.id} | Client: ${e.clientName} | Status: ${e.status} | Email: ${e.clientEmail}`);
    });
    
    // Identify confirmed enquiries
    const confirmedEnquiries = allEnquiries.filter(e => e.status === 'confirmed');
    const testEnquiries = allEnquiries.filter(e => e.status !== 'confirmed');
    
    console.log(`\n✅ Confirmed enquiries to keep: ${confirmedEnquiries.length}`);
    confirmedEnquiries.forEach(e => {
      console.log(`   - ID: ${e.id} | Client: ${e.clientName} | ${e.clientEmail}`);
    });
    
    console.log(`\n🗑️  Test enquiries to delete: ${testEnquiries.length}`);
    
    if (testEnquiries.length > 0) {
      console.log('\n🔄 Deleting test enquiries...');
      
      // Delete each test enquiry
      for (const enquiry of testEnquiries) {
        try {
          const deleteResponse = await fetch(`https://musobuddy.replit.app/api/enquiries/${enquiry.id}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          if (deleteResponse.ok) {
            console.log(`   ✅ Deleted ID ${enquiry.id} (${enquiry.clientName})`);
          } else {
            console.log(`   ❌ Failed to delete ID ${enquiry.id}`);
          }
        } catch (error) {
          console.log(`   ❌ Error deleting ID ${enquiry.id}: ${error.message}`);
        }
        
        // Small delay to prevent overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log('\n✅ Cleanup completed!');
    } else {
      console.log('\n✅ No test enquiries to delete.');
    }
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
  }
}

cleanupEnquiries();