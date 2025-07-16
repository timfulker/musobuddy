import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, MapPin, User, Banknote } from "lucide-react";

interface Booking {
  id: number;
  title: string;
  clientName: string;
  venue: string;
  eventDate: string;
  eventTime: string;
  fee: number;
  status: string;
}

interface BookingStatusDialogProps {
  booking: Booking | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function BookingStatusDialog({
  booking,
  open,
  onOpenChange,
}: BookingStatusDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const { toast } = useToast();

  const updateBookingStatusMutation = useMutation({
    mutationFn: async ({ bookingId, status }: { bookingId: number; status: string }) => {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update booking status");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] }); // Phase 3: Use main bookings table
      queryClient.invalidateQueries({ queryKey: ["/api/enquiries"] }); // Keep for backwards compatibility
      onOpenChange(false);
      setSelectedStatus("");
      toast({
        title: "Success",
        description: "Booking status updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUpdateStatus = () => {
    if (!booking || !selectedStatus) return;
    updateBookingStatusMutation.mutate({ bookingId: booking.id, status: selectedStatus });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-purple-100 text-purple-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "signed":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "confirmed":
        return "Confirmed";
      case "completed":
        return "Completed";
      case "cancelled":
        return "Cancelled";
      case "signed":
        return "Contract Signed";
      default:
        return "Unknown";
    }
  };

  if (!booking) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Update Booking Status</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Booking Details */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-lg mb-3">{booking.title}</h3>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-gray-500" />
                <span>{booking.clientName}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span>{new Date(booking.eventDate).toLocaleDateString()}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span>{booking.eventTime}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Banknote className="w-4 h-4 text-gray-500" />
                <span>£{Number(booking.fee).toLocaleString()}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 mt-3">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span className="text-sm">{booking.venue}</span>
            </div>
          </div>

          {/* Current Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Current Status:</span>
            <Badge className={getStatusColor(booking.status)}>
              {getStatusLabel(booking.status)}
            </Badge>
          </div>

          {/* Status Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Update Status:</label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="signed">Contract Signed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updateBookingStatusMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdateStatus}
            disabled={!selectedStatus || updateBookingStatusMutation.isPending}
          >
            {updateBookingStatusMutation.isPending ? "Updating..." : "Update Status"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}