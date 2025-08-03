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
          <div className="absolute inset-0 bg-theme-gradient-subtle rounded-2xl"></div>
          <div className="relative bg-white/80 backdrop-blur-sm border border-primary/10 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <Link href="/bookings">
                  <Button variant="outline" size="sm" className="bg-white/50 hover:bg-white/80 border-primary-200 text-primary/90 hover:text-primary-800">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Bookings
                  </Button>
                </Link>
                <div>
                  <h1 className="text-4xl font-bold text-theme-gradient">
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
            {/* Client Information */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl ring-1 ring-primary/10">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-primary-50 rounded-t-lg border-b border-primary/10">
                <CardTitle className="text-xl font-semibold text-primary-800 flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-primary/50 to-primary-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">1</span>
                  </div>
                  Client Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        <FormLabel className="text-sm font-medium text-gray-700">Contact Person</FormLabel>
                        <FormControl>
                          <Input {...field} className="bg-white/70 border-primary-200 focus:border-primary-400 focus:ring-purple-400/20" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="clientAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Client Address</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={2} className="bg-white/70 border-primary-200 focus:border-primary-400 focus:ring-purple-400/20 resize-none" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Event Details */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl ring-1 ring-blue-100">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-t-lg border-b border-blue-100">
                <CardTitle className="text-xl font-semibold text-blue-800 flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">2</span>
                  </div>
                  Event Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="venue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Venue *</FormLabel>
                        <FormControl>
                          <Input {...field} className="bg-white/70 border-blue-200 focus:border-blue-400 focus:ring-blue-400/20" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="fee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Performance Fee (£)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="0.01" className="bg-white/70 border-blue-200 focus:border-blue-400 focus:ring-blue-400/20" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="travelExpense"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Travel Expense (£)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="0.01" placeholder="0.00" className="bg-white/70 border-blue-200 focus:border-blue-400 focus:ring-blue-400/20" />
                        </FormControl>
                        <FormDescription className="text-xs text-gray-500">
                          Fixed travel charge for this booking (optional)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="venueAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Venue Address</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={2} className="bg-white/70 border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 resize-none" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Performance Details */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl ring-1 ring-green-100">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-lg border-b border-green-100">
                <CardTitle className="text-xl font-semibold text-green-800 flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">3</span>
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

            {/* Additional Details */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl ring-1 ring-orange-100">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-t-lg border-b border-orange-100">
                <CardTitle className="text-xl font-semibold text-orange-800 flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-amber-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">4</span>
                  </div>
                  Additional Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="dressCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dress Code</FormLabel>
                        <FormControl>
                          <Input {...field} />
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
                        <FormLabel>Parking Information</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Enhanced Action Buttons */}
            <div className="relative">
              <div className="absolute inset-0 bg-theme-gradient-subtle rounded-2xl"></div>
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
                      className="bg-theme-gradient hover:opacity-90 text-white shadow-lg hover:shadow-xl transition-all duration-200"
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