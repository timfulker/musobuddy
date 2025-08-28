import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
// Removed label, badge imports - not needed without instrument selection
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { useResponsive } from "@/hooks/useResponsive";
import { Building, Save, MapPin, Globe, Hash, CreditCard, Loader2, Menu, Eye, ChevronDown, ChevronRight, Mail, Settings as SettingsIcon, Music, ExternalLink, Copy, Link, Palette, Receipt, FileText, Plus, X } from "lucide-react";
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

// Standard contract clauses that users can select
const STANDARD_CONTRACT_CLAUSES = [
  {
    id: "payment30",
    text: "Payment due within 30 days of performance",
    description: "Standard net-30 payment terms"
  },
  {
    id: "deposit50",
    text: "50% deposit required to secure booking",
    description: "Ensures commitment from client"
  },
  {
    id: "cancellation7",
    text: "Cancellations within 7 days forfeit deposit",
    description: "Protects against last-minute cancellations"
  },
  {
    id: "equipmentOwnership",
    text: "All equipment remains property of performer",
    description: "Clarifies ownership of musical instruments and equipment"
  },
  {
    id: "powerSupply",
    text: "Client must provide adequate power supply",
    description: "Ensures necessary electrical requirements are met"
  },
  {
    id: "venueAccess",
    text: "Client must provide reasonable venue access for setup",
    description: "Ensures performer can set up equipment properly"
  },
  {
    id: "weatherProtection",
    text: "Client must provide weather protection for outdoor events",
    description: "Protects equipment and performance quality"
  },
  {
    id: "finalNumbers",
    text: "Final guest numbers must be confirmed 7 days prior",
    description: "Helps with performance planning and setup"
  },
  {
    id: "noRecording",
    text: "No recording or broadcasting without written consent",
    description: "Protects performer's intellectual property rights"
  },
  {
    id: "forcemajeure",
    text: "Performance may be cancelled due to circumstances beyond performer's control",
    description: "Standard force majeure protection clause"
  }
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
  invoicePrefix: z.string().optional().or(z.literal("")), // Invoice number prefix
  contractClauses: z.object({
    payment30: z.boolean().optional(),
    deposit50: z.boolean().optional(),
    cancellation7: z.boolean().optional(),
    equipmentOwnership: z.boolean().optional(),
    powerSupply: z.boolean().optional(),
    venueAccess: z.boolean().optional(),
    weatherProtection: z.boolean().optional(),
    finalNumbers: z.boolean().optional(),
    noRecording: z.boolean().optional(),
    forcemajeure: z.boolean().optional(),
  }).optional(),
  customClauses: z.array(z.string()).optional().default([]), // Custom user-added clauses
  emailSignature: z.string().optional().or(z.literal("")),
  
  // AI Pricing Guide fields
  aiPricingEnabled: z.boolean().default(true),
  baseHourlyRate: z.coerce.number().min(0, "Base hourly rate must be positive").default(130),
  minimumBookingHours: z.coerce.number().min(0.5, "Minimum booking hours must be at least 30 minutes").default(2),
  additionalHourRate: z.coerce.number().min(0, "Additional hour rate must be positive").default(60),
  djServiceRate: z.coerce.number().min(0, "DJ service rate must be positive").default(300),
  pricingNotes: z.string().optional().or(z.literal("")),
  specialOffers: z.string().optional().or(z.literal("")),
  bankDetails: z.string().optional().or(z.literal("")),
  // Travel expense integration removed - always include travel in performance fee
  // Instrument and gig type settings  
  primaryInstrument: z.string().optional().or(z.literal("")),
  secondaryInstruments: z.array(z.string()).optional().default([]),
  customGigTypes: z.array(z.string()).optional().default([]),
  // Performance settings
  bookingDisplayLimit: z.enum(["50", "all"]).default("50"),
  distanceUnits: z.enum(["miles", "km"]).default("miles"), // Distance unit preference
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
  emailPrefix: z.string().optional(),
});

type SettingsFormData = z.infer<typeof settingsFormSchema>;

// Removed AI gig suggestion function - feature moved to documentation for future implementation

// REMOVED LOCAL AUTH FUNCTIONS - Using centralized utility instead

