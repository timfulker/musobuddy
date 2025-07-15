// Add this state variable near the top of your component with the other useState declarations:

const [hasInitialized, setHasInitialized] = useState(false);

// Then modify the useEffect that loads settings data to set hasInitialized to true:

React.useEffect(() => {
  if (settings && Object.keys(settings).length > 0) {
    // ... existing form.reset logic ...
    
    // Add this at the end of the useEffect:
    setHasInitialized(true);
  }
}, [settings, form]);

// The existing useEffect that was causing the error should now work:
React.useEffect(() => {
  if (hasInitialized) {
    updateGigTypesFromInstruments();
  }
}, [selectedInstruments, hasInitialized]);