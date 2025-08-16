import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Eye, Trash2, ArrowRight, Calendar, Reply, MessageCircle, AlertTriangle, Bell, Clock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Layout } from "@/components/layout";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";

interface MessageNotification {
  id: number;
  userId: string;
  bookingId: number;
  senderEmail: string;
  subject: string;
  messageUrl: string;
  isRead: boolean;
  createdAt: string;
  // Booking details
  clientName: string | null;
  eventDate: string | null;
  venue: string | null;
}

interface UnparseableMessage {
  id: number;
  source: string;
  fromContact: string;
  rawMessage: string;
  clientAddress?: string;
  parsingErrorDetails?: string;
  status: string;
  reviewNotes?: string;
  convertedToBookingId?: number;
  createdAt: string;
  reviewedAt?: string;
}

export default function Messages() {
  const [selectedUnparseableMessage, setSelectedUnparseableMessage] = useState<UnparseableMessage | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [activeTab, setActiveTab] = useState("client-messages");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const { user } = useAuth();

  // Fetch client messages
  const { data: clientMessages = [], isLoading: clientMessagesLoading, error: clientMessagesError } = useQuery({
    queryKey: ['notifications', 'messages', user?.id],
    queryFn: () => apiRequest(`/api/notifications/messages`),
    enabled: !!user?.id,
  });

  // Debug logging
  console.log('🔍 CLIENT DEBUG - User:', user?.id, 'Messages:', clientMessages?.length, 'Loading:', clientMessagesLoading, 'Error:', clientMessagesError);

  // Fetch unparseable messages
  const { data: unparseableMessages = [], isLoading: unparseableLoading } = useQuery({
    queryKey: ['/api/unparseable-messages'],
    queryFn: async () => {
      const response = await apiRequest('/api/unparseable-messages');
      return await response.json();
    }
  });

  // Mark client message as read mutation
  const markClientMessageAsReadMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/notifications/messages/${id}/read`, {
      method: 'PATCH'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'messages'] });
      toast({
        title: "Message marked as read",
        description: "The notification has been marked as read.",
      });
    },
  });

  // Delete client message mutation  
  const deleteClientMessageMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/notifications/messages/${id}`, {
      method: 'DELETE'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'messages'] });
      toast({
        title: "Message deleted",
        description: "The notification has been removed.",
      });
    },
  });

  // Mark unparseable as reviewed mutation
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
      setSelectedUnparseableMessage(null);
      setReviewNotes("");
      toast({
        title: "Message Reviewed",
        description: "Message marked as reviewed successfully"
      });
    }
  });

  // Convert to booking mutation
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/unparseable-messages'] });
      setSelectedUnparseableMessage(null);
      setReviewNotes("");
      toast({
        title: "Message Converted",
        description: "Message successfully converted to booking"
      });
      if (data.bookingId) {
        navigate(`/bookings?highlight=${data.bookingId}`);
      }
    }
  });

  const handleViewClientMessage = async (message: MessageNotification) => {
    // Mark as read if not already read
    if (!message.isRead) {
      markClientMessageAsReadMutation.mutate(message.id);
    }
    
    // Open the message in a new tab (stored in cloud storage)
    const messageUrl = `https://pub-446248abf8164fb99bee2fc3dc3c513c.r2.dev/${message.messageUrl}`;
    window.open(messageUrl, '_blank');
  };

  const clientUnreadCount = Array.isArray(clientMessages) ? clientMessages.filter((m: MessageNotification) => !m.isRead).length : 0;
  const unparseableUnreadCount = Array.isArray(unparseableMessages) ? unparseableMessages.filter((m: UnparseableMessage) => m.status === 'new').length : 0;

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Messages</h1>
          <div className="flex items-center gap-2">
            {clientUnreadCount > 0 && (
              <Badge className="text-xs bg-green-500 text-black hover:bg-green-600">
                {clientUnreadCount} unread client messages
              </Badge>
            )}
            {unparseableUnreadCount > 0 && (
              <Badge className="text-xs bg-green-500 text-black hover:bg-green-600">
                {unparseableUnreadCount} new unparseable messages
              </Badge>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="client-messages" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Client Messages
              {clientUnreadCount > 0 && (
                <Badge className="h-5 text-xs ml-1 bg-green-500 text-black hover:bg-green-600">
                  {clientUnreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="unparseable" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Unparseable Messages
              {unparseableUnreadCount > 0 && (
                <Badge className="h-5 text-xs ml-1 bg-green-500 text-black hover:bg-green-600">
                  {unparseableUnreadCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="client-messages" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Client Messages
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Replies from clients to your booking-related emails
                </p>
              </CardHeader>
              <CardContent>
                {clientMessagesLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-muted-foreground">Loading messages...</p>
                  </div>
                ) : !Array.isArray(clientMessages) || clientMessages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No client messages yet</p>
                    <p className="text-sm">Client replies to your emails will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {clientMessages.map((message: MessageNotification) => (
                      <div
                        key={message.id}
                        className={`p-4 border rounded-lg ${
                          message.isRead 
                            ? 'bg-background border-border' 
                            : 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-sm truncate">
                                {message.subject}
                              </p>
                              {!message.isRead && (
                                <Badge variant="default" className="h-4 text-xs">New</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-1">
                              From: {message.senderEmail}
                            </p>
                            {message.clientName && (
                              <p className="text-sm font-medium text-primary mb-1">
                                Client: {message.clientName}
                              </p>
                            )}
                            {message.eventDate && (
                              <p className="text-sm text-muted-foreground mb-1">
                                Booking: {new Date(message.eventDate).toLocaleDateString()} 
                                {message.venue && ` at ${message.venue}`}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Booking #{message.bookingId} • Received: {new Date(message.createdAt).toLocaleDateString()} {new Date(message.createdAt).toLocaleTimeString()}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewClientMessage(message)}
                              className="h-8"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteClientMessageMutation.mutate(message.id)}
                              disabled={deleteClientMessageMutation.isPending}
                              className="h-8 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="unparseable" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Unparseable Messages
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Messages that couldn't be automatically processed into bookings
                </p>
              </CardHeader>
              <CardContent>
                {unparseableLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-muted-foreground">Loading messages...</p>
                  </div>
                ) : !Array.isArray(unparseableMessages) || unparseableMessages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No unparseable messages</p>
                    <p className="text-sm">Messages that can't be processed automatically will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {unparseableMessages.map((message: UnparseableMessage) => (
                      <div
                        key={message.id}
                        className={cn(
                          "p-4 border rounded-lg cursor-pointer transition-all",
                          message.status === 'new' ? 'border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800' : 'border-gray-200 bg-gray-50 dark:bg-gray-900 dark:border-gray-700',
                          selectedUnparseableMessage?.id === message.id && 'ring-2 ring-primary'
                        )}
                        onClick={() => setSelectedUnparseableMessage(message)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant={message.status === 'new' ? 'destructive' : 'secondary'}>
                                {message.status}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {message.source}
                              </span>
                            </div>
                            <p className="font-medium text-sm mb-1">
                              From: {message.fromContact}
                            </p>
                            <p className="text-xs text-muted-foreground mb-2">
                              {new Date(message.createdAt).toLocaleDateString()} {new Date(message.createdAt).toLocaleTimeString()}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                              {message.rawMessage?.substring(0, 150)}...
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Message Detail Panel for Unparseable Messages */}
            {selectedUnparseableMessage && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Message Details</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedUnparseableMessage(null)}
                    >
                      Close
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">From:</label>
                      <p className="text-sm text-muted-foreground">{selectedUnparseableMessage.fromContact}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Source:</label>
                      <p className="text-sm text-muted-foreground">{selectedUnparseableMessage.source}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Status:</label>
                      <Badge variant={selectedUnparseableMessage.status === 'new' ? 'destructive' : 'secondary'}>
                        {selectedUnparseableMessage.status}
                      </Badge>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Received:</label>
                      <p className="text-sm text-muted-foreground">
                        {new Date(selectedUnparseableMessage.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Full Message:</label>
                    <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-900 rounded-md text-sm">
                      {selectedUnparseableMessage.rawMessage}
                    </div>
                  </div>

                  {selectedUnparseableMessage.parsingErrorDetails && (
                    <div>
                      <label className="text-sm font-medium">Parsing Error:</label>
                      <div className="mt-1 p-3 bg-red-50 dark:bg-red-950 rounded-md text-sm text-red-700 dark:text-red-300">
                        {selectedUnparseableMessage.parsingErrorDetails}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium">Review Notes:</label>
                    <Textarea
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Add notes about this message..."
                      className="mt-1"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => markAsReviewedMutation.mutate({ 
                        id: selectedUnparseableMessage.id, 
                        notes: reviewNotes 
                      })}
                      disabled={markAsReviewedMutation.isPending}
                      variant="outline"
                    >
                      Mark as Reviewed
                    </Button>
                    <Button
                      onClick={() => convertToBookingMutation.mutate({ 
                        id: selectedUnparseableMessage.id, 
                        notes: reviewNotes 
                      })}
                      disabled={convertToBookingMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      <Calendar className="w-4 h-4" />
                      Convert to Booking
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}