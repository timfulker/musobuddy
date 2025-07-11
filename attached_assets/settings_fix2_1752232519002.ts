// PART 1: Update your form schema to include instrumentsPlayed
const settingsFormSchema = insertUserSettingsSchema.omit({ userId: true }).extend({
  nextInvoiceNumber: z.number().min(1, "Invoice number must be at least 1"),
  gigTypes: z.string().optional(),
  eventTypes: z.string().optional(),
  instrumentsPlayed: z.string().optional(), // ✅ Add this line
});

// PART 2: Fix your instrument management functions

const addCustomInstrument = () => {
  if (newInstrument.trim() && !customInstruments.includes(newInstrument.trim()) && !selectedInstruments.includes(newInstrument.trim())) {
    const instrument = newInstrument.trim();
    
    // Update component state
    const updatedCustom = [...customInstruments, instrument];
    const updatedSelected = [...selectedInstruments, instrument];
    
    setCustomInstruments(updatedCustom);
    setSelectedInstruments(updatedSelected);
    
    // ✅ KEY FIX: Update the form state immediately
    const allInstruments = [...updatedSelected, ...updatedCustom];
    form.setValue('instrumentsPlayed', JSON.stringify(allInstruments));
    
    setNewInstrument("");
  }
};

// Also update the removeCustomInstrument function:
const removeCustomInstrument = (instrument: string) => {
  const updatedCustom = customInstruments.filter(i => i !== instrument);
  const updatedSelected = selectedInstruments.filter(i => i !== instrument);
  
  setCustomInstruments(updatedCustom);
  setSelectedInstruments(updatedSelected);
  
  // ✅ KEY FIX: Update the form state immediately
  const allInstruments = [...updatedSelected, ...updatedCustom];
  form.setValue('instrumentsPlayed', JSON.stringify(allInstruments));
};

// PART 3: Fix the onSubmit function
const onSubmit = (data: z.infer<typeof settingsFormSchema>) => {
  // Convert bank details table format back to string for storage
  const bankDetailsString = [
    bankDetails.bankName ? `Bank Name: ${bankDetails.bankName}` : '',
    bankDetails.accountName ? `Account Name: ${bankDetails.accountName}` : '',
    bankDetails.sortCode ? `Sort Code: ${bankDetails.sortCode}` : '',
    bankDetails.accountNumber ? `Account Number: ${bankDetails.accountNumber}` : ''
  ].filter(line => line.length > 0).join('\n');
  
  // Convert gigTypes from newline-separated string to JSON array
  const gigTypesArray = data.gigTypes ? 
    data.gigTypes.split('\n').filter(type => type.trim().length > 0) : [];
  
  // ✅ KEY FIX: Use the form data instead of manually constructing
  const instrumentsPlayedString = data.instrumentsPlayed || JSON.stringify([]);
  
  console.log('🎯 Form submission data:', {
    gigTypes: gigTypesArray,
    instrumentsPlayed: instrumentsPlayedString
  });
  
  const updatedData = {
    ...data,
    bankDetails: bankDetailsString,
    gigTypes: JSON.stringify(gigTypesArray),
    instrumentsPlayed: instrumentsPlayedString // ✅ Use form data
  };
  
  console.log('🎯 Final save data:', updatedData);
  saveSettingsMutation.mutate(updatedData);
};