// API function for fetching settings
const fetchSettings = async (): Promise<SettingsFormData> => {
  // Use apiRequest which handles authentication properly
  const response = await apiRequest('/api/settings');
  const data = await response.json();
  
  
  // Removed instrument and gig type parsing - feature moved to documentation
  
  // Transform the data to match the expected form structure - fix snake_case to camelCase mapping
  return {
    businessName: data.business_name || data.businessName || "",
    businessEmail: data.business_email || data.businessEmail || "",
    businessAddress: data.business_address || data.businessAddress || "",
    addressLine1: data.address_line1 || data.addressLine1 || "",
    addressLine2: data.address_line2 || data.addressLine2 || "",
    city: data.city || "",
    county: data.county || "",
    postcode: data.postcode || "",
    phone: data.phone || "",
    website: data.website || "",
    taxNumber: data.tax_number || data.taxNumber || "",
    emailFromName: data.email_from_name || data.emailFromName || "",
    emailSignature: data.email_signature || data.emailSignature || "",
    nextInvoiceNumber: data.next_invoice_number || data.nextInvoiceNumber || 1,
    invoicePrefix: data.invoice_prefix || data.invoicePrefix || "",
    contractClauses: {
      payment30: data.contract_clauses?.payment30 || data.contractClauses?.payment30 || false,
      deposit50: data.contract_clauses?.deposit50 || data.contractClauses?.deposit50 || false,
      cancellation7: data.contract_clauses?.cancellation7 || data.contractClauses?.cancellation7 || false,
      equipmentOwnership: data.contract_clauses?.equipmentOwnership || data.contractClauses?.equipmentOwnership || false,
      powerSupply: data.contract_clauses?.powerSupply || data.contractClauses?.powerSupply || false,
      venueAccess: data.contract_clauses?.venueAccess || data.contractClauses?.venueAccess || false,
      weatherProtection: data.contract_clauses?.weatherProtection || data.contractClauses?.weatherProtection || false,
      finalNumbers: data.contract_clauses?.finalNumbers || data.contractClauses?.finalNumbers || false,
      noRecording: data.contract_clauses?.noRecording || data.contractClauses?.noRecording || false,
      forcemajeure: data.contract_clauses?.forcemajeure || data.contractClauses?.forcemajeure || false,
    },
    customClauses: Array.isArray(data.custom_clauses || data.customClauses) ? 
                   (data.custom_clauses || data.customClauses) : 
                   (typeof (data.custom_clauses || data.customClauses) === 'string' ? 
                    JSON.parse((data.custom_clauses || data.customClauses) || '[]') : []),
    bankDetails: (() => {
      const bankData = data.bank_details || data.bankDetails;
      if (!bankData) return "";
      
      // If it's already a formatted string, return as-is
      if (typeof bankData === 'string' && !bankData.startsWith('{')) {
        return bankData;
      }
      
      // If it's JSON or a JSON string, parse and format it
      try {
        const parsed = typeof bankData === 'string' ? JSON.parse(bankData) : bankData;
        if (parsed && typeof parsed === 'object') {
          const lines = [];
          if (parsed.bankName) lines.push(`Bank Name: ${parsed.bankName}`);
          if (parsed.accountName) lines.push(`Account Name: ${parsed.accountName}`);
          if (parsed.sortCode) lines.push(`Sort Code: ${parsed.sortCode}`);
          if (parsed.accountNumber) lines.push(`Account Number: ${parsed.accountNumber}`);
          return lines.join('\n');
        }
      } catch (error) {
        console.error('Error parsing bank details:', error);
      }
      
      return bankData || "";
    })(),
    // Instrument settings
    primaryInstrument: data.primary_instrument || data.primaryInstrument || "",
    secondaryInstruments: (() => {
      const instrumentsData = data.secondary_instruments || data.secondaryInstruments;
      if (Array.isArray(instrumentsData)) {
        return instrumentsData;
      }
      if (typeof instrumentsData === 'string' && instrumentsData.trim()) {
        try {
          return JSON.parse(instrumentsData);
        } catch (error) {
          console.error('❌ JSON parse error for secondaryInstruments:', error);
          console.error('❌ Problematic JSON string:', instrumentsData);
          return [];
        }
      }
      return [];
    })(),
    customGigTypes: (() => {
      const gigTypesData = data.custom_gig_types || data.customGigTypes;
      if (Array.isArray(gigTypesData)) {
        return gigTypesData;
      }
      if (typeof gigTypesData === 'string' && gigTypesData.trim()) {
        try {
          return JSON.parse(gigTypesData);
        } catch (error) {
          console.error('❌ JSON parse error for customGigTypes:', error);
          console.error('❌ Problematic JSON string:', gigTypesData);
          console.error('❌ String at position 19:', gigTypesData.slice(15, 25));
          return [];
        }
      }
      return [];
    })(),
    // Performance settings
    bookingDisplayLimit: data.booking_display_limit || data.bookingDisplayLimit || "50",
    distanceUnits: data.distance_units || data.distanceUnits || "miles",
    // Theme preferences
    themeTemplate: data.theme_template || data.themeTemplate || "classic",
    themeTone: data.theme_tone || data.themeTone || "formal",
    themeFont: data.theme_font || data.themeFont || "roboto",
    themeAccentColor: data.theme_accent_color || data.themeAccentColor || "#673ab7",
    themeLogoUrl: data.theme_logo_url || data.themeLogoUrl || "",
    themeSignatureUrl: data.theme_signature_url || data.themeSignatureUrl || "",
    themeBanner: data.theme_banner || data.themeBanner || "",
    themeShowSetlist: data.theme_show_setlist || data.themeShowSetlist || false,
    themeShowRiderNotes: data.theme_show_rider_notes || data.themeShowRiderNotes || false,
    themeShowQrCode: data.theme_show_qr_code || data.themeShowQrCode || false,
    themeShowTerms: (data.theme_show_terms !== undefined ? data.theme_show_terms : data.themeShowTerms) !== false, // Default to true
    themeCustomTitle: data.theme_custom_title || data.themeCustomTitle || "",
    
    // AI Pricing Guide fields
    aiPricingEnabled: (data.ai_pricing_enabled !== undefined ? data.ai_pricing_enabled : data.aiPricingEnabled) ?? true,
    baseHourlyRate: data.base_hourly_rate || data.baseHourlyRate || 130,
    minimumBookingHours: data.minimum_booking_hours || data.minimumBookingHours || 2,
    additionalHourRate: data.additional_hour_rate || data.additionalHourRate || 60,
    djServiceRate: data.dj_service_rate || data.djServiceRate || 300,
    pricingNotes: data.pricing_notes || data.pricingNotes || "",
    specialOffers: data.special_offers || data.specialOffers || "",
    // Travel expense integration removed - always include travel in performance fee
    emailPrefix: data.emailPrefix || "",
  };
};

