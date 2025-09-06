import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import { MessageSquare, Eye, Trash2, ArrowRight, Calendar, Reply, MessageCircle, AlertTriangle, Bell, Clock, Zap, CheckSquare, Square, Link2, Search } from "lucide-react";
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
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<number>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [linkingMessage, setLinkingMessage] = useState<UnparseableMessage | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [bookingSearch, setBookingSearch] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const { user } = useAuth();

  // Force white text on reprocess button
  React.useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .reprocess-button-override {
        color: white !important;
        -webkit-text-fill-color: white !important;
      }
      .reprocess-button-override:hover {
        color: white !important;
        -webkit-text-fill-color: white !important;
      }
      .reprocess-button-override:disabled {
        color: rgba(255, 255, 255, 0.5) !important;
        -webkit-text-fill-color: rgba(255, 255, 255, 0.5) !important;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // More robust user ID detection
  const userId = user?.id || user?.userId || (user as any)?.user_id;
  
  // Fetch client messages
  const { data: clientMessages = [], isLoading: clientMessagesLoading, error: clientMessagesError } = useQuery({
    queryKey: ['notifications', 'messages', userId],
    queryFn: async () => {
      const response = await apiRequest(`/api/notifications/messages`);
      return await response.json();
    },
    enabled: !!userId,
  });

  // Debug logging (can be removed once stable)
  // console.log('🔍 CLIENT DEBUG - Messages:', clientMessages?.length, 'Loading:', clientMessagesLoading);

  // Fetch unparseable messages
  const { data: unparseableMessages = [], isLoading: unparseableLoading } = useQuery({
    queryKey: ['/api/unparseable-messages'],
    queryFn: async () => {
      const response = await apiRequest('/api/unparseable-messages');
      return await response.json();
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

  // Dismiss client message notification (hide from messages view but keep data)
  const dismissClientMessageMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/notifications/messages/${id}/dismiss`, {
      method: 'PATCH'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'messages'] });
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

  // Reprocess with AI mutation
  const reprocessWithAIMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/unparseable-messages/${id}/reprocess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/unparseable-messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      setSelectedUnparseableMessage(null);
      setReviewNotes("");
      toast({
        title: "AI Processing Complete",
        description: `Message successfully processed and converted to booking #${data.bookingId}`,
        duration: 5000
      });
      if (data.bookingId) {
        navigate(`/bookings?highlight=${data.bookingId}`);
      }
    },
    onError: (error: any) => {
      toast({
        title: "AI Processing Failed",
        description: error.message || "Failed to process message with AI. Please try manual conversion.",
        variant: "destructive"
      });
    }
  });

  // Delete unparseable message mutation
  const deleteUnparseableMessageMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/unparseable-messages/${id}`, {
      method: 'DELETE'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/unparseable-messages'] });
      toast({
        title: "Message deleted",
        description: "The unparseable message has been removed.",
      });
    },
  });

  // Link to booking mutation
  const linkToBookingMutation = useMutation({
    mutationFn: async ({ messageId, bookingId }: { messageId: number; bookingId: number }) => {
      const response = await apiRequest(`/api/unparseable-messages/${messageId}/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId })
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/unparseable-messages'] });
      setLinkingMessage(null);
      setSelectedBookingId(null);
      setBookingSearch("");
      toast({
        title: "Message Linked",
        description: "Message successfully linked to booking"
      });
    },
    onError: () => {
      toast({
        title: "Link Failed",
        description: "Failed to link message to booking",
        variant: "destructive"
      });
    }
  });

  // Bulk reprocess with AI
  const bulkReprocessWithAI = async () => {
    if (selectedMessageIds.size === 0) {
      toast({
        title: "No messages selected",
        description: "Please select messages to reprocess",
        variant: "destructive"
      });
      return;
    }

    setIsBulkProcessing(true);
    const total = selectedMessageIds.size;
    let processed = 0;
    let successful = 0;
    let failed = 0;

    toast({
      title: "Processing messages",
      description: `Starting to process ${total} message${total > 1 ? 's' : ''}...`,
    });

    for (const messageId of selectedMessageIds) {
      try {
        const response = await apiRequest(`/api/unparseable-messages/${messageId}/reprocess`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        const data = await response.json();
        
        if (data.bookingId) {
          successful++;
        }
        processed++;

        // Update progress
        if (processed % 3 === 0 || processed === total) {
          toast({
            title: "Processing progress",
            description: `Processed ${processed}/${total} messages (${successful} successful)`,
          });
        }
      } catch (error) {
        failed++;
        processed++;
        console.error(`Failed to process message ${messageId}:`, error);
      }
    }

    setIsBulkProcessing(false);
    setSelectedMessageIds(new Set());
    
    queryClient.invalidateQueries({ queryKey: ['/api/unparseable-messages'] });
    queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });

    toast({
      title: "Bulk processing complete",
      description: `Processed ${total} messages: ${successful} converted to bookings, ${failed} failed`,
      variant: successful > 0 ? "default" : "destructive",
      duration: 5000
    });
  };

  const toggleMessageSelection = (id: number) => {
    const newSelection = new Set(selectedMessageIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedMessageIds(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedMessageIds.size === unparseableMessages.length) {
      setSelectedMessageIds(new Set());
    } else {
      const allIds = new Set(unparseableMessages.map((m: UnparseableMessage) => m.id));
      setSelectedMessageIds(allIds);
    }
  };

  const handleViewClientMessage = async (message: MessageNotification) => {
    // Dismiss the notification (hide from messages view but keep data for conversation)
    dismissClientMessageMutation.mutate(message.id);
    
    // Navigate to conversation page
    navigate(`/conversation/${message.bookingId}`);
  };

  const clientUnreadCount = Array.isArray(clientMessages) ? clientMessages.filter((m: MessageNotification) => !m.isRead).length : 0;
  const unparseableUnreadCount = Array.isArray(unparseableMessages) ? unparseableMessages.filter((m: UnparseableMessage) => m.status === 'new').length : 0;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
            <p className="text-muted-foreground">Manage client messages and email parsing</p>
          </div>
          <div className="flex items-center gap-3">
            {clientUnreadCount > 0 && (
              <Badge variant="secondary" className="text-sm">
                {clientUnreadCount} unread client messages
              </Badge>
            )}
            {unparseableUnreadCount > 0 && (
              <Badge variant="secondary" className="text-sm">
                {unparseableUnreadCount} need review
              </Badge>
            )}
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Client Messages Card */}
          <Card className="h-fit">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <MessageCircle className="h-5 w-5 text-blue-600" />
                Client Messages
                {clientUnreadCount > 0 && (
                  <Badge variant="default" className="ml-2">
                    {clientUnreadCount}
                  </Badge>
                )}
              </CardTitle>
              <p className="text-muted-foreground">
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
                        className={cn(
                          "p-4 border rounded-lg transition-colors hover:bg-muted/50",
                          message.isRead 
                            ? 'bg-background border-border' 
                            : 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800'
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-sm truncate">
                                {message.subject || 'Client Reply Message'}
                              </h4>
                              {!message.isRead && (
                                <Badge variant="secondary" className="h-5 text-xs">
                                  New
                                </Badge>
                              )}
                            </div>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <p>From: {message.senderEmail}</p>
                              {message.clientName && (
                                <p className="font-medium text-foreground">
                                  Client: {message.clientName}
                                </p>
                              )}
                              {message.eventDate && (
                                <p>
                                  Booking: {new Date(message.eventDate).toLocaleDateString()} 
                                  {message.venue && ` at ${message.venue}`}
                                </p>
                              )}
                              <p className="text-xs">
                                Booking #{message.bookingId} • {new Date(message.createdAt).toLocaleDateString()} {new Date(message.createdAt).toLocaleTimeString()}
                              </p>
                            </div>
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

          {/* Review Queue Card */}
          <Card className="h-fit">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                Review Queue
                {unparseableUnreadCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {unparseableUnreadCount}
                  </Badge>
                )}
              </CardTitle>
              <p className="text-muted-foreground">
                Messages that couldn't be automatically processed into bookings
              </p>
              
              {/* Bulk Action Bar */}
              {unparseableMessages && unparseableMessages.length > 0 && (
                <div className="mt-4 flex items-center justify-between border-t pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleSelectAll}
                    className="text-xs"
                  >
                    {selectedMessageIds.size === unparseableMessages.length ? (
                      <>
                        <CheckSquare className="h-3 w-3 mr-1" />
                        Deselect All
                      </>
                    ) : (
                      <>
                        <Square className="h-3 w-3 mr-1" />
                        Select All
                      </>
                    )}
                  </Button>
                  
                  {selectedMessageIds.size > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {selectedMessageIds.size} selected
                      </span>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={bulkReprocessWithAI}
                        disabled={isBulkProcessing}
                        className="text-xs reprocess-button-override"
                      >
                        <Zap className="h-3 w-3 mr-1" />
                        {isBulkProcessing 
                          ? `Processing...` 
                          : `Reprocess ${selectedMessageIds.size} with AI`}
                      </Button>
                    </div>
                  )}
                </div>
              )}
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
                          "p-4 border rounded-lg transition-colors hover:bg-muted/50",
                          message.status === 'new' 
                            ? 'bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800' 
                            : 'bg-background border-border',
                          selectedUnparseableMessage?.id === message.id && 'ring-2 ring-primary'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          {/* Checkbox */}
                          <div className="pt-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleMessageSelection(message.id);
                              }}
                              className="hover:opacity-80 transition-opacity"
                            >
                              {selectedMessageIds.has(message.id) ? (
                                <CheckSquare className="h-5 w-5 text-primary" />
                              ) : (
                                <Square className="h-5 w-5 text-muted-foreground" />
                              )}
                            </button>
                          </div>
                          
                          {/* Message content - now clickable */}
                          <div 
                            className="flex-1 flex items-start justify-between cursor-pointer"
                            onClick={() => setSelectedUnparseableMessage(message)}
                          >
                            <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge variant={message.status === 'new' ? 'destructive' : 'secondary'}>
                                {message.status}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {message.source}
                              </span>
                            </div>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <p className="font-medium text-foreground">
                                From: {message.fromContact}
                              </p>
                              <p className="text-xs">
                                {new Date(message.createdAt).toLocaleDateString()} {new Date(message.createdAt).toLocaleTimeString()}
                              </p>
                              <p className="line-clamp-2">
                                {message.rawMessage?.substring(0, 150)}...
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedUnparseableMessage(message);
                              }}
                              className="h-8"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Review
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteUnparseableMessageMutation.mutate(message.id);
                              }}
                              disabled={deleteUnparseableMessageMutation.isPending}
                              className="h-8 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
        </div>

        {/* Message Detail Panel for Unparseable Messages */}
        {selectedUnparseableMessage && (
          <Card className="mt-6">
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
                      className="bg-gray-100 text-black border-gray-300 hover:bg-gray-200"
                    >
                      Mark as Reviewed
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setLinkingMessage(selectedUnparseableMessage);
                        setBookingSearch("");
                        setSelectedBookingId(null);
                        setSelectedUnparseableMessage(null);
                      }}
                      className="flex items-center gap-2 bg-gray-100 text-black border-gray-300 hover:bg-gray-200"
                    >
                      <Link2 className="w-4 h-4" />
                      Link to Booking
                    </Button>
                    <Button
                      onClick={() => reprocessWithAIMutation.mutate(selectedUnparseableMessage.id)}
                      disabled={reprocessWithAIMutation.isPending}
                      variant="secondary"
                      className="flex items-center gap-2 bg-gray-100 text-black border-gray-300 hover:bg-gray-200"
                    >
                      <Zap className="w-4 h-4" />
                      {reprocessWithAIMutation.isPending ? "Processing..." : "Reprocess with AI"}
                    </Button>
                    <Button
                      onClick={() => convertToBookingMutation.mutate({ 
                        id: selectedUnparseableMessage.id, 
                        notes: reviewNotes 
                      })}
                      disabled={convertToBookingMutation.isPending}
                      className="flex items-center gap-2 bg-gray-100 text-black border-gray-300 hover:bg-gray-200"
                    >
                      <Calendar className="w-4 h-4" />
                      Convert to Booking
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

      {/* Link to Booking Modal */}
      {linkingMessage && (
        <Dialog open={!!linkingMessage} onOpenChange={() => setLinkingMessage(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Link Message to Existing Booking</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 flex-1 overflow-hidden">
              <div className="flex-shrink-0">
                <p className="text-sm text-gray-600">
                  Message from: <strong>{linkingMessage.fromContact}</strong>
                </p>
                <div className="mt-2">
                  <Input
                    placeholder="Search bookings by client name, venue, event type..."
                    value={bookingSearch}
                    onChange={(e) => setBookingSearch(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="space-y-2">
                  {bookings
                    .sort((a: any, b: any) => {
                      // Sort by event date (newest first), then by ID (newest first)
                      if (a.eventDate && b.eventDate) {
                        return new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime();
                      }
                      if (a.eventDate && !b.eventDate) return -1;
                      if (!a.eventDate && b.eventDate) return 1;
                      return b.id - a.id;
                    })
                    .filter((booking: any) => {
                      if (!bookingSearch) return true;
                      const search = bookingSearch.toLowerCase();
                      return (
                        booking.clientName?.toLowerCase().includes(search) ||
                        booking.venue?.toLowerCase().includes(search) ||
                        booking.venueAddress?.toLowerCase().includes(search) ||
                        booking.eventType?.toLowerCase().includes(search) ||
                        booking.id?.toString().includes(search) ||
                        booking.status?.toLowerCase().includes(search) ||
                        booking.clientEmail?.toLowerCase().includes(search) ||
                        booking.clientPhone?.toLowerCase().includes(search) ||
                        booking.what3words?.toLowerCase().includes(search) ||
                        booking.clientAddress?.toLowerCase().includes(search)
                      );
                    })
                    .slice(0, 200)
                    .map((booking: any) => (
                      <div
                        key={booking.id}
                        className={cn(
                          "p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors",
                          selectedBookingId === booking.id && "border-blue-500 bg-blue-50"
                        )}
                        onClick={() => setSelectedBookingId(booking.id)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{booking.clientName || 'No name'}</p>
                              <span className="text-xs bg-gray-200 px-2 py-1 rounded">ID: {booking.id}</span>
                            </div>
                            <p className="text-sm text-gray-600">{booking.venueAddress || booking.venue || booking.clientAddress || 'No location'}</p>
                            <p className="text-sm text-gray-500">
                              {booking.eventDate ? new Date(booking.eventDate).toLocaleDateString() : 'No date'} • {booking.eventType || 'No event type'}
                            </p>
                            {(booking.what3words || booking.clientAddress) && (
                              <p className="text-sm text-blue-600 font-medium">
                                📍 {booking.what3words || booking.clientAddress}
                              </p>
                            )}
                            <p className="text-xs text-gray-400">
                              Created: {booking.createdAt ? new Date(booking.createdAt).toLocaleDateString() + ' ' + new Date(booking.createdAt).toLocaleTimeString() : 'Unknown'} 
                              {booking.clientEmail && ` • ${booking.clientEmail}`}
                            </p>
                          </div>
                          <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                            {booking.status || 'unknown'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div className="flex-shrink-0 flex gap-2 pt-4 border-t">
                <Button
                  onClick={() => {
                    if (selectedBookingId) {
                      linkToBookingMutation.mutate({
                        messageId: linkingMessage.id,
                        bookingId: selectedBookingId
                      });
                    }
                  }}
                  disabled={!selectedBookingId || linkToBookingMutation.isPending}
                  className="flex items-center gap-2 bg-gray-100 text-black border-gray-300 hover:bg-gray-200"
                >
                  <Link2 className="w-4 h-4" />
                  {linkToBookingMutation.isPending ? 'Linking...' : 'Link to Selected Booking'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setLinkingMessage(null)}
                  className="bg-gray-100 text-black border-gray-300 hover:bg-gray-200"
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