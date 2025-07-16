import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Info, Plus, X, Edit3, Calendar, Clock, MapPin, User, Phone, Mail, Music } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Booking } from "@shared/schema";

const bookingDetailsSchema = z.object({
  clientEmail: z.string().email().optional().or(z.literal("")),
  clientPhone: z.string().optional(),
  clientAddress: z.string().optional(),
  eventType: z.string().optional(),
  gigType: z.string().optional(),
  equipmentNeeded: z.string().optional(),
  specialRequests: z.string().optional(),
  setupTime: z.string().optional(),
  soundCheckTime: z.string().optional(),
  packupTime: z.string().optional(),
  travelTime: z.string().optional(),
  parkingInfo: z.string().optional(),
  contactPerson: z.string().optional(),
  contactPhone: z.string().optional(),
  venueAddress: z.string().optional(),
  venueContactInfo: z.string().optional(),
  dressCode: z.string().optional(),
  repertoire: z.string().optional(),
  notes: z.string().optional(),
});

interface BookingDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: Booking | null;
}

export function BookingDetailsDialog({ open, onOpenChange, booking }: BookingDetailsDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [customFields, setCustomFields] = useState<Array<{id: string, name: string, value: string}>>([]);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldValue, setNewFieldValue] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof bookingDetailsSchema>>({
    resolver: zodResolver(bookingDetailsSchema),
    defaultValues: {
      clientEmail: "",
      clientPhone: "",
      clientAddress: "",
      eventType: "",
      gigType: "",
      equipmentNeeded: "",
      specialRequests: "",
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
      form.reset({
        clientEmail: booking.clientEmail || "",
        clientPhone: booking.clientPhone || "",
        clientAddress: booking.clientAddress || "",
        eventType: booking.eventType || "",
        gigType: booking.gigType || "",
        equipmentNeeded: booking.equipmentNeeded || "",
        specialRequests: booking.specialRequests || "",
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
        repertoire: booking.repertoire || "",
        notes: booking.notes || "",
      });
      
      // Initialize custom fields
      setCustomFields(booking.customFields ? JSON.parse(booking.customFields) : []);
    }
  }, [booking, form]);

  const updateBookingMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/bookings/${booking?.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update booking');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings-new'] }); // Phase 2: Use new bookings table
      queryClient.invalidateQueries({ queryKey: ['/api/enquiries'] }); // Keep for backwards compatibility
      toast({
        title: "Success",
        description: "Booking details updated successfully",
      });
      setIsEditing(false);
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

  // Save function
  const handleSave = async () => {
    if (!booking) return;
    
    const formData = form.getValues();
    const updateData = {
      ...formData,
      customFields: JSON.stringify(customFields),
    };
    
    updateBookingMutation.mutate(updateData);
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
    }
  };

  const removeCustomField = (id: string) => {
    setCustomFields(customFields.filter(field => field.id !== id));
  };

  const handleClose = () => {
    setIsEditing(false);
    onOpenChange(false);
  };

  const handleCancel = () => {
    // Reset form to original values
    if (booking) {
      form.reset({
        clientEmail: booking.clientEmail || "",
        clientPhone: booking.clientPhone || "",
        clientAddress: booking.clientAddress || "",
        eventType: booking.eventType || "",
        gigType: booking.gigType || "",
        equipmentNeeded: booking.equipmentNeeded || "",
        specialRequests: booking.specialRequests || "",
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
        repertoire: booking.repertoire || "",
        notes: booking.notes || "",
      });
      setCustomFields(booking.customFields ? JSON.parse(booking.customFields) : []);
    }
    setIsEditing(false);
  };

  if (!booking) return null;

  const handleDialogOpenChange = (open: boolean) => {
    // Only allow closing if not in editing mode
    if (!isEditing) {
      onOpenChange(open);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Booking Details - {booking.clientName}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Edit3 className="h-4 w-4 mr-2" />
                {isEditing ? 'Switch to View Mode' : 'Switch to Edit Mode'}
              </Button>
              {!isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="h-4 w-4 mr-2" />
                  Close
                </Button>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

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
                    <div className="space-y-2">
                      <Label>Client Name</Label>
                      <div className="p-2 bg-gray-50 rounded-md">{booking.clientName}</div>
                    </div>
                    <div className="space-y-2">
                      <Label>Event Date</Label>
                      <div className="p-2 bg-gray-50 rounded-md">
                        {booking.eventDate ? new Date(booking.eventDate).toLocaleDateString() : 'Not set'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Event Time</Label>
                      <div className="p-2 bg-gray-50 rounded-md">{booking.eventTime || 'Not set'}</div>
                    </div>
                    <div className="space-y-2">
                      <Label>Venue</Label>
                      <div className="p-2 bg-gray-50 rounded-md">{booking.venue || 'Not set'}</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Fee</Label>
                      <div className="p-2 bg-gray-50 rounded-md">£{booking.fee || 'Not set'}</div>
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <div className="p-2 bg-gray-50 rounded-md">
                        <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                          {booking.status}
                        </Badge>
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
                          <Input {...field} disabled={!isEditing} type="email" />
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
                            <Input {...field} disabled={!isEditing} />
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
                          <Textarea {...field} disabled={!isEditing} rows={2} />
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
                            <Input {...field} disabled={!isEditing} placeholder="Wedding, Corporate, etc." />
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
                            <Input {...field} disabled={!isEditing} placeholder="Saxophone, DJ, etc." />
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
                            <Input {...field} disabled={!isEditing} placeholder="Black tie, casual, etc." />
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
                          <Textarea {...field} disabled={!isEditing} rows={3} placeholder="Special songs, style requests, etc." />
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
                          <Textarea {...field} disabled={!isEditing} rows={2} />
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
                          <Textarea {...field} disabled={!isEditing} rows={2} />
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
                            <Input {...field} disabled={!isEditing} />
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
                            <Input {...field} disabled={!isEditing} />
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
                          <Textarea {...field} disabled={!isEditing} rows={2} />
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
                            <Input {...field} disabled={!isEditing} placeholder="e.g., 30 minutes before" />
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
                            <Input {...field} disabled={!isEditing} placeholder="e.g., 15 minutes before start" />
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
                            <Input {...field} disabled={!isEditing} placeholder="e.g., 15 minutes after finish" />
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
                            <Input {...field} disabled={!isEditing} placeholder="e.g., 1 hour each way" />
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
                    name="equipmentNeeded"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Equipment Needed</FormLabel>
                        <FormControl>
                          <Textarea {...field} disabled={!isEditing} rows={2} placeholder="PA system, microphones, stands, etc." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="specialRequests"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Special Requests</FormLabel>
                        <FormControl>
                          <Textarea {...field} disabled={!isEditing} rows={3} placeholder="Special songs, timing requests, etc." />
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
                      {isEditing && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCustomField(field.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  
                  {isEditing && (
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
                          <Textarea {...field} disabled={!isEditing} rows={4} placeholder="Additional notes..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
              
              {/* Save/Cancel Buttons */}
              {isEditing && (
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={updateBookingMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSave}
                    disabled={updateBookingMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {updateBookingMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              )}
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}