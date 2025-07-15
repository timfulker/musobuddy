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
import { Building, Save, MapPin, Globe, Hash, CreditCard, FileText, User, Music, Settings as SettingsIcon, Plus, X, Loader2, Sparkles, Target } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// Schema for form validation
const settingsFormSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  addressLine1: z.string().min(1, "Address line 1 is required"),
  addressLine2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  postcode: z.string().min(1, "Postcode is required"),
  phone: z.string().min(1, "Phone number is required"),
  website: z.string().optional(),
  taxNumber: z.string().optional(),
  emailFromName: z.string().min(1, "Email from name is required"),
  nextInvoiceNumber: z.string().min(1, "Next invoice number is required"),
  contractTerms: z.string().optional(),
  paymentTerms: z.string().optional(),
  bankName: z.string().optional(),
  accountName: z.string().optional(),
  sortCode: z.string().optional(),
  accountNumber: z.string().optional(),
  instruments: z.array(z.string()).optional(),
  gigTypes: z.array(z.string()).optional(),
  customInstruments: z.array(z.object({
    instrument: z.string(),
    category: z.string(),
    gigTypes: z.array(z.string()),
    isCustom: z.boolean().optional(),
  })).optional(),
  instrumentCategories: z.array(z.object({
    category: z.string(),
    instruments: z.array(z.string()),
  })).optional(),
});

type SettingsFormData = z.infer<typeof settingsFormSchema>;

