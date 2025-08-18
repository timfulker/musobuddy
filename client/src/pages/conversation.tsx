import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Send, MessageCircle, Calendar, MapPin, User, Clock, Mail, FileText, Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/layout";
import { useAuth } from "@/hooks/useAuth";
import { formatDate } from "@/lib/utils";

interface ConversationMessage {
  id: number;
  bookingId: number;
  fromEmail: string;
  toEmail: string;
  subject: string;
  content: string;
  messageType: 'incoming' | 'outgoing';
  sentAt: string;
  isRead: boolean;
}

interface BookingInfo {
  id: number;
  clientName: string;
  clientEmail: string;
  eventDate: string;
  venue: string;
  venueAddress: string;
  eventType: string;
  status: string;
}

export default function Conversation() {
  const [match, params] = useRoute("/conversation/:bookingId");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [replyContent, setReplyContent] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const bookingId = params?.bookingId ? parseInt(params.bookingId) : null;

  // Fetch booking info
  const { data: booking, isLoading: bookingLoading } = useQuery({
    queryKey: ['/api/bookings', bookingId],
    queryFn: async () => {
      const response = await apiRequest(`/api/bookings/${bookingId}`);
      return await response.json();
    },
    enabled: !!bookingId,
  });

  // Fetch conversation messages
  const { data: messages = [], isLoading: messagesLoading, refetch: refetchMessages } = useQuery({
    queryKey: ['/api/conversations', bookingId],
    queryFn: async () => {
      const response = await apiRequest(`/api/conversations/${bookingId}`);
      return await response.json();
    },
    enabled: !!bookingId,
  });

  // Fetch email templates
  const { data: templates = [] } = useQuery({
    queryKey: ['/api/templates', 'email'],
    queryFn: async () => {
      const response = await apiRequest('/api/templates?type=email');
      return await response.json();
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Send reply mutation
  const sendReplyMutation = useMutation({
    mutationFn: async (replyData: { bookingId: number; content: string; recipientEmail: string }) => {
      const response = await apiRequest('/api/conversations/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(replyData),
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Reply sent",
        description: "Your message has been sent to the client.",
      });
      setReplyContent("");
      setIsReplying(false);
      refetchMessages();
      queryClient.invalidateQueries({ queryKey: ['notifications', 'messages'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send reply",
        description: error.message || "Something went wrong while sending your reply.",
        variant: "destructive",
      });
    },
  });

  const handleSendReply = () => {
    if (!replyContent.trim() || !booking?.clientEmail || !bookingId) {
      toast({
        title: "Cannot send reply",
        description: "Please enter a message and ensure booking details are loaded.",
        variant: "destructive",
      });
      return;
    }

    sendReplyMutation.mutate({
      bookingId,
      content: replyContent.trim(),
      recipientEmail: booking.clientEmail,
    });
  };

  // Generate AI response based on booking context
  const generateAIResponse = async () => {
    if (!booking) return;
    
    setIsGeneratingAI(true);
    try {
      const contextData = {
        clientName: booking.clientName,
        eventDate: booking.eventDate,
        venue: booking.venue,
        venueAddress: booking.venueAddress,
        eventType: booking.eventType,
        status: booking.status,
        conversationHistory: messages.slice(-3).map(m => ({
          type: m.messageType,
          content: m.content
        }))
      };

      const response = await apiRequest('/api/ai/generate-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingContext: contextData,
          messageType: 'conversation_reply'
        }),
      });
      
      const aiResponse = await response.json();
      if (aiResponse.content) {
        setReplyContent(aiResponse.content);
        toast({
          title: "AI response generated",
          description: "The message has been generated. Feel free to edit before sending.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Failed to generate response",
        description: error.message || "Could not generate AI response",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Apply template to reply content
  const handleTemplateSelect = (template: any) => {
    if (!booking) return;
    
    console.log('🔍 Template selected:', template);
    console.log('🔍 Booking data:', booking);
    
    // Get the template content from the correct field
    let content = template.content || template.emailContent || template.template || '';
    
    console.log('🔍 Original template content:', content);
    
    // Replace template variables with booking data
    content = content.replace(/\{clientName\}/g, booking.clientName || '');
    content = content.replace(/\{eventDate\}/g, formatDate(booking.eventDate) || '');
    content = content.replace(/\{venue\}/g, booking.venue || '');
    content = content.replace(/\{eventType\}/g, booking.eventType || '');
    
    console.log('🔍 Processed template content:', content);
    
    setReplyContent(content);
    setShowTemplates(false);
    
    toast({
      title: "Template applied",
      description: `"${template.name}" template has been applied. Feel free to customize.`,
    });
  };

  if (!match) {
    navigate('/messages');
    return null;
  }

  if (bookingLoading || messagesLoading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!booking) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto p-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-gray-500">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Booking not found</h3>
                <p className="mb-4">The booking you're looking for doesn't exist or has been removed.</p>
                <Button onClick={() => navigate('/messages')} variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Messages
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/messages')}
              className="p-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Conversation</h1>
              <p className="text-gray-600">
                {booking.clientName} • {formatDate(booking.eventDate)}
              </p>
            </div>
          </div>
          <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
            {booking.status}
          </Badge>
        </div>

        {/* Booking Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Booking Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-gray-500" />
                <span className="font-medium">Client:</span>
                <span>{booking.clientName}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-gray-500" />
                <span className="font-medium">Email:</span>
                <span>{booking.clientEmail}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="font-medium">Date:</span>
                <span>{formatDate(booking.eventDate)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span className="font-medium">Venue:</span>
                <span>{booking.venue || 'TBC'}</span>
              </div>
              {booking.venueAddress && (
                <div className="flex items-center space-x-2 md:col-span-2">
                  <span className="font-medium">Address:</span>
                  <span>{booking.venueAddress}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Conversation Messages */}
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageCircle className="w-5 h-5" />
              <span>Conversation History</span>
              <Badge variant="outline">{messages.length} messages</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-96 p-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No messages yet</p>
                  <p className="text-sm">Start the conversation by sending a message below.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message: ConversationMessage) => (
                    <div
                      key={message.id}
                      className={`flex ${message.messageType === 'outgoing' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-4 ${
                          message.messageType === 'outgoing'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 border'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium">
                            {message.messageType === 'outgoing' ? 'You' : booking.clientName}
                          </span>
                          <span className={`text-xs ${message.messageType === 'outgoing' ? 'text-blue-100' : 'text-gray-500'}`}>
                            {formatDate(message.sentAt, true)}
                          </span>
                        </div>
                        {message.subject && (
                          <div className={`text-sm font-medium mb-2 ${message.messageType === 'outgoing' ? 'text-blue-100' : 'text-gray-700'}`}>
                            Re: {message.subject}
                          </div>
                        )}
                        <div className="text-sm whitespace-pre-wrap">
                          {message.content}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Reply Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Send className="w-5 h-5" />
              <span>Send Reply</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-600">
              Replying to: <span className="font-medium">{booking.clientEmail}</span>
            </div>
            <Textarea
              placeholder="Type your message here..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              rows={4}
              className="resize-none"
            />
            {/* Template and AI Helper Buttons */}
            <div className="flex flex-wrap gap-2 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTemplates(!showTemplates)}
                disabled={!templates.length}
              >
                <FileText className="w-4 h-4 mr-2" />
                Use Template
                {templates.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {templates.length}
                  </Badge>
                )}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={generateAIResponse}
                disabled={isGeneratingAI || !booking}
              >
                {isGeneratingAI ? (
                  <>
                    <div className="w-4 h-4 mr-2 animate-spin border-2 border-current border-t-transparent rounded-full" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    AI Response
                  </>
                )}
              </Button>
            </div>

            {/* Template Selection */}
            {showTemplates && templates.length > 0 && (
              <div className="mb-4 p-4 border rounded-lg bg-gray-50">
                <div className="mb-2">
                  <h4 className="font-medium text-sm">Select a template:</h4>
                </div>
                <div className="space-y-2">
                  {templates.map((template: any) => (
                    <Button
                      key={template.id}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTemplateSelect(template)}
                      className="w-full justify-start text-left h-auto p-3 hover:bg-white"
                    >
                      <div>
                        <div className="font-medium">{template.name}</div>
                        {template.description && (
                          <div className="text-xs text-gray-500 mt-1">
                            {template.description}
                          </div>
                        )}
                      </div>
                    </Button>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTemplates(false)}
                  className="mt-2 w-full"
                >
                  Cancel
                </Button>
              </div>
            )}

            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">
                {replyContent.length} characters
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setReplyContent("");
                    setIsReplying(false);
                  }}
                >
                  Clear
                </Button>
                <Button
                  onClick={handleSendReply}
                  disabled={!replyContent.trim() || sendReplyMutation.isPending}
                >
                  {sendReplyMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 mr-2 animate-spin border-2 border-white border-t-transparent rounded-full" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Reply
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}