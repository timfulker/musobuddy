import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MessageSquare, Eye, Trash2, ArrowRight, Calendar, Reply, Link2, Search } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Layout } from "@/components/layout";
import { useLocation } from "wouter";

interface UnparseableMessage {
  id: number;
  source: string;
  fromContact: string;
  subject?: string;
  rawMessage: string;
  clientAddress?: string;
  parsingErrorDetails?: string;
  status: string;
  reviewNotes?: string;
  convertedToBookingId?: number;
  createdAt: string;
  reviewedAt?: string;
}

interface Booking {
  id: number;
  clientName?: string;
  venue?: string;
  eventDate?: string;
  eventType?: string;
  status?: string;
}

export default function UnparseableMessages() {
  const [selectedMessage, setSelectedMessage] = useState<UnparseableMessage | null>(null);
  const [linkingMessage, setLinkingMessage] = useState<UnparseableMessage | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [bookingSearch, setBookingSearch] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['/api/unparseable-messages'],
    queryFn: async () => {
      const response = await apiRequest('/api/unparseable-messages');
      const data = await response.json();
      // Handle both old format (array) and new format (object with messages property)
      return data.messages || data;
    }
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['/api/bookings'],
    queryFn: async () => {
      const response = await apiRequest('/api/bookings');
      return await response.json();
    },
    enabled: !!linkingMessage
  });

  const markAsReviewedMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes: string }) => {
      const response = await apiRequest(`/api/unparseable-messages/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'reviewed',
          reviewNotes: notes
        })
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/unparseable-messages'] });
      setSelectedMessage(null);
      setReviewNotes("");
      toast({
        title: "Message Reviewed",
        description: "Message marked as reviewed successfully"
      });
    }
  });

  const convertToBookingMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes: string }) => {
      const response = await apiRequest(`/api/unparseable-messages/${id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewNotes: notes
        })
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/unparseable-messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      setSelectedMessage(null);
      setReviewNotes("");
      toast({
        title: "Converted to Booking",
        description: "Message successfully converted to a booking"
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/unparseable-messages/${id}`, {
        method: 'DELETE'
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/unparseable-messages'] });
      toast({
        title: "Message Deleted",
        description: "Message deleted successfully"
      });
    }
  });

  const linkToBookingMutation = useMutation({
    mutationFn: async ({ messageId, bookingId }: { messageId: number; bookingId: number }) => {
      const response = await apiRequest(`/api/unparseable-messages/${messageId}/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId })
      });
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/unparseable-messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/communication'] });
      setLinkingMessage(null);
      setSelectedBookingId(null);
      setBookingSearch("");
      toast({
        title: "Message Linked",
        description: "Message successfully linked to booking"
      });
      // Navigate to the conversation page for the booking
      navigate(`/conversation/${data.bookingId}`);
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'reviewed': return 'bg-blue-100 text-blue-800';
      case 'converted': return 'bg-green-100 text-green-800';
      case 'discarded': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatReceivedTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 60) {
      return diffMinutes < 1 ? 'Just now' : `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return date.toLocaleDateString("en-GB", { 
        day: "numeric", 
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      });
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading unparseable messages...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Unparseable Messages</h1>
          <p className="text-gray-600 mt-1">
            Messages that couldn't be automatically processed and require your review
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm">
            {messages.length} message{messages.length !== 1 ? 's' : ''}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                const response = await apiRequest('/api/unparseable-messages/debug-all');
                const data = await response.json();
                console.log('🔍 Debug data:', data);
                alert(`Total messages: ${data.totalMessages}\nStatus breakdown: ${JSON.stringify(data.statusBreakdown, null, 2)}`);
              } catch (error) {
                console.error('Debug failed:', error);
              }
            }}
          >
            Debug All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              if (confirm('Clean up orphaned messages?')) {
                try {
                  const response = await apiRequest('/api/unparseable-messages/cleanup-orphaned', {
                    method: 'POST'
                  });
                  const data = await response.json();
                  alert(`Cleanup completed. Deleted ${data.deletedCount} orphaned messages.`);
                  queryClient.invalidateQueries({ queryKey: ['/api/unparseable-messages'] });
                } catch (error) {
                  console.error('Cleanup failed:', error);
                }
              }
            }}
          >
            Cleanup Orphaned
          </Button>
        </div>
      </div>

      {messages.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No unparseable messages</h3>
              <p className="text-gray-600">
                All your messages have been successfully processed automatically
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {messages.map((message: UnparseableMessage) => {
            console.log('Message status:', message.status, 'ID:', message.id); // Debug log
            return (
              <Card key={message.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    From: {message.fromContact}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {(message as any).messageType && (
                      <Badge variant="outline" className={cn(
                        "text-xs",
                        (message as any).messageType === 'price_enquiry' ? "border-purple-300 text-purple-800 bg-purple-50" :
                        (message as any).messageType === 'vague' ? "border-orange-300 text-orange-800 bg-orange-50" :
                        "border-gray-300 text-gray-800 bg-gray-50"
                      )}>
                        {(message as any).messageType === 'price_enquiry' ? '💰 Price' :
                         (message as any).messageType === 'vague' ? '❓ Vague' :
                         '📝 General'}
                      </Badge>
                    )}
                    <Badge className={getStatusColor(message.status)}>
                      {message.status}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {message.source}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center text-sm text-gray-500 gap-2">
                  <Calendar className="w-4 h-4" />
                  Received {new Date(message.createdAt).toLocaleDateString("en-GB", { 
                    day: "numeric", 
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                  {message.clientAddress && (
                    <span className="ml-2">• {message.clientAddress}</span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Message:</p>
                    <div className="bg-gray-50 p-3 rounded-lg text-sm">
                      {message.rawMessage}
                    </div>
                  </div>
                  
                  {message.parsingErrorDetails && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Parsing Error:</p>
                      <div className="bg-red-50 p-3 rounded-lg text-sm text-red-800">
                        {message.parsingErrorDetails}
                      </div>
                    </div>
                  )}
                  
                  {message.reviewNotes && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Review Notes:</p>
                      <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
                        {message.reviewNotes}
                      </div>
                    </div>
                  )}
                  
                  {message.status !== 'converted' && message.status !== 'discarded' && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => setSelectedMessage(message)}
                        className="flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Review
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          // Extract client email from fromContact (format: "Name <email>")
                          const emailMatch = message.fromContact.match(/<(.+)>/);
                          const clientEmail = emailMatch ? emailMatch[1] : message.fromContact;
                          // Navigate to templates page with message data for direct reply
                          navigate(`/templates?action=respond&messageId=${message.id}&clientEmail=${encodeURIComponent(clientEmail)}&clientName=${encodeURIComponent(message.fromContact.replace(/<[^>]*>/g, '').trim())}`);
                        }}
                        className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
                      >
                        <Reply className="w-4 h-4" />
                        Reply
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setLinkingMessage(message);
                          setBookingSearch("");
                          setSelectedBookingId(null);
                        }}
                        className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
                      >
                        <Link2 className="w-4 h-4" />
                        Link to Booking
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteMutation.mutate(message.id)}
                        className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </Button>
                    </div>
                  )}
                  
                  {message.convertedToBookingId && (
                    <div className="flex items-center text-sm text-green-600">
                      <ArrowRight className="w-4 h-4 mr-1" />
                      Converted to booking #{message.convertedToBookingId}
                    </div>
                  )}
                </div>
              </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Review Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto">
            <CardHeader>
              <CardTitle>Review Message from {selectedMessage.fromContact}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Original Message:</p>
                <div className="bg-gray-50 p-3 rounded-lg text-sm">
                  {selectedMessage.rawMessage}
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Add review notes:</p>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add notes about this message or why it couldn't be processed..."
                  className="min-h-[100px]"
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => alert('TEST BUTTON WORKS!')}
                >
                  TEST BUTTON
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      // Auto-convert to booking when replying
                      const response = await apiRequest(`/api/unparseable-messages/${selectedMessage.id}/convert`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          reviewNotes: 'Auto-converted on reply'
                        })
                      });
                      
                      if (response.ok) {
                        const result = await response.json();
                        const bookingId = result.booking.id;
                        
                        // Navigate to conversation page with the new booking ID
                        navigate(`/conversation/${bookingId}`);
                        
                        toast({
                          title: "Converted to Dateless Booking",
                          description: "Message converted to booking for easier conversation management"
                        });
                      } else {
                        throw new Error('Failed to convert message');
                      }
                    } catch (error) {
                      console.error('Error converting message:', error);
                      toast({
                        title: "Error",
                        description: "Failed to convert message to booking",
                        variant: "destructive"
                      });
                    }
                  }}
                  className="flex items-center gap-2"
                >
                  <Reply className="w-4 h-4" />
                  Reply
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    toast({
                      title: "Link to Booking",
                      description: "This feature will search for existing bookings to link this message"
                    });
                  }}
                  className="flex items-center gap-2"
                >
                  <Link2 className="w-4 h-4" />
                  Link to Booking
                </Button>
                <Button
                  variant="outline"
                  onClick={() => markAsReviewedMutation.mutate({ 
                    id: selectedMessage.id, 
                    notes: reviewNotes 
                  })}
                  disabled={markAsReviewedMutation.isPending}
                >
                  Mark as Reviewed
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedMessage(null);
                    setReviewNotes("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Link to Booking Modal */}
      {linkingMessage && (
        <Dialog open={!!linkingMessage} onOpenChange={() => setLinkingMessage(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Link Message to Existing Booking</DialogTitle>
              {linkingMessage.subject && (
                <div className="mt-2">
                  <p className="text-sm text-gray-600">Subject line clue:</p>
                  <Badge variant="outline" className="mt-1 text-sm">
                    {linkingMessage.subject}
                  </Badge>
                </div>
              )}
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Message from: {linkingMessage.fromContact}</p>
                <div className="bg-gray-50 p-3 rounded-lg text-sm max-h-32 overflow-y-auto">
                  {linkingMessage.rawMessage}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Search className="w-4 h-4 text-gray-500" />
                  <Input
                    type="text"
                    placeholder="Search bookings by client name, venue, or event type..."
                    value={bookingSearch}
                    onChange={(e) => setBookingSearch(e.target.value)}
                    className="flex-1"
                  />
                </div>

                <div className="border rounded-lg max-h-64 overflow-y-auto">
                  {bookings
                    .filter((booking: Booking) => {
                      if (!bookingSearch) return true;
                      const search = bookingSearch.toLowerCase();
                      return (
                        booking.clientName?.toLowerCase().includes(search) ||
                        booking.venue?.toLowerCase().includes(search) ||
                        booking.eventType?.toLowerCase().includes(search)
                      );
                    })
                    .map((booking: Booking) => (
                      <div
                        key={booking.id}
                        className={cn(
                          "p-3 border-b hover:bg-gray-50 cursor-pointer transition-colors",
                          selectedBookingId === booking.id && "bg-blue-50 hover:bg-blue-100"
                        )}
                        onClick={() => setSelectedBookingId(booking.id)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{booking.clientName || 'Unknown Client'}</p>
                            <p className="text-sm text-gray-600">
                              {booking.eventType || 'Event'} 
                              {booking.venue && ` at ${booking.venue}`}
                            </p>
                            {booking.eventDate && (
                              <p className="text-sm text-gray-500">
                                {new Date(booking.eventDate).toLocaleDateString('en-GB', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </p>
                            )}
                          </div>
                          {booking.status && (
                            <Badge variant="outline" className="text-xs">
                              {booking.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => {
                    if (selectedBookingId && linkingMessage) {
                      linkToBookingMutation.mutate({
                        messageId: linkingMessage.id,
                        bookingId: selectedBookingId
                      });
                    }
                  }}
                  disabled={!selectedBookingId || linkToBookingMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <Link2 className="w-4 h-4" />
                  Link to Selected Booking
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setLinkingMessage(null);
                    setSelectedBookingId(null);
                    setBookingSearch("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      </div>
    </Layout>
  );
}