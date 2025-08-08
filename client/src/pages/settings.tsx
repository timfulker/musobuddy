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
import { Badge } from "@/components/ui/badge";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { useResponsive } from "@/hooks/useResponsive";
import { Building, Save, MapPin, Globe, Hash, CreditCard, Loader2, Menu, Eye, ChevronDown, ChevronRight, Mail, Settings as SettingsIcon, Music, ExternalLink, Copy, Link, Palette, Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

// Type definitions for themes
interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

interface ThemeFonts {
  heading: string;
  body?: string;
}

interface Theme {
  id: string;
  name: string;
  description: string;
  colors: ThemeColors;
  fonts: ThemeFonts;
}

// Define available themes
const themes: Record<string, Theme> = {
  default: {
    id: 'default',
    name: 'Default',
    description: 'Clean and professional default theme',
    colors: {
      primary: '#673ab7',
      secondary: '#9c27b0',
      accent: '#ff6b6b',
      background: '#ffffff',
      text: '#333333'
    },
    fonts: {
      heading: 'system-ui',
      body: 'system-ui'
    }
  },
  'retro-vinyl': {
    id: 'retro-vinyl',
    name: 'Retro Vinyl',
    description: 'Vintage musical aesthetic with warm colors',
    colors: {
      primary: '#b8860b',
      secondary: '#d2691e',
      accent: '#ff8c00',
      background: '#faf0e6',
      text: '#4a4a4a'
    },
    fonts: {
      heading: 'Georgia',
      body: 'Georgia'
    }
  }
};

// Simple theme hook
const useTheme = () => {
  const [currentTheme, setCurrentTheme] = useState<string>('default');
  
  useEffect(() => {
    const savedTheme = localStorage.getItem('appTheme') || 'default';
    setCurrentTheme(savedTheme);
  }, []);
  
  const setTheme = (themeId: string) => {
    setCurrentTheme(themeId);
    localStorage.setItem('appTheme', themeId);
  };
  
  return { currentTheme, setTheme };
};

// Instrument helper functions
const getAvailableInstruments = () => [
  'saxophone', 'piano', 'guitar', 'violin', 'drums', 'bass', 'vocals', 'dj', 'trumpet', 'flute'
];

const getInstrumentDisplayName = (instrument: string) => {
  const names: Record<string, string> = {
    saxophone: 'Saxophone',
    piano: 'Piano',
    guitar: 'Guitar',
    violin: 'Violin',
    drums: 'Drums',
    bass: 'Bass',
    vocals: 'Vocals',
    dj: 'DJ',
    trumpet: 'Trumpet',
    flute: 'Flute'
  };
  return names[instrument] || instrument;
};

const getGigTypeNamesForInstrument = (instrument: string) => {
  const gigTypes: Record<string, string[]> = {
    saxophone: ['Wedding', 'Corporate Event', 'Jazz Club', 'Private Party', 'Festival'],
    piano: ['Wedding', 'Concert', 'Bar/Lounge', 'Private Party', 'Recording Session'],
    guitar: ['Wedding', 'Rock Concert', 'Corporate Event', 'Private Party', 'Studio Session'],
    violin: ['Wedding', 'Orchestra', 'Corporate Event', 'Private Party', 'Chamber Music'],
    drums: ['Rock Concert', 'Jazz Club', 'Studio Session', 'Festival', 'Private Party'],
    bass: ['Jazz Club', 'Rock Concert', 'Studio Session', 'Festival', 'Private Party'],
    vocals: ['Wedding', 'Corporate Event', 'Concert', 'Private Party', 'Recording Session'],
    dj: ['Wedding', 'Club Night', 'Corporate Event', 'Private Party', 'Festival'],
    trumpet: ['Jazz Club', 'Orchestra', 'Wedding', 'Private Party', 'Big Band'],
    flute: ['Orchestra', 'Wedding', 'Chamber Music', 'Private Party', 'Recording Session']
  };
  return gigTypes[instrument] || [];
};

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
  
  // AI Pricing Guide fields
  aiPricingEnabled: z.boolean().default(true),
  baseHourlyRate: z.coerce.number().min(0, "Base hourly rate must be positive").default(130),
  minimumBookingHours: z.coerce.number().min(0.5, "Minimum booking hours must be at least 30 minutes").default(2),
  additionalHourRate: z.coerce.number().min(0, "Additional hour rate must be positive").default(60),
  djServiceRate: z.coerce.number().min(0, "DJ service rate must be positive").default(300),
  pricingNotes: z.string().optional().or(z.literal("")),
  specialOffers: z.string().optional().or(z.literal("")),
  bankDetails: z.string().optional().or(z.literal("")),
  
  // Instrument and gig type settings  
  primaryInstrument: z.string().optional().or(z.literal("")),
  secondaryInstruments: z.array(z.string()).optional().default([]),
  customGigTypes: z.array(z.string()).optional().default([]),
  
  // Performance settings
  bookingDisplayLimit: z.enum(["50", "all"]).default("50"),
  
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
    console.error('🔥 Settings API error:', response.status, response.statusText);
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
    
    // Instrument settings
    primaryInstrument: data.primaryInstrument || "",
    secondaryInstruments: Array.isArray(data.secondaryInstruments) ? data.secondaryInstruments : 
                          (typeof data.secondaryInstruments === 'string' ? JSON.parse(data.secondaryInstruments || '[]') : []),
    customGigTypes: Array.isArray(data.customGigTypes) ? data.customGigTypes : 
                    (typeof data.customGigTypes === 'string' ? JSON.parse(data.customGigTypes || '[]') : []),
    
    // Performance settings
    bookingDisplayLimit: data.bookingDisplayLimit || "50",
    
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
    themeShowTerms: data.themeShowTerms !== false,
    themeCustomTitle: data.themeCustomTitle || "",
    
    // AI Pricing Guide fields
    aiPricingEnabled: data.aiPricingEnabled ?? true,
    baseHourlyRate: data.baseHourlyRate || 130,
    minimumBookingHours: data.minimumBookingHours || 2,
    additionalHourRate: data.additionalHourRate || 60,
    djServiceRate: data.djServiceRate || 300,
    pricingNotes: data.pricingNotes || "",
    specialOffers: data.specialOffers || "",
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
  const { isDesktop } = useResponsive();
  const isMobile = !isDesktop;
  const { currentTheme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Instrument and gig type state
  const [availableGigTypes, setAvailableGigTypes] = useState<string[]>([]);
  const [newGigType, setNewGigType] = useState("");
  const [customGigTypeDialogOpen, setCustomGigTypeDialogOpen] = useState(false);
  
  // Theme preview states
  const [themePreviewUrl, setThemePreviewUrl] = useState<string | null>(null);
  const [themePreviewDialogOpen, setThemePreviewDialogOpen] = useState(false);
  const [previewGenerating, setPreviewGenerating] = useState(false);

  // Widget preview states
  const [widgetPreviewUrl, setWidgetPreviewUrl] = useState<string>("");
  const [showWidgetPreview, setShowWidgetPreview] = useState(false);

  // Collapsible section states
  const [businessInfoOpen, setBusinessInfoOpen] = useState(true);
  const [pricingGuideOpen, setPricingGuideOpen] = useState(false);
  const [instrumentsOpen, setInstrumentsOpen] = useState(false);
  const [performanceOpen, setPerformanceOpen] = useState(false);
  const [brandingOpen, setBrandingOpen] = useState(false);

  // Form handling
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
      primaryInstrument: "",
      secondaryInstruments: [],
      customGigTypes: [],
      bookingDisplayLimit: "50",
      themeTemplate: "classic",
      themeTone: "professional",
      themeFont: "roboto",
      themeAccentColor: "#673ab7",
      themeLogoUrl: "",
      themeSignatureUrl: "",
      themeBanner: "",
      themeShowSetlist: false,
      themeShowRiderNotes: false,
      themeShowQrCode: false,
      themeShowTerms: true,
      themeCustomTitle: "",
      aiPricingEnabled: true,
      baseHourlyRate: 130,
      minimumBookingHours: 2,
      additionalHourRate: 60,
      djServiceRate: 300,
      pricingNotes: "",
      specialOffers: "",
    },
  });

  // Watch primary instrument changes
  const watchedPrimaryInstrument = form.watch('primaryInstrument');

  useEffect(() => {
    if (watchedPrimaryInstrument) {
      const gigTypes = getGigTypeNamesForInstrument(watchedPrimaryInstrument);
      setAvailableGigTypes(gigTypes);
    } else {
      setAvailableGigTypes([]);
    }
  }, [watchedPrimaryInstrument]);

  // Fetch settings data
  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ['/api/settings'],
    queryFn: fetchSettings,
    retry: 2,
  });

  // Update form when data is loaded
  useEffect(() => {
    if (settingsData) {
      form.reset(settingsData);
      
      if (settingsData.primaryInstrument) {
        const gigTypes = getGigTypeNamesForInstrument(settingsData.primaryInstrument);
        setAvailableGigTypes(gigTypes);
      }
    }
  }, [settingsData, form]);

  // Mutation for saving settings
  const saveSettingsMutation = useMutation({
    mutationFn: async (data: SettingsFormData) => {
      const token = getAuthToken();
      
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save settings: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({
        title: "Settings saved",
        description: "Your settings have been updated successfully.",
      });
    },
    onError: (error) => {
      console.error('Save settings error:', error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Generate widget URL when user is authenticated
  useEffect(() => {
    const generateWidgetUrl = async () => {
      try {
        const token = getAuthToken();
        
        const response = await fetch('/api/widget/generate', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setWidgetPreviewUrl(data.widgetUrl);
        }
      } catch (error) {
        console.error('Failed to generate widget URL:', error);
      }
    };
    
    generateWidgetUrl();
  }, []);

  const handleSaveSettings = (data: SettingsFormData) => {
    saveSettingsMutation.mutate(data);
  };

  const handleAddCustomGigType = () => {
    if (newGigType.trim()) {
      const currentCustomTypes = form.getValues('customGigTypes') || [];
      
      if (!currentCustomTypes.includes(newGigType.trim())) {
        form.setValue('customGigTypes', [...currentCustomTypes, newGigType.trim()]);
        setNewGigType("");
        setCustomGigTypeDialogOpen(false);
      }
    }
  };

  const handleRemoveCustomGigType = (gigType: string) => {
    const currentCustomTypes = form.getValues('customGigTypes') || [];
    const updatedTypes = currentCustomTypes.filter(type => type !== gigType);
    form.setValue('customGigTypes', updatedTypes);
  };

  const handleGenerateThemePreview = async () => {
    setPreviewGenerating(true);
    
    try {
      const formData = form.getValues();
      const themeSettings = {
        template: formData.themeTemplate,
        tone: formData.themeTone,
        font: formData.themeFont,
        accentColor: formData.themeAccentColor,
        logoUrl: formData.themeLogoUrl,
        signatureUrl: formData.themeSignatureUrl,
        banner: formData.themeBanner,
        showSetlist: formData.themeShowSetlist,
        showRiderNotes: formData.themeShowRiderNotes,
        showQrCode: formData.themeShowQrCode,
        showTerms: formData.themeShowTerms,
        customTitle: formData.themeCustomTitle,
        businessName: formData.businessName,
        businessEmail: formData.businessEmail,
        businessAddress: formData.businessAddress,
        phone: formData.phone
      };
      
      const previewUrl = await generateThemePreview(themeSettings);
      if (previewUrl) {
        setThemePreviewUrl(previewUrl);
        setThemePreviewDialogOpen(true);
      } else {
        toast({
          title: "Preview Error",
          description: "Failed to generate theme preview. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Preview generation error:', error);
      toast({
        title: "Preview Error",
        description: "Failed to generate theme preview. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPreviewGenerating(false);
    }
  };

  const copyWidgetUrl = () => {
    navigator.clipboard.writeText(widgetPreviewUrl);
    toast({
      title: "Copied!",
      description: "Widget URL copied to clipboard.",
    });
  };

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading settings...</span>
      </div>
    );
  }

  const SettingsContent = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">Manage your business information and preferences</p>
        </div>
        {isMobile && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-4 h-4" />
          </Button>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSaveSettings)} className="space-y-6">
          {/* Business Information Section */}
          <Collapsible open={businessInfoOpen} onOpenChange={setBusinessInfoOpen}>
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <div className="flex items-center space-x-2">
                    <Building className="w-5 h-5 text-purple-600" />
                    <CardTitle>Business Information</CardTitle>
                  </div>
                  {businessInfoOpen ? 
                    <ChevronDown className="w-4 h-4" /> : 
                    <ChevronRight className="w-4 h-4" />
                  }
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="businessName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Your business name" {...field} />
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
                          <FormLabel>Business Email *</FormLabel>
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
                    name="addressLine1"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address Line 1 *</FormLabel>
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
                        <FormLabel>Address Line 2</FormLabel>
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
                          <FormLabel>City *</FormLabel>
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
                          <FormLabel>County</FormLabel>
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
                          <FormLabel>Postcode *</FormLabel>
                          <FormControl>
                            <Input placeholder="SW1A 1AA" {...field} />
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
                          <FormLabel>Phone Number *</FormLabel>
                          <FormControl>
                            <Input placeholder="+44 20 7946 0958" {...field} />
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
                            <Input placeholder="https://www.example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="taxNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tax Number</FormLabel>
                          <FormControl>
                            <Input placeholder="VAT or Tax ID number" {...field} />
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
                          <FormLabel>Email From Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Your name for emails" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="nextInvoiceNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Next Invoice Number *</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" {...field} />
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
                        <FormLabel>Default Payment Terms</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="e.g., Payment due within 30 days of invoice date..."
                            rows={3}
                            {...field}
                          />
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
                          <Textarea 
                            placeholder="Bank name, sort code, account number, or other payment details..."
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* AI Pricing Guide Section */}
          <Collapsible open={pricingGuideOpen} onOpenChange={setPricingGuideOpen}>
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <div className="flex items-center space-x-2">
                    <CreditCard className="w-5 h-5 text-green-600" />
                    <CardTitle>AI Pricing Guide</CardTitle>
                  </div>
                  {pricingGuideOpen ? 
                    <ChevronDown className="w-4 h-4" /> : 
                    <ChevronRight className="w-4 h-4" />
                  }
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="aiPricingEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Enable AI Pricing Suggestions</FormLabel>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Let AI suggest pricing based on your rates and gig details
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
                            <Input type="number" step="0.01" min="0" {...field} />
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
                            <Input type="number" step="0.5" min="0.5" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="additionalHourRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Additional Hour Rate (£)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" min="0" {...field} />
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
                            <Input type="number" step="0.01" min="0" {...field} />
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
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="specialOffers"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Special Offers</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Current promotions or package deals..."
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Instruments & Gig Types Section */}
          <Collapsible open={instrumentsOpen} onOpenChange={setInstrumentsOpen}>
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <div className="flex items-center space-x-2">
                    <Music className="w-5 h-5 text-blue-600" />
                    <CardTitle>Instruments & Gig Types</CardTitle>
                  </div>
                  {instrumentsOpen ? 
                    <ChevronDown className="w-4 h-4" /> : 
                    <ChevronRight className="w-4 h-4" />
                  }
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="primaryInstrument"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Instrument</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your primary instrument" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {getAvailableInstruments().map((instrument) => (
                              <SelectItem key={instrument} value={instrument}>
                                {getInstrumentDisplayName(instrument)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="secondaryInstruments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Secondary Instruments</FormLabel>
                        <div className="space-y-2">
                          {getAvailableInstruments()
                            .filter(instrument => instrument !== watchedPrimaryInstrument)
                            .map((instrument) => (
                              <div key={instrument} className="flex items-center space-x-2">
                                <Checkbox
                                  id={instrument}
                                  checked={field.value?.includes(instrument) || false}
                                  onCheckedChange={(checked) => {
                                    const currentValue = field.value || [];
                                    if (checked) {
                                      field.onChange([...currentValue, instrument]);
                                    } else {
                                      field.onChange(currentValue.filter((v: string) => v !== instrument));
                                    }
                                  }}
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div>
                    <FormLabel>Available Gig Types</FormLabel>
                    <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                      {availableGigTypes.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {availableGigTypes.map((gigType) => (
                            <Badge key={gigType} variant="secondary">
                              {gigType}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Select a primary instrument to see available gig types
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="customGigTypes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Custom Gig Types</FormLabel>
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            {(field.value || []).map((gigType) => (
                              <Badge 
                                key={gigType} 
                                variant="outline" 
                                className="cursor-pointer hover:bg-red-50 hover:border-red-200"
                                onClick={() => handleRemoveCustomGigType(gigType)}
                              >
                                {gigType} ×
                              </Badge>
                            ))}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setCustomGigTypeDialogOpen(true)}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add Custom Gig Type
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Performance Settings Section */}
          <Collapsible open={performanceOpen} onOpenChange={setPerformanceOpen}>
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <div className="flex items-center space-x-2">
                    <SettingsIcon className="w-5 h-5 text-orange-600" />
                    <CardTitle>Performance Settings</CardTitle>
                  </div>
                  {performanceOpen ? 
                    <ChevronDown className="w-4 h-4" /> : 
                    <ChevronRight className="w-4 h-4" />
                  }
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="bookingDisplayLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Booking Display Limit</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="50">50 bookings</SelectItem>
                            <SelectItem value="all">Show all bookings</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Choose how many bookings to display at once for better performance
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Branding & Themes Section */}
          <Collapsible open={brandingOpen} onOpenChange={setBrandingOpen}>
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <div className="flex items-center space-x-2">
                    <Palette className="w-5 h-5 text-pink-600" />
                    <CardTitle>Branding & Themes</CardTitle>
                  </div>
                  {brandingOpen ? 
                    <ChevronDown className="w-4 h-4" /> : 
                    <ChevronRight className="w-4 h-4" />
                  }
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Invoice & Contract Theme</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <FormField
                        control={form.control}
                        name="themeTemplate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Template Style</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {THEME_TEMPLATES.map((template) => (
                                  <SelectItem key={template.id} value={template.id}>
                                    {template.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="themeTone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Language Tone</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {THEME_TONES.map((tone) => (
                                  <SelectItem key={tone.id} value={tone.id}>
                                    {tone.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="themeFont"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Font Family</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {THEME_FONTS.map((font) => (
                                  <SelectItem key={font.id} value={font.id}>
                                    {font.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="themeAccentColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Accent Color</FormLabel>
                          <div className="flex items-center space-x-2">
                            <div className="flex space-x-1">
                              {THEME_COLORS.map((color) => (
                                <button
                                  key={color}
                                  type="button"
                                  className={`w-8 h-8 rounded-full border-2 ${
                                    field.value === color ? 'border-gray-400' : 'border-gray-200'
                                  }`}
                                  style={{ backgroundColor: color }}
                                  onClick={() => field.onChange(color)}
                                />
                              ))}
                            </div>
                            <FormControl>
                              <Input 
                                type="color"
                                value={field.value}
                                onChange={field.onChange}
                                className="w-12 h-8 p-1 border rounded"
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="themeLogoUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Logo URL</FormLabel>
                            <FormControl>
                              <Input placeholder="https://example.com/logo.png" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="themeSignatureUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Signature Image URL</FormLabel>
                            <FormControl>
                              <Input placeholder="https://example.com/signature.png" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="themeBanner"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Custom Banner Text</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Professional Musical Services" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="themeCustomTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Custom Document Title</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Choose a title style" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {CUSTOM_TITLES.map((title) => (
                                <SelectItem key={title.id} value={title.id}>
                                  {title.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {field.value === "custom" && (
                            <Input 
                              placeholder="Enter your custom title"
                              className="mt-2"
                              onChange={(e) => {
                                // Store custom title in a different field or handle it appropriately
                                form.setValue('themeCustomTitle', e.target.value);
                              }}
                            />
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="space-y-3">
                      <h4 className="font-medium">Additional Elements</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="themeShowSetlist"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <FormLabel className="text-sm">Show Set List Section</FormLabel>
                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                  Include a section for song lists
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
                        
                        <FormField
                          control={form.control}
                          name="themeShowRiderNotes"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <FormLabel className="text-sm">Show Rider Notes</FormLabel>
                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                  Include technical requirements
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
                        
                        <FormField
                          control={form.control}
                          name="themeShowQrCode"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <FormLabel className="text-sm">Show QR Code</FormLabel>
                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                  QR code for online payments
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
                        
                        <FormField
                          control={form.control}
                          name="themeShowTerms"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <FormLabel className="text-sm">Show Terms & Conditions</FormLabel>
                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                  Include payment terms
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
                      </div>
                    </div>
                    
                    <div className="flex justify-center">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleGenerateThemePreview}
                        disabled={previewGenerating}
                      >
                        {previewGenerating ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Eye className="w-4 h-4 mr-2" />
                        )}
                        Preview Theme
                      </Button>
                    </div>
                  </div>

                  {/* Widget Integration Section */}
                  {widgetPreviewUrl && (
                    <div className="pt-6 border-t">
                      <h3 className="text-lg font-medium mb-4">Widget Integration</h3>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium">Booking Widget URL:</span>
                          <div className="flex items-center space-x-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={copyWidgetUrl}
                            >
                              <Copy className="w-4 h-4 mr-1" />
                              Copy
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setShowWidgetPreview(!showWidgetPreview)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              {showWidgetPreview ? 'Hide' : 'Preview'}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(widgetPreviewUrl, '_blank')}
                            >
                              <ExternalLink className="w-4 h-4 mr-1" />
                              Open
                            </Button>
                          </div>
                        </div>
                        <div className="bg-white dark:bg-gray-900 rounded border p-2 text-sm font-mono break-all">
                          {widgetPreviewUrl}
                        </div>
                        {showWidgetPreview && (
                          <div className="mt-4">
                            <iframe
                              src={widgetPreviewUrl}
                              className="w-full h-96 rounded border"
                              title="Booking Widget Preview"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={saveSettingsMutation.isPending}
              className="min-w-32"
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
  );

  if (isDesktop) {
    return (
      <div className="min-h-screen bg-background flex">
        <div className="w-64 bg-white dark:bg-slate-900 shadow-xl border-r border-gray-200 dark:border-slate-700 fixed left-0 top-0 h-full z-30">
          <Sidebar isOpen={true} onClose={() => {}} />
        </div>
        <div className="flex-1 ml-64 min-h-screen">
          <div className="p-6">
            <SettingsContent />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <div className={`
        fixed left-0 top-0 h-full w-80 bg-white dark:bg-slate-900 shadow-xl z-50 
        transform transition-transform duration-300 ease-in-out md:hidden
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      <div className="p-6">
        <SettingsContent />
      </div>

      <MobileNav />

      {/* Custom Gig Type Dialog */}
      <Dialog open={customGigTypeDialogOpen} onOpenChange={setCustomGigTypeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Gig Type</DialogTitle>
            <DialogDescription>
              Create a custom gig type that's not in the standard list
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Enter gig type name"
              value={newGigType}
              onChange={(e) => setNewGigType(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAddCustomGigType();
                }
              }}
            />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setCustomGigTypeDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddCustomGigType} disabled={!newGigType.trim()}>
                Add Gig Type
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Theme Preview Dialog */}
      <Dialog open={themePreviewDialogOpen} onOpenChange={setThemePreviewDialogOpen}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>Theme Preview</DialogTitle>
            <DialogDescription>
              This is how your invoices and contracts will look with the selected theme
            </DialogDescription>
          </DialogHeader>
          {themePreviewUrl && (
            <div className="flex-1 overflow-hidden">
              <iframe
                src={themePreviewUrl}
                className="w-full h-full rounded border"
                title="Theme Preview"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}