// Define category colors for visual distinction
const categoryColors = {
  band: 'bg-purple-100 text-purple-800',
  strings: 'bg-green-100 text-green-800',
  woodwind: 'bg-yellow-100 text-yellow-800',
  brass: 'bg-orange-100 text-orange-800',
  percussion: 'bg-red-100 text-red-800',
  keyboards: 'bg-blue-100 text-blue-800',
  vocals: 'bg-pink-100 text-pink-800',
  electronic: 'bg-indigo-100 text-indigo-800',
  custom: 'bg-gray-100 text-gray-800',
};

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isMobile } = useResponsive();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Instrument management state
  const [newInstrument, setNewInstrument] = useState("");
  const [isCategorizingInstrument, setIsCategorizingInstrument] = useState(false);
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);
  const [gigTypes, setGigTypes] = useState<string[]>([]);
  const [isGeneratingGigTypes, setIsGeneratingGigTypes] = useState(false);

  // Fetch existing settings
  const { data: settings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['/api/settings'],
    queryFn: () => fetch('/api/settings').then(res => res.json()),
  });

  // Setup form with loaded data
  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      businessName: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      postcode: "",
      phone: "",
      website: "",
      taxNumber: "",
      emailFromName: "",
      nextInvoiceNumber: "00001",
      contractTerms: "",
      paymentTerms: "",
      bankName: "",
      accountName: "",
      sortCode: "",
      accountNumber: "",
      instruments: [],
      gigTypes: [],
      customInstruments: [],
      instrumentCategories: [],
    },
  });

  // Load settings into form when data is available
  useEffect(() => {
    if (settings) {
      form.reset({
        businessName: settings.businessName || "",
        addressLine1: settings.addressLine1 || "",
        addressLine2: settings.addressLine2 || "",
        city: settings.city || "",
        postcode: settings.postcode || "",
        phone: settings.phone || "",
        website: settings.website || "",
        taxNumber: settings.taxNumber || "",
        emailFromName: settings.emailFromName || "",
        nextInvoiceNumber: settings.nextInvoiceNumber || "00001",
        contractTerms: settings.contractTerms || "",
        paymentTerms: settings.paymentTerms || "",
        bankName: settings.bankName || "",
        accountName: settings.accountName || "",
        sortCode: settings.sortCode || "",
        accountNumber: settings.accountNumber || "",
        instruments: settings.instruments || [],
        gigTypes: settings.gigTypes || [],
        customInstruments: settings.customInstruments || [],
        instrumentCategories: settings.instrumentCategories || [],
      });
      
      // Set local state for instrument management
      setSelectedInstruments(settings.instruments || []);
      setGigTypes(settings.gigTypes || []);
    }
  }, [settings, form]);

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (data: SettingsFormData) => {
      const response = await apiRequest('/api/settings', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({
        title: "Settings saved",
        description: "Your business settings have been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error saving settings",
        description: "Failed to save your settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Add instrument with AI categorization
  const addInstrument = async () => {
    if (!newInstrument.trim()) return;
    
    setIsCategorizingInstrument(true);
    
    try {
      // Check if we already have this instrument in our custom mappings
      const existingCustomInstruments = form.getValues('customInstruments') || [];
      const existingMapping = existingCustomInstruments.find(
        item => item.instrument.toLowerCase() === newInstrument.toLowerCase()
      );
      
      if (existingMapping) {
        // Use existing mapping
        const updatedInstruments = [...selectedInstruments, newInstrument];
        setSelectedInstruments(updatedInstruments);
        form.setValue('instruments', updatedInstruments);
        setNewInstrument("");
        
        toast({
          title: "Instrument added",
          description: `${newInstrument} added using cached categorization.`,
        });
      } else {
        // Call OpenAI API to categorize new instrument
        const response = await apiRequest('/api/instruments/categorize', {
          method: 'POST',
          body: JSON.stringify({ instrument: newInstrument }),
        });
        
        // Save the mapping to prevent future API calls
        const updatedCustomInstruments = [
          ...existingCustomInstruments,
          {
            instrument: newInstrument,
            category: response.category,
            gigTypes: response.gigTypes,
            isCustom: response.isCustom || false,
          }
        ];
        
        form.setValue('customInstruments', updatedCustomInstruments);
        
        // Add to selected instruments
        const updatedInstruments = [...selectedInstruments, newInstrument];
        setSelectedInstruments(updatedInstruments);
        form.setValue('instruments', updatedInstruments);
        
        setNewInstrument("");
        
        toast({
          title: "Instrument categorized",
          description: `${newInstrument} categorized as ${response.category} with ${response.gigTypes.length} suggested gig types.`,
        });
      }
    } catch (error) {
      toast({
        title: "Error adding instrument",
        description: "Failed to categorize instrument. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCategorizingInstrument(false);
    }
  };

  // Generate gig types based on selected instruments
  const generateGigTypes = async () => {
    if (selectedInstruments.length === 0) return;
    
    setIsGeneratingGigTypes(true);
    
    try {
      const response = await apiRequest('/api/instruments/gig-types', {
        method: 'POST',
        body: JSON.stringify({ instruments: selectedInstruments }),
      });
      
      setGigTypes(response.gigTypes);
      form.setValue('gigTypes', response.gigTypes);
      
      toast({
        title: "Gig types generated",
        description: `Generated ${response.gigTypes.length} gig types based on your instruments.`,
      });
    } catch (error) {
      toast({
        title: "Error generating gig types",
        description: "Failed to generate gig types. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingGigTypes(false);
    }
  };

  // Remove instrument
  const removeInstrument = (instrumentToRemove: string) => {
    const updatedInstruments = selectedInstruments.filter(inst => inst !== instrumentToRemove);
    setSelectedInstruments(updatedInstruments);
    form.setValue('instruments', updatedInstruments);
  };

  // Get category for instrument
  const getInstrumentCategory = (instrument: string) => {
    const customInstruments = form.getValues('customInstruments') || [];
    const mapping = customInstruments.find(item => item.instrument === instrument);
    return mapping?.category || 'custom';
  };

  const onSubmit = (data: SettingsFormData) => {
    saveSettingsMutation.mutate(data);
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
                    name="addressLine1"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address Line 1</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your street address" {...field} />
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

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your city" {...field} />
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
                            <Input placeholder="Enter your postcode" {...field} />
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
                  </div>

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

              {/* Instrument Management Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Music className="h-5 w-5" />
                    Instrument Management
                    <Sparkles className="h-4 w-4 text-purple-500" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Add New Instrument */}
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder="Enter instrument name (e.g., saxophone, violin, piano)"
                        value={newInstrument}
                        onChange={(e) => setNewInstrument(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addInstrument()}
                      />
                    </div>
                    <Button 
                      type="button"
                      onClick={addInstrument}
                      disabled={!newInstrument.trim() || isCategorizingInstrument}
                    >
                      {isCategorizingInstrument ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      {isCategorizingInstrument ? 'Categorizing...' : 'Add Instrument'}
                    </Button>
                  </div>

                  {/* Selected Instruments Display */}
                  {selectedInstruments.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Your Instruments</Label>
                      <div className="flex flex-wrap gap-2">
                        {selectedInstruments.map((instrument) => {
                          const category = getInstrumentCategory(instrument);
                          return (
                            <Badge
                              key={instrument}
                              variant="secondary"
                              className={`${categoryColors[category as keyof typeof categoryColors]} flex items-center gap-1`}
                            >
                              {instrument}
                              <button
                                type="button"
                                onClick={() => removeInstrument(instrument)}
                                className="ml-1 hover:bg-black/10 rounded-full p-0.5"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Generate Gig Types */}
                  {selectedInstruments.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">AI-Generated Gig Types</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={generateGigTypes}
                          disabled={isGeneratingGigTypes}
                        >
                          {isGeneratingGigTypes ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Target className="h-4 w-4 mr-2" />
                          )}
                          {isGeneratingGigTypes ? 'Generating...' : 'Generate Gig Types'}
                        </Button>
                      </div>
                      
                      {gigTypes.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {gigTypes.map((gigType) => (
                            <Badge
                              key={gigType}
                              variant="outline"
                              className="bg-blue-50 text-blue-700 border-blue-200"
                            >
                              {gigType}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Helpful information */}
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <Sparkles className="h-4 w-4 inline mr-1" />
                      Add your instruments to get AI-powered categorization and personalized gig type suggestions.
                      Each instrument is automatically sorted into musical categories for better organization.
                    </p>
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
                    name="paymentTerms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Terms</FormLabel>
                        <FormControl>
                          <Textarea placeholder="e.g., Payment due within 30 days of invoice date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="bankName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bank Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your bank name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="accountName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter account holder name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="sortCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sort Code</FormLabel>
                          <FormControl>
                            <Input placeholder="12-34-56" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="accountNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Number</FormLabel>
                          <FormControl>
                            <Input placeholder="12345678" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
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
                    name="contractTerms"
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
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="instruments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Instruments You Play</FormLabel>
                        <FormControl>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {["Piano", "Guitar", "Saxophone", "Drums", "Vocals", "Violin", "Trumpet", "Bass"].map((instrument) => (
                              <div key={instrument} className="flex items-center space-x-2">
                                <Checkbox
                                  id={instrument}
                                  checked={field.value?.includes(instrument)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      field.onChange([...(field.value || []), instrument]);
                                    } else {
                                      field.onChange(field.value?.filter((v: string) => v !== instrument));
                                    }
                                  }}
                                />
                                <Label htmlFor={instrument} className="text-sm">{instrument}</Label>
                              </div>
                            ))}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="gigTypes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gig Types</FormLabel>
                        <FormControl>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {["Wedding", "Corporate", "Birthday Party", "Jazz Club", "Private Event", "Restaurant"].map((gigType) => (
                              <div key={gigType} className="flex items-center space-x-2">
                                <Checkbox
                                  id={gigType}
                                  checked={field.value?.includes(gigType)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      field.onChange([...(field.value || []), gigType]);
                                    } else {
                                      field.onChange(field.value?.filter((v: string) => v !== gigType));
                                    }
                                  }}
                                />
                                <Label htmlFor={gigType} className="text-sm">{gigType}</Label>
                              </div>
                            ))}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button type="submit" size="lg" className="bg-green-600 hover:bg-green-700">
                  <Save className="h-4 w-4 mr-2" />
                  Save Settings
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