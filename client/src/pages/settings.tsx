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

// Schema for form validation
const settingsFormSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  businessEmail: z.string().min(1, "Business email is required").email("Please enter a valid email address"),
  businessAddress: z.string().optional().or(z.literal("")),
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
  selectedInstruments: z.array(z.string()).optional(),
  gigTypes: z.array(z.string()).optional(),
});

type SettingsFormData = z.infer<typeof settingsFormSchema>;

// ENHANCED: Safe JSON parser that handles malformed data gracefully
const safeParseJSON = (jsonString: any, fallback: any[] = []): any[] => {
  if (!jsonString || jsonString === 'null' || jsonString === '') {
    return fallback;
  }
  
  if (Array.isArray(jsonString)) {
    return jsonString;
  }
  
  if (typeof jsonString !== 'string') {
    try {
      return Array.isArray(jsonString) ? jsonString : fallback;
    } catch {
      return fallback;
    }
  }
  
  try {
    // Handle PostgreSQL array format: {item1,item2,item3}
    if (jsonString.startsWith('{') && jsonString.endsWith('}') && !jsonString.includes('[')) {
      const items = jsonString.slice(1, -1).split(',').filter(item => item.trim());
      return items.map(item => item.replace(/"/g, '').trim()).filter(Boolean);
    }
    
    // Handle malformed JSON that starts with array but has syntax errors
    if (jsonString.includes('[') || jsonString.includes('{')) {
      let cleanJson = jsonString.trim();
      
      if (cleanJson.includes('[') && !cleanJson.includes('"')) {
        cleanJson = cleanJson.replace(/\[([^\]]+)\]/, (match, content) => {
          const items = content.split(',').map((item: string) => `"${item.trim()}"`);
          return `[${items.join(',')}]`;
        });
      }
      
      const parsed = JSON.parse(cleanJson);
      return Array.isArray(parsed) ? parsed : fallback;
    }
    
    const parsed = JSON.parse(jsonString);
    return Array.isArray(parsed) ? parsed : fallback;
    
  } catch (error: any) {
    console.warn('Failed to parse JSON, using fallback:', { jsonString, error: error.message });
    
    if (typeof jsonString === 'string' && jsonString.includes(',')) {
      return jsonString.split(',').map(item => item.trim()).filter(Boolean);
    }
    
    return fallback;
  }
};

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

// ENHANCED: API function for fetching settings with better error handling
const fetchSettings = async (): Promise<SettingsFormData> => {
  const response = await fetch('/api/settings', {
    credentials: 'include',
  });
  
  if (!response.ok) {
    console.error('Settings API error:', response.status, response.statusText);
    throw new Error(`Failed to fetch settings: ${response.status}`);
  }
  
  const data = await response.json();
  
  // ENHANCED: Use safe JSON parsing for instruments and gig types
  const parsedInstruments = safeParseJSON(data.selectedInstruments, []);
  const parsedGigTypes = safeParseJSON(data.gigTypes, []);
  
  console.log('✅ Safely parsed settings data:', {
    rawInstruments: data.selectedInstruments,
    rawGigTypes: data.gigTypes,
    parsedInstruments,
    parsedGigTypes
  });
  
  return {
    businessName: data.businessName || "",
    businessEmail: data.businessEmail || "",
    businessAddress: data.businessAddress || "",
    addressLine1: data.addressLine1 || "",
    addressLine2: data.addressLine2 || "",
    city: data.city || "",
    county: data.county || "",
    postcode: data.postcode || "",
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
  const { isDesktop } = useResponsive();
  const isMobile = !isDesktop;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // State for instrument selection
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);
  const [gigTypes, setGigTypes] = useState<string[]>([]);
  const [customInstrument, setCustomInstrument] = useState("");
  const [customGigType, setCustomGigType] = useState("");
  const [instrumentSearch, setInstrumentSearch] = useState("");
  const [isGeneratingGigs, setIsGeneratingGigs] = useState(false);

  // Settings query with enhanced error handling
  const { data: settings, isLoading: settingsLoading, error: settingsError, refetch } = useQuery({
    queryKey: ["/api/settings"],
    queryFn: fetchSettings,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Initialize form
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
      selectedInstruments: [],
      gigTypes: [],
    },
  });

  // Update form when settings data loads
  useEffect(() => {
    if (settings) {
      form.reset(settings);
      setSelectedInstruments(settings.selectedInstruments || []);
      setGigTypes(settings.gigTypes || []);
      
      console.log('✅ Form initialized with instruments:', settings.selectedInstruments, 'and gig types:', settings.gigTypes);
    }
  }, [settings, form]);

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (data: SettingsFormData) => {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          selectedInstruments,
          gigTypes,
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error("Failed to save settings");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Settings saved",
        description: "Your settings have been saved successfully.",
      });

      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      
      // CRITICAL: Update local state with returned data to prevent disappearing
      const parsedInstruments = safeParseJSON(data.selectedInstruments, []);
      const parsedGigTypes = safeParseJSON(data.gigTypes, []);
      
      setSelectedInstruments(parsedInstruments);
      setGigTypes(parsedGigTypes);
      
      console.log('✅ Settings saved successfully, local state updated');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
      console.error("Settings save error:", error);
    },
  });

  // Handle instrument selection
  const handleInstrumentToggle = (instrument: string) => {
    setSelectedInstruments(prev => 
      prev.includes(instrument) 
        ? prev.filter(i => i !== instrument)
        : [...prev, instrument]
    );
  };

  // Generate AI gig suggestions
  const handleGenerateGigSuggestions = async () => {
    if (selectedInstruments.length === 0) {
      toast({
        title: "Select instruments first",
        description: "Please select at least one instrument to generate gig suggestions.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingGigs(true);
    try {
      const suggestions = await generateGigSuggestions(selectedInstruments);
      const newGigTypes = [...new Set([...gigTypes, ...suggestions])];
      setGigTypes(newGigTypes);
      
      toast({
        title: "Gig suggestions generated",
        description: `Added ${suggestions.length} new gig type suggestions.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate gig suggestions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingGigs(false);
    }
  };

  if (settingsLoading) {
    return (
      <div className="flex h-screen">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading settings...</span>
          </div>
        </div>
      </div>
    );
  }

  if (settingsError) {
    return (
      <div className="flex h-screen">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">Failed to load settings</p>
            <Button onClick={() => refetch()}>Try Again</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {isMobile && (
          <MobileNav onSidebarToggle={() => setSidebarOpen(!sidebarOpen)} />
        )}
        
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <SettingsIcon className="h-8 w-8 text-purple-600" />
              <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => saveSettingsMutation.mutate(data))} className="space-y-6">
                
                {/* Business Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building className="h-5 w-5" />
                      Business Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="businessName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Business Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Your Business Name" {...field} />
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
                              <Input placeholder="business@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="+44 1234 567890" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Instrument & Gig Type Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Music className="h-5 w-5" />
                      Instruments & Gig Types
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    
                    {/* Instruments Section */}
                    <div>
                      <Label className="text-base font-medium mb-3 block">
                        Select Your Instruments ({selectedInstruments.length})
                      </Label>
                      
                      {/* Selected Instruments Display */}
                      {selectedInstruments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {selectedInstruments.map((instrument) => (
                            <Badge key={instrument} variant="secondary" className="px-3 py-1">
                              {instrument}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="ml-2 h-4 w-4 p-0 hover:bg-transparent"
                                onClick={() => handleInstrumentToggle(instrument)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Core Instruments Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
                        {CORE_INSTRUMENTS.map((instrument) => (
                          <div key={instrument} className="flex items-center space-x-2">
                            <Checkbox
                              id={`instrument-${instrument}`}
                              checked={selectedInstruments.includes(instrument)}
                              onCheckedChange={() => handleInstrumentToggle(instrument)}
                            />
                            <Label
                              htmlFor={`instrument-${instrument}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {instrument}
                            </Label>
                          </div>
                        ))}
                      </div>

                      {/* Custom Instrument Input */}
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add custom instrument..."
                          value={customInstrument}
                          onChange={(e) => setCustomInstrument(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (customInstrument.trim()) {
                                handleInstrumentToggle(customInstrument.trim());
                                setCustomInstrument("");
                              }
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            if (customInstrument.trim()) {
                              handleInstrumentToggle(customInstrument.trim());
                              setCustomInstrument("");
                            }
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Gig Types Section */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-base font-medium">
                          Gig Types ({gigTypes.length})
                        </Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleGenerateGigSuggestions}
                          disabled={isGeneratingGigs || selectedInstruments.length === 0}
                        >
                          {isGeneratingGigs ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            "Generate New"
                          )}
                        </Button>
                      </div>

                      {/* Selected Gig Types Display */}
                      {gigTypes.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {gigTypes.map((gigType) => (
                            <Badge key={gigType} variant="outline" className="px-3 py-1">
                              {gigType}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="ml-2 h-4 w-4 p-0 hover:bg-transparent"
                                onClick={() => setGigTypes(prev => prev.filter(g => g !== gigType))}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Custom Gig Type Input */}
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add custom gig type..."
                          value={customGigType}
                          onChange={(e) => setCustomGigType(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (customGigType.trim() && !gigTypes.includes(customGigType.trim())) {
                                setGigTypes(prev => [...prev, customGigType.trim()]);
                                setCustomGigType("");
                              }
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            if (customGigType.trim() && !gigTypes.includes(customGigType.trim())) {
                              setGigTypes(prev => [...prev, customGigType.trim()]);
                              setCustomGigType("");
                            }
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Address Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Business Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="addressLine1"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address Line 1</FormLabel>
                            <FormControl>
                              <Input placeholder="123 Main Street" {...field} />
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
                            <FormLabel>Address Line 2 (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Apartment, suite, etc." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input placeholder="London" {...field} />
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
                            <FormLabel>County (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Greater London" {...field} />
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
                            <FormLabel>Postcode</FormLabel>
                            <FormControl>
                              <Input placeholder="SW1A 1AA" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Save Button */}
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={saveSettingsMutation.isPending}
                    className="min-w-[120px]"
                  >
                    {saveSettingsMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Settings
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </main>
      </div>
    </div>
  );
}