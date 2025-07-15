import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Settings as SettingsIcon, Save, Building, Phone, Globe, CreditCard, FileText, Mail, Key, Plus, X, Music, Sparkles, Menu } from "lucide-react";
import { insertUserSettingsSchema, type UserSettings } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";

const settingsFormSchema = insertUserSettingsSchema.omit({ userId: true }).extend({
  nextInvoiceNumber: z.number().min(1, "Invoice number must be at least 1"),
  gigTypes: z.string().optional(),
  eventTypes: z.string().optional(),
  instrumentsPlayed: z.string().optional(),
  customInstruments: z.string().optional(),
});

export default function Settings() {
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  
  // Debug logging for authentication context
  React.useEffect(() => {
    console.log("Settings page loaded");
    console.log("Current URL:", window.location.href);
    console.log("Document cookies:", document.cookie);
  }, []);
  const [bankDetails, setBankDetails] = useState({
    bankName: "",
    accountName: "",
    sortCode: "",
    accountNumber: ""
  });
  
  // State for tag management
  const [eventTypes, setEventTypes] = useState<string[]>([]);
  const [gigTypes, setGigTypes] = useState<string[]>([]);
  const [newEventType, setNewEventType] = useState("");
  const [newGigType, setNewGigType] = useState("");
  
  // State for instrument selection
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);
  const [customInstruments, setCustomInstruments] = useState<string[]>([]);
  const [newInstrument, setNewInstrument] = useState("");
  
  // Define instrument categories
  const instrumentCategories = {
    "Band / Pop / Function": ["saxophone", "guitar", "piano", "vocals", "bass", "drums", "dj", "keyboard", "synth", "singer-songwriter"],
    "Classical / Traditional": ["violin", "viola", "cello", "flute", "clarinet", "oboe", "harp"],
    "Brass / Jazz / Marching": ["trumpet", "trombone", "percussion"]
  };

  const { data: settings = {}, isLoading, error } = useQuery({
    queryKey: ["/api/settings"],
    retry: 1,
    onError: (error) => {
      console.error("Settings query error:", error);
    },
    onSuccess: (data) => {
      console.log("Settings query success:", data);
    }
  });

  const form = useForm<z.infer<typeof settingsFormSchema>>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      businessName: "",
      businessEmail: "",
      businessAddress: "",
      phone: "",
      website: "",
      taxNumber: "",
      bankDetails: "",
      defaultTerms: "",
      emailFromName: "",
      nextInvoiceNumber: 256,
      gigTypes: "",
      eventTypes: "",
      instrumentsPlayed: "",
      customInstruments: "",
    },
  });

  // Update form when settings data loads
  React.useEffect(() => {
    if (settings && Object.keys(settings).length > 0) {
      // Reset form with loaded settings
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
          // Convert gigTypes to newline-separated string for form display
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
          // Try to parse as JSON first
          gigTypesArray = JSON.parse(settings.gigTypes);
        } catch (e) {
          // If JSON parsing fails, treat as newline-separated string
          gigTypesArray = settings.gigTypes.split('\n').filter(Boolean);
        }
      }
      setGigTypes(gigTypesArray);
      
      // Load selected instruments from instrumentsPlayed field
      let selectedInstrumentsFromDB = [];
      if (settings.instrumentsPlayed) {
        try {
          selectedInstrumentsFromDB = JSON.parse(settings.instrumentsPlayed);
        } catch (e) {
          // If JSON parsing fails, treat as newline-separated string
          selectedInstrumentsFromDB = settings.instrumentsPlayed.split('\n').filter(Boolean);
        }
      }
      
      // Load custom instruments from customInstruments field
      let customInstrumentsFromDB = [];
      if (settings.customInstruments) {
        try {
          customInstrumentsFromDB = JSON.parse(settings.customInstruments);
        } catch (e) {
          // If JSON parsing fails, treat as newline-separated string
          customInstrumentsFromDB = settings.customInstruments.split('\n').filter(Boolean);
        }
      }
      
      setSelectedInstruments(selectedInstrumentsFromDB);
      setCustomInstruments(customInstrumentsFromDB);
      
      // Initialize form with actual instrument data
      form.setValue('instrumentsPlayed', JSON.stringify(selectedInstrumentsFromDB));
      form.setValue('customInstruments', JSON.stringify(customInstrumentsFromDB));
      
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
      
      // Mark as initialized so auto-population can run
      setHasInitialized(true);
    }
  }, [settings, form]);

  // Helper functions for tag management
  const addEventType = () => {
    if (newEventType.trim() && !eventTypes.includes(newEventType.trim())) {
      const updatedTypes = [...eventTypes, newEventType.trim()];
      setEventTypes(updatedTypes);
      form.setValue('eventTypes', updatedTypes.join('\n'));
      setNewEventType("");
    }
  };

  const removeEventType = (typeToRemove: string) => {
    const updatedTypes = eventTypes.filter(type => type !== typeToRemove);
    setEventTypes(updatedTypes);
    form.setValue('eventTypes', updatedTypes.join('\n'));
  };

  const addGigType = () => {
    if (newGigType.trim() && !gigTypes.includes(newGigType.trim())) {
      const updatedTypes = [...gigTypes, newGigType.trim()];
      setGigTypes(updatedTypes);
      form.setValue('gigTypes', updatedTypes.join('\n'));
      setNewGigType("");
    }
  };

  const removeGigType = (typeToRemove: string) => {
    const updatedTypes = gigTypes.filter(type => type !== typeToRemove);
    setGigTypes(updatedTypes);
    form.setValue('gigTypes', updatedTypes.join('\n'));
  };

  // Handle instrument selection
  const handleInstrumentChange = (instrument: string, checked: boolean) => {
    let updatedInstruments;
    if (checked) {
      updatedInstruments = [...selectedInstruments, instrument];
    } else {
      updatedInstruments = selectedInstruments.filter(i => i !== instrument);
    }
    setSelectedInstruments(updatedInstruments);
    
    // ✅ KEY FIX: Update form state with selected instruments only
    form.setValue('instrumentsPlayed', JSON.stringify(updatedInstruments), {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true
    });
    
    console.log('🎸 Updated instruments via checkbox:', updatedInstruments);
  };

  const addCustomInstrument = () => {
    if (newInstrument.trim() && !customInstruments.includes(newInstrument.trim())) {
      const instrument = newInstrument.trim();
      
      // Update local state
      const newCustomInstruments = [...customInstruments, instrument];
      const newSelectedInstruments = [...selectedInstruments, instrument];
      
      setCustomInstruments(newCustomInstruments);
      setSelectedInstruments(newSelectedInstruments);
      
      // Update form values to be saved to database
      form.setValue('customInstruments', JSON.stringify(newCustomInstruments));
      form.setValue('instrumentsPlayed', JSON.stringify(newSelectedInstruments));
      
      setNewInstrument("");
    }
  };

  const removeCustomInstrument = (instrument: string) => {
    // Update local state
    const newCustomInstruments = customInstruments.filter(i => i !== instrument);
    const newSelectedInstruments = selectedInstruments.filter(i => i !== instrument);
    
    setCustomInstruments(newCustomInstruments);
    setSelectedInstruments(newSelectedInstruments);
    
    // Update form values to be saved to database
    form.setValue('customInstruments', JSON.stringify(newCustomInstruments));
    form.setValue('instrumentsPlayed', JSON.stringify(newSelectedInstruments));
  };

  // Debug function to trace form state
  const debugFormState = () => {
    console.log('🔥 DEBUG BUTTON CLICKED!');
    alert('Debug button clicked! Check the console for details.');
    
    try {
      const formData = form.getValues();
      console.log('🔍 Debug Form State:');
      console.log('📝 Current form data:', formData);
      console.log('🎸 instrumentsPlayed field:', formData.instrumentsPlayed);
      console.log('🎵 gigTypes field:', formData.gigTypes);
      console.log('🔄 Form state:', form.formState);
      console.log('💾 Selected instruments (UI):', selectedInstruments);
      console.log('🎯 Custom instruments (UI):', customInstruments);
      console.log('🎮 New instrument input:', newInstrument);
      
      // Add database debugging
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
      console.log('🎪 Gig types state:', gigTypes);
    } catch (error) {
      console.error('❌ Error in debug function:', error);
      alert('Error in debug function: ' + error.message);
    }
  };

  // Test function to add a custom instrument
  const testAddCustomInstrument = () => {
    console.log('🧪 Testing add custom instrument...');
    setNewInstrument('Test Harmonica');
    setTimeout(() => {
      addCustomInstrument();
    }, 100);
  };



  // Default gig type mappings for known instruments
  const defaultGigMappings: { [key: string]: string[] } = {
    'saxophone': ['Wedding Ceremony Music', 'Jazz Club Performance', 'Corporate Event Entertainment', 'Function Band', 'Sax + DJ', 'Wedding Reception', 'Private Party'],
    'guitar': ['Acoustic Wedding Ceremony', 'Spanish Guitar', 'Classical Guitar', 'Folk Music', 'Singer-Songwriter', 'Acoustic Duo', 'Background Music'],
    'piano': ['Piano Bar', 'Wedding Ceremony', 'Classical Recital', 'Jazz Piano', 'Cocktail Piano', 'Restaurant Background', 'Solo Piano'],
    'vocals': ['Wedding Singer', 'Jazz Vocalist', 'Corporate Entertainment', 'Function Band Vocals', 'Solo Vocalist', 'Tribute Acts', 'Karaoke Host'],
    'dj': ['Wedding DJ', 'Corporate Event DJ', 'Party DJ', 'Club DJ', 'Mobile DJ', 'Sax + DJ', 'Event DJ'],
    'violin': ['Wedding Ceremony', 'String Quartet', 'Classical Performance', 'Folk Violin', 'Electric Violin', 'Background Music', 'Solo Violin'],
    'trumpet': ['Jazz Band', 'Big Band', 'Wedding Fanfare', 'Classical Trumpet', 'Brass Ensemble', 'Mariachi Band', 'Military Ceremony'],
    'drums': ['Function Band', 'Jazz Ensemble', 'Rock Band', 'Wedding Band', 'Corporate Event Band', 'Percussion Solo', 'Session Musician'],
    'bass': ['Function Band', 'Jazz Ensemble', 'Wedding Band', 'Corporate Event Band', 'Session Musician', 'Acoustic Bass', 'Electric Bass'],
    'keyboard': ['Function Band', 'Wedding Ceremony', 'Jazz Piano', 'Corporate Entertainment', 'Solo Keyboard', 'Accompanist', 'Session Musician'],
    'cello': ['Wedding Ceremony', 'String Quartet', 'Classical Performance', 'Solo Cello', 'Chamber Music', 'Background Music', 'Church Music'],
    'flute': ['Wedding Ceremony', 'Classical Performance', 'Jazz Flute', 'Folk Music', 'Solo Flute', 'Wind Ensemble', 'Background Music'],
    'harp': ['Wedding Ceremony', 'Classical Harp', 'Celtic Harp', 'Background Music', 'Solo Harp', 'Church Music', 'Private Events'],
    'trombone': ['Jazz Band', 'Big Band', 'Brass Ensemble', 'Wedding Fanfare', 'Classical Trombone', 'Mariachi Band', 'Military Ceremony'],
    'clarinet': ['Jazz Ensemble', 'Classical Performance', 'Wedding Ceremony', 'Folk Music', 'Solo Clarinet', 'Wind Ensemble', 'Background Music']
  };

  // Update gig types based on instrument selection (no auto-save)
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

  // ✅ Auto-populate gig types when instruments change
  React.useEffect(() => {
    if (hasInitialized && selectedInstruments.length > 0) {
      updateGigTypesFromInstruments();
    }
  }, [selectedInstruments, hasInitialized]);

  const saveSettingsMutation = useMutation({
    mutationFn: async (data: z.infer<typeof settingsFormSchema>) => {
      console.log('🚀 SAVE MUTATION: Starting save with data:', JSON.stringify(data, null, 2));
      console.log('🎯 SAVE MUTATION: customInstruments field:', data.customInstruments);
      console.log('🎸 SAVE MUTATION: instrumentsPlayed field:', data.instrumentsPlayed);
      
      // Use direct fetch to bypass middleware issues like invoices
      const result = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!result.ok) {
        const errorText = await result.text();
        console.error('❌ SAVE MUTATION: HTTP Error:', result.status, errorText);
        throw new Error(`HTTP ${result.status}: ${errorText}`);
      }
      
      const responseData = await result.json();
      console.log('🎉 SAVE MUTATION: Save completed successfully');
      return responseData;
    },
    onSuccess: () => {
      console.log('✅ SAVE MUTATION: Success handler called');
      toast({
        title: "Settings saved",
        description: "Your business settings have been updated successfully.",
      });
      // Invalidate all settings-related caches so forms refresh with new data
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      // Force refetch settings data to update all components that depend on it
      queryClient.refetchQueries({ queryKey: ["/api/settings"] });
    },
    onError: (error) => {
      console.error('❌ SAVE MUTATION: Error occurred:', error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    },
  });



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
    
    // ✅ KEY FIX: Use form data for instruments
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
      customInstruments: customInstrumentsString // ✅ Use form data not state
    };
    
    console.log('🚀 FORM SUBMIT: Final data for API:', JSON.stringify(updatedData, null, 2));
    saveSettingsMutation.mutate(updatedData);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading settings...</div>
        </div>
      </div>
    );
  }

  if (error) {
    // Check if it's an authentication error
    const isAuthError = error.message?.includes('authentication failed') || 
                       error.message?.includes('401') || 
                       error.message?.includes('User authentication failed');
    
    if (isAuthError) {
      return (
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-amber-600 mb-2">Authentication Required</h2>
              <p className="text-gray-600 mb-4">Please log in to access your settings.</p>
              <Button 
                onClick={() => window.location.href = '/api/auth/login'} 
                className="mt-4"
                variant="default"
              >
                Log In
              </Button>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-red-600 mb-2">Something went wrong</h2>
            <p className="text-gray-600">The application encountered an error. Please try refreshing the page.</p>
            <Button 
              onClick={() => window.location.reload()} 
              className="mt-4"
              variant="outline"
            >
              Refresh Page
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile menu toggle */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSidebarOpen(true)}
          className="bg-card shadow-lg"
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="md:ml-64 min-h-screen">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="flex items-center gap-3 mb-8">
            <SettingsIcon className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Business Settings</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Configure your business details for contracts and invoices
              </p>
            </div>
          </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Business Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Business Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="businessName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your Music Services" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="businessEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="your@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="businessAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Address</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="123 Music Street&#10;City, County&#10;Postcode"
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Phone Number
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="+44 1234 567890" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Website
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="https://yourmusic.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Financial Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Financial Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="taxNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax/VAT Number</FormLabel>
                    <FormControl>
                      <Input placeholder="GB123456789" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <FormLabel className="text-base font-medium">Bank Details for Invoices</FormLabel>
                <div className="mt-2 border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <tbody>
                      <tr className="border-b">
                        <td className="px-3 py-2 bg-muted/50 font-medium text-sm w-32">Bank Name</td>
                        <td className="px-3 py-2">
                          <Input 
                            placeholder="Your Bank"
                            value={bankDetails.bankName}
                            onChange={(e) => setBankDetails(prev => ({ ...prev, bankName: e.target.value }))}
                            className="border-0 focus-visible:ring-0 p-0 h-auto"
                          />
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="px-3 py-2 bg-muted/50 font-medium text-sm">Account Name</td>
                        <td className="px-3 py-2">
                          <Input 
                            placeholder="Your Business Name"
                            value={bankDetails.accountName}
                            onChange={(e) => setBankDetails(prev => ({ ...prev, accountName: e.target.value }))}
                            className="border-0 focus-visible:ring-0 p-0 h-auto"
                          />
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="px-3 py-2 bg-muted/50 font-medium text-sm">Sort Code</td>
                        <td className="px-3 py-2">
                          <Input 
                            placeholder="12-34-56"
                            value={bankDetails.sortCode}
                            onChange={(e) => setBankDetails(prev => ({ ...prev, sortCode: e.target.value }))}
                            className="border-0 focus-visible:ring-0 p-0 h-auto"
                          />
                        </td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 bg-muted/50 font-medium text-sm">Account Number</td>
                        <td className="px-3 py-2">
                          <Input 
                            placeholder="12345678"
                            value={bankDetails.accountNumber}
                            onChange={(e) => setBankDetails(prev => ({ ...prev, accountNumber: e.target.value }))}
                            className="border-0 focus-visible:ring-0 p-0 h-auto"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contract Terms */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Default Contract Terms
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="defaultTerms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Standard Terms and Conditions</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter your standard terms and conditions that will appear on contracts..."
                        className="min-h-[120px]"
                        {...field} 
                      />
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => {
                            const professionalTerms = `PROFESSIONAL PERFORMANCE AGREEMENT

This agreement is made between the performer and client for professional musical services.

PERFORMANCE DETAILS:
- Performance shall be delivered professionally and punctually
- Setup and sound check time as agreed
- Equipment and technical requirements as specified
- Dress code and professional appearance standards maintained

TERMS & CONDITIONS:
- Payment due on date of performance unless otherwise agreed
- Cancellation policy: 30+ days = deposit refund minus admin fee, <30 days = full fee due
- Equipment remains property of performer, not available for third-party use
- Venue must provide safe electrical supply and security
- No recording without written consent
- Performance rider (if any) forms part of this agreement
- Safe, harassment-free working environment required

This agreement is governed by the laws of England and Wales.`;
                            
                            form.setValue('defaultTerms', professionalTerms);
                          }}
                          className="text-sm text-blue-600 hover:text-blue-800 underline"
                        >
                          Load Professional Template (Based on Musicians' Union Standards)
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Email Settings */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
                <Mail className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <CardTitle>Email Settings</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Customize how your emails appear to clients
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="emailFromName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email From Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Sarah Johnson Music, DJ Mike Events"
                        {...field}
                      />
                    </FormControl>
                    <p className="text-sm text-muted-foreground">
                      This name will appear in the "From" field when clients receive your contracts and invoices
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="nextInvoiceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Next Invoice Number Override</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="256"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <p className="text-sm text-muted-foreground">
                      The next invoice will use this number (formatted as 5 digits, e.g., 00256). Change this to sync with external systems or correct the sequence.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Performance Configuration */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Performance Configuration</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Configure your performance types and available services
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="eventTypes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Available Event Types</FormLabel>
                    <div className="space-y-3">
                      {/* Add new event type */}
                      <div className="flex gap-2">
                        <Input
                          placeholder="e.g., Wedding, Corporate Event, Private Party"
                          value={newEventType}
                          onChange={(e) => setNewEventType(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addEventType();
                            }
                          }}
                        />
                        <Button
                          type="button"
                          onClick={addEventType}
                          size="sm"
                          className="flex items-center gap-1"
                        >
                          <Plus className="h-4 w-4" />
                          Add
                        </Button>
                      </div>
                      
                      {/* Display existing event types as tags */}
                      {eventTypes.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {eventTypes.map((type, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-3 py-1 rounded-full text-sm"
                            >
                              <span>{type}</span>
                              <button
                                type="button"
                                onClick={() => removeEventType(type)}
                                className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Add event types that will appear in the "Event Type" dropdown when creating enquiries.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gigTypes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Available Gig Types</FormLabel>
                    <div className="space-y-3">
                      {/* Instrument Selection for Auto-Population */}
                      <div className="border rounded-lg p-4 bg-muted/20">
                        <div className="flex items-center gap-2 mb-3">
                          <Music className="h-4 w-4 text-purple-600" />
                          <h4 className="font-medium text-sm">What Do You Play?</h4>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Select instruments you play to automatically populate gig types below
                        </p>
                        
                        {/* Instrument Selection */}
                        <div className="space-y-3">
                          {Object.entries(instrumentCategories).map(([category, instruments]) => (
                            <div key={category} className="space-y-2">
                              <h5 className="font-medium text-xs text-muted-foreground uppercase tracking-wide">{category}</h5>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {instruments.map((instrument) => (
                                  <div key={instrument} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={instrument}
                                      checked={selectedInstruments.includes(instrument)}
                                      onCheckedChange={(checked) => 
                                        handleInstrumentChange(instrument, checked as boolean)
                                      }
                                    />
                                    <label
                                      htmlFor={instrument}
                                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize"
                                    >
                                      {instrument.replace('-', ' ')}
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Custom Instrument Addition */}
                        <div className="space-y-2 mt-4">
                          <h5 className="font-medium text-sm">Add Custom Instrument</h5>
                          <div className="flex gap-2">
                            <Input
                              placeholder="e.g., Harmonica, Bagpipes, etc."
                              value={newInstrument}
                              onChange={(e) => setNewInstrument(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  addCustomInstrument();
                                }
                              }}
                            />
                            <Button
                              type="button"
                              onClick={addCustomInstrument}
                              size="sm"
                              className="flex items-center gap-1"
                            >
                              <Plus className="h-4 w-4" />
                              Add
                            </Button>
                          </div>
                        </div>

                        {/* Display custom instruments with checkboxes */}
                        {customInstruments.length > 0 && (
                          <div className="space-y-2 mt-3">
                            <h5 className="font-medium text-xs text-muted-foreground uppercase tracking-wide">Custom Instruments</h5>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {customInstruments.map((instrument) => (
                                <div key={instrument} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={instrument}
                                    checked={selectedInstruments.includes(instrument)}
                                    onCheckedChange={(checked) => 
                                      handleInstrumentChange(instrument, checked as boolean)
                                    }
                                  />
                                  <label
                                    htmlFor={instrument}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize"
                                  >
                                    {instrument}
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => removeCustomInstrument(instrument)}
                                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 ml-auto"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {selectedInstruments.length > 0 && (
                          <p className="text-sm text-green-600 dark:text-green-400 mt-3">
                            ✓ Gig types will be automatically added based on your instrument selection
                          </p>
                        )}
                      </div>
                      
                      {/* Manual Add new gig type */}
                      <div className="space-y-2">
                        <h5 className="font-medium text-sm">Add Additional Gig Types</h5>
                        <div className="flex gap-2">
                          <Input
                            placeholder="e.g., Saxophone Solo, DJ Set, Sax + DJ, Band Performance"
                            value={newGigType}
                            onChange={(e) => setNewGigType(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addGigType();
                              }
                            }}
                          />
                          <Button
                            type="button"
                            onClick={addGigType}
                            size="sm"
                            className="flex items-center gap-1"
                          >
                            <Plus className="h-4 w-4" />
                            Add
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Add any custom gig types not covered by your instrument selections above.
                        </p>
                      </div>
                      
                      {/* Display existing gig types as tags */}
                      {gigTypes.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {gigTypes.map((type, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm"
                            >
                              <span>{type}</span>
                              <button
                                type="button"
                                onClick={() => removeGigType(type)}
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Add gig types that will appear in the "Gig Type" dropdown when creating enquiries. Types are automatically added based on your instrument selection above.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-between">
            <Button 
              type="button" 
              onClick={debugFormState}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              Debug Form State
            </Button>
            <Button 
              type="submit" 
              size="lg"
              disabled={saveSettingsMutation.isPending}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saveSettingsMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </form>
      </Form>
        </div>
      </div>

      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  );
}