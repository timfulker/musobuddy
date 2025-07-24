import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, MessageSquare, FileText, DollarSign, ThumbsUp, XCircle, Shield } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface BookingActionMenuProps {
  booking: any;
  onSendCompliance?: (booking: any) => void;
}

export default function BookingActionMenu({ booking, onSendCompliance }: BookingActionMenuProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  const statusUpdateMutation = useMutation({
    mutationFn: async ({ bookingId, newStatus }: { bookingId: number; newStatus: string }) => {
      return apiRequest(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
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
        // Auto-update status from 'new' to 'awaiting_response' (in progress)
        if (booking.status === 'new') {
          newStatus = 'awaiting_response';
        }
        // Navigate to templates page with booking context
        navigate(`/templates?bookingId=${booking.id}&action=respond`);
        break;
      case 'issue_contract':
        // Auto-update status to 'contract_sent' when issuing contract
        if (['awaiting_response', 'client_confirms'].includes(booking.status)) {
          newStatus = 'contract_sent';
        }
        // Navigate to contracts page with booking data pre-filled
        navigate(`/contracts?bookingId=${booking.id}&action=create`);
        break;
      case 'issue_invoice':
        // Navigate to invoices page with booking data pre-filled
        navigate(`/invoices?bookingId=${booking.id}&action=create`);
        break;
      case 'send_thankyou':
        // Navigate to templates page with booking context for thank you message
        navigate(`/templates?bookingId=${booking.id}&action=thankyou`);
        break;
      case 'send_compliance':
        // Open compliance dialog directly on bookings page
        if (onSendCompliance) {
          onSendCompliance(booking);
        } else {
          // Fallback to navigation if no callback provided
          navigate(`/compliance?bookingId=${booking.id}&action=send`);
        }
        return;
      case 'reject':
        newStatus = 'rejected';
        message = "Booking rejected";
        break;
    }

    // Update status if it changed, then provide user feedback
    if (newStatus !== booking.status) {
      statusUpdateMutation.mutate({ 
        bookingId: booking.id, 
        newStatus 
      });
    } else if (message) {
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
          onClick={() => handleAction('send_compliance')}
          disabled={statusUpdateMutation.isPending}
        >
          <Shield className="w-4 h-4 mr-2" />
          Send Compliance Documents
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