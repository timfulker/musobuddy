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
// AI token usage component removed - unlimited AI usage for all users
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
  const [contextInput, setContextInput] = useState('');
  const [showContextInput, setShowContextInput] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  // AI token usage state removed - unlimited AI usage for all users
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
  const { data: conversationData, isLoading: messagesLoading, refetch: refetchMessages } = useQuery({
    queryKey: ['/api/conversations', bookingId],
    queryFn: async () => {
      const response = await apiRequest(`/api/conversations/${bookingId}`);
      return await response.json();
    },
    enabled: !!bookingId,
  });

  // Extract messages and unread notification IDs from response
  const conversationMessages = conversationData?.messages || [];
  const unreadNotificationIds = conversationData?.unreadNotificationIds || [];
  const hasUnreadNotifications = unreadNotificationIds.length > 0;

  // Create full message list including original client inquiry
  const originalInquiryContent = booking?.originalEmailContent || booking?.notes;
  const originalInquiry = originalInquiryContent ? [{
    id: 0, // Use ID 0 for the original inquiry
    bookingId: booking?.id || 0,
    fromEmail: booking?.clientEmail || '',
    toEmail: '', // Not applicable for original inquiry
    subject: `Original Inquiry - ${booking?.eventType || 'Booking Request'}`,
    content: originalInquiryContent,
    messageType: 'incoming' as const,
    sentAt: booking?.createdAt || new Date().toISOString(),
    isRead: true
  }] : [];
  
  // Combine original inquiry with conversation messages
  const messages: ConversationMessage[] = [...originalInquiry, ...conversationMessages];

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

  // Ignore messages mutation
  const ignoreMessagesMutation = useMutation({
    mutationFn: async (bookingId: number) => {
      const response = await apiRequest('/api/conversations/ignore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      });
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Messages ignored",
        description: `${data.markedAsRead || 0} message notifications have been marked as read.`,
      });
      refetchMessages();
      queryClient.invalidateQueries({ queryKey: ['notifications', 'messages'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to ignore messages",
        description: error.message || "Something went wrong while ignoring the messages.",
        variant: "destructive",
      });
    },
  });

  const handleIgnoreMessages = () => {
    if (!bookingId) {
      toast({
        title: "Cannot ignore messages",
        description: "Booking ID is missing.",
        variant: "destructive",
      });
      return;
    }

    ignoreMessagesMutation.mutate(bookingId);
  };

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
      console.log('🤖 Starting AI response generation...');
      
      // Get last 4 messages for context (cost-effective while maintaining quality)
      const lastFourMessages = messages.slice(-4);
      const conversationContext = lastFourMessages.length > 0 
        ? `Recent conversation context:\n${lastFourMessages.map(msg => 
            `${msg.messageType === 'incoming' ? 'Client' : 'You'}: ${msg.content}`
          ).join('\n')}`
        : '';

      // Use context input field instead of parsing from message
      const customContext = contextInput.trim();

      const response = await apiRequest('/api/ai/generate-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          action: 'respond',
          customPrompt: `Generate a contextually appropriate response for this ongoing conversation with ${booking.clientName} regarding their ${booking.eventType} booking. Consider the conversation history and respond appropriately to their latest message.${customContext ? ` Additional context: ${customContext}` : ''}`,
          tone: 'professional',
          contextualInfo: conversationContext
        }),
      });
      
      console.log('🤖 AI response received:', response);
      
      const aiResponse = await response.json();
      console.log('🤖 AI response data:', aiResponse);
      
      // Check if this was a token limit error
      if (response.status === 429 && aiResponse.error?.includes('token limit')) {
        setTokenUsage({
          percentage: 100,
          status: 'exceeded',
          message: 'Monthly AI limit exceeded. Upgrade for unlimited responses.',
          tokensUsed: aiResponse.usage?.tokensUsed || 0,
          monthlyLimit: aiResponse.usage?.monthlyLimit || 50000
        });
        
        toast({
          title: "AI Token Limit Exceeded",
          description: "You've reached your monthly AI usage limit. Contact support to upgrade your plan.",
          variant: "destructive",
        });
        
        return;
      }
      
      // The AI response should contain emailBody field
      const content = aiResponse.emailBody || '';

      console.log('🤖 Extracted content:', content);
      
      if (content) {
        setReplyContent(content);
        // Clear context input after successful generation
        setContextInput('');
        setShowContextInput(false);
        // Refresh token usage after successful generation
        fetchTokenUsage();
        toast({
          title: "AI response generated",
          description: "The message has been generated. Feel free to edit before sending.",
        });
      } else {
        toast({
          title: "AI response empty",
          description: "The AI generated a response but it appears to be empty.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('🤖 AI generation error:', error);
      toast({
        title: "Failed to generate response",
        description: error.message || "Could not generate AI response",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Fetch current token usage
  const fetchTokenUsage = async () => {
    try {
      const response = await apiRequest('/api/token-usage');
      const data = await response.json();
      setTokenUsage(data);
    } catch (error) {
      console.error('Failed to fetch token usage:', error);
    }
  };

  // Fetch token usage on component mount
  useEffect(() => {
    if (user) {
      fetchTokenUsage();
    }
  }, [user]);

  // Apply template to reply content
  const handleTemplateSelect = (template: any) => {
    if (!booking) return;
    
    console.log('🔍 Template selected:', template);
    console.log('🔍 All template fields:', Object.keys(template));
    console.log('🔍 Booking data:', booking);
    
    // Get the template content from the correct field (emailBody is the main field)
    let content = template.emailBody || 
                  template.content || 
                  template.emailContent || 
                  template.template || 
                  template.body || 
                  template.text || 
                  template.message || 
                  template.emailTemplate ||
                  template.htmlContent ||
                  '';
    
    console.log('🔍 Original template content:', content);
    console.log('🔍 Content field used:', 
      template.emailBody ? 'emailBody' :
      template.content ? 'content' :
      template.emailContent ? 'emailContent' :
      template.template ? 'template' :
      template.body ? 'body' :
      template.text ? 'text' :
      template.message ? 'message' :
      template.emailTemplate ? 'emailTemplate' :
      template.htmlContent ? 'htmlContent' :
      'NONE FOUND'
    );
    
    // If no content found, show a helpful message
    if (!content) {
      toast({
        title: "Template has no content",
        description: "This template appears to be empty. Please check the template in your settings.",
        variant: "destructive",
      });
      setShowTemplates(false);
      return;
    }
    
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

        {/* Unread Messages Notification */}
        {hasUnreadNotifications && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                  <div>
                    <p className="font-medium text-orange-800">
                      You have {unreadNotificationIds.length} unread message{unreadNotificationIds.length > 1 ? 's' : ''} from this client
                    </p>
                    <p className="text-sm text-orange-600">
                      Reply to the message or mark as ignored to remove from your notifications.
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleIgnoreMessages}
                  disabled={ignoreMessagesMutation.isPending}
                  className="border-orange-300 text-orange-700 hover:bg-orange-100"
                >
                  {ignoreMessagesMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 mr-2 animate-spin border-2 border-orange-600 border-t-transparent rounded-full" />
                      Ignoring...
                    </>
                  ) : (
                    'Ignore Messages'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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
                  {messages.map((message: ConversationMessage) => {
                    const isOriginalInquiry = message.id === 0;
                    return (
                      <div
                        key={message.id}
                        className={`flex ${message.messageType === 'outgoing' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-4 ${
                            message.messageType === 'outgoing'
                              ? 'bg-blue-100 text-blue-900 border border-blue-200'
                              : isOriginalInquiry
                              ? 'bg-green-50 border border-green-200 relative'
                              : 'bg-gray-100 border'
                          }`}
                        >
                          {isOriginalInquiry && (
                            <div className="absolute -top-2 -left-2">
                              <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 text-xs">
                                Original Inquiry
                              </Badge>
                            </div>
                          )}
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium">
                              {message.messageType === 'outgoing' ? 'You' : booking.clientName}
                            </span>
                            <span className={`text-xs ${
                              message.messageType === 'outgoing' 
                                ? 'text-blue-600' 
                                : isOriginalInquiry 
                                ? 'text-green-600' 
                                : 'text-gray-500'
                            }`}>
                              {formatDate(message.sentAt, true)}
                            </span>
                          </div>
                          {message.subject && (
                            <div className={`text-sm font-medium mb-2 ${
                              message.messageType === 'outgoing' 
                                ? 'text-blue-700' 
                                : isOriginalInquiry 
                                ? 'text-green-700' 
                                : 'text-gray-700'
                            }`}>
                              {isOriginalInquiry ? message.subject : `Re: ${message.subject}`}
                            </div>
                          )}
                          <div className="text-sm whitespace-pre-wrap">
                            {message.content}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Token Usage Display */}
        {/* AI token usage removed - unlimited AI usage for all users */}

        {/* Reply Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Send className="w-5 h-5" />
              <span>Send Reply</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded">
              💡 AI uses the last 4 messages for context. Use "Add Context" button for extra information.
            </div>
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

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowContextInput(!showContextInput)}
                className={showContextInput ? 'bg-blue-50 border-blue-200' : ''}
              >
                💡 Add Context
              </Button>
            </div>

            {/* AI Context Input */}
            {showContextInput && (
              <div className="mb-4 p-4 border rounded-lg bg-blue-50">
                <div className="mb-2">
                  <h4 className="font-medium text-sm text-blue-800">Additional Context for AI</h4>
                  <p className="text-xs text-blue-600">
                    Provide extra information to help AI generate a better response (e.g., "Client wants to discuss equipment requirements", "This is a follow-up to our phone call")
                  </p>
                </div>
                <Textarea
                  placeholder="Add context about the situation, client needs, or any specific requirements..."
                  value={contextInput}
                  onChange={(e) => setContextInput(e.target.value)}
                  rows={2}
                  className="resize-none bg-white"
                />
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setShowContextInput(false);
                      setContextInput('');
                    }}
                    variant="ghost"
                  >
                    Clear & Close
                  </Button>
                </div>
              </div>
            )}

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
                {/* Show ignore button when there are unread notifications */}
                {hasUnreadNotifications && (
                  <Button
                    variant="secondary"
                    onClick={handleIgnoreMessages}
                    disabled={ignoreMessagesMutation.isPending}
                    className="text-gray-600"
                  >
                    {ignoreMessagesMutation.isPending ? (
                      <>
                        <div className="w-4 h-4 mr-2 animate-spin border-2 border-gray-600 border-t-transparent rounded-full" />
                        Ignoring...
                      </>
                    ) : (
                      'Ignore'
                    )}
                  </Button>
                )}
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