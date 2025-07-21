import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Info, Plus, X, Edit3, Calendar, Clock, MapPin, User, Phone, Mail, Music, Upload, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Booking } from "@shared/schema";

const bookingDetailsSchema = z.object({
  clientName: z.string().min(1, "Client name is required"),
  eventDate: z.string().min(1, "Event date is required"),
  eventTime: z.string().optional(),
  eventEndTime: z.string().optional(),
  venue: z.string().optional(),
  fee: z.string().optional(),
  clientEmail: z.string().email().optional().or(z.literal("")),
  clientPhone: z.string().optional(),
  clientAddress: z.string().optional(),
  venueAddress: z.string().optional(),
  eventType: z.string().optional(),
  gigType: z.string().optional(),
  equipmentRequirements: z.string().optional(),
  specialRequirements: z.string().optional(),
  setupTime: z.string().optional(),
  soundCheckTime: z.string().optional(),
  packupTime: z.string().optional(),
  travelTime: z.string().optional(),
  parkingInfo: z.string().optional(),
  contactPerson: z.string().optional(),
  contactPhone: z.string().optional(),
  venueContactInfo: z.string().optional(),
  dressCode: z.string().optional(),
  repertoire: z.string().optional(),
  notes: z.string().optional(),
});

interface BookingDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: Booking | null;
  onBookingUpdate?: () => void;
}

