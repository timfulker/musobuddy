import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Calendar, ArrowLeft, Save, Crown } from "lucide-react";
import { Link, useLocation } from "wouter";
import { insertBookingSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { COMMON_GIG_TYPES } from "@shared/gig-types";
import { useGigTypes } from "@/hooks/useGigTypes";
import { z } from "zod";
import AddressAutocomplete from "@/components/AddressAutocomplete";

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
});

type FullBookingFormData = z.infer<typeof fullBookingSchema>;

export default function NewBookingPage() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { gigTypes } = useGigTypes();
  
  // Get existing bookings for enquiry auto-fill
  const { data: bookings = [] } = useQuery({
    queryKey: ['/api/bookings'],
  });
  
  const bookingsArray = Array.isArray(bookings) ? bookings : [];

  // Fetch user's personalized gig types from settings
  const { data: userSettings } = useQuery({
    queryKey: ['settings']
  });

  // Extract gig types from user settings
  const userGigTypes = userSettings && Array.isArray((userSettings as any).gigTypes) ? (userSettings as any).gigTypes : [];

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

  const onSubmit = (data: FullBookingFormData) => {
    createBookingMutation.mutate(data);
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
                  <Button variant="outline" size="sm" className="bg-primary hover:bg-primary/90 border-primary text-white hover:text-white">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Bookings
                  </Button>
                </Link>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] bg-clip-text text-transparent">
                    New Booking
                  </h1>
                  <p className="text-gray-600 mt-1">Create a new performance booking</p>
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
                <CardTitle className="text-xl font-semibold text-primary-800 flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-primary/50 to-primary-500 rounded-lg flex items-center justify-center">
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
                                field.onChange(addressData.placeName || addressData.address);
                                // Auto-populate the venue address field
                                form.setValue('venueAddress', addressData.address);
                                console.log('📍 Venue coordinates:', addressData.lat, addressData.lng);
                              }}
                              placeholder="Start typing venue name... (e.g., Royal Albert Hall)"
                              defaultValue={field.value}
                              className="bg-white/70 border-blue-200 focus:border-blue-400 focus:ring-blue-400/20"
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
                            <Textarea {...field} rows={2} className="bg-white/70 border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 resize-none" placeholder="Auto-populated from venue name above" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
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
                        <FormControl>
                          <Input {...field} placeholder="e.g. 2 hours" />
                        </FormControl>
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
                          <FormLabel>Venue On-Day Contact</FormLabel>
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
                          <FormLabel>Sound Tech Contact</FormLabel>
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
                          <FormLabel>Stage/Performance Area Size</FormLabel>
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
                          <FormLabel>Preferred Sound Check Time</FormLabel>
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
                        <FormLabel>Power & Equipment Availability</FormLabel>
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
                          <FormLabel>Style/Mood Preference</FormLabel>
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
                      disabled={createBookingMutation.isPending}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {createBookingMutation.isPending ? (
                        <>
                          <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full mr-2"></div>
                          Creating...
                        </>
                      ) : (
                        "Create Booking"
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
  );
}