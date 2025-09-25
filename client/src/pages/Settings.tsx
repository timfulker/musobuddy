import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuthContext } from "@/contexts/AuthContext";
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
import { Building, Save, MapPin, Globe, Hash, CreditCard, Loader2, Menu, Eye, ChevronDown, ChevronRight, Mail, Settings as SettingsIcon, Music, ExternalLink, Copy, Palette, Receipt, FileText, Plus, X, Shield, Sparkles, Upload, Download, AlertTriangle, CheckCircle, Clock, Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useTheme, themes, type ThemeName } from "@/hooks/useTheme";
import { getContrastTextColor, getThemeTextColor } from "@/lib/colorUtils";

// Import instrument presets
import { INSTRUMENT_GIG_PRESETS, getGigTypeNamesForInstrument, getAvailableInstruments, getInstrumentDisplayName } from "../../../shared/instrument-gig-presets";
import { BandManager } from '@/components/BandManager';

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
  businessContactEmail: z.string().optional().or(z.literal("")).refine(
    (val) => !val || val.includes("@"),
    "Please enter a valid email address"
  ),
  addressLine1: z.string().optional().or(z.literal("")),
  addressLine2: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  county: z.string().optional().or(z.literal("")),
  postcode: z.string().optional().or(z.literal("")),
  // Home address fields
  homeAddressLine1: z.string().optional().or(z.literal("")),
  homeAddressLine2: z.string().optional().or(z.literal("")),
  homeCity: z.string().optional().or(z.literal("")),
  homePostcode: z.string().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  website: z.string().optional().or(z.literal("")),
  taxNumber: z.string().optional().or(z.literal("")),
  emailFromName: z.string().optional().or(z.literal("")),
  nextInvoiceNumber: z.coerce.number().min(1, "Next invoice number is required"),
  invoicePrefix: z.string().optional().or(z.literal("")), // Invoice number prefix
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
  emailSignatureText: z.string().optional().or(z.literal("")),
  personalForwardEmail: z.string().email("Please enter a valid email address").optional().or(z.literal("")),
  
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
  
  console.log('🔍 BACKEND RESPONSE - Checking for field synchronization:', {
    business_contact_email: data.business_contact_email,
    email_signature_text: data.email_signature_text,
    areEqual: data.business_contact_email === data.email_signature_text
  });
  
  
  // Removed instrument and gig type parsing - feature moved to documentation
  
  // Transform the data to match the expected form structure - fix snake_case to camelCase mapping
  return {
    businessName: data.business_name || data.businessName || "",
    businessContactEmail: data.business_contact_email || data.businessContactEmail || "",
    addressLine1: data.address_line1 || data.addressLine1 || "",
    addressLine2: data.address_line2 || data.addressLine2 || "",
    city: data.city || "",
    county: data.county || "",
    postcode: data.postcode || "",
    // Home address fields - CRITICAL FIX for home address not loading
    homeAddressLine1: data.home_address_line1 || data.homeAddressLine1 || "",
    homeAddressLine2: data.home_address_line2 || data.homeAddressLine2 || "",
    homeCity: data.home_city || data.homeCity || "",
    homePostcode: data.home_postcode || data.homePostcode || "",
    phone: data.phone || "",
    website: data.website || "",
    taxNumber: data.tax_number || data.taxNumber || "",
    emailFromName: data.email_from_name || data.emailFromName || "",
    emailSignatureText: data.email_signature_text || data.emailSignatureText || "",
    personalForwardEmail: data.personal_forward_email || data.personalForwardEmail || "",
    nextInvoiceNumber: data.next_invoice_number || data.nextInvoiceNumber || 1,
    invoicePrefix: data.invoice_prefix || data.invoicePrefix || "",
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
  const { user } = useAuthContext();
  const isMobile = !isDesktop;
  const { currentTheme, setTheme, theme, customColor, setCustomColor } = useTheme();
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
  
  // Data & Privacy state
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'xls'>('json');
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

  
  // Handle URL parameters for direct navigation to sections
  const [currentLocation] = useLocation();
  
  // Define all settings sections with completion logic
  const settingsSections = [
    {
      id: 'business',
      label: 'Business Information',
      icon: Building,
      checkCompletion: (data: SettingsFormData) => {
        return !!(data.businessName && data.businessContactEmail && data.phone && data.addressLine1 && data.city && data.postcode);
      }
    },
    {
      id: 'email',
      label: 'Email Settings',
      icon: Mail,
      checkCompletion: (data: SettingsFormData) => {
        return !!(data.emailSignatureText && data.emailPrefix);
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
      id: 'bands',
      label: 'Bands & Projects',
      icon: Users,
      checkCompletion: () => true // Always considered complete
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
    },
    {
      id: 'legal',
      label: 'Legal',
      icon: FileText,
      checkCompletion: () => {
        return true; // Legal documents are always accessible
      }
    },
    {
      id: 'data-privacy',
      label: 'Data & Privacy',
      icon: Shield,
      checkCompletion: () => {
        return true; // Data & Privacy is always accessible
      }
    }
  ];

  // Handle URL parameters for direct navigation to sections
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sectionParam = urlParams.get('section');
    if (sectionParam && settingsSections.some(section => section.id === sectionParam)) {
      setActiveSection(sectionParam);
    }
  }, [currentLocation]);

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
      case 'bands':
        return renderBandsSection();
      case 'templates':
        return renderTemplatesSection();
      case 'compliance':
        return renderComplianceSection();
      case 'legal':
        return renderLegalSection();
      case 'data-privacy':
        return renderDataPrivacySection();
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
            name="businessContactEmail"
            key="business-contact-email-field"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Business Email</FormLabel>
                <FormControl>
                  <Input 
                    name={field.name}
                    ref={field.ref}
                    value={field.value || ""} 
                    onChange={(e) => {
                      const newValue = e.target.value;
                      console.log('🔍 Business Email onChange:', {
                        newValue: newValue,
                        currentSignature: form.getValues('emailSignatureText'),
                        fieldName: field.name
                      });
                      
                      // Prevent any synchronization
                      field.onChange(e);
                      
                      // Double-check that email signature wasn't changed
                      setTimeout(() => {
                        const sigAfterChange = form.getValues('emailSignatureText');
                        if (sigAfterChange === newValue) {
                          console.error('🚨 SYNC BUG: Email signature was synchronized with business email!');
                          // Force email signature back to its original value
                          const originalSig = form.getValues('emailSignatureText');
                          if (originalSig !== newValue) {
                            form.setValue('emailSignatureText', originalSig, { shouldValidate: false });
                          }
                        }
                      }, 0);
                    }}
                    onBlur={field.onBlur}
                    placeholder="business@example.com" 
                    type="email" 
                    autoComplete="off"
                    data-form-type="business-email"
                  />
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="taxNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Tax Number (Optional)</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ""} placeholder="VAT Registration Number" />
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

        {/* Home Address Fields */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Home Address</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="homeAddressLine1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Home Address Line 1</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} placeholder="123 Home Street" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="homeAddressLine2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Home Address Line 2 (Optional)</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} placeholder="Apartment 2B" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="homeCity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Home Town/City</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} placeholder="London" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="homePostcode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Home Postcode</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} placeholder="SW1A 1AA" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        
        {/* Save Button for Business Section */}
        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-slate-700 mt-6">
          <Button
            type="button"
            onClick={() => saveBusinessInfo.mutate(form.getValues())}
            disabled={saveBusinessInfo.isPending}
            className="bg-primary hover:bg-primary/90"
            data-testid="button-save-business"
          >
            {saveBusinessInfo.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Business Info
              </>
            )}
          </Button>
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
              render={({ field }) => {
                const [isChecking, setIsChecking] = React.useState(false);
                const [availability, setAvailability] = React.useState<{available?: boolean; error?: string}>({});
                const checkTimeoutRef = React.useRef<NodeJS.Timeout>();

                // Check availability when user types
                React.useEffect(() => {
                  if (!field.value || field.value === initialData?.emailPrefix) {
                    setAvailability({});
                    return;
                  }

                  // Clear previous timeout
                  if (checkTimeoutRef.current) {
                    clearTimeout(checkTimeoutRef.current);
                  }

                  // Set new timeout to check after user stops typing
                  checkTimeoutRef.current = setTimeout(async () => {
                    setIsChecking(true);
                    try {
                      const response = await apiRequest(`/api/email/check-availability?prefix=${encodeURIComponent(field.value)}`);
                      const data = await response.json();
                      setAvailability(data);
                    } catch (error) {
                      console.error('Failed to check email availability:', error);
                    } finally {
                      setIsChecking(false);
                    }
                  }, 500); // Wait 500ms after user stops typing

                  return () => {
                    if (checkTimeoutRef.current) {
                      clearTimeout(checkTimeoutRef.current);
                    }
                  };
                }, [field.value]);

                return (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Email Prefix</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <div className="relative flex-1">
                            <Input
                              {...field}
                              value={field.value || ""}
                              placeholder="your-name"
                              className={`rounded-r-none ${
                                availability.available === false ? 'border-red-500' :
                                availability.available === true ? 'border-green-500' : ''
                              }`}
                            />
                            {isChecking && (
                              <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                            )}
                          </div>
                          <span className="bg-gray-50 dark:bg-gray-800 border border-l-0 border-input px-3 py-2 text-sm text-muted-foreground rounded-r-md">
                            @enquiries.musobuddy.com
                          </span>
                        </div>
                        {availability.available === false && (
                          <p className="text-sm text-red-600">
                            {availability.error || 'This prefix is already taken'}
                          </p>
                        )}
                        {availability.available === true && field.value && field.value !== initialData?.emailPrefix && (
                          <p className="text-sm text-green-600">
                            ✓ This email prefix is available
                          </p>
                        )}
                      </div>
                    </FormControl>
                    <FormDescription className="text-xs text-gray-600 dark:text-gray-400">
                      Your personalized email address for client enquiries
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
          </div>
          
          <FormField
            control={form.control}
            name="emailSignatureText"
            key="email-signature-text-field"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Email Signature</FormLabel>
                <FormControl>
                  <textarea 
                    value={field.value || ""} 
                    onChange={(e) => {
                      const newValue = e.target.value;
                      console.log('🔍 Email Signature onChange:', {
                        newValue: newValue,
                        currentEmail: form.getValues('businessContactEmail'),
                        fieldName: field.name,
                        eventType: e.type
                      });
                      
                      // Ensure this is truly the email signature field
                      if (field.name !== 'emailSignatureText') {
                        console.error('🚨 FIELD NAME MISMATCH: Expected emailSignatureText, got', field.name);
                        return;
                      }
                      
                      // Update only the email signature field
                      field.onChange(e);
                      
                      // Verify business email wasn't affected
                      setTimeout(() => {
                        const emailAfterChange = form.getValues('businessContactEmail');
                        if (emailAfterChange === newValue && newValue !== '') {
                          console.error('🚨 SYNC BUG: Business email was synchronized with signature!');
                        }
                      }, 0);
                    }}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                    placeholder="Best regards,&#10;Tim Fulker&#10;www.saxdj.co.uk&#10;07764190034"
                    autoComplete="off"
                    data-form-type="other"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    rows={4}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="personalForwardEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Personal Email Forwarding</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    value={field.value || ""} 
                    placeholder="your-personal@gmail.com"
                    type="email"
                  />
                </FormControl>
                <FormDescription className="text-xs text-gray-600 dark:text-gray-400">
                  Get copies of all MusoBuddy emails forwarded to your personal email. Recommended for Encore bookings to preserve original formatting.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        {/* Save Button for Email Settings Section */}
        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-slate-700 mt-6">
          <Button
            type="button"
            onClick={() => {
              const formData = form.getValues();
              console.log('🔍 Saving email settings with personalForwardEmail:', formData.personalForwardEmail);
              saveSettings.mutate(formData);
            }}
            disabled={saveSettings.isPending}
            className="bg-primary hover:bg-primary/90"
            data-testid="button-save-email"
          >
            {saveSettings.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Email Settings
              </>
            )}
          </Button>
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
        
        {/* Save Button for Contract & Invoice Section */}
        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-slate-700 mt-6">
          <Button
            type="button"
            onClick={() => saveContractInvoice.mutate(form.getValues())}
            disabled={saveContractInvoice.isPending}
            className="bg-primary hover:bg-primary/90"
            data-testid="button-save-contract"
          >
            {saveContractInvoice.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Contract & Invoice
              </>
            )}
          </Button>
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
        
        {/* Save Button for Bank Details Section */}
        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-slate-700 mt-6">
          <Button
            type="button"
            onClick={() => saveSettings.mutate(form.getValues())}
            disabled={saveSettings.isPending}
            className="bg-primary hover:bg-primary/90"
            data-testid="button-save-bank"
          >
            {saveSettings.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Bank Details
              </>
            )}
          </Button>
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
        
        {/* Save Button for AI Pricing Section */}
        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-slate-700 mt-6">
          <Button
            type="button"
            onClick={() => saveSettings.mutate(form.getValues())}
            disabled={saveSettings.isPending}
            className="bg-primary hover:bg-primary/90"
            data-testid="button-save-pricing"
          >
            {saveSettings.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save AI Pricing Guide
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
    );
  };

  const renderInstrumentsSection = () => {
    const availableInstruments = getAvailableInstruments ? getAvailableInstruments() : [];
    const watchedPrimaryInstrument = form.watch ? form.watch('primaryInstrument') : null;
    const watchedSecondaryInstruments = form.watch ? form.watch('secondaryInstruments') || [] : [];
    
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
                  <Select 
                    onValueChange={(value) => {
                      try {
                        console.log('🎵 Primary instrument select change:', value);
                        if (value && typeof value === 'string') {
                          field.onChange(value); // Update form field
                          handleInstrumentChange(value); // Handle additional logic
                        }
                      } catch (error) {
                        console.error('❌ Error in primary instrument onValueChange:', error);
                        // Show error to user as well
                        toast({
                          title: "Error",
                          description: "Failed to update instrument selection. Please try again.",
                          variant: "destructive"
                        });
                      }
                    }} 
                    value={form.getValues('primaryInstrument') || ""}
                  >
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
        {/* Save Button for Instruments Section */}
        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-slate-700 mt-6">
          <Button
            type="button"
            onClick={() => saveInstruments.mutate(form.getValues())}
            disabled={saveInstruments.isPending}
            className="bg-primary hover:bg-primary/90"
            data-testid="button-save-instruments"
          >
            {saveInstruments.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving & Updating AI...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Instruments
              </>
            )}
          </Button>
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
        {/* Save Button for Performance Settings Section */}
        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-slate-700 mt-6">
          <Button
            type="button"
            onClick={() => savePerformance.mutate(form.getValues())}
            disabled={savePerformance.isPending}
            className="bg-primary hover:bg-primary/90"
            data-testid="button-save-performance"
          >
            {savePerformance.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Performance Settings
              </>
            )}
          </Button>
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
        
        {/* Save Button for Performance Section */}
        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-slate-700 mt-6">
          <Button
            type="button"
            onClick={() => saveSettings.mutate(form.getValues())}
            disabled={saveSettings.isPending}
            className="bg-primary hover:bg-primary/90"
            data-testid="button-save-performance"
          >
            {saveSettings.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Performance Settings
              </>
            )}
          </Button>
        </div>
        
        {/* Save Button for Booking Widget Section */}
        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-slate-700 mt-6">
          <Button
            type="button"
            onClick={() => saveSettings.mutate(form.getValues())}
            disabled={saveSettings.isPending}
            className="bg-primary hover:bg-primary/90"
            data-testid="button-save-widget"
          >
            {saveSettings.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Widget Settings
              </>
            )}
          </Button>
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
              {THEME_OPTIONS.map((theme) => {
                const textColor = getContrastTextColor(theme.color);
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => {
                      // Save color to form
                      form.setValue('themeAccentColor', theme.color);
                      
                      // Immediately apply theme
                      setTheme(theme.id as ThemeName);
                    }}
                    className={`p-4 rounded-lg border-2 font-medium text-sm transition-all ${
                      form.watch('themeAccentColor') === theme.color
                        ? 'border-white shadow-lg scale-105'
                        : 'border-transparent hover:border-gray-300'
                    }`}
                    style={{ 
                      backgroundColor: theme.color
                    }}
                    data-theme-button="true"
                    data-theme-id={theme.id}
                    ref={(el) => {
                      if (el) {
                        // Force inject the text color
                        el.style.setProperty('color', textColor, 'important');
                      }
                    }}
                  >
                    {theme.name}
                  </button>
                );
              })}
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

  const renderBandsSection = () => <BandManager />;

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
          
          {/* Save Button for Templates Section */}
          <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-slate-700 mt-6">
            <Button
              type="button"
              onClick={() => saveSettings.mutate(form.getValues())}
              disabled={saveSettings.isPending}
              className="bg-primary hover:bg-primary/90"
              data-testid="button-save-templates"
            >
              {saveSettings.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Template Settings
                </>
              )}
            </Button>
          </div>
        </div>
        
        {/* Save Button for Themes Section */}
        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-slate-700 mt-6">
          <Button
            type="button"
            onClick={() => saveSettings.mutate(form.getValues())}
            disabled={saveSettings.isPending}
            className="bg-primary hover:bg-primary/90"
            data-testid="button-save-themes"
          >
            {saveSettings.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Themes
              </>
            )}
          </Button>
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
        <div className="space-y-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage your insurance, licenses, and certifications to stay compliant for professional performances.
          </p>

          
          {/* Business Compliance Status Overview */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="font-semibold text-lg mb-4 flex items-center space-x-2">
              <Shield className="w-5 h-5 text-primary" />
              <span>Business Compliance Status</span>
            </h3>
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
        
        {/* Save Button for Compliance Section */}
        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-slate-700 mt-6">
          <Button
            type="button"
            onClick={() => saveCompliance.mutate(form.getValues())}
            disabled={saveCompliance.isPending}
            className="bg-primary hover:bg-primary/90"
            data-testid="button-save-compliance"
          >
            {saveCompliance.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Compliance Settings
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderLegalSection = () => (
    <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
      <CardHeader className="border-b border-gray-100 dark:border-slate-700 pb-4">
        <CardTitle className="flex items-center space-x-2 text-lg">
          <FileText className="w-5 h-5 text-primary" />
          <span>Legal Documents</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="space-y-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Access all platform legal documents including terms, privacy policy, and compliance information.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <Link href="/terms-and-conditions">
              <div className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-colors cursor-pointer">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium">Terms of Service</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Platform usage terms and conditions</p>
              </div>
            </Link>
            
            <Link href="/privacy-policy">
              <div className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-colors cursor-pointer">
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium">Privacy Policy</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">How we protect and use your data</p>
              </div>
            </Link>
            
            <Link href="/cookie-policy">
              <div className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-colors cursor-pointer">
                <div className="flex items-center space-x-2">
                  <SettingsIcon className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-medium">Cookie Policy</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Cookie usage and preferences</p>
              </div>
            </Link>
            
            <Link href="/refund-policy">
              <div className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-colors cursor-pointer">
                <div className="flex items-center space-x-2">
                  <CreditCard className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium">Refund Policy</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Cancellation and refund terms</p>
              </div>
            </Link>
            
            <Link href="/acceptable-use-policy">
              <div className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-colors cursor-pointer">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-indigo-600" />
                  <span className="text-sm font-medium">Acceptable Use</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Platform usage guidelines</p>
              </div>
            </Link>
            
            <Link href="/data-processing-agreement">
              <div className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-colors cursor-pointer">
                <div className="flex items-center space-x-2">
                  <Globe className="w-4 h-4 text-teal-600" />
                  <span className="text-sm font-medium">Data Processing</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">GDPR-compliant data handling</p>
              </div>
            </Link>
            
            <Link href="/disclaimer">
              <div className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-colors cursor-pointer">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span className="text-sm font-medium">Disclaimer</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Service limitations and liability</p>
              </div>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );


  // Add missing renderDataPrivacySection function
  const renderDataPrivacySection = () => (
    <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
      <CardHeader className="border-b border-gray-100 dark:border-slate-700 pb-4">
        <CardTitle className="flex items-center space-x-2 text-lg">
          <Shield className="w-5 h-5 text-primary" />
          <span>Data & Privacy</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Data Export Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-600 pb-2">
            Export Your Data
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Download all your personal data in compliance with GDPR. This includes your profile information, 
            bookings, contracts, invoices, and associated documents.
          </p>
          
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Label htmlFor="export-format" className="text-sm font-medium">Export Format</Label>
              <Select value={exportFormat} onValueChange={(value) => setExportFormat(value as 'json' | 'csv' | 'xls')}>
                <SelectTrigger id="export-format" data-testid="select-export-format">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">JSON (Structured Data)</SelectItem>
                  <SelectItem value="csv">CSV (Spreadsheet Compatible)</SelectItem>
                  <SelectItem value="xls">Excel (Microsoft Excel)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                {exportFormat === 'json' && 'Complete structured data with all fields and relationships'}
                {exportFormat === 'csv' && 'Simplified tabular format, each table as separate CSV file'}
                {exportFormat === 'xls' && 'Excel workbook with multiple sheets for each data type'}
              </p>
            </div>
            
            <Button
              onClick={() => exportUserData.mutate(exportFormat)}
              disabled={exportUserData.isPending}
              style={{
                backgroundColor: theme.colors.primary,
                color: getContrastTextColor(theme.colors.primary),
                border: 'none'
              }}
              className="hover:opacity-90 transition-opacity"
              data-testid="button-export-data"
            >
              {exportUserData.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export Data
                </>
              )}
            </Button>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex">
              <Shield className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">What's Included</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Your export will include: Profile information, Business settings, All bookings and enquiries, 
                  Contracts and invoices, Client information, Communication history, PDF documents, and System activity logs.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Account Deletion Section */}
        <div className="space-y-4 border-t border-gray-200 dark:border-gray-600 pt-6">
          <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 border-b border-red-200 dark:border-red-700 pb-2">
            Delete Your Account
          </h3>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-3 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-red-800 dark:text-red-200">Permanent Account Deletion</h4>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  This action is <strong>irreversible</strong>. All your data, including bookings, contracts, 
                  invoices, and documents will be permanently deleted from our servers.
                </p>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Before deleting your account, we recommend exporting your data. 
              Once deleted, this data cannot be recovered.
            </p>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>What happens when you delete your account:</strong>
              </p>
              <ul className="text-sm text-yellow-700 dark:text-yellow-300 mt-2 space-y-1 list-disc list-inside">
                <li>All personal data and business information permanently deleted</li>
                <li>All bookings, contracts, and invoices removed</li>
                <li>PDF documents and attachments deleted from storage</li>
                <li>Email integration and booking widget disabled</li>
                <li>Subscription cancelled (if applicable)</li>
                <li>This action cannot be undone</li>
              </ul>
            </div>
            
            <Button
              variant="destructive"
              onClick={() => setShowDeleteWarning(true)}
              className="w-full"
              data-testid="button-show-delete-warning"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Delete My Account Permanently
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
    mode: "onChange",
    shouldFocusError: false,
    shouldUseNativeValidation: false
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

  // Section-specific save functions for better performance
  const saveBusinessInfo = useMutation({
    mutationFn: async (data: SettingsFormData) => {
      const businessData = {
        businessName: data.businessName,
        businessContactEmail: data.businessContactEmail,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2,
        city: data.city,
        county: data.county,
        postcode: data.postcode,
        homeAddressLine1: data.homeAddressLine1,
        homeAddressLine2: data.homeAddressLine2,
        homeCity: data.homeCity,
        homePostcode: data.homePostcode,
        phone: data.phone,
        website: data.website,
        taxNumber: data.taxNumber,
        emailFromName: data.emailFromName,
        nextInvoiceNumber: data.nextInvoiceNumber,
        invoicePrefix: data.invoicePrefix,
        emailSignatureText: data.emailSignatureText,
        emailPrefix: data.emailPrefix,
        bankDetails: data.bankDetails
      };

      return await apiRequest('/api/settings', {
        method: 'PATCH',
        body: JSON.stringify(businessData),
      });
    },
    onSuccess: async (response) => {
      const data = await response.json();
      toast({
        title: "Success", 
        description: "Business information saved!",
      });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save business information.",
        variant: "destructive",
      });
    }
  });

  const saveContractInvoice = useMutation({
    mutationFn: async (data: SettingsFormData) => {
      const currentSettings = settings || {};
      
      const mergedContractClauses = {
        ...currentSettings.contractClauses,
        ...data.contractClauses
      };
      
      const mergedInvoiceClauses = {
        ...currentSettings.invoiceClauses,
        ...data.invoiceClauses
      };

      const contractData = {
        contractClauses: mergedContractClauses,
        customClauses: data.customClauses || [],
        invoiceClauses: mergedInvoiceClauses,
        customInvoiceClauses: data.customInvoiceClauses || [],
        // Map to snake_case for backend compatibility
        contract_clauses: mergedContractClauses,
        custom_clauses: data.customClauses || [],
        invoice_clauses: mergedInvoiceClauses,
        custom_invoice_clauses: data.customInvoiceClauses || []
      };

      return await apiRequest('/api/settings', {
        method: 'PATCH',
        body: JSON.stringify(contractData),
      });
    },
    onSuccess: async (response) => {
      const data = await response.json();
      toast({
        title: "Success",
        description: "Contract & invoice settings saved!",
      });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (error) => {
      toast({
        title: "Error", 
        description: "Failed to save contract settings.",
        variant: "destructive",
      });
    }
  });

  const saveInstruments = useMutation({
    mutationFn: async (data: SettingsFormData) => {
      const instrumentData = {
        primaryInstrument: data.primaryInstrument,
        secondaryInstruments: Array.isArray(data.secondaryInstruments) ? 
          data.secondaryInstruments : [],
        customGigTypes: Array.isArray(data.customGigTypes) ? 
          data.customGigTypes : []
      };

      return await apiRequest('/api/settings', {
        method: 'PATCH',
        body: JSON.stringify(instrumentData),
      });
    },
    onSuccess: async (response) => {
      const data = await response.json();
      toast({
        title: "Success",
        description: "Instrument settings saved! AI gig types updated.",
      });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save instrument settings.",
        variant: "destructive",
      });
    }
  });

  const savePricing = useMutation({
    mutationFn: async (data: SettingsFormData) => {
      const pricingData = {
        aiPricingEnabled: data.aiPricingEnabled,
        baseHourlyRate: data.baseHourlyRate,
        minimumBookingHours: data.minimumBookingHours,
        additionalHourRate: data.additionalHourRate,
        djServiceRate: data.djServiceRate,
        pricingNotes: data.pricingNotes,
        specialOffers: data.specialOffers
      };

      return await apiRequest('/api/settings', {
        method: 'PATCH',
        body: JSON.stringify(pricingData),
      });
    },
    onSuccess: async (response) => {
      const data = await response.json();
      toast({
        title: "Success",
        description: "Pricing settings saved!",
      });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (error) => {
      toast({
        title: "Error", 
        description: "Failed to save pricing settings.",
        variant: "destructive",
      });
    }
  });

  const saveTheme = useMutation({
    mutationFn: async (data: SettingsFormData) => {
      const themeData = {
        themeTemplate: data.themeTemplate,
        themeTone: data.themeTone,
        themeFont: data.themeFont,
        themeAccentColor: data.themeAccentColor,
        themeLogoUrl: data.themeLogoUrl,
        themeSignatureUrl: data.themeSignatureUrl,
        themeBanner: data.themeBanner,
        themeShowSetlist: data.themeShowSetlist,
        themeShowRiderNotes: data.themeShowRiderNotes,
        themeShowQrCode: data.themeShowQrCode,
        themeShowTerms: data.themeShowTerms,
        themeCustomTitle: data.themeCustomTitle
      };

      return await apiRequest('/api/settings', {
        method: 'PATCH',
        body: JSON.stringify(themeData),
      });
    },
    onSuccess: async (response) => {
      const data = await response.json();
      toast({
        title: "Success",
        description: "Theme settings saved!",
      });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save theme settings.",
        variant: "destructive", 
      });
    }
  });

  const savePerformance = useMutation({
    mutationFn: async (data: SettingsFormData) => {
      const performanceData = {
        bookingDisplayLimit: data.bookingDisplayLimit,
        distanceUnits: data.distanceUnits
      };

      return await apiRequest('/api/settings', {
        method: 'PATCH',
        body: JSON.stringify(performanceData),
      });
    },
    onSuccess: async (response) => {
      const data = await response.json();
      toast({
        title: "Success",
        description: "Performance settings saved!",
      });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save performance settings.",
        variant: "destructive",
      });
    }
  });

  // GDPR Export Data Mutation
  const exportUserData = useMutation({
    mutationFn: async (format: 'json' | 'csv' | 'xls') => {
      const response = await apiRequest(`/api/user/export-data?format=${format}`, {
        method: 'GET',
      });
      
      // Check if response is ok
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Export failed: ${errorData}`);
      }
      
      // Get the filename from the response headers
      const contentDisposition = response.headers.get('content-disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || `data-export-${new Date().toISOString().slice(0, 10)}.zip`;
      
      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      return { filename, size: blob.size };
    },
    onSuccess: (data) => {
      toast({
        title: "Export Complete",
        description: `Your data has been exported successfully as ${data.filename} (${Math.round(data.size / 1024)}KB)`,
      });
    },
    onError: (error: any) => {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export your data. Please try again.",
        variant: "destructive",
      });
    }
  });


  // GDPR Delete Account Mutation
  const deleteUserAccount = useMutation({
    mutationFn: async (confirmationCode: string) => {
      if (confirmationCode !== 'DELETE_MY_ACCOUNT_PERMANENTLY') {
        throw new Error('Invalid confirmation code');
      }
      
      const response = await apiRequest('/api/user/delete-account', {
        method: 'DELETE',
        body: JSON.stringify({ confirmationCode }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete account');
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Account Deleted",
        description: "Your account and all associated data have been permanently deleted.",
      });
      
      // Redirect to home page after a short delay
      setTimeout(() => {
        window.location.href = '/';
      }, 3000);
    },
    onError: (error: any) => {
      console.error('Delete account error:', error);
      toast({
        title: "Deletion Failed",
        description: error.message || "Failed to delete account. Please try again.",
        variant: "destructive",
      });
    }
  });

  const saveCompliance = useMutation({
    mutationFn: async (data: SettingsFormData) => {
      // Compliance section doesn't have specific fields to save
      // This is a placeholder that saves the current form state
      return await apiRequest('/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({}),
      });
    },
    onSuccess: async (response) => {
      const data = await response.json();
      toast({
        title: "Success",
        description: "Compliance settings saved!",
      });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save compliance settings.",
        variant: "destructive",
      });
    }
  });


  // Legacy save all function for compatibility
  const saveSettings = useMutation({
    mutationFn: async (data: SettingsFormData) => {
      // This will rarely be used now, but kept for compatibility
      const currentSettings = settings || {};
      
      const mergedContractClauses = {
        ...currentSettings.contractClauses,
        ...data.contractClauses
      };
      
      const mergedInvoiceClauses = {
        ...currentSettings.invoiceClauses,
        ...data.invoiceClauses
      };
      
      const processedData = {
        ...data,
        secondaryInstruments: Array.isArray(data.secondaryInstruments) ? 
          data.secondaryInstruments : [],
        customGigTypes: Array.isArray(data.customGigTypes) ? 
          data.customGigTypes : [],
        contractClauses: mergedContractClauses,
        customClauses: Array.isArray(data.customClauses) ? 
          data.customClauses : [],
        invoiceClauses: mergedInvoiceClauses,
        customInvoiceClauses: Array.isArray(data.customInvoiceClauses) ? 
          data.customInvoiceClauses : []
      };
      
      processedData.contract_clauses = mergedContractClauses;
      processedData.custom_clauses = data.customClauses || [];
      processedData.invoice_clauses = mergedInvoiceClauses;
      processedData.custom_invoice_clauses = data.customInvoiceClauses || [];
      
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
      setInitialData(data);
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: async (error: any) => {
      console.error('❌ Error saving settings:', error);

      // Try to parse the error response
      let errorMessage = "Failed to save settings. Please try again.";
      let errorField = null;

      if (error.response) {
        try {
          const errorData = await error.response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
            errorField = errorData.field;
          }
        } catch (e) {
          // Failed to parse error response
        }
      }

      // Special handling for email prefix errors
      if (errorField === 'emailPrefix') {
        // Clear the email prefix field to let user try again
        form.setError('emailPrefix', {
          type: 'manual',
          message: errorMessage
        });
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Handler for instrument selection
  const handleInstrumentChange = (instrument: string) => {
    console.log('🎵 Starting primary instrument change to:', instrument);
    
    // Early validation
    if (!instrument || typeof instrument !== 'string') {
      console.error('❌ Invalid instrument value:', instrument);
      return;
    }
    
    try {
      console.log('🎵 Step 1: Setting selected instrument');
      if (setSelectedInstrument) {
        setSelectedInstrument(instrument);
      }
      
      console.log('🎵 Step 2: Setting form value for primaryInstrument');
      if (form && form.setValue) {
        form.setValue('primaryInstrument', instrument);
      }
      
      console.log('🎵 Step 3: Getting current secondary instruments');
      const currentSecondary = form.getValues('secondaryInstruments') || [];
      console.log('🎵 Current secondary instruments:', currentSecondary);
      
      console.log('🎵 Step 4: Filtering secondary instruments');
      const updatedSecondary = currentSecondary.filter(sec => sec !== instrument);
      if (updatedSecondary.length !== currentSecondary.length) {
        console.log('🎵 Step 5: Updating secondary instruments');
        form.setValue('secondaryInstruments', updatedSecondary);
      }
      
      console.log('🎵 Step 6: Setting hasChanges');
      if (setHasChanges) {
        setHasChanges(true);
      }
      
      console.log('🎵 Step 7: Showing toast');
      const displayName = getInstrumentDisplayName ? getInstrumentDisplayName(instrument) : instrument;
      if (toast) {
        toast({
          title: "Instrument Selected", 
          description: `Primary instrument set to ${displayName}. Remember to save your settings!`,
        });
      }
      
      console.log('🎵 Step 8: Scheduling gig type population');
      // Defer gig type population to avoid state update conflicts
      setTimeout(() => {
        try {
          console.log('🎵 Deferred: Getting current gig types');
          const currentGigTypes = form.getValues('customGigTypes') || [];
          if (currentGigTypes.length === 0) {
            console.log('🎵 Deferred: Populating gig types');
            const allInstruments = [instrument, ...updatedSecondary].filter(Boolean);
            const combinedGigTypes = allInstruments.reduce((acc, inst) => {
              try {
                // Use static gig types from presets for client-side
                const preset = INSTRUMENT_GIG_PRESETS?.find(p => p.instrument === inst);
                const instrumentGigTypes = preset?.gigTypes?.map(gt => gt.name) || [];
                return [...acc, ...instrumentGigTypes];
              } catch (error) {
                console.warn(`Failed to get gig types for ${inst}:`, error);
                return acc;
              }
            }, [] as string[]);
            
            const uniqueGigTypes = Array.from(new Set(combinedGigTypes));
            form.setValue('customGigTypes', uniqueGigTypes);
            
            console.log(`🎵 Initial gig types populated: ${uniqueGigTypes.length} types for ${instrument}`);
          }
        } catch (error) {
          console.error('Error in deferred gig types population:', error);
        }
      }, 100);
      
      console.log('🎵 Primary instrument change completed successfully');
    } catch (error) {
      console.error('❌ Error in handleInstrumentChange:', error);
      if (toast) {
        toast({
          title: "Error", 
          description: "Failed to update instrument selection",
          variant: "destructive"
        });
      }
    }
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
      
      // Add a watcher to detect any automatic value changes
      const checkInterval = setInterval(() => {
        const currentEmail = form.getValues('businessContactEmail');
        const currentSignature = form.getValues('emailSignatureText');
        if (currentEmail && currentSignature && currentEmail === currentSignature) {
          console.error('🚨 FIELD SYNC DETECTED:', {
            businessContactEmail: currentEmail,
            emailSignatureText: currentSignature,
            stack: new Error().stack
          });
        }
      }, 1000);
      
      // Clear interval after 10 seconds
      setTimeout(() => clearInterval(checkInterval), 10000);
      
      
      
      // Create the form data object with actual values
      console.log('🔍 FORM INIT - Checking for field synchronization:', {
        businessContactEmail: settings.businessContactEmail,
        emailSignatureText: settings.emailSignatureText,
        areEqual: settings.businessContactEmail === settings.emailSignatureText
      });

      // CRITICAL DEBUG: Check what home address data is received from API
      console.log('🏠 FRONTEND - Home address data received from API:', {
        homeAddressLine1: settings.homeAddressLine1,
        homeAddressLine2: settings.homeAddressLine2,
        homeCity: settings.homeCity,
        homePostcode: settings.homePostcode
      });
      const formData = {
        businessName: settings.businessName || "",
        businessContactEmail: settings.businessContactEmail || "",
        addressLine1: settings.addressLine1 || "",
        addressLine2: settings.addressLine2 || "",
        city: settings.city || "",
        county: settings.county || "",
        postcode: settings.postcode || "",
        // Home address fields - CRITICAL FIX for home address not loading
        homeAddressLine1: settings.homeAddressLine1 || "",
        homeAddressLine2: settings.homeAddressLine2 || "",
        homeCity: settings.homeCity || "",
        homePostcode: settings.homePostcode || "",
        phone: settings.phone || "",
        website: settings.website || "",
        taxNumber: settings.taxNumber || "",
        emailFromName: settings.emailFromName || "",
        emailSignatureText: settings.emailSignatureText || "",
        personalForwardEmail: settings.personalForwardEmail || "",
        nextInvoiceNumber: settings.nextInvoiceNumber || 1,
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
      console.log('🔄 Resetting form with data:', { 
        primaryInstrument: formData.primaryInstrument, 
        bankDetails: formData.bankDetails?.substring(0, 50),
        emailPrefix: formData.emailPrefix,
        emailSignatureText: formData.emailSignatureText?.substring(0, 50),
        businessName: formData.businessName,
        businessContactEmail: formData.businessContactEmail
      });
      console.log('🔍 Full formData keys:', Object.keys(formData));
      console.log('🔍 Raw settings keys:', Object.keys(settings));
      
      try {
        form.reset(formData);
        
        // Store initial data for comparison and mark as initialized
        setInitialData(formData);
        setFormInitialized(true);
        console.log('✅ Form reset and initialization completed successfully');
      } catch (error) {
        console.error('❌ Error during form reset:', error);
        // Fallback: just mark as initialized even if reset failed
        setFormInitialized(true);
      }
      
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
    try {
      console.log('Form submitted with data:', data);
      console.log('Has changes:', hasChanges);
      console.log('Save settings pending:', saveSettings.isPending);
      saveSettings.mutate(data);
    } catch (error) {
      console.error('❌ Error in form submission:', error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    }
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
      {!isDesktop && <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />}
      {isDesktop && <Sidebar isOpen={true} onClose={() => {}} />}
      <MobileNav />

      <div className={`${isDesktop ? 'ml-64' : ''}`}>
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
          {/* Settings Navigation Sidebar - Hidden on mobile */}
          <div className="hidden md:block w-80 border-r border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
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
                        ? '' 
                        : 'hover:bg-gray-50 dark:hover:bg-slate-800'
                    }`}
                    style={{
                      color: isActive ? getThemeTextColor(currentTheme) : 'var(--theme-text)',
                      backgroundColor: isActive ? 'var(--theme-primary)' : 'transparent'
                    }}
                    data-settings-nav-button="true"
                  >
                    <div className="flex items-center space-x-3" style={{ color: 'inherit' }}>
                      <Icon className="w-5 h-5" style={{ color: 'inherit' }} />
                      <span className="font-medium" style={{ color: 'inherit' }}>{section.label}</span>
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
              <div className="space-y-6">
                {/* Mobile Section Selector */}
                <div className="md:hidden mb-6">
                  <Select value={activeSection} onValueChange={setActiveSection}>
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {settingsSections.find(s => s.id === activeSection)?.label || "Select a section"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {settingsSections.map((section) => {
                        const isCompleted = form?.getValues ? section.checkCompletion(currentFormData) : false;
                        return (
                          <SelectItem key={section.id} value={section.id}>
                            <div className="flex items-center justify-between w-full">
                              <span>{section.label}</span>
                              {isCompleted && (
                                <CheckCircle className="w-4 h-4 text-green-500 ml-2" />
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Render active section */}
                {renderActiveSection()}
              </div>
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


      {/* Delete Account Warning Dialog (First Step) */}
      <Dialog open={showDeleteWarning} onOpenChange={setShowDeleteWarning}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-600 dark:text-red-400">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Are You Absolutely Sure?
            </DialogTitle>
            <DialogDescription className="text-left space-y-3">
              <p>You are about to permanently delete your MusoBuddy account.</p>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">This will immediately:</p>
                <ul className="text-sm text-red-700 dark:text-red-300 space-y-1 list-disc list-inside">
                  <li>Delete all account data and settings</li>
                  <li>Remove all bookings and contracts</li>
                  <li>Delete all PDF documents permanently</li>
                  <li>Cancel any active subscriptions</li>
                </ul>
              </div>
              <p className="text-sm font-medium">Consider exporting your data first. This action cannot be undone.</p>
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteWarning(false)}
              data-testid="button-cancel-delete-warning"
            >
              Cancel - Keep My Account
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowDeleteWarning(false);
                setShowDeleteConfirmation(true);
              }}
              data-testid="button-proceed-to-delete"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              I Understand - Proceed to Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Account Delete Confirmation Dialog (Second Step) */}
      <Dialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Delete Your Account
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. All your data will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                What will be deleted:
              </h4>
              <ul className="text-sm text-red-700 dark:text-red-300 space-y-1 list-disc list-inside">
                <li>All bookings, contracts, and invoices</li>
                <li>Client information and communication history</li>
                <li>PDF documents and attachments</li>
                <li>Account settings and preferences</li>
                <li>Email integration and booking widget</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="delete-confirmation" className="text-sm font-medium">
                To confirm deletion, type{' '}
                <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-xs">
                  DELETE_MY_ACCOUNT_PERMANENTLY
                </code>
              </Label>
              <Input
                id="delete-confirmation"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder="Type the confirmation text here"
                className="font-mono"
                data-testid="input-delete-confirmation"
              />
              {deleteConfirmationText && deleteConfirmationText !== 'DELETE_MY_ACCOUNT_PERMANENTLY' && (
                <p className="text-sm text-red-600">
                  Text does not match. Please type exactly: DELETE_MY_ACCOUNT_PERMANENTLY
                </p>
              )}
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteConfirmation(false);
                setDeleteConfirmationText('');
              }}
              data-testid="button-cancel-delete"
            >
              Cancel - Keep My Account
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteConfirmationText === 'DELETE_MY_ACCOUNT_PERMANENTLY') {
                  deleteUserAccount.mutate(deleteConfirmationText);
                  setShowDeleteConfirmation(false);
                  setDeleteConfirmationText('');
                }
              }}
              disabled={deleteConfirmationText !== 'DELETE_MY_ACCOUNT_PERMANENTLY' || deleteUserAccount.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteUserAccount.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting Account...
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Yes - Delete Forever
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