export function BookingDetailsDialog({ open, onOpenChange, booking, onBookingUpdate }: BookingDetailsDialogProps) {
  const [customFields, setCustomFields] = useState<Array<{id: string, name: string, value: string}>>([]);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldValue, setNewFieldValue] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [initialData, setInitialData] = useState<any>(null);
  const [uploadStatus, setUploadStatus] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [isParsingContract, setIsParsingContract] = useState(false);
  const [parseResult, setParseResult] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Convert time from "8pm" format to "20:00" format
  const convertTimeFormat = (timeStr: string): string => {
    if (!timeStr) return '';
    
    // Already in 24-hour format
    if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
      return timeStr;
    }
    
    // Convert from 12-hour format like "8pm", "11pm", "2:30pm", etc.
    const match = timeStr.toLowerCase().match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/);
    if (match) {
      let hour = parseInt(match[1]);
      const minute = match[2] || '00';
      const period = match[3];
      
      if (period === 'pm' && hour !== 12) {
        hour += 12;
      } else if (period === 'am' && hour === 12) {
        hour = 0;
      }
      
      return `${hour.toString().padStart(2, '0')}:${minute}`;
    }
    
    return timeStr; // Return original if can't parse
  };

  // Fetch user's personalized gig types from settings
  const { data: userSettings } = useQuery({
    queryKey: ['settings'],
    enabled: open // Only fetch when dialog is open
  });

  // Fetch contracts for this booking to enable copying data
  const { data: contracts } = useQuery({
    queryKey: ['/api/contracts'],
    enabled: open && booking !== null
  });

  // Find the most recent contract for this booking
  const bookingContract = contracts ? contracts.find((contract: any) => 
    contract.enquiryId === booking?.id
  ) : null;

  // Extract gig types from user settings
  const userGigTypes = userSettings && userSettings.gigTypes ? userSettings.gigTypes : [];

  const form = useForm<z.infer<typeof bookingDetailsSchema>>({
    resolver: zodResolver(bookingDetailsSchema),
    defaultValues: {
      clientName: "",
      eventDate: "",
      eventTime: "",
      eventEndTime: "",
      venue: "",
      fee: "",
      clientEmail: "",
      clientPhone: "",
      clientAddress: "",
      eventType: "",
      gigType: "",
      equipmentRequirements: "",
      specialRequirements: "",
      setupTime: "",
      soundCheckTime: "",
      packupTime: "",
      travelTime: "",
      parkingInfo: "",
      contactPerson: "",
      contactPhone: "",
      venueAddress: "",
      venueContactInfo: "",
      dressCode: "",
      repertoire: "",
      notes: "",
    },
  });

  // Initialize form when booking changes
  useEffect(() => {
    if (booking) {
      const bookingData = {
        clientName: booking.clientName || "",
        eventDate: booking.eventDate ? new Date(booking.eventDate).toISOString().split('T')[0] : "",
        eventTime: booking.eventTime || "",
        eventEndTime: booking.eventEndTime || "",
        venue: booking.venue || "",
        fee: booking.fee || "",
        clientEmail: booking.clientEmail || "",
        clientPhone: booking.clientPhone || "",
        clientAddress: booking.clientAddress || "",
        eventType: booking.eventType || "",
        gigType: booking.gigType || "",
        equipmentRequirements: booking.equipmentRequirements || "",
        specialRequirements: booking.specialRequirements || "",
        setupTime: "",
        soundCheckTime: "",
        packupTime: "",
        travelTime: "",
        parkingInfo: "",
        contactPerson: "",
        contactPhone: "",
        venueAddress: booking.venueAddress || "",
        venueContactInfo: "",
        dressCode: "",
        repertoire: "",
        notes: booking.notes || "",
      };
      
      form.reset(bookingData);
      setInitialData(bookingData);
      setHasChanges(false);
      
      // Initialize custom fields - customFields doesn't exist in schema yet
      setCustomFields([]);
    }
  }, [booking, form]);

  // Watch for form changes
  useEffect(() => {
    if (initialData) {
      const subscription = form.watch(() => {
        setHasChanges(true);
      });
      return () => subscription.unsubscribe();
    }
  }, [form, initialData]);

  const updateBookingMutation = useMutation({
    mutationFn: async (data: any) => {
      // Sanitize data before sending - convert empty strings to null for numeric fields
      const sanitizedData = { ...data };
      const numericFields = ['fee', 'deposit', 'setupTime', 'soundCheckTime', 'packupTime', 'travelTime'];
      numericFields.forEach(field => {
        if (sanitizedData[field] === '' || sanitizedData[field] === undefined) {
          sanitizedData[field] = null;
        }
      });

      const response = await fetch(`/api/bookings/${booking?.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify(sanitizedData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update booking');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] }); // Phase 3: Use main bookings table
      queryClient.invalidateQueries({ queryKey: ['/api/enquiries'] }); // Keep for backwards compatibility
      toast({
        title: "Success",
        description: "Booking details updated successfully",
      });
      setHasChanges(false);
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Error updating booking:', error);
      toast({
        title: "Error",
        description: "Failed to update booking details",
        variant: "destructive",
      });
    },
  });



  // Function to copy contract data to booking form
  const handleCopyFromContract = (contract?: any) => {
    // Use provided contract or find the latest one
    const contractToUse = contract || bookingContract;
    
    console.log('🔄 handleCopyFromContract called with:', contractToUse);
    
    if (!contractToUse) {
      console.log('❌ No contract found to copy from');
      toast({
        title: "No Contract Found",
        description: "No contract found for this booking to copy data from.",
        variant: "destructive",
      });
      return;
    }

    const currentFormData = form.getValues();
    console.log('📋 Current form data:', currentFormData);
    let fieldsUpdated = 0;
    
    // Define protected fields that should never be overwritten by contract imports
    const protectedFields = ['clientName', 'eventDate'];
    const isFieldProtected = (fieldName: string) => {
      return protectedFields.includes(fieldName) && (currentFormData as any)[fieldName]?.trim?.() !== '';
    };

    const updatedFormData = {
      ...currentFormData,
      // Protected fields: Never overwrite client name and event date if they exist
      ...(contractToUse.clientName && !isFieldProtected('clientName') && !currentFormData.clientName.trim() && { 
        clientName: contractToUse.clientName 
      }),
      ...(contractToUse.eventDate && !isFieldProtected('eventDate') && !currentFormData.eventDate && { 
        eventDate: new Date(contractToUse.eventDate).toISOString().split('T')[0] 
      }),
      // Regular fields: Only update if empty
      ...(contractToUse.clientEmail && !currentFormData.clientEmail?.trim() && { clientEmail: contractToUse.clientEmail }),
      ...(contractToUse.clientPhone && !currentFormData.clientPhone?.trim() && { clientPhone: contractToUse.clientPhone }),
      ...(contractToUse.clientAddress && !currentFormData.clientAddress?.trim() && { clientAddress: contractToUse.clientAddress }),
      ...(contractToUse.venue && !currentFormData.venue?.trim() && { venue: contractToUse.venue }),
      ...(contractToUse.venueAddress && !currentFormData.venueAddress?.trim() && { venueAddress: contractToUse.venueAddress }),
      ...(contractToUse.eventTime && !currentFormData.eventTime?.trim() && { 
        eventTime: convertTimeFormat(contractToUse.eventTime) 
      }),
      ...(contractToUse.eventEndTime && !currentFormData.eventEndTime?.trim() && { 
        eventEndTime: convertTimeFormat(contractToUse.eventEndTime) 
      }),
      ...(contractToUse.fee && (!currentFormData.fee || currentFormData.fee === '0') && { fee: contractToUse.fee.toString() }),
      ...(contractToUse.equipmentRequirements && !currentFormData.equipmentRequirements?.trim() && { 
        equipmentRequirements: contractToUse.equipmentRequirements 
      }),
      ...(contractToUse.specialRequirements && !currentFormData.specialRequirements?.trim() && { 
        specialRequirements: contractToUse.specialRequirements 
      }),
    };

    // Count how many fields were actually updated and track protected fields
    let protectedFieldsSkipped = 0;
    Object.keys(updatedFormData).forEach(key => {
      if ((updatedFormData as any)[key] !== (currentFormData as any)[key]) {
        fieldsUpdated++;
      }
      if (isFieldProtected(key) && (contractToUse as any)[key] && (contractToUse as any)[key] !== (currentFormData as any)[key]) {
        protectedFieldsSkipped++;
      }
    });

    if (fieldsUpdated > 0) {
      form.reset(updatedFormData);
      setHasChanges(true);
      
      const protectedMessage = protectedFieldsSkipped > 0 
        ? ` Protected fields (${protectedFields.join(', ')}) were preserved.`
        : '';
      
      toast({
        title: "Contract Data Copied",
        description: `${fieldsUpdated} field${fieldsUpdated > 1 ? 's' : ''} updated from contract.${protectedMessage}`,
      });
    } else {
      const allProtectedMessage = protectedFieldsSkipped > 0
        ? ` Protected fields (${protectedFields.join(', ')}) were preserved.`
        : '';
      
      toast({
        title: "No Updates Needed",
        description: `All relevant fields already contain data.${allProtectedMessage}`,
      });
    }

    // Automatically update booking status to "confirmed" when contract is imported
    // Check if the imported contract is signed (has signature or signedAt date)
    const contractIsSigned = contractToUse.signedAt || contractToUse.signature;
    
    if (booking && contractIsSigned && booking.status !== 'confirmed' && booking.status !== 'completed') {
      // Update booking status asynchronously
      fetch(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'confirmed' })
      }).then(() => {
        // Refresh the data to show updated status
        if (onBookingUpdate) onBookingUpdate();
        
        toast({
          title: "Status Updated",
          description: "Booking status automatically updated to 'Confirmed' because the imported contract is signed.",
        });
      }).catch((error) => {
        console.error('Failed to update booking status:', error);
      });
    } else if (booking && !contractIsSigned && booking.status === 'confirmed') {
      // If importing an unsigned contract to a confirmed booking, suggest updating to contract_sent
      toast({
        title: "Contract Imported",
        description: "Unsigned contract imported. Consider updating status to 'Contract Sent' if this reflects the current state.",
      });
    }
  };

  const addCustomField = () => {
    if (newFieldName.trim() && newFieldValue.trim()) {
      const newField = {
        id: Date.now().toString(),
        name: newFieldName.trim(),
        value: newFieldValue.trim(),
      };
      setCustomFields([...customFields, newField]);
      setNewFieldName("");
      setNewFieldValue("");
      setHasChanges(true);
    }
  };

  const removeCustomField = (id: string) => {
    setCustomFields(customFields.filter(field => field.id !== id));
    setHasChanges(true);
  };

  const handleCancel = () => {
    form.reset(initialData);
    setHasChanges(false);
    onOpenChange(false);
  };

  const handleParseContract = async () => {
    if (!contractFile || !booking) return;
    
    setIsParsingContract(true);
    
    try {
      const formData = new FormData();
      formData.append('file', contractFile);
      
      const response = await fetch('/api/contracts/parse-pdf', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to parse contract');
      }
      
      const result = await response.json();
      const extractedData = result.data;
      
      // Only update empty fields to preserve existing data
      const currentData = form.getValues();
      let fieldsUpdated = 0;
      const updates: any = {};
      
      // Map extracted data to form fields (only if current field is empty)
      if (extractedData.clientName && !currentData.clientName?.trim()) {
        updates.clientName = extractedData.clientName;
        fieldsUpdated++;
      }
      if (extractedData.clientEmail && !currentData.clientEmail?.trim()) {
        updates.clientEmail = extractedData.clientEmail;
        fieldsUpdated++;
      }
      if (extractedData.clientPhone && !currentData.clientPhone?.trim()) {
        updates.clientPhone = extractedData.clientPhone;
        fieldsUpdated++;
      }
      if (extractedData.clientAddress && !currentData.clientAddress?.trim()) {
        updates.clientAddress = extractedData.clientAddress;
        fieldsUpdated++;
      }
      if (extractedData.venue && !currentData.venue?.trim()) {
        updates.venue = extractedData.venue;
        fieldsUpdated++;
      }
      if (extractedData.venueAddress && !currentData.venueAddress?.trim()) {
        updates.venueAddress = extractedData.venueAddress;
        fieldsUpdated++;
      }
      if (extractedData.eventDate && !currentData.eventDate) {
        updates.eventDate = extractedData.eventDate;
        fieldsUpdated++;
      }
      if (extractedData.eventTime && !currentData.eventTime?.trim()) {
        updates.eventTime = extractedData.eventTime;
        fieldsUpdated++;
      }
      if (extractedData.eventEndTime && !currentData.eventEndTime?.trim()) {
        updates.eventEndTime = extractedData.eventEndTime;
        fieldsUpdated++;
      }
      if (extractedData.fee && (!currentData.fee || currentData.fee === '0')) {
        updates.fee = extractedData.fee;
        fieldsUpdated++;
      }
      if (extractedData.equipmentRequirements && !currentData.equipmentRequirements?.trim()) {
        updates.equipmentRequirements = extractedData.equipmentRequirements;
        fieldsUpdated++;
      }
      if (extractedData.specialRequirements && !currentData.specialRequirements?.trim()) {
        updates.specialRequirements = extractedData.specialRequirements;
        fieldsUpdated++;
      }
      
      if (fieldsUpdated > 0) {
        form.reset({ ...currentData, ...updates });
        setHasChanges(true);
      }
      
      setParseResult({
        fieldsUpdated,
        confidence: extractedData.confidence
      });
      
      // Enhanced feedback based on confidence and extraction results
      if (extractedData.extractionFailed) {
        const errorMsg = extractedData.error || 'Unknown error';
        if (errorMsg.includes('overloaded_error') || errorMsg.includes('Overloaded')) {
          toast({
            title: "AI Service Busy",
            description: "The AI service is temporarily overloaded. Please try parsing again in a moment.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Parsing Failed",
            description: `AI extraction failed: ${errorMsg}. You can manually fill the form.`,
            variant: "destructive",
          });
        }
      } else if (fieldsUpdated === 0) {
        toast({
          title: "No Updates Needed",
          description: `Contract parsed with ${extractedData.confidence}% confidence, but all fields were already filled.`,
        });
      } else {
        toast({
          title: "Contract Parsed",
          description: `Successfully extracted data from contract. ${fieldsUpdated} fields updated.`,
        });
      }
      
    } catch (error) {
      console.error('Parse error:', error);
      toast({
        title: "Parse Error",
        description: "Failed to parse contract. The file was uploaded but AI parsing failed. Please try again or fill manually.",
        variant: "destructive",
      });
    } finally {
      setIsParsingContract(false);
    }
  };

  const onSubmit = async (data: z.infer<typeof bookingDetailsSchema>) => {
    try {
      // Clear all parsing caches immediately when save is clicked
      setExtractedData(null);
      setContractParsingResult(null);
      await updateBookingMutation.mutateAsync({
        ...data,
        customFields: JSON.stringify(customFields),
      });
    } catch (error) {
      console.error('Error updating booking:', error);
    }
  };

  const handleSave = () => {
    if (!booking || !hasChanges) return;
    const formData = form.getValues();
    const updateData = {
      ...formData,
      customFields: JSON.stringify(customFields),
    };
    updateBookingMutation.mutate(updateData);
  };

  if (!booking) return null;

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Sticky Header */}
        <div className="sticky top-0 bg-white z-10 border-b pb-4 pr-12">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Booking Details - {booking.clientName}
            </DialogTitle>
          </DialogHeader>
          
          {/* Action Buttons */}
          <div className="flex justify-end gap-2 mt-4 pr-4">
            <Button
              onClick={handleSave}
              disabled={!hasChanges || updateBookingMutation.isPending}
              className={`${hasChanges ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400'}`}
            >
              {updateBookingMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
            <Button
              variant="outline"
              onClick={handleCancel}
            >
              Cancel
            </Button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pt-4">
          <div className="space-y-6">
          <Form {...form}>
            <form className="space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="clientName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="eventDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Event Date</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="eventTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Time</FormLabel>
                          <FormControl>
                            <Input {...field} type="time" />
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
                          <FormLabel>End Time</FormLabel>
                          <FormControl>
                            <Input {...field} type="time" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="venue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Venue</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="fee"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fee (£)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" step="0.01" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="space-y-2">
                      <Label className="text-gray-400">Status (edit via status buttons)</Label>
                      <div className="p-2 bg-gray-100 rounded-md opacity-60">
                        <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                          {booking.status}
                        </Badge>
                        {booking.previousStatus && booking.status === 'completed' && (
                          <div className="mt-2 text-sm text-gray-600">
                            <span className="font-medium">Previous:</span> {booking.previousStatus}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Client Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Client Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <FormField
                    control={form.control}
                    name="clientEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="clientPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
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
                    name="clientAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={2} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Event Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Music className="h-5 w-5" />
                    Event Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="eventType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Event Type</FormLabel>
                          <FormControl>
                            <Input {...field}  placeholder="Wedding, Corporate, etc." />
                          </FormControl>
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
                          <FormControl>
                            {true ? (
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select gig type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {userGigTypes.map((gigType: string) => (
                                    <SelectItem key={gigType} value={gigType}>
                                      {gigType}
                                    </SelectItem>
                                  ))}
                                  {userGigTypes.length === 0 && (
                                    <SelectItem value="none" disabled>
                                      No gig types available - configure in Settings
                                    </SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input {...field} disabled={true} placeholder="Saxophone, DJ, etc." />
                            )}
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="dressCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dress Code</FormLabel>
                          <FormControl>
                            <Input {...field}  placeholder="Black tie, casual, etc." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="repertoire"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Repertoire/Song Requests</FormLabel>
                        <FormControl>
                          <Textarea {...field}  rows={3} placeholder="Special songs, style requests, etc." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Venue Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Venue Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <FormField
                    control={form.control}
                    name="venueAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Venue Address</FormLabel>
                        <FormControl>
                          <Textarea {...field}  rows={2} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="venueContactInfo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Venue Contact Information</FormLabel>
                        <FormControl>
                          <Textarea {...field}  rows={2} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="contactPerson"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Day-of Contact Person</FormLabel>
                          <FormControl>
                            <Input {...field}  />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="contactPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Phone</FormLabel>
                          <FormControl>
                            <Input {...field}  />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="parkingInfo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parking Information</FormLabel>
                        <FormControl>
                          <Textarea {...field}  rows={2} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Timing & Setup */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Timing & Setup
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="setupTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Setup Time</FormLabel>
                          <FormControl>
                            <Input {...field}  placeholder="e.g., 30 minutes before" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="soundCheckTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sound Check Time</FormLabel>
                          <FormControl>
                            <Input {...field}  placeholder="e.g., 15 minutes before start" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="packupTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pack-up Time</FormLabel>
                          <FormControl>
                            <Input {...field}  placeholder="e.g., 15 minutes after finish" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="travelTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Travel Time</FormLabel>
                          <FormControl>
                            <Input {...field}  placeholder="e.g., 1 hour each way" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Equipment & Special Requests */}
              <Card>
                <CardHeader>
                  <CardTitle>Equipment & Special Requests</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <FormField
                    control={form.control}
                    name="equipmentRequirements"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Equipment Needed</FormLabel>
                        <FormControl>
                          <Textarea {...field}  rows={2} placeholder="PA system, microphones, stands, etc." />
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
                        <FormLabel>Special Requests</FormLabel>
                        <FormControl>
                          <Textarea {...field}  rows={3} placeholder="Special songs, timing requests, etc." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Custom Fields */}
              <Card>
                <CardHeader>
                  <CardTitle>Custom Fields</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {customFields.map((field) => (
                    <div key={field.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <Label className="text-sm font-medium">{field.name}</Label>
                        <p className="text-sm text-gray-600">{field.value}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCustomField(field.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  
                  <div className="flex gap-2">
                    <Input
                      placeholder="Field name"
                      value={newFieldName}
                      onChange={(e) => setNewFieldName(e.target.value)}
                    />
                    <Input
                      placeholder="Field value"
                      value={newFieldValue}
                      onChange={(e) => setNewFieldValue(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addCustomField}
                      disabled={!newFieldName.trim() || !newFieldValue.trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* PDF Contract Import */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Import PDF Contract
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Upload a Musicians' Union contract to automatically extract and populate booking details
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="contract-upload">Upload Musicians' Union Contract</Label>
                    <Input
                      id="contract-upload"
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setContractFile(e.target.files?.[0] || null)}
                    />
                  </div>
                  
                  {contractFile && (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={handleParseContract}
                        disabled={isParsingContract}
                        className="flex items-center gap-2"
                      >
                        {isParsingContract ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Parsing...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4" />
                            Parse & Import Data
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setContractFile(null);
                          setParseResult(null);
                        }}
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                  
                  {parseResult && (
                    <div className="bg-green-50 p-3 rounded-md">
                      <p className="text-sm text-green-700">
                        Contract parsed successfully! {parseResult.fieldsUpdated || 0} fields updated.
                        Confidence: {parseResult.confidence || 0}%
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Notes */}
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea {...field}  rows={4} placeholder="Additional notes..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
              

            </form>
          </Form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}