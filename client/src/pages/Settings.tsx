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
// Removed label, badge imports - not needed without instrument selection
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

// Schema for form validation - includes all fields we want to save
const settingsFormSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  businessEmail: z.string().min(1, "Business email is required").email("Please enter a valid email address"),
  businessAddress: z.string().optional().or(z.literal("")), // Legacy field for backward compatibility
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
  // Removed instrument and gig type fields - feature moved to documentation
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

// Removed AI gig suggestion function - feature moved to documentation for future implementation

// API function for fetching settings
const fetchSettings = async (): Promise<SettingsFormData> => {
  const token = localStorage.getItem('authToken_dev') || localStorage.getItem(`authToken_${window.location.hostname}`);
  
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
  
  
  // Removed instrument and gig type parsing - feature moved to documentation
  
  // Transform the data to match the expected form structure - include ALL fields
  return {
    businessName: data.businessName || "",
    businessEmail: data.businessEmail || "",  // Added missing field
    businessAddress: data.businessAddress || "",
    addressLine1: data.addressLine1 || "",    // Added missing field
    addressLine2: data.addressLine2 || "",    // Added missing field
    city: data.city || "",                    // Added missing field
    county: data.county || "",                // Added missing field
    postcode: data.postcode || "",            // Added missing field
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
    themeShowTerms: data.themeShowTerms !== false, // Default to true
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
  const [selectedInstrument, setSelectedInstrument] = useState<string>("");

  // State for theme preview
  const [showThemePreview, setShowThemePreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [selectedCustomTitle, setSelectedCustomTitle] = useState("invoice");
  // Custom gig type input state
  const [customGigTypeInput, setCustomGigTypeInput] = useState('');
  
  // Widget token state
  const [widgetUrl, setWidgetUrl] = useState<string>('');
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  
  // Track if form has been modified
  const [hasChanges, setHasChanges] = useState(false);
  const [initialData, setInitialData] = useState<any>(null);
  
  // Collapsible state for each section
  const [expandedSections, setExpandedSections] = useState({
    business: true,
    email: false,
    contact: false,
    address: false,
    financial: false,
    bank: false,
    pricing: false, // AI Pricing Guide section
    gigTypes: false, // Custom gig types management section
    widget: false, // Widget URL management section
    performance: false,
    instruments: true, // Open by default for new instrument context feature
    themes: false,
    appThemes: true, // App theme selector section
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section as keyof typeof prev]
    }));
  };

  // Handle adding custom gig type
  const handleAddCustomGigType = () => {
    const trimmedInput = customGigTypeInput.trim();
    if (!trimmedInput) return;

    const currentCustomTypes = form.getValues('customGigTypes') || [];
    
    // Check if already exists
    if (currentCustomTypes.includes(trimmedInput)) {
      toast({
        title: "Duplicate Gig Type",
        description: "This gig type already exists in your custom list.",
        variant: "destructive",
      });
      return;
    }

    // Add to form data
    const updatedTypes = [...currentCustomTypes, trimmedInput];
    form.setValue('customGigTypes', updatedTypes);
    setCustomGigTypeInput('');
    
    toast({
      title: "Custom Gig Type Added",
      description: `"${trimmedInput}" has been added to your custom gig types.`,
    });
  };

  // Generate widget token and URL
  const generateWidgetUrl = async () => {
    setIsGeneratingToken(true);
    try {
      const token = localStorage.getItem('authToken_dev') || localStorage.getItem(`authToken_${window.location.hostname}`);
      const response = await fetch('/api/generate-widget-token', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate widget token');
      }
      
      const data = await response.json();
      setWidgetUrl(data.url);
      
      // Generate QR code for the widget URL
      if (data.url) {
        try {
          const qrResponse = await fetch('/api/generate-qr-code', {
            method: 'POST',
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ url: data.url }),
          });
          
          if (qrResponse.ok) {
            const qrData = await qrResponse.json();
            setQrCodeUrl(qrData.qrCodeDataUrl);
          }
        } catch (qrError) {
          console.error('Failed to generate QR code:', qrError);
        }
      }
      
      toast({
        title: "Widget URL Generated",
        description: "Your booking widget URL and QR code are ready to use!",
      });
    } catch (error) {
      console.error('Error generating widget URL:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate widget URL. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingToken(false);
    }
  };

  // Copy widget URL to clipboard
  const copyWidgetUrl = async () => {
    try {
      await navigator.clipboard.writeText(widgetUrl);
      toast({
        title: "Copied!",
        description: "Widget URL copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy URL to clipboard",
        variant: "destructive",
      });
    }
  };

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsFormSchema),
    // Don't set default values here - let the form initialize from settings data
  });

  // Load existing settings data
  const { data: settings, isLoading: settingsLoading, error: settingsError } = useQuery({
    queryKey: ['settings'],
    queryFn: fetchSettings,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    select: (data) => {
      
      // Remove excessive logging
      return data;
    },
  });

  // Removed global gig types query - feature moved to documentation

  // Save settings function - simplified version
  const saveSettings = useMutation({
    mutationFn: async (data: SettingsFormData) => {
      // Ensure arrays are properly formatted for JSON transmission
      const processedData = {
        ...data,
        secondaryInstruments: Array.isArray(data.secondaryInstruments) ? 
          data.secondaryInstruments : [],
        customGigTypes: Array.isArray(data.customGigTypes) ? 
          data.customGigTypes : []
      };
      
      const token = localStorage.getItem('authToken_dev') || localStorage.getItem(`authToken_${window.location.hostname}`);
      
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(processedData),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save settings: ${response.status} ${errorText}`);
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      
      setHasChanges(false);
      toast({
        title: "Success",
        description: "Settings saved successfully!",
      });
      
      // Don't reset the form immediately - let it keep the user's changes
      // The form will be updated when the settings query refreshes
      
      // Store the new data as initial data for comparison
      setInitialData(data);
      
      // Invalidate and refetch settings to get fresh data - but state variables already updated above
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (error) => {
      console.error('❌ Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handler for instrument selection
  const handleInstrumentChange = (instrument: string) => {
    setSelectedInstrument(instrument);
    const gigTypes = getGigTypeNamesForInstrument(instrument);
    setAvailableGigTypes(gigTypes);
    
    // Update the form with the selected instrument
    form.setValue('primaryInstrument', instrument);
    setHasChanges(true);
    
    console.log(`🎵 Instrument changed to: ${instrument}`);
    console.log(`🎵 Form value set to:`, form.getValues('primaryInstrument'));
    
    // Note: We don't call the separate endpoint here anymore
    // The instrument will be saved when the main form is submitted
    toast({
      title: "Instrument Selected",
      description: `Set to ${getInstrumentDisplayName(instrument)}. Remember to save your settings!`,
    });
  };

  // API function to update instrument and gig types
  const updateInstrumentAndGigTypes = async (instrument: string, gigTypes: string[]) => {
    try {
      const token = localStorage.getItem('authToken_dev') || localStorage.getItem(`authToken_${window.location.hostname}`);
      const response = await fetch('/api/settings/instrument', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          primaryInstrument: instrument,
          availableGigTypes: gigTypes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update instrument settings');
      }

      toast({
        title: "Instrument Updated",
        description: `Set to ${getInstrumentDisplayName(instrument)} with ${gigTypes.length} gig types`,
      });
    } catch (error) {
      console.error('Error updating instrument settings:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update instrument settings",
        variant: "destructive",
      });
    }
  };

  // Load existing widget token on page load
  useEffect(() => {
    const loadWidgetToken = async () => {
      try {
        const token = localStorage.getItem('authToken_dev') || localStorage.getItem(`authToken_${window.location.hostname}`);
        const response = await fetch('/api/get-widget-token', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.url) {
            setWidgetUrl(data.url);
            
            // Generate QR code for existing widget URL
            try {
              const qrResponse = await fetch('/api/generate-qr-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: data.url }),
                credentials: 'include',
              });
              
              if (qrResponse.ok) {
                const qrData = await qrResponse.json();
                setQrCodeUrl(qrData.qrCodeDataUrl);
              }
            } catch (qrError) {
              console.error('Failed to generate QR code:', qrError);
            }
          }
        }
      } catch (error) {
        console.error('Error loading widget token:', error);
      }
    };
    
    loadWidgetToken();
  }, []);

  // Initialize form when settings are loaded - CRITICAL FIX for instruments and gig types disappearing
  useEffect(() => {
    if (settings && !saveSettings.isPending) {
      
      
      // Create the form data object with actual values - include ALL fields from database
      const formData = {
        businessName: settings.businessName || "",
        businessEmail: settings.businessEmail || "",
        businessAddress: settings.businessAddress || "",
        addressLine1: settings.addressLine1 || "",
        addressLine2: settings.addressLine2 || "",
        city: settings.city || "",
        county: settings.county || "",
        postcode: settings.postcode || "",
        phone: settings.phone || "",
        website: settings.website || "",
        taxNumber: settings.taxNumber || "",
        emailFromName: settings.emailFromName || "",
        nextInvoiceNumber: settings.nextInvoiceNumber || 1,
        defaultTerms: settings.defaultTerms || "",
        bankDetails: settings.bankDetails || "",
        // AI Pricing Guide settings
        aiPricingEnabled: settings.aiPricingEnabled !== false,
        baseHourlyRate: settings.baseHourlyRate || 130,
        minimumBookingHours: settings.minimumBookingHours || 2,
        additionalHourRate: settings.additionalHourRate || 60,
        djServiceRate: settings.djServiceRate || 300,
        pricingNotes: settings.pricingNotes || "",
        specialOffers: settings.specialOffers || "",
        // Instrument settings
        primaryInstrument: settings.primaryInstrument || "",
        secondaryInstruments: Array.isArray(settings.secondaryInstruments) ? settings.secondaryInstruments : [],
        bookingDisplayLimit: settings.bookingDisplayLimit || "50",
        // Theme settings
        themeTemplate: settings.themeTemplate || "classic",
        themeTone: settings.themeTone || "professional",
        themeFont: settings.themeFont || "roboto",
        themeAccentColor: settings.themeAccentColor || "#673ab7",
        themeLogoUrl: settings.themeLogoUrl || "",
        themeSignatureUrl: settings.themeSignatureUrl || "",
        themeBanner: settings.themeBanner || "",
        themeShowSetlist: settings.themeShowSetlist || false,
        themeShowRiderNotes: settings.themeShowRiderNotes || false,
        themeShowQrCode: settings.themeShowQrCode || false,
        themeShowTerms: settings.themeShowTerms !== false,
        themeCustomTitle: settings.themeCustomTitle || "",
      };
      
      // Set up instrument state
      if (settings.primaryInstrument) {
        setSelectedInstrument(settings.primaryInstrument);
        const gigTypes = getGigTypeNamesForInstrument(settings.primaryInstrument);
        setAvailableGigTypes(gigTypes);
      }
      
      
      
      // Always reset form with loaded data - this is necessary for form to be editable
      form.reset(formData);
      
      // Store initial data for comparison
      setInitialData(formData);
      
      // Reset change tracking after form is initialized
      setHasChanges(false);
    }
  }, [settings, form, saveSettings.isPending]);

  // Simple form watcher for detecting changes - only start watching after initial data is loaded
  useEffect(() => {
    if (!initialData) return;

    let subscription: any = null;
    
    // Add a small delay to ensure form is fully initialized before starting to watch
    const timeoutId = setTimeout(() => {
      subscription = form.watch(() => {
        setHasChanges(true);
      });
    }, 100);
    
    return () => {
      clearTimeout(timeoutId);
      if (subscription) subscription.unsubscribe();
    };
  }, [form, initialData]);

  // Removed all instrument and gig type functions - feature moved to documentation



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

  if (settingsError) {
    console.error('🔥 Settings query error:', settingsError);
    return (
      <div className="min-h-screen bg-background layout-consistent">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600">Error loading settings: {settingsError.message}</p>
            <p className="text-muted-foreground mt-2">Please check if you're logged in.</p>
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
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent ml-12 md:ml-0">
                Settings
              </h1>
            </div>
          </div>
        </header>

        {/* Settings Content */}
        <div className="p-6 space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Add a debug div to see if form is working */}
              <div className="hidden">
                Form status: {JSON.stringify({ hasChanges, isPending: saveSettings.isPending })}
              </div>
              
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
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="businessName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Business Name</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} placeholder="Your Business Name" />
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
                          <FormLabel className="text-sm font-medium">Business Email</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} placeholder="business@example.com" type="email" />
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
                          <FormLabel className="text-sm font-medium">Phone</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} placeholder="+44 (0) 123 456 7890" />
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
                          <FormLabel className="text-sm font-medium">Email From Name</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} placeholder="Your Name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Business Address - Separate Fields */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                      <MapPin className="w-4 h-4 mr-2" />
                      Business Address
                    </h3>
                    
                    <FormField
                      control={form.control}
                      name="addressLine1"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Address Line 1</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} placeholder="123 Main Street" />
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
                          <FormLabel className="text-sm font-medium">Address Line 2 (Optional)</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} placeholder="Apartment, suite, etc." />
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
                            <FormLabel className="text-sm font-medium">City</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ""} placeholder="London" />
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
                            <FormLabel className="text-sm font-medium">County (Optional)</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ""} placeholder="Greater London" />
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
                            <FormLabel className="text-sm font-medium">Postcode</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ""} placeholder="SW1A 1AA" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Website</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} placeholder="https://yourwebsite.com" />
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
                            <Input {...field} value={field.value || ""} placeholder="TAX123456" />
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

              {/* Lead Email Management */}
              <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
                <Collapsible open={expandedSections.email} onOpenChange={() => toggleSection('email')}>
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="border-b border-gray-100 dark:border-slate-700 pb-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                      <CardTitle className="flex items-center justify-between text-lg">
                        <div className="flex items-center space-x-2">
                          <Mail className="w-5 h-5 text-primary" />
                          <span>Lead Email Management</span>
                        </div>
                        {expandedSections.email ? 
                          <ChevronDown className="w-5 h-5 text-gray-400" /> : 
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        }
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="p-6 space-y-4">
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-blue-900 dark:text-blue-100">Professional Email Address</h4>
                            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                              Your dedicated email address for receiving client inquiries that automatically create bookings.
                            </p>
                            <div className="mt-3 p-2 bg-white dark:bg-slate-800 rounded border border-blue-200 dark:border-blue-700">
                              <code className="text-sm font-mono text-blue-800 dark:text-blue-200">
                                Current: leads+yourprefix@mg.musobuddy.com
                              </code>
                            </div>
                            <div className="mt-3">
                              <Button 
                                type="button"
                                onClick={() => window.open('/email-setup', '_blank')}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                size="sm"
                              >
                                <Mail className="w-4 h-4 mr-2" />
                                Change Email Prefix
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>



              {/* Email Settings */}
              <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
                <Collapsible open={expandedSections.contact} onOpenChange={() => toggleSection('contact')}>
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="border-b border-gray-100 dark:border-slate-700 pb-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                      <CardTitle className="flex items-center justify-between text-lg">
                        <div className="flex items-center space-x-2">
                          <Globe className="w-5 h-5 text-primary" />
                          <span>Email Settings</span>
                        </div>
                        {expandedSections.contact ? 
                          <ChevronDown className="w-5 h-5 text-gray-400" /> : 
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        }
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
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
                  </CollapsibleContent>
                </Collapsible>
              </Card>

              {/* Invoice Settings */}
              <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
                <Collapsible open={expandedSections.financial} onOpenChange={() => toggleSection('financial')}>
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="border-b border-gray-100 dark:border-slate-700 pb-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                      <CardTitle className="flex items-center justify-between text-lg">
                        <div className="flex items-center space-x-2">
                          <Hash className="w-5 h-5 text-primary" />
                          <span>Invoice Settings</span>
                        </div>
                        {expandedSections.financial ? 
                          <ChevronDown className="w-5 h-5 text-gray-400" /> : 
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        }
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
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
                  </CollapsibleContent>
                </Collapsible>
              </Card>

              {/* Bank Details */}
              <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
                <Collapsible open={expandedSections.bank} onOpenChange={() => toggleSection('bank')}>
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="border-b border-gray-100 dark:border-slate-700 pb-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                      <CardTitle className="flex items-center justify-between text-lg">
                        <div className="flex items-center space-x-2">
                          <CreditCard className="w-5 h-5 text-primary" />
                          <span>Bank Details</span>
                        </div>
                        {expandedSections.bank ? 
                          <ChevronDown className="w-5 h-5 text-gray-400" /> : 
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        }
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
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
                  </CollapsibleContent>
                </Collapsible>
              </Card>

              {/* AI Pricing Guide */}
              <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
                <Collapsible open={expandedSections.pricing} onOpenChange={() => toggleSection('pricing')}>
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="border-b border-gray-100 dark:border-slate-700 pb-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                      <CardTitle className="flex items-center justify-between text-lg">
                        <div className="flex items-center space-x-2">
                          <Music className="w-5 h-5 text-primary" />
                          <span>AI Pricing Guide</span>
                        </div>
                        {expandedSections.pricing ? 
                          <ChevronDown className="w-5 h-5 text-gray-400" /> : 
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        }
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="p-6 space-y-6">
                      <div className="bg-primary/5 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <Music className="w-5 h-5 text-primary mt-0.5" />
                          <div>
                            <h4 className="font-medium text-primary-900 dark:text-primary/10">Smart Quote Generation</h4>
                            <p className="text-sm text-primary/90 dark:text-primary-300 mt-1">
                              Configure your pricing structure for AI-powered quote generation. These settings help the AI create accurate, professional quotes automatically.
                            </p>
                          </div>
                        </div>
                      </div>

                      <FormField
                        control={form.control}
                        name="aiPricingEnabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base font-medium">Enable AI Pricing</FormLabel>
                              <div className="text-sm text-muted-foreground">
                                Allow AI to generate pricing information in quotes and responses
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
                              <FormLabel className="text-sm font-medium">Base Hourly Rate (£)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  step="0.01" 
                                  {...field} 
                                  value={field.value?.toString() || ""}
                                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : "")}
                                  placeholder="130.00" 
                                />
                              </FormControl>
                              <div className="text-xs text-muted-foreground">
                                Used to calculate the base price (Rate × Minimum Hours)
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="minimumBookingHours"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Minimum Booking Hours</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  step="0.5" 
                                  {...field} 
                                  value={field.value?.toString() || ""}
                                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : "")}
                                  placeholder="2.0" 
                                />
                              </FormControl>
                              <div className="text-xs text-muted-foreground">
                                Minimum number of hours for any booking
                              </div>
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
                              <FormLabel className="text-sm font-medium">Additional Hour Rate (£)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  step="0.01" 
                                  {...field} 
                                  value={field.value?.toString() || ""}
                                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : "")}
                                  placeholder="60.00" 
                                />
                              </FormControl>
                              <div className="text-xs text-muted-foreground">
                                Rate per hour beyond the minimum booking
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* DJ Service Rate - only show if DJ is primary or secondary instrument */}
                        {(() => {
                          const primaryInstrument = form.watch('primaryInstrument');
                          const secondaryInstruments = form.watch('secondaryInstruments') || [];
                          return primaryInstrument === 'dj' || secondaryInstruments.includes('dj');
                        })() && (
                          <FormField
                            control={form.control}
                            name="djServiceRate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">DJ Service Rate (£)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    step="0.01" 
                                    {...field} 
                                    value={field.value?.toString() || ""}
                                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : "")}
                                    placeholder="300.00" 
                                  />
                                </FormControl>
                                <div className="text-xs text-muted-foreground">
                                  Additional charge for DJ services
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>

                      <FormField
                        control={form.control}
                        name="pricingNotes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">Pricing Notes</FormLabel>
                            <FormControl>
                              <Textarea 
                                {...field} 
                                value={field.value || ""}
                                placeholder="Special pricing information, package deals, or other notes to include in quotes"
                                rows={3} 
                              />
                            </FormControl>
                            <div className="text-xs text-muted-foreground">
                              Additional pricing information for AI to include in quotes
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="specialOffers"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">Current Special Offers</FormLabel>
                            <FormControl>
                              <Textarea 
                                {...field} 
                                value={field.value || ""}
                                placeholder="Limited time offers, seasonal discounts, or promotional packages"
                                rows={3} 
                              />
                            </FormControl>
                            <div className="text-xs text-muted-foreground">
                              Special offers for AI to mention in responses when appropriate
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <div className="w-5 h-5 rounded-full bg-amber-200 dark:bg-amber-700 flex items-center justify-center mt-0.5">
                            <span className="text-xs font-bold text-amber-800 dark:text-amber-200">£</span>
                          </div>
                          <div>
                            <h4 className="font-medium text-amber-900 dark:text-amber-100">Current Pricing Examples</h4>
                            <div className="text-sm text-amber-700 dark:text-amber-300 mt-1 space-y-1">
                              <div>• 2 hours sax: £{(Number(form.watch('baseHourlyRate')) * Number(form.watch('minimumBookingHours'))).toFixed(0)}</div>
                              <div>• 3 hours sax: £{(Number(form.watch('baseHourlyRate')) * Number(form.watch('minimumBookingHours')) + Number(form.watch('additionalHourRate'))).toFixed(0)}</div>
                              <div>• 2 hours sax + DJ: £{(Number(form.watch('baseHourlyRate')) * Number(form.watch('minimumBookingHours')) + Number(form.watch('djServiceRate'))).toFixed(0)}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>

              {/* Instrument Settings */}
              <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
                <Collapsible open={expandedSections.instruments} onOpenChange={() => toggleSection('instruments')}>
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="border-b border-gray-100 dark:border-slate-700 pb-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                      <CardTitle className="flex items-center justify-between text-lg">
                        <div className="flex items-center space-x-2">
                          <Music className="w-5 h-5 text-primary" />
                          <span>Instrument & AI Context</span>
                        </div>
                        {expandedSections.instruments ? 
                          <ChevronDown className="w-5 h-5 text-gray-400" /> : 
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        }
                      </CardTitle>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-2 text-left">
                        Set your primary instrument for contextual AI template generation
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="p-6 space-y-4">
                      <FormField
                        control={form.control}
                        name="primaryInstrument"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">Primary Instrument</FormLabel>
                            <Select 
                              value={field.value || selectedInstrument} 
                              onValueChange={(value) => {
                                field.onChange(value);
                                handleInstrumentChange(value);
                              }}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select your primary instrument" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {getAvailableInstruments()
                                  .filter(instrument => !form.watch('secondaryInstruments')?.includes(instrument))
                                  .map((instrument) => (
                                    <SelectItem key={instrument} value={instrument}>
                                      {getInstrumentDisplayName(instrument)}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                            <div className="text-xs text-gray-500 mt-1">
                              This helps AI generate appropriate pricing and service packages for your {selectedInstrument ? getInstrumentDisplayName(selectedInstrument) : 'instrument'} gigs
                            </div>
                          </FormItem>
                        )}
                      />

                      {/* Secondary Instruments */}
                      <FormField
                        control={form.control}
                        name="secondaryInstruments"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">Secondary Instruments</FormLabel>
                            <div className="space-y-2">
                              <div className="flex flex-wrap gap-2">
                                {field.value?.length > 0 ? (
                                  field.value?.map((instrument, index) => (
                                    <div key={index} className="flex items-center bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm">
                                      <span>{getInstrumentDisplayName(instrument)}</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updated = field.value?.filter((_, i) => i !== index) || [];
                                          field.onChange(updated);
                                          
                                          // Update available gig types when secondary instruments change
                                          const allInstruments = [form.watch('primaryInstrument'), ...updated].filter(Boolean);
                                          const combinedGigTypes = allInstruments.reduce((acc, instrument) => {
                                            const instrumentGigTypes = getGigTypeNamesForInstrument(instrument || '');
                                            return [...acc, ...instrumentGigTypes];
                                          }, [] as string[]);
                                          
                                          // Remove duplicates
                                          const uniqueGigTypes = Array.from(new Set(combinedGigTypes));
                                          setAvailableGigTypes(uniqueGigTypes);
                                        }}
                                        className="ml-2 text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-sm text-gray-500 italic">No secondary instruments selected</div>
                                )}
                                {/* Add a "Clear All" button if there are secondary instruments */}
                                {field.value?.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      field.onChange([]);
                                      // Update available gig types when all secondary instruments are removed
                                      const allInstruments = [form.watch('primaryInstrument')].filter(Boolean);
                                      const combinedGigTypes = allInstruments.reduce((acc, instrument) => {
                                        const instrumentGigTypes = getGigTypeNamesForInstrument(instrument || '');
                                        return [...acc, ...instrumentGigTypes];
                                      }, [] as string[]);
                                      
                                      const uniqueGigTypes = Array.from(new Set(combinedGigTypes));
                                      setAvailableGigTypes(uniqueGigTypes);
                                    }}
                                    className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 underline"
                                  >
                                    Clear All
                                  </button>
                                )}
                              </div>
                              <Select 
                                value="" // Always reset to empty after selection
                                onValueChange={(value) => {
                                  if (value && !field.value?.includes(value) && value !== form.watch('primaryInstrument')) {
                                    const updated = [...(field.value || []), value];
                                    field.onChange(updated);
                                    
                                    // Update available gig types when secondary instruments change
                                    const allInstruments = [form.watch('primaryInstrument'), ...updated].filter(Boolean);
                                    const combinedGigTypes = allInstruments.reduce((acc, instrument) => {
                                      const instrumentGigTypes = getGigTypeNamesForInstrument(instrument || '');
                                      return [...acc, ...instrumentGigTypes];
                                    }, [] as string[]);
                                    
                                    // Remove duplicates
                                    const uniqueGigTypes = Array.from(new Set(combinedGigTypes));
                                    setAvailableGigTypes(uniqueGigTypes);
                                  }
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Add secondary instrument" />
                                </SelectTrigger>
                                <SelectContent>
                                  {getAvailableInstruments()
                                    .filter(instrument => 
                                      instrument !== form.watch('primaryInstrument') && 
                                      !field.value?.includes(instrument)
                                    )
                                    .map((instrument) => (
                                      <SelectItem key={instrument} value={instrument}>
                                        {getInstrumentDisplayName(instrument)}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Add other instruments you play. AI will consider these for multi-service bookings. Click the × to remove individual instruments or "Clear All" to remove all secondary instruments.
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Show available gig types when instruments are selected */}
                      {(selectedInstrument || form.watch('secondaryInstruments')?.length > 0) && availableGigTypes.length > 0 && (
                        <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg">
                          <h4 className="text-sm font-medium mb-2">Available Gig Types for Your Instruments</h4>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {availableGigTypes.map((gigType, index) => (
                              <div key={index} className="bg-white dark:bg-slate-700 px-2 py-1 rounded border">
                                {gigType}
                              </div>
                            ))}
                          </div>
                          <div className="text-xs text-gray-500 mt-2">
                            These gig types will be available in booking forms and AI will use them for contextual template generation.
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>

              {/* Custom Gig Types */}
              <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
                <Collapsible open={expandedSections.gigTypes} onOpenChange={() => toggleSection('gigTypes')}>
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="border-b border-gray-100 dark:border-slate-700 pb-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                      <CardTitle className="flex items-center justify-between text-lg">
                        <div className="flex items-center space-x-2">
                          <Music className="w-5 h-5 text-primary" />
                          <span>Gig Types Management</span>
                        </div>
                        {expandedSections.gigTypes ? 
                          <ChevronDown className="w-5 h-5 text-gray-400" /> : 
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        }
                      </CardTitle>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-2 text-left">
                        View available gig types for your instruments and add custom ones
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="p-6 space-y-6">
                      {/* Available Gig Types Display */}
                      {(selectedInstrument || form.watch('secondaryInstruments')?.length > 0) && availableGigTypes.length > 0 && (
                        <div className="space-y-4">
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Available Gig Types for Your Instruments</h4>
                          <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                              {availableGigTypes.map((gigType, index) => (
                                <div key={index} className="bg-white dark:bg-slate-700 px-3 py-2 rounded-md border text-center">
                                  {gigType}
                                </div>
                              ))}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                              These gig types are available in booking forms and AI will use them for contextual template generation.
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Custom Gig Types Management */}
                      <FormField
                        control={form.control}
                        name="customGigTypes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">Your Custom Gig Types</FormLabel>
                            <div className="space-y-3">
                              {/* Display existing custom gig types */}
                              {field.value && Array.isArray(field.value) && field.value.length > 0 && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                                  <div className="flex flex-wrap gap-2">
                                    {field.value.map((gigType: string, index: number) => (
                                      <div key={index} className="flex items-center bg-white dark:bg-slate-700 px-3 py-1 rounded-full border text-sm">
                                        <span>{gigType}</span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const updated = field.value.filter((_: string, i: number) => i !== index);
                                            field.onChange(updated);
                                          }}
                                          className="ml-2 text-red-500 hover:text-red-700 text-xs"
                                        >
                                          ×
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* Add new custom gig type */}
                              <div className="flex gap-2">
                                <Input 
                                  placeholder="Add custom gig type (e.g., Masonic Lodge, Burlesque Show, Quiz Night)"
                                  value={customGigTypeInput}
                                  onChange={(e) => setCustomGigTypeInput(e.target.value)}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleAddCustomGigType();
                                    }
                                  }}
                                />
                                <Button 
                                  type="button" 
                                  onClick={handleAddCustomGigType}
                                  disabled={!customGigTypeInput.trim()}
                                  size="sm"
                                  className="px-4"
                                >
                                  Add
                                </Button>
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                Add specialized gig types unique to your business. These will be saved to your account and available in booking forms.
                              </div>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>

              {/* Performance Settings */}
              <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
                <Collapsible open={expandedSections.performance} onOpenChange={() => toggleSection('performance')}>
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="border-b border-gray-100 dark:border-slate-700 pb-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                      <CardTitle className="flex items-center justify-between text-lg">
                        <div className="flex items-center space-x-2">
                          <SettingsIcon className="w-5 h-5 text-primary" />
                          <span>Performance Settings</span>
                        </div>
                        {expandedSections.performance ? 
                          <ChevronDown className="w-5 h-5 text-gray-400" /> : 
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        }
                      </CardTitle>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-2 text-left">
                        Configure display options and performance preferences
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="p-6 space-y-4">
                      <FormField
                        control={form.control}
                        name="bookingDisplayLimit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">Booking Display Limit</FormLabel>
                            <FormControl>
                              <div className="space-y-3">
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="radio"
                                    id="limit-50"
                                    name="bookingDisplayLimit"
                                    value="50"
                                    checked={field.value === "50"}
                                    onChange={() => field.onChange("50")}
                                    className="text-primary"
                                  />
                                  <label htmlFor="limit-50" className="text-sm font-medium cursor-pointer">
                                    All future bookings + 50 past bookings (Recommended)
                                  </label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="radio"
                                    id="limit-all"
                                    name="bookingDisplayLimit"
                                    value="all"
                                    checked={field.value === "all"}
                                    onChange={() => field.onChange("all")}
                                    className="text-primary"
                                  />
                                  <label htmlFor="limit-all" className="text-sm font-medium cursor-pointer">
                                    Show all bookings
                                  </label>
                                </div>
                              </div>
                            </FormControl>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Choose your booking display preference. The recommended setting shows all upcoming gigs plus recent history, ensuring you never miss future bookings.
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>

              {/* Widget URL Management */}
              <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
                <Collapsible open={expandedSections.widget} onOpenChange={() => toggleSection('widget')}>
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="border-b border-gray-100 dark:border-slate-700 pb-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                      <CardTitle className="flex items-center justify-between text-lg">
                        <div className="flex items-center space-x-2">
                          <Link className="w-5 h-5 text-primary" />
                          <span>Booking Widget</span>
                        </div>
                        {expandedSections.widget ? 
                          <ChevronDown className="w-5 h-5 text-gray-400" /> : 
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        }
                      </CardTitle>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-2 text-left">
                        Share a direct booking form with your clients
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="p-6 space-y-4">
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <Link className="w-5 h-5 text-blue-600 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-blue-900 dark:text-blue-100">Standalone Booking Widget</h4>
                            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                              Generate a unique URL that clients can use to send booking requests directly to you. 
                              No login required - perfect for sharing on your website or in your email signature.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {!widgetUrl ? (
                          <div className="text-center p-6">
                            <p className="text-gray-600 dark:text-gray-400 mb-4">
                              You don't have a booking widget URL yet. Generate one to start accepting direct booking requests.
                            </p>
                            <Button
                              type="button"
                              onClick={generateWidgetUrl}
                              disabled={isGeneratingToken}
                              className="bg-primary hover:bg-primary/90"
                            >
                              {isGeneratingToken ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <Link className="w-4 h-4 mr-2" />
                                  Generate Widget URL
                                </>
                              )}
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div>
                              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
                                Your Booking Widget URL
                              </label>
                              <div className="flex items-center space-x-2">
                                <Input
                                  value={widgetUrl}
                                  readOnly
                                  className="flex-1 font-mono text-sm bg-gray-50 dark:bg-gray-800"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={copyWidgetUrl}
                                  className="shrink-0"
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(widgetUrl, '_blank')}
                                  className="shrink-0"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                            
                            {/* QR Code Display */}
                            {qrCodeUrl && (
                              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                <h5 className="font-medium text-blue-900 dark:text-blue-100 text-sm mb-3">QR Code for Mobile Access</h5>
                                <div className="flex items-start space-x-4">
                                  <img 
                                    src={qrCodeUrl} 
                                    alt="Widget QR Code" 
                                    className="w-32 h-32 border border-gray-200 dark:border-gray-600 rounded-lg bg-white"
                                  />
                                  <div className="flex-1">
                                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                                      Clients can scan this QR code with their phone to quickly access your booking form.
                                    </p>
                                    <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
                                      <li>• Perfect for business cards or flyers</li>
                                      <li>• Print and display at events</li>
                                      <li>• Share in social media posts</li>
                                    </ul>
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                              <h5 className="font-medium text-green-900 dark:text-green-100 text-sm mb-2">How to use your widget:</h5>
                              <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                                <li>• Share this URL directly with potential clients</li>
                                <li>• Add it to your website or email signature</li>
                                <li>• Clients can send booking requests without creating an account</li>
                                <li>• All requests appear in your dashboard automatically</li>
                              </ul>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>

              {/* Theme Customization */}
              <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
                <Collapsible open={expandedSections.themes} onOpenChange={() => toggleSection('themes')}>
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="border-b border-gray-100 dark:border-slate-700 pb-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                      <CardTitle className="flex items-center justify-between text-lg">
                        <div className="flex items-center space-x-2">
                          <SettingsIcon className="w-5 h-5 text-primary" />
                          <span>Invoice & Contract Themes</span>
                        </div>
                        {expandedSections.themes ? 
                          <ChevronDown className="w-5 h-5 text-gray-400" /> : 
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        }
                      </CardTitle>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-2 text-left">
                        Customize your invoices and contracts with professional themes, fonts, and branding
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="p-6 space-y-6">
                  {/* Template Selection */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Template Style</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {THEME_TEMPLATES.map((template) => (
                        <FormField
                          key={template.id}
                          control={form.control}
                          name="themeTemplate"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <label className={`block p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                  field.value === template.id
                                    ? 'border-primary/50 bg-primary/5 dark:bg-primary-900/20'
                                    : 'border-gray-200 dark:border-gray-600 hover:border-primary-300'
                                }`}>
                                  <input
                                    type="radio"
                                    {...field}
                                    value={template.id}
                                    checked={field.value === template.id}
                                    className="sr-only"
                                  />
                                  <div className="font-medium text-sm">{template.label}</div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {template.description}
                                  </div>
                                </label>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Tone Selection */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Tone & Language</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {THEME_TONES.map((tone) => (
                        <FormField
                          key={tone.id}
                          control={form.control}
                          name="themeTone"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <label className={`block p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                  field.value === tone.id
                                    ? 'border-primary/50 bg-primary/5 dark:bg-primary-900/20'
                                    : 'border-gray-200 dark:border-gray-600 hover:border-primary-300'
                                }`}>
                                  <input
                                    type="radio"
                                    {...field}
                                    value={tone.id}
                                    checked={field.value === tone.id}
                                    className="sr-only"
                                  />
                                  <div className="font-medium text-sm">{tone.label}</div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {tone.description}
                                  </div>
                                </label>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Font Selection */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Font Style</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {THEME_FONTS.map((font) => (
                        <FormField
                          key={font.id}
                          control={form.control}
                          name="themeFont"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <label className={`block p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                  field.value === font.id
                                    ? 'border-primary/50 bg-primary/5 dark:bg-primary-900/20'
                                    : 'border-gray-200 dark:border-gray-600 hover:border-primary-300'
                                }`}>
                                  <input
                                    type="radio"
                                    {...field}
                                    value={font.id}
                                    checked={field.value === font.id}
                                    className="sr-only"
                                  />
                                  <div className="font-medium text-sm">{font.label}</div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {font.description}
                                  </div>
                                </label>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Accent Color */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Accent Color</h3>
                    <FormField
                      control={form.control}
                      name="themeAccentColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="flex items-center space-x-4">
                              <div className="flex space-x-2">
                                {THEME_COLORS.map((color) => (
                                  <button
                                    key={color}
                                    type="button"
                                    onClick={() => field.onChange(color)}
                                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                                      field.value === color
                                        ? 'border-white shadow-lg scale-110'
                                        : 'border-gray-300 hover:scale-105'
                                    }`}
                                    style={{ backgroundColor: color }}
                                  />
                                ))}
                              </div>
                              <Input
                                type="color"
                                value={field.value || "#8B5CF6"}
                                onChange={(e) => field.onChange(e.target.value)}
                                className="w-16 h-8 border-0 rounded cursor-pointer"
                              />
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                {field.value}
                              </span>
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Custom Title */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Document Title</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {CUSTOM_TITLES.map((title) => (
                        <button
                          key={title.id}
                          type="button"
                          onClick={() => {
                            setSelectedCustomTitle(title.id);
                            if (title.id === 'custom') {
                              form.setValue('themeCustomTitle', '');
                            } else {
                              form.setValue('themeCustomTitle', title.label);
                            }
                          }}
                          className={`p-2 text-sm rounded-lg border transition-all ${
                            selectedCustomTitle === title.id
                              ? 'border-primary/50 bg-primary/5 dark:bg-primary-900/20'
                              : 'border-gray-200 dark:border-gray-600 hover:border-primary-300'
                          }`}
                        >
                          {title.label}
                        </button>
                      ))}
                    </div>
                    {selectedCustomTitle === 'custom' && (
                      <FormField
                        control={form.control}
                        name="themeCustomTitle"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Enter custom title"
                                className="mt-2"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  {/* Feature Toggles */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Optional Features</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="themeShowSetlist"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-sm font-medium cursor-pointer">
                                Show Setlist Section
                              </FormLabel>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Add a section for song lists and performance details
                              </p>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="themeShowRiderNotes"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-sm font-medium cursor-pointer">
                                Show Rider Notes
                              </FormLabel>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Include technical requirements and setup notes
                              </p>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="themeShowQrCode"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-sm font-medium cursor-pointer">
                                Show QR Code
                              </FormLabel>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Add QR code for social media or playlist links
                              </p>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="themeShowTerms"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-sm font-medium cursor-pointer">
                                Show Terms & Conditions
                              </FormLabel>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Include legal terms and payment conditions
                              </p>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Preview Button */}
                  <div className="flex justify-center pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      type="button"
                      onClick={async () => {
                        setIsGeneratingPreview(true);
                        const currentValues = form.getValues();
                        const themeSettings = {
                          template: currentValues.themeTemplate,
                          tone: currentValues.themeTone,
                          font: currentValues.themeFont,
                          accentColor: currentValues.themeAccentColor,
                          customTitle: currentValues.themeCustomTitle,
                          showSetlist: currentValues.themeShowSetlist,
                          showRiderNotes: currentValues.themeShowRiderNotes,
                          showQrCode: currentValues.themeShowQrCode,
                          showTerms: currentValues.themeShowTerms,
                          businessName: currentValues.businessName,
                          businessAddress: `${currentValues.addressLine1}, ${currentValues.city}, ${currentValues.postcode}`,
                          businessPhone: currentValues.phone,
                          businessEmail: currentValues.businessEmail,
                        };
                        
                        const url = await generateThemePreview(themeSettings);
                        if (url) {
                          setPreviewUrl(url);
                          setShowThemePreview(true);
                        } else {
                          toast({
                            title: "Preview Error",
                            description: "Could not generate theme preview. Please try again.",
                            variant: "destructive",
                          });
                        }
                        setIsGeneratingPreview(false);
                      }}
                      disabled={isGeneratingPreview}
                      className="bg-gradient-to-r from-primary to-blue-600 text-white hover:shadow-lg transition-all"
                    >
                      {isGeneratingPreview ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating Preview...
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4 mr-2" />
                          Preview Theme
                        </>
                      )}
                    </Button>
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
                                    <div className="w-2 h-2 rounded-full bg-white" />
                                  </div>
                                )}
                              </div>
                              
                              {/* Theme Preview */}
                              <div className="mt-3 p-3 rounded border" style={{ 
                                backgroundColor: theme.colors.background,
                                borderColor: theme.colors.primary + '20'
                              }}>
                                <div className="flex items-center justify-between">
                                  <div 
                                    className="text-xs font-medium"
                                    style={{ 
                                      color: theme.colors.text,
                                      fontFamily: theme.fonts.heading
                                    }}
                                  >
                                    Sample Dashboard
                                  </div>
                                  <div 
                                    className="w-3 h-3 rounded"
                                    style={{ backgroundColor: theme.colors.accent }}
                                  />
                                </div>
                                <div className="mt-2 space-y-1">
                                  <div 
                                    className="h-2 rounded"
                                    style={{ backgroundColor: theme.colors.primary, width: '60%' }}
                                  />
                                  <div 
                                    className="h-2 rounded"
                                    style={{ backgroundColor: theme.colors.secondary, width: '40%' }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                            Current Theme: {themes[currentTheme].name}
                          </h4>
                          <p className="text-xs text-blue-700 dark:text-blue-300">
                            {themes[currentTheme].description}
                          </p>
                          {currentTheme === 'retro-vinyl' && (
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                              ✨ This theme includes custom fonts and warm vintage colors for a unique musical aesthetic.
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>

              {/* Save Button */}
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={saveSettings.isPending || !hasChanges}
                  onClick={(e) => {
                    
                    
                    
                    
                    // Don't prevent default - let the form submit naturally
                  }}
                  className={`px-8 py-2 border-0 transition-all duration-300 ${
                    hasChanges && !saveSettings.isPending
                      ? 'bg-gradient-to-r from-primary to-blue-600 text-white hover:shadow-lg hover:scale-105'
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {saveSettings.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {hasChanges ? 'Save Settings' : 'No Changes'}
                    </>
                  )}
                </Button>

              </div>
            </form>
          </Form>
        </div>
      </div>

      {/* Theme Preview Dialog */}
      <Dialog open={showThemePreview} onOpenChange={setShowThemePreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Theme Preview</DialogTitle>
            <DialogDescription>
              Preview of your customized invoice and contract theme
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {previewUrl ? (
              <div className="border rounded-lg overflow-hidden">
                <iframe
                  src={previewUrl}
                  className="w-full h-[600px] border-0"
                  title="Theme Preview"
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                  <p className="text-gray-600 dark:text-gray-400">Loading preview...</p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}