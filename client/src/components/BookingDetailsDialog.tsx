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
import { Info, Plus, X, Edit3, Calendar, Clock, MapPin, User, Phone, Mail, Music, Upload, FileText, Loader2, Settings, Navigation } from "lucide-react";
import { What3WordsInput } from "@/components/What3WordsInput";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { COMMON_GIG_TYPES } from "@shared/gig-types";
import { useGigTypes } from "@/hooks/useGigTypes";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import type { Booking } from "@shared/schema";

// Note: Custom auth functions removed - now using standard apiRequest for JWT authentication

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
  what3words: z.string().optional(),
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

interface BookingDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: Booking | null;
  onBookingUpdate?: () => void;
}

export function BookingDetailsDialog({ open, onOpenChange, booking, onBookingUpdate }: BookingDetailsDialogProps) {
  const { gigTypes } = useGigTypes();
  const [customFields, setCustomFields] = useState<Array<{id: string, name: string, value: string}>>([]);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldValue, setNewFieldValue] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [initialData, setInitialData] = useState<any>(null);
  const [uploadStatus, setUploadStatus] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [isParsingContract, setIsParsingContract] = useState(false);
  const [parseResult, setParseResult] = useState<any>(null);
  const [documentType, setDocumentType] = useState<'contract' | 'invoice' | 'other'>('contract');
  const [extractedData, setExtractedData] = useState<any>(null);
  const [contractParsingResult, setContractParsingResult] = useState<any>(null);
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
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's personalized gig types from settings
  const { data: userSettings } = useQuery({
    queryKey: ['/api/settings'],
    enabled: open // Only fetch when dialog is open
  });

  // Fetch contracts for this booking to enable copying data
  const { data: contracts } = useQuery({
    queryKey: ['/api/contracts'],
    enabled: open && booking !== null
  });

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
        error: "Please set your business address in Settings to calculate mileage",
        isCalculating: false
      }));
      return;
    }

    setMileageData(prev => ({ ...prev, isCalculating: true, error: null }));

    try {
      const response = await apiRequest('/api/maps/distance', {
        method: 'POST',
        body: JSON.stringify({
          origin: businessAddress,
          destination: venueAddress
        }),
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();
      
      if (data.distance) {
        setMileageData({
          distance: data.distance,
          distanceValue: data.distanceValue,
          duration: data.duration,
          isCalculating: false,
          error: null
        });
        
        // Auto-fill travel expense if empty OR if current value seems wrong (over £1000)
        const currentExpense = form.getValues('travelExpense');
        const currentValue = parseFloat(currentExpense?.replace(/[£,]/g, '') || '0');
        const shouldRecalculate = !currentExpense || currentValue > 1000; // Fix obviously wrong values
        
        if (shouldRecalculate && data.distanceInMiles) {
          const mileageRate = 0.45; // Standard UK HMRC rate (per mile)
          const expense = (data.distanceInMiles * mileageRate).toFixed(2);
          form.setValue('travelExpense', `£${expense}`);
          console.log(`💰 ${currentExpense ? 'Fixed incorrect' : 'Auto-calculated'} travel expense: ${data.distanceInMiles} miles × £${mileageRate} = £${expense}`);
        }
      } else {
        throw new Error(data.error || 'Unable to calculate distance');
      }
    } catch (error) {
      console.error('Error calculating mileage:', error);
      setMileageData(prev => ({ 
        ...prev, 
        error: "Unable to calculate distance. Please check the venue address.",
        isCalculating: false
      }));
    }
  };

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

  // Initialize form when booking changes
  useEffect(() => {
    if (booking) {
      // Reduced logging for production
      
      // Parse time values - handle time ranges like "13:30 - 15:30"
      const parseTimeValue = (timeValue: string) => {
        if (!timeValue) return "";
        // If it's a time range, extract just the start time
        const timeRange = timeValue.split(' - ');
        return timeRange[0].trim();
      };

      const parseEndTimeValue = (timeValue: string) => {
        if (!timeValue) return "";
        // If it's a time range, extract the end time
        const timeRange = timeValue.split(' - ');
        return timeRange.length > 1 ? timeRange[1].trim() : "";
      };

      console.log("🔍 Loading booking data for form - venue field:", booking.venue);
      
      const bookingData = {
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
        soundCheckTime: booking.soundCheckTime || "",
        parkingInfo: booking.parkingInfo || "",
        contactPhone: booking.contactPhone || "",
        venueAddress: booking.venueAddress || "",
        venueContactInfo: booking.venueContactInfo || "",
        dressCode: booking.dressCode || "",
        notes: booking.notes || "",
        travelExpense: booking.travelExpense || "",
        // Collaborative fields
        venueContact: booking.venueContact || "",
        soundTechContact: booking.soundTechContact || "",
        stageSize: booking.stageSize || "",
        powerEquipment: booking.powerEquipment || "",
        styleMood: booking.styleMood || "",
        mustPlaySongs: booking.mustPlaySongs || "",
        avoidSongs: booking.avoidSongs || "",
        setOrder: booking.setOrder || "",
        firstDanceSong: booking.firstDanceSong || "",
        processionalSong: booking.processionalSong || "",
        signingRegisterSong: booking.signingRegisterSong || "",
        recessionalSong: booking.recessionalSong || "",
        specialDedications: booking.specialDedications || "",
        guestAnnouncements: booking.guestAnnouncements || "",
        loadInInfo: booking.loadInInfo || "",
        weatherContingency: booking.weatherContingency || "",
        parkingPermitRequired: booking.parkingPermitRequired || false,
        mealProvided: booking.mealProvided || false,
        dietaryRequirements: booking.dietaryRequirements || "",
        sharedNotes: booking.sharedNotes || "",
        referenceTracks: booking.referenceTracks || "",
        photoPermission: booking.photoPermission || false,
        encoreAllowed: booking.encoreAllowed || false,
        encoreSuggestions: booking.encoreSuggestions || "",
        what3words: booking.what3words || "",
      };
      
      console.log("🔍 Form reset with venue data:", bookingData.venue);
      form.reset(bookingData);
      setInitialData(bookingData);
      
      // Debug: Check form values after reset
      setTimeout(() => {
        const formVenue = form.getValues("venue");
        console.log("🔍 Form venue value after reset:", formVenue);
      }, 100);
      
      // Automatically calculate mileage if venue address exists and no mileage data yet
      if (booking.venueAddress && !mileageData.distance) {
        calculateMileage(booking.venueAddress);
      }
      setHasChanges(false);
      
      // Initialize custom fields - customFields doesn't exist in schema yet
      setCustomFields([]);
    } else {
      // Reset form when no booking is provided
      form.reset();
      setInitialData(null);
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

      if (!booking?.id) {
        throw new Error('Booking ID is required');
      }
      
      // Use apiRequest for proper JWT authentication
      const response = await apiRequest(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        body: JSON.stringify(sanitizedData),
      });
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] }); // Phase 3: Use main bookings table
      // Cache invalidation handled by main /api/bookings
      toast({
        title: "Success",
        description: "Booking details updated successfully",
      });
      setHasChanges(false);
      // Keep dialog open after saving - removed onOpenChange(false)
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

  // Early return if no booking is provided (after ALL hooks)
  if (!booking) {
    return null;
  }

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

  // Find the most recent contract for this booking
  const bookingContract = Array.isArray(contracts) 
    ? contracts.find((contract: any) => contract.enquiryId === booking?.id)
    : null;

  // Function to copy contract data to booking form
  const handleCopyFromContract = (contract?: any) => {
    // Use provided contract or find the latest one
    const contractToUse = contract || bookingContract;
    
    // handleCopyFromContract called
    
    if (!contractToUse) {
      // No contract found to copy from
      toast({
        title: "No Contract Found",
        description: "No contract found for this booking to copy data from.",
        variant: "destructive",
      });
      return;
    }

    const currentFormData = form.getValues();
    // Current form data logged
    let fieldsUpdated = 0;
    
    // Define protected fields that should never be overwritten by contract imports
    const protectedFields = ['clientName', 'eventDate'];
    const isFieldProtected = (fieldName: string) => {
      const fieldValue = currentFormData[fieldName as keyof typeof currentFormData];
      return protectedFields.includes(fieldName) && 
             typeof fieldValue === 'string' && 
             fieldValue.trim() !== '';
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
      const updatedValue = updatedFormData[key as keyof typeof updatedFormData];
      const currentValue = currentFormData[key as keyof typeof currentFormData];
      if (updatedValue !== currentValue) {
        fieldsUpdated++;
      }
      const contractValue = contractToUse?.[key as keyof typeof contractToUse];
      const currentFieldValue = currentFormData?.[key as keyof typeof currentFormData];
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

    // Automatically update booking status to "confirmed" when contract is imported
    // Check if the imported contract is signed (has signature or signedAt date)
    const contractIsSigned = contractToUse.signedAt || contractToUse.signature;
    
    if (booking && contractIsSigned && booking.status !== 'confirmed' && booking.status !== 'completed') {
      // Update booking status asynchronously using authenticated apiRequest
      apiRequest(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },

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
        message: `${documentType.charAt(0).toUpperCase() + documentType.slice(1)} document uploaded successfully!`
      });
      
      // Clear the file input
      setContractFile(null);
      
      // Refresh booking data if callback provided
      if (onBookingUpdate) {
        onBookingUpdate();
      }
      
      toast({
        title: "Document Uploaded",
        description: `${documentType.charAt(0).toUpperCase() + documentType.slice(1)} document has been stored successfully.`,
      });
      
    } catch (error: any) {
      console.error('Document upload error:', error);
      setUploadStatus({
        type: 'error',
        message: error.message || 'Failed to upload document'
      });
      
      toast({
        title: "Upload Failed",
        description: `Failed to upload ${documentType} document. Please try again.`,
        variant: "destructive",
      });
    } finally {
      // No parsing state to reset for simple document upload
    }
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
            title: "Unable to Process Contract",
            description: `The system had difficulty reading this PDF. Please check if the file contains clear text and try again, or fill the form manually.`,
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
        title: "Processing Issue",
        description: "Unable to automatically read this contract. The file was saved, but please fill the form manually.",
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
    if (!booking?.id) {
      toast({
        title: "Error",
        description: "No booking selected",
        variant: "destructive"
      });
      return;
    }
    
    if (!hasChanges) {
      toast({
        title: "Info",
        description: "No changes detected to save",
        variant: "default"
      });
      return;
    }

    const formData = form.getValues();
    
    // Prepare data for backend - let storage.ts handle date conversion
    const updateData = {
      ...formData,
      customFields: JSON.stringify(customFields),
      // Keep eventDate as string, storage.ts will convert it to Date
    };
    
    updateBookingMutation.mutate(updateData);
  };

  if (!booking) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col" aria-describedby="booking-details-description">
        {/* Sticky Header */}
        <div className="sticky top-0 bg-white z-10 border-b pb-4 pr-12">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Booking Details - {booking.clientName}
            </DialogTitle>
            <DialogDescription id="booking-details-description">
              Edit and manage booking information for {booking.clientName}
            </DialogDescription>
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
                                value={field.value} // Pass the form field value to display in input
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
                                placeholder="Start typing venue name..."
                                className="bg-white/70 border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 w-full min-w-[400px]"
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
                                placeholder="Enter venue address"
                                className="bg-white/70 border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 resize-none"
                                onBlur={(e) => {
                                  field.onBlur();
                                  if (e.target.value) {
                                    calculateMileage(e.target.value);
                                  }
                                }}
                              />
                            </FormControl>
                            {mileageData.isCalculating && (
                              <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Calculating distance...
                              </div>
                            )}
                            {mileageData.distance && !mileageData.isCalculating && (
                              <div className="text-sm text-green-600 flex items-center gap-2 mt-1">
                                <Navigation className="h-3 w-3" />
                                <span className="font-medium">{mileageData.distance}</span>
                                {mileageData.duration && (
                                  <span className="text-gray-500">• {mileageData.duration}</span>
                                )}
                              </div>
                            )}
                            {mileageData.error && (
                              <div className="text-sm text-red-500 mt-1">
                                {mileageData.error}
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="venueContactInfo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">Venue Contact Information</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Contact person, phone, or email" className="bg-white/70 border-blue-200 focus:border-blue-400 focus:ring-blue-400/20" />
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
                              <Input {...field} placeholder="Parking instructions, restrictions, or costs" className="bg-white/70 border-blue-200 focus:border-blue-400 focus:ring-blue-400/20" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Performance & Requirements */}
                  <div>
                    <h3 className="text-md font-semibold text-blue-700 mb-3 border-b border-blue-100 pb-1">
                      Performance Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="eventType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">Event Type</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Wedding, Corporate, etc." className="bg-white/70 border-blue-200 focus:border-blue-400 focus:ring-blue-400/20" />
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
                            <FormLabel className="text-sm font-medium text-gray-700">Gig Type</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Solo, duo, band, etc." className="bg-white/70 border-blue-200 focus:border-blue-400 focus:ring-blue-400/20" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="mt-4">
                      <FormField
                        control={form.control}
                        name="styles"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">Music Styles</FormLabel>
                            <FormControl>
                              <Textarea {...field} rows={2} placeholder="Jazz, classical, pop, etc." className="bg-white/70 border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 resize-none" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Equipment & Special Requirements */}
                  <div>
                    <h3 className="text-md font-semibold text-blue-700 mb-3 border-b border-blue-100 pb-1">
                      Equipment & Requirements
                    </h3>
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="equipmentRequirements"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">Equipment Needed</FormLabel>
                            <FormControl>
                              <Textarea {...field} rows={2} placeholder="PA system, microphones, stands, etc." className="bg-white/70 border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 resize-none" />
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
                            <FormLabel className="text-sm font-medium text-gray-700">Special Requests</FormLabel>
                            <FormControl>
                              <Textarea {...field} rows={2} placeholder="Special songs, timing requests, etc." className="bg-white/70 border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 resize-none" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Fees & Status */}
                  <div>
                    <h3 className="text-md font-semibold text-blue-700 mb-3 border-b border-blue-100 pb-1">
                      Fees & Status
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="fee"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">Fee (£)</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" step="0.01" className="bg-white/70 border-blue-200 focus:border-blue-400 focus:ring-blue-400/20" />
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
                            <FormLabel className="text-sm font-medium text-gray-700">Travel Expense</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="£0.00" className="bg-white/70 border-blue-200 focus:border-blue-400 focus:ring-blue-400/20" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-500">Status (edit via status buttons)</Label>
                        <div className="p-3 bg-gray-50 rounded-md border">
                          <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'} className="mb-1">
                            {booking.status}
                          </Badge>
                          {booking.previousStatus && booking.status === 'completed' && (
                            <div className="text-xs text-gray-600 mt-1">
                              <span className="font-medium">Previous:</span> {booking.previousStatus}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <h3 className="text-md font-semibold text-blue-700 mb-3 border-b border-blue-100 pb-1">
                      Notes
                    </h3>
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea {...field} rows={3} placeholder="Additional notes..." className="bg-white/70 border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 resize-none" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
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
