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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { COMMON_GIG_TYPES } from "@shared/gig-types";
import { useGigTypes } from "@/hooks/useGigTypes";
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
        
        // Auto-fill travel expense if empty and distance calculated
        const currentExpense = form.getValues('travelExpense');
        if (!currentExpense && data.distanceValue) {
          const mileageRate = 0.45; // Standard UK HMRC rate
          const expense = (data.distanceValue * mileageRate).toFixed(2);
          form.setValue('travelExpense', `£${expense}`);
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
        setupTime: booking.setupTime || "",
        soundCheckTime: booking.soundCheckTime || "",
        packupTime: booking.packupTime || "",
        travelTime: booking.travelTime || "",
        parkingInfo: booking.parkingInfo || "",
        contactPerson: booking.contactPerson || "",
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
      };
      
      form.reset(bookingData);
      setInitialData(bookingData);
      
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
              {/* Section 1: Basic Information - Purple Theme */}
              <Card className="border-green-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-full">
                      <span className="text-white font-bold text-lg">1</span>
                    </div>
                    <Calendar className="h-6 w-6" />
                    <span className="text-xl font-semibold">Basic Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 bg-green-50 rounded-b-lg border-t-0">
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
                          <FormLabel>Event Start Time</FormLabel>
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
                          <FormLabel>Event Finish Time</FormLabel>
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
                  
                  <FormField
                    control={form.control}
                    name="venueAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Venue Address</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Enter venue address"
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
                  
                  <div className="grid grid-cols-3 gap-4">
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
                    <FormField
                      control={form.control}
                      name="travelExpense"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Travel Expense</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="£0.00" />
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

              {/* Section 2: Client Contact Information - Blue Theme */}
              <Card className="border-blue-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-full">
                      <span className="text-white font-bold text-lg">2</span>
                    </div>
                    <User className="h-6 w-6" />
                    <span className="text-xl font-semibold">Client Contact Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 bg-blue-50 rounded-b-lg border-t-0 grid gap-4">
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

              {/* Section 3: Event Details - Green Theme */}
              <Card className="border-green-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-full">
                      <span className="text-white font-bold text-lg">3</span>
                    </div>
                    <Music className="h-6 w-6" />
                    <span className="text-xl font-semibold">Event Details</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 bg-green-50 rounded-b-lg border-t-0 grid gap-4">
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
                          <div className="space-y-2">
                            <Select onValueChange={(value) => {
                              if (value !== 'custom') {
                                field.onChange(value);
                              }
                            }} value={gigTypes.includes(field.value as string) ? field.value : 'custom'}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select or type custom gig type" />
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
                            
                            {(!gigTypes.includes(field.value as string) || field.value === '') && (
                              <FormControl>
                                <Input 
                                  placeholder="Type custom gig type"
                                  value={gigTypes.includes(field.value as string) ? '' : field.value}
                                  onChange={(e) => field.onChange(e.target.value)}
                                />
                              </FormControl>
                            )}
                          </div>
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
                    name="styles"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Styles Requested <span className="text-blue-600">[Styles]</span></FormLabel>
                        <FormControl>
                          <Textarea {...field}  rows={3} placeholder="Musical styles requested for this booking: jazz, classical, pop, etc." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Section 4: Venue Information - Orange Theme */}
              <Card className="border-orange-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-full">
                      <span className="text-white font-bold text-lg">4</span>
                    </div>
                    <MapPin className="h-6 w-6" />
                    <span className="text-xl font-semibold">Venue Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 bg-orange-50 rounded-b-lg border-t-0 grid gap-4">
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

              {/* Section 5: Timing & Setup - Indigo Theme */}
              <Card className="border-yellow-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-full">
                      <span className="text-white font-bold text-lg">5</span>
                    </div>
                    <Clock className="h-6 w-6" />
                    <span className="text-xl font-semibold">Timing & Setup</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 bg-yellow-50 rounded-b-lg border-t-0 grid gap-4">
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

              {/* Section 6: Equipment & Special Requests - Pink Theme */}
              <Card className="border-pink-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-full">
                      <span className="text-white font-bold text-lg">6</span>
                    </div>
                    <Settings className="h-6 w-6" />
                    <span className="text-xl font-semibold">Equipment & Special Requests</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 bg-pink-50 rounded-b-lg border-t-0 grid gap-4">
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

              {/* Section 7: Performance Details - TEMPLATE VARIABLES - Teal Theme */}
              <Card className="border-teal-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-full">
                      <span className="text-white font-bold text-lg">7</span>
                    </div>
                    <Music className="h-6 w-6" />
                    <span className="text-xl font-semibold">Performance Details</span>
                    <span className="text-sm font-normal bg-white/20 px-3 py-1 rounded-full ml-2">📧 Template Variables</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 bg-teal-50 rounded-b-lg border-t-0 grid gap-4">
                  <FormField
                    control={form.control}
                    name="performanceDuration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Performance Duration <span className="text-blue-600">[Performance Duration]</span></FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., 2 hours, 3 x 45 minute sets" />
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
                        <FormLabel>Equipment Provided <span className="text-blue-600">[Equipment Provided]</span></FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={2} placeholder="What equipment/instruments you'll bring" />
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
                        <FormLabel>What's Included <span className="text-blue-600">[What's Included]</span></FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} placeholder="What's included in your service/package" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Section 8: Custom Fields - Gray Theme */}
              <Card className="border-gray-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-full">
                      <span className="text-white font-bold text-lg">8</span>
                    </div>
                    <Edit3 className="h-6 w-6" />
                    <span className="text-xl font-semibold">Custom Fields</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 bg-gray-50 rounded-b-lg border-t-0 space-y-4">
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

              {/* Section 9: Comprehensive Document Management - Violet Theme */}
              <Card className="border-black shadow-lg">
                <CardHeader className="bg-gradient-to-r from-slate-700 to-slate-900 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-full">
                      <span className="text-white font-bold text-lg">9</span>
                    </div>
                    <FileText className="h-6 w-6" />
                    <span className="text-xl font-semibold">Booking Documents</span>
                  </CardTitle>
                  <p className="text-white/90 text-sm mt-2">
                    Upload contracts, invoices, and other booking-related documents. Use AI parsing to extract and populate booking details.
                  </p>
                </CardHeader>
                <CardContent className="p-6 bg-slate-50 rounded-b-lg border-t-0 space-y-4">
                  {/* Document Type Selection */}
                  <div className="space-y-2">
                    <Label>Document Type</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={documentType === 'contract' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDocumentType('contract')}
                      >
                        Contract
                      </Button>
                      <Button
                        type="button"
                        variant={documentType === 'invoice' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDocumentType('invoice')}
                      >
                        Invoice
                      </Button>
                      <Button
                        type="button"
                        variant={documentType === 'other' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDocumentType('other')}
                      >
                        Other
                      </Button>
                    </div>
                  </div>

                  {/* Existing Documents Display */}
                  {(booking?.uploadedContractUrl || booking?.uploadedInvoiceUrl || (booking?.uploadedDocuments && Array.isArray(booking.uploadedDocuments) && booking.uploadedDocuments.length > 0)) && (
                    <div className="space-y-2">
                      <Label>Uploaded Documents</Label>
                      <div className="space-y-2">
                        {booking?.uploadedContractUrl && (
                          <div className="bg-blue-50 p-3 rounded-md">
                            <p className="text-sm text-blue-700 mb-2">
                              📄 Contract: {String(booking.uploadedContractFilename || 'Unknown')}
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(booking.uploadedContractUrl!, '_blank')}
                            >
                              View Contract
                            </Button>
                          </div>
                        )}
                        {booking?.uploadedInvoiceUrl && (
                          <div className="bg-green-50 p-3 rounded-md">
                            <p className="text-sm text-green-700 mb-2">
                              💰 Invoice: {String(booking.uploadedInvoiceFilename || 'Unknown')}
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(booking.uploadedInvoiceUrl!, '_blank')}
                            >
                              View Invoice
                            </Button>
                          </div>
                        )}
                        {booking?.uploadedDocuments && Array.isArray(booking.uploadedDocuments) && 
                         (booking.uploadedDocuments as Array<{type?: string, filename?: string, url?: string}>).map((doc, index) => (
                          <div key={index} className="bg-gray-50 p-3 rounded-md">
                            <p className="text-sm text-gray-700 mb-2">
                              📎 {doc.type || 'Document'}: {doc.filename || 'Unknown'}
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => doc.url && window.open(doc.url, '_blank')}
                            >
                              View Document
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Upload New Document */}
                  {(
                    (documentType === 'contract' && !booking?.uploadedContractUrl) ||
                    (documentType === 'invoice' && !booking?.uploadedInvoiceUrl) ||
                    documentType === 'other'
                  ) ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="document-upload">Upload {documentType === 'contract' ? 'Contract' : documentType === 'invoice' ? 'Invoice' : 'Document'} PDF</Label>
                        <Input
                          id="document-upload"
                          type="file"
                          accept=".pdf"
                          onChange={(e) => setContractFile(e.target.files?.[0] || null)}
                        />
                      </div>
                      
                      {contractFile && (
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              onClick={handleUploadContract}
                              disabled={isParsingContract}
                              className="flex items-center gap-2"
                            >
                              {isParsingContract ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Uploading...
                                </>
                              ) : (
                                <>
                                  <Upload className="h-4 w-4" />
                                  Store Document
                                </>
                              )}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
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
                                  <FileText className="h-4 w-4" />
                                  Parse & Fill Form
                                </>
                              )}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setContractFile(null)}
                            >
                              Clear
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Choose "Store Document" to simply save the PDF, or "Parse & Fill Form" to extract data and populate booking fields
                          </p>
                        </div>
                      )}
                      
                      {parseResult && (
                        <div className="bg-green-50 p-3 rounded-md">
                          <p className="text-sm text-green-700">
                            Document parsed successfully! {parseResult.fieldsUpdated || 0} fields updated.
                            Confidence: {parseResult.confidence || 0}%
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="bg-gray-50 p-3 rounded-md text-center">
                      <p className="text-sm text-gray-600">
                        {documentType === 'contract' ? 'Contract already uploaded' : 
                         documentType === 'invoice' ? 'Invoice already uploaded' : 
                         'Select a different document type to upload more files'}
                      </p>
                    </div>
                  )}
                  
                  {uploadStatus && (
                    <div className={`p-3 rounded-md ${uploadStatus.type === 'success' ? 'bg-green-50' : 'bg-red-50'}`}>
                      <p className={`text-sm ${uploadStatus.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                        {uploadStatus.message}
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