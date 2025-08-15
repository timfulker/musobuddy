import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Calendar, ArrowLeft, Save, Crown, MapPin, Paperclip, Eye, Download, Upload } from "lucide-react";
import { Link, useLocation } from "wouter";
import { insertBookingSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { COMMON_GIG_TYPES } from "@shared/gig-types";
import { useGigTypes } from "@/hooks/useGigTypes";
import { z } from "zod";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import { What3WordsInput } from "@/components/What3WordsInput";
import BookingDocumentsManager from "@/components/booking-documents-manager";
import IndividualFieldLock from "@/components/individual-field-lock";

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
  eventType: z.string().optional(),
  gigType: z.string().optional(),
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
});

type FullBookingFormData = z.infer<typeof fullBookingSchema>;

export default function NewBookingPage() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { gigTypes } = useGigTypes();
  
  // Check if we're editing an existing booking
  const urlParams = new URLSearchParams(window.location.search);
  const editBookingId = urlParams.get('edit');
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
  
  // Document management dialog state
  const [documentsManagerOpen, setDocumentsManagerOpen] = useState(false);
  
  // Get existing bookings for enquiry auto-fill
  const { data: bookings = [] } = useQuery({
    queryKey: ['/api/bookings'],
  });
  
  // Get documents for the booking being edited
  const { data: documentsResponse, isLoading: documentsLoading } = useQuery({
    queryKey: [`/api/bookings/${editBookingId}/documents`],
    enabled: isEditMode && !!editBookingId,
    retry: false,
  });
  
  const bookingDocuments = documentsResponse?.documents || [];
  
  // Fetch specific booking if in edit mode
  const { data: editingBooking, isLoading: isLoadingBooking } = useQuery({
    queryKey: ['/api/bookings', editBookingId],
    queryFn: async () => {
      if (!editBookingId) return null;
      const allBookings = await apiRequest('/api/bookings');
      const bookingsData = await allBookings.json();
      return bookingsData.find((b: any) => b.id === parseInt(editBookingId));
    },
    enabled: isEditMode
  });
  
  const bookingsArray = Array.isArray(bookings) ? bookings : [];

  // Fetch user's personalized gig types from settings
  const { data: userSettings } = useQuery({
    queryKey: ['/api/settings']
  });

  // Extract gig types from user settings
  const userGigTypes = userSettings && Array.isArray((userSettings as any).gigTypes) ? (userSettings as any).gigTypes : [];

  // Calculate mileage between user's business address and venue
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
      eventType: "",
      gigType: "",
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
    },
  });

  // Watch venue address changes to calculate mileage
  const watchedVenueAddress = form.watch('venueAddress');
  useEffect(() => {
    console.log('🚗 Venue address changed:', watchedVenueAddress);
    console.log('🚗 User settings:', userSettings);
    
    if (watchedVenueAddress && watchedVenueAddress.length > 10) {
      // Debounce the calculation to avoid too many API calls
      const timeoutId = setTimeout(() => {
        console.log('🚗 Triggering mileage calculation...');
        calculateMileage(watchedVenueAddress);
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    } else {
      // Clear mileage data when address is too short
      console.log('🚗 Clearing mileage data - address too short');
      setMileageData({
        distance: null,
        distanceValue: null,
        duration: null,
        isCalculating: false,
        error: null
      });
    }
  }, [watchedVenueAddress, userSettings]);

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
        fee: editingBooking.fee ? editingBooking.fee.toString() : '',
        eventType: editingBooking.eventType || '',
        gigType: editingBooking.gigType || '',
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
        travelExpense: editingBooking.travelExpense ? editingBooking.travelExpense.toString() : '',
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
      
      console.log('✅ Form populated with booking data');
    }
  }, [editingBooking, isEditMode, form]);

  const createBookingMutation = useMutation({
    mutationFn: async (data: FullBookingFormData) => {
      const bookingData = {
        title: `${data.eventType || 'Event'} - ${data.clientName}`,
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
        eventType: data.eventType || null,
        gigType: data.gigType || null,
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
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Booking has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      navigate('/bookings');
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
        eventType: data.eventType || null,
        gigType: data.gigType || null,
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
      };
      
      const response = await apiRequest(`/api/bookings/${editBookingId}`, {
        method: 'PATCH',
        body: JSON.stringify(bookingData),
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Booking updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      navigate('/bookings');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update booking",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FullBookingFormData) => {
    if (isEditMode) {
      updateBookingMutation.mutate(data);
    } else {
      createBookingMutation.mutate(data);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary/5">
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8">
        {/* Enhanced Header */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-yellow-500 to-blue-600 rounded-2xl opacity-5"></div>
          <div className="relative bg-white/80 backdrop-blur-sm border border-primary/10 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <Link href="/bookings">
                  <Button variant="outline" size="sm" className="bg-primary hover:bg-primary/90 border-primary text-primary-foreground hover:text-primary-foreground font-medium">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Bookings
                  </Button>
                </Link>
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
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Client & Contact Information */}
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

            {/* Event Date & Venue */}
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
                          <FormLabel className="text-sm font-medium text-gray-700">Venue Name *</FormLabel>
                          <FormControl>
                            <AddressAutocomplete
                              onSelect={(addressData) => {
                                console.log('📍 Raw address data received:', addressData);
                                
                                // Set venue name to the display name from Places API
                                const venueName = addressData.address;
                                field.onChange(venueName);
                                
                                // Auto-populate the venue address field with the formatted address
                                if (addressData.formattedAddress) {
                                  form.setValue('venueAddress', addressData.formattedAddress);
                                  console.log('✅ Auto-populated venue address:', addressData.formattedAddress);
                                  
                                  // Calculate mileage when venue address is set
                                  calculateMileage(addressData.formattedAddress);
                                }

                                // Auto-populate venue contact information if available
                                if (addressData.contactInfo?.phoneNumber) {
                                  form.setValue('venueContactInfo', addressData.contactInfo.phoneNumber);
                                  console.log('✅ Auto-populated venue phone:', addressData.contactInfo.phoneNumber);
                                }

                                // Show business info in console for now (could be displayed in UI later)
                                if (addressData.businessInfo) {
                                  console.log('📍 Venue business info:', {
                                    rating: addressData.businessInfo.rating,
                                    hours: addressData.businessInfo.openingHours,
                                    website: addressData.contactInfo?.website
                                  });
                                }
                              }}
                              placeholder="Start typing venue name... (e.g., Royal Albert Hall)"
                              defaultValue={field.value}
                              className="bg-white/70 border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 w-full min-w-0"
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
                                <span className="font-semibold text-blue-900">📍 Travel Distance Calculated:</span>
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
                                From your business address to venue • Add travel expense in Pricing section if needed
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
            
            {/* Pricing & Commercial */}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="fee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Performance Fee (£)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="0.01" className="bg-white/70 border-yellow-200 focus:border-yellow-400 focus:ring-yellow-400/20" />
                        </FormControl>
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
                          <Input {...field} type="number" step="0.01" placeholder="0.00" className="bg-white/70 border-yellow-200 focus:border-yellow-400 focus:ring-yellow-400/20" />
                        </FormControl>
                        <FormDescription className="text-xs text-gray-500">
                          Fixed travel charge for this booking (optional)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Performance Details */}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="eventType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Event Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select event type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="wedding">Wedding</SelectItem>
                            <SelectItem value="corporate">Corporate Event</SelectItem>
                            <SelectItem value="private_party">Private Party</SelectItem>
                            <SelectItem value="pub_gig">Pub Gig</SelectItem>
                            <SelectItem value="restaurant">Restaurant</SelectItem>
                            <SelectItem value="festival">Festival</SelectItem>
                            <SelectItem value="charity">Charity Event</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="gigType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gig Type</FormLabel>
                        <div className="space-y-2">
                          <Select onValueChange={(value) => {
                            if (value !== 'custom') {
                              field.onChange(value);
                            }
                          }} value={gigTypes.includes(field.value as any) ? field.value : 'custom'}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select gig type or choose 'Custom' to type your own" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {gigTypes.filter(gigType => gigType !== 'Other').map((gigType, index) => (
                                <SelectItem key={index} value={gigType}>
                                  {gigType}
                                </SelectItem>
                              ))}
                              <SelectItem value="custom">Custom - Type your own</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          {(!gigTypes.includes(field.value as any) || field.value === '') && (
                            <FormControl>
                              <Input 
                                placeholder="Type custom gig type (e.g., Burlesque Show, Masonic Lodge, School Assembly)"
                                value={gigTypes.includes(field.value as any) ? '' : field.value}
                                onChange={(e) => field.onChange(e.target.value)}
                              />
                            </FormControl>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          Select from common types or enter your own custom gig type
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

            {/* Event Requirements & Notes */}
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
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
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


            {/* Document Management Section - Always show for existing bookings */}
            {editingBooking && (
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl ring-1 ring-primary/10">
                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-lg border-b border-green-100">
                  <CardTitle className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                      <Paperclip className="w-4 h-4 text-white" />
                    </div>
                    Documents
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {documentsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full"></div>
                      <span className="ml-2 text-gray-600">Loading documents...</span>
                    </div>
                  ) : bookingDocuments.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">
                          {bookingDocuments.length} document{bookingDocuments.length !== 1 ? 's' : ''} uploaded
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setDocumentsManagerOpen(true)}
                          className="bg-white hover:bg-green-50"
                        >
                          <Upload className="w-4 h-4 mr-1" />
                          Manage Documents
                        </Button>
                      </div>
                      
                      {bookingDocuments.slice(0, 3).map((doc: any) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                              <Paperclip className="w-4 h-4 text-green-600" />
                            </div>
                            <div>
                              <p className="font-medium text-green-800 text-sm">
                                {doc.documentName}
                              </p>
                              <div className="flex items-center gap-2">
                                <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded">
                                  {doc.documentType.charAt(0).toUpperCase() + doc.documentType.slice(1)}
                                </span>
                                <span className="text-xs text-green-600">
                                  {new Date(doc.uploadedAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(doc.documentUrl, '_blank')}
                              className="h-8 w-8 p-0"
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = doc.documentUrl;
                                link.download = doc.documentName;
                                link.click();
                              }}
                              className="h-8 w-8 p-0"
                            >
                              <Download className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      
                      {bookingDocuments.length > 3 && (
                        <p className="text-sm text-gray-500 text-center">
                          and {bookingDocuments.length - 3} more... 
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            onClick={() => setDocumentsManagerOpen(true)}
                            className="h-auto p-0 ml-1"
                          >
                            View all
                          </Button>
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                      <Paperclip className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 mb-2">No documents uploaded yet</p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setDocumentsManagerOpen(true)}
                        className="bg-white hover:bg-gray-100"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Documents
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
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
        
        {/* Documents Manager Dialog */}
        {editingBooking && (
          <BookingDocumentsManager
            booking={editingBooking}
            isOpen={documentsManagerOpen}
            onClose={() => setDocumentsManagerOpen(false)}
          />
        )}
      </div>
    </div>
  );
}