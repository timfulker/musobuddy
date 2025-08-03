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
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { useResponsive } from "@/hooks/useResponsive";
import { Building, Save, MapPin, Globe, Hash, CreditCard, Loader2, Menu, Eye, ChevronDown, ChevronRight, Mail, Settings as SettingsIcon, Music, ExternalLink, Copy, Link, Palette } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useTheme, themes, type ThemeName } from "@/hooks/useTheme";

// Import instrument presets
import { INSTRUMENT_GIG_PRESETS, getGigTypeNamesForInstrument, getAvailableInstruments, getInstrumentDisplayName } from "../../../shared/instrument-gig-presets";

// Schema for form validation - includes all fields we want to save
const settingsSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  businessEmail: z.string().email("Valid email is required"),
  phone: z.string().min(1, "Phone number is required"),
  addressLine1: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  postcode: z.string().min(1, "Postcode is required"),
  country: z.string().min(1, "Country is required"),
  bankDetails: z.string().optional(),
  paymentTerms: z.string().optional(),
  defaultGigTypes: z.array(z.string()).optional(),
  selectedInstruments: z.array(z.string()).optional(),
  // Essential contract/invoice theme fields
  contractTheme: z.enum(['professional', 'friendly', 'musical']).default('professional'),
  invoiceTheme: z.enum(['professional', 'friendly', 'musical']).default('professional'),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

// Widget URL generator
const generateWidgetUrl = (token: string): string => {
  const baseUrl = window.location.origin;
  return `${baseUrl}/widget/${token}`;
};

// QR Code generator
const generateQRCode = (url: string): string => {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
};

// Copy to clipboard helper
const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
};

