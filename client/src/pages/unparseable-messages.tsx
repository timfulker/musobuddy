import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Eye, Trash2, ArrowRight, Calendar } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Layout } from "@/components/layout";

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

export default function UnparseableMessages() {
  const [selectedMessage, setSelectedMessage] = useState<UnparseableMessage | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['/api/unparseable-messages'],
    queryFn: async () => {
      const response = await apiRequest('/api/unparseable-messages');
      return await response.json();
    }
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'reviewed': return 'bg-blue-100 text-blue-800';
      case 'converted': return 'bg-green-100 text-green-800';
      case 'discarded': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
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
        <Badge variant="secondary" className="text-sm">
          {messages.length} message{messages.length !== 1 ? 's' : ''}
        </Badge>
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
          {messages.map((message: UnparseableMessage) => (
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
                  {new Date(message.createdAt).toLocaleDateString()}
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
                  
                  {message.status === 'pending' && (
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
                        onClick={() => deleteMutation.mutate(message.id)}
                        className="flex items-center gap-2 text-red-600 hover:text-red-700"
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
          ))}
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
                  onClick={() => convertToBookingMutation.mutate({ 
                    id: selectedMessage.id, 
                    notes: reviewNotes 
                  })}
                  disabled={convertToBookingMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <ArrowRight className="w-4 h-4" />
                  Convert to Booking
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
                  variant="ghost"
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
      </div>
    </Layout>
  );
}