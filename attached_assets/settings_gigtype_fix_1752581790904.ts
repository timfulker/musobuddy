// Replace the updateGigTypesFromInstruments function with this corrected version:

const updateGigTypesFromInstruments = async () => {
  // ✅ Clear gig types when no instruments are selected
  if (selectedInstruments.length === 0) {
    setGigTypes([]);
    form.setValue('gigTypes', ''); // ✅ Use empty string, not JSON
    return;
  }

  let allSuggestions: string[] = [];
  const unknownInstruments: string[] = [];

  // Get suggestions for known instruments from default mappings
  selectedInstruments.forEach(instrument => {
    if (defaultGigMappings[instrument]) {
      allSuggestions = [...allSuggestions, ...defaultGigMappings[instrument]];
    } else {
      unknownInstruments.push(instrument);
    }
  });

  // Use API for unknown instruments with caching
  if (unknownInstruments.length > 0) {
    try {
      console.log('🎵 Fetching gig suggestions for unknown instruments:', unknownInstruments);
      
      const response = await fetch('/api/suggest-gigs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instruments: unknownInstruments
        }),
      });

      if (response.ok) {
        const apiSuggestions = await response.json();
        console.log('🎵 API suggestions received:', apiSuggestions);
        allSuggestions = [...allSuggestions, ...apiSuggestions];
      } else {
        console.warn('🎵 API request failed, using default mappings only');
      }
    } catch (error) {
      console.error('🎵 Error fetching API suggestions:', error);
    }
  }

  // ✅ Update gig types with all suggestions
  const newGigTypes = [...new Set(allSuggestions)];
  setGigTypes(newGigTypes);
  form.setValue('gigTypes', newGigTypes.join('\n')); // ✅ Use newline-separated string
  
  console.log('🎯 Updated gig types (not saved yet):', newGigTypes);
};