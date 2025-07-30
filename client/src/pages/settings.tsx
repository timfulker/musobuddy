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
import { Building, Save, MapPin, Globe, Hash, CreditCard, Music, Settings as SettingsIcon, X, Plus, Search, Loader2, Menu, Eye, ChevronDown, ChevronRight, Mail } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

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

// Theme configuration constants
const THEME_TEMPLATES = [
  { id: "classic", label: "Classic Business", description: "Professional and traditional invoice format" },
  { id: "modern", label: "Modern Creative", description: "Clean and contemporary design" },
  { id: "minimal", label: "Minimal Clean", description: "Simple and elegant style" },
];

const THEME_TONES = [
  { id: "professional", label: "Professional", description: "Formal business language" },
  { id: "friendly", label: "Friendly", description: "Warm and approachable tone" },
  { id: "creative", label: "Creative", description: "Musical and artistic language" },
];

const THEME_FONTS = [
  { id: "times", label: "Times New Roman", description: "Classic and professional" },
  { id: "arial", label: "Arial", description: "Clean and modern" },
  { id: "helvetica", label: "Helvetica", description: "Swiss design classic" },
  { id: "georgia", label: "Georgia", description: "Elegant serif font" },
  { id: "roboto", label: "Roboto", description: "Contemporary sans-serif" },
];

const THEME_COLORS = [
  "#673ab7", "#ff0066", "#00bcd4", "#4caf50", "#f44336", "#ff9800", "#9c27b0", "#3f51b5"
];

const CUSTOM_TITLES = [
  { id: "invoice", label: "Invoice" },
  { id: "performance-summary", label: "Performance Summary" },
  { id: "booking-confirmation", label: "Booking Confirmation" },
  { id: "gig-breakdown", label: "Gig Breakdown" },
  { id: "set-list-costs", label: "Set List & Costs" },
  { id: "showtime-receipt", label: "Showtime Receipt" },
  { id: "custom", label: "Custom Title" },
];

// Schema for form validation - includes all fields we want to save
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
  // Add the missing fields that we want to save
  selectedInstruments: z.array(z.string()).optional(),
  gigTypes: z.array(z.string()).optional(),
  // Theme preferences
  themeTemplate: z.string().optional(),
  themeTone: z.string().optional(),
  themeFont: z.string().optional(),
  themeAccentColor: z.string().optional(),
  themeLogoUrl: z.string().optional(),
  themeSignatureUrl: z.string().optional(),
  themeBanner: z.string().optional(),
  themeShowSetlist: z.boolean().optional(),
  themeShowRiderNotes: z.boolean().optional(),
  themeShowQrCode: z.boolean().optional(),
  themeShowTerms: z.boolean().optional(),
  themeCustomTitle: z.string().optional(),
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
      credentials: 'include',
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
  const response = await fetch('/api/settings', {
    credentials: 'include', // Important for session-based auth
  });
  
  
  
  if (!response.ok) {
    console.error('🔥 Settings API error:', response.status, response.statusText);
    throw new Error(`Failed to fetch settings: ${response.status}`);
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
  
  // Transform the data to match the expected form structure - include ALL fields
  return {
    businessName: data.businessName || "",
    businessEmail: data.businessEmail || "",  // Added missing field
    businessAddress: data.businessAddress || "",
    addressLine1: data.addressLine1 || "",    // Added missing field
    addressLine2: data.addressLine2 || "",    // Added missing field
    city: data.city || "",                    // Added missing field
    county: data.county || "",                // Added missing field
    postcode: data.postcode || "",            // Added missing field
    phone: data.phone || "",
    website: data.website || "",
    taxNumber: data.taxNumber || "",
    emailFromName: data.emailFromName || "",
    nextInvoiceNumber: data.nextInvoiceNumber || 1,
    defaultTerms: data.defaultTerms || "",
    bankDetails: data.bankDetails || "",
    selectedInstruments: parsedInstruments,
    gigTypes: parsedGigTypes,
    // Theme preferences
    themeTemplate: data.themeTemplate || "classic",
    themeTone: data.themeTone || "formal",
    themeFont: data.themeFont || "roboto",
    themeAccentColor: data.themeAccentColor || "#673ab7",
    themeLogoUrl: data.themeLogoUrl || "",
    themeSignatureUrl: data.themeSignatureUrl || "",
    themeBanner: data.themeBanner || "",
    themeShowSetlist: data.themeShowSetlist || false,
    themeShowRiderNotes: data.themeShowRiderNotes || false,
    themeShowQrCode: data.themeShowQrCode || false,
    themeShowTerms: data.themeShowTerms !== false, // Default to true
    themeCustomTitle: data.themeCustomTitle || "",
  };
};

