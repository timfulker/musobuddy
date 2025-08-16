import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { MessageSquare, Mail, Phone, ChevronDown, ChevronRight, Calendar, User, Tag } from 'lucide-react';
import { format } from 'date-fns';

interface CommunicationHistoryProps {
  bookingId?: number;
  clientEmail?: string;
  showHeader?: boolean;
}

interface Communication {
  id: number;
  userId: string;
  bookingId: number | null;
  clientName: string;
  clientEmail: string;
  communicationType: 'email' | 'sms' | 'phone';
  direction: 'inbound' | 'outbound';
  templateId: number | null;
  templateName: string | null;
  templateCategory: string | null;
  subject: string | null;
  messageBody: string;
  attachments: string;
  deliveryStatus: string;
  sentAt: string;
  readAt: string | null;
  repliedAt: string | null;
}

export function CommunicationHistory({ bookingId, clientEmail, showHeader = true }: CommunicationHistoryProps) {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  // Build query URL based on props
  const queryUrl = bookingId 
    ? `/api/communications/booking/${bookingId}`
    : clientEmail 
    ? `/api/communications/client/${encodeURIComponent(clientEmail)}`
    : '/api/communications';

  const { data: communications = [], isLoading, error } = useQuery({
    queryKey: [queryUrl, bookingId, clientEmail],
    enabled: !!queryUrl, // Only run query when we have a valid URL
  });

  // Debug logging
  console.log('Communication History Debug:', {
    queryUrl,
    bookingId,
    clientEmail,
    isLoading,
    error,
    communications: communications?.length
  });

  const toggleExpanded = (id: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const getCommunicationIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="w-4 h-4" />;
      case 'sms':
        return <MessageSquare className="w-4 h-4" />;
      case 'phone':
        return <Phone className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getDirectionColor = (direction: string) => {
    return direction === 'outbound' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
  };

  const getCategoryColor = (category: string | null) => {
    if (!category) return 'bg-gray-100 text-gray-800';
    
    switch (category) {
      case 'thank_you':
        return 'bg-purple-100 text-purple-800';
      case 'booking':
        return 'bg-blue-100 text-blue-800';
      case 'invoice':
        return 'bg-yellow-100 text-yellow-800';
      case 'contract':
        return 'bg-red-100 text-red-800';
      case 'reminder':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <Card>
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Communication History
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <MessageSquare className="w-5 h-5" />
              Communication History - Error
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <p className="text-red-600">Failed to load communication history</p>
        </CardContent>
      </Card>
    );
  }

  if (communications.length === 0) {
    return (
      <Card>
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Communication History
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <p className="text-gray-500 text-center py-4">No communication history found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {showHeader && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Communication History ({communications.length})
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="space-y-3">
        {communications.map((comm: Communication) => (
          <div key={comm.id} className="border rounded-lg p-3">
            <Collapsible
              open={expandedItems.has(comm.id)}
              onOpenChange={() => toggleExpanded(comm.id)}
            >
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                  <div className="flex items-center gap-3 text-left">
                    <div className="flex items-center gap-2">
                      {getCommunicationIcon(comm.communicationType)}
                      <Badge variant="secondary" className={getDirectionColor(comm.direction)}>
                        {comm.direction}
                      </Badge>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate max-w-[300px]">
                          {comm.subject || 'No subject'}
                        </span>
                        {comm.templateCategory && (
                          <Badge variant="outline" className={`text-xs ${getCategoryColor(comm.templateCategory)}`}>
                            {comm.templateCategory.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {comm.clientName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(comm.sentAt), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                    </div>
                  </div>
                  {expandedItems.has(comm.id) ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="mt-3">
                <Separator className="mb-3" />
                
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">To:</span> {comm.clientEmail}
                    </div>
                    <div>
                      <span className="font-medium">Type:</span> {comm.communicationType.toUpperCase()}
                    </div>
                    <div>
                      <span className="font-medium">Status:</span> 
                      <Badge variant="outline" className="ml-1 text-xs">
                        {comm.deliveryStatus}
                      </Badge>
                    </div>
                    {comm.templateName && (
                      <div>
                        <span className="font-medium">Template:</span> {comm.templateName}
                      </div>
                    )}
                  </div>
                  
                  {comm.subject && (
                    <div>
                      <span className="font-medium text-sm">Subject:</span>
                      <p className="mt-1 text-sm bg-gray-50 p-2 rounded border">
                        {comm.subject}
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <span className="font-medium text-sm">Message:</span>
                    <div className="mt-1 text-sm bg-gray-50 p-3 rounded border max-h-60 overflow-y-auto">
                      <div dangerouslySetInnerHTML={{ __html: comm.messageBody }} />
                    </div>
                  </div>
                  
                  {comm.attachments && comm.attachments !== '[]' && (
                    <div>
                      <span className="font-medium text-sm">Attachments:</span>
                      <p className="mt-1 text-sm text-gray-600">
                        {JSON.parse(comm.attachments).length} attachment(s)
                      </p>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}