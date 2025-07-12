// Safe storage wrapper that eliminates timestamp conversion issues
import { storage } from './storage';

// Safe enquiry creation that bypasses Zod validation issues
export async function createEnquirySafe(enquiryData: {
  userId: string;
  title: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  eventDate: Date | null;
  venue: string | null;
  eventType: string | null;
  notes: string;
  status: string;
}): Promise<any> {
  console.log('🛡️ === SAFE ENQUIRY CREATION START ===');
  
  try {
    // Create a completely clean data object with explicit null handling
    const cleanData = {
      userId: String(enquiryData.userId),
      title: String(enquiryData.title || 'Email Enquiry'),
      clientName: String(enquiryData.clientName || 'Unknown Client'),
      clientEmail: enquiryData.clientEmail || null,
      clientPhone: enquiryData.clientPhone || null,
      eventDate: null as Date | null,
      eventTime: null as string | null,
      eventEndTime: null as string | null,
      performanceDuration: null as number | null,
      venue: enquiryData.venue || null,
      eventType: enquiryData.eventType || null,
      gigType: null as string | null,
      estimatedValue: null as string | null,
      status: enquiryData.status || 'new',
      notes: enquiryData.notes || null,
      responseNeeded: true,
      lastContactedAt: null as Date | null
    };

    // Handle eventDate with extreme care
    if (enquiryData.eventDate && enquiryData.eventDate instanceof Date) {
      // Verify the Date is valid before using it
      if (!isNaN(enquiryData.eventDate.getTime())) {
        cleanData.eventDate = enquiryData.eventDate;
        console.log('🛡️ Valid Date object assigned:', enquiryData.eventDate.toISOString());
      } else {
        console.log('🛡️ Invalid Date object, setting to null');
        cleanData.eventDate = null;
      }
    } else {
      console.log('🛡️ No valid Date object, setting eventDate to null');
      cleanData.eventDate = null;
    }

    console.log('🛡️ Clean data prepared for storage:', {
      ...cleanData,
      eventDate: cleanData.eventDate ? `Date(${cleanData.eventDate.toISOString()})` : 'null',
      notes: cleanData.notes ? `${cleanData.notes.substring(0, 50)}...` : 'null'
    });

    // Call storage with clean data
    console.log('🛡️ Calling storage.createEnquiry...');
    const result = await storage.createEnquiry(cleanData);
    
    console.log('🛡️ Storage creation successful!');
    console.log('🛡️ Created enquiry ID:', result.id);
    console.log('🛡️ === SAFE ENQUIRY CREATION END SUCCESS ===');
    
    return result;

  } catch (error: any) {
    console.error('🛡️ === SAFE ENQUIRY CREATION ERROR ===');
    console.error('🛡️ Error in safe storage wrapper:', error.message);
    console.error('🛡️ Error stack:', error.stack);
    console.error('🛡️ Input data that failed:', {
      userId: enquiryData.userId,
      title: enquiryData.title,
      clientName: enquiryData.clientName,
      eventDate: enquiryData.eventDate ? 
        (enquiryData.eventDate instanceof Date ? 
          `Date(${enquiryData.eventDate.toISOString()})` : 
          `Invalid: ${typeof enquiryData.eventDate}`) : 
        'null'
    });
    
    // Re-throw with more context
    throw new Error(`Safe storage creation failed: ${error.message}`);
  }
}