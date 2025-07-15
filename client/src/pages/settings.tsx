import { useState, useEffect } from "react";
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
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { useResponsive } from "@/hooks/useResponsive";
import { Building, Save, MapPin, Globe, Hash, CreditCard, FileText, User, Music, Settings as SettingsIcon, Plus, X, Loader2 } from "lucide-react";

// Schema for form validation
const settingsFormSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  businessEmail: z.string().email("Valid email is required").optional().or(z.literal("")),
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
  customInstruments: z.array(z.string()).optional(),
  customGigTypes: z.array(z.string()).optional(),
  // Additional fields from schema
  defaultSetupTime: z.number().optional(),
  defaultBreakdownTime: z.number().optional(),
  weddingBufferTime: z.number().optional(),
  corporateBufferTime: z.number().optional(),
  defaultBufferTime: z.number().optional(),
  maxTravelDistance: z.number().optional(),
  homePostcode: z.string().optional(),
});

type SettingsFormData = z.infer<typeof settingsFormSchema>;

const defaultInstruments = [
  "Piano", "Guitar", "Saxophone", "Drums", "Vocals", "Violin", 
  "Trumpet", "Bass", "Keyboard", "Cello", "Flute", "Harp", 
  "Trombone", "Clarinet", "Accordion", "Banjo", "Mandolin"
];

