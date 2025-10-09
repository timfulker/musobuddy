import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, MessageSquare, FileText, DollarSign, ThumbsUp, XCircle, Shield, Upload, History } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface BookingActionMenuProps {
  booking: any;
  onEditBooking?: (booking: any) => void;
  onSendCompliance?: (booking: any) => void;
  onManageDocuments?: (booking: any) => void;
  onViewCommunications?: (booking: any) => void;
}

export default function BookingActionMenu({ booking, onEditBooking, onSendCompliance, onManageDocuments, onViewCommunications }: BookingActionMenuProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
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
    // Close dropdown when action is taken
    setDropdownOpen(false);
    
    let newStatus = booking.status; // Default to current status
    let message = "";

    switch (action) {
      case 'respond_to_client':
        // Auto-update status from 'new' to 'awaiting_response' (in progress)
        if (booking.status === 'new') {
          newStatus = 'awaiting_response';
        }
        // Navigate to conversation page to handle all types of responses
        navigate(`/conversation/${booking.id}`);
        break;
      case 'issue_contract':
        // Navigate to contracts page with booking data pre-filled
        // NOTE: Status will only change to 'contract_sent' when contract is actually sent via email
        navigate(`/contracts?bookingId=${booking.id}&action=create`);
        break;
      case 'issue_invoice':
        // Navigate to invoices page with booking data pre-filled
        navigate(`/invoices?bookingId=${booking.id}&action=create`);
        break;
      case 'send_thankyou':
        // Navigate to conversation page with thank you context
        navigate(`/conversation/${booking.id}?action=thankyou`);
        break;
      case 'edit_booking':
        // Open booking details dialog for editing
        if (onEditBooking) {
          onEditBooking(booking);
        }
        return;
      case 'send_compliance':
        // Open compliance dialog directly on bookings page
        if (onSendCompliance) {
          onSendCompliance(booking);
        } else {
          // Fallback to navigation if no callback provided
          navigate(`/compliance?bookingId=${booking.id}&action=send`);
        }
        return;
      case 'manage_documents':
        // Open documents manager dialog
        if (onManageDocuments) {
          onManageDocuments(booking);
        }
        return;
      case 'view_communications':
        // Open communication history dialog
        if (onViewCommunications) {
          onViewCommunications(booking);
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
    <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setDropdownOpen(!dropdownOpen);
          }}
        >
          <MoreHorizontal className="w-4 h-4 mr-1" />
          Respond
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-48 z-[9999999]" 
        side="bottom"
        sideOffset={5}
        onPointerDownOutside={() => setDropdownOpen(false)}
        onEscapeKeyDown={() => setDropdownOpen(false)}
      >
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
        {onEditBooking && (
          <DropdownMenuItem 
            onClick={() => handleAction('edit_booking')}
            disabled={statusUpdateMutation.isPending}
          >
            <FileText className="w-4 h-4 mr-2" />
            Edit Booking
          </DropdownMenuItem>
        )}
        <DropdownMenuItem 
          onClick={() => handleAction('send_compliance')}
          disabled={statusUpdateMutation.isPending}
        >
          <Shield className="w-4 h-4 mr-2" />
          Send Compliance Documents
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleAction('manage_documents')}
          disabled={statusUpdateMutation.isPending}
        >
          <Upload className="w-4 h-4 mr-2" />
          Manage Documents
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleAction('view_communications')}
          disabled={statusUpdateMutation.isPending}
        >
          <History className="w-4 h-4 mr-2" />
          Communication History
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