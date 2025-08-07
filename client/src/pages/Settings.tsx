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

// Schema for form validation
const settingsFormSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  businessEmail: z.string().min(1, "Business email is required").email("Please enter a valid email address"),
  businessAddress: z.string().optional().default(""),
  addressLine1: z.string().min(1, "Address line 1 is required"),
  addressLine2: z.string().optional().default(""),
  city: z.string().min(1, "City is required"),
  county: z.string().optional().default(""),
  postcode: z.string().min(1, "Postcode is required"),
  phone: z.string().min(1, "Phone number is required"),
  website: z.string().optional().default(""),
  taxNumber: z.string().optional().default(""),
  emailFromName: z.string().min(1, "Email from name is required"),
  nextInvoiceNumber: z.coerce.number().min(1, "Next invoice number is required"),
  defaultTerms: z.string().optional().default(""),
  
  // AI Pricing Guide fields
  aiPricingEnabled: z.boolean().default(true),
  baseHourlyRate: z.coerce.number().min(0, "Base hourly rate must be positive").default(130),
  minimumBookingHours: z.coerce.number().min(0.5, "Minimum booking hours must be at least 30 minutes").default(2),
  additionalHourRate: z.coerce.number().min(0, "Additional hour rate must be positive").default(60),
  djServiceRate: z.coerce.number().min(0, "DJ service rate must be positive").default(300),
  pricingNotes: z.string().optional().default(""),
  specialOffers: z.string().optional().default(""),
  bankDetails: z.string().optional().default(""),
  
  // Performance settings
  bookingDisplayLimit: z.enum(["50", "all"]).default("50"),
});

type SettingsFormData = z.infer<typeof settingsFormSchema>;

// Helper function to get the correct auth token
const getAuthTokenKey = () => {
  const hostname = window.location.hostname;
  
  if (hostname.includes('janeway.replit.dev') || hostname.includes('localhost')) {
    return 'authToken_dev_admin';
  }
  
  return `authToken_${hostname.replace(/[^a-zA-Z0-9]/g, '_')}`;
};

const getAuthToken = () => {
  const tokenKey = getAuthTokenKey();
  return localStorage.getItem(tokenKey);
};

