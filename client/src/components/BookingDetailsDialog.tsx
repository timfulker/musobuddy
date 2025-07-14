import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Info, Plus, X, Edit3, Save, Calendar, Clock, MapPin, User, Phone, Mail, Music } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Booking } from "@shared/schema";

const customFieldSchema = z.object({
  name: z.string().min(1, "Field name is required"),
  value: z.string().min(1, "Field value is required"),
});

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
  booking: Booking;
  children: React.ReactNode;
}

export function BookingDetailsDialog({ booking, children }: BookingDetailsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [customFields, setCustomFields] = useState<Array<{id: string, name: string, value: string}>>(
    booking.customFields ? JSON.parse(booking.customFields) : []
  );
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldValue, setNewFieldValue] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof bookingDetailsSchema>>({
    resolver: zodResolver(bookingDetailsSchema),
    defaultValues: {
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
    },
  });

  const updateBookingMutation = useMutation({
    mutationFn: async (data: z.infer<typeof bookingDetailsSchema> & { customFields: any }) => {
      const response = await fetch(`/api/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update booking");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Booking details updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      setIsEditing(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update booking details",
        variant: "destructive",
      });
    },
  });

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

  const updateCustomField = (id: string, name: string, value: string) => {
    setCustomFields(customFields.map(field => 
      field.id === id ? { ...field, name, value } : field
    ));
  };

  const onSubmit = (data: z.infer<typeof bookingDetailsSchema>) => {
    updateBookingMutation.mutate({
      ...data,
      customFields: JSON.stringify(customFields),
    });
  };

  const formatDateTime = (date: string, time?: string) => {
    const eventDate = new Date(date);
    const dateStr = eventDate.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return time ? `${dateStr} at ${time}` : dateStr;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-purple-500";
      case "signed": return "bg-green-500";
      case "completed": return "bg-blue-500";
      case "cancelled": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Booking Details
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Badge className={`${getStatusColor(booking.status)} text-white`}>
                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
              </Badge>
              {!isEditing ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="gap-2"
                >
                  <Edit3 className="h-4 w-4" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={form.handleSubmit(onSubmit)}
                    disabled={updateBookingMutation.isPending}
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {updateBookingMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="grid gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Event Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Event</Label>
                  <p className="text-sm font-semibold">{booking.title}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Client</Label>
                  <p className="text-sm font-semibold">{booking.clientName}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Date & Time</Label>
                  <p className="text-sm">{formatDateTime(booking.eventDate, booking.eventTime)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Duration</Label>
                  <p className="text-sm">
                    {booking.performanceDuration 
                      ? `${booking.performanceDuration} minutes`
                      : booking.eventEndTime 
                        ? `${booking.eventTime} - ${booking.eventEndTime}`
                        : "Not specified"
                    }
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Venue</Label>
                  <p className="text-sm">{booking.venue}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Fee</Label>
                  <p className="text-sm font-semibold">£{booking.fee}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Information Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Client Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Client Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="clientEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            Email
                          </FormLabel>
                          <FormControl>
                            <Input {...field} disabled={!isEditing} type="email" />
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
                          <FormLabel className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            Phone
                          </FormLabel>
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
                            <Input {...field} disabled={!isEditing} placeholder="e.g., Wedding, Corporate" />
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
                            <Input {...field} disabled={!isEditing} placeholder="e.g., Saxophone, DJ" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="dressCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dress Code</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={!isEditing} placeholder="e.g., Black tie, Smart casual" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="repertoire"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Repertoire / Song List</FormLabel>
                        <FormControl>
                          <Textarea {...field} disabled={!isEditing} rows={3} placeholder="Songs, style, special requests..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Venue & Logistics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Venue & Logistics
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
                            <Input {...field} disabled={!isEditing} placeholder="e.g., 15 minutes" />
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
                          <FormLabel>Pack Up Time</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={!isEditing} placeholder="e.g., 20 minutes after" />
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
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}