export default function Settings() {
  const { isMobile } = useResponsive();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Theme hook for app theme
  const { theme: currentTheme, setTheme } = useTheme();

  // Local state for UI sections
  const [expandedSections, setExpandedSections] = useState({
    business: true,
    instruments: false,
    gigTypes: false,
    widget: false,
    appThemes: false,
  });

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);
  const [selectedGigTypes, setSelectedGigTypes] = useState<string[]>([]);
  const [widgetToken, setWidgetToken] = useState<string>('');
  const [widgetUrl, setWidgetUrl] = useState<string>('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  // Initialize form
  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      businessName: "",
      businessEmail: "",
      phone: "",
      addressLine1: "",
      city: "",
      postcode: "",
      country: "",
      bankDetails: "",
      paymentTerms: "",
      defaultGigTypes: [],
      selectedInstruments: [],
      contractTheme: 'professional',
      invoiceTheme: 'professional',
    },
  });

  // Fetch user settings
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['/api/settings'],
    queryFn: async () => {
      const response = await fetch('/api/settings');
      if (!response.ok) throw new Error('Failed to fetch settings');
      return response.json();
    },
  });

  // Update form when settings load
  useEffect(() => {
    if (settings) {
      form.reset({
        businessName: settings.businessName || "",
        businessEmail: settings.businessEmail || "",
        phone: settings.phone || "",
        addressLine1: settings.addressLine1 || "",
        city: settings.city || "",
        postcode: settings.postcode || "",
        country: settings.country || "",
        bankDetails: settings.bankDetails || "",
        paymentTerms: settings.paymentTerms || "",
        defaultGigTypes: settings.defaultGigTypes || [],
        selectedInstruments: settings.selectedInstruments || [],
        contractTheme: settings.contractTheme || 'professional',
        invoiceTheme: settings.invoiceTheme || 'professional',
      });
      
      setSelectedInstruments(settings.selectedInstruments || []);
      setSelectedGigTypes(settings.defaultGigTypes || []);
    }
  }, [settings, form]);

  // Load widget token
  useEffect(() => {
    const loadWidgetToken = async () => {
      try {
        const response = await fetch('/api/get-widget-token');
        if (response.ok) {
          const data = await response.json();
          if (data.token) {
            setWidgetToken(data.token);
            const url = generateWidgetUrl(data.token);
            setWidgetUrl(url);
            setQrCodeUrl(generateQRCode(url));
          }
        }
      } catch (error) {
        console.error('Failed to load widget token:', error);
      }
    };
    loadWidgetToken();
  }, []);

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (data: SettingsFormData) => {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to save settings');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings saved",
        description: "Your settings have been updated successfully.",
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

  // Generate widget token mutation
  const generateTokenMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/generate-widget-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to generate token');
      return response.json();
    },
    onSuccess: (data) => {
      setWidgetToken(data.token);
      const url = generateWidgetUrl(data.token);
      setWidgetUrl(url);
      setQrCodeUrl(generateQRCode(url));
      toast({
        title: "Widget token generated",
        description: "New booking widget token created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate widget token.",
        variant: "destructive",
      });
    },
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleInstrumentChange = (instrument: string, checked: boolean) => {
    const currentInstruments = selectedInstruments || [];
    const updatedInstruments = checked
      ? [...currentInstruments, instrument]
      : currentInstruments.filter(i => i !== instrument);
    
    setSelectedInstruments(updatedInstruments);
    form.setValue('selectedInstruments', updatedInstruments);
    
    // Update available gig types based on selected instruments
    const availableGigTypes = Array.isArray(updatedInstruments) 
      ? updatedInstruments.flatMap(inst => getGigTypeNamesForInstrument(inst) || [])
      : [];
    const currentGigTypes = selectedGigTypes || [];
    const filteredGigTypes = currentGigTypes.filter(gt => 
      availableGigTypes.includes(gt)
    );
    setSelectedGigTypes(filteredGigTypes);
    form.setValue('defaultGigTypes', filteredGigTypes);
  };

  const handleGigTypeChange = (gigType: string, checked: boolean) => {
    const currentGigTypes = selectedGigTypes || [];
    const updatedGigTypes = checked
      ? [...currentGigTypes, gigType]
      : currentGigTypes.filter(gt => gt !== gigType);
    
    setSelectedGigTypes(updatedGigTypes);
    form.setValue('defaultGigTypes', updatedGigTypes);
  };

  const getAvailableGigTypes = () => {
    const instruments = selectedInstruments || [];
    if (!Array.isArray(instruments) || instruments.length === 0) {
      return [];
    }
    return instruments.flatMap(instrument => 
      getGigTypeNamesForInstrument(instrument) || []
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Widget URL copied to clipboard.",
    });
  };

  const onSubmit = (data: SettingsFormData) => {
    saveSettingsMutation.mutate(data);
  };

  if (settingsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile navigation */}
      {isMobile && (
        <div className="lg:hidden">
          <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Settings</h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
            >
              <Menu className="w-5 h-5" />
            </Button>
          </div>
          {mobileNavOpen && (
            <MobileNav onNavigate={() => setMobileNavOpen(false)} />
          )}
        </div>
      )}

      <div className="flex">
        {/* Desktop sidebar */}
        {!isMobile && (
          <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 min-h-screen">
            <Sidebar />
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 p-4 lg:p-8">
          <div className="max-w-4xl mx-auto">
            {!isMobile && (
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  Settings
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Manage your business information, preferences, and integrations
                </p>
              </div>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                {/* Business Information */}
                <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
                  <Collapsible open={expandedSections.business} onOpenChange={() => toggleSection('business')}>
                    <CollapsibleTrigger className="w-full">
                      <CardHeader className="border-b border-gray-100 dark:border-slate-700 pb-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                        <CardTitle className="flex items-center justify-between text-lg">
                          <div className="flex items-center space-x-2">
                            <Building className="w-5 h-5 text-primary" />
                            <span>Business Information</span>
                          </div>
                          {expandedSections.business ? 
                            <ChevronDown className="w-5 h-5 text-gray-400" /> : 
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          }
                        </CardTitle>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-2 text-left">
                          Your business details for contracts and invoices
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField
                            control={form.control}
                            name="businessName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Business Name</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Your business or stage name" />
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
                                  <Input {...field} type="email" placeholder="business@example.com" />
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
                                  <Input {...field} placeholder="+44 7123 456789" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="addressLine1"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Address</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="123 Main Street" />
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
                                  <Input {...field} placeholder="London" />
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
                                  <Input {...field} placeholder="SW1A 1AA" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="country"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Country</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="United Kingdom" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-1 gap-6 mt-6">
                          <FormField
                            control={form.control}
                            name="bankDetails"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Bank Details (Optional)</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    {...field} 
                                    placeholder="Sort Code: 12-34-56&#10;Account Number: 12345678&#10;Account Name: Your Business Name"
                                    rows={3}
                                  />
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
                                <FormLabel>Payment Terms (Optional)</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    {...field} 
                                    placeholder="Payment due within 30 days of invoice date..."
                                    rows={3}
                                  />
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

                {/* Theme Selection */}
                <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
                  <CardHeader className="border-b border-gray-100 dark:border-slate-700 pb-4">
                    <CardTitle className="flex items-center space-x-2 text-lg">
                      <Palette className="w-5 h-5 text-primary" />
                      <span>Document Themes</span>
                    </CardTitle>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      Choose themes for your contracts and invoices
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="contractTheme"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contract Theme</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select contract theme" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="professional">Professional</SelectItem>
                                <SelectItem value="friendly">Friendly</SelectItem>
                                <SelectItem value="musical">Musical</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="invoiceTheme"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Invoice Theme</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select invoice theme" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="professional">Professional</SelectItem>
                                <SelectItem value="friendly">Friendly</SelectItem>
                                <SelectItem value="musical">Musical</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Instrument Selection */}
                <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
                  <Collapsible open={expandedSections.instruments} onOpenChange={() => toggleSection('instruments')}>
                    <CollapsibleTrigger className="w-full">
                      <CardHeader className="border-b border-gray-100 dark:border-slate-700 pb-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                        <CardTitle className="flex items-center justify-between text-lg">
                          <div className="flex items-center space-x-2">
                            <Music className="w-5 h-5 text-primary" />
                            <span>Instruments & Services</span>
                          </div>
                          {expandedSections.instruments ? 
                            <ChevronDown className="w-5 h-5 text-gray-400" /> : 
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          }
                        </CardTitle>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-2 text-left">
                          Select instruments you play and services you offer
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="p-6">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {getAvailableInstruments().map((instrument) => (
                            <div key={instrument} className="flex items-center space-x-2">
                              <Checkbox
                                id={instrument}
                                checked={selectedInstruments.includes(instrument)}
                                onCheckedChange={(checked) => handleInstrumentChange(instrument, checked as boolean)}
                              />
                              <label
                                htmlFor={instrument}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                {getInstrumentDisplayName(instrument)}
                              </label>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>

                {/* Gig Types Selection */}
                {selectedInstruments.length > 0 && (
                  <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
                    <Collapsible open={expandedSections.gigTypes} onOpenChange={() => toggleSection('gigTypes')}>
                      <CollapsibleTrigger className="w-full">
                        <CardHeader className="border-b border-gray-100 dark:border-slate-700 pb-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                          <CardTitle className="flex items-center justify-between text-lg">
                            <div className="flex items-center space-x-2">
                              <SettingsIcon className="w-5 h-5 text-primary" />
                              <span>Default Gig Types</span>
                            </div>
                            {expandedSections.gigTypes ? 
                              <ChevronDown className="w-5 h-5 text-gray-400" /> : 
                              <ChevronRight className="w-5 h-5 text-gray-400" />
                            }
                          </CardTitle>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-2 text-left">
                            Choose default gig types for quick booking
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="p-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {getAvailableGigTypes().map((gigType) => (
                              <div key={gigType} className="flex items-center space-x-2">
                                <Checkbox
                                  id={gigType}
                                  checked={selectedGigTypes.includes(gigType)}
                                  onCheckedChange={(checked) => handleGigTypeChange(gigType, checked as boolean)}
                                />
                                <label
                                  htmlFor={gigType}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                  {gigType}
                                </label>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                )}

                {/* Widget Configuration */}
                <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
                  <Collapsible open={expandedSections.widget} onOpenChange={() => toggleSection('widget')}>
                    <CollapsibleTrigger className="w-full">
                      <CardHeader className="border-b border-gray-100 dark:border-slate-700 pb-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                        <CardTitle className="flex items-center justify-between text-lg">
                          <div className="flex items-center space-x-2">
                            <Globe className="w-5 h-5 text-primary" />
                            <span>Booking Widget</span>
                          </div>
                          {expandedSections.widget ? 
                            <ChevronDown className="w-5 h-5 text-gray-400" /> : 
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          }
                        </CardTitle>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-2 text-left">
                          Embed a booking widget on your website
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          <div className="flex items-center space-x-4">
                            <Button
                              type="button"
                              onClick={() => generateTokenMutation.mutate()}
                              disabled={generateTokenMutation.isPending}
                              variant="outline"
                            >
                              {generateTokenMutation.isPending ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Generating...
                                </>
                              ) : (
                                "Generate Widget Token"
                              )}
                            </Button>
                            {widgetToken && (
                              <span className="text-sm text-green-600 font-mono">
                                Token: {widgetToken.substring(0, 8)}...
                              </span>
                            )}
                          </div>

                          {widgetUrl && (
                            <div className="space-y-4">
                              <div className="flex items-center space-x-2">
                                <Input
                                  value={widgetUrl}
                                  readOnly
                                  className="font-mono text-sm"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => copyToClipboard(widgetUrl)}
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(widgetUrl, '_blank')}
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </Button>
                              </div>
                              
                              {qrCodeUrl && (
                                <div className="flex flex-col items-center space-y-2 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                                  <img 
                                    src={qrCodeUrl} 
                                    alt="Booking Widget QR Code" 
                                    className="w-48 h-48 border border-gray-200 dark:border-gray-600 rounded"
                                  />
                                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                                    QR Code for your booking widget
                                  </p>
                                </div>
                              )}
                              
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Share this URL or QR code to allow clients to book directly with you
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>

                {/* App Theme Selector */}
                <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
                  <Collapsible open={expandedSections.appThemes} onOpenChange={() => toggleSection('appThemes')}>
                    <CollapsibleTrigger className="w-full">
                      <CardHeader className="border-b border-gray-100 dark:border-slate-700 pb-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                        <CardTitle className="flex items-center justify-between text-lg">
                          <div className="flex items-center space-x-2">
                            <Palette className="w-5 h-5 text-primary" />
                            <span>App Theme</span>
                          </div>
                          {expandedSections.appThemes ? 
                            <ChevronDown className="w-5 h-5 text-gray-400" /> : 
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          }
                        </CardTitle>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-2 text-left">
                          Choose your preferred visual theme for the MusoBuddy interface
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Available Themes</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {Object.values(themes).map((theme) => (
                              <div
                                key={theme.id}
                                onClick={() => {
                                  console.log('🎨 User clicked theme:', theme.id);
                                  setTheme(theme.id);
                                }}
                                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                  currentTheme === theme.id
                                    ? 'border-theme-primary bg-theme-primary/10'
                                    : 'border-gray-200 dark:border-gray-600 hover:border-theme-primary/50'
                                }`}
                              >
                                <div className="flex items-center space-x-3">
                                  <div 
                                    className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                                    style={{ backgroundColor: theme.colors.primary }}
                                  />
                                  <div className="flex-1">
                                    <h4 className="font-medium text-sm" style={{ 
                                      fontFamily: theme.fonts.heading,
                                      color: currentTheme === theme.id ? theme.colors.primary : 'inherit'
                                    }}>
                                      {theme.name}
                                    </h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                      {theme.description}
                                    </p>
                                  </div>
                                  {currentTheme === theme.id && (
                                    <div className="w-5 h-5 rounded-full bg-theme-primary flex items-center justify-center">
                                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>

                {/* Save Button */}
                <div className="flex justify-center pt-6">
                  <Button
                    type="submit"
                    disabled={saveSettingsMutation.isPending}
                    className="bg-gradient-to-r from-primary to-blue-600 text-white hover:shadow-lg transition-all px-8 py-3"
                  >
                    {saveSettingsMutation.isPending ? (
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
    </div>
  );
}