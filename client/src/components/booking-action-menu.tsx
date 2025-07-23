import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, MessageSquare, FileText, DollarSign, ThumbsUp, XCircle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface BookingActionMenuProps {
  booking: any;
}

export default function BookingActionMenu({ booking }: BookingActionMenuProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  const statusUpdateMutation = useMutation({
    mutationFn: async ({ bookingId, newStatus }: { bookingId: number; newStatus: string }) => {
      return apiRequest(`/api/bookings/${bookingId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: (_, { newStatus }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: "Success",
        description: `Booking status updated to ${newStatus.replace('_', ' ')}`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update booking status",
        variant: "destructive",
      });
    },
  });

  const handleAction = (action: string) => {
    let newStatus = booking.status; // Default to current status
    let message = "";

    switch (action) {
      case 'respond_to_client':
        // Navigate to templates page with booking context
        navigate(`/templates?bookingId=${booking.id}&action=respond`);
        return; // Don't update status immediately, let templates page handle it
      case 'issue_contract':
        newStatus = 'client_confirms'; // Assume client will confirm after seeing contract
        message = "Contract issued - status updated to Client Confirms";
        break;
      case 'issue_invoice':
        // Status stays the same, but we could add invoice tracking
        message = "Invoice issued";
        break;
      case 'send_thankyou':
        if (booking.status !== 'completed') {
          newStatus = 'completed';
          message = "Thank you sent - booking marked as completed";
        }
        break;
      case 'reject':
        newStatus = 'rejected';
        message = "Booking rejected";
        break;
    }

    // Only update status if it changed
    if (newStatus !== booking.status) {
      statusUpdateMutation.mutate({ 
        bookingId: booking.id, 
        newStatus 
      });
    } else {
      toast({
        title: "Action Completed",
        description: message,
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <MoreHorizontal className="w-4 h-4 mr-1" />
          Respond
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem 
          onClick={() => handleAction('respond_to_client')}
          disabled={statusUpdateMutation.isPending}
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          Respond to Client
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleAction('issue_contract')}
          disabled={statusUpdateMutation.isPending}
        >
          <FileText className="w-4 h-4 mr-2" />
          Issue Contract
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleAction('issue_invoice')}
          disabled={statusUpdateMutation.isPending}
        >
          <DollarSign className="w-4 h-4 mr-2" />
          Issue Invoice
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleAction('send_thankyou')}
          disabled={statusUpdateMutation.isPending}
        >
          <ThumbsUp className="w-4 h-4 mr-2" />
          Send Thank You
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleAction('reject')}
          disabled={statusUpdateMutation.isPending}
          className="text-red-600 focus:text-red-600"
        >
          <XCircle className="w-4 h-4 mr-2" />
          Reject
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}