// API function for fetching settings
const fetchSettings = async (): Promise<SettingsFormData> => {
  const token = getAuthToken();
  
  const response = await fetch('/api/settings', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    console.error('Settings API error:', response.status, response.statusText);
    throw new Error(`Failed to fetch settings: ${response.status}`);
  }
  
  const data = await response.json();
  
  // Transform the data to match the expected form structure
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
    bookingDisplayLimit: data.bookingDisplayLimit || "50",
    aiPricingEnabled: data.aiPricingEnabled ?? true,
    baseHourlyRate: data.baseHourlyRate || 130,
    minimumBookingHours: data.minimumBookingHours || 2,
    additionalHourRate: data.additionalHourRate || 60,
    djServiceRate: data.djServiceRate || 300,
    pricingNotes: data.pricingNotes || "",
    specialOffers: data.specialOffers || "",
  };
};

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isDesktop } = useResponsive();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Collapsible state for each section
  const [expandedSections, setExpandedSections] = useState({
    business: true,
    email: false,
    contact: false,
    address: false,
    financial: false,
    bank: false,
    pricing: false,
    performance: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Fetch settings data
  const { data: settingsData, isLoading: settingsLoading, error: settingsError } = useQuery({
    queryKey: ['/api/settings'],
    queryFn: fetchSettings,
    retry: 1,
  });

  // Initialize form
  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: settingsData,
  });

  // Update form when data loads
  useEffect(() => {
    if (settingsData) {
      form.reset(settingsData);
    }
  }, [settingsData, form]);

  // Watch for form changes
  useEffect(() => {
    const subscription = form.watch(() => {
      setHasChanges(true);
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Submit mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: SettingsFormData) => {
      const token = getAuthToken();
      
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`Failed to update settings: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      setHasChanges(false);
      toast({
        title: "Settings Updated",
        description: "Your settings have been saved successfully.",
      });
    },
    onError: (error) => {
      console.error('Error updating settings:', error);
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    }
  });

  const onSubmit = async (data: SettingsFormData) => {
    setIsSubmitting(true);
    try {
      await updateSettingsMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (settingsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {!isDesktop && <MobileNav isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className={`${isDesktop ? 'ml-64' : 'ml-0'} transition-all duration-300`}>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (settingsError) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {!isDesktop && <MobileNav isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className={`${isDesktop ? 'ml-64' : 'ml-0'} transition-all duration-300`}>
          <div className="p-6">
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-red-600">Failed to load settings. Please try again.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile Navigation */}
      {!isDesktop && (
        <MobileNav isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      )}

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className={`${isDesktop ? 'ml-64' : 'ml-0'} transition-all duration-300`}>
        {/* Header */}
        <div className="border-b bg-white dark:bg-gray-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {!isDesktop && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
              )}
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
            </div>
            <Button 
              onClick={form.handleSubmit(onSubmit)}
              disabled={!hasChanges || isSubmitting}
              className="flex items-center space-x-2"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Business Information */}
              <Card>
                <Collapsible open={expandedSections.business} onOpenChange={() => toggleSection('business')}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Building className="h-5 w-5 text-blue-600" />
                          <CardTitle>Business Information</CardTitle>
                        </div>
                        {expandedSections.business ? 
                          <ChevronDown className="h-4 w-4" /> : 
                          <ChevronRight className="h-4 w-4" />
                        }
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-4">
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
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>

              {/* Contact Information */}
              <Card>
                <Collapsible open={expandedSections.contact} onOpenChange={() => toggleSection('contact')}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Hash className="h-5 w-5 text-green-600" />
                          <CardTitle>Contact Details</CardTitle>
                        </div>
                        {expandedSections.contact ? 
                          <ChevronDown className="h-4 w-4" /> : 
                          <ChevronRight className="h-4 w-4" />
                        }
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone Number</FormLabel>
                              <FormControl>
                                <Input placeholder="01234 567890" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="website"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Website</FormLabel>
                              <FormControl>
                                <Input placeholder="https://www.yourwebsite.com" {...field} />
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

              {/* Address Information */}
              <Card>
                <Collapsible open={expandedSections.address} onOpenChange={() => toggleSection('address')}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <MapPin className="h-5 w-5 text-purple-600" />
                          <CardTitle>Business Address</CardTitle>
                        </div>
                        {expandedSections.address ? 
                          <ChevronDown className="h-4 w-4" /> : 
                          <ChevronRight className="h-4 w-4" />
                        }
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-4">
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
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  </CollapsibleContent>
                </Collapsible>
              </Card>

              {/* Financial Information */}
              <Card>
                <Collapsible open={expandedSections.financial} onOpenChange={() => toggleSection('financial')}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <CreditCard className="h-5 w-5 text-orange-600" />
                          <CardTitle>Financial Information</CardTitle>
                        </div>
                        {expandedSections.financial ? 
                          <ChevronDown className="h-4 w-4" /> : 
                          <ChevronRight className="h-4 w-4" />
                        }
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="taxNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tax/VAT Number (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="123456789" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="nextInvoiceNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Next Invoice Number</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="1001" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="defaultTerms"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Default Contract Terms</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Enter your standard terms and conditions..." 
                                className="min-h-32"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>

              {/* AI Pricing Settings */}
              <Card>
                <Collapsible open={expandedSections.pricing} onOpenChange={() => toggleSection('pricing')}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Music className="h-5 w-5 text-pink-600" />
                          <CardTitle>AI Pricing Guide</CardTitle>
                        </div>
                        {expandedSections.pricing ? 
                          <ChevronDown className="h-4 w-4" /> : 
                          <ChevronRight className="h-4 w-4" />
                        }
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-4">
                      <FormField
                        control={form.control}
                        name="aiPricingEnabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Enable AI Pricing</FormLabel>
                              <div className="text-sm text-muted-foreground">
                                Let AI suggest prices for enquiries based on your rates
                              </div>
                            </div>
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="baseHourlyRate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Base Hourly Rate (£)</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="130" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="minimumBookingHours"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Minimum Booking Hours</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.5" placeholder="2" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="additionalHourRate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Additional Hour Rate (£)</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="60" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="djServiceRate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>DJ Service Rate (£)</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="300" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="pricingNotes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pricing Notes</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Additional notes about your pricing structure..."
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>

              {/* Email Settings */}
              <Card>
                <Collapsible open={expandedSections.email} onOpenChange={() => toggleSection('email')}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Mail className="h-5 w-5 text-blue-600" />
                          <CardTitle>Email Settings</CardTitle>
                        </div>
                        {expandedSections.email ? 
                          <ChevronDown className="h-4 w-4" /> : 
                          <ChevronRight className="h-4 w-4" />
                        }
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-4">
                      <FormField
                        control={form.control}
                        name="emailFromName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email From Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Your Business Name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>

              {/* Banking Information */}
              <Card>
                <Collapsible open={expandedSections.bank} onOpenChange={() => toggleSection('bank')}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <CreditCard className="h-5 w-5 text-green-600" />
                          <CardTitle>Banking Information</CardTitle>
                        </div>
                        {expandedSections.bank ? 
                          <ChevronDown className="h-4 w-4" /> : 
                          <ChevronRight className="h-4 w-4" />
                        }
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-4">
                      <FormField
                        control={form.control}
                        name="bankDetails"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bank Details</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Enter your bank details for payments..."
                                className="min-h-24"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>

              {/* Performance Settings */}
              <Card>
                <Collapsible open={expandedSections.performance} onOpenChange={() => toggleSection('performance')}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <SettingsIcon className="h-5 w-5 text-gray-600" />
                          <CardTitle>Performance Settings</CardTitle>
                        </div>
                        {expandedSections.performance ? 
                          <ChevronDown className="h-4 w-4" /> : 
                          <ChevronRight className="h-4 w-4" />
                        }
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-4">
                      <FormField
                        control={form.control}
                        name="bookingDisplayLimit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Booking Display Limit</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select display limit" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="50">50 bookings</SelectItem>
                                <SelectItem value="all">All bookings</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>

              {/* Save Button */}
              <div className="flex justify-end">
                <Button 
                  type="submit"
                  disabled={!hasChanges || isSubmitting}
                  className="flex items-center space-x-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}