// Theme preview functionality
const generateThemePreview = async (themeSettings: any) => {
  try {
    const response = await fetch('/api/theme-preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(themeSettings),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to generate theme preview');
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Error generating theme preview:', error);
    return null;
  }
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

  // State for theme preview
  const [showThemePreview, setShowThemePreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [selectedCustomTitle, setSelectedCustomTitle] = useState("invoice");
  const [customGig, setCustomGig] = useState("");
  const [showInstrumentInput, setShowInstrumentInput] = useState(false);
  const [showGigInput, setShowGigInput] = useState(false);
  
  // Track if form has been modified
  const [hasChanges, setHasChanges] = useState(false);
  const [initialData, setInitialData] = useState<any>(null);
  
  // Collapsible state for each section
  const [expandedSections, setExpandedSections] = useState({
    business: true,
    email: false,
    contact: false,
    address: false,
    financial: false,
    bank: false,
    instruments: false,
    themes: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsFormSchema),
    // Don't set default values here - let the form initialize from settings data
  });

  // Load existing settings data
  const { data: settings, isLoading: settingsLoading, error: settingsError } = useQuery({
    queryKey: ['settings'],
    queryFn: fetchSettings,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    select: (data) => {
      
      console.log('🔥 Address fields:', {
        addressLine1: data?.addressLine1,
        city: data?.city,
        county: data?.county,
        postcode: data?.postcode,
      });
      return data;
    },
  });

  // Load global gig types separately
  const { data: globalGigTypes } = useQuery({
    queryKey: ['global-gig-types'],
    queryFn: async () => {
      const response = await fetch('/api/global-gig-types', {
        credentials: 'include',
      });
      if (!response.ok) {
        return [];
      }
      const data = await response.json();
      return data.gigTypes || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });

  // Save settings function - simplified version
  const saveSettings = useMutation({
    mutationFn: async (data: SettingsFormData) => {
      
      
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include', // This is crucial for session cookies
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save settings: ${response.status} ${errorText}`);
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      
      setHasChanges(false);
      toast({
        title: "Success",
        description: "Settings saved successfully!",
      });
      
      // Don't reset the form immediately - let it keep the user's changes
      // The form will be updated when the settings query refreshes
      
      // Update local state with saved data
      setSelectedInstruments(Array.isArray(data.selectedInstruments) ? data.selectedInstruments : []);
      setGigTypes(Array.isArray(data.gigTypes) ? data.gigTypes : []);
      
      // Store the new data as initial data for comparison
      setInitialData({
        ...data,
        selectedInstruments: data.selectedInstruments || [],
        gigTypes: data.gigTypes || []
      });
      
      // Invalidate and refetch settings to get fresh data
      queryClient.invalidateQueries({ queryKey: ['settings'] });
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

  // Initialize form when settings are loaded - but don't reset if user has unsaved changes
  useEffect(() => {
    if (settings && !saveSettings.isPending && !hasChanges) {
      
      
      // Create the form data object with actual values - include ALL fields from database
      const formData = {
        businessName: settings.businessName || "",
        businessEmail: settings.businessEmail || "",
        businessAddress: settings.businessAddress || "",
        addressLine1: settings.addressLine1 || "",
        addressLine2: settings.addressLine2 || "",
        city: settings.city || "",
        county: settings.county || "",
        postcode: settings.postcode || "",
        phone: settings.phone || "",
        website: settings.website || "",
        taxNumber: settings.taxNumber || "",
        emailFromName: settings.emailFromName || "",
        nextInvoiceNumber: settings.nextInvoiceNumber || 1,
        defaultTerms: settings.defaultTerms || "",
        bankDetails: settings.bankDetails || "",
        selectedInstruments: settings.selectedInstruments || [],
        gigTypes: settings.gigTypes || [],
      };
      
      
      
      // Force reset form with settings data
      form.reset(formData);
      
      // Set local state
      const instruments = Array.isArray(settings.selectedInstruments) ? settings.selectedInstruments : [];
      setSelectedInstruments(instruments);
      
      // Use global gig types if available, otherwise use settings gig types
      const gigTypesToUse = globalGigTypes && globalGigTypes.length > 0 ? globalGigTypes : (Array.isArray(settings.gigTypes) ? settings.gigTypes : []);
      setGigTypes(gigTypesToUse);
      
      // Store initial data for comparison
      setInitialData({
        ...settings,
        selectedInstruments: instruments,
        gigTypes: gigTypesToUse
      });
      
      setHasChanges(false);
    }
  }, [settings, globalGigTypes, form, saveSettings.isPending, hasChanges]);

  // Simple form watcher for detecting changes
  useEffect(() => {
    if (!initialData) return;
    
    const subscription = form.watch(() => {
      setHasChanges(true);
    });
    
    return () => subscription.unsubscribe();
  }, [form, initialData]);

  // Function to generate AI-powered gig types
  const generateGigTypes = async (instruments: string[]) => {
    if (!instruments.length) {
      setGigTypes([]);
      setAiSuggestions([]);
      form.setValue('gigTypes', []);
      setHasChanges(true);
      return [];
    }
    
    setIsGeneratingGigTypes(true);
    try {
      const suggestions = await generateGigSuggestions(instruments);
      setAiSuggestions(suggestions);
      
      // Keep existing gig types and add new suggestions
      const currentGigTypes = Array.isArray(gigTypes) ? gigTypes : [];
      const combinedGigTypes = [...new Set([...currentGigTypes, ...suggestions])];
      
      setGigTypes(combinedGigTypes);
      form.setValue('gigTypes', combinedGigTypes);
      setHasChanges(true);
      
      return suggestions;
    } catch (error) {
      console.error('Error generating gig suggestions:', error);
      return [];
    } finally {
      setIsGeneratingGigTypes(false);
    }
  };

  // Handle instrument selection changes
  const handleInstrumentToggle = (instrument: string) => {
    const currentInstruments = Array.isArray(selectedInstruments) ? selectedInstruments : [];
    const newSelectedInstruments = currentInstruments.includes(instrument)
      ? currentInstruments.filter(i => i !== instrument)
      : [...currentInstruments, instrument];
    
    setSelectedInstruments(newSelectedInstruments);
    form.setValue('selectedInstruments', newSelectedInstruments);
    setHasChanges(true);
  };

  // Add custom instrument
  const addCustomInstrument = () => {
    const currentInstruments = Array.isArray(selectedInstruments) ? selectedInstruments : [];
    if (customInstrument && !currentInstruments.includes(customInstrument)) {
      const newInstruments = [...currentInstruments, customInstrument];
      setSelectedInstruments(newInstruments);
      form.setValue('selectedInstruments', newInstruments);
      setCustomInstrument("");
      setShowInstrumentInput(false);
      setHasChanges(true);
    }
  };

  // Add custom gig type
  const addCustomGig = () => {
    const currentGigTypes = Array.isArray(gigTypes) ? gigTypes : [];
    if (customGig && !currentGigTypes.includes(customGig)) {
      const newGigTypes = [...currentGigTypes, customGig];
      setGigTypes(newGigTypes);
      form.setValue('gigTypes', newGigTypes);
      setCustomGig("");
      setShowGigInput(false);
      setHasChanges(true);
    }
  };

  // Remove gig type
  const removeGigType = (gigType: string) => {
    const currentGigTypes = Array.isArray(gigTypes) ? gigTypes : [];
    const newGigTypes = currentGigTypes.filter(g => g !== gigType);
    setGigTypes(newGigTypes);
    form.setValue('gigTypes', newGigTypes);
    setHasChanges(true);
  };

  // Filter instruments based on search - show core instruments by default, all instruments when searching
  const filteredInstruments = instrumentSearch.trim() 
    ? ALL_INSTRUMENTS.filter(instrument =>
        instrument.toLowerCase().includes(instrumentSearch.toLowerCase())
      )
    : CORE_INSTRUMENTS;



  const onSubmit = (data: SettingsFormData) => {
    
    
    // Include instruments and gig types in the form data
    const completeData = {
      ...data,
      selectedInstruments,
      gigTypes,
    };
    
    
    saveSettings.mutate(completeData);
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

  if (settingsError) {
    console.error('🔥 Settings query error:', settingsError);
    return (
      <div className="min-h-screen bg-background layout-consistent">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600">Error loading settings: {settingsError.message}</p>
            <p className="text-muted-foreground mt-2">Please check if you're logged in.</p>
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
                <Collapsible open={expandedSections.business} onOpenChange={() => toggleSection('business')}>
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="border-b border-gray-100 dark:border-slate-700 pb-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                      <CardTitle className="flex items-center justify-between text-lg">
                        <div className="flex items-center space-x-2">
                          <Building className="w-5 h-5 text-purple-600" />
                          <span>Business Information</span>
                        </div>
                        {expandedSections.business ? 
                          <ChevronDown className="w-5 h-5 text-gray-400" /> : 
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        }
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="businessName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Business Name</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} placeholder="Your Business Name" />
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
                            <Input {...field} value={field.value || ""} placeholder="business@example.com" type="email" />
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
                            <Input {...field} value={field.value || ""} placeholder="+44 (0) 123 456 7890" />
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
                            <Input {...field} value={field.value || ""} placeholder="Your Name" />
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
                            <Input {...field} value={field.value || ""} placeholder="123 Main Street" />
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
                            <Input {...field} value={field.value || ""} placeholder="Apartment, suite, etc." />
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
                              <Input {...field} value={field.value || ""} placeholder="London" />
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
                              <Input {...field} value={field.value || ""} placeholder="Greater London" />
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
                              <Input {...field} value={field.value || ""} placeholder="SW1A 1AA" />
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
                            <Input {...field} value={field.value || ""} placeholder="https://yourwebsite.com" />
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
                            <Input {...field} value={field.value || ""} placeholder="TAX123456" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>

              {/* Lead Email Management */}
              <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
                <Collapsible open={expandedSections.email} onOpenChange={() => toggleSection('email')}>
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="border-b border-gray-100 dark:border-slate-700 pb-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                      <CardTitle className="flex items-center justify-between text-lg">
                        <div className="flex items-center space-x-2">
                          <Mail className="w-5 h-5 text-purple-600" />
                          <span>Lead Email Management</span>
                        </div>
                        {expandedSections.email ? 
                          <ChevronDown className="w-5 h-5 text-gray-400" /> : 
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        }
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="p-6 space-y-4">
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-blue-900 dark:text-blue-100">Professional Email Address</h4>
                            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                              Your dedicated email address for receiving client inquiries that automatically create bookings.
                            </p>
                            <div className="mt-3 p-2 bg-white dark:bg-slate-800 rounded border border-blue-200 dark:border-blue-700">
                              <code className="text-sm font-mono text-blue-800 dark:text-blue-200">
                                Current: leads+yourprefix@mg.musobuddy.com
                              </code>
                            </div>
                            <div className="mt-3">
                              <Button 
                                type="button"
                                onClick={() => window.open('/email-setup', '_blank')}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                size="sm"
                              >
                                <Mail className="w-4 h-4 mr-2" />
                                Change Email Prefix
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>

              {/* Instruments & Gig Types */}
              <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
                <Collapsible open={expandedSections.instruments} onOpenChange={() => toggleSection('instruments')}>
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="border-b border-gray-100 dark:border-slate-700 pb-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                      <CardTitle className="flex items-center justify-between text-lg">
                        <div className="flex items-center space-x-2">
                          <Music className="w-5 h-5 text-purple-600" />
                          <span>Instruments & AI-Powered Gig Types</span>
                        </div>
                        {expandedSections.instruments ? 
                          <ChevronDown className="w-5 h-5 text-gray-400" /> : 
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        }
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
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
                            checked={Array.isArray(selectedInstruments) && selectedInstruments.includes(instrument)}
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
                  {Array.isArray(selectedInstruments) && selectedInstruments.length > 0 && (
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
                  {Array.isArray(selectedInstruments) && selectedInstruments.length > 0 && (
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
                                  const newGigTypes = [...currentGigTypes, suggestion];
                                  setGigTypes(newGigTypes);
                                  form.setValue('gigTypes', newGigTypes);
                                  setHasChanges(true);
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
                  </CollapsibleContent>
                </Collapsible>
              </Card>

              {/* Email Settings */}
              <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
                <Collapsible open={expandedSections.contact} onOpenChange={() => toggleSection('contact')}>
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="border-b border-gray-100 dark:border-slate-700 pb-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                      <CardTitle className="flex items-center justify-between text-lg">
                        <div className="flex items-center space-x-2">
                          <Globe className="w-5 h-5 text-purple-600" />
                          <span>Email Settings</span>
                        </div>
                        {expandedSections.contact ? 
                          <ChevronDown className="w-5 h-5 text-gray-400" /> : 
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        }
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
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
                  </CollapsibleContent>
                </Collapsible>
              </Card>

              {/* Invoice Settings */}
              <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
                <Collapsible open={expandedSections.financial} onOpenChange={() => toggleSection('financial')}>
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="border-b border-gray-100 dark:border-slate-700 pb-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                      <CardTitle className="flex items-center justify-between text-lg">
                        <div className="flex items-center space-x-2">
                          <Hash className="w-5 h-5 text-purple-600" />
                          <span>Invoice Settings</span>
                        </div>
                        {expandedSections.financial ? 
                          <ChevronDown className="w-5 h-5 text-gray-400" /> : 
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        }
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
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
                  </CollapsibleContent>
                </Collapsible>
              </Card>

              {/* Bank Details */}
              <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
                <Collapsible open={expandedSections.bank} onOpenChange={() => toggleSection('bank')}>
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="border-b border-gray-100 dark:border-slate-700 pb-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                      <CardTitle className="flex items-center justify-between text-lg">
                        <div className="flex items-center space-x-2">
                          <CreditCard className="w-5 h-5 text-purple-600" />
                          <span>Bank Details</span>
                        </div>
                        {expandedSections.bank ? 
                          <ChevronDown className="w-5 h-5 text-gray-400" /> : 
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        }
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
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
                  </CollapsibleContent>
                </Collapsible>
              </Card>

              {/* Theme Customization */}
              <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
                <Collapsible open={expandedSections.themes} onOpenChange={() => toggleSection('themes')}>
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="border-b border-gray-100 dark:border-slate-700 pb-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                      <CardTitle className="flex items-center justify-between text-lg">
                        <div className="flex items-center space-x-2">
                          <SettingsIcon className="w-5 h-5 text-purple-600" />
                          <span>Invoice & Contract Themes</span>
                        </div>
                        {expandedSections.themes ? 
                          <ChevronDown className="w-5 h-5 text-gray-400" /> : 
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        }
                      </CardTitle>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-2 text-left">
                        Customize your invoices and contracts with professional themes, fonts, and branding
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="p-6 space-y-6">
                  {/* Template Selection */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Template Style</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {THEME_TEMPLATES.map((template) => (
                        <FormField
                          key={template.id}
                          control={form.control}
                          name="themeTemplate"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <label className={`block p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                  field.value === template.id
                                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                    : 'border-gray-200 dark:border-gray-600 hover:border-purple-300'
                                }`}>
                                  <input
                                    type="radio"
                                    {...field}
                                    value={template.id}
                                    checked={field.value === template.id}
                                    className="sr-only"
                                  />
                                  <div className="font-medium text-sm">{template.label}</div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {template.description}
                                  </div>
                                </label>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Tone Selection */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Tone & Language</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {THEME_TONES.map((tone) => (
                        <FormField
                          key={tone.id}
                          control={form.control}
                          name="themeTone"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <label className={`block p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                  field.value === tone.id
                                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                    : 'border-gray-200 dark:border-gray-600 hover:border-purple-300'
                                }`}>
                                  <input
                                    type="radio"
                                    {...field}
                                    value={tone.id}
                                    checked={field.value === tone.id}
                                    className="sr-only"
                                  />
                                  <div className="font-medium text-sm">{tone.label}</div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {tone.description}
                                  </div>
                                </label>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Font Selection */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Font Style</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {THEME_FONTS.map((font) => (
                        <FormField
                          key={font.id}
                          control={form.control}
                          name="themeFont"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <label className={`block p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                  field.value === font.id
                                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                    : 'border-gray-200 dark:border-gray-600 hover:border-purple-300'
                                }`}>
                                  <input
                                    type="radio"
                                    {...field}
                                    value={font.id}
                                    checked={field.value === font.id}
                                    className="sr-only"
                                  />
                                  <div className="font-medium text-sm">{font.label}</div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {font.description}
                                  </div>
                                </label>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Accent Color */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Accent Color</h3>
                    <FormField
                      control={form.control}
                      name="themeAccentColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="flex items-center space-x-4">
                              <div className="flex space-x-2">
                                {THEME_COLORS.map((color) => (
                                  <button
                                    key={color}
                                    type="button"
                                    onClick={() => field.onChange(color)}
                                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                                      field.value === color
                                        ? 'border-white shadow-lg scale-110'
                                        : 'border-gray-300 hover:scale-105'
                                    }`}
                                    style={{ backgroundColor: color }}
                                  />
                                ))}
                              </div>
                              <Input
                                type="color"
                                value={field.value || "#8B5CF6"}
                                onChange={(e) => field.onChange(e.target.value)}
                                className="w-16 h-8 border-0 rounded cursor-pointer"
                              />
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                {field.value}
                              </span>
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Custom Title */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Document Title</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {CUSTOM_TITLES.map((title) => (
                        <button
                          key={title.id}
                          type="button"
                          onClick={() => {
                            setSelectedCustomTitle(title.id);
                            if (title.id === 'custom') {
                              form.setValue('themeCustomTitle', '');
                            } else {
                              form.setValue('themeCustomTitle', title.label);
                            }
                          }}
                          className={`p-2 text-sm rounded-lg border transition-all ${
                            selectedCustomTitle === title.id
                              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                              : 'border-gray-200 dark:border-gray-600 hover:border-purple-300'
                          }`}
                        >
                          {title.label}
                        </button>
                      ))}
                    </div>
                    {selectedCustomTitle === 'custom' && (
                      <FormField
                        control={form.control}
                        name="themeCustomTitle"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Enter custom title"
                                className="mt-2"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  {/* Feature Toggles */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Optional Features</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="themeShowSetlist"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-sm font-medium cursor-pointer">
                                Show Setlist Section
                              </FormLabel>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Add a section for song lists and performance details
                              </p>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="themeShowRiderNotes"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-sm font-medium cursor-pointer">
                                Show Rider Notes
                              </FormLabel>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Include technical requirements and setup notes
                              </p>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="themeShowQrCode"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-sm font-medium cursor-pointer">
                                Show QR Code
                              </FormLabel>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Add QR code for social media or playlist links
                              </p>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="themeShowTerms"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-sm font-medium cursor-pointer">
                                Show Terms & Conditions
                              </FormLabel>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Include legal terms and payment conditions
                              </p>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Preview Button */}
                  <div className="flex justify-center pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      type="button"
                      onClick={async () => {
                        setIsGeneratingPreview(true);
                        const currentValues = form.getValues();
                        const themeSettings = {
                          template: currentValues.themeTemplate,
                          tone: currentValues.themeTone,
                          font: currentValues.themeFont,
                          accentColor: currentValues.themeAccentColor,
                          customTitle: currentValues.themeCustomTitle,
                          showSetlist: currentValues.themeShowSetlist,
                          showRiderNotes: currentValues.themeShowRiderNotes,
                          showQrCode: currentValues.themeShowQrCode,
                          showTerms: currentValues.themeShowTerms,
                          businessName: currentValues.businessName,
                          businessAddress: `${currentValues.addressLine1}, ${currentValues.city}, ${currentValues.postcode}`,
                          businessPhone: currentValues.phone,
                          businessEmail: currentValues.businessEmail,
                        };
                        
                        const url = await generateThemePreview(themeSettings);
                        if (url) {
                          setPreviewUrl(url);
                          setShowThemePreview(true);
                        } else {
                          toast({
                            title: "Preview Error",
                            description: "Could not generate theme preview. Please try again.",
                            variant: "destructive",
                          });
                        }
                        setIsGeneratingPreview(false);
                      }}
                      disabled={isGeneratingPreview}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:shadow-lg transition-all"
                    >
                      {isGeneratingPreview ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating Preview...
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4 mr-2" />
                          Preview Theme
                        </>
                      )}
                    </Button>
                  </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>

              {/* Save Button */}
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={saveSettings.isPending || !hasChanges}
                  onClick={(e) => {
                    
                    
                    
                    
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

      {/* Theme Preview Dialog */}
      <Dialog open={showThemePreview} onOpenChange={setShowThemePreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Theme Preview</DialogTitle>
            <DialogDescription>
              Preview of your customized invoice and contract theme
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {previewUrl ? (
              <div className="border rounded-lg overflow-hidden">
                <iframe
                  src={previewUrl}
                  className="w-full h-[600px] border-0"
                  title="Theme Preview"
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                  <p className="text-gray-600 dark:text-gray-400">Loading preview...</p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}