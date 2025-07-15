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
import { Building, Save, MapPin, Globe, Hash, CreditCard, FileText, User, Music, Settings as SettingsIcon, X, Plus, Search, Loader2 } from "lucide-react";

// Available instruments from the CSV
const AVAILABLE_INSTRUMENTS = [
  "Violin", "Cello", "Double Bass", "Electric Guitar", "Acoustic Guitar", "Bass Guitar",
  "Flute", "Clarinet", "Alto Saxophone", "Tenor Saxophone", "Baritone Saxophone",
  "Trumpet", "Trombone", "French Horn", "Tuba", "Piano", "Electric Keyboard", 
  "Synthesizer", "Drum Kit", "Cajón", "Congas", "Bongos", "Djembe", "Tambourine",
  "Triangle", "Lead Vocals", "Backing Vocals", "DJ Controller", "Laptop", "Sampler"
];

// Schema for form validation
const settingsFormSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  businessAddress: z.string().min(1, "Business address is required"),
  phone: z.string().min(1, "Phone number is required"),
  website: z.string().optional(),
  taxNumber: z.string().optional(),
  emailFromName: z.string().min(1, "Email from name is required"),
  nextInvoiceNumber: z.string().min(1, "Next invoice number is required"),
  defaultTerms: z.string().optional(),
  bankDetails: z.string().optional(),
  selectedInstruments: z.array(z.string()).optional(),
  gigTypes: z.array(z.string()).optional(),
});

type SettingsFormData = z.infer<typeof settingsFormSchema>;

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isMobile } = useResponsive();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Test basic form setup
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
    queryKey: ['/api/settings'],
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
      const response = await fetch('/api/gig-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ instruments }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate gig types');
      }
      
      const suggestions = await response.json();
      return suggestions || [];
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
  const filteredInstruments = AVAILABLE_INSTRUMENTS.filter(instrument =>
    instrument.toLowerCase().includes(instrumentSearch.toLowerCase())
  );

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (data: SettingsFormData) => {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save settings');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Settings saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
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

  return (
    <div className="min-h-screen bg-background">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-0'}`}>
        <div className="p-6 lg:p-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold ml-12 md:ml-0">Settings</h1>
            {isMobile && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden"
              >
                <SettingsIcon className="h-4 w-4" />
              </Button>
            )}
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Business Information Section */}
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
                            <Input placeholder="Your name for email sending" {...field} />
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
                          <Textarea placeholder="Enter your full business address" {...field} />
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
                        <FormLabel>Phone Number</FormLabel>
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
                            <Input placeholder="Enter your tax/VAT number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Payment & Banking Section */}
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
                          <Textarea placeholder="Enter your bank details (bank name, account name, sort code, account number)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Contract & Legal Section */}
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
                            placeholder="Enter your standard contract terms and conditions..."
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

              {/* Musical Services Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Music className="h-5 w-5" />
                    Musical Services
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Instruments Selection */}
                  <div className="space-y-3">
                    <Label>Instruments You Play</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search instruments..."
                        value={instrumentSearch}
                        onChange={(e) => setInstrumentSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    
                    {/* Available Instruments - Filterable Chips */}
                    <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
                      {filteredInstruments.map((instrument) => (
                        <Button
                          key={instrument}
                          type="button"
                          variant={selectedInstruments.includes(instrument) ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleInstrumentToggle(instrument)}
                          className="text-sm"
                        >
                          {selectedInstruments.includes(instrument) ? (
                            <>
                              <X className="h-3 w-3 mr-1" />
                              {instrument}
                            </>
                          ) : (
                            <>
                              <Plus className="h-3 w-3 mr-1" />
                              {instrument}
                            </>
                          )}
                        </Button>
                      ))}
                    </div>

                    {/* Selected Instruments - Removable Tags */}
                    {selectedInstruments.length > 0 && (
                      <div className="space-y-2">
                        <Label>Selected Instruments</Label>
                        <div className="flex flex-wrap gap-2">
                          {selectedInstruments.map((instrument) => (
                            <Badge key={instrument} variant="secondary" className="text-sm">
                              {instrument}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleInstrumentToggle(instrument)}
                                className="h-auto p-0 ml-2 hover:bg-transparent"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* AI-Generated Gig Types */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Label>Suggested Gig Types</Label>
                      {isGeneratingGigTypes && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Generating...
                        </div>
                      )}
                    </div>
                    
                    {gigTypes.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {gigTypes.map((gigType) => (
                          <Badge key={gigType} variant="default" className="text-sm">
                            {gigType}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveGigType(gigType)}
                              className="h-auto p-0 ml-2 hover:bg-transparent"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
                        {selectedInstruments.length > 0 
                          ? "Generating gig types based on your instruments..."
                          : "Select instruments above to see suggested gig types"
                        }
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button type="submit" size="lg" className="bg-green-600 hover:bg-green-700" disabled={saveSettingsMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {saveSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>

      {isMobile && <MobileNav />}
    </div>
  );
}