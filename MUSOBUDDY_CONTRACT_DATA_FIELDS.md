# MusoBuddy Contract Data Fields Reference
## For External Contract Design Compatibility

This document provides ALL available database fields that can be used in contract templates to ensure perfect compatibility with the MusoBuddy system.

---

## CONTRACT DATA FIELDS

### Basic Contract Information
```
contract.id                    // Unique contract ID (number)
contract.contractNumber        // Human-readable contract number (string)
contract.status               // draft, sent, signed, completed
contract.createdAt            // Contract creation date
contract.updatedAt            // Last modification date
```

### Client Information
```
contract.clientName           // Client's full name (REQUIRED)
contract.clientEmail          // Client's email address
contract.clientPhone          // Client's phone number
contract.clientAddress        // Client's full address (text)
```

### Event Details
```
contract.venue               // Venue name
contract.venueAddress        // Venue full address
contract.eventDate           // Event date (timestamp)
contract.eventTime           // Event start time (string, e.g., "19:30")
contract.eventEndTime        // Event end time (string, e.g., "23:00")
contract.fee                 // Performance fee (decimal, e.g., "500.00")
contract.deposit             // Deposit amount (decimal, default "0.00")
```

### Additional Requirements
```
contract.paymentInstructions     // How payment should be made
contract.equipmentRequirements   // Equipment needed from venue
contract.specialRequirements     // Any special rider requirements
```

### Signature & Status Tracking
```
contract.signedAt               // When contract was signed (timestamp)
contract.clientSignature       // Client's signature data
contract.clientIpAddress       // IP address when signed
contract.signingPageUrl        // URL for signing page
contract.cloudStorageUrl       // Direct PDF URL
```

---

## USER SETTINGS / BUSINESS INFORMATION

### Business Details
```
userSettings.businessName           // Business/stage name
userSettings.businessEmail         // Business email address
userSettings.businessAddress       // Legacy full address
userSettings.addressLine1          // Address line 1
userSettings.addressLine2          // Address line 2
userSettings.city                  // City
userSettings.county                // County/state
userSettings.postcode             // Postal code
userSettings.phone                // Business phone number
userSettings.website              // Website URL
userSettings.emailFromName        // Display name for emails
```

### Financial & Legal
```
userSettings.taxNumber            // VAT/Tax registration number
userSettings.bankDetails          // Bank payment details (text)
userSettings.defaultTerms         // Default terms and conditions
```

### Performance Settings
```
userSettings.primaryInstrument       // Main instrument (saxophone, guitar, etc.)
userSettings.secondaryInstruments    // Additional instruments (JSON array)
userSettings.availableGigTypes      // Available gig types (JSON array)
userSettings.instrumentsPlayed      // Description of instruments/services
```

### AI Pricing (Optional)
```
userSettings.baseHourlyRate         // Base hourly rate (decimal)
userSettings.minimumBookingHours    // Minimum booking duration
userSettings.additionalHourRate     // Rate for additional hours
userSettings.djServiceRate         // DJ service rate
userSettings.pricingNotes          // Custom pricing notes
userSettings.specialOffers         // Current special offers
```

---

## FORMATTING EXAMPLES

### Date Formatting
```javascript
// Event date formatted for UK display
new Date(contract.eventDate).toLocaleDateString('en-GB', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
})
// Output: "Saturday, 4 October 2025"

// Simple date format
new Date(contract.eventDate).toLocaleDateString('en-GB')
// Output: "04/10/2025"
```

### Address Formatting
```javascript
// Split and format addresses with line breaks
contract.clientAddress.split(',').map(part => part.trim()).join('<br>')
```

### Money Formatting
```javascript
// Format fee with currency symbol
`£${contract.fee || '0.00'}`
// Output: "£500.00"
```

---

## CONDITIONAL FIELD USAGE

### Optional Fields Handling
```javascript
// Safe handling of optional fields
${contract.clientPhone ? `Phone: ${contract.clientPhone}` : 'Phone not provided'}
${contract.specialRequirements ? `<p>Special Requirements: ${contract.specialRequirements}</p>` : ''}
${userSettings.website ? `Website: ${userSettings.website}` : ''}
```

### Address Assembly
```javascript
// Build complete performer address
const performerAddress = [
  userSettings.addressLine1,
  userSettings.addressLine2,
  userSettings.city,
  userSettings.county,  
  userSettings.postcode
].filter(Boolean).join(', ');
```

---

## SIGNATURE STATUS DETECTION

### Contract Signing Status
```javascript
// Check if contract is signed
const isSigned = contract.signedAt && contract.clientSignature;

// Display signature status
${isSigned ? 
  `✓ Signed by ${contract.clientName} on ${new Date(contract.signedAt).toLocaleDateString('en-GB')}` 
  : 'Awaiting client signature'
}
```

---

## EXAMPLE USAGE IN TEMPLATE

```html
<!-- Contract Header -->
<h1>Performance Contract</h1>
<p>Contract #${contract.contractNumber}</p>

<!-- Client Details -->
<h2>Client Information</h2>
<p><strong>${contract.clientName}</strong></p>
${contract.clientEmail ? `<p>Email: ${contract.clientEmail}</p>` : ''}
${contract.clientPhone ? `<p>Phone: ${contract.clientPhone}</p>` : ''}
${contract.clientAddress ? `<p>Address: ${contract.clientAddress}</p>` : ''}

<!-- Event Details -->
<h2>Event Details</h2>
<p>Date: ${new Date(contract.eventDate).toLocaleDateString('en-GB', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
})}</p>
<p>Time: ${contract.eventTime || 'TBC'} - ${contract.eventEndTime || 'TBC'}</p>
<p>Venue: ${contract.venue || 'TBC'}</p>
<p>Fee: £${contract.fee || '0.00'}</p>

<!-- Performer Details -->
<h2>Performer Details</h2>
<p><strong>${userSettings.businessName || 'Professional Musician'}</strong></p>
${userSettings.phone ? `<p>Phone: ${userSettings.phone}</p>` : ''}
${userSettings.businessEmail ? `<p>Email: ${userSettings.businessEmail}</p>` : ''}
```

---

## IMPORTANT NOTES

1. **All fields are optional** except `contract.clientName`, `contract.eventDate`, and `contract.fee`
2. **Always provide fallback values** for optional fields (e.g., `|| 'TBC'`)
3. **Date objects need formatting** - use `new Date().toLocaleDateString('en-GB')`
4. **Money fields are decimals** - format as `£${contract.fee}`
5. **JSON fields** like `availableGigTypes` need parsing: `JSON.parse(userSettings.availableGigTypes || '[]')`

---

## TEMPLATE COMPATIBILITY CHECKLIST

- [ ] Uses only fields from this reference document
- [ ] Handles optional fields with fallbacks
- [ ] Formats dates in UK format
- [ ] Formats money with £ symbol
- [ ] Includes signature status detection
- [ ] Works with both signed and unsigned contracts
- [ ] Responsive layout for A4 PDF generation

---

**Generated:** ${new Date().toLocaleDateString('en-GB')} for MusoBuddy v1.0
**Database Schema Version:** Latest (August 2025)