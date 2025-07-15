import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Building, Save, MapPin, Globe, Hash, CreditCard, FileText, User, Music, Settings as SettingsIcon, Plus, X, Loader2, Sparkles, Target, Check, RefreshCw } from "lucide-react";
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

type InstrumentObj = {
  instrument: string;
  category: string;
  gigTypes: string[];
  isCustom?: boolean;
};

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isMobile } = useResponsive();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Instrument management state
  const [selectedInstruments, setSelectedInstruments] = useState<InstrumentObj[]>([]);
  const [newInstrument, setNewInstrument] = useState("");
  const [isCategorizingInstrument, setIsCategorizingInstrument] = useState(false);
  
  const [gigTypes, setGigTypes] = useState<Array<{
    title: string;
    description: string;
    isCustom?: boolean;
  }>>([]);
  const [isGeneratingGigTypes, setIsGeneratingGigTypes] = useState(false);
  const [newGigType, setNewGigType] = useState({ title: "", description: "" });

  // Predefined instrument data from CSV
  const instrumentData = [
    { instrument: "Violin", category: "strings" },
    { instrument: "Cello", category: "strings" },
    { instrument: "Double Bass", category: "strings" },
    { instrument: "Electric Guitar", category: "strings" },
    { instrument: "Acoustic Guitar", category: "strings" },
    { instrument: "Bass Guitar", category: "strings" },
    { instrument: "Flute", category: "woodwind" },
    { instrument: "Clarinet", category: "woodwind" },
    { instrument: "Alto Saxophone", category: "woodwind" },
    { instrument: "Tenor Saxophone", category: "woodwind" },
    { instrument: "Baritone Saxophone", category: "woodwind" },
    { instrument: "Trumpet", category: "brass" },
    { instrument: "Trombone", category: "brass" },
    { instrument: "French Horn", category: "brass" },
    { instrument: "Tuba", category: "brass" },
    { instrument: "Piano", category: "keyboards" },
    { instrument: "Electric Keyboard", category: "keyboards" },
    { instrument: "Synthesizer", category: "keyboards" },
    { instrument: "Drum Kit", category: "percussion" },
    { instrument: "Cajón", category: "percussion" },
    { instrument: "Congas", category: "percussion" },
    { instrument: "Bongos", category: "percussion" },
    { instrument: "Djembe", category: "percussion" },
    { instrument: "Tambourine", category: "percussion" },
    { instrument: "Triangle", category: "percussion" },
    { instrument: "Lead Vocals", category: "vocals" },
    { instrument: "Backing Vocals", category: "vocals" },
    { instrument: "DJ Controller", category: "electronic" },
    { instrument: "Laptop", category: "electronic" },
    { instrument: "Sampler", category: "electronic" }
  ];

  // Group instruments by category
  const instrumentsByCategory = instrumentData.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item.instrument);
    return acc;
  }, {} as Record<string, string[]>);

  // Handle instrument selection from predefined list
  const handleInstrumentToggle = (instrument: string) => {
    const instrumentData = instrumentData.find(item => item.instrument === instrument);
    const instrumentObj: InstrumentObj = {
      instrument,
      category: instrumentData?.category || 'custom',
      gigTypes: [],
      isCustom: false
    };

    setSelectedInstruments(prev => {
      const isSelected = prev.some(item => item.instrument === instrument);
      if (isSelected) {
        return prev.filter(item => item.instrument !== instrument);
      } else {
        return [...prev, instrumentObj];
      }
    });
  };

  // Add custom gig type
  const addCustomGigType = () => {
    if (newGigType.title.trim() && newGigType.description.trim()) {
      setGigTypes(prev => [...prev, {
        ...newGigType,
        isCustom: true
      }]);
      setNewGigType({ title: "", description: "" });
      toast({
        title: "Custom gig type added",
        description: "Your custom gig type has been added successfully.",
      });
    }
  };

  // Delete gig type
  const deleteGigType = (index: number) => {
    setGigTypes(prev => prev.filter((_, i) => i !== index));
  };

  // Edit gig type
  const editGigType = (index: number, field: 'title' | 'description', value: string) => {
    setGigTypes(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

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
      if (settings.customInstruments) {
        setSelectedInstruments(settings.customInstruments);
      }
      if (settings.gigTypes) {
        setGigTypes(settings.gigTypes);
      }
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
        const instrumentObj: InstrumentObj = {
          instrument: newInstrument,
          category: existingMapping.category,
          gigTypes: existingMapping.gigTypes,
          isCustom: existingMapping.isCustom || false,
        };
        const updatedInstruments = [...selectedInstruments, instrumentObj];
        setSelectedInstruments(updatedInstruments);
        form.setValue('instruments', updatedInstruments.map(i => i.instrument));
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
        const instrumentObj: InstrumentObj = {
          instrument: newInstrument,
          category: response.category,
          gigTypes: response.gigTypes,
          isCustom: response.isCustom || false,
        };
        const updatedInstruments = [...selectedInstruments, instrumentObj];
        setSelectedInstruments(updatedInstruments);
        form.setValue('instruments', updatedInstruments.map(i => i.instrument));
        
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
      form.setValue('gigTypes', response.gigTypes.map((gt: any) => gt.title));
      
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
  const removeInstrument = (index: number) => {
    const updatedInstruments = selectedInstruments.filter((_, i) => i !== index);
    setSelectedInstruments(updatedInstruments);
    form.setValue('instruments', updatedInstruments.map(i => i.instrument));
  };

  // Get category color for badges
  const getCategoryColor = (category: string) => {
    return categoryColors[category as keyof typeof categoryColors] || categoryColors.custom;
  };

  // Handle adding instrument
  const handleAddInstrument = () => {
    addInstrument();
  };

  // Handle generating gig types
  const handleGenerateGigTypes = () => {
    generateGigTypes();
  };

  const onSubmit = (data: SettingsFormData) => {
    // Update form data with current state
    const updatedData = {
      ...data,
      instruments: selectedInstruments.map(i => i.instrument),
      customInstruments: selectedInstruments,
      gigTypes: gigTypes.map(gt => gt.title),
    };
    saveSettingsMutation.mutate(updatedData);
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

              {/* Instrument Selection and AI Gig Type Generation */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Music className="w-5 h-5" />
                    Instrument Selection & AI Gig Types
                  </CardTitle>
                  <CardDescription>
                    Select your instruments and let AI generate personalized gig types for your business
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Instrument Selection */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Select Your Instruments</Label>
                    <div className="space-y-4">
                      {Object.entries(instrumentsByCategory).map(([category, instruments]) => (
                        <div key={category} className="space-y-2">
                          <h4 className="text-sm font-medium text-muted-foreground capitalize">{category}</h4>
                          <div className="flex flex-wrap gap-2">
                            {instruments.map((instrument) => (
                              <Button
                                key={instrument}
                                variant={selectedInstruments.some(item => item.instrument === instrument) ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleInstrumentToggle(instrument)}
                                className="h-8 text-xs"
                              >
                                {selectedInstruments.some(item => item.instrument === instrument) && <Check className="w-3 h-3 mr-1" />}
                                {instrument}
                              </Button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Add Custom Instrument */}
                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="h-5 w-5 text-purple-500" />
                      <h3 className="font-semibold">Add Custom Instrument</h3>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter instrument name (e.g., didgeridoo, harmonica, ukulele)"
                        value={newInstrument}
                        onChange={(e) => setNewInstrument(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        onClick={handleAddInstrument}
                        disabled={!newInstrument.trim() || isCategorizingInstrument}
                        className="shrink-0"
                      >
                        {isCategorizingInstrument ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Categorizing...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Instrument
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Selected Instruments Display */}
                  {selectedInstruments.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Selected Instruments ({selectedInstruments.length})</Label>
                      <div className="space-y-2">
                        {selectedInstruments.map((instrumentObj, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className={getCategoryColor(instrumentObj.category)}>
                                {instrumentObj.category}
                              </Badge>
                              <span className="font-medium">{instrumentObj.instrument}</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeInstrument(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Generate Gig Types Button */}
                  <Button
                    onClick={generateGigTypes}
                    disabled={selectedInstruments.length === 0 || isGeneratingGigTypes}
                    className="w-full"
                  >
                    {isGeneratingGigTypes ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating Gig Types...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate AI Gig Types
                      </>
                    )}
                  </Button>

                  {/* Generated Gig Types */}
                  {gigTypes.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Your Gig Types ({gigTypes.length})</Label>
                        <Button
                          onClick={generateGigTypes}
                          disabled={isGeneratingGigTypes}
                          variant="outline"
                          size="sm"
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Regenerate
                        </Button>
                      </div>
                      
                      <div className="space-y-3">
                        {gigTypes.map((gigType, index) => (
                          <Card key={index} className="p-3">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Input
                                  value={gigType.title}
                                  onChange={(e) => editGigType(index, 'title', e.target.value)}
                                  className="font-medium"
                                  placeholder="Gig type title"
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteGigType(index)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                              <Textarea
                                value={gigType.description}
                                onChange={(e) => editGigType(index, 'description', e.target.value)}
                                placeholder="Gig type description"
                                className="min-h-[60px]"
                              />
                              {gigType.isCustom && (
                                <Badge variant="outline" className="text-xs">
                                  Custom
                                </Badge>
                              )}
                            </div>
                          </Card>
                        ))}
                      </div>

                      {/* Add Custom Gig Type */}
                      <Card className="p-3 border-dashed">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Plus className="w-4 h-4" />
                            <Label className="text-sm font-medium">Add Custom Gig Type</Label>
                          </div>
                          <Input
                            value={newGigType.title}
                            onChange={(e) => setNewGigType(prev => ({ ...prev, title: e.target.value }))}
                            placeholder="Enter custom gig type title"
                          />
                          <Textarea
                            value={newGigType.description}
                            onChange={(e) => setNewGigType(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Enter custom gig type description"
                            className="min-h-[60px]"
                          />
                          <Button
                            onClick={addCustomGigType}
                            disabled={!newGigType.title.trim() || !newGigType.description.trim()}
                            size="sm"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add Custom Gig Type
                          </Button>
                        </div>
                      </Card>
                    </div>
                  )}

                  {/* Helpful information */}
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <Sparkles className="h-4 w-4 inline mr-1" />
                      Select your instruments to get AI-powered gig type suggestions. Each gig type includes a title and description that can be used to autofill enquiries and contracts.
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