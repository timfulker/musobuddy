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
  DialogDescription,
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
import { Info, Plus, X, Edit3, Calendar, Clock, MapPin, User, Phone, Mail, Music, Upload, FileText, Loader2, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { COMMON_GIG_TYPES } from "@shared/gig-types";
import { useGigTypes } from "@/hooks/useGigTypes";
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
  styles: z.string().optional(),
  performanceDuration: z.string().optional(),
  equipmentProvided: z.string().optional(),
  whatsIncluded: z.string().optional(),
  notes: z.string().optional(),
});

type BookingFormData = z.infer<typeof bookingDetailsSchema>;

interface CustomField {
  id: string;
  name: string;
  value: string;
}

interface BookingDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: Booking | null;
  onBookingUpdate?: () => void;
}

interface Contract {
  id: number;
  enquiryId: number;
  clientName?: string;
  eventDate?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  venue?: string;
  venueAddress?: string;
  eventTime?: string;
  eventEndTime?: string;
  fee?: number;
  equipmentRequirements?: string;
  specialRequirements?: string;
  signedAt?: string;
  signature?: string;
}

interface ParseResult {
  fieldsUpdated: number;
  confidence: number;
}

interface UploadStatus {
  type: 'success' | 'error';
  message: string;
}

export function BookingDetailsDialog({ open, onOpenChange, booking, onBookingUpdate }: BookingDetailsDialogProps) {
  const { gigTypes } = useGigTypes();
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldValue, setNewFieldValue] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [initialData, setInitialData] = useState<BookingFormData | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null);
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [isParsingContract, setIsParsingContract] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [documentType, setDocumentType] = useState<'contract' | 'invoice' | 'other'>('contract');
  const [extractedData, setExtractedData] = useState<any>(null);
  const [contractParsingResult, setContractParsingResult] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: userSettings } = useQuery({
    queryKey: ['settings'],
    enabled: open
  });

  const { data: contracts } = useQuery<Contract[]>({
    queryKey: ['/api/contracts'],
    enabled: open && booking !== null
  });

  const form = useForm<BookingFormData>({
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
      performanceDuration: "",
      styles: "",
      equipmentProvided: "",
      whatsIncluded: "",
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
      notes: "",
    },
  });

  useEffect(() => {
    if (booking) {
      const parseTimeValue = (timeValue: string) => {
        if (!timeValue) return "";
        const timeRange = timeValue.split(' - ');
        return timeRange[0].trim();
      };

      const parseEndTimeValue = (timeValue: string) => {
        if (!timeValue) return "";
        const timeRange = timeValue.split(' - ');
        return timeRange.length > 1 ? timeRange[1].trim() : "";
      };

      const bookingData: BookingFormData = {
        clientName: booking.clientName || "",
        eventDate: booking.eventDate ? new Date(booking.eventDate).toISOString().split('T')[0] : "",
        eventTime: parseTimeValue(booking.eventTime || ""),
        eventEndTime: parseEndTimeValue(booking.eventTime || "") || booking.eventEndTime || "",
        venue: booking.venue || "",
        fee: booking.fee || "",
        clientEmail: booking.clientEmail || "",
        clientPhone: booking.clientPhone || "",
        clientAddress: booking.clientAddress || "",
        eventType: booking.eventType || "",
        gigType: booking.gigType || "",
        equipmentRequirements: booking.equipmentRequirements || "",
        specialRequirements: booking.specialRequirements || "",
        performanceDuration: booking.performanceDuration || "",
        styles: booking.styles || "",
        equipmentProvided: booking.equipmentProvided || "",
        whatsIncluded: booking.whatsIncluded || "",
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
        notes: booking.notes || "",
      };
      
      form.reset(bookingData);
      setInitialData(bookingData);
      setHasChanges(false);
      setCustomFields([]);
    } else {
      form.reset();
      setInitialData(null);
      setCustomFields([]);
    }
  }, [booking, form]);

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
      const sanitizedData = { ...data };
      const numericFields = ['fee', 'deposit', 'setupTime', 'soundCheckTime', 'packupTime', 'travelTime'];
      numericFields.forEach(field => {
        if (sanitizedData[field] === '' || sanitizedData[field] === undefined) {
          sanitizedData[field] = null;
        }
      });

      if (!booking?.id) {
        throw new Error('Booking ID is required');
      }
      
      const response = await apiRequest(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        body: JSON.stringify(sanitizedData),
      });
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      toast({
        title: "Success",
        description: "Booking details updated successfully",
      });
      setHasChanges(false);
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

  if (!booking) {
    return null;
  }

  const convertTimeFormat = (timeStr: string): string => {
    if (!timeStr) return '';
    
    if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
      return timeStr;
    }
    
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
    
    return timeStr;
  };

  const bookingContract = Array.isArray(contracts) 
    ? contracts.find((contract: Contract) => contract.enquiryId === booking?.id)
    : null;

  const handleCopyFromContract = (contract?: Contract) => {
    const contractToUse = contract || bookingContract;
    
    if (!contractToUse) {
      toast({
        title: "No Contract Found",
        description: "No contract found for this booking to copy data from.",
        variant: "destructive",
      });
      return;
    }

    const currentFormData = form.getValues();
    let fieldsUpdated = 0;
    
    const protectedFields = ['clientName', 'eventDate'];
    const isFieldProtected = (fieldName: string) => {
      const fieldValue = currentFormData[fieldName as keyof BookingFormData];
      return protectedFields.includes(fieldName) && 
             typeof fieldValue === 'string' && 
             fieldValue.trim() !== '';
    };

    const updatedFormData: BookingFormData = {
      ...currentFormData,
      ...(contractToUse.clientName && !isFieldProtected('clientName') && !currentFormData.clientName.trim() && { 
        clientName: contractToUse.clientName 
      }),
      ...(contractToUse.eventDate && !isFieldProtected('eventDate') && !currentFormData.eventDate && { 
        eventDate: new Date(contractToUse.eventDate).toISOString().split('T')[0] 
      }),
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

    let protectedFieldsSkipped = 0;
    Object.keys(updatedFormData).forEach(key => {
      const updatedValue = updatedFormData[key as keyof BookingFormData];
      const currentValue = currentFormData[key as keyof BookingFormData];
      if (updatedValue !== currentValue) {
        fieldsUpdated++;
      }
      const contractValue = contractToUse[key as keyof Contract];
      const currentFieldValue = currentFormData[key as keyof BookingFormData];
      if (isFieldProtected(key) && contractValue && contractValue !== currentFieldValue) {
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

    const contractIsSigned = contractToUse.signedAt || contractToUse.signature;
    
    if (booking && contractIsSigned && booking.status !== 'confirmed' && booking.status !== 'completed') {
      apiRequest(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({ status: 'confirmed' })
      }).then(() => {
        if (onBookingUpdate) onBookingUpdate();
        
        toast({
          title: "Status Updated",
          description: "Booking status automatically updated to 'Confirmed' because the imported contract is signed.",
        });
      }).catch((error) => {
        console.error('Failed to update booking status:', error);
      });
    } else if (booking && !contractIsSigned && booking.status === 'confirmed') {
      toast({
        title: "Contract Imported",
        description: "Unsigned contract imported. Consider updating status to 'Contract Sent' if this reflects the current state.",
      });
    }
  };

  const addCustomField = () => {
    if (newFieldName.trim() && newFieldValue.trim()) {
      const newField: CustomField = {
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
    form.reset(initialData || undefined);
    setHasChanges(false);
    onOpenChange(false);
  };

  const handleUploadContract = async () => {
    if (!contractFile || !booking) return;
    
    setUploadStatus(null);
    
    try {
      const formData = new FormData();
      formData.append('document', contractFile);
      formData.append('documentType', documentType);
      
      const endpoint = `/api/bookings/${booking.id}/upload-document`;
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload document');
      }
      
      const result = await response.json();
      
      setUploadStatus({
        type: 'success',
        message: `Document uploaded and processed successfully! ${result.fieldsExtracted} fields extracted.`
      });
      
      if (result.extractedData) {
        setExtractedData(result.extractedData);
        setContractParsingResult(result);
      }
      
    } catch (error: any) {
      setUploadStatus({
        type: 'error',
        message: error.message || 'Failed to upload and process document'
      });
    }
  };

  const handleParseUploadedContract = async () => {
    if (!contractFile || !booking) return;
    
    setIsParsingContract(true);
    
    try {
      const formData = new FormData();
      formData.append('contract', contractFile);
      
      const response = await fetch(`/api/bookings/${booking.id}/parse-contract`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to parse contract');
      }
      
      const result = await response.json();
      setParseResult({ fieldsUpdated: result.fieldsUpdated, confidence: result.confidence });
      
      if (result.updatedBooking) {
        const updatedData: BookingFormData = {
          ...form.getValues(),
          ...result.updatedBooking,
          eventDate: result.updatedBooking.eventDate ? 
            new Date(result.updatedBooking.eventDate).toISOString().split('T')[0] : 
            form.getValues('eventDate'),
        };
        
        form.reset(updatedData);
        setHasChanges(true);
      }
      
      toast({
        title: "Contract Parsed Successfully",
        description: `Updated ${result.fieldsUpdated} fields with ${result.confidence}% confidence`,
      });
      
    } catch (error: any) {
      toast({
        title: "Parse Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsParsingContract(false);
    }
  };

  const handleSave = async () => {
    const formData = form.getValues();
    await updateBookingMutation.mutateAsync(formData);
  };

  const handleSubmit = (data: BookingFormData) => {
    updateBookingMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            Edit Booking Details
            {hasChanges && <Badge variant="secondary" className="text-xs">Unsaved changes</Badge>}
          </DialogTitle>
          <DialogDescription>
            Update booking information and add additional details.
            {bookingContract && (
              <span className="text-blue-600 font-medium ml-1">
                Contract found - you can copy data from it.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Basic Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <User className="h-4 w-4 text-gray-500" />
                  <h3 className="font-medium">Client Details</h3>
                </div>

                <FormField
                  control={form.control}
                  name="clientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Client name" {...field} />
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
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="client@example.com" {...field} />
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
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="Phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clientAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Client address" className="min-h-[80px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Middle Column - Event Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <h3 className="font-medium">Event Details</h3>
                </div>

                <FormField
                  control={form.control}
                  name="eventDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Date *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    control={form.control}
                    name="eventTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
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
                          <Input type="time" {...field} />
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
                        <Input placeholder="Event venue" {...field} />
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
                      <FormLabel>Venue Address</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Venue address" className="min-h-[80px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="eventType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Type</FormLabel>
                      <FormControl>
                        <Input placeholder="Wedding, corporate event, etc." {...field} />
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gig type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {gigTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
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
                  name="fee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Performance Fee</FormLabel>
                      <FormControl>
                        <Input placeholder="£0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Right Column - Additional Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <Music className="h-4 w-4 text-gray-500" />
                  <h3 className="font-medium">Performance Details</h3>
                </div>

                <FormField
                  control={form.control}
                  name="performanceDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 2 hours, 3x45min sets" {...field} />
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
                      <FormLabel>Musical Styles</FormLabel>
                      <FormControl>
                        <Input placeholder="Jazz, Pop, Classical, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="equipmentRequirements"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Equipment Requirements</FormLabel>
                      <FormControl>
                        <Textarea placeholder="PA system, microphones, etc." className="min-h-[60px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="equipmentProvided"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Equipment Provided</FormLabel>
                      <FormControl>
                        <Textarea placeholder="What equipment you will bring" className="min-h-[60px]" {...field} />
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
                        <Textarea placeholder="Dietary, access, parking, etc." className="min-h-[60px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="whatsIncluded"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What's Included</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Performance, equipment, setup, etc." className="min-h-[60px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Notes</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Any other relevant information" className="min-h-[80px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Contract Import Section */}
            {bookingContract && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-blue-900 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Contract Found
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-blue-700 mb-3">
                    A contract exists for this booking. You can copy its data to fill empty fields above.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyFromContract()}
                    className="text-blue-700 border-blue-300 hover:bg-blue-100"
                  >
                    Copy Contract Data to Booking
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Document Upload Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Import Document Data
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="document-type" className="text-xs text-gray-600">Document Type</Label>
                    <Select value={documentType} onValueChange={(value: 'contract' | 'invoice' | 'other') => setDocumentType(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="contract">Contract</SelectItem>
                        <SelectItem value="invoice">Invoice</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="contract-upload" className="text-xs text-gray-600">Upload Document</Label>
                    <Input
                      id="contract-upload"
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setContractFile(file);
                      }}
                      className="file:mr-2 file:px-2 file:py-1 file:border-0 file:text-xs file:bg-gray-100"
                    />
                  </div>
                  
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleUploadContract}
                      disabled={!contractFile}
                      className="w-full"
                    >
                      {isParsingContract ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Upload className="h-3 w-3 mr-1" />
                          Import Data
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                
                {uploadStatus && (
                  <div className={`p-3 rounded-md text-sm ${
                    uploadStatus.type === 'success' 
                      ? 'bg-green-50 text-green-700 border border-green-200' 
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {uploadStatus.message}
                  </div>
                )}

                {parseResult && (
                  <div className="bg-green-50 border border-green-200 p-3 rounded-md">
                    <div className="text-sm text-green-700">
                      <strong>Parse Result:</strong> Updated {parseResult.fieldsUpdated} fields with {parseResult.confidence}% confidence
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Custom Fields Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Custom Fields
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                {customFields.length > 0 && (
                  <div className="space-y-2">
                    {customFields.map((field) => (
                      <div key={field.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-700">{field.name}:</span>
                          <span className="text-sm text-gray-600 ml-2">{field.value}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCustomField(field.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
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
                    <Plus className="h-3 w-3 mr-1" />
                    Add Field
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-gray-400" />
                <span className="text-xs text-gray-500">
                  Changes are saved automatically when you click Save Changes
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateBookingMutation.isPending || !hasChanges}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {updateBookingMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}