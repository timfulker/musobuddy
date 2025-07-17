import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { useResponsive } from "@/hooks/useResponsive";
import { Building, Save, MapPin, Globe, Hash, CreditCard, Music, Settings as SettingsIcon, X, Plus, Search, Loader2, Menu } from "lucide-react";

// Core instruments displayed by default
const CORE_INSTRUMENTS = [
  "Piano", "Bass Guitar", "Guitar", "Drums", "Saxophone", "Violin", "Flute", "Vocals", "DJ"
];

// Comprehensive instrument database from CSV (available through search)
const ALL_INSTRUMENTS = [
  "Violin", "Viola", "Cello", "Double Bass", "Harp", "Classical Guitar", "Acoustic Guitar", 
  "Electric Guitar", "Bass Guitar", "Banjo", "Mandolin", "Ukulele", "Zither", "Sitar", 
  "Shamisen", "Erhu", "Koto", "Sarod", "Oud", "Balalaika", "Flute", "Piccolo", "Recorder", 
  "Oboe", "English Horn", "Clarinet", "Bass Clarinet", "Bassoon", "Contrabassoon", 
  "Alto Saxophone", "Tenor Saxophone", "Baritone Saxophone", "Soprano Saxophone", 
  "Pan Flute", "Shakuhachi", "Dizi", "Ney", "Bansuri", "Didgeridoo", "Trumpet", "Cornet", 
  "Flugelhorn", "Trombone", "Bass Trombone", "French Horn", "Tuba", "Sousaphone", 
  "Euphonium", "Alto Horn", "Baritone Horn", "Bugle", "Piano", "Grand Piano", 
  "Upright Piano", "Electric Piano", "Organ", "Pipe Organ", "Harmonium", "Harpsichord", 
  "Clavichord", "Celesta", "Synthesizer", "Digital Keyboard", "Keytar", "Timpani", 
  "Xylophone", "Glockenspiel", "Marimba", "Vibraphone", "Tubular Bells", "Steel Drums", 
  "Crotales", "Snare Drum", "Bass Drum", "Cymbals", "Tambourine", "Triangle", "Castanets", 
  "Woodblock", "Guiro", "Claves", "Cowbell", "Djembe", "Bongo Drums", "Conga Drums", 
  "Tabla", "Cajón", "Agogo Bells", "Shekere", "Frame Drum", "Tabor", "Talking Drum", 
  "Drum Machine", "Turntables", "Loop Station", "Modular Synth", "Theremin", "Lead Vocals", 
  "Backing Vocals", "Beatboxing", "Overtone Singing", "Chanting", "Rebab", "Hardanger Fiddle", 
  "Nyckelharpa", "Kamancheh", "Qanun", "Guzheng", "Yangqin", "Veena", "Pipa", "Domra", 
  "Bagpipes", "Uilleann Pipes", "Sheng", "Hulusi", "Zurna", "Suona", "Accordion", 
  "Concertina", "Melodica", "Jew's Harp", "Glass Harmonica", "Waterphone", "Hang Drum", 
  "Kalimba", "Music Box", "Singing Bowl", "Rainstick", "DJ", "Vocals"
];

// Schema for form validation - only includes actual form fields
const settingsFormSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  businessEmail: z.string().min(1, "Business email is required").email("Please enter a valid email address"),
  businessAddress: z.string().optional().or(z.literal("")), // Legacy field for backward compatibility
  addressLine1: z.string().min(1, "Address line 1 is required"),
  addressLine2: z.string().optional().or(z.literal("")),
  city: z.string().min(1, "City is required"),
  county: z.string().optional().or(z.literal("")),
  postcode: z.string().min(1, "Postcode is required"),
  phone: z.string().min(1, "Phone number is required"),
  website: z.string().optional().or(z.literal("")),
  taxNumber: z.string().optional().or(z.literal("")),
  emailFromName: z.string().min(1, "Email from name is required"),
  nextInvoiceNumber: z.coerce.number().min(1, "Next invoice number is required"),
  defaultTerms: z.string().optional().or(z.literal("")),
  bankDetails: z.string().optional().or(z.literal("")),
  // Remove selectedInstruments and gigTypes from schema since they're managed separately
});

type SettingsFormData = z.infer<typeof settingsFormSchema>;

// Enhanced gig suggestions with AI
const generateGigSuggestions = async (instruments: string[]): Promise<string[]> => {
  try {
    const response = await fetch('/api/gig-suggestions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ instruments }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch gig suggestions');
    }

    const data = await response.json();
    return data.suggestions || [];
  } catch (error) {
    console.error('Error generating gig suggestions:', error);
    return [];
  }
};

