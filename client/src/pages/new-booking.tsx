import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Calendar, ArrowLeft, Save, Crown, MapPin, Paperclip, Eye, Download, Upload, MessageSquare, MessageCircle, MoreHorizontal, ThumbsUp, DollarSign, FileText, Shield, XCircle, Users, Music } from "lucide-react";
import { Link, useLocation } from "wouter";
import { insertBookingSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { z } from "zod";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import { What3WordsInput } from "@/components/What3WordsInput";
import IndividualFieldLock from "@/components/individual-field-lock";
import BookingMap from "@/components/BookingMap";
import Sidebar from "@/components/sidebar";
import { useResponsive } from "@/hooks/useResponsive";
import { BookingDocuments } from "@/components/BookingDocuments";

// Enhanced schema for full booking creation
const fullBookingSchema = z.object({
  clientName: z.string().min(1, "Client name is required"),
  clientEmail: z.string().email().optional().or(z.literal("")),
  clientPhone: z.string().optional(),
  clientAddress: z.string().optional(),
  eventDate: z.string().min(1, "Event date is required"),
  eventTime: z.string().optional(),
  eventEndTime: z.string().optional(),
  venue: z.string().min(1, "Venue is required"),
  venueAddress: z.string().optional(),
  venueContactInfo: z.string().optional(),
  fee: z.string().optional(),
  finalAmount: z.string().optional(),
  gigType: z.string().optional(),
  eventType: z.string().optional(),
  equipmentRequirements: z.string().optional(),
  specialRequirements: z.string().optional(),
  performanceDuration: z.string().optional(),
  styles: z.string().optional(),
  equipmentProvided: z.string().optional(),
  whatsIncluded: z.string().optional(),
  dressCode: z.string().optional(),
  contactPerson: z.string().optional(),
  contactPhone: z.string().optional(),
  parkingInfo: z.string().optional(),
  notes: z.string().optional(),
  travelExpense: z.string().optional(),
  // Collaborative fields
  venueContact: z.string().optional(),
  soundTechContact: z.string().optional(),
  stageSize: z.string().optional(),
  powerEquipment: z.string().optional(),
  styleMood: z.string().optional(),
  mustPlaySongs: z.string().optional(),
  avoidSongs: z.string().optional(),
  setOrder: z.string().optional(),
  firstDanceSong: z.string().optional(),
  processionalSong: z.string().optional(),
  signingRegisterSong: z.string().optional(),
  recessionalSong: z.string().optional(),
  specialDedications: z.string().optional(),
  guestAnnouncements: z.string().optional(),
  loadInInfo: z.string().optional(),
  soundCheckTime: z.string().optional(),
  weatherContingency: z.string().optional(),
  parkingPermitRequired: z.boolean().optional(),
  mealProvided: z.boolean().optional(),
  dietaryRequirements: z.string().optional(),
  sharedNotes: z.string().optional(),
  referenceTracks: z.string().optional(),
  photoPermission: z.boolean().optional(),
  encoreAllowed: z.boolean().optional(),
  encoreSuggestions: z.string().optional(),
  what3words: z.string().optional(),
  bandId: z.number().optional(),
});

type FullBookingFormData = z.infer<typeof fullBookingSchema>;

interface NewBookingProps {
  clientMode?: boolean;
  collaborationToken?: string;
  editBookingId?: number;
  clientInfo?: any;
}

export default function NewBookingPage({ 
  clientMode = false, 
  collaborationToken, 
  editBookingId: propEditBookingId,
  clientInfo 
}: NewBookingProps = {}) {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Conditional authentication - only use auth in musician mode
  const authData = clientMode ? { user: null, isLoading: false, error: null } : useAuth();
  
  const user = authData?.user || null;
  
  // Check if we're editing an existing booking - support both URL param and prop
  const urlParams = new URLSearchParams(window.location.search);
  const urlEditBookingId = urlParams.get('edit');
  const editBookingId = propEditBookingId?.toString() || urlEditBookingId;
  const isEditMode = !!editBookingId;
  const [mileageData, setMileageData] = useState<{
    distance: string | null;
    distanceValue: number | null;
    duration: string | null;
    isCalculating: boolean;
    error: string | null;
  }>({
    distance: null,
    distanceValue: null,
    duration: null,
    isCalculating: false,
    error: null
  });
  
  
  // Track if mileage has been calculated to prevent re-calculation
  const [mileageCalculated, setMileageCalculated] = useState(false);
  
  // Custom gig type state
  const [showCustomGigInput, setShowCustomGigInput] = useState(false);
  const [customGigTypeInput, setCustomGigTypeInput] = useState("");
  
  // Control map display manually
  const [showMap, setShowMap] = useState(false);
  
  // Get existing bookings for enquiry auto-fill (only for musicians, not clients)
  const { data: bookings = [] } = useQuery({
    queryKey: ['/api/bookings'],
    enabled: !clientMode, // Skip for client mode
  });

  // Get user's bands (only for musicians, not clients)
  const { data: bands = [] } = useQuery({
    queryKey: ['/api/bands'],
    enabled: !clientMode, // Skip for client mode
  });
  

  // Get conflicts for the current booking (only in edit mode for musicians)
  const { data: conflictsData = [] } = useQuery({
    queryKey: ['/api/conflicts'],
    enabled: isEditMode && !!editBookingId && !clientMode,
  });

  // Filter conflicts that involve the current booking being edited
  const editingBookingConflicts = conflictsData.filter((conflict: any) => 
    conflict.bookingId === parseInt(editBookingId!) || conflict.conflictingBookingId === parseInt(editBookingId!)
  );
  
  
  // Fetch specific booking if in edit mode
  // For client mode, use collaboration endpoint; for musician mode, use regular endpoint
  const { data: editingBooking, isLoading: isLoadingBooking } = useQuery({
    queryKey: clientMode 
      ? [`/api/booking-collaboration/${editBookingId}/details`, collaborationToken]
      : [`/api/bookings/${editBookingId}`],
    queryFn: async () => {
      if (clientMode && collaborationToken) {
        // Use collaboration endpoint for clients
        const response = await fetch(`/api/booking-collaboration/${editBookingId}/details?token=${collaborationToken}`);
        if (!response.ok) {
          throw new Error('Failed to load booking details');
        }
        return response.json();
      } else if (!clientMode) {
        // Use regular endpoint for musicians  
        const response = await apiRequest(`/api/bookings/${editBookingId}`);
        return response.json();
      }
      return null;
    },
    enabled: isEditMode && !!editBookingId,
    refetchOnWindowFocus: true, // Refresh when user returns to tab
    staleTime: 30000, // Consider data fresh for 30 seconds to prevent constant refetching
  });
  
  const bookingsArray = Array.isArray(bookings) ? bookings : [];

  // Fetch user's gig types (combines AI-generated and custom types) (only for musicians, not clients)
  const { data: userGigTypes = [] } = useQuery({
    queryKey: ['/api/gig-types'],
    enabled: !clientMode, // Skip for client mode
  });

  // Also fetch user settings for other form data
  const { data: userSettings } = useQuery({
    queryKey: ['/api/settings'],
    enabled: !clientMode, // Skip for client mode
  });

  // Calculate mileage between user's business address and venue
  // Handler for adding custom gig types
  const handleAddCustomGigType = async () => {
    if (!customGigTypeInput.trim()) return;
    
    try {
      const response = await apiRequest('/api/gig-types/custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gigType: customGigTypeInput.trim()
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Set the form field to the new custom gig type
        form.setValue('gigType', customGigTypeInput.trim());
        
        // Clear the input and hide the custom input
        setCustomGigTypeInput("");
        setShowCustomGigInput(false);
        
        // Refresh the gig types list
        queryClient.invalidateQueries({ queryKey: ['/api/gig-types'] });
        
        toast({
          title: "Custom gig type added",
          description: `"${customGigTypeInput.trim()}" has been saved for future use`,
        });
      }
    } catch (error: any) {
      console.error('Failed to add custom gig type:', error);
      toast({
        title: "Error",
        description: "Failed to add custom gig type",
        variant: "destructive",
      });
    }
  };
  
  const calculateMileage = async (venueAddress: string) => {
    if (!venueAddress || !userSettings) return;

    // Always use address line 1 + postcode from business settings (most reliable)
    const addressLine1 = (userSettings as any)?.addressLine1;
    const postcode = (userSettings as any)?.postcode;
    
    // Simple concatenation of address line 1 and postcode
    const businessAddress = `${addressLine1 || ''}, ${postcode || ''}`.trim();

    if (!addressLine1 || !postcode) {
      setMileageData(prev => ({ 
        ...prev, 
        error: "Please set your Address Line 1 and Postcode in Settings to calculate mileage" 
      }));
      return;
    }

    setMileageData(prev => ({ ...prev, isCalculating: true, error: null }));
    console.log('🚗 Mileage state updated - calculating...');

    try {
      console.log('🚗 Calculating mileage from:', businessAddress, 'to:', venueAddress);
      
      const response = await apiRequest('/api/maps/travel-time', {
        method: 'POST',
        body: JSON.stringify({
          origin: businessAddress,
          destination: venueAddress,
          departureTime: null // Use current time
        })
      });

      const data = await response.json();
      
      if (data.distance && data.duration) {
        setMileageData({
          distance: data.distance,
          distanceValue: data.distanceValue,
          duration: data.durationInTraffic || data.duration,
          isCalculating: false,
          error: null
        });
        setMileageCalculated(true); // Mark as calculated to prevent re-calculation
        console.log('✅ Mileage calculated:', data);
      } else {
        throw new Error('No route found');
      }
    } catch (error: any) {
      console.error('❌ Mileage calculation failed:', error);
      setMileageData({
        distance: null,
        distanceValue: null,
        duration: null,
        isCalculating: false,
        error: "Could not calculate mileage - check addresses"
      });
    }
  };

  // Calculate mileage to town center (for bookings with just a town name)
  const calculateMileageToTownCenter = async (townName: string) => {
    if (!townName || !userSettings) return;

    // Always use address line 1 + postcode from business settings (most reliable)
    const addressLine1 = (userSettings as any)?.addressLine1;
    const postcode = (userSettings as any)?.postcode;
    
    // Simple concatenation of address line 1 and postcode
    const businessAddress = `${addressLine1 || ''}, ${postcode || ''}`.trim();

    if (!addressLine1 || !postcode) {
      setMileageData(prev => ({ 
        ...prev, 
        error: "Please set your Address Line 1 and Postcode in Settings to calculate mileage" 
      }));
      return;
    }

    setMileageData(prev => ({ ...prev, isCalculating: true, error: null }));
    console.log('🏘️ Calculating distance to town center:', townName);

    try {
      // Add "town center" or "city center" to get more accurate center point
      const destination = `${townName} town center, UK`;
      console.log('🏘️ Calculating mileage from:', businessAddress, 'to:', destination);
      
      const response = await apiRequest('/api/maps/travel-time', {
        method: 'POST',
        body: JSON.stringify({
          origin: businessAddress,
          destination: destination,
          departureTime: null // Use current time
        })
      });

      const data = await response.json();
      
      if (data.distance && data.duration) {
        setMileageData({
          distance: `~${data.distance} (to town center)`,
          distanceValue: data.distanceValue,
          duration: data.durationInTraffic || data.duration,
          isCalculating: false,
          error: null,
          isTownCenter: true // Flag to indicate this is a town center calculation
        });
        setMileageCalculated(true); // Mark as calculated to prevent re-calculation
        console.log('✅ Distance to town center calculated:', data);
      } else {
        throw new Error('No route found');
      }
    } catch (error: any) {
      console.error('❌ Town center distance calculation failed:', error);
      setMileageData({
        distance: null,
        distanceValue: null,
        duration: null,
        isCalculating: false,
        error: "Could not calculate distance to town center"
      });
    }
  };

  const form = useForm<FullBookingFormData>({
    resolver: zodResolver(fullBookingSchema),
    defaultValues: {
      clientName: "",
      clientEmail: "",
      clientPhone: "",
      clientAddress: "",
      eventDate: "",
      eventTime: "",
      eventEndTime: "",
      venue: "",
      venueAddress: "",
      venueContactInfo: "",
      fee: "",
      gigType: "",
      eventType: "",
      equipmentRequirements: "",
      specialRequirements: "",
      performanceDuration: "",
      styles: "",
      equipmentProvided: "",
      whatsIncluded: "",
      dressCode: "",
      contactPerson: "",
      contactPhone: "",
      parkingInfo: "",
      notes: "",
      travelExpense: "",
      // Collaborative fields - provide default empty values to prevent uncontrolled->controlled warnings
      venueContact: "",
      soundTechContact: "",
      stageSize: "",
      powerEquipment: "",
      styleMood: "",
      mustPlaySongs: "",
      avoidSongs: "",
      setOrder: "",
      firstDanceSong: "",
      processionalSong: "",
      signingRegisterSong: "",
      recessionalSong: "",
      specialDedications: "",
      guestAnnouncements: "",
      loadInInfo: "",
      soundCheckTime: "",
      weatherContingency: "",
      parkingPermitRequired: false,
      mealProvided: false,
      dietaryRequirements: "",
      sharedNotes: "",
      referenceTracks: "",
      photoPermission: true,
      encoreAllowed: true,
      encoreSuggestions: "",
      what3words: "",
    },
  });

  // Watch venue address changes to calculate mileage (only for new bookings or when user manually changes address)
  const watchedVenueAddress = form.watch('venueAddress');
  const watchedVenue = form.watch('venue');
  const [formInitialized, setFormInitialized] = useState(false);
  
  // Load existing mileage data when editing
  useEffect(() => {
    if (isEditMode && editingBooking && (editingBooking.distance || editingBooking.duration)) {
      setMileageData({
        distance: editingBooking.distance || null,
        distanceValue: editingBooking.distanceValue || null,
        duration: editingBooking.duration || null,
        isCalculating: false,
        error: null
      });
      setMileageCalculated(true);
      console.log('✅ Loaded existing mileage data for editing booking');
    }
  }, [isEditMode, editingBooking]);

  // No automatic mileage calculation - all calculations are manual via user action
  // Scenarios:
  // 1. Venue name only (e.g., "Royal Albert Hall") → Tab-based autocomplete to get full address
  // 2. Location only (e.g., "Central London") → Manual "Calculate Mileage" button
  // 3. Both provided → Manual "Calculate Mileage" button (user maintains full control)
  
  // Removed: No longer auto-populate venue address from venue field to prevent unnecessary API calls
  // User preference: Keep venue name blank unless we actually know the venue name

  // Populate form with existing booking data when editing
  useEffect(() => {
    if (editingBooking && isEditMode) {
      console.log('📝 Populating form with booking data:', editingBooking);
      
      const formatDate = (date: any) => {
        if (!date) return '';
        try {
          return new Date(date).toISOString().split('T')[0];
        } catch {
          return '';
        }
      };

      const formatTime = (time: any) => {
        if (!time) return '';
        // Handle time format (HH:MM)
        if (typeof time === 'string' && time.includes(':')) {
          return time;
        }
        return '';
      };

      
      form.reset({
        clientName: editingBooking.clientName || '',
        clientEmail: editingBooking.clientEmail || '',
        clientPhone: editingBooking.clientPhone || '',
        clientAddress: editingBooking.clientAddress || '',
        eventDate: formatDate(editingBooking.eventDate),
        eventTime: formatTime(editingBooking.eventTime),
        eventEndTime: formatTime(editingBooking.eventEndTime),
        venue: editingBooking.venue || '',
        venueAddress: editingBooking.venueAddress || '',
        venueContactInfo: editingBooking.venueContactInfo || '',
        fee: editingBooking.fee !== null && editingBooking.fee !== undefined ? editingBooking.fee.toString() : '',
        finalAmount: editingBooking.finalAmount !== null && editingBooking.finalAmount !== undefined ? editingBooking.finalAmount.toString() : '',
        gigType: editingBooking.gigType || '',
        eventType: editingBooking.eventType || '',
        equipmentRequirements: editingBooking.equipmentRequirements || '',
        specialRequirements: editingBooking.specialRequirements || '',
        performanceDuration: editingBooking.performanceDuration || '',
        styles: editingBooking.styles || '',
        equipmentProvided: editingBooking.equipmentProvided || '',
        whatsIncluded: editingBooking.whatsIncluded || '',
        dressCode: editingBooking.dressCode || '',
        contactPerson: editingBooking.contactPerson || '',
        contactPhone: editingBooking.contactPhone || '',
        parkingInfo: editingBooking.parkingInfo || '',
        notes: editingBooking.notes || '',
        travelExpense: editingBooking.travelExpense !== null && editingBooking.travelExpense !== undefined ? editingBooking.travelExpense.toString() : '',
        // Collaborative fields
        venueContact: editingBooking.venueContact || '',
        soundTechContact: editingBooking.soundTechContact || '',
        stageSize: editingBooking.stageSize || '',
        powerEquipment: editingBooking.powerEquipment || '',
        styleMood: editingBooking.styleMood || '',
        mustPlaySongs: editingBooking.mustPlaySongs || '',
        avoidSongs: editingBooking.avoidSongs || '',
        setOrder: editingBooking.setOrder || '',
        firstDanceSong: editingBooking.firstDanceSong || '',
        processionalSong: editingBooking.processionalSong || '',
        signingRegisterSong: editingBooking.signingRegisterSong || '',
        recessionalSong: editingBooking.recessionalSong || '',
        specialDedications: editingBooking.specialDedications || '',
        guestAnnouncements: editingBooking.guestAnnouncements || '',
        loadInInfo: editingBooking.loadInInfo || '',
        soundCheckTime: editingBooking.soundCheckTime || '',
        weatherContingency: editingBooking.weatherContingency || '',
        parkingPermitRequired: editingBooking.parkingPermitRequired || false,
        mealProvided: editingBooking.mealProvided || false,
        dietaryRequirements: editingBooking.dietaryRequirements || '',
        sharedNotes: editingBooking.sharedNotes || '',
        referenceTracks: editingBooking.referenceTracks || '',
        photoPermission: editingBooking.photoPermission !== undefined ? editingBooking.photoPermission : true,
        encoreAllowed: editingBooking.encoreAllowed !== undefined ? editingBooking.encoreAllowed : true,
        encoreSuggestions: editingBooking.encoreSuggestions || '',
        what3words: editingBooking.what3words || '',
      });
      
      // Set existing mileage data if available
      if (editingBooking.distance || editingBooking.duration) {
        setMileageData({
          distance: editingBooking.distance || null,
          distanceValue: editingBooking.distanceValue || null,
          duration: editingBooking.duration || null,
          isCalculating: false,
          error: null
        });
        setMileageCalculated(true);
        console.log('✅ Loaded existing mileage data:', {
          distance: editingBooking.distance,
          duration: editingBooking.duration
        });
      } else if (editingBooking.venueAddress && !editingBooking.venue?.includes(',') && !editingBooking.venue?.includes('Hall') && !editingBooking.venue?.includes('Hotel') && !editingBooking.venue?.includes('Club')) {
        // If we have a venue address that looks like just a town name (no commas, no venue keywords)
        // Calculate distance to town center
        const townName = editingBooking.venueAddress;
        console.log(`📍 Detected town-only location: ${townName}, calculating distance to town center...`);
        setTimeout(() => {
          calculateMileageToTownCenter(townName);
        }, 1000);
      }
      
      console.log('✅ Form populated with booking data');
      setFormInitialized(true);
    }
  }, [editingBooking, isEditMode, form]);

  // Helper function to add new gig types to user settings
  const addNewGigTypeToSettings = async (gigType: string) => {
    if (!gigType || clientMode || userGigTypes.includes(gigType)) {
      return; // Skip if empty, in client mode, or gig type already exists
    }

    try {
      // Get current settings
      const currentSettings = queryClient.getQueryData(['/api/settings']);
      const currentGigTypes = (currentSettings as any)?.customGigTypes || [];
      
      // Add new gig type if not already present
      if (!currentGigTypes.includes(gigType)) {
        const updatedGigTypes = [...currentGigTypes, gigType];
        
        // Update user settings
        await apiRequest('/api/settings', {
          method: 'PATCH',
          body: JSON.stringify({
            customGigTypes: updatedGigTypes
          }),
        });
        
        // Invalidate settings cache to refresh the data
        queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
        
        console.log(`✅ Added new gig type "${gigType}" to user settings`);
      }
    } catch (error) {
      console.error('❌ Failed to add gig type to settings:', error);
      // Don't show error to user - this is a background operation
    }
  };

  const createBookingMutation = useMutation({
    mutationFn: async (data: FullBookingFormData) => {
      const bookingData = {
        title: `${data.gigType || 'Event'} - ${data.clientName}`,
        clientName: data.clientName,
        clientEmail: data.clientEmail || null,
        clientPhone: data.clientPhone || null,
        clientAddress: data.clientAddress || null,
        eventDate: new Date(data.eventDate),
        eventTime: data.eventTime || null,
        eventEndTime: data.eventEndTime || null,
        venue: data.venue,
        venueAddress: data.venueAddress || null,
        venueContactInfo: data.venueContactInfo || null,
        fee: data.fee ? parseFloat(data.fee) : null,
        finalAmount: data.finalAmount ? parseFloat(data.finalAmount) : null,

        gigType: data.gigType || null,
        eventType: data.eventType || null,
        equipmentRequirements: data.equipmentRequirements || null,
        specialRequirements: data.specialRequirements || null,
        performanceDuration: data.performanceDuration || null,
        styles: data.styles || null,
        equipmentProvided: data.equipmentProvided || null,
        whatsIncluded: data.whatsIncluded || null,
        dressCode: data.dressCode || null,
        contactPerson: data.contactPerson || null,
        contactPhone: data.contactPhone || null,
        parkingInfo: data.parkingInfo || null,
        notes: data.notes || null,
        travelExpense: data.travelExpense ? parseFloat(data.travelExpense) : null,
        status: "new" as const,
      };
      const response = await apiRequest('/api/bookings', {
        method: 'POST',
        body: JSON.stringify(bookingData),
      });
      return await response.json();
    },
    onSuccess: async (response, variables) => {
      // Add new gig type to settings if it's custom
      if (variables.gigType) {
        await addNewGigTypeToSettings(variables.gigType);
      }
      
      toast({
        title: "Success!",
        description: "Booking has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      setLocation('/bookings');
    },
    onError: (error) => {
      console.error("Create Booking Error:", error);
      toast({
        title: "Error",
        description: "Failed to create booking. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update booking mutation for edit mode
  const updateBookingMutation = useMutation({
    mutationFn: async (data: FullBookingFormData) => {
      if (!editBookingId) throw new Error('No booking ID');
      
      const bookingData = {
        clientName: data.clientName,
        clientEmail: data.clientEmail || null,
        clientPhone: data.clientPhone || null,
        clientAddress: data.clientAddress || null,
        eventDate: new Date(data.eventDate),
        eventTime: data.eventTime || null,
        eventEndTime: data.eventEndTime || null,
        venue: data.venue,
        venueAddress: data.venueAddress || null,
        venueContactInfo: data.venueContactInfo || null,
        fee: data.fee ? parseFloat(data.fee) : null,
        finalAmount: data.finalAmount ? parseFloat(data.finalAmount) : null,

        gigType: data.gigType || null,
        eventType: data.eventType || null,
        equipmentRequirements: data.equipmentRequirements || null,
        specialRequirements: data.specialRequirements || null,
        performanceDuration: data.performanceDuration || null,
        styles: data.styles || null,
        equipmentProvided: data.equipmentProvided || null,
        whatsIncluded: data.whatsIncluded || null,
        dressCode: data.dressCode || null,
        contactPerson: data.contactPerson || null,
        contactPhone: data.contactPhone || null,
        parkingInfo: data.parkingInfo || null,
        notes: data.notes || null,
        travelExpense: data.travelExpense ? parseFloat(data.travelExpense) : null,
        // Collaborative fields
        venueContact: data.venueContact || null,
        soundTechContact: data.soundTechContact || null,
        stageSize: data.stageSize || null,
        powerEquipment: data.powerEquipment || null,
        styleMood: data.styleMood || null,
        mustPlaySongs: data.mustPlaySongs || null,
        avoidSongs: data.avoidSongs || null,
        setOrder: data.setOrder || null,
        firstDanceSong: data.firstDanceSong || null,
        processionalSong: data.processionalSong || null,
        signingRegisterSong: data.signingRegisterSong || null,
        recessionalSong: data.recessionalSong || null,
        specialDedications: data.specialDedications || null,
        guestAnnouncements: data.guestAnnouncements || null,
        loadInInfo: data.loadInInfo || null,
        soundCheckTime: data.soundCheckTime || null,
        weatherContingency: data.weatherContingency || null,
        parkingPermitRequired: data.parkingPermitRequired || false,
        mealProvided: data.mealProvided || false,
        dietaryRequirements: data.dietaryRequirements || null,
        sharedNotes: data.sharedNotes || null,
        referenceTracks: data.referenceTracks || null,
        photoPermission: data.photoPermission !== undefined ? data.photoPermission : true,
        encoreAllowed: data.encoreAllowed !== undefined ? data.encoreAllowed : true,
        encoreSuggestions: data.encoreSuggestions || null,
        what3words: data.what3words || null,
        // Include mileage data if calculated
        distance: mileageData.distance || null,
        distanceValue: mileageData.distanceValue || null,
        duration: mileageData.duration || null,
      };
      
      if (clientMode && collaborationToken) {
        // Use collaboration endpoint for clients
        const response = await fetch(`/api/booking-collaboration/${editBookingId}/update?token=${collaborationToken}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(bookingData),
        });
        if (!response.ok) {
          throw new Error('Failed to update booking via collaboration');
        }
        return await response.json();
      } else {
        // Use regular endpoint for musicians
        const response = await apiRequest(`/api/bookings/${editBookingId}`, {
          method: 'PATCH',
          body: JSON.stringify(bookingData),
        });
        return await response.json();
      }
    },
    onSuccess: async (response, variables) => {
      console.log('✅ Booking update successful!');
      
      // Add new gig type to settings if it's custom (only for musicians, not clients)
      if (!clientMode && variables.gigType) {
        await addNewGigTypeToSettings(variables.gigType);
      }
      
      if (clientMode) {
        toast({
          title: "Success!",
          description: "Your event details have been updated successfully. Thank you!",
        });
        // Don't navigate away for clients - they stay on the collaboration page
        // Don't invalidate queries that require authentication
      } else {
        toast({
          title: "Success!",
          description: "Booking updated successfully",
        });
        queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
        setLocation('/bookings');
      }
    },
    onError: (error: any) => {
      console.error('❌ Booking update failed:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update booking",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FullBookingFormData) => {
    console.log('🚀 Form submission triggered:', { isEditMode, mileageData });
    if (isEditMode) {
      console.log('📝 Updating booking with data:', { ...data, mileageData });
      updateBookingMutation.mutate(data);
    } else {
      console.log('➕ Creating new booking with data:', { ...data, mileageData });
      createBookingMutation.mutate(data);
    }
  };

  // Handle form validation errors
  const onInvalidSubmit = (errors: any) => {
    console.log('❌ Form validation errors:', errors);
    
    // Find the first error and show a helpful message
    const errorFields = Object.keys(errors);
    if (errorFields.length > 0) {
      const firstError = errors[errorFields[0]];
      const fieldName = errorFields[0];
      
      // Create user-friendly field names
      const friendlyNames: { [key: string]: string } = {
        clientName: "Client Name",
        eventDate: "Event Date", 
        venue: "Venue Name"
      };
      
      const friendlyFieldName = friendlyNames[fieldName] || fieldName;
      
      toast({
        title: "Required Field Missing",
        description: `Please fill in the ${friendlyFieldName} field to continue.`,
        variant: "destructive",
      });
    }
  };

  const { isDesktop } = useResponsive();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary/5 flex">
      {/* Desktop Sidebar - Only visible for musicians, NOT for clients */}
      {isDesktop && !clientMode && (
        <div className="w-64 bg-white dark:bg-slate-900 shadow-xl border-r border-gray-200 dark:border-slate-700 fixed left-0 top-0 h-full z-30">
          <Sidebar isOpen={true} onClose={() => {}} />
        </div>
      )}
      
      {/* Main Content - Shifted right on desktop only when sidebar is visible */}
      <div className={`flex-1 ${isDesktop && !clientMode ? 'ml-64' : ''} min-h-screen`}>
        <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8">
        {/* Enhanced Header - Only visible for musicians, NOT for clients */}
        {!clientMode && (
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-yellow-500 to-blue-600 rounded-2xl opacity-5"></div>
          <div className="relative bg-white/80 backdrop-blur-sm border border-primary/10 rounded-2xl p-6 shadow-lg">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex flex-col gap-2">
                    <Link href="/bookings">
                      <Button variant="outline" size="sm" className="bg-primary hover:bg-primary/90 border-primary text-primary-foreground hover:text-primary-foreground font-medium">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Bookings
                      </Button>
                    </Link>
                    {/* Back to conflict button - only show if booking has conflicts */}
                    {isEditMode && editingBooking && editingBookingConflicts && editingBookingConflicts.length > 0 && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          // Set list view mode and navigate back to bookings page
                          localStorage.setItem('bookingViewMode', 'list');
                          setLocation('/bookings');
                        }}
                        className="bg-orange-500 hover:bg-orange-600 border-orange-500 text-white hover:text-white font-medium"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Conflict
                      </Button>
                    )}
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] bg-clip-text text-transparent">
                      {isEditMode ? 'Edit Booking' : 'New Booking'}
                    </h1>
                    <p className="text-gray-600 mt-1">{isEditMode ? 'Update booking details' : 'Create a new performance booking'}</p>
                  </div>
                </div>
                <div className="hidden md:flex items-center space-x-2 text-primary">
                  <Calendar className="w-8 h-8" />
                </div>
              </div>
              
              {/* Booking Actions - Only show in edit mode */}
              {isEditMode && editingBooking && (
                <div className="flex items-center justify-end gap-2 border-t pt-4">
                  {/* Apply on Encore button if applicable */}
                  {editingBooking.applyNowLink && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        // Update booking status to "In progress"
                        try {
                          const response = await apiRequest(`/api/bookings/${editBookingId}`, {
                            method: "PATCH",
                            body: JSON.stringify({ status: 'in_progress' }),
                          });
                          
                          if (response.ok) {
                            queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
                            toast({
                              title: "Application submitted",
                              description: "Booking status updated to In Progress",
                            });
                          }
                        } catch (error) {
                          console.error('Error updating booking status:', error);
                        }
                        
                        // Open Encore link in new tab
                        window.open(editingBooking.applyNowLink, '_blank');
                      }}
                      className="bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100"
                    >
                      🎵 Apply on Encore
                    </Button>
                  )}
                  
                  {/* Primary Action Buttons */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLocation(`/conversation/${editBookingId}`)}
                    className="text-blue-600 hover:bg-blue-50"
                  >
                    <MessageSquare className="w-4 h-4 mr-1" />
                    Respond
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLocation(`/conversation/${editBookingId}`)}
                    className="text-indigo-600 hover:bg-indigo-50"
                  >
                    <MessageCircle className="w-4 h-4 mr-1" />
                    Conversation
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/booking-summary/${editBookingId}`, '_blank')}
                    className="text-green-600 hover:bg-green-50"
                  >
                    <FileText className="w-4 h-4 mr-1" />
                    Summary
                  </Button>
                  
                  {/* Secondary Actions - Dropdown Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-gray-600 hover:bg-gray-50"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem
                        onClick={() => setLocation(`/templates?bookingId=${editBookingId}&action=thankyou`)}
                      >
                        <ThumbsUp className="w-4 h-4 mr-2" />
                        Send Thank You
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem
                        onClick={() => setLocation(`/invoices?create=true&bookingId=${editBookingId}`)}
                      >
                        <DollarSign className="w-4 h-4 mr-2" />
                        Create Invoice
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem
                        onClick={() => setLocation(`/contracts/new?bookingId=${editBookingId}`)}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Create Contract
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem
                        onClick={() => setLocation(`/compliance?bookingId=${editBookingId}`)}
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        Compliance
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem
                        onClick={async () => {
                          if (confirm("Are you sure you want to reject this booking?")) {
                            try {
                              const response = await apiRequest(`/api/bookings/${editBookingId}`, {
                                method: "PATCH",
                                body: JSON.stringify({ status: 'rejected' }),
                              });
                              
                              if (response.ok) {
                                queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
                                toast({
                                  title: "Booking rejected",
                                  description: "The booking has been marked as rejected",
                                });
                                setLocation('/bookings');
                              }
                            } catch (error) {
                              toast({
                                title: "Error",
                                description: "Failed to reject booking",
                                variant: "destructive",
                              });
                            }
                          }
                        }}
                        className="text-red-600"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject Booking
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          </div>
        </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, onInvalidSubmit)} className="space-y-6">
            {/* Client Mode Header */}
            {clientMode && (
              <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-green-800">Collaboration Portal</h2>
                      <p className="text-green-700">Help plan your event by filling in the details below</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Client & Contact Information - Hide in client mode */}
            {!clientMode && (
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl ring-1 ring-primary/10">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-primary-50 rounded-t-lg border-b border-primary/10">
                <CardTitle className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">1</span>
                  </div>
                  Client & Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Primary Contact */}
                <div>
                  <h3 className="text-md font-semibold text-primary-700 mb-3 border-b border-primary-100 pb-1">
                    Primary Contact
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="clientName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">Client Name *</FormLabel>
                          <FormControl>
                            <Input {...field} className="bg-white/70 border-primary-200 focus:border-primary-400 focus:ring-purple-400/20" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="clientEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">Email</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" className="bg-white/70 border-primary-200 focus:border-primary-400 focus:ring-purple-400/20" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="clientPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">Phone</FormLabel>
                          <FormControl>
                            <Input {...field} className="bg-white/70 border-primary-200 focus:border-primary-400 focus:ring-purple-400/20" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="contactPerson"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">On-Day Contact Person</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="If different from client" className="bg-white/70 border-primary-200 focus:border-primary-400 focus:ring-purple-400/20" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                {/* Address */}
                <div>
                  <h3 className="text-md font-semibold text-primary-700 mb-3 border-b border-primary-100 pb-1">
                    Billing Address
                  </h3>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="clientAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">Full Address</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={2} className="bg-white/70 border-primary-200 focus:border-primary-400 focus:ring-purple-400/20 resize-none" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="what3words"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">what3words Location (Optional)</FormLabel>
                          <FormControl>
                            <What3WordsInput
                              value={field.value || ''}
                              onChange={field.onChange}
                              onLocationFound={(coords, address) => {
                                // Optionally update the client address field with what3words location
                                console.log('what3words location found:', coords, address);
                              }}
                              placeholder="///what.three.words"
                              className="w-full"
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
            )}

            {/* Event Date & Venue - Hide in client mode */}
            {!clientMode && (
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl ring-1 ring-blue-100">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-t-lg border-b border-blue-100">
                <CardTitle className="text-xl font-semibold text-blue-800 flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">2</span>
                  </div>
                  Event Date & Venue
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Date & Time */}
                <div>
                  <h3 className="text-md font-semibold text-blue-700 mb-3 border-b border-blue-100 pb-1">
                    When
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="eventDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">Event Date *</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" className="bg-white/70 border-blue-200 focus:border-blue-400 focus:ring-blue-400/20" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="eventTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">Start Time</FormLabel>
                          <FormControl>
                            <Input {...field} type="time" className="bg-white/70 border-blue-200 focus:border-blue-400 focus:ring-blue-400/20" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="eventEndTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">End Time</FormLabel>
                          <FormControl>
                            <Input {...field} type="time" className="bg-white/70 border-blue-200 focus:border-blue-400 focus:ring-blue-400/20" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Event Type */}
                  <div className="mt-4">
                    <FormField
                      control={form.control}
                      name="eventType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">Event Type</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="bg-white/70 border-blue-200 focus:border-blue-400 focus:ring-blue-400/20">
                                <SelectValue placeholder="Select event type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Wedding">Wedding</SelectItem>
                              <SelectItem value="Corporate Event">Corporate Event</SelectItem>
                              <SelectItem value="Birthday Party">Birthday Party</SelectItem>
                              <SelectItem value="Private Party">Private Party</SelectItem>
                              <SelectItem value="Festival">Festival</SelectItem>
                              <SelectItem value="Concert">Concert</SelectItem>
                              <SelectItem value="Club Night">Club Night</SelectItem>
                              <SelectItem value="Charity Event">Charity Event</SelectItem>
                              <SelectItem value="Anniversary">Anniversary</SelectItem>
                              <SelectItem value="Christmas Party">Christmas Party</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Band Selection - Only for musicians, not clients */}
                  {!clientMode && (
                    <div className="mt-4">
                      <FormField
                        control={form.control}
                        name="bandId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700 flex items-center gap-2">
                              <Users className="w-4 h-4" />
                              Band / Project
                            </FormLabel>
                            <Select
                              value={field.value?.toString() || "none"}
                              onValueChange={(value) => field.onChange(value && value !== "none" ? parseInt(value) : undefined)}
                            >
                              <FormControl>
                                <SelectTrigger className="bg-white/70 border-blue-200 focus:border-blue-400 focus:ring-blue-400/20">
                                  <SelectValue placeholder="Select band or project" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {bands.map((band: any) => (
                                  <SelectItem key={band.id} value={band.id.toString()}>
                                    <div className="flex items-center gap-2">
                                      <div
                                        className="w-3 h-3 rounded-sm"
                                        style={{ backgroundColor: band.color }}
                                      />
                                      {band.name}
                                      {band.isDefault && (
                                        <span className="text-xs text-muted-foreground">(Default)</span>
                                      )}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription className="text-xs">
                              Organize your bookings by band or project for better tracking
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>

                {/* Venue Information */}
                <div>
                  <h3 className="text-md font-semibold text-blue-700 mb-3 border-b border-blue-100 pb-1">
                    Where
                  </h3>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="venue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">
                            Venue Name *
                            <span className="ml-2 text-xs text-blue-600 font-normal">(Type venue name then press Tab to search)</span>
                          </FormLabel>
                          <FormControl>
                            <AddressAutocomplete
                              value={field.value}
                              defaultValue={field.value}
                              placeholder="Enter venue name... then press Tab (e.g., Royal Albert Hall)"
                              className="bg-white/70 border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 border rounded px-3 py-2 w-full"
                              searchOnTabOnly={true}
                              onSelect={(addressData) => {
                                // Update venue name
                                field.onChange(addressData.name || addressData.placeName || addressData.address || '');
                                
                                // Also update venue address if available
                                if (addressData.formattedAddress) {
                                  form.setValue('venueAddress', addressData.formattedAddress);
                                  
                                  // Trigger mileage calculation if address is complete
                                  if (addressData.formattedAddress.length > 10) {
                                    calculateMileage(addressData.formattedAddress);
                                  }
                                }
                                
                                // Update contact info if available
                                if (addressData.contactInfo?.phone) {
                                  form.setValue('venueContactInfo', addressData.contactInfo.phone);
                                }
                                
                                // Update parking info if available
                                if (addressData.businessInfo?.parking) {
                                  form.setValue('parkingInfo', addressData.businessInfo.parking);
                                }
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="venueAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">Venue Address</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              rows={2} 
                              className="bg-white/70 border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 resize-none" 
                              placeholder="Enter full venue address (e.g., 123 Main St, London, UK) to calculate mileage"
                            />
                          </FormControl>
                          {/* Manual mileage calculation and map generation buttons */}
                          {watchedVenueAddress && watchedVenueAddress.length > 10 && !mileageData.isCalculating && (
                            <div className="mt-2 flex gap-2">
                              {!mileageData.distance && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    // Check if this looks like just a town name
                                    const isTownOnly = !watchedVenueAddress.includes(',') && 
                                                       !watchedVenueAddress.match(/\b(Hall|Hotel|Club|Centre|Center|Church|School|Park|Theatre|Theater|Stadium|Arena|Pavilion|House|Court|Lodge|Manor|Castle|Museum|Gallery|Library|Inn|Venue|Building)\b/i);
                                    
                                    if (isTownOnly) {
                                      calculateMileageToTownCenter(watchedVenueAddress);
                                    } else {
                                      calculateMileage(watchedVenueAddress);
                                    }
                                  }}
                                  className="h-8 px-3 text-xs bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                                >
                                  <MapPin className="w-3 h-3 mr-1" />
                                  {!watchedVenueAddress.includes(',') && 
                                   !watchedVenueAddress.match(/\b(Hall|Hotel|Club|Centre|Center|Church|School|Park|Theatre|Theater|Stadium|Arena|Pavilion|House|Court|Lodge|Manor|Castle|Museum|Gallery|Library|Inn|Venue|Building)\b/i) 
                                    ? 'Calculate Distance to Town Center' 
                                    : 'Calculate Mileage'}
                                </Button>
                              )}
                              
                              {/* Generate Map button - only show when both venue name and address are present */}
                              {(watchedVenue && watchedVenue.length > 3) && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    // Trigger map generation by setting a state
                                    setShowMap(true);
                                  }}
                                  className="h-8 px-3 text-xs bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                                >
                                  <MapPin className="w-3 h-3 mr-1" />
                                  Generate Map
                                </Button>
                              )}
                            </div>
                          )}
                          
                          {mileageData.isCalculating && (
                            <div className="mt-2 text-sm text-blue-600 flex items-center gap-2">
                              <MapPin className="w-4 h-4 animate-pulse" />
                              Calculating distance from your business address...
                            </div>
                          )}
                          {mileageData.distance && !mileageData.isCalculating && (
                            <div className="mt-2 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-300 shadow-sm">
                              <div className="flex items-center gap-2 text-sm">
                                <MapPin className="w-5 h-5 text-blue-600" />
                                <span className="font-semibold text-blue-900">
                                  📍 {(mileageData as any).isTownCenter ? 'Distance to Town Center:' : 'Travel Distance Calculated:'}
                                </span>
                              </div>
                              <div className="mt-2 text-lg font-bold text-blue-800">
                                {mileageData.distance}
                              </div>
                              {mileageData.duration && (
                                <div className="text-sm text-blue-700 mt-1">
                                  Estimated travel time: <span className="font-medium">{mileageData.duration}</span>
                                </div>
                              )}
                              <div className="mt-2 text-xs text-blue-600 italic">
                                {(mileageData as any).isTownCenter 
                                  ? 'Approximate distance to town center • Final venue location may vary'
                                  : 'From your business address to venue • Add travel expense in Pricing section if needed'}
                              </div>
                            </div>
                          )}
                          {mileageData.error && (
                            <div className="mt-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-md border border-amber-300">
                              ⚠️ {mileageData.error}
                            </div>
                          )}
                          {/* Debug info - Remove in production */}
                          {!mileageData.distance && !mileageData.isCalculating && !mileageData.error && watchedVenueAddress && (
                            <div className="mt-2 text-xs text-gray-500">
                              💡 Tip: Enter a complete address to calculate travel distance
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Mileage Calculation Display */}
                    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">Travel Information</span>
                      </div>
                      
                      {mileageData.isCalculating && (
                        <div className="flex items-center gap-2 text-blue-600">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          <span className="text-sm">Calculating distance...</span>
                        </div>
                      )}
                      
                      {mileageData.distance && mileageData.duration && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Distance:</span>
                            <span className="font-medium text-blue-800">{mileageData.distance}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Travel time:</span>
                            <span className="font-medium text-blue-800">{mileageData.duration}</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-2">
                            From your business address to venue
                          </div>
                        </div>
                      )}
                      
                      {mileageData.error && (
                        <div className="text-red-600 text-sm">
                          {mileageData.error}
                        </div>
                      )}
                      
                      {!mileageData.isCalculating && !mileageData.distance && !mileageData.error && (
                        <div className="text-gray-500 text-sm">
                          Enter venue address to calculate distance and travel time
                        </div>
                      )}
                    </div>
                    
                    {/* Venue Location Map - Only displayed when manually generated */}
                    {showMap && (watchedVenue || watchedVenueAddress) && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-green-700">
                            📍 Venue Location Map
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowMap(false)}
                            className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                          >
                            ✕
                          </Button>
                        </div>
                        <BookingMap
                          venue={
                            watchedVenueAddress 
                              ? (watchedVenue 
                                  ? `${watchedVenue}, ${watchedVenueAddress}` 
                                  : watchedVenueAddress)
                              : watchedVenue
                          }
                          className=""
                        />
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="venueContactInfo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">Venue Contact</FormLabel>
                            <FormControl>
                              <Input {...field} className="bg-white/70 border-blue-200 focus:border-blue-400 focus:ring-blue-400/20" placeholder="Venue manager contact details" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="parkingInfo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">Parking Information</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Parking instructions for performer" className="bg-white/70 border-blue-200 focus:border-blue-400 focus:ring-blue-400/20" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            )}
            
            {/* Pricing & Commercial - Hide in client mode */}
            {!clientMode && (
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl ring-1 ring-yellow-100">
              <CardHeader className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-t-lg border-b border-yellow-100">
                <CardTitle className="text-xl font-semibold text-yellow-800 flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">3</span>
                  </div>
                  Pricing & Commercial Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Total Fee - Editable primary input */}
                  <FormField
                    control={form.control}
                    name="finalAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Total Fee (£)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number" 
                            step="0.01" 
                            placeholder="0.00" 
                            className="bg-white/70 border-yellow-200 focus:border-yellow-400 focus:ring-yellow-400/20"
                            onChange={(e) => {
                              field.onChange(e);
                              // Calculate performance fee when total fee changes
                              const totalFee = parseFloat(e.target.value) || 0;
                              const travelExpense = parseFloat(form.getValues("travelExpense") || "0") || 0;
                              const performanceFee = totalFee - travelExpense;
                              form.setValue("fee", performanceFee > 0 ? performanceFee.toString() : "0");
                            }}
                          />
                        </FormControl>
                        <FormDescription className="text-xs text-gray-500">
                          Total amount agreed with client (including travel)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="travelExpense"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Travel Expense (£)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number" 
                            step="0.01" 
                            placeholder="0.00" 
                            className="bg-white/70 border-yellow-200 focus:border-yellow-400 focus:ring-yellow-400/20"
                            onChange={(e) => {
                              field.onChange(e);
                              // Recalculate performance fee when travel expense changes
                              const totalFee = parseFloat(form.getValues("finalAmount") || "0") || 0;
                              const travelExpense = parseFloat(e.target.value) || 0;
                              const performanceFee = totalFee - travelExpense;
                              form.setValue("fee", performanceFee > 0 ? performanceFee.toString() : "0");
                            }}
                          />
                        </FormControl>
                        <FormDescription className="text-xs text-gray-500">
                          Fixed travel charge for this booking
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Performance Fee - Calculated display field */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Performance Fee (£)</label>
                    <div className="h-10 px-3 py-2 bg-gray-100 border border-gray-300 rounded-md flex items-center font-semibold text-gray-900">
                      {(() => {
                        const totalFee = parseFloat(form.watch("finalAmount") || "0") || 0;
                        const travelExpense = parseFloat(form.watch("travelExpense") || "0") || 0;
                        const performanceFee = totalFee - travelExpense;
                        return performanceFee > 0 ? performanceFee.toFixed(2) : "0.00";
                      })()}
                    </div>
                    <p className="text-xs text-gray-500">
                      Calculated: Total fee minus travel expenses
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            )}

            {/* Performance Details - Hide in client mode */}
            {!clientMode && (
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl ring-1 ring-green-100">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-lg border-b border-green-100">
                <CardTitle className="text-xl font-semibold text-green-800 flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">4</span>
                  </div>
                  Performance Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name="gigType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gig Type</FormLabel>
                        <div className="space-y-2">
                          <Select 
                            key={`gig-type-${field.value}`} 
                            onValueChange={(value) => {
                              if (value !== 'custom') {
                                field.onChange(value);
                                setShowCustomGigInput(false);
                              } else {
                                setShowCustomGigInput(true);
                              }
                            }} 
                            value={field.value || ''}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select gig type or choose 'Custom' to create your own" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {userGigTypes.filter(gigType => gigType !== 'Other').map((gigType, index) => (
                                <SelectItem key={index} value={gigType}>
                                  {gigType}
                                </SelectItem>
                              ))}
                              <SelectItem value="custom">Custom - Create your own</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          {showCustomGigInput && (
                            <div className="space-y-2">
                              <FormControl>
                                <Input 
                                  placeholder="Type custom gig type (e.g., Burlesque Show, School Assembly)"
                                  value={customGigTypeInput}
                                  onChange={(e) => setCustomGigTypeInput(e.target.value)}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter' && customGigTypeInput.trim()) {
                                      e.preventDefault();
                                      handleAddCustomGigType();
                                    }
                                  }}
                                />
                              </FormControl>
                              {customGigTypeInput.trim() && (
                                <Button 
                                  type="button" 
                                  size="sm" 
                                  onClick={handleAddCustomGigType}
                                  className="w-full"
                                >
                                  Add "{customGigTypeInput}" as custom gig type
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          Select from your gig types or create a custom one that will be saved for future use
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="performanceDuration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Performance Duration</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select performance duration" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="not_specified">Not specified</SelectItem>
                            <SelectItem value="30 minutes">30 minutes</SelectItem>
                            <SelectItem value="45 minutes">45 minutes</SelectItem>
                            <SelectItem value="1 hour">1 hour</SelectItem>
                            <SelectItem value="75 minutes">75 minutes (1 hour 15 mins)</SelectItem>
                            <SelectItem value="90 minutes">90 minutes (1.5 hours)</SelectItem>
                            <SelectItem value="2 hours">2 hours</SelectItem>
                            <SelectItem value="2.5 hours">2.5 hours</SelectItem>
                            <SelectItem value="3 hours">3 hours</SelectItem>
                            <SelectItem value="3.5 hours">3.5 hours</SelectItem>
                            <SelectItem value="4 hours">4 hours</SelectItem>
                            <SelectItem value="2 x 45 min sets">2 x 45 min sets</SelectItem>
                            <SelectItem value="2 x 1 hour sets">2 x 1 hour sets</SelectItem>
                            <SelectItem value="3 x 45 min sets">3 x 45 min sets</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="styles"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Styles Requested</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g. Jazz, Pop, Classical" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="equipmentRequirements"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Equipment Requirements</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={2} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="specialRequirements"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Special Requirements</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={2} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
            )}

            {/* Event Requirements & Notes - Hide in client mode */}
            {!clientMode && (
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl ring-1 ring-orange-100">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-t-lg border-b border-orange-100">
                <CardTitle className="text-xl font-semibold text-orange-800 flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-amber-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">5</span>
                  </div>
                  Event Requirements & Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Service & Appearance Details */}
                <div>
                  <h3 className="text-md font-semibold text-orange-700 mb-3 border-b border-orange-100 pb-1">
                    Service & Appearance
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="dressCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">Dress Code</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., formal, casual, themed" className="bg-white/70 border-orange-200 focus:border-orange-400 focus:ring-orange-400/20" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                {/* Notes & Special Requirements */}
                <div>
                  <h3 className="text-md font-semibold text-orange-700 mb-3 border-b border-orange-100 pb-1">
                    Additional Notes
                  </h3>
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">General Notes & Special Requirements</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} placeholder="Any other important details, special requests, or requirements..." className="bg-white/70 border-orange-200 focus:border-orange-400 focus:ring-orange-400/20" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
            )}

            {/* Collaborative Planning Section */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl ring-1 ring-purple-100">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-lg border-b border-purple-100">
                <CardTitle className="text-xl font-semibold text-purple-800 flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">6</span>
                  </div>
                  Collaborative Planning (Client Will Complete)
                </CardTitle>
                <p className="text-purple-600 mt-2 text-sm">
                  These fields will be shared with the client for collaborative completion after contract signing
                </p>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                
                {/* Technical Details */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-purple-700 border-b border-purple-200 pb-2">
                    Technical Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="venueContact"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center">
                            Venue On-Day Contact
                            {isEditMode && editingBooking && (
                              <IndividualFieldLock
                                bookingId={editingBooking.id}
                                fieldName="venueContact"
                                initialLock={editingBooking.fieldLocks?.venueContact}
                              />
                            )}
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Phone number for event day" className="bg-purple-50/30 border-purple-200" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="soundTechContact"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center">
                            Sound Tech Contact
                            {isEditMode && editingBooking && (
                              <IndividualFieldLock
                                bookingId={editingBooking.id}
                                fieldName="soundTechContact"
                                initialLock={editingBooking.fieldLocks?.soundTechContact}
                              />
                            )}
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Sound engineer contact" className="bg-purple-50/30 border-purple-200" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="stageSize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center">
                            Stage/Performance Area Size
                            {isEditMode && editingBooking && (
                              <IndividualFieldLock
                                bookingId={editingBooking.id}
                                fieldName="stageSize"
                                initialLock={editingBooking.fieldLocks?.stageSize}
                              />
                            )}
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger className="bg-purple-50/30 border-purple-200">
                                <SelectValue placeholder="Select stage size" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="small">Small (up to 3x3m)</SelectItem>
                              <SelectItem value="medium">Medium (3x3m to 5x5m)</SelectItem>
                              <SelectItem value="large">Large (5x5m+)</SelectItem>
                              <SelectItem value="no-stage">No designated stage</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="soundCheckTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center">
                            Preferred Sound Check Time
                            {isEditMode && editingBooking && (
                              <IndividualFieldLock
                                bookingId={editingBooking.id}
                                fieldName="soundCheckTime"
                                initialLock={editingBooking.fieldLocks?.soundCheckTime}
                              />
                            )}
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., 2 hours before event" className="bg-purple-50/30 border-purple-200" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="powerEquipment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center">
                          Power & Equipment Availability
                          {isEditMode && editingBooking && (
                            <IndividualFieldLock
                              bookingId={editingBooking.id}
                              fieldName="powerEquipment"
                              initialLock={editingBooking.fieldLocks?.powerEquipment}
                            />
                          )}
                        </FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={2} placeholder="Number of sockets, voltage, any noise limiter restrictions..." className="bg-purple-50/30 border-purple-200" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Music Preferences */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-purple-700 border-b border-purple-200 pb-2">
                    Music Preferences
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="styleMood"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center">
                            Style/Mood Preference
                            {isEditMode && editingBooking && (
                              <IndividualFieldLock
                                bookingId={editingBooking.id}
                                fieldName="styleMood"
                                initialLock={editingBooking.fieldLocks?.styleMood}
                              />
                            )}
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger className="bg-purple-50/30 border-purple-200">
                                <SelectValue placeholder="Select music style" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="upbeat">🎉 Upbeat & Energetic</SelectItem>
                              <SelectItem value="jazzy">🎷 Jazz & Swing</SelectItem>
                              <SelectItem value="romantic">💕 Romantic & Intimate</SelectItem>
                              <SelectItem value="background">🎵 Background/Ambient</SelectItem>
                              <SelectItem value="mixed">🎭 Mixed Styles</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="setOrder"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Set Order Preferences</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger className="bg-purple-50/30 border-purple-200">
                                <SelectValue placeholder="Preferred energy flow" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="upbeat-first">⚡ Start upbeat, slow later</SelectItem>
                              <SelectItem value="slow-first">🌅 Start slow, build energy</SelectItem>
                              <SelectItem value="mixed">🎪 Mixed throughout</SelectItem>
                              <SelectItem value="no-preference">🤷 No preference</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="mustPlaySongs"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Must-Play Songs (up to 6)</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={3} placeholder="List your favourite songs you'd love to hear (artist - song title)" className="bg-purple-50/30 border-purple-200" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="avoidSongs"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Songs to Avoid</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={3} placeholder="Any songs or genres you'd prefer we don't play" className="bg-purple-50/30 border-purple-200" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Special Moments (for weddings) */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-purple-700 border-b border-purple-200 pb-2">
                    Special Moments (Wedding Events)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstDanceSong"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Dance Song</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Artist - Song Title" className="bg-purple-50/30 border-purple-200" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="processionalSong"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Processional Music</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Walking down the aisle" className="bg-purple-50/30 border-purple-200" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="signingRegisterSong"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Register Signing Music</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Background music for signing" className="bg-purple-50/30 border-purple-200" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="recessionalSong"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recessional Music</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Walking back up the aisle" className="bg-purple-50/30 border-purple-200" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Logistics */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-purple-700 border-b border-purple-200 pb-2">
                    Logistics & Extras
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="loadInInfo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Load-in Instructions</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={2} placeholder="How to access performance area, best entrance to use..." className="bg-purple-50/30 border-purple-200" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="weatherContingency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Weather Contingency Plan</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={2} placeholder="Backup plan for outdoor events" className="bg-purple-50/30 border-purple-200" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="dietaryRequirements"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dietary Requirements</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="If meal provided, any dietary needs" className="bg-purple-50/30 border-purple-200" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="referenceTracks"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reference Tracks/Examples</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="YouTube links or song examples of desired style" className="bg-purple-50/30 border-purple-200" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="sharedNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shared Planning Notes</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} placeholder="Any other details, special requests, or important information..." className="bg-purple-50/30 border-purple-200" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Document Management - Only show in edit mode */}
            {isEditMode && editBookingId && (
              <BookingDocuments bookingId={parseInt(editBookingId)} />
            )}

            {/* Enhanced Action Buttons */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary via-yellow-500 to-blue-600 rounded-2xl opacity-5"></div>
              <div className="relative bg-white/80 backdrop-blur-sm border border-primary/10 rounded-2xl p-6 shadow-lg">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    Ready to create your booking?
                  </div>
                  <div className="flex gap-4">
                    <Link href="/bookings">
                      <Button variant="outline" className="bg-white/50 hover:bg-white/80 border-gray-300">
                        Cancel
                      </Button>
                    </Link>
                    <Button 
                      type="submit" 
                      className="bg-primary hover:bg-primary/90 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                      disabled={createBookingMutation.isPending || updateBookingMutation.isPending}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {(createBookingMutation.isPending || updateBookingMutation.isPending) ? (
                        <>
                          <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full mr-2"></div>
                          {isEditMode ? "Updating..." : "Creating..."}
                        </>
                      ) : (
                        isEditMode ? "Update Booking" : "Create Booking"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </Form>
        
        </div>
      </div>
    </div>
  );
}