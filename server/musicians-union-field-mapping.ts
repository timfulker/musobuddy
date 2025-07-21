/**
 * Musicians Union Contract Field Mapping Configuration
 * Optimized for L2 "Hiring a Solo Musician" contracts
 */

export interface MusiciansUnionFieldMapping {
  contractField: string;
  bookingField: string;
  aliases: string[];
  extractionRule: string;
  examples: string[];
}

export const MUSICIANS_UNION_FIELD_MAPPINGS: MusiciansUnionFieldMapping[] = [
  {
    contractField: "Start Time",
    bookingField: "eventTime", 
    aliases: ["Start", "Commencement Time", "Performance Start"],
    extractionRule: "Convert 24-hour format (e.g. '1545' becomes '15:45', '12.00' becomes '12:00')",
    examples: ["12.00 (TBC)", "1545", "19:00", "7:30pm"]
  },
  {
    contractField: "Finish Time", 
    bookingField: "eventEndTime",
    aliases: ["End Time", "Completion Time", "Performance End", "Midnight"],
    extractionRule: "Convert to 24-hour format or handle special cases like 'Midnight' = '00:00'",
    examples: ["Midnight", "1900", "23:30", "11:30pm"]
  },
  {
    contractField: "Fee",
    bookingField: "quotedAmount",
    aliases: ["Total Fee", "Payment", "£", "Cost"],
    extractionRule: "Extract numeric value only, ignore currency symbols and additional text",
    examples: ["£710 (3.5 hours +DJ)", "£260 for 2 hours", "£150"]
  },
  {
    contractField: "between [NAME]",
    bookingField: "clientName", 
    aliases: ["Print Name", "Hirer Name", "Client"],
    extractionRule: "Extract PERSON name only, NOT organization name. Check 'Print Name' field in 'Signed by the Hirer' section first",
    examples: ["Harry Charles Tamplin", "Robin Jarman", "Lauren Beauchamp"]
  },
  {
    contractField: "of [ADDRESS]",
    bookingField: "clientAddress",
    aliases: ["Hirer Address", "Client Address"],
    extractionRule: "Extract full address following 'of' after client name",
    examples: ["11 Woodland Chase", "The Drift, Hall Lane, Upper Farringdon Nr Alton GU34 3EA"]
  },
  {
    contractField: "The Hirer engages the Musician to perform...at [VENUE]",
    bookingField: "venue",
    aliases: ["Performance Location", "Event Venue", "Location"],
    extractionRule: "Extract venue name from engagement clause",
    examples: ["Stratton Court Barn", "The Drift", "St. Mary's Church"]
  },
  {
    contractField: "Email",
    bookingField: "clientEmail", 
    aliases: ["Email Address", "E-mail", "Contact Email"],
    extractionRule: "Extract from 'Signed by the Hirer' section, NOT from musician section",
    examples: ["harrytamplin@hotmail.co.uk", "robinjarman@live.co.uk"]
  },
  {
    contractField: "Phone Number",
    bookingField: "clientPhone",
    aliases: ["Tel", "Mobile", "Contact Number"], 
    extractionRule: "Extract from 'Signed by the Hirer' section, NOT from musician section",
    examples: ["07539322292", "07557 982669"]
  },
  {
    contractField: "Date",
    bookingField: "eventDate",
    aliases: ["Event Date", "Performance Date", "Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    extractionRule: "Convert to YYYY-MM-DD format. Handle formats like 'Saturday 19th July 2025' or '29-07-2025'",
    examples: ["Saturday 19th July 2025", "29-07-2025", "20072025"]
  }
];

export const MUSICIANS_UNION_EXTRACTION_PROMPT = `You are an expert at extracting information from Musicians' Union L2 "Hiring a Solo Musician" contracts.

CRITICAL CONTRACT STRUCTURE UNDERSTANDING:
- These are standardized Musicians' Union contracts with consistent field layouts
- "between [NAME]" section = CLIENT/HIRER information  
- "and [MUSICIAN]" section = PERFORMER information (usually Tim Fulker - IGNORE THIS)
- "Signed by the Hirer" section = CLIENT signature and contact details
- "Signed by the Musician" section = PERFORMER signature (IGNORE THIS)

FIELD MAPPING RULES FOR MUSICIANS UNION CONTRACTS:

1. CLIENT NAME: 
   - Primary: Look for "Print Name [NAME]" in "Signed by the Hirer" section
   - Fallback: Extract person name from "between [PERSON NAME]" (NOT organization name)
   - NEVER extract "Tim Fulker" or "Saxweddings" as client

2. START/END TIMES:
   - Contract uses: "Start Time" and "Finish Time" 
   - Convert to: "eventTime" and "eventEndTime"
   - Handle formats: "12.00" → "12:00", "1545" → "15:45", "Midnight" → "00:00"

3. FEE EXTRACTION:
   - Contract field: "Fee" column in table
   - Extract numeric value only: "£710 (3.5 hours +DJ)" → 710
   - Map to: "quotedAmount"

4. VENUE EXTRACTION:
   - Look for: "to perform...at [VENUE NAME]"
   - Next line typically has venue address
   - Map to: "venue" and "venueAddress"

5. CLIENT CONTACT:
   - Extract from "Signed by the Hirer" section ONLY
   - Phone and Email fields are clearly labeled
   - NEVER extract Tim Fulker's contact details

6. DATE CONVERSION:
   - Handle: "Saturday 19th July 2025" → "2025-07-19"
   - Handle: "29-07-2025" → "2025-07-29"
   - Handle: "20072025" → "2025-07-20"

VALIDATION RULES:
- Client name should NOT be "Tim Fulker", "TIM FULKER", or "Saxweddings"  
- Email should NOT be "timfulker@gmail.com"
- Phone should NOT be "07764190034"
- All extracted data must come from the HIRER sections, not MUSICIAN sections

Return data optimized for booking form population with these exact field names:
- clientName, clientEmail, clientPhone, clientAddress
- venue, venueAddress  
- eventDate, eventTime, eventEndTime
- quotedAmount (numeric value only)
- eventType, equipmentRequirements, specialRequirements`;

export function buildMusiciansUnionPrompt(contractText: string): string {
  return `${MUSICIANS_UNION_EXTRACTION_PROMPT}

CONTRACT TEXT TO PARSE:
${contractText}

Extract and return ONLY valid JSON with this exact structure:
{
  "clientName": "client name from Print Name field or between field (person name only)",
  "clientEmail": "hirer's email from signature section", 
  "clientPhone": "hirer's phone from signature section",
  "clientAddress": "address following 'of' after client name",
  "venue": "venue name from engagement details",
  "venueAddress": "venue address if different from client address", 
  "eventDate": "YYYY-MM-DD format",
  "eventTime": "HH:MM format from Start Time (convert formats as needed)",
  "eventEndTime": "HH:MM format from Finish Time (handle 'Midnight' as '00:00')",
  "quotedAmount": 710.00,
  "eventType": "type of performance if mentioned",
  "equipmentRequirements": "any equipment requirements mentioned",
  "specialRequirements": "any special requirements or notes",
  "performanceDuration": "duration if explicitly mentioned"
}`;
}