// API function for fetching settings
const fetchSettings = async (): Promise<SettingsFormData> => {
  const response = await fetch('/api/settings');
  
  if (!response.ok) {
    throw new Error('Failed to fetch settings');
  }
  
  const data = await response.json();
  
  // Parse stringified JSON fields
  let parsedInstruments = [];
  let parsedGigTypes = [];
  
  try {
    if (data.selectedInstruments && typeof data.selectedInstruments === 'string') {
      parsedInstruments = JSON.parse(data.selectedInstruments);
    } else if (Array.isArray(data.selectedInstruments)) {
      parsedInstruments = data.selectedInstruments;
    }
  } catch (e) {
    console.warn('Failed to parse selectedInstruments:', e);
  }
  
  try {
    if (data.gigTypes && typeof data.gigTypes === 'string') {
      // Handle both array format and PostgreSQL set format
      if (data.gigTypes.startsWith('[')) {
        parsedGigTypes = JSON.parse(data.gigTypes);
      } else if (data.gigTypes.startsWith('{')) {
        // PostgreSQL set format: {"item1","item2","item3"}
        parsedGigTypes = data.gigTypes.slice(1, -1).split(',').map(item => item.replace(/"/g, ''));
      }
    } else if (Array.isArray(data.gigTypes)) {
      parsedGigTypes = data.gigTypes;
    }
  } catch (e) {
    console.warn('Failed to parse gigTypes:', e);
  }
  
  // Transform the data to match the expected form structure
  return {
    businessName: data.businessName || "",
    businessAddress: data.businessAddress || "",
    phone: data.phone || "",
    website: data.website || "",
    taxNumber: data.taxNumber || "",
    emailFromName: data.emailFromName || "",
    nextInvoiceNumber: data.nextInvoiceNumber || 1,
    defaultTerms: data.defaultTerms || "",
    bankDetails: data.bankDetails || "",
    selectedInstruments: parsedInstruments,
    gigTypes: parsedGigTypes,
  };
};

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isMobile } = useResponsive();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // State for instrument selection
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);
  const [gigTypes, setGigTypes] = useState<string[]>([]);
  const [instrumentSearch, setInstrumentSearch] = useState("");
  const [isGeneratingGigTypes, setIsGeneratingGigTypes] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [customInstrument, setCustomInstrument] = useState("");
  const [customGig, setCustomGig] = useState("");
  const [showInstrumentInput, setShowInstrumentInput] = useState(false);
  const [showGigInput, setShowGigInput] = useState(false);
  
  // Track if form has been modified
  const [hasChanges, setHasChanges] = useState(false);
  const [initialData, setInitialData] = useState<any>(null);

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      businessName: "",
      businessEmail: "",
      businessAddress: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      county: "",
      postcode: "",
      phone: "",
      website: "",
      taxNumber: "",
      emailFromName: "",
      nextInvoiceNumber: 1,
      defaultTerms: "",
      bankDetails: "",
    },
  });

  // Load existing settings data
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: fetchSettings,
    select: (data) => {
      console.log('Settings data loaded:', data);
      return data;
    },
  });

  // Load global gig types separately
  const { data: globalGigTypes } = useQuery({
    queryKey: ['global-gig-types'],
    queryFn: async () => {
      const response = await fetch('/api/global-gig-types');
      if (!response.ok) {
        return [];
      }
      const data = await response.json();
      return data.gigTypes || [];
    },
  });

  // Update local state when settings are loaded
  useEffect(() => {
    if (settings && !saveSettings.isPending) {
      console.log('🔄 Updating form with settings:', settings);
      console.log('🔄 selectedInstruments from settings:', settings.selectedInstruments);
      console.log('🔄 gigTypes from settings:', settings.gigTypes);
      console.log('🔄 hasChanges before update:', hasChanges);
      
      // Only update form if we don't have pending changes
      if (!hasChanges || saveSettings.isSuccess) {
        form.reset(settings);
        setSelectedInstruments(settings.selectedInstruments || []);
        
        // Use global gig types if available, otherwise use settings gig types
        const gigTypesToUse = globalGigTypes && globalGigTypes.length > 0 ? globalGigTypes : (settings.gigTypes || []);
        setGigTypes(gigTypesToUse);
        
        // Store initial data for comparison
        setInitialData({
          ...settings,
          selectedInstruments: settings.selectedInstruments || [],
          gigTypes: gigTypesToUse
        });
        
        // Reset hasChanges flag since we're loading fresh data
        console.log('🔄 Resetting hasChanges to false');
        setHasChanges(false);
      }
    }
  }, [settings, globalGigTypes, form, saveSettings.isPending, saveSettings.isSuccess, hasChanges]);

  // Watch for form changes
  useEffect(() => {
    const subscription = form.watch(() => {
      if (initialData) {
        setHasChanges(true);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, initialData]);

  // Watch for instrument/gig type changes
  useEffect(() => {
    if (initialData) {
      // Compare current state with initial data
      const currentInstruments = Array.isArray(selectedInstruments) ? selectedInstruments : [];
      const initialInstruments = Array.isArray(initialData.selectedInstruments) ? initialData.selectedInstruments : [];
      const currentGigTypes = Array.isArray(gigTypes) ? gigTypes : [];
      const initialGigTypes = Array.isArray(initialData.gigTypes) ? initialData.gigTypes : [];
      
      const instrumentsChanged = JSON.stringify(currentInstruments.sort()) !== JSON.stringify(initialInstruments.sort());
      const gigTypesChanged = JSON.stringify(currentGigTypes.sort()) !== JSON.stringify(initialGigTypes.sort());
      
      if (instrumentsChanged || gigTypesChanged) {
        console.log('🔄 Detected changes - instruments:', instrumentsChanged, 'gigTypes:', gigTypesChanged);
        setHasChanges(true);
      }
    }
  }, [selectedInstruments, gigTypes, initialData]);

  // Function to generate AI-powered gig types
  const generateGigTypes = async (instruments: string[]) => {
    if (!instruments.length) {
      setGigTypes([]);
      setAiSuggestions([]);
      return [];
    }
    
    setIsGeneratingGigTypes(true);
    try {
      const suggestions = await generateGigSuggestions(instruments);
      setAiSuggestions(suggestions);
      
      // Replace gig types with fresh suggestions based on current instruments
      setGigTypes(suggestions);
      
      return suggestions;
    } catch (error) {
      console.error('Error generating gig suggestions:', error);
      return [];
    } finally {
      setIsGeneratingGigTypes(false);
    }
  };

  // Handle instrument selection changes
  const handleInstrumentToggle = async (instrument: string) => {
    const newSelectedInstruments = selectedInstruments.includes(instrument)
      ? selectedInstruments.filter(i => i !== instrument)
      : [...selectedInstruments, instrument];
    
    setSelectedInstruments(newSelectedInstruments);
    
    // Auto-generate gig types when instruments are selected
    if (newSelectedInstruments.length > 0) {
      await generateGigTypes(newSelectedInstruments);
    }
  };

  // Add custom instrument
  const addCustomInstrument = () => {
    if (customInstrument && !selectedInstruments.includes(customInstrument)) {
      const newInstruments = [...selectedInstruments, customInstrument];
      setSelectedInstruments(newInstruments);
      setCustomInstrument("");
      setShowInstrumentInput(false);
      
      // Generate gig types for new instruments
      generateGigTypes(newInstruments);
    }
  };

  // Add custom gig type
  const addCustomGig = () => {
    const currentGigTypes = Array.isArray(gigTypes) ? gigTypes : [];
    if (customGig && !currentGigTypes.includes(customGig)) {
      setGigTypes([...currentGigTypes, customGig]);
      setCustomGig("");
      setShowGigInput(false);
    }
  };

  // Remove gig type
  const removeGigType = (gigType: string) => {
    const currentGigTypes = Array.isArray(gigTypes) ? gigTypes : [];
    setGigTypes(currentGigTypes.filter(g => g !== gigType));
  };

  // Filter instruments based on search - show core instruments by default, all instruments when searching
  const filteredInstruments = instrumentSearch.trim() 
    ? ALL_INSTRUMENTS.filter(instrument =>
        instrument.toLowerCase().includes(instrumentSearch.toLowerCase())
      )
    : CORE_INSTRUMENTS;

  // Save settings function
  const saveSettings = useMutation({
    mutationFn: async (data: SettingsFormData) => {
      // Include selected instruments and gig types in the saved data
      const settingsData = {
        ...data,
        selectedInstruments: Array.isArray(selectedInstruments) ? selectedInstruments : [],
        gigTypes: Array.isArray(gigTypes) ? gigTypes : [],
      };
      
      console.log('Saving settings:', settingsData);
      
      // Make actual API call to save settings
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settingsData),
      });
      
      console.log('Save response status:', response.status);
      console.log('Save response ok:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Save error response:', errorText);
        throw new Error(`Failed to save settings: ${response.status} ${errorText}`);
      }
      
      const result = await response.json();
      console.log('Save result:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('✅ Settings saved successfully:', data);
      setHasChanges(false);
      toast({
        title: "Success",
        description: "Settings saved successfully!",
      });
      
      // Update the form with the saved data immediately
      form.reset(data);
      setSelectedInstruments(data.selectedInstruments || []);
      setGigTypes(data.gigTypes || []);
      
      // Store the new data as initial data for comparison
      setInitialData({
        ...data,
        selectedInstruments: data.selectedInstruments || [],
        gigTypes: data.gigTypes || []
      });
      
      // Then invalidate queries to refresh from server
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['global-gig-types'] });
    },
    onError: (error) => {
      console.error('❌ Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SettingsFormData) => {
    console.log('🚀 Form submitted with data:', data);
    console.log('🚀 hasChanges:', hasChanges);
    console.log('🚀 selectedInstruments:', selectedInstruments);
    console.log('🚀 gigTypes:', gigTypes);
    console.log('🚀 saveSettings.isPending:', saveSettings.isPending);
    
    if (!hasChanges) {
      console.log('🚀 No changes detected, skipping save');
      return;
    }
    
    // Add the selected instruments and gig types to the form data
    const formDataWithInstruments = {
      ...data,
      selectedInstruments: selectedInstruments,
      gigTypes: gigTypes,
    };
    
    console.log('🚀 Final form data being sent:', formDataWithInstruments);
    saveSettings.mutate(formDataWithInstruments);
  };

  if (settingsLoading) {
    return (
      <div className="min-h-screen bg-background layout-consistent">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background layout-consistent">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <MobileNav />
      
      <div className="main-content">
        {/* Header */}
        <header className="border-b border-gray-200 dark:border-slate-700 p-6 bg-gradient-to-r from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 shadow-sm md:hidden transition-all"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent ml-12 md:ml-0">
                Settings
              </h1>
            </div>
          </div>
        </header>

        {/* Settings Content */}
        <div className="p-6 space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Add a debug div to see if form is working */}
              <div className="hidden">
                Form status: {JSON.stringify({ hasChanges, isPending: saveSettings.isPending })}
              </div>
              
              {/* Business Information */}
              <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
                <CardHeader className="border-b border-gray-100 dark:border-slate-700 pb-4">
                  <CardTitle className="flex items-center space-x-2 text-lg">
                    <Building className="w-5 h-5 text-purple-600" />
                    <span>Business Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="businessName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Business Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Your Business Name" />
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
                          <FormLabel className="text-sm font-medium">Business Email</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="business@example.com" type="email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Phone</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="+44 (0) 123 456 7890" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="emailFromName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Email From Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Your Name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Business Address - Separate Fields */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                      <MapPin className="w-4 h-4 mr-2" />
                      Business Address
                    </h3>
                    
                    <FormField
                      control={form.control}
                      name="addressLine1"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Address Line 1</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="123 Main Street" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="addressLine2"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Address Line 2 (Optional)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Apartment, suite, etc." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">City</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="London" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="county"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">County (Optional)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Greater London" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="postcode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">Postcode</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="SW1A 1AA" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Website</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="https://yourwebsite.com" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="taxNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Tax Number</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="TAX123456" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Instruments & Gig Types */}
              <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
                <CardHeader className="border-b border-gray-100 dark:border-slate-700 pb-4">
                  <CardTitle className="flex items-center space-x-2 text-lg">
                    <Music className="w-5 h-5 text-purple-600" />
                    <span>Instruments & AI-Powered Gig Types</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  
                  {/* Instruments Section */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Your Instruments</h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowInstrumentInput(!showInstrumentInput)}
                        className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0 hover:shadow-lg"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Custom
                      </Button>
                    </div>
                    
                    {/* Search Instruments */}
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="Search 120+ instruments (showing core instruments by default)..."
                        className="pl-10"
                        value={instrumentSearch}
                        onChange={(e) => setInstrumentSearch(e.target.value)}
                      />
                    </div>
                    
                    {/* Custom Instrument Input */}
                    {showInstrumentInput && (
                      <div className="flex gap-2 mb-4">
                        <Input
                          type="text"
                          placeholder="Enter custom instrument"
                          value={customInstrument}
                          onChange={(e) => setCustomInstrument(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && addCustomInstrument()}
                        />
                        <Button
                          type="button"
                          onClick={addCustomInstrument}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Add
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowInstrumentInput(false)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                    
                    {/* Instruments Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-64 overflow-y-auto">
                      {filteredInstruments.map((instrument) => (
                        <div key={instrument} className="flex items-center space-x-2">
                          <Checkbox
                            id={instrument}
                            checked={selectedInstruments.includes(instrument)}
                            onCheckedChange={() => handleInstrumentToggle(instrument)}
                          />
                          <Label htmlFor={instrument} className="text-sm cursor-pointer">
                            {instrument}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Selected Instruments */}
                  {selectedInstruments.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Selected Instruments (click to remove):</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedInstruments.map((instrument) => (
                          <Badge 
                            key={instrument} 
                            variant="secondary" 
                            className="bg-purple-100 text-purple-800 cursor-pointer hover:bg-red-100 hover:text-red-800 transition-colors"
                            onClick={() => handleInstrumentToggle(instrument)}
                          >
                            {instrument} <X className="w-3 h-3 ml-1" />
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* AI Gig Generation */}
                  {selectedInstruments.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">AI-Generated Gig Types</h3>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => generateGigTypes(selectedInstruments)}
                          disabled={isGeneratingGigTypes}
                          className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0 hover:shadow-lg"
                        >
                          {isGeneratingGigTypes ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <SettingsIcon className="w-4 h-4 mr-2" />
                              Generate New
                            </>
                          )}
                        </Button>
                      </div>
                      
                      {/* AI Suggestions */}
                      {aiSuggestions.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-sm font-medium mb-2">Latest AI Suggestions (click to add):</h4>
                          <div className="flex flex-wrap gap-2">
                            {aiSuggestions.filter(suggestion => !Array.isArray(gigTypes) || !gigTypes.includes(suggestion)).map((suggestion, index) => (
                              <Badge
                                key={index}
                                variant="outline"
                                className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 text-purple-800 cursor-pointer hover:bg-purple-100 transition-colors"
                                onClick={() => {
                                  const currentGigTypes = Array.isArray(gigTypes) ? gigTypes : [];
                                  setGigTypes([...currentGigTypes, suggestion]);
                                }}
                              >
                                + {suggestion}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Current Gig Types */}
                      {Array.isArray(gigTypes) && gigTypes.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Your Gig Types (click to remove):</h4>
                          <div className="flex flex-wrap gap-2">
                            {gigTypes.map((gigType) => (
                              <Badge
                                key={gigType}
                                variant="secondary"
                                className="bg-blue-100 text-blue-800 cursor-pointer hover:bg-red-100 hover:text-red-800 transition-colors"
                                onClick={() => removeGigType(gigType)}
                              >
                                {gigType} <X className="w-3 h-3 ml-1" />
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Email Settings */}
              <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
                <CardHeader className="border-b border-gray-100 dark:border-slate-700 pb-4">
                  <CardTitle className="flex items-center space-x-2 text-lg">
                    <Globe className="w-5 h-5 text-purple-600" />
                    <span>Email Settings</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <FormField
                    control={form.control}
                    name="emailFromName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Email From Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Your Name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Invoice Settings */}
              <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
                <CardHeader className="border-b border-gray-100 dark:border-slate-700 pb-4">
                  <CardTitle className="flex items-center space-x-2 text-lg">
                    <Hash className="w-5 h-5 text-purple-600" />
                    <span>Invoice Settings</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <FormField
                    control={form.control}
                    name="nextInvoiceNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Next Invoice Number</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="00001" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="defaultTerms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Default Terms</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Payment due within 30 days" rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Bank Details */}
              <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
                <CardHeader className="border-b border-gray-100 dark:border-slate-700 pb-4">
                  <CardTitle className="flex items-center space-x-2 text-lg">
                    <CreditCard className="w-5 h-5 text-purple-600" />
                    <span>Bank Details</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <FormField
                    control={form.control}
                    name="bankDetails"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Bank Account Information</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Bank Name: Your Bank&#10;Account: 12345678&#10;Sort Code: 12-34-56" rows={4} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Save Button */}
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={saveSettings.isPending || !hasChanges}
                  onClick={(e) => {
                    console.log('🚀 BUTTON CLICKED!');
                    console.log('🚀 hasChanges:', hasChanges);
                    console.log('🚀 disabled:', saveSettings.isPending || !hasChanges);
                    console.log('🚀 form.formState.errors:', form.formState.errors);
                    // Don't prevent default - let the form submit naturally
                  }}
                  className={`px-8 py-2 border-0 transition-all duration-300 ${
                    hasChanges && !saveSettings.isPending
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:shadow-lg hover:scale-105'
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {saveSettings.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {hasChanges ? 'Save Settings' : 'No Changes'}
                    </>
                  )}
                </Button>

              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}