const defaultGigTypes = [
  "Wedding Ceremony", "Wedding Reception", "Corporate Event", "Birthday Party", 
  "Anniversary", "Jazz Club", "Private Event", "Restaurant", "Hotel", 
  "Cocktail Party", "Funeral", "Church Service", "Festival", "Concert"
];

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isMobile } = useResponsive();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [customInstrument, setCustomInstrument] = useState("");
  const [customGigType, setCustomGigType] = useState("");
  const [suggestedGigTypes, setSuggestedGigTypes] = useState<string[]>([]);
  const [isGeneratingGigs, setIsGeneratingGigs] = useState(false);

  // Load user settings
  const { data: settings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['/api/settings'],
    queryFn: async () => {
      const response = await fetch('/api/settings');
      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }
      return response.json();
    },
  });

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      businessName: "",
      businessEmail: "",
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
      customGigTypes: [],
      defaultSetupTime: 60,
      defaultBreakdownTime: 30,
      weddingBufferTime: 120,
      corporateBufferTime: 60,
      defaultBufferTime: 90,
      maxTravelDistance: 100,
      homePostcode: "",
    },
  });

  // Update form when settings load
  useEffect(() => {
    if (settings) {
      form.reset({
        businessName: settings.businessName || "",
        businessEmail: settings.businessEmail || "",
        addressLine1: settings.addressLine1 || "",
        addressLine2: settings.addressLine2 || "",
        city: settings.city || "",
        postcode: settings.postcode || "",
        phone: settings.phone || "",
        website: settings.website || "",
        taxNumber: settings.taxNumber || "",
        emailFromName: settings.emailFromName || "",
        nextInvoiceNumber: settings.nextInvoiceNumber?.toString() || "00001",
        contractTerms: settings.contractTerms || "",
        paymentTerms: settings.paymentTerms || "",
        bankName: settings.bankName || "",
        accountName: settings.accountName || "",
        sortCode: settings.sortCode || "",
        accountNumber: settings.accountNumber || "",
        instruments: settings.instruments || [],
        gigTypes: settings.gigTypes || [],
        customInstruments: settings.customInstruments || [],
        customGigTypes: settings.customGigTypes || [],
        defaultSetupTime: settings.defaultSetupTime || 60,
        defaultBreakdownTime: settings.defaultBreakdownTime || 30,
        weddingBufferTime: settings.weddingBufferTime || 120,
        corporateBufferTime: settings.corporateBufferTime || 60,
        defaultBufferTime: settings.defaultBufferTime || 90,
        maxTravelDistance: settings.maxTravelDistance || 100,
        homePostcode: settings.homePostcode || "",
      });
    }
  }, [settings, form]);

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (data: SettingsFormData) => {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          nextInvoiceNumber: parseInt(data.nextInvoiceNumber),
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save settings');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings saved",
        description: "Your business settings have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Generate gig type suggestions based on selected instruments
  const generateGigSuggestions = async (selectedInstruments: string[]) => {
    if (!selectedInstruments.length) {
      setSuggestedGigTypes([]);
      return;
    }

    setIsGeneratingGigs(true);
    try {
      const response = await fetch('/api/suggest-gigs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ instruments: selectedInstruments }),
      });

      if (response.ok) {
        const suggestions = await response.json();
        setSuggestedGigTypes(suggestions);
      }
    } catch (error) {
      console.error('Error generating gig suggestions:', error);
    } finally {
      setIsGeneratingGigs(false);
    }
  };

  // Watch for instrument changes to generate gig suggestions
  const watchedInstruments = form.watch("instruments");
  const watchedCustomInstruments = form.watch("customInstruments");

  useEffect(() => {
    const allInstruments = [...(watchedInstruments || []), ...(watchedCustomInstruments || [])];
    if (allInstruments.length > 0) {
      generateGigSuggestions(allInstruments);
    }
  }, [watchedInstruments, watchedCustomInstruments]);

  const onSubmit = (data: SettingsFormData) => {
    saveSettingsMutation.mutate(data);
  };

  const addCustomInstrument = () => {
    if (customInstrument.trim()) {
      const currentCustom = form.getValues("customInstruments") || [];
      if (!currentCustom.includes(customInstrument.trim())) {
        form.setValue("customInstruments", [...currentCustom, customInstrument.trim()]);
        setCustomInstrument("");
      }
    }
  };

  const removeCustomInstrument = (instrument: string) => {
    const currentCustom = form.getValues("customInstruments") || [];
    form.setValue("customInstruments", currentCustom.filter(i => i !== instrument));
  };

  const addCustomGigType = () => {
    if (customGigType.trim()) {
      const currentCustom = form.getValues("customGigTypes") || [];
      if (!currentCustom.includes(customGigType.trim())) {
        form.setValue("customGigTypes", [...currentCustom, customGigType.trim()]);
        setCustomGigType("");
      }
    }
  };

  const removeCustomGigType = (gigType: string) => {
    const currentCustom = form.getValues("customGigTypes") || [];
    form.setValue("customGigTypes", currentCustom.filter(g => g !== gigType));
  };

  const addSuggestedGigType = (gigType: string) => {
    const currentGigTypes = form.getValues("gigTypes") || [];
    if (!currentGigTypes.includes(gigType)) {
      form.setValue("gigTypes", [...currentGigTypes, gigType]);
    }
  };

  if (isLoadingSettings) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

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
                            {defaultInstruments.map((instrument) => (
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

                  {/* Custom Instruments */}
                  <div className="space-y-2">
                    <Label>Custom Instruments</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add custom instrument"
                        value={customInstrument}
                        onChange={(e) => setCustomInstrument(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addCustomInstrument();
                          }
                        }}
                      />
                      <Button type="button" onClick={addCustomInstrument} size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {form.watch("customInstruments")?.map((instrument) => (
                        <span key={instrument} className="inline-flex items-center gap-1 px-2 py-1 bg-secondary rounded-md text-sm">
                          {instrument}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCustomInstrument(instrument)}
                            className="h-auto p-0 hover:bg-transparent"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="gigTypes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gig Types You Perform</FormLabel>
                        <FormControl>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {defaultGigTypes.map((gigType) => (
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

                  {/* AI Gig Suggestions */}
                  {suggestedGigTypes.length > 0 && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        AI Suggested Gig Types
                        {isGeneratingGigs && <Loader2 className="h-4 w-4 animate-spin" />}
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {suggestedGigTypes.map((gigType) => (
                          <Button
                            key={gigType}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addSuggestedGigType(gigType)}
                            className="text-xs"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            {gigType}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Custom Gig Types */}
                  <div className="space-y-2">
                    <Label>Custom Gig Types</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add custom gig type"
                        value={customGigType}
                        onChange={(e) => setCustomGigType(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addCustomGigType();
                          }
                        }}
                      />
                      <Button type="button" onClick={addCustomGigType} size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {form.watch("customGigTypes")?.map((gigType) => (
                        <span key={gigType} className="inline-flex items-center gap-1 px-2 py-1 bg-secondary rounded-md text-sm">
                          {gigType}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCustomGigType(gigType)}
                            className="h-auto p-0 hover:bg-transparent"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  size="lg" 
                  className="bg-green-600 hover:bg-green-700"
                  disabled={saveSettingsMutation.isPending}
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
      </div>

      {isMobile && <MobileNav />}
    </div>
  );
}