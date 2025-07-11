// In your settings.tsx, replace the addCustomInstrument function with this:

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

// And update the handleInstrumentChange function:
const handleInstrumentChange = (instrument: string, checked: boolean) => {
  let updatedInstruments;
  if (checked) {
    updatedInstruments = [...selectedInstruments, instrument];
  } else {
    updatedInstruments = selectedInstruments.filter(i => i !== instrument);
  }
  
  setSelectedInstruments(updatedInstruments);
  
  // ✅ KEY FIX: Update the form state immediately
  const allInstruments = [...updatedInstruments, ...customInstruments];
  form.setValue('instrumentsPlayed', JSON.stringify(allInstruments));
};