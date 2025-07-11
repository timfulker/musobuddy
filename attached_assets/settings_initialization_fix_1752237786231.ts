// ===== FIXED INITIALIZATION LOGIC =====
// Replace the initialization section in your settings.tsx with this:

// Update form when settings data loads
const [hasInitialized, setHasInitialized] = useState(false);
if (settings.businessName && !hasInitialized) {
  form.reset({
    businessName: settings.businessName || "",
    businessEmail: settings.businessEmail || "",
    businessAddress: settings.businessAddress || "",
    phone: settings.phone || "",
    website: settings.website || "",
    taxNumber: settings.taxNumber || "",
    bankDetails: settings.bankDetails || "",
    defaultTerms: settings.defaultTerms || "",
    emailFromName: settings.emailFromName || "",
    nextInvoiceNumber: settings.nextInvoiceNumber || 256,
    gigTypes: (() => {
      if (settings.gigTypes) {
        try {
          const parsed = JSON.parse(settings.gigTypes);
          return Array.isArray(parsed) ? parsed.join('\n') : settings.gigTypes;
        } catch (e) {
          return settings.gigTypes;
        }
      }
      return "";
    })(),
    eventTypes: settings.eventTypes || "",
    instrumentsPlayed: settings.instrumentsPlayed || "",
    customInstruments: settings.customInstruments || "",
  });
  
  // Initialize tag arrays
  setEventTypes(settings.eventTypes ? settings.eventTypes.split('\n').filter(Boolean) : []);
  
  // Handle gigTypes - they could be stored as JSON or newline-separated string
  let gigTypesArray = [];
  if (settings.gigTypes) {
    try {
      gigTypesArray = JSON.parse(settings.gigTypes);
    } catch (e) {
      gigTypesArray = settings.gigTypes.split('\n').filter(Boolean);
    }
  }
  setGigTypes(gigTypesArray);
  
  // ✅ FIXED: Load selected instruments from instrumentsPlayed field
  let allSelectedInstruments = [];
  if (settings.instrumentsPlayed) {
    try {
      allSelectedInstruments = JSON.parse(settings.instrumentsPlayed);
      console.log('🎯 All selected instruments from DB:', allSelectedInstruments);
    } catch (e) {
      allSelectedInstruments = settings.instrumentsPlayed.split('\n').filter(Boolean);
      console.log('🎯 All selected instruments from string:', allSelectedInstruments);
    }
  }
  
  // ✅ FIXED: Load custom instruments from customInstruments field
  let customInstrumentsFromDB = [];
  if (settings.customInstruments) {
    try {
      customInstrumentsFromDB = JSON.parse(settings.customInstruments);
      console.log('🎯 Custom instruments from DB:', customInstrumentsFromDB);
    } catch (e) {
      customInstrumentsFromDB = settings.customInstruments.split('\n').filter(Boolean);
      console.log('🎯 Custom instruments from string:', customInstrumentsFromDB);
    }
  }
  
  // ✅ FIXED: Use the actual selected instruments (which includes both predefined + custom)
  setSelectedInstruments(allSelectedInstruments);
  setCustomInstruments(customInstrumentsFromDB);
  
  // ✅ Initialize form with the actual instrument data
  form.setValue('instrumentsPlayed', JSON.stringify(allSelectedInstruments));
  form.setValue('customInstruments', JSON.stringify(customInstrumentsFromDB));
  
  console.log('🔄 INITIALIZATION COMPLETE:');
  console.log('  - Selected instruments:', allSelectedInstruments);
  console.log('  - Custom instruments:', customInstrumentsFromDB);
  
  // Parse bank details from stored string format
  const bankDetailsString = settings.bankDetails || "";
  const parsedBankDetails = {
    bankName: "",
    accountName: "",
    sortCode: "",
    accountNumber: ""
  };
  
  if (bankDetailsString) {
    const lines = bankDetailsString.split('\n');
    lines.forEach(line => {
      if (line.includes('Bank Name:')) parsedBankDetails.bankName = line.split('Bank Name:')[1]?.trim() || "";
      if (line.includes('Account Name:')) parsedBankDetails.accountName = line.split('Account Name:')[1]?.trim() || "";
      if (line.includes('Sort Code:')) parsedBankDetails.sortCode = line.split('Sort Code:')[1]?.trim() || "";
      if (line.includes('Account Number:')) parsedBankDetails.accountNumber = line.split('Account Number:')[1]?.trim() || "";
    });
  }
  
  setBankDetails(parsedBankDetails);
  setHasInitialized(true);
}

// ===== ALSO ADD THIS DEBUG FUNCTION =====
// Add this function to help debug the database values:
const debugDatabaseValues = () => {
  console.log('🔍 DATABASE VALUES DEBUG:');
  console.log('  - settings.instrumentsPlayed (raw):', settings.instrumentsPlayed);
  console.log('  - settings.customInstruments (raw):', settings.customInstruments);
  
  if (settings.instrumentsPlayed) {
    try {
      const parsed = JSON.parse(settings.instrumentsPlayed);
      console.log('  - settings.instrumentsPlayed (parsed):', parsed);
    } catch (e) {
      console.log('  - settings.instrumentsPlayed (parse error):', e.message);
    }
  }
  
  if (settings.customInstruments) {
    try {
      const parsed = JSON.parse(settings.customInstruments);
      console.log('  - settings.customInstruments (parsed):', parsed);
    } catch (e) {
      console.log('  - settings.customInstruments (parse error):', e.message);
    }
  }
  
  console.log('  - Current UI state:');
  console.log('    - selectedInstruments:', selectedInstruments);
  console.log('    - customInstruments:', customInstruments);
};

// ===== ADD THIS BUTTON FOR TESTING =====
// Add this button temporarily next to your debug button:
<Button type="button" onClick={debugDatabaseValues} variant="outline" size="sm">
  Debug DB Values
</Button>