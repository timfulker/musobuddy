import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm, Controller } from "react-hook-form";
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
import { Building, Save, MapPin, Globe, Hash, CreditCard, Loader2, Menu, Eye, ChevronDown, ChevronRight, Mail, Settings as SettingsIcon, Music, ExternalLink, Copy, Link, Palette, Receipt, FileText, Plus, X, Shield, Sparkles, Upload, Download, AlertTriangle, CheckCircle, Clock } from "lucide-react";
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

const THEME_OPTIONS = [
  { id: "purple", color: "#8b5cf6", name: "Purple" },
  { id: "ocean-blue", color: "#0ea5e9", name: "Ocean Blue" },
  { id: "forest-green", color: "#16a34a", name: "Forest Green" },
  { id: "clean-pro-audio", color: "#e53935", name: "Clean Pro Audio" },
  { id: "midnight-blue", color: "#191970", name: "Midnight Blue" }
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
  businessName: z.string().optional().or(z.literal("")),
  businessEmail: z.string().optional().or(z.literal("")).refine(
    (val) => !val || val.includes("@"),
    "Please enter a valid email address"
  ),
  addressLine1: z.string().optional().or(z.literal("")),
  addressLine2: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  county: z.string().optional().or(z.literal("")),
  postcode: z.string().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  website: z.string().optional().or(z.literal("")),
  taxNumber: z.string().optional().or(z.literal("")),
  emailFromName: z.string().optional().or(z.literal("")),
  nextInvoiceNumber: z.coerce.number().min(1, "Next invoice number is required"),
  invoicePrefix: z.string().optional().or(z.literal("")), // Invoice number prefix
  defaultInvoiceDueDays: z.coerce.number().min(1, "Payment due days must be at least 1").max(365, "Payment due days cannot exceed 365"),
  contractClauses: z.object({
    paymentTerms: z.enum(["28_days_before", "14_days_before", "7_days_before", "on_performance", "on_receipt", "7_days_after", "14_days_after", "28_days_after", "7_days", "14_days", "30_days", "cash_as_agreed", "3_days"]).optional(),
    deposit: z.boolean().optional(),
    balancePayment: z.boolean().optional(),
    cancellation: z.boolean().optional(),
    performerCancellation: z.boolean().optional(),
    access: z.boolean().optional(),
    power: z.boolean().optional(),
    equipment: z.boolean().optional(),
    spaceAndSafety: z.boolean().optional(),
    weather: z.boolean().optional(),
    soundLimits: z.boolean().optional(),
    overtime: z.boolean().optional(),
    guestNumbers: z.boolean().optional(),
    mealsRefreshments: z.boolean().optional(),
    parkingTravel: z.boolean().optional(),
    recording: z.boolean().optional(),
    insurance: z.boolean().optional(),
    forceMajeure: z.boolean().optional(),
    governingLaw: z.boolean().optional(),
    // Legacy names for backward compatibility
    powerSupply: z.boolean().optional(),
    venueAccess: z.boolean().optional(),
    weatherProtection: z.boolean().optional(),
    finalNumbers: z.boolean().optional(),
    noRecording: z.boolean().optional(),
  }).optional(),
  customClauses: z.array(z.object({
    text: z.string(),
    enabled: z.boolean().default(true)
  })).optional().default([]),
  invoiceClauses: z.object({
    // Legacy clause names (kept for backward compatibility)
    paymentTerms: z.boolean().optional(),
    vatStatus: z.boolean().optional(),
    publicLiability: z.boolean().optional(),
    latePayment: z.boolean().optional(),
    disputeProcess: z.boolean().optional(),
    // New expanded invoice clauses
    paymentDue: z.boolean().optional(),
    latePaymentCharge: z.boolean().optional(),
    depositPolicy: z.boolean().optional(),
    cancellation: z.boolean().optional(),
    paymentMethods: z.boolean().optional(),
    bankDetails: z.boolean().optional(),
    expenses: z.boolean().optional(),
    ownershipRecordings: z.boolean().optional(),
    taxCompliance: z.boolean().optional(),
    queries: z.boolean().optional(),
  }).optional(),
  customInvoiceClauses: z.array(z.object({
    text: z.string(),
    enabled: z.boolean().default(true)
  })).optional().default([]).transform((clauses) => {
    // Filter out empty clauses to prevent validation issues
    return clauses ? clauses.filter(c => c.text && c.text.trim() !== '') : [];
  }),
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
    defaultInvoiceDueDays: data.default_invoice_due_days || data.defaultInvoiceDueDays || 7,
    contractClauses: {
      paymentTerms: data.invoice_payment_terms || data.invoicePaymentTerms || data.contract_clauses?.paymentTerms || data.contractClauses?.paymentTerms || "7_days_after",
      deposit: data.contract_clauses?.deposit || data.contractClauses?.deposit || false,
      balancePayment: data.contract_clauses?.balancePayment || data.contractClauses?.balancePayment || false,
      cancellation: data.contract_clauses?.cancellation || data.contractClauses?.cancellation || false,
      performerCancellation: data.contract_clauses?.performerCancellation || data.contractClauses?.performerCancellation || false,
      access: data.contract_clauses?.access || data.contractClauses?.access || data.contract_clauses?.venueAccess || data.contractClauses?.venueAccess || false,
      power: data.contract_clauses?.power || data.contractClauses?.power || data.contract_clauses?.powerSupply || data.contractClauses?.powerSupply || false,
      equipment: data.contract_clauses?.equipment || data.contractClauses?.equipment || false,
      spaceAndSafety: data.contract_clauses?.spaceAndSafety || data.contractClauses?.spaceAndSafety || false,
      weather: data.contract_clauses?.weather || data.contractClauses?.weather || data.contract_clauses?.weatherProtection || data.contractClauses?.weatherProtection || false,
      soundLimits: data.contract_clauses?.soundLimits || data.contractClauses?.soundLimits || false,
      overtime: data.contract_clauses?.overtime || data.contractClauses?.overtime || false,
      guestNumbers: data.contract_clauses?.guestNumbers || data.contractClauses?.guestNumbers || data.contract_clauses?.finalNumbers || data.contractClauses?.finalNumbers || false,
      mealsRefreshments: data.contract_clauses?.mealsRefreshments || data.contractClauses?.mealsRefreshments || false,
      parkingTravel: data.contract_clauses?.parkingTravel || data.contractClauses?.parkingTravel || false,
      recording: data.contract_clauses?.recording || data.contractClauses?.recording || data.contract_clauses?.noRecording || data.contractClauses?.noRecording || false,
      insurance: data.contract_clauses?.insurance || data.contractClauses?.insurance || false,
      forceMajeure: data.contract_clauses?.forceMajeure || data.contractClauses?.forceMajeure || false,
      governingLaw: data.contract_clauses?.governingLaw || data.contractClauses?.governingLaw || false,
    },
    customClauses: (() => {
      const rawCustomClauses = data.custom_clauses || data.customClauses;
      if (!rawCustomClauses) return [];
      
      // Check if it's already in the new format (array of objects)
      if (Array.isArray(rawCustomClauses) && rawCustomClauses.length > 0 && typeof rawCustomClauses[0] === 'object' && 'text' in rawCustomClauses[0]) {
        return rawCustomClauses;
      }
      
      // Convert from old format (array of strings) to new format
      if (Array.isArray(rawCustomClauses)) {
        return rawCustomClauses.map(clause => ({ text: clause, enabled: true }));
      }
      
      // Parse JSON string if needed
      if (typeof rawCustomClauses === 'string') {
        try {
          const parsed = JSON.parse(rawCustomClauses);
          if (Array.isArray(parsed)) {
            // Check if parsed is already in new format
            if (parsed.length > 0 && typeof parsed[0] === 'object' && 'text' in parsed[0]) {
              return parsed;
            }
            // Convert from old format
            return parsed.map(clause => ({ text: clause, enabled: true }));
          }
        } catch (e) {
          console.error('Failed to parse custom clauses:', e);
        }
      }
      
      return [];
    })(),
    invoiceClauses: {
      paymentTerms: data.invoice_clauses?.paymentTerms || data.invoiceClauses?.paymentTerms || false,
      vatStatus: data.invoice_clauses?.vatStatus || data.invoiceClauses?.vatStatus || false,
      publicLiability: data.invoice_clauses?.publicLiability || data.invoiceClauses?.publicLiability || false,
      latePayment: data.invoice_clauses?.latePayment || data.invoiceClauses?.latePayment || false,
      disputeProcess: data.invoice_clauses?.disputeProcess || data.invoiceClauses?.disputeProcess || false,
      // New expanded invoice clauses
      paymentDue: data.invoice_clauses?.paymentDue || data.invoiceClauses?.paymentDue || false,
      latePaymentCharge: data.invoice_clauses?.latePaymentCharge || data.invoiceClauses?.latePaymentCharge || false,
      depositPolicy: data.invoice_clauses?.depositPolicy || data.invoiceClauses?.depositPolicy || false,
      cancellation: data.invoice_clauses?.cancellation || data.invoiceClauses?.cancellation || false,
      paymentMethods: data.invoice_clauses?.paymentMethods || data.invoiceClauses?.paymentMethods || false,
      bankDetails: data.invoice_clauses?.bankDetails || data.invoiceClauses?.bankDetails || false,
      expenses: data.invoice_clauses?.expenses || data.invoiceClauses?.expenses || false,
      ownershipRecordings: data.invoice_clauses?.ownershipRecordings || data.invoiceClauses?.ownershipRecordings || false,
      taxCompliance: data.invoice_clauses?.taxCompliance || data.invoiceClauses?.taxCompliance || false,
      queries: data.invoice_clauses?.queries || data.invoiceClauses?.queries || false,
    },
    customInvoiceClauses: (() => {
      const clauses = data.custom_invoice_clauses || data.customInvoiceClauses;
      let result = [];
      
      if (Array.isArray(clauses)) {
        // Check if it's the new format with objects or old format with strings
        if (clauses.length > 0 && typeof clauses[0] === 'object') {
          result = clauses;
        } else {
          // Convert old string format to new object format
          result = clauses.map(text => ({ text, enabled: true }));
        }
      } else if (typeof clauses === 'string') {
        const parsed = JSON.parse(clauses || '[]');
        if (Array.isArray(parsed)) {
          // Check if parsed is already in new format
          if (parsed.length > 0 && typeof parsed[0] === 'object') {
            result = parsed;
          } else {
            // Convert old format
            result = parsed.map(text => ({ text, enabled: true }));
          }
        }
      }
      
      // Filter out empty clauses to prevent validation issues
      return result.filter(c => c && c.text && c.text.trim() !== '');
    })(),
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
  const [location, navigate] = useLocation();
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
  const [formInitialized, setFormInitialized] = useState(false);
  
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
        return !!(data.emailSignature && data.emailPrefix);
      }
    },
    {
      id: 'contract',
      label: 'Contract & Invoice Settings',
      icon: FileText,
      checkCompletion: (data: SettingsFormData) => {
        const hasInvoiceSettings = !!(data.contractClauses?.paymentTerms && data.nextInvoiceNumber);
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
    },
    {
      id: 'templates',
      label: 'Templates',
      icon: FileText,
      checkCompletion: (data: SettingsFormData) => {
        return true; // Templates are always considered complete
      }
    },
    {
      id: 'compliance',
      label: 'Compliance',
      icon: Shield,
      checkCompletion: (data: SettingsFormData) => {
        return true; // Compliance is always considered complete
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
      case 'templates':
        return renderTemplatesSection();
      case 'compliance':
        return renderComplianceSection();
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
        {/* REBUILT CONTRACT & INVOICE SETTINGS SECTION */}
        <div className="space-y-8">
          
          {/* Contract Clauses Section - Organized by PDF Categories */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Contract Clauses</h3>
            
            {/* Performance & Equipment Section */}
            <div className="space-y-3">
              <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-600 pb-2">Performance & Equipment</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="contractClauses.access"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal cursor-pointer">
                        Access: Client must provide safe and reasonable venue access for load-in/out
                      </FormLabel>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="contractClauses.power"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal cursor-pointer">
                        Power: Client must provide adequate and safe power supply
                      </FormLabel>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="contractClauses.equipment"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal cursor-pointer">
                        Equipment: Remains property of performer; client responsible for damage by guests
                      </FormLabel>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="contractClauses.spaceAndSafety"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal cursor-pointer">
                        Space & Safety: Stage/performance area must be flat, covered, and safe
                      </FormLabel>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="contractClauses.weather"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal cursor-pointer">
                        Weather: Client must provide weather protection for outdoor events
                      </FormLabel>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="contractClauses.soundLimits"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal cursor-pointer">
                        Sound Limits: Client responsible for venue sound restrictions or curfews
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Payment Terms Section */}
            <div className="space-y-3">
              <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-600 pb-2">Payment Terms</h4>
              
              {/* Payment Terms Dropdown */}
              <FormField
                control={form.control}
                name="contractClauses.paymentTerms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Payment Terms</FormLabel>
                    <Select value={field.value || "7_days_after"} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment terms" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="28_days_before">Payment due 28 days prior to performance</SelectItem>
                        <SelectItem value="14_days_before">Payment due 14 days prior to performance</SelectItem>
                        <SelectItem value="7_days_before">Payment due 7 days prior to performance</SelectItem>
                        <SelectItem value="on_performance">Payment due on date of performance</SelectItem>
                        <SelectItem value="on_receipt">Payment due on receipt of invoice</SelectItem>
                        <SelectItem value="7_days_after">Payment due within 7 days of performance</SelectItem>
                        <SelectItem value="14_days_after">Payment due within 14 days of performance</SelectItem>
                        <SelectItem value="28_days_after">Payment due within 28 days of performance</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs">
                      This payment term will appear on both contracts and invoices
                    </FormDescription>
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="contractClauses.deposit"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal cursor-pointer">
                        Deposit: 50% deposit required to secure booking (non-refundable)
                      </FormLabel>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="contractClauses.balancePayment"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal cursor-pointer">
                        Balance Payment: Remaining fee due before event / on the day
                      </FormLabel>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="contractClauses.overtime"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal cursor-pointer">
                        Overtime: Extra performance time charged at £100 per 30 minutes
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Cancellation & Rescheduling Section */}
            <div className="space-y-3">
              <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-600 pb-2">Cancellation & Rescheduling</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="contractClauses.cancellation"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal cursor-pointer">
                        Cancellation: Client cancellations within 7 days of event incur full fee
                      </FormLabel>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="contractClauses.performerCancellation"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal cursor-pointer">
                        Performer Cancellation: Will provide suitable replacement if needed
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* General Terms Section */}
            <div className="space-y-3">
              <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-600 pb-2">General Terms</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="contractClauses.guestNumbers"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal cursor-pointer">
                        Guest Numbers: Final numbers must be confirmed 48 hours prior
                      </FormLabel>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="contractClauses.mealsRefreshments"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal cursor-pointer">
                        Meals/Refreshments: Provide food/drink if performance exceeds 3 hours
                      </FormLabel>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="contractClauses.parkingTravel"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal cursor-pointer">
                        Parking/Travel: Client covers parking; accommodation if over 50 miles
                      </FormLabel>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="contractClauses.recording"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal cursor-pointer">
                        Recording: No recording or broadcasting without performer's written consent
                      </FormLabel>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="contractClauses.insurance"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal cursor-pointer">
                        Insurance: Performer holds PLI; client responsible for venue licences (PRS/PPL)
                      </FormLabel>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="contractClauses.forceMajeure"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal cursor-pointer">
                        Force Majeure: Neither party liable for events beyond control
                      </FormLabel>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="contractClauses.governingLaw"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal cursor-pointer">
                        Governing Law: Contract subject to the laws of England & Wales
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
            
          {/* Custom Contract Clauses */}
            <div className="space-y-4 mt-6">
              <div className="flex items-center justify-between">
                <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">Custom Contract Clauses</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const currentClauses = form.getValues('customClauses') || [];
                    form.setValue('customClauses', [...currentClauses, { text: '', enabled: true }]);
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
                      {(Array.isArray(field.value) ? field.value : []).map((clause, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <div className="flex flex-row items-start space-x-3 space-y-0 flex-1">
                            <Checkbox
                              checked={clause.enabled || false}
                              onCheckedChange={(checked) => {
                                const currentClauses = Array.isArray(field.value) ? field.value : [];
                                const newClauses = [...currentClauses];
                                newClauses[index] = { ...newClauses[index], enabled: checked as boolean };
                                field.onChange(newClauses);
                              }}
                            />
                            <Input
                              value={clause.text || ''}
                              onChange={(e) => {
                                const currentClauses = Array.isArray(field.value) ? field.value : [];
                                const newClauses = [...currentClauses];
                                newClauses[index] = { ...newClauses[index], text: e.target.value };
                                field.onChange(newClauses);
                              }}
                              placeholder="Enter custom contract clause..."
                              className="flex-1 text-sm"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const currentClauses = Array.isArray(field.value) ? field.value : [];
                              const newClauses = currentClauses.filter((_, i) => i !== index);
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

          {/* Invoice Settings Section */}
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
          </div>

          {/* Invoice Clauses Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Invoice Clauses</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="invoiceClauses.paymentTerms"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value || false}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal cursor-pointer">
                      Payment is due as specified above
                    </FormLabel>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="invoiceClauses.vatStatus"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value || false}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal cursor-pointer">
                      VAT Status: Not VAT registered - no VAT charged
                    </FormLabel>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="invoiceClauses.publicLiability"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value || false}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal cursor-pointer">
                      Public Liability Insurance: Covered for all services
                    </FormLabel>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="invoiceClauses.latePayment"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value || false}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal cursor-pointer">
                      Late Payment: Additional charges apply for overdue invoices
                    </FormLabel>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="invoiceClauses.disputeProcess"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value || false}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal cursor-pointer">
                      Disputes: Contact within 30 days of invoice date
                    </FormLabel>
                  </FormItem>
                )}
              />
              
              {/* New expanded invoice clauses */}
              <FormField
                control={form.control}
                name="invoiceClauses.paymentDue"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value || false}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal cursor-pointer">
                      Payment Due: Payment required within 14 days of invoice date
                    </FormLabel>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="invoiceClauses.latePaymentCharge"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value || false}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal cursor-pointer">
                      Late Payment: Additional 5% charge per week or statutory interest
                    </FormLabel>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="invoiceClauses.depositPolicy"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value || false}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal cursor-pointer">
                      Deposit Policy: Any deposit paid is non-refundable and deducted from final balance
                    </FormLabel>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="invoiceClauses.cancellation"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value || false}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal cursor-pointer">
                      Cancellation: Client cancellations within 7 days of event incur full invoice amount
                    </FormLabel>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="invoiceClauses.paymentMethods"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value || false}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal cursor-pointer">
                      Payment Methods: Bank transfer only, no cash/cheques unless agreed
                    </FormLabel>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="invoiceClauses.bankDetails"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value || false}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal cursor-pointer">
                      Bank Details: See payment section for account details
                    </FormLabel>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="invoiceClauses.expenses"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value || false}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal cursor-pointer">
                      Expenses: Travel, parking, tolls, and accommodation added where applicable
                    </FormLabel>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="invoiceClauses.ownershipRecordings"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value || false}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal cursor-pointer">
                      Ownership: Any recordings remain property of performer unless agreed
                    </FormLabel>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="invoiceClauses.taxCompliance"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value || false}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal cursor-pointer">
                      Tax Compliance: This invoice is issued in accordance with HMRC guidelines
                    </FormLabel>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="invoiceClauses.queries"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value || false}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal cursor-pointer">
                      Queries: Any disputes must be raised within 7 days of issue
                    </FormLabel>
                  </FormItem>
                )}
              />
            </div>
            
            {/* Custom Invoice Clauses */}
            <div className="space-y-4 mt-6">
              <div className="flex items-center justify-between">
                <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">Custom Invoice Clauses</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const currentClauses = form.getValues('customInvoiceClauses') || [];
                    form.setValue('customInvoiceClauses', [...currentClauses, { text: '', enabled: true }]);
                  }}
                  className="flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Custom Clause</span>
                </Button>
              </div>
              
              <FormField
                control={form.control}
                name="customInvoiceClauses"
                render={({ field }) => (
                  <FormItem>
                    <div className="space-y-2">
                      {(Array.isArray(field.value) ? field.value : []).map((clause, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Checkbox
                            checked={clause.enabled || false}
                            onCheckedChange={(checked) => {
                              const currentClauses = Array.isArray(field.value) ? field.value : [];
                              const newClauses = [...currentClauses];
                              newClauses[index] = { ...clause, enabled: checked as boolean };
                              field.onChange(newClauses);
                            }}
                          />
                          <Input
                            value={clause.text || ''}
                            onChange={(e) => {
                              const currentClauses = Array.isArray(field.value) ? field.value : [];
                              const newClauses = [...currentClauses];
                              newClauses[index] = { ...clause, text: e.target.value };
                              field.onChange(newClauses);
                            }}
                            placeholder="Enter custom invoice clause..."
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const currentClauses = Array.isArray(field.value) ? field.value : [];
                              const newClauses = currentClauses.filter((_, i) => i !== index);
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
                    key={`bank-details-${formInitialized}`}
                    value={form.getValues('bankDetails') || ""} 
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
                  <Select onValueChange={field.onChange} value={form.getValues('primaryInstrument') || ""} key={`primary-instrument-${formInitialized}`}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your primary instrument" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
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
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {availableInstruments
                      .filter(instrument => instrument !== watchedPrimaryInstrument)
                      .map((instrument) => {
                        const currentValues = form.getValues('secondaryInstruments') || [];
                        const isSelected = currentValues.includes(instrument);
                        return (
                          <div key={instrument} className="flex items-center space-x-2">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  const newValues = [...currentValues, instrument];
                                  field.onChange(newValues);
                                } else {
                                  const newValues = currentValues.filter(v => v !== instrument);
                                  field.onChange(newValues);
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
        <div className="space-y-6">
          {/* Booking Display Limit */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Booking Display Limit
            </label>
            <Controller
              name="bookingDisplayLimit"
              control={form.control}
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      field.onChange('50');
                      setHasChanges(true);
                    }}
                    className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                      field.value === '50'
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300'
                    }`}
                  >
                    Show 50 bookings
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      field.onChange('all');
                      setHasChanges(true);
                    }}
                    className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                      field.value === 'all'
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300'
                    }`}
                  >
                    Show all bookings
                  </button>
                </div>
              )}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Controls how many bookings are displayed on the bookings page
            </p>
          </div>

          {/* Distance Units */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Distance Units
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  form.setValue('distanceUnits', 'miles');
                  setHasChanges(true);
                }}
                className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                  form.watch('distanceUnits') === 'miles'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300'
                }`}
              >
                Miles
              </button>
              <button
                type="button"
                onClick={() => {
                  form.setValue('distanceUnits', 'km');
                  setHasChanges(true);
                }}
                className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                  form.watch('distanceUnits') === 'km'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300'
                }`}
              >
                Kilometers
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Units used for displaying distances to venues
            </p>
          </div>
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
        <div className="space-y-6">
          {/* Preset Colors */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Choose Theme Color
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {THEME_OPTIONS.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => {
                    // Save color to form
                    form.setValue('themeAccentColor', theme.color);
                    
                    // Immediately apply theme
                    setTheme(theme.id as ThemeName);
                  }}
                  className={`p-4 rounded-lg border-2 text-white font-medium text-sm transition-all ${
                    form.watch('themeAccentColor') === theme.color
                      ? 'border-white shadow-lg scale-105'
                      : 'border-transparent hover:border-gray-300'
                  }`}
                  style={{ backgroundColor: theme.color, color: '#ffffff' }}
                >
                  {theme.name}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Color Picker */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Or Choose Custom Color
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={form.watch('themeAccentColor') || "#191970"}
                onChange={(e) => {
                  form.setValue('themeAccentColor', e.target.value);
                  setCustomColor(e.target.value);
                  setTheme('custom');
                }}
                className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={form.watch('themeAccentColor') || "#191970"}
                onChange={(e) => {
                  form.setValue('themeAccentColor', e.target.value);
                  setCustomColor(e.target.value);
                  setTheme('custom');
                }}
                placeholder="#191970"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Enter a hex color code or use the color picker to create your custom theme
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderTemplatesSection = () => (
    <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
      <CardHeader className="border-b border-gray-100 dark:border-slate-700 pb-4">
        <CardTitle className="flex items-center space-x-2 text-lg">
          <FileText className="w-5 h-5 text-primary" />
          <span>Email Templates</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage your automated response templates for enquiries, bookings, and client communications.
          </p>
          
          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <h4 className="font-semibold mb-2">Template Categories</h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Initial Inquiry Responses</li>
                <li>• Booking Confirmations</li>
                <li>• Contract & Agreements</li>
                <li>• Invoice & Payment</li>
                <li>• Follow-up & Thank You</li>
                <li>• Polite Declines</li>
              </ul>
            </div>
            
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <h4 className="font-semibold mb-2">AI Features</h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• AI-Generated Responses</li>
                <li>• Personalized Content</li>
                <li>• Variable Replacement</li>
                <li>• Client History Context</li>
                <li>• Professional Tone Options</li>
              </ul>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <Button 
              onClick={() => navigate('/templates')}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Manage Templates
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate('/templates')}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              AI Generate
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderComplianceSection = () => (
    <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
      <CardHeader className="border-b border-gray-100 dark:border-slate-700 pb-4">
        <CardTitle className="flex items-center space-x-2 text-lg">
          <Shield className="w-5 h-5 text-primary" />
          <span>Compliance</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage your insurance, licenses, and certifications to stay compliant for professional performances.
          </p>
          
          {/* Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Valid</p>
                  <p className="font-semibold text-green-600">0</p>
                </div>
              </div>
            </div>
            
            <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Expiring</p>
                  <p className="font-semibold text-orange-600">0</p>
                </div>
              </div>
            </div>
            
            <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Expired</p>
                  <p className="font-semibold text-red-600">0</p>
                </div>
              </div>
            </div>
            
            <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
                  <p className="font-semibold text-primary">0</p>
                </div>
              </div>
            </div>
          </div>

          {/* Required Documents Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Shield className="w-5 h-5 text-blue-600" />
                <h4 className="font-semibold text-sm">Public Liability Insurance</h4>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Essential protection covering claims from third parties. Most venues require £2-10 million coverage.
              </p>
            </div>
            
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                <h4 className="font-semibold text-sm">PAT Testing Certificate</h4>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Annual testing of portable electrical equipment. Required for amplifiers, keyboards, and other gear.
              </p>
            </div>
            
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Music className="w-5 h-5 text-primary" />
                <h4 className="font-semibold text-sm">Music Performance License</h4>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                PRS/PPL licenses for performing copyrighted music. Often handled by venues but worth having for outdoor events.
              </p>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <Button 
              onClick={() => navigate('/compliance')}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Document
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate('/compliance')}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Files
            </Button>
          </div>
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
    defaultValues: initialData || undefined,
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
      // Get current settings to merge with form data
      const currentSettings = settings || {};
      
      // Merge contract clauses with existing ones
      const mergedContractClauses = {
        ...currentSettings.contractClauses,
        ...data.contractClauses
      };
      
      // Merge invoice clauses with existing ones
      const mergedInvoiceClauses = {
        ...currentSettings.invoiceClauses,
        ...data.invoiceClauses
      };
      
      
      
      
      // Ensure arrays are properly formatted for JSON transmission
      const processedData = {
        ...data,
        secondaryInstruments: Array.isArray(data.secondaryInstruments) ? 
          data.secondaryInstruments : [],
        customGigTypes: Array.isArray(data.customGigTypes) ? 
          data.customGigTypes : [],
        // Use merged contract clauses
        contractClauses: mergedContractClauses,
        customClauses: Array.isArray(data.customClauses) ? 
          data.customClauses : [],
        // Use merged invoice clauses
        invoiceClauses: mergedInvoiceClauses,
        customInvoiceClauses: Array.isArray(data.customInvoiceClauses) ? 
          data.customInvoiceClauses : []
      };
      
      
      // Map camelCase form data to snake_case database fields
      processedData.contract_clauses = mergedContractClauses;
      processedData.custom_clauses = data.customClauses || [];
      processedData.invoice_clauses = mergedInvoiceClauses;
      processedData.custom_invoice_clauses = data.customInvoiceClauses || [];
      
      // PHASE 1 LOGGING: Frontend mutation data
      console.log('🔍 PHASE 1 - Frontend mutation sending data:');
      console.log('  📋 Contract Clauses (contract_clauses):', JSON.stringify(processedData.contract_clauses, null, 2));
      console.log('  📝 Custom Clauses (custom_clauses):', JSON.stringify(processedData.custom_clauses, null, 2));
      console.log('  📄 Invoice Clauses (invoice_clauses):', JSON.stringify(processedData.invoice_clauses, null, 2));
      console.log('  📝 Custom Invoice Clauses (custom_invoice_clauses):', JSON.stringify(processedData.custom_invoice_clauses, null, 2));
      console.log('  🔧 Full processed data keys:', Object.keys(processedData));
      
      // Use apiRequest which handles authentication properly
      const response = await apiRequest('/api/settings', {
        method: 'PATCH',
        body: JSON.stringify(processedData),
      });
      
      console.log('🔍 PHASE 1 - API Response status:', response.status);
      return response;
    },
    onSuccess: async (response) => {
      const data = await response.json();
      setHasChanges(false);
      toast({
        title: "Success",
        description: "Settings saved successfully!",
      });
      
      // Don't reset the form immediately - let it keep the user's changes
      
      // Store the new data as initial data for comparison
      setInitialData(data);
      
      // Invalidate settings cache to refresh data
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
    console.log('📋 Settings useEffect triggered:', { hasSettings: !!settings, isPending: saveSettings.isPending });
    if (settings && !saveSettings.isPending) {
      
      
      
      // Create the form data object with actual values
      const formData = {
        businessName: settings.businessName || "",
        businessEmail: settings.businessEmail || "",
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
        defaultInvoiceDueDays: settings.defaultInvoiceDueDays || 7,
        defaultTerms: settings.defaultTerms || "",
        bankDetails: (() => {
          const bankData = settings.bankDetails;
          
          // Handle null, undefined, or empty values
          if (!bankData || bankData === 'null' || bankData === 'undefined') {
            return "";
          }
          
          // If it's already a formatted string (not JSON), return as-is
          if (typeof bankData === 'string' && !bankData.startsWith('{') && !bankData.startsWith('[')) {
            return bankData;
          }
          
          // If it's JSON or a JSON string, parse and format it
          try {
            const parsed = typeof bankData === 'string' ? JSON.parse(bankData) : bankData;
            if (parsed && typeof parsed === 'object') {
              const lines = [];
              if (parsed.bankName && parsed.bankName !== 'null' && parsed.bankName !== 'undefined') {
                lines.push(`Bank Name: ${parsed.bankName}`);
              }
              if (parsed.accountName && parsed.accountName !== 'null' && parsed.accountName !== 'undefined') {
                lines.push(`Account Name: ${parsed.accountName}`);
              }
              if (parsed.sortCode && parsed.sortCode !== 'null' && parsed.sortCode !== 'undefined') {
                lines.push(`Sort Code: ${parsed.sortCode}`);
              }
              if (parsed.accountNumber && parsed.accountNumber !== 'null' && parsed.accountNumber !== 'undefined') {
                lines.push(`Account Number: ${parsed.accountNumber}`);
              }
              return lines.join('\n');
            }
          } catch (error) {
            console.error('Error parsing bank details:', error);
          }
          
          return "";
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
        primaryInstrument: settings.primary_instrument || settings.primaryInstrument || "",
        secondaryInstruments: Array.isArray(settings.secondary_instruments || settings.secondaryInstruments) ? (settings.secondary_instruments || settings.secondaryInstruments) : [],
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
        // Contract clauses
        contractClauses: {
          paymentTerms: "7_days_after",
          deposit: false,
          balancePayment: true,
          cancellation: false,
          performerCancellation: true,
          access: false,
          power: false,
          equipment: false,
          spaceAndSafety: true,
          weather: true,
          soundLimits: false,
          overtime: false,
          guestNumbers: true,
          mealsRefreshments: true,
          parkingTravel: false,
          recording: true,
          insurance: true,
          forceMajeure: true,
          governingLaw: true,
          ...settings.contractClauses
        },
        customClauses: Array.isArray(settings.customClauses) ? settings.customClauses : [],
        // Invoice clauses
        invoiceClauses: {
          paymentTerms: true,
          vatStatus: true,
          publicLiability: true,
          latePayment: false,
          disputeProcess: true,
          paymentDue: false,
          latePaymentCharge: false,
          depositPolicy: false,
          cancellation: false,
          paymentMethods: true,
          bankDetails: true,
          expenses: false,
          ownershipRecordings: false,
          taxCompliance: true,
          queries: true,
          ...settings.invoiceClauses
        },
        customInvoiceClauses: Array.isArray(settings.customInvoiceClauses) ? settings.customInvoiceClauses : [],
        // Travel expense integration removed - always include travel in performance fee
        // Email prefix
        emailPrefix: settings.emailPrefix || "",
      };
      
      // Set up instrument state
      const primaryInstrument = settings.primary_instrument || settings.primaryInstrument;
      if (primaryInstrument) {
        setSelectedInstrument(primaryInstrument);
        
        // Gig types are now managed through customGigTypes in the database
      }
      
      
      
      // Reset form with the loaded data
      console.log('🔄 Resetting form with data:', { primaryInstrument: formData.primaryInstrument, bankDetails: formData.bankDetails?.substring(0, 50) });
      
      form.reset(formData);
      
      // Store initial data for comparison and mark as initialized
      setInitialData(formData);
      setFormInitialized(true);
      
      console.log('✅ Form reset complete. Current values:', { 
        primaryInstrument: form.getValues('primaryInstrument'), 
        bankDetails: form.getValues('bankDetails')?.substring(0, 50) 
      });
      
      // Reset change tracking after form is initialized
      setHasChanges(false);
    }
  }, [settings, form]);

  // Form watcher for detecting actual user changes (not programmatic resets)
  useEffect(() => {
    if (!initialData || !formInitialized) return;

    let subscription: any = null;
    
    const timeoutId = setTimeout(() => {
      subscription = form.watch((data, { name, type }) => {
        // Only trigger on user input, not programmatic changes
        if (type === 'change') {
          setHasChanges(true);
        }
      });
    }, 200);
    
    return () => {
      clearTimeout(timeoutId);
      if (subscription) subscription.unsubscribe();
    };
  }, [form, initialData, formInitialized]);

  // Removed all instrument and gig type functions - feature moved to documentation



  const onSubmit = (data: SettingsFormData) => {
    console.log('Form submitted with data:', data);
    console.log('Has changes:', hasChanges);
    console.log('Save settings pending:', saveSettings.isPending);
    saveSettings.mutate(data);
  };

  // Show loading until we have settings data AND the form has been initialized with that data
  if (settingsLoading || !settings || !initialData || !formInitialized) {
    console.log('🔄 Settings loading state:', { settingsLoading, hasSettings: !!settings, hasInitialData: !!initialData, formInitialized });
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
  const currentFormData = form?.getValues?.() || {};
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
                const isCompleted = form?.getValues ? section.checkCompletion(currentFormData) : false;
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
              <form onSubmit={(e) => {
                console.log('Form onSubmit triggered');
                e.preventDefault();
                // Prevent submission if save is already in progress
                if (saveSettings.isPending) {
                  console.log('Save already in progress, skipping submission');
                  return;
                }
                form.handleSubmit(onSubmit, (errors) => {
                  console.log('Form validation errors:', errors);
                  console.log('Validation error details:', JSON.stringify(errors, null, 2));
                })(e);
              }} className="space-y-6">
                {/* Render active section */}
                {renderActiveSection()}
                
                {/* Save Button */}
                <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-slate-700 mt-8">
                  <Button
                    type="submit"
                    disabled={saveSettings.isPending || !hasChanges}
                    onClick={() => console.log('Save button clicked, hasChanges:', hasChanges, 'isPending:', saveSettings.isPending)}
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