// Theme preview functionality
const generateThemePreview = async (themeSettings: any) => {
  try {
    // For blob responses, we need to use fetch directly with auth token
    const token = getAuthToken();
    if (!token) {
      throw new Error('No authentication token available');
    }
    
    const response = await fetch('/api/theme-preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
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
  const { currentTheme, setTheme, customColor, setCustomColor } = useTheme();
  
  // Debug: Log current theme state
  console.log('🎨 Settings component - current theme:', currentTheme);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Instrument state
  const [selectedInstrument, setSelectedInstrument] = useState<string>("");

  // State for theme preview
  const [showThemePreview, setShowThemePreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [selectedCustomTitle, setSelectedCustomTitle] = useState("invoice");
  // Custom gig types are now managed behind the scenes
  
  // Widget token state
  const [widgetUrl, setWidgetUrl] = useState<string>('');
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  
  // Track if form has been modified
  const [hasChanges, setHasChanges] = useState(false);
  const [initialData, setInitialData] = useState<SettingsFormData | null>(null);
  
  // Collapsible state for each section
  const [expandedSections, setExpandedSections] = useState({
    business: true,
    email: false,
    contact: false,
    address: false,
    financial: false,
    contract: false, // Contract & Invoice settings section
    bank: false,
    pricing: false, // AI Pricing Guide section
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


  // Get or create permanent widget URL and QR code
  const getOrCreateWidgetUrl = async () => {
    setIsGeneratingToken(true);
    try {
      const response = await apiRequest('/api/get-widget-info', {
        method: 'GET',
      });
      const data = await response.json();
      
      if (data.url && data.qrCode) {
        // User already has a permanent widget
        setWidgetUrl(data.url);
        setQrCodeUrl(data.qrCode);
        console.log('✅ Retrieved existing permanent widget');
        
        // Ensure widget info query is also updated
        await refetchWidgetInfo();
      } else {
        // Create new permanent widget
        console.log('🔧 Calling generate-widget-token API...');
        const newResponse = await apiRequest('/api/generate-widget-token', {
          method: 'POST',
        });
        const newData = await newResponse.json();
        console.log('🔧 Parsed response data:', newData);
        
        // Check if the API returned an error message instead of data
        if (newData.error) {
          console.error('API Error:', newData.error);
          throw new Error(`Failed to generate QR code - ${newData.error}`);
        }
        
        // Handle response - check for either qrCode or qrCodeDataUrl (for compatibility)
        const qrCodeData = newData.qrCode || newData.qrCodeDataUrl;
        const widgetUrlData = newData.url || newData.widgetUrl;
        
        if (widgetUrlData && qrCodeData) {
          setWidgetUrl(widgetUrlData);
          setQrCodeUrl(qrCodeData);
          console.log('✅ Created new permanent widget');
          
          // Invalidate and refetch widget info to ensure persistence
          await refetchWidgetInfo();
        } else {
          console.error('QR code response missing data:', newData);
          throw new Error('Failed to generate QR code - please try again');
        }
      }
      
      toast({
        title: "Widget Ready",
        description: "Your permanent booking widget URL and QR code are ready!",
      });
    } catch (error) {
      console.error('Error getting widget URL:', error);
      toast({
        title: "Error",
        description: "Failed to get widget URL. Please try again.",
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
      
      // Use apiRequest which handles authentication properly
      return await apiRequest('/api/settings', {
        method: 'PATCH',
        body: JSON.stringify(processedData),
      });
    },
    onSuccess: async (response) => {
      const data = await response.json();
      setHasChanges(false);
      toast({
        title: "Success",
        description: "Settings saved successfully!",
      });
      
      // Don't reset the form immediately - let it keep the user's changes
      
      // Invalidate settings cache to refresh data immediately
      queryClient.invalidateQueries({ queryKey: ['settings'] });
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
    
    // Update the form with the selected instrument
    form.setValue('primaryInstrument', instrument);
    
    // Remove the new primary instrument from secondary instruments if it's there
    const currentSecondary = form.getValues('secondaryInstruments') || [];
    const updatedSecondary = currentSecondary.filter(sec => sec !== instrument);
    if (updatedSecondary.length !== currentSecondary.length) {
      form.setValue('secondaryInstruments', updatedSecondary);
    }
    
    // Only populate gig types if customGigTypes is empty (initial setup)
    const currentGigTypes = form.getValues('customGigTypes') || [];
    if (currentGigTypes.length === 0) {
      const allInstruments = [instrument, ...updatedSecondary].filter(Boolean);
      const combinedGigTypes = allInstruments.reduce((acc, inst) => {
        const instrumentGigTypes = getGigTypeNamesForInstrument(inst || '');
        return [...acc, ...instrumentGigTypes];
      }, [] as string[]);
      
      const uniqueGigTypes = Array.from(new Set(combinedGigTypes));
      form.setValue('customGigTypes', uniqueGigTypes);
      
      console.log(`🎵 Initial gig types populated: ${uniqueGigTypes.length} types for ${instrument}`);
    }
    
    setHasChanges(true);
    
    toast({
      title: "Instrument Selected", 
      description: `Primary instrument set to ${getInstrumentDisplayName(instrument)}. Remember to save your settings!`,
    });
  };

  // API function to update instrument and gig types
  const updateInstrumentAndGigTypes = async (instrument: string, gigTypes: string[]) => {
    try {
      const token = getAuthToken();
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

  // Load existing widget info using React Query
  const { data: widgetInfo, refetch: refetchWidgetInfo } = useQuery({
    queryKey: ['widget-info'],
    queryFn: async () => {
      const response = await apiRequest('/api/get-widget-info');
      return response.json();
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });

  // Update local state when widget info changes
  useEffect(() => {
    if (widgetInfo?.url && widgetInfo?.qrCode) {
      setWidgetUrl(widgetInfo.url);
      setQrCodeUrl(widgetInfo.qrCode);
      console.log('✅ Loaded widget info from query');
    }
  }, [widgetInfo]);

  // Initialize form when settings are loaded - CRITICAL FIX for instruments and gig types disappearing
  useEffect(() => {
    if (settings && !saveSettings.isPending) {
      
      
      // Create the form data object with actual values
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
        emailSignature: settings.emailSignature || "",
        nextInvoiceNumber: settings.nextInvoiceNumber || 1,
        defaultTerms: settings.defaultTerms || "",
        bankDetails: (() => {
          const bankData = settings.bankDetails;
          if (!bankData) return "";
          
          // If it's already a formatted string, return as-is
          if (typeof bankData === 'string' && !bankData.startsWith('{')) {
            return bankData;
          }
          
          // If it's JSON or a JSON string, parse and format it
          try {
            const parsed = typeof bankData === 'string' ? JSON.parse(bankData) : bankData;
            if (parsed && typeof parsed === 'object') {
              const lines = [];
              if (parsed.bankName) lines.push(`Bank Name: ${parsed.bankName}`);
              if (parsed.accountName) lines.push(`Account Name: ${parsed.accountName}`);
              if (parsed.sortCode) lines.push(`Sort Code: ${parsed.sortCode}`);
              if (parsed.accountNumber) lines.push(`Account Number: ${parsed.accountNumber}`);
              return lines.join('\n');
            }
          } catch (error) {
            console.error('Error parsing bank details:', error);
          }
          
          return bankData || "";
        })(),
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
        distanceUnits: settings.distanceUnits || "miles",
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
        // Gig types
        customGigTypes: Array.isArray(settings.customGigTypes) ? settings.customGigTypes : [],
        // Travel expense integration removed - always include travel in performance fee
      };
      
      // Set up instrument state
      if (settings.primaryInstrument) {
        setSelectedInstrument(settings.primaryInstrument);
        
        // Gig types are now managed through customGigTypes in the database
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
        <div className="p-6 space-y-6 pb-24 md:pb-6">
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
                    <FormField
                      control={form.control}
                      name="emailSignature"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Email Signature</FormLabel>
                          <FormControl>
                            <textarea 
                              {...field} 
                              value={field.value || ""} 
                              placeholder="Best regards,&#10;Tim Fulker&#10;www.saxdj.co.uk&#10;07764190034"
                              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              rows={4}
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">
                            Your custom email signature that will appear at the end of all template emails
                          </p>
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

              {/* Email Settings */}
              <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
                <Collapsible open={expandedSections.email} onOpenChange={() => toggleSection('email')}>
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="border-b border-gray-100 dark:border-slate-700 pb-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                      <CardTitle className="flex items-center justify-between text-lg">
                        <div className="flex items-center space-x-2">
                          <Mail className="w-5 h-5 text-primary" />
                          <span>Email Settings</span>
                        </div>
                        {expandedSections.email ? 
                          <ChevronDown className="w-5 h-5 text-gray-400" /> : 
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        }
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="p-6 space-y-6">
                      {/* Professional Email Address */}
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
                                Current: {settings?.emailPrefix || 'Not set'}@enquiries.musobuddy.com
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

                      {/* Email From Name */}
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



              {/* Contract & Invoice Settings */}
              <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
                <Collapsible open={expandedSections.contract} onOpenChange={() => toggleSection('contract')}>
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="border-b border-gray-100 dark:border-slate-700 pb-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                      <CardTitle className="flex items-center justify-between text-lg">
                        <div className="flex items-center space-x-2">
                          <FileText className="w-5 h-5 text-primary" />
                          <span>Contract & Invoice Settings</span>
                        </div>
                        {expandedSections.contract ? 
                          <ChevronDown className="w-5 h-5 text-gray-400" /> : 
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        }
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="p-6 space-y-6">
                      {/* Invoice Settings */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                          <Receipt className="w-4 h-4 mr-2" />
                          Invoice Settings
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="invoicePrefix"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">Invoice Number Prefix</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    value={field.value || ""} 
                                    placeholder="INV" 
                                    maxLength={5}
                                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                  />
                                </FormControl>
                                <FormDescription className="text-xs text-gray-600 dark:text-gray-400">
                                  Set a custom prefix for your invoice numbers (e.g., JS-0001). Leave blank to auto-generate from your business name.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
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
                        </div>
                      </div>

                      {/* Contract Terms */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                          <FileText className="w-4 h-4 mr-2" />
                          Contract Terms & Conditions
                        </h3>
                        
                        <div className="space-y-3">
                          <FormLabel className="text-sm font-medium">Standard Clauses</FormLabel>
                          <div className="grid grid-cols-1 gap-3 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
                            {STANDARD_CONTRACT_CLAUSES.map((clause) => (
                              <FormField
                                key={clause.id}
                                control={form.control}
                                name={`contractClauses.${clause.id}`}
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                      />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                      <FormLabel className="text-sm font-normal cursor-pointer">
                                        {clause.text}
                                      </FormLabel>
                                      {clause.description && (
                                        <FormDescription className="text-xs">
                                          {clause.description}
                                        </FormDescription>
                                      )}
                                    </div>
                                  </FormItem>
                                )}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Custom Clauses */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <FormLabel className="text-sm font-medium">Custom Clauses</FormLabel>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const current = form.getValues("customClauses") || [];
                                form.setValue("customClauses", [...current, ""]);
                              }}
                              className="text-xs"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Add Clause
                            </Button>
                          </div>
                          
                          <FormField
                            control={form.control}
                            name="customClauses"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <div className="space-y-2">
                                    {(field.value || []).map((clause: string, index: number) => (
                                      <div key={index} className="flex items-center space-x-2">
                                        <Input
                                          value={clause}
                                          onChange={(e) => {
                                            const newClauses = [...(field.value || [])];
                                            newClauses[index] = e.target.value;
                                            field.onChange(newClauses);
                                          }}
                                          placeholder="Enter custom contract clause..."
                                          className="flex-1"
                                        />
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            const newClauses = [...(field.value || [])];
                                            newClauses.splice(index, 1);
                                            field.onChange(newClauses);
                                          }}
                                        >
                                          <X className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    ))}
                                    {(!field.value || field.value.length === 0) && (
                                      <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                                        No custom clauses added yet. Click "Add Clause" to create your own terms.
                                      </p>
                                    )}
                                  </div>
                                </FormControl>
                                <FormDescription className="text-xs text-gray-600 dark:text-gray-400">
                                  Add your own custom contract terms and conditions. These will appear alongside selected standard clauses.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
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
                      
                      {/* Travel expenses are now always included in performance fee - toggle removed for simplicity */}
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
                                          
                                          // Secondary instruments don't auto-modify gig types - users manage manually
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
                                      // Clear All doesn't auto-modify gig types - users manage manually
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
                                    
                                    // Remove duplicates - gig types now managed through customGigTypes field
                                    const uniqueGigTypes = Array.from(new Set(combinedGigTypes));
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

                      {/* Gig types are now managed behind the scenes - populated on initial instrument selection */}
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
                      
                      {/* Distance Units Preference */}
                      <FormField
                        control={form.control}
                        name="distanceUnits"
                        render={({ field }) => (
                          <FormItem className="mt-6">
                            <FormLabel className="text-sm font-medium">Distance Units</FormLabel>
                            <FormControl>
                              <div className="space-y-3">
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="radio"
                                    id="miles"
                                    name="distanceUnits"
                                    value="miles"
                                    checked={field.value === "miles"}
                                    onChange={() => field.onChange("miles")}
                                    className="text-primary"
                                  />
                                  <label htmlFor="miles" className="text-sm font-medium cursor-pointer">
                                    Miles
                                  </label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="radio"
                                    id="km"
                                    name="distanceUnits"
                                    value="km"
                                    checked={field.value === "km"}
                                    onChange={() => field.onChange("km")}
                                    className="text-primary"
                                  />
                                  <label htmlFor="km" className="text-sm font-medium cursor-pointer">
                                    Kilometers
                                  </label>
                                </div>
                              </div>
                            </FormControl>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Choose how distances are displayed in mileage calculations
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
                        {!widgetUrl && (
                          <div className="text-center p-6">
                            <p className="text-gray-600 dark:text-gray-400 mb-4">
                              Get your permanent booking widget URL and QR code to start accepting direct booking requests.
                            </p>
                            <Button
                              type="button"
                              onClick={getOrCreateWidgetUrl}
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
                                  Get My Widget & QR Code
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                        
                        {widgetUrl && (
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
                          {Object.values(themes).filter(theme => theme.id !== 'custom').map((theme) => (
                            <div
                              key={theme.id}
                              onClick={() => {
                                console.log('🎨 User clicked theme:', theme.id);
                                setTheme(theme.id);
                                // FIXED: Also update the form field so the theme color gets saved to database
                                form.setValue('themeAccentColor', theme.colors.primary);
                                console.log('🎨 Updated form themeAccentColor:', theme.colors.primary);
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
                          
                          {/* Custom Color Theme Option */}
                          <div
                            className={`p-4 rounded-lg border-2 transition-all ${
                              currentTheme === 'custom'
                                ? 'border-theme-primary bg-theme-primary/10'
                                : 'border-gray-200 dark:border-gray-600 hover:border-theme-primary/50'
                            }`}
                          >
                            <div 
                              onClick={() => {
                                console.log('🎨 User clicked custom theme');
                                console.log('🎨 Current theme before:', currentTheme);
                                setTheme('custom');
                                console.log('🎨 Set theme to custom');
                                const colorToUse = customColor || '#8b5cf6';
                                form.setValue('themeAccentColor', colorToUse);
                                console.log('🎨 Updated form themeAccentColor with:', colorToUse);
                              }}
                              className="cursor-pointer"
                            >
                              <div className="flex items-center space-x-3">
                                <div 
                                  className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                                  style={{ backgroundColor: customColor || '#8b5cf6' }}
                                />
                                <div className="flex-1">
                                  <h4 className="font-medium text-sm" style={{ 
                                    color: currentTheme === 'custom' ? (customColor || '#8b5cf6') : 'inherit'
                                  }}>
                                    Custom Color
                                  </h4>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Choose your own custom accent color
                                  </p>
                                </div>
                                {currentTheme === 'custom' && (
                                  <div className="w-5 h-5 rounded-full bg-theme-primary flex items-center justify-center">
                                    <div className="w-2 h-2 rounded-full bg-white" />
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Color Picker - Only show when custom theme is selected */}
                            {currentTheme === 'custom' && (
                              <div className="mt-4 space-y-3 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-dashed border-gray-300">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                  🎨 Pick your custom color:
                                </label>
                                <div className="flex items-center space-x-3">
                                  <input
                                    type="color"
                                    value={customColor || '#8b5cf6'}
                                    onChange={(e) => {
                                      const newColor = e.target.value;
                                      console.log('🎨 User picked custom color:', newColor);
                                      setCustomColor(newColor);
                                      form.setValue('themeAccentColor', newColor);
                                      console.log('🎨 Updated form themeAccentColor:', newColor);
                                    }}
                                    className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                                  />
                                  <div className="flex-1">
                                    <input
                                      type="text"
                                      value={customColor || '#8b5cf6'}
                                      onChange={(e) => {
                                        const newColor = e.target.value;
                                        if (/^#[0-9A-Fa-f]{6}$/.test(newColor)) {
                                          setCustomColor(newColor);
                                          form.setValue('themeAccentColor', newColor);
                                        }
                                      }}
                                      placeholder="#8b5cf6"
                                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-theme-primary focus:border-transparent"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                      Enter a hex color code (e.g., #ff0066)
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Theme Preview - same as other themes */}
                            <div className="mt-3 p-3 rounded border" style={{ 
                              backgroundColor: themes.custom.colors.background,
                              borderColor: (customColor || themes.custom.colors.primary) + '20'
                            }}>
                              <div className="flex items-center justify-between">
                                <div 
                                  className="text-xs font-medium"
                                  style={{ 
                                    color: themes.custom.colors.text,
                                    fontFamily: themes.custom.fonts.heading
                                  }}
                                >
                                  Sample Dashboard
                                </div>
                                <div 
                                  className="w-3 h-3 rounded"
                                  style={{ backgroundColor: themes.custom.colors.accent }}
                                />
                              </div>
                              <div className="mt-2 space-y-1">
                                <div 
                                  className="h-2 rounded"
                                  style={{ backgroundColor: customColor || themes.custom.colors.primary, width: '60%' }}
                                />
                                <div 
                                  className="h-2 rounded"
                                  style={{ backgroundColor: themes.custom.colors.secondary, width: '40%' }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                            Current Theme: {themes[currentTheme].name}
                          </h4>
                          <p className="text-xs text-blue-700 dark:text-blue-300">
                            {themes[currentTheme].description}
                          </p>
                          {currentTheme === 'custom' && (
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                              ✨ You've selected a custom color theme. Your chosen color will be used throughout the app and in generated documents.
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>

              {/* Save Button */}
              <div className="flex justify-end pt-4 pb-8 md:pb-4">
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