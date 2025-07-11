// First, let's debug what's happening. Add this debug function to your settings.tsx:

const debugFormState = () => {
  const formData = form.getValues();
  console.log('🔍 Debug Form State:');
  console.log('📝 Current form data:', formData);
  console.log('🎸 instrumentsPlayed field:', formData.instrumentsPlayed);
  console.log('🎵 gigTypes field:', formData.gigTypes);
  console.log('🔄 Form state:', form.formState);
  console.log('💾 Selected instruments (UI):', selectedInstruments);
  console.log('🎯 Custom instruments (UI):', customInstruments);
};

// Then update ALL your setValue calls to include the shouldDirty and shouldTouch options:

// 1. Fix handleInstrumentChange:
const handleInstrumentChange = (instrument: string, checked: boolean) => {
  let updatedInstruments;
  if (checked) {
    updatedInstruments = [...selectedInstruments, instrument];
  } else {
    updatedInstruments = selectedInstruments.filter(i => i !== instrument);
  }
  setSelectedInstruments(updatedInstruments);
  
  // ✅ FIX: Add shouldDirty and shouldTouch options
  const allInstruments = [...updatedInstruments, ...customInstruments];
  form.setValue('instrumentsPlayed', JSON.stringify(allInstruments), {
    shouldDirty: true,
    shouldTouch: true,
    shouldValidate: true
  });
  
  console.log('🎸 Updated instruments via checkbox:', allInstruments);
};

// 2. Fix addCustomInstrument:
const addCustomInstrument = () => {
  if (newInstrument.trim() && !customInstruments.includes(newInstrument.trim()) && !selectedInstruments.includes(newInstrument.trim())) {
    const instrument = newInstrument.trim();
    
    const updatedCustom = [...customInstruments, instrument];
    const updatedSelected = [...selectedInstruments, instrument];
    
    setCustomInstruments(updatedCustom);
    setSelectedInstruments(updatedSelected);
    
    // ✅ FIX: Add shouldDirty and shouldTouch options
    const allInstruments = [...updatedSelected, ...updatedCustom];
    form.setValue('instrumentsPlayed', JSON.stringify(allInstruments), {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true
    });
    
    console.log('🎯 Added custom instrument:', instrument);
    console.log('🎸 All instruments now:', allInstruments);
    setNewInstrument("");
  }
};

// 3. Fix removeCustomInstrument:
const removeCustomInstrument = (instrument: string) => {
  const updatedCustom = customInstruments.filter(i => i !== instrument);
  const updatedSelected = selectedInstruments.filter(i => i !== instrument);
  
  setCustomInstruments(updatedCustom);
  setSelectedInstruments(updatedSelected);
  
  // ✅ FIX: Add shouldDirty and shouldTouch options
  const allInstruments = [...updatedSelected, ...updatedCustom];
  form.setValue('instrumentsPlayed', JSON.stringify(allInstruments), {
    shouldDirty: true,
    shouldTouch: true,
    shouldValidate: true
  });
  
  console.log('🗑️ Removed custom instrument:', instrument);
  console.log('🎸 All instruments now:', allInstruments);
};

// 4. Also update your gig type functions:
const addGigType = () => {
  if (newGigType.trim() && !gigTypes.includes(newGigType.trim())) {
    const updatedTypes = [...gigTypes, newGigType.trim()];
    setGigTypes(updatedTypes);
    form.setValue('gigTypes', updatedTypes.join('\n'), {
      shouldDirty: true,
      shouldTouch: true
    });
    setNewGigType("");
  }
};

const removeGigType = (typeToRemove: string) => {
  const updatedTypes = gigTypes.filter(type => type !== typeToRemove);
  setGigTypes(updatedTypes);
  form.setValue('gigTypes', updatedTypes.join('\n'), {
    shouldDirty: true,
    shouldTouch: true
  });
};

// 5. Add debug button to your form (temporarily for testing):
// Add this button somewhere in your form for testing:
<Button type="button" onClick={debugFormState} variant="outline">
  🔍 Debug Form State
</Button>

// 6. Update the updateGigTypesFromInstruments function:
const updateGigTypesFromInstruments = async () => {
  if (selectedInstruments.length === 0) {
    return;
  }

  let allSuggestions: string[] = [];
  const unknownInstruments: string[] = [];

  selectedInstruments.forEach(instrument => {
    if (defaultGigMappings[instrument]) {
      allSuggestions = [...allSuggestions, ...defaultGigMappings[instrument]];
    } else {
      unknownInstruments.push(instrument);
    }
  });

  if (unknownInstruments.length > 0) {
    try {
      const response = await fetch('/api/suggest-gigs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ instruments: unknownInstruments }),
      });

      if (response.ok) {
        const aiSuggestions = await response.json();
        allSuggestions = [...allSuggestions, ...aiSuggestions];
      }
    } catch (error) {
      console.log('AI suggestions not available for unknown instruments:', unknownInstruments);
    }
  }

  const newGigTypes = [...new Set([...gigTypes, ...allSuggestions])];
  setGigTypes(newGigTypes);
  
  // ✅ FIX: Add shouldDirty option here too
  form.setValue('gigTypes', newGigTypes.join('\n'), {
    shouldDirty: true,
    shouldTouch: true
  });
  
  console.log('🎵 Updated gig types from instruments:', newGigTypes);
};