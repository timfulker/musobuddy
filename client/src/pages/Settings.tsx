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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
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
  },
  {
    id: "cashPayment",
    text: "Payment in cash as agreed",
    description: "Payment to be made in cash according to agreed terms"
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
  invoicePaymentTerms: z.enum(["on_receipt", "3_days", "7_days", "14_days", "30_days", "on_performance", "cash_as_agreed"]).default("7_days"),
  defaultInvoiceDueDays: z.coerce.number().min(1, "Payment due days must be at least 1").max(365, "Payment due days cannot exceed 365"),
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
    cashPayment: z.boolean().optional(),
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
    invoicePaymentTerms: data.invoice_payment_terms || data.invoicePaymentTerms || "7_days",
    defaultInvoiceDueDays: data.default_invoice_due_days || data.defaultInvoiceDueDays || 7,
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
      cashPayment: data.contract_clauses?.cashPayment || data.contractClauses?.cashPayment || false,
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
  
  // Active section for sidebar navigation
  const [activeSection, setActiveSection] = useState('business');
  
  // Define all settings sections with completion logic
  const settingsSections = [
    {
      id: 'business',
      label: 'Business Information',
      icon: Building,
      checkCompletion: (data: SettingsFormData) => {
        return !!(data.businessName && data.businessEmail && data.phone && data.addressLine1 && data.city && data.postcode);
      }
    },
    {
      id: 'email',
      label: 'Email Settings',
      icon: Mail,
      checkCompletion: (data: SettingsFormData) => {
        return !!(data.emailFromName && data.emailSignature && data.emailPrefix);
      }
    },
    {
      id: 'contract',
      label: 'Contract & Invoice Settings',
      icon: FileText,
      checkCompletion: (data: SettingsFormData) => {
        const hasInvoiceSettings = !!(data.invoicePaymentTerms && data.nextInvoiceNumber);
        const hasContractClauses = Object.values(data.contractClauses || {}).some(Boolean);
        return hasInvoiceSettings && hasContractClauses;
      }
    },
    {
      id: 'bank',
      label: 'Bank Details',
      icon: CreditCard,
      checkCompletion: (data: SettingsFormData) => {
        return !!(data.bankDetails && data.bankDetails.length > 10);
      }
    },
    {
      id: 'pricing',
      label: 'AI Pricing Guide',
      icon: Receipt,
      checkCompletion: (data: SettingsFormData) => {
        return !!(data.baseHourlyRate && data.minimumBookingHours && data.additionalHourRate);
      }
    },
    {
      id: 'instruments',
      label: 'Instrument & AI Context',
      icon: Music,
      checkCompletion: (data: SettingsFormData) => {
        return !!(data.primaryInstrument);
      }
    },
    {
      id: 'performance',
      label: 'Performance Settings',
      icon: SettingsIcon,
      checkCompletion: (data: SettingsFormData) => {
        return !!(data.bookingDisplayLimit && data.distanceUnits);
      }
    },
    {
      id: 'widget',
      label: 'Booking Widget',
      icon: ExternalLink,
      checkCompletion: () => {
        return !!(widgetUrl && qrCodeUrl);
      }
    },
    {
      id: 'themes',
      label: 'App Theme',
      icon: Palette,
      checkCompletion: (data: SettingsFormData) => {
        return !!(data.themeTemplate && data.themeTone && data.themeFont);
      }
    }
  ];

  // Function to render the active section content
  const renderActiveSection = () => {
    switch (activeSection) {
      case 'business':
        return renderBusinessSection();
      case 'email':
        return renderEmailSection();
      case 'contract':
        return renderContractSection();
      case 'bank':
        return renderBankSection();
      case 'pricing':
        return renderPricingSection();
      case 'instruments':
        return renderInstrumentsSection();
      case 'performance':
        return renderPerformanceSection();
      case 'widget':
        return renderWidgetSection();
      case 'themes':
        return renderThemesSection();
      default:
        return renderBusinessSection();
    }
  };

  // Render functions for each settings section
  const renderBusinessSection = () => (
    <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
      <CardHeader className="border-b border-gray-100 dark:border-slate-700 pb-4">
        <CardTitle className="flex items-center space-x-2 text-lg">
          <Building className="w-5 h-5 text-primary" />
          <span>Business Information</span>
        </CardTitle>
      </CardHeader>
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
            name="website"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Website (Optional)</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ""} placeholder="https://www.yourwebsite.com" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Address Fields */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Business Address</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <Input {...field} value={field.value || ""} placeholder="Suite 100" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Town/City</FormLabel>
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
      </CardContent>
    </Card>
  );

  // Placeholder render functions for other sections (will implement with actual content)
  const renderEmailSection = () => (
    <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
      <CardHeader className="border-b border-gray-100 dark:border-slate-700 pb-4">
        <CardTitle className="flex items-center space-x-2 text-lg">
          <Mail className="w-5 h-5 text-primary" />
          <span>Email Settings</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              name="emailPrefix"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Email Prefix</FormLabel>
                  <FormControl>
                    <div className="flex items-center">
                      <Input {...field} value={field.value || ""} placeholder="your-name" className="rounded-r-none" />
                      <span className="bg-gray-50 dark:bg-gray-800 border border-l-0 border-input px-3 py-2 text-sm text-muted-foreground rounded-r-md">
                        @enquiries.musobuddy.com
                      </span>
                    </div>
                  </FormControl>
                  <FormDescription className="text-xs text-gray-600 dark:text-gray-400">
                    Your personalized email address for client enquiries
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
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
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );

  const renderContractSection = () => (
    <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
      <CardHeader className="border-b border-gray-100 dark:border-slate-700 pb-4">
        <CardTitle className="flex items-center space-x-2 text-lg">
          <FileText className="w-5 h-5 text-primary" />
          <span>Contract & Invoice Settings</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Invoice Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Invoice Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="nextInvoiceNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Next Invoice Number</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="00001" type="number" min="1" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="invoicePrefix"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Invoice Prefix (Optional)</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} placeholder="INV-" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <FormField
            control={form.control}
            name="invoicePaymentTerms"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Payment Terms</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment terms" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="on_receipt">Payment due on receipt</SelectItem>
                    <SelectItem value="3_days">Payment due within 3 days</SelectItem>
                    <SelectItem value="7_days">Payment due within 7 days</SelectItem>
                    <SelectItem value="14_days">Payment due within 14 days</SelectItem>
                    <SelectItem value="30_days">Payment due within 30 days</SelectItem>
                    <SelectItem value="on_performance">Payment due on date of performance</SelectItem>
                    <SelectItem value="cash_as_agreed">Payment in cash as agreed</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Contract Clauses */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Contract Clauses</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          
          {/* Custom Clauses */}
          <div className="space-y-4 mt-6">
            <div className="flex items-center justify-between">
              <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">Custom Clauses</h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const currentClauses = form.getValues('customClauses') || [];
                  form.setValue('customClauses', [...currentClauses, '']);
                }}
                className="flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Custom Clause</span>
              </Button>
            </div>
            
            <FormField
              control={form.control}
              name="customClauses"
              render={({ field }) => (
                <FormItem>
                  <div className="space-y-2">
                    {(field.value || []).map((clause, index) => (
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
                            const newClauses = (field.value || []).filter((_, i) => i !== index);
                            field.onChange(newClauses);
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderBankSection = () => (
    <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
      <CardHeader className="border-b border-gray-100 dark:border-slate-700 pb-4">
        <CardTitle className="flex items-center space-x-2 text-lg">
          <CreditCard className="w-5 h-5 text-primary" />
          <span>Bank Details</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="bankDetails"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Bank Account Details</FormLabel>
                <FormControl>
                  <textarea 
                    {...field} 
                    value={field.value || ""} 
                    placeholder="Bank Name: Example Bank&#10;Account Name: Your Business Name&#10;Sort Code: 12-34-56&#10;Account Number: 12345678"
                    className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    rows={6}
                  />
                </FormControl>
                <FormDescription className="text-xs text-gray-600 dark:text-gray-400">
                  These details will be included on your invoices for client payments
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );

  const renderPricingSection = () => {
    const watchedPrimaryInstrument = form.watch('primaryInstrument');
    const watchedSecondaryInstruments = form.watch('secondaryInstruments') || [];
    const isDJSelected = watchedPrimaryInstrument === 'dj' || watchedSecondaryInstruments.includes('dj');
    
    return (
    <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
      <CardHeader className="border-b border-gray-100 dark:border-slate-700 pb-4">
        <CardTitle className="flex items-center space-x-2 text-lg">
          <Receipt className="w-5 h-5 text-primary" />
          <span>AI Pricing Guide</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="aiPricingEnabled"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Enable AI Pricing Guide</FormLabel>
                  <FormDescription>
                    Help AI suggest appropriate pricing for bookings
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
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
                    <Input {...field} type="number" min="0" placeholder="130" />
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
                  <FormLabel className="text-sm font-medium">Minimum Booking Hours</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" min="0.5" step="0.5" placeholder="2" />
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
                  <FormLabel className="text-sm font-medium">Additional Hour Rate (£)</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" min="0" placeholder="60" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {isDJSelected && (
              <FormField
                control={form.control}
                name="djServiceRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">DJ Service Rate (£)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min="0" placeholder="300" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
          
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="pricingNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Pricing Notes</FormLabel>
                  <FormControl>
                    <textarea 
                      {...field} 
                      value={field.value || ""} 
                      placeholder="Special pricing considerations, seasonal rates, etc."
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      rows={3}
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
                  <FormLabel className="text-sm font-medium">Special Offers</FormLabel>
                  <FormControl>
                    <textarea 
                      {...field} 
                      value={field.value || ""} 
                      placeholder="Package deals, discounts for multiple bookings, etc."
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      </CardContent>
    </Card>
    );
  };

  const renderInstrumentsSection = () => {
    const availableInstruments = getAvailableInstruments();
    const watchedPrimaryInstrument = form.watch('primaryInstrument');
    const watchedSecondaryInstruments = form.watch('secondaryInstruments') || [];
    
    return (
      <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
        <CardHeader className="border-b border-gray-100 dark:border-slate-700 pb-4">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Music className="w-5 h-5 text-primary" />
            <span>Instrument & AI Context</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="primaryInstrument"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Primary Instrument</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your primary instrument" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">None selected</SelectItem>
                      {availableInstruments.map((instrument) => (
                        <SelectItem key={instrument} value={instrument}>
                          {getInstrumentDisplayName(instrument)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs text-gray-600 dark:text-gray-400">
                    Your main instrument helps AI understand your booking context
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="secondaryInstruments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Secondary Instruments (Optional)</FormLabel>
                  <div className="space-y-2">
                    {availableInstruments
                      .filter(instrument => instrument !== watchedPrimaryInstrument)
                      .map((instrument) => {
                        const isSelected = (field.value || []).includes(instrument);
                        return (
                          <div key={instrument} className="flex items-center space-x-2">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => {
                                const currentValues = field.value || [];
                                if (checked) {
                                  field.onChange([...currentValues, instrument]);
                                } else {
                                  field.onChange(currentValues.filter(v => v !== instrument));
                                }
                              }}
                            />
                            <FormLabel className="text-sm font-normal cursor-pointer">
                              {getInstrumentDisplayName(instrument)}
                            </FormLabel>
                          </div>
                        );
                      })}
                  </div>
                  <FormDescription className="text-xs text-gray-600 dark:text-gray-400">
                    Select any additional instruments you play
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderPerformanceSection = () => (
    <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
      <CardHeader className="border-b border-gray-100 dark:border-slate-700 pb-4">
        <CardTitle className="flex items-center space-x-2 text-lg">
          <SettingsIcon className="w-5 h-5 text-primary" />
          <span>Performance Settings</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="bookingDisplayLimit"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Booking Display Limit</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select display limit" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="50">Show 50 bookings</SelectItem>
                    <SelectItem value="all">Show all bookings</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription className="text-xs text-gray-600 dark:text-gray-400">
                  Controls how many bookings are displayed on the bookings page
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="distanceUnits"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Distance Units</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select distance units" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="miles">Miles</SelectItem>
                    <SelectItem value="km">Kilometers</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription className="text-xs text-gray-600 dark:text-gray-400">
                  Units used for displaying distances to venues
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );

  const renderWidgetSection = () => (
    <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
      <CardHeader className="border-b border-gray-100 dark:border-slate-700 pb-4">
        <CardTitle className="flex items-center space-x-2 text-lg">
          <ExternalLink className="w-5 h-5 text-primary" />
          <span>Booking Widget</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Generate a permanent booking widget URL that clients can use to request bookings directly.
          </p>
          
          {widgetUrl ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Input 
                  value={widgetUrl} 
                  readOnly 
                  className="flex-1 font-mono text-sm"
                />
                <Button 
                  onClick={copyWidgetUrl} 
                  variant="outline" 
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copy</span>
                </Button>
              </div>
              
              {qrCodeUrl && (
                <div className="flex flex-col items-center space-y-2">
                  <p className="text-sm font-medium">QR Code for easy sharing:</p>
                  <img 
                    src={qrCodeUrl} 
                    alt="Booking Widget QR Code" 
                    className="w-32 h-32 border rounded-lg"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Button 
                onClick={getOrCreateWidgetUrl}
                disabled={isGeneratingToken}
                className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90"
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
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderThemesSection = () => (
    <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
      <CardHeader className="border-b border-gray-100 dark:border-slate-700 pb-4">
        <CardTitle className="flex items-center space-x-2 text-lg">
          <Palette className="w-5 h-5 text-primary" />
          <span>App Theme</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="themeTemplate"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Theme Template</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select theme template" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {THEME_TEMPLATES.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex flex-col">
                          <span>{template.label}</span>
                          <span className="text-xs text-muted-foreground">{template.description}</span>
                        </div>
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
                <FormLabel className="text-sm font-medium">Theme Tone</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select theme tone" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {THEME_TONES.map((tone) => (
                      <SelectItem key={tone.id} value={tone.id}>
                        <div className="flex flex-col">
                          <span>{tone.label}</span>
                          <span className="text-xs text-muted-foreground">{tone.description}</span>
                        </div>
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
                <FormLabel className="text-sm font-medium">Font Family</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select font" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {THEME_FONTS.map((font) => (
                      <SelectItem key={font.id} value={font.id}>
                        <div className="flex flex-col">
                          <span>{font.label}</span>
                          <span className="text-xs text-muted-foreground">{font.description}</span>
                        </div>
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
            name="themeAccentColor"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Accent Color</FormLabel>
                <div className="flex items-center space-x-2">
                  <FormControl>
                    <Input {...field} value={field.value || ""} placeholder="#673ab7" />
                  </FormControl>
                  <div className="flex space-x-1">
                    {THEME_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => field.onChange(color)}
                        className="w-6 h-6 rounded border-2 border-gray-300 hover:border-gray-500"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );

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
        invoicePaymentTerms: settings.invoicePaymentTerms || "7_days",
        defaultInvoiceDueDays: settings.defaultInvoiceDueDays || 7,
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
        // Email prefix
        emailPrefix: settings.emailPrefix || "",
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

  // Calculate completion stats using existing form fields (after form is initialized)
  const currentFormData = form?.getValues() || {};
  const completedSections = settingsSections.filter(section => 
    section.checkCompletion(currentFormData)
  ).length;
  const completionPercentage = Math.round((completedSections / settingsSections.length) * 100);

  return (
    <div className="min-h-screen bg-background layout-consistent">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <MobileNav />
      
      <div className="main-content">
        {/* Header with Progress */}
        <header className="border-b border-gray-200 dark:border-slate-700 p-6 bg-gradient-to-r from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 shadow-sm md:hidden transition-all"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="ml-12 md:ml-0">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                  Settings
                </h1>
                <div className="flex items-center space-x-4 mt-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="h-2 bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-300"
                        style={{ width: `${completionPercentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {completedSections}/{settingsSections.length} completed ({completionPercentage}%)
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.href = '/dashboard'}
                    className="text-primary hover:text-primary"
                  >
                    ← Back to Dashboard
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Settings Layout with Sidebar */}
        <div className="flex min-h-[calc(100vh-120px)]">
          {/* Settings Navigation Sidebar */}
          <div className="w-80 border-r border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
            <nav className="space-y-2">
              {settingsSections.map((section) => {
                const Icon = section.icon;
                const isCompleted = section.checkCompletion(currentFormData);
                const isActive = activeSection === section.id;
                
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-all ${
                      isActive 
                        ? 'bg-primary/10 border-l-4 border-primary text-primary' 
                        : 'hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{section.label}</span>
                    </div>
                    {isCompleted && (
                      <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
          
          {/* Settings Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Render active section */}
                {renderActiveSection()}
                
                {/* Save Button */}
                <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-slate-700 mt-8">
                  <Button
                    type="submit"
                    disabled={saveSettings.isPending || !hasChanges}
                    className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white font-medium px-8 py-2 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
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
