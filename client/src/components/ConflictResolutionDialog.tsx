import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  AlertTriangle, 
  Clock, 
  User, 
  MapPin, 
  Calendar, 
  Phone, 
  Mail, 
  Edit3, 
  Trash2,
  Check,
  X,
  ChevronRight
} from 'lucide-react';

interface ConflictResolutionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  enquiry: any;
  conflicts: any[];
}

export default function ConflictResolutionDialog({ 
  isOpen, 
  onClose, 
  enquiry, 
  conflicts 
}: ConflictResolutionDialogProps) {
  // Early return BEFORE any hooks are called
  if (!enquiry || !enquiry.id || !conflicts) {
    console.error('ConflictResolutionDialog: Invalid data received', { enquiry, conflicts });
    return null;
  }

  const [selectedAction, setSelectedAction] = useState<string>('');
  const [editingBooking, setEditingBooking] = useState<any>(null);
  const [newTime, setNewTime] = useState<string>('');
  const [newEndTime, setNewEndTime] = useState<string>('');
  const [rejectReason, setRejectReason] = useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Update booking time mutation
  const updateTimeMutation = useMutation({
    mutationFn: async ({ id, eventTime, eventEndTime }: any) => {
      const response = await apiRequest(`/api/bookings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ eventTime, eventEndTime }),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/conflicts'] });
      toast({
        title: "Success",
        description: "Booking time updated successfully!",
      });
      setEditingBooking(null);
      setNewTime('');
      setNewEndTime('');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update booking time",
        variant: "destructive",
      });
    },
  });

  // Reject enquiry mutation
  const rejectEnquiryMutation = useMutation({
    mutationFn: async ({ id, reason }: any) => {
      const response = await apiRequest(`/api/bookings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ 
          status: 'rejected',
          notes: reason ? `Rejected due to conflict: ${reason}` : 'Rejected due to scheduling conflict'
        }),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/conflicts'] });
      toast({
        title: "Success",
        description: "Enquiry rejected successfully!",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject enquiry",
        variant: "destructive",
      });
    },
  });

  // Mark as in progress mutation
  const markInProgressMutation = useMutation({
    mutationFn: async ({ id }: any) => {
      const response = await apiRequest(`/api/bookings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ 
          status: 'booking_in_progress',
          notes: 'Marked as in progress despite scheduling conflict - proceed with caution'
        }),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/conflicts'] });
      toast({
        title: "Success",
        description: "Enquiry marked as in progress!",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update enquiry status",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new": return "bg-blue-100 text-blue-800";
      case "booking_in_progress": return "bg-amber-100 text-amber-800";
      case "confirmed": return "bg-green-100 text-green-800";
      case "contract_sent": return "bg-purple-100 text-purple-800";
      case "contract_received": return "bg-emerald-100 text-emerald-800";
      case "completed": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "new": return "New Enquiry";
      case "booking_in_progress": return "In Progress";
      case "confirmed": return "Confirmed";
      case "contract_sent": return "Contract Sent";
      case "contract_received": return "Contract Received";
      case "completed": return "Completed";
      default: return status;
    }
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return 'All day';
    try {
      return new Date(`1970-01-01T${timeString}`).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch (error) {
      return timeString; // Return original if formatting fails
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Invalid Date';
    try {
      return new Date(dateString).toLocaleDateString('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const canReject = (booking: any) => {
    return booking.status === 'new' || booking.status === 'booking_in_progress';
  };

  const canEditTime = (booking: any) => {
    return booking.status !== 'completed' && booking.status !== 'rejected';
  };

  const allConflictingBookings = [enquiry, ...(conflicts || [])].filter(Boolean);
  const totalConflictingBookings = allConflictingBookings.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center text-red-600">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Resolve Scheduling Conflict
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Conflict Summary */}
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-lg text-red-800">
                {totalConflictingBookings} booking{totalConflictingBookings !== 1 ? 's' : ''} on {formatDate(enquiry?.eventDate)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-700">
                Multiple bookings are scheduled for the same date. Choose an action below to resolve the conflict.
              </p>
            </CardContent>
          </Card>

          {/* Action Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Choose Resolution Action:</Label>
            <Select value={selectedAction} onValueChange={setSelectedAction}>
              <SelectTrigger>
                <SelectValue placeholder="Select how to resolve this conflict..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="edit_times">Edit booking times to avoid overlap</SelectItem>
                <SelectItem value="reject_enquiry">Reject the new enquiry</SelectItem>
                {conflicts && conflicts.length > 0 && conflicts.some(c => canReject(c)) && (
                  <SelectItem value="reject_existing">Reject an existing booking</SelectItem>
                )}
                <SelectItem value="mark_in_progress">Mark enquiry as "in progress" (proceed with caution)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Conflicting Bookings List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Conflicting Bookings</h3>
              <div className="text-sm text-gray-600">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                  New Enquiry
                </span>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  Existing Booking
                </span>
              </div>
            </div>
            
            {allConflictingBookings.map((booking, index) => {
              const isCurrentEnquiry = booking?.id === enquiry?.id;
              const isBeingEdited = editingBooking?.id === booking?.id;
              
              return (
                <Card key={booking?.id || index} className={`${
                  isCurrentEnquiry ? 'border-blue-500 bg-blue-50' : 
                  isBeingEdited ? 'border-green-500 bg-green-50 ring-2 ring-green-200' : 
                  'border-gray-200'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(booking?.status || 'new')}>
                            {getStatusLabel(booking?.status || 'new')}
                          </Badge>
                          {isCurrentEnquiry && (
                            <Badge variant="outline" className="text-blue-600 border-blue-600">
                              New Enquiry
                            </Badge>
                          )}
                          {!isCurrentEnquiry && (
                            <Badge variant="outline" className="text-gray-600 border-gray-600">
                              Existing Booking
                            </Badge>
                          )}
                          {isBeingEdited && (
                            <Badge className="bg-green-100 text-green-800 border-green-300">
                              <Edit3 className="w-3 h-3 mr-1" />
                              Being Edited
                            </Badge>
                          )}
                        </div>
                      
                      <h4 className="font-medium">{booking?.title || 'Untitled Booking'}</h4>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <User className="w-4 h-4 mr-2" />
                          {booking?.clientName || 'Unknown Client'}
                        </div>
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-2" />
                          {formatTime(booking?.eventTime)} - {formatTime(booking?.eventEndTime)}
                        </div>
                        {booking?.venue && (
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-2" />
                            {booking.venue}
                          </div>
                        )}
                        {booking?.clientEmail && (
                          <div className="flex items-center">
                            <Mail className="w-4 h-4 mr-2" />
                            {booking.clientEmail}
                          </div>
                        )}
                      </div>
                      
                      {booking?.estimatedValue && (
                        <div className="text-green-600 font-medium">
                          £{booking.estimatedValue}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-2">
                      {selectedAction === 'edit_times' && canEditTime(booking) && (
                        <Button
                          variant={isBeingEdited ? "default" : "outline"}
                          size="sm"
                          className={isBeingEdited ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                          onClick={() => {
                            setEditingBooking(booking);
                            setNewTime(booking.eventTime || '');
                            setNewEndTime(booking.eventEndTime || '');
                          }}
                        >
                          <Edit3 className="w-4 h-4 mr-1" />
                          {isBeingEdited ? "Editing..." : "Edit Time"}
                        </Button>
                      )}
                      
                      {selectedAction === 'reject_enquiry' && booking.id === enquiry.id && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => rejectEnquiryMutation.mutate({ id: booking.id, reason: rejectReason })}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      )}
                      
                      {selectedAction === 'reject_existing' && booking.id !== enquiry.id && canReject(booking) && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => rejectEnquiryMutation.mutate({ id: booking.id, reason: 'Scheduling conflict' })}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      )}
                      
                      {selectedAction === 'mark_in_progress' && booking.id === enquiry.id && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-amber-500 text-amber-600 hover:bg-amber-50"
                          onClick={() => markInProgressMutation.mutate({ id: booking.id })}
                        >
                          <Clock className="w-4 h-4 mr-1" />
                          Mark In Progress
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              );
            })}
          </div>

          {/* Time Editing Dialog */}
          {editingBooking && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-blue-800">
                  Edit Time - {editingBooking.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start-time">Start Time</Label>
                    <Input
                      id="start-time"
                      type="time"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-time">End Time</Label>
                    <Input
                      id="end-time"
                      type="time"
                      value={newEndTime}
                      onChange={(e) => setNewEndTime(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    onClick={() => updateTimeMutation.mutate({ 
                      id: editingBooking.id, 
                      eventTime: newTime, 
                      eventEndTime: newEndTime 
                    })}
                    disabled={updateTimeMutation.isPending}
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Update Time
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingBooking(null);
                      setNewTime('');
                      setNewEndTime('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reject Reason */}
          {selectedAction === 'reject_enquiry' && (
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Reason for Rejection (Optional)</Label>
              <Textarea
                id="reject-reason"
                placeholder="Enter reason for rejecting this enquiry..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
          )}

          {/* Mark In Progress Warning */}
          {selectedAction === 'mark_in_progress' && (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    Proceed with Caution
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    This will mark the enquiry as "in progress" despite scheduling conflicts. 
                    Use this option only if you're confident you can manage the overlapping bookings.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <Separator />

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}