import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageCircle, 
  Edit, 
  Eye, 
  FileText, 
  Receipt, 
  Send,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Clock,
  Reply
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { format } from "date-fns";

interface BookingActionsDialogProps {
  booking: any;
  isOpen: boolean;
  onClose: () => void;
}

interface Communication {
  id: number;
  communicationType: string;
  direction: 'inbound' | 'outbound';
  subject: string | null;
  messageBody: string;
  sentAt: string;
  templateName: string | null;
  deliveryStatus: string;
}

export function BookingActionsDialog({ booking, isOpen, onClose }: BookingActionsDialogProps) {
  const [activeView, setActiveView] = useState<'actions' | 'communications' | 'reply'>('actions');
  const [replyMessage, setReplyMessage] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  // Fetch communication history for this booking
  const { data: communications = [], isLoading: communicationsLoading } = useQuery({
    queryKey: ['communications', 'booking', booking?.id],
    queryFn: async () => {
      if (!booking?.id) return [];
      const response = await apiRequest(`/api/communications/booking/${booking.id}`);
      return await response.json();
    },
    enabled: isOpen && !!booking?.id && activeView === 'communications'
  });

  // Also fetch by client email to get all communications with this client
  const { data: clientCommunications = [] } = useQuery({
    queryKey: ['communications', 'client', booking?.clientEmail],
    queryFn: async () => {
      if (!booking?.clientEmail) return [];
      const response = await apiRequest(`/api/communications/client/${encodeURIComponent(booking.clientEmail)}`);
      return await response.json();
    },
    enabled: isOpen && !!booking?.clientEmail && activeView === 'communications'
  });

  // Combine and deduplicate communications
  const allCommunications = React.useMemo(() => {
    const combined = [...communications, ...clientCommunications];
    const uniqueIds = new Set();
    return combined.filter(comm => {
      if (uniqueIds.has(comm.id)) return false;
      uniqueIds.add(comm.id);
      return true;
    }).sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  }, [communications, clientCommunications]);

  // Send reply mutation
  const sendReplyMutation = useMutation({
    mutationFn: async (messageBody: string) => {
      const response = await apiRequest('/api/communications', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: booking.id,
          clientName: booking.clientName,
          clientEmail: booking.clientEmail,
          communicationType: 'email',
          direction: 'outbound',
          subject: `Re: Booking for ${booking.eventDate ? format(new Date(booking.eventDate), 'MMMM d, yyyy') : 'your event'}`,
          messageBody,
          templateCategory: 'manual_reply'
        }),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Reply sent",
        description: "Your message has been sent to the client.",
      });
      setReplyMessage('');
      setActiveView('communications');
      queryClient.invalidateQueries({ queryKey: ['communications'] });
    },
    onError: () => {
      toast({
        title: "Failed to send reply",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    }
  });

  const handleAction = (action: string) => {
    switch (action) {
      case 'view-details':
        navigate(`/bookings/edit/${booking.id}`);
        onClose();
        break;
      case 'edit-details':
        navigate(`/bookings/edit/${booking.id}?edit=true`);
        onClose();
        break;
      case 'view-communications':
        setActiveView('communications');
        break;
      case 'send-reply':
        setActiveView('reply');
        break;
      case 'send-invoice':
        navigate(`/invoices/new?bookingId=${booking.id}`);
        onClose();
        break;
      case 'send-contract':
        navigate(`/contracts/new?bookingId=${booking.id}`);
        onClose();
        break;
      default:
        break;
    }
  };

  const renderActions = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3">
        <Button
          variant="outline"
          className="justify-start h-auto p-4 text-left"
          onClick={() => handleAction('view-communications')}
        >
          <MessageCircle className="w-5 h-5 mr-3 text-blue-600" />
          <div>
            <div className="font-medium">View Communication History</div>
            <div className="text-sm text-gray-500">See all messages and emails with this client</div>
          </div>
        </Button>

        <Button
          variant="outline"
          className="justify-start h-auto p-4 text-left"
          onClick={() => handleAction('send-reply')}
        >
          <Reply className="w-5 h-5 mr-3 text-green-600" />
          <div>
            <div className="font-medium">Send Message to Client</div>
            <div className="text-sm text-gray-500">Reply to client communications</div>
          </div>
        </Button>

        <Separator />

        <Button
          variant="outline"
          className="justify-start h-auto p-4 text-left"
          onClick={() => handleAction('view-details')}
        >
          <Eye className="w-5 h-5 mr-3 text-purple-600" />
          <div>
            <div className="font-medium">View Booking Details</div>
            <div className="text-sm text-gray-500">See all booking information</div>
          </div>
        </Button>

        <Button
          variant="outline"
          className="justify-start h-auto p-4 text-left"
          onClick={() => handleAction('edit-details')}
        >
          <Edit className="w-5 h-5 mr-3 text-orange-600" />
          <div>
            <div className="font-medium">Edit Booking Details</div>
            <div className="text-sm text-gray-500">Modify booking information</div>
          </div>
        </Button>

        <Separator />

        <Button
          variant="outline"
          className="justify-start h-auto p-4 text-left"
          onClick={() => handleAction('send-invoice')}
        >
          <Receipt className="w-5 h-5 mr-3 text-yellow-600" />
          <div>
            <div className="font-medium">Send Invoice</div>
            <div className="text-sm text-gray-500">Create and send an invoice</div>
          </div>
        </Button>

        <Button
          variant="outline"
          className="justify-start h-auto p-4 text-left"
          onClick={() => handleAction('send-contract')}
        >
          <FileText className="w-5 h-5 mr-3 text-red-600" />
          <div>
            <div className="font-medium">Send Contract</div>
            <div className="text-sm text-gray-500">Create and send a contract</div>
          </div>
        </Button>
      </div>
    </div>
  );

  const renderCommunications = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => setActiveView('actions')}
          className="mb-4"
        >
          ← Back to Actions
        </Button>
        <Button
          onClick={() => setActiveView('reply')}
          className="mb-4"
        >
          <Reply className="w-4 h-4 mr-2" />
          Send Reply
        </Button>
      </div>

      {communicationsLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : allCommunications.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No communication history found</p>
          <Button
            onClick={() => setActiveView('reply')}
            className="mt-4"
          >
            Start Conversation
          </Button>
        </div>
      ) : (
        <ScrollArea className="h-96">
          <div className="space-y-4">
            {allCommunications.map((comm: Communication) => (
              <Card key={comm.id} className={`${comm.direction === 'inbound' ? 'bg-blue-50' : 'bg-gray-50'}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={comm.direction === 'inbound' ? 'default' : 'secondary'}>
                        {comm.direction === 'inbound' ? 'From Client' : 'To Client'}
                      </Badge>
                      {comm.templateName && (
                        <Badge variant="outline" className="text-xs">
                          {comm.templateName}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {format(new Date(comm.sentAt), 'MMM d, yyyy h:mm a')}
                    </div>
                  </div>
                  {comm.subject && (
                    <CardTitle className="text-sm font-medium">
                      {comm.subject}
                    </CardTitle>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="text-sm whitespace-pre-wrap">
                    {comm.messageBody}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );

  const renderReply = () => (
    <div className="space-y-4">
      <Button
        variant="ghost"
        onClick={() => setActiveView(allCommunications.length > 0 ? 'communications' : 'actions')}
        className="mb-4"
      >
        ← Back
      </Button>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">Send message to:</label>
          <div className="text-sm text-gray-600 mt-1">
            {booking.clientName} ({booking.clientEmail})
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Subject:</label>
          <div className="text-sm text-gray-600 mt-1">
            Re: Booking for {booking.eventDate ? format(new Date(booking.eventDate), 'MMMM d, yyyy') : 'your event'}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Message:</label>
          <Textarea
            value={replyMessage}
            onChange={(e) => setReplyMessage(e.target.value)}
            rows={6}
            placeholder="Type your message here..."
            className="mt-1"
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => sendReplyMutation.mutate(replyMessage)}
            disabled={!replyMessage.trim() || sendReplyMutation.isPending}
          >
            <Send className="w-4 h-4 mr-2" />
            {sendReplyMutation.isPending ? 'Sending...' : 'Send Message'}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {booking?.clientName} - {booking?.eventDate ? format(new Date(booking.eventDate), 'MMM d, yyyy') : 'No date'}
          </DialogTitle>
          <DialogDescription>
            <div className="space-y-1">
              {booking?.venue && (
                <div className="flex items-center gap-1 text-sm">
                  <MapPin className="w-3 h-3" />
                  {booking.venue}
                </div>
              )}
              {booking?.clientEmail && (
                <div className="flex items-center gap-1 text-sm">
                  <Mail className="w-3 h-3" />
                  {booking.clientEmail}
                </div>
              )}
              {booking?.clientPhone && (
                <div className="flex items-center gap-1 text-sm">
                  <Phone className="w-3 h-3" />
                  {booking.clientPhone}
                </div>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {activeView === 'actions' && renderActions()}
          {activeView === 'communications' && renderCommunications()}
          {activeView === 'reply' && renderReply()}
        </div>
      </DialogContent>
    </Dialog>
  );
}