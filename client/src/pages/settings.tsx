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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { useResponsive } from "@/hooks/useResponsive";
import { Building, Save, MapPin, Globe, Hash, CreditCard, FileText, User, Music, Settings as SettingsIcon, X, Plus, Search, Loader2, Menu } from "lucide-react";

// Default instruments displayed initially
const DEFAULT_INSTRUMENTS = [
  "Violin", "Cello", "Double Bass", "Harp", "Electric Guitar", "Acoustic Guitar", "Bass Guitar",
  "Flute", "Clarinet", "Saxophone", "Trumpet", "Trombone", "French Horn", "Tuba", 
  "Piano", "Electric Keyboard", "Synthesizer", "Percussion", "Lead Vocals", "Backing Vocals", 
  "DJ"
];

// Comprehensive instrument database from CSV
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
  "Kalimba", "Music Box", "Singing Bowl", "Rainstick", "DJ"
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
        selectedInstruments: ["Piano", "Guitar"],
        gigTypes: ["Wedding", "Corporate Event"],
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
    if (!instruments.length) return [];
    
    setIsGeneratingGigTypes(true);
    try {
      // Mock API call - replace with actual API endpoint
      const mockSuggestions = await new Promise<string[]>((resolve) => {
        setTimeout(() => {
          const suggestions: { [key: string]: string[] } = {
            "Piano": ["Wedding Ceremony", "Corporate Event", "Restaurant Performance", "Private Party", "Hotel Lobby", "Jazz Club", "Cocktail Hour", "Background Music", "Classical Concert", "Wine Tasting", "Art Gallery Opening", "Funeral Service"],
            "Acoustic Guitar": ["Wedding Reception", "Acoustic Set", "Open Mic Night", "Street Performance", "Coffee Shop", "Restaurant Dining", "Private Party", "Garden Party", "Busking", "House Concert", "Folk Festival", "Intimate Venue"],
            "Electric Guitar": ["Wedding Reception", "Corporate Event", "Band Performance", "Music Festival", "Bar Gig", "Club Night", "Rock Concert", "Tribute Show", "Function Band", "Dance Event", "Birthday Party", "Pub Performance"],
            "Bass Guitar": ["Wedding Reception", "Corporate Event", "Band Performance", "Music Festival", "Jazz Club", "Function Band", "Dance Event", "Club Night", "Rock Concert", "Tribute Show", "Session Work", "Bar Gig"],
            "Violin": ["Wedding Ceremony", "Classical Concert", "Chamber Music", "String Quartet", "Corporate Event", "Private Party", "Restaurant Performance", "Art Gallery", "Wine Tasting", "Funeral Service", "Church Service", "Cocktail Hour"],
            "Cello": ["Wedding Ceremony", "Classical Concert", "Chamber Music", "String Quartet", "Corporate Event", "Private Party", "Restaurant Performance", "Art Gallery", "Wine Tasting", "Funeral Service", "Church Service", "Cocktail Hour"],
            "Double Bass": ["Jazz Club", "Wedding Reception", "Corporate Event", "Restaurant Performance", "Private Party", "Classical Concert", "Chamber Music", "Function Band", "Acoustic Set", "Wine Bar", "Hotel Lobby", "Art Gallery"],
            "Harp": ["Wedding Ceremony", "Classical Concert", "Chamber Music", "Corporate Event", "Private Party", "Restaurant Performance", "Art Gallery", "Wine Tasting", "Cocktail Hour", "Garden Party", "Background Music", "Funeral Service"],
            "Saxophone": ["Jazz Club", "Wedding Reception", "Corporate Event", "Restaurant Performance", "Private Party", "Function Band", "Cocktail Hour", "Dance Event", "Hotel Lobby", "Wine Bar", "Art Gallery", "Smooth Jazz Event"],
            "Flute": ["Wedding Ceremony", "Classical Concert", "Chamber Music", "Corporate Event", "Private Party", "Restaurant Performance", "Art Gallery", "Wine Tasting", "Cocktail Hour", "Garden Party", "Acoustic Set", "Background Music"],
            "Clarinet": ["Wedding Ceremony", "Classical Concert", "Chamber Music", "Corporate Event", "Private Party", "Restaurant Performance", "Art Gallery", "Wine Tasting", "Cocktail Hour", "Garden Party", "Jazz Club", "Background Music"],
            "Trumpet": ["Wedding Reception", "Corporate Event", "Jazz Club", "Function Band", "Dance Event", "Big Band", "Brass Band", "Classical Concert", "Private Party", "Hotel Lobby", "Art Gallery", "Cocktail Hour"],
            "Trombone": ["Wedding Reception", "Corporate Event", "Jazz Club", "Function Band", "Dance Event", "Big Band", "Brass Band", "Classical Concert", "Private Party", "Hotel Lobby", "Art Gallery", "Cocktail Hour"],
            "French Horn": ["Classical Concert", "Chamber Music", "Wedding Ceremony", "Corporate Event", "Private Party", "Art Gallery", "Wine Tasting", "Background Music", "Orchestra", "Brass Quintet", "Church Service", "Formal Event"],
            "Tuba": ["Classical Concert", "Chamber Music", "Wedding Reception", "Corporate Event", "Big Band", "Brass Band", "Function Band", "Private Party", "Art Gallery", "Orchestra", "Brass Quintet", "Formal Event"],
            "Percussion": ["Wedding Reception", "Corporate Event", "Band Performance", "Music Festival", "Bar Gig", "Club Night", "Rock Concert", "Tribute Show", "Function Band", "Dance Event", "Latin Music", "World Music"],
            "Lead Vocals": ["Wedding Reception", "Corporate Event", "Private Party", "Restaurant Performance", "Bar Gig", "Club Night", "Tribute Show", "Function Band", "Dance Event", "Karaoke Night", "Acoustic Set", "Live Concert"],
            "Backing Vocals": ["Wedding Reception", "Corporate Event", "Private Party", "Restaurant Performance", "Bar Gig", "Club Night", "Tribute Show", "Function Band", "Dance Event", "Live Concert", "Recording Session", "Acoustic Set"],
            "Electric Keyboard": ["Wedding Reception", "Corporate Event", "Restaurant Performance", "Private Party", "Hotel Lobby", "Jazz Club", "Cocktail Hour", "Background Music", "Function Band", "Dance Event", "Bar Gig", "Club Night"],
            "Synthesizer": ["Wedding Reception", "Corporate Event", "Function Band", "Dance Event", "Club Night", "Electronic Music", "Pop Concert", "Tribute Show", "Private Party", "Bar Gig", "Music Festival", "Studio Session"],
            "DJ": ["Wedding Reception", "Corporate Event", "Private Party", "Club Night", "Dance Event", "Birthday Party", "Bar Gig", "Music Festival", "Function Event", "Cocktail Hour", "Background Music", "Youth Event"],
            "Laptop": ["DJ Set", "Electronic Music", "Club Night", "Dance Event", "Corporate Event", "Private Party", "Music Festival", "Bar Gig", "Background Music", "Cocktail Hour", "Function Event", "Youth Event"],
            // Additional instruments from comprehensive CSV
            "Viola": ["Wedding Ceremony", "Classical Concert", "Chamber Music", "String Quartet", "Corporate Event", "Private Party", "Restaurant Performance", "Art Gallery", "Wine Tasting", "Funeral Service", "Church Service", "Cocktail Hour"],
            "Classical Guitar": ["Wedding Ceremony", "Classical Concert", "Chamber Music", "Corporate Event", "Private Party", "Restaurant Performance", "Art Gallery", "Wine Tasting", "Cocktail Hour", "Garden Party", "Background Music", "Acoustic Set"],
            "Banjo": ["Folk Festival", "Country Music", "Bluegrass Event", "Wedding Reception", "Private Party", "Restaurant Performance", "Acoustic Set", "Street Performance", "Cultural Event", "Barn Dance", "Outdoor Event", "Community Festival"],
            "Mandolin": ["Folk Festival", "Bluegrass Event", "Wedding Ceremony", "Private Party", "Restaurant Performance", "Acoustic Set", "Chamber Music", "Cultural Event", "Garden Party", "Wine Tasting", "Art Gallery", "Background Music"],
            "Ukulele": ["Wedding Reception", "Private Party", "Beach Event", "Restaurant Performance", "Coffee Shop", "Acoustic Set", "Children's Event", "Garden Party", "Cultural Event", "Street Performance", "Folk Festival", "Background Music"],
            "Bagpipes": ["Wedding Ceremony", "Cultural Event", "Military Event", "Funeral Service", "Highland Games", "Festival", "St. Patrick's Day", "Burns Night", "Parade", "Memorial Service", "Traditional Event", "Outdoor Ceremony"],
            "Accordion": ["Folk Festival", "Cultural Event", "Oktoberfest", "Wedding Reception", "Private Party", "Restaurant Performance", "Dance Event", "Polka Night", "European Event", "Street Performance", "Community Festival", "Traditional Music"],
            "Harmonica": ["Blues Club", "Folk Festival", "Acoustic Set", "Street Performance", "Restaurant Performance", "Private Party", "Country Music", "Campfire Event", "Busking", "Bar Gig", "Jam Session", "Cultural Event"],
            "Tabla": ["World Music", "Cultural Event", "Indian Wedding", "Meditation Event", "Spiritual Event", "Private Party", "Restaurant Performance", "Art Gallery", "Wine Tasting", "Festival", "Academic Event", "Cultural Center"],
            "Sitar": ["World Music", "Cultural Event", "Indian Wedding", "Meditation Event", "Spiritual Event", "Private Party", "Restaurant Performance", "Art Gallery", "Wine Tasting", "Festival", "Academic Event", "Cultural Center"],
            "Didgeridoo": ["World Music", "Cultural Event", "Meditation Event", "Spiritual Event", "Private Party", "Restaurant Performance", "Art Gallery", "Wine Tasting", "Festival", "Academic Event", "Cultural Center", "Outdoor Event"],
            "Kalimba": ["World Music", "Meditation Event", "Spiritual Event", "Private Party", "Restaurant Performance", "Art Gallery", "Wine Tasting", "Background Music", "Acoustic Set", "Cultural Event", "Therapy Session", "Relaxation Event"],
            "Hang Drum": ["World Music", "Meditation Event", "Spiritual Event", "Private Party", "Restaurant Performance", "Art Gallery", "Wine Tasting", "Background Music", "Acoustic Set", "Cultural Event", "Therapy Session", "Relaxation Event"],
            "Singing Bowl": ["Meditation Event", "Spiritual Event", "Yoga Class", "Therapy Session", "Relaxation Event", "Private Party", "Art Gallery", "Wine Tasting", "Background Music", "Cultural Event", "Healing Session", "Wellness Event"],
          };
          
          const allSuggestions = instruments.flatMap(instrument => 
            suggestions[instrument] || ["Live Performance", "Private Event", "Corporate Function", "Background Music"]
          );
          
          // Remove duplicates and return unique suggestions
          const uniqueSuggestions = Array.from(new Set(allSuggestions));
          resolve(uniqueSuggestions.slice(0, 12)); // Increased to 12 suggestions
        }, 1000);
      });
      
      return mockSuggestions;
    } catch (error) {
      console.error('Error generating gig types:', error);
      toast({
        title: "Error",
        description: "Failed to generate gig types. Please try again.",
        variant: "destructive",
      });
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
    form.setValue('selectedInstruments', newSelectedInstruments);
    
    // Generate new gig types based on selected instruments
    if (newSelectedInstruments.length > 0) {
      const newGigTypes = await generateGigTypes(newSelectedInstruments);
      setGigTypes(newGigTypes);
      form.setValue('gigTypes', newGigTypes);
    } else {
      setGigTypes([]);
      form.setValue('gigTypes', []);
    }
  };

  // Handle gig type removal
  const handleRemoveGigType = (gigType: string) => {
    const newGigTypes = gigTypes.filter(gt => gt !== gigType);
    setGigTypes(newGigTypes);
    form.setValue('gigTypes', newGigTypes);
  };

  // Filter instruments based on search
  const filteredInstruments = instrumentSearch 
    ? ALL_INSTRUMENTS.filter(instrument =>
        instrument.toLowerCase().includes(instrumentSearch.toLowerCase())
      )
    : DEFAULT_INSTRUMENTS;

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (data: SettingsFormData) => {
      // Mock API call - replace with actual API endpoint
      return new Promise((resolve) => {
        setTimeout(() => {
          console.log('Saving settings:', data);
          resolve(data);
        }, 1000);
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Settings saved successfully.",
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
    console.log("Form submitted:", data);
    // Include the current selected instruments and gig types
    const formData = {
      ...data,
      selectedInstruments,
      gigTypes,
    };
    saveSettingsMutation.mutate(formData);
  };

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <span>Loading settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold">Settings</h1>
            {isMobile && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden"
              >
                <Menu className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-4 overflow-y-auto">
            
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
                          <Input placeholder="Enter your business name" {...field} />
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
                        <FormLabel>Email From Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your email display name" {...field} />
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
                      <FormLabel>Business Address</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter your business address" {...field} />
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
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your phone number" {...field} />
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
                        <FormLabel>Website (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="https://your-website.com" {...field} />
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
                        <FormLabel>Tax Number (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your tax number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Payment & Banking */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment & Banking
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="nextInvoiceNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Next Invoice Number</FormLabel>
                      <FormControl>
                        <Input placeholder="00001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bankDetails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank Details</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter your bank details" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Contract & Legal */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Contract & Legal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="defaultTerms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Contract Terms</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter default contract terms..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Musical Services */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Music className="h-5 w-5" />
                  Musical Services
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">Instruments You Play</h3>
                    <div className="flex items-center gap-2">
                      <Search className="h-4 w-4 text-gray-500" />
                      <Input
                        placeholder="Search instruments..."
                        value={instrumentSearch}
                        onChange={(e) => setInstrumentSearch(e.target.value)}
                        className="w-48"
                      />
                    </div>
                  </div>
                  
                  <div className="max-h-60 overflow-y-auto border rounded-lg p-4">
                    {filteredInstruments.map((instrument) => (
                      <Button
                        key={instrument}
                        type="button"
                        variant={selectedInstruments.includes(instrument) ? "default" : "ghost"}
                        size="sm"
                        onClick={() => handleInstrumentToggle(instrument)}
                        className="mr-2 mb-2"
                      >
                        {selectedInstruments.includes(instrument) ? (
                          <X className="h-3 w-3 mr-1" />
                        ) : (
                          <Plus className="h-3 w-3 mr-1" />
                        )}
                        {instrument}
                      </Button>
                    ))}
                  </div>
                </div>

                {selectedInstruments.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Selected Instruments:</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedInstruments.map((instrument) => (
                        <Badge key={instrument} variant="secondary" className="px-2 py-1">
                          {instrument}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleInstrumentToggle(instrument)}
                            className="ml-1 h-auto p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">Suggested Gig Types</h3>
                    {isGeneratingGigTypes && (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Generating...</span>
                      </div>
                    )}
                  </div>
                  
                  {gigTypes.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {gigTypes.map((gigType) => (
                        <Badge key={gigType} variant="outline" className="px-2 py-1">
                          {gigType}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveGigType(gigType)}
                            className="ml-1 h-auto p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  {selectedInstruments.length === 0 && (
                    <p className="text-sm text-gray-500">Select instruments to see suggested gig types.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button 
                type="submit" 
                size="lg" 
                className="min-w-32"
                disabled={saveSettingsMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {saveSettingsMutation.isPending ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
      
      {isMobile && <MobileNav />}
    </div>
  );
}