// ===== PART 1: Database Schema Update (schema.ts) =====
// Make sure your schema has this field in userSettings table:
export const userSettings = pgTable("user_settings", {
  // ... other fields ...
  instrumentsPlayed: text("instruments_played"), // All instruments (predefined + custom)
  customInstruments: text("custom_instruments"), // Just the custom ones for separation
  // ... other fields ...
});

// ===== PART 2: Storage.ts Update =====
// Add this debug logging to your upsertUserSettings method:
async upsertUserSettings(settings: InsertUserSettings): Promise<UserSettings> {
  console.log('🔥 STORAGE: upsertUserSettings called with:', JSON.stringify(settings, null, 2));
  console.log('🔥 STORAGE: instrumentsPlayed field:', settings.instrumentsPlayed);
  console.log('🔥 STORAGE: customInstruments field:', settings.customInstruments);
  
  // First try to find existing settings
  const [existingSettings] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, settings.userId));

  console.log('🔥 STORAGE: Existing settings found:', existingSettings ? 'YES' : 'NO');

  if (existingSettings) {
    // Update existing settings
    console.log('🔥 STORAGE: Updating existing settings');
    const [updatedSettings] = await db
      .update(userSettings)
      .set({
        ...settings,
        updatedAt: new Date(),
      })
      .where(eq(userSettings.userId, settings.userId))
      .returning();
    console.log('🔥 STORAGE: Updated settings result:', JSON.stringify(updatedSettings, null, 2));
    console.log('🔥 STORAGE: instrumentsPlayed in result:', updatedSettings.instrumentsPlayed);
    console.log('🔥 STORAGE: customInstruments in result:', updatedSettings.customInstruments);
    return updatedSettings;
  } else {
    // Insert new settings
    console.log('🔥 STORAGE: Creating new settings');
    const [newSettings] = await db
      .insert(userSettings)
      .values({
        ...settings,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    console.log('🔥 STORAGE: Created settings result:', JSON.stringify(newSettings, null, 2));
    return newSettings;
  }
}

// ===== PART 3: Routes.ts Update =====
// Update your settings endpoint with enhanced logging:
app.post('/api/settings', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    console.log("🔥 ROUTES: Saving settings for user:", userId);
    console.log("🔥 ROUTES: Full request body:", JSON.stringify(req.body, null, 2));
    console.log("🔥 ROUTES: instrumentsPlayed in request:", req.body.instrumentsPlayed);
    console.log("🔥 ROUTES: customInstruments in request:", req.body.customInstruments);
    
    const settingsData = { ...req.body, userId };
    console.log("🔥 ROUTES: Settings data to save:", JSON.stringify(settingsData, null, 2));
    
    const settings = await storage.upsertUserSettings(settingsData);
    console.log("🔥 ROUTES: Settings saved successfully:", JSON.stringify(settings, null, 2));
    console.log("🔥 ROUTES: instrumentsPlayed in response:", settings.instrumentsPlayed);
    console.log("🔥 ROUTES: customInstruments in response:", settings.customInstruments);
    res.json(settings);
  } catch (error) {
    console.error("🔥 ROUTES: Error saving user settings:", error);
    console.error("🔥 ROUTES: Error details:", error.message);
    console.error("🔥 ROUTES: Error stack:", error.stack);
    res.status(500).json({ message: "Failed to save settings" });
  }
});

// ===== PART 4: Settings.tsx Key Function Updates =====

// Update the addCustomInstrument function:
const addCustomInstrument = () => {
  if (newInstrument.trim() && !customInstruments.includes(newInstrument.trim()) && !selectedInstruments.includes(newInstrument.trim())) {
    const instrument = newInstrument.trim();
    
    // Update component state
    const updatedCustom = [...customInstruments, instrument];
    const updatedSelected = [...selectedInstruments, instrument];
    
    setCustomInstruments(updatedCustom);
    setSelectedInstruments(updatedSelected);
    
    // ✅ Update BOTH form fields
    form.setValue('instrumentsPlayed', JSON.stringify(updatedSelected), {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true
    });
    
    form.setValue('customInstruments', JSON.stringify(updatedCustom), {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true
    });
    
    console.log('🎯 Added custom instrument:', instrument);
    console.log('🎸 All selected instruments:', updatedSelected);
    console.log('🎯 Custom instruments only:', updatedCustom);
    
    setNewInstrument("");
  }
};

// Update the onSubmit function:
const onSubmit = (data: z.infer<typeof settingsFormSchema>) => {
  console.log('🚀 FORM SUBMIT: Starting submission');
  console.log('🚀 FORM SUBMIT: Form data received:', JSON.stringify(data, null, 2));
  
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
  
  // Use form data for instruments
  const instrumentsPlayedString = data.instrumentsPlayed || JSON.stringify([]);
  const customInstrumentsString = data.customInstruments || JSON.stringify([]);
  
  console.log('🚀 FORM SUBMIT: Processed data:');
  console.log('  - gigTypes:', gigTypesArray);
  console.log('  - instrumentsPlayed:', instrumentsPlayedString);
  console.log('  - customInstruments:', customInstrumentsString);
  
  const updatedData = {
    ...data,
    bankDetails: bankDetailsString,
    gigTypes: JSON.stringify(gigTypesArray),
    instrumentsPlayed: instrumentsPlayedString,
    customInstruments: customInstrumentsString
  };
  
  console.log('🚀 FORM SUBMIT: Final data for API:', JSON.stringify(updatedData, null, 2));
  saveSettingsMutation.mutate(updatedData);
};

// ===== PART 5: Database Migration Check =====
// If the customInstruments column doesn't exist, you'll need to run this migration:

/*
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS custom_instruments TEXT;
*/

// Or create a migration file with Drizzle:
/*
npx drizzle-kit generate:pg
npx drizzle-kit push:pg
*/