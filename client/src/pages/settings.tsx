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

// Schema for form validation
const settingsFormSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  businessAddress: z.string().min(1, "Business address is required"),
  phone: z.string().min(1, "Phone number is required"),
  website: z.string().optional().or(z.literal("")),
  taxNumber: z.string().optional().or(z.literal("")),
  emailFromName: z.string().min(1, "Email from name is required"),
  nextInvoiceNumber: z.string().min(1, "Next invoice number is required"),
  defaultTerms: z.string().optional().or(z.literal("")),
  bankDetails: z.string().optional().or(z.literal("")),
  selectedInstruments: z.array(z.string()).optional(),
  gigTypes: z.array(z.string()).optional(),
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

// Mock API function for fetching settings
const fetchSettings = async (): Promise<SettingsFormData> => {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        businessName: "Sample Music Business",
        businessAddress: "123 Music Street, City, State 12345",
        phone: "+1 (555) 123-4567",
        website: "https://example.com",
        taxNumber: "TAX123456",
        emailFromName: "John Doe",
        nextInvoiceNumber: "00001",
        defaultTerms: "Payment due within 30 days",
        bankDetails: "Bank Name: Sample Bank\nAccount: 12345678\nSort Code: 12-34-56",
        selectedInstruments: [], // Start with empty array so user can select fresh
        gigTypes: [],
      });
    }, 1000);
  });
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

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      businessName: "",
      businessAddress: "",
      phone: "",
      website: "",
      taxNumber: "",
      emailFromName: "",
      nextInvoiceNumber: "00001",
      defaultTerms: "",
      bankDetails: "",
      selectedInstruments: [],
      gigTypes: [],
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

  // Update local state when settings are loaded
  useEffect(() => {
    if (settings) {
      console.log('Updating form with settings:', settings);
      form.reset(settings);
      setSelectedInstruments(settings.selectedInstruments || []);
      setGigTypes(settings.gigTypes || []);
    }
  }, [settings, form]);

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
    if (customGig && !gigTypes.includes(customGig)) {
      setGigTypes([...gigTypes, customGig]);
      setCustomGig("");
      setShowGigInput(false);
    }
  };

  // Remove gig type
  const removeGigType = (gigType: string) => {
    setGigTypes(gigTypes.filter(g => g !== gigType));
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
        selectedInstruments,
        gigTypes,
      };
      
      // Here you would make an API call to save the settings
      console.log('Saving settings:', settingsData);
      
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return settingsData;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Settings saved successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (error) => {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SettingsFormData) => {
    saveSettings.mutate(data);
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
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Phone</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="+1 (555) 123-4567" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="businessAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Business Address</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="123 Main Street, City, State 12345" rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
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
                            {aiSuggestions.filter(suggestion => !gigTypes.includes(suggestion)).map((suggestion, index) => (
                              <Badge
                                key={index}
                                variant="outline"
                                className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 text-purple-800 cursor-pointer hover:bg-purple-100 transition-colors"
                                onClick={() => {
                                  setGigTypes([...gigTypes, suggestion]);
                                }}
                              >
                                + {suggestion}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Current Gig Types */}
                      {gigTypes.length > 0 && (
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
                  disabled={saveSettings.isPending}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0 hover:shadow-lg px-8 py-2"
                >
                  {saveSettings.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Settings
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