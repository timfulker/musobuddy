/**
 * Check what data was stored in enquiry #228
 */

async function checkEnquiry228() {
  console.log('🔍 Checking enquiry #228 data...');
  
  try {
    const response = await fetch('https://musobuddy.replit.app/api/enquiries');
    const enquiries = await response.json();
    
    const enquiry228 = enquiries.find(e => e.id === 228);
    
    if (enquiry228) {
      console.log('📧 ENQUIRY #228 DATA:');
      console.log('Title:', enquiry228.title);
      console.log('Client Name:', enquiry228.clientName);
      console.log('Client Email:', enquiry228.clientEmail);
      console.log('Event Date:', enquiry228.eventDate);
      console.log('Venue:', enquiry228.venue);
      console.log('Raw Email Data:', enquiry228.rawEmailData);
      console.log('Source:', enquiry228.source);
      console.log('Status:', enquiry228.status);
      
      // Check if it shows the correct email content
      if (enquiry228.title.includes('Debug field names')) {
        console.log('✅ SUCCESS: Subject was parsed correctly!');
      } else {
        console.log('❌ Subject parsing failed');
      }
      
      if (enquiry228.rawEmailData && enquiry228.rawEmailData.includes('This will show what fields Mailgun sends')) {
        console.log('✅ SUCCESS: Email body was parsed correctly!');
      } else {
        console.log('❌ Email body parsing failed');
      }
      
    } else {
      console.log('❌ Enquiry #228 not found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkEnquiry228();