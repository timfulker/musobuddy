import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { FileText, Mail, Calendar, AlertCircle, CheckCircle } from 'lucide-react';

interface ComplianceDocument {
  id: number;
  type: string;
  name: string;
  expiryDate: string | null;
  status: 'valid' | 'expiring' | 'expired';
  documentUrl: string;
}

interface Booking {
  id: number;
  title: string;
  clientName: string;
  clientEmail?: string;
  eventDate: string;
  venue: string;
}

interface SendComplianceDialogProps {
  booking: Booking;
  isOpen: boolean;
  onClose: () => void;
}

const getDocumentTypeLabel = (type: string): string => {
  switch (type) {
    case 'public_liability':
      return 'Public Liability Insurance';
    case 'pat_testing':
      return 'PAT Testing Certificate';
    case 'music_license':
      return 'Music License';
    default:
      return type;
  }
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'valid':
      return 'bg-green-100 text-green-800';
    case 'expiring':
      return 'bg-yellow-100 text-yellow-800';
    case 'expired':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'valid':
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    case 'expiring':
    case 'expired':
      return <AlertCircle className="w-4 h-4 text-red-600" />;
    default:
      return null;
  }
};

export function SendComplianceDialog({ booking, isOpen, onClose }: SendComplianceDialogProps) {
  const [selectedDocuments, setSelectedDocuments] = useState<number[]>([]);
  const [customMessage, setCustomMessage] = useState('');
  const [recipientEmail, setRecipientEmail] = useState(booking.clientEmail || '');
  const { toast } = useToast();

  // Fetch compliance documents
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['/api/compliance'],
    enabled: isOpen,
  });

  // Send compliance documents mutation
  const sendDocumentsMutation = useMutation({
    mutationFn: async (data: {
      bookingId: number;
      documentIds: number[];
      recipientEmail: string;
      customMessage: string;
    }) => {
      return apiRequest(`/api/bookings/${data.bookingId}/send-compliance`, {
        method: 'POST',
        body: JSON.stringify({
          documentIds: data.documentIds,
          recipientEmail: data.recipientEmail,
          customMessage: data.customMessage,
        }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Documents sent successfully",
        description: `Compliance documents have been sent to ${recipientEmail}`,
      });
      onClose();
      // Reset form
      setSelectedDocuments([]);
      setCustomMessage('');
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send documents",
        description: error.message || "An error occurred while sending compliance documents",
        variant: "destructive",
      });
    },
  });

  const handleDocumentToggle = (documentId: number) => {
    setSelectedDocuments(prev => 
      prev.includes(documentId)
        ? prev.filter(id => id !== documentId)
        : [...prev, documentId]
    );
  };

  const handleSelectAll = () => {
    const validDocuments = documents.filter((doc: ComplianceDocument) => doc.status === 'valid');
    setSelectedDocuments(validDocuments.map((doc: ComplianceDocument) => doc.id));
  };

  const handleDeselectAll = () => {
    setSelectedDocuments([]);
  };

  const handleSend = async () => {
    if (selectedDocuments.length === 0) {
      toast({
        title: "No documents selected",
        description: "Please select at least one document to send",
        variant: "destructive",
      });
      return;
    }

    if (!recipientEmail) {
      toast({
        title: "Email address required",
        description: "Please enter the recipient's email address",
        variant: "destructive",
      });
      return;
    }

    await sendDocumentsMutation.mutateAsync({
      bookingId: booking.id,
      documentIds: selectedDocuments,
      recipientEmail,
      customMessage,
    });
  };

  const validDocuments = documents.filter((doc: ComplianceDocument) => doc.status === 'valid');
  const expiredDocuments = documents.filter((doc: ComplianceDocument) => doc.status !== 'valid');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>Send Compliance Documents</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Booking Information */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2 mb-4">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="font-medium">Booking Details</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Event:</span>
                  <p className="font-medium">{booking.title}</p>
                </div>
                <div>
                  <span className="text-gray-500">Client:</span>
                  <p className="font-medium">{booking.clientName}</p>
                </div>
                <div>
                  <span className="text-gray-500">Date:</span>
                  <p className="font-medium">
                    {new Date(booking.eventDate).toLocaleDateString('en-GB', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Venue:</span>
                  <p className="font-medium">{booking.venue}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recipient Email */}
          <div className="space-y-2">
            <Label htmlFor="recipient-email" className="flex items-center space-x-2">
              <Mail className="w-4 h-4" />
              <span>Recipient Email</span>
            </Label>
            <Input
              id="recipient-email"
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="Enter recipient's email address"
              className="w-full"
            />
          </div>

          {/* Document Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Select Documents to Send</Label>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  disabled={validDocuments.length === 0}
                >
                  Select All Valid
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeselectAll}
                  disabled={selectedDocuments.length === 0}
                >
                  Deselect All
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-gray-500">Loading compliance documents...</div>
              </div>
            ) : (
              <div className="space-y-3">
                {validDocuments.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-green-700">Valid Documents</h4>
                    {validDocuments.map((document: ComplianceDocument) => (
                      <div key={document.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                        <Checkbox
                          id={`document-${document.id}`}
                          checked={selectedDocuments.includes(document.id)}
                          onCheckedChange={() => handleDocumentToggle(document.id)}
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <FileText className="w-4 h-4 text-gray-500" />
                            <Label htmlFor={`document-${document.id}`} className="font-medium cursor-pointer">
                              {document.name}
                            </Label>
                            <Badge className={getStatusColor(document.status)}>
                              {getStatusIcon(document.status)}
                              <span className="ml-1">{document.status}</span>
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            {getDocumentTypeLabel(document.type)}
                            {document.expiryDate && (
                              <span className="ml-2">
                                • Expires: {new Date(document.expiryDate).toLocaleDateString('en-GB')}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {expiredDocuments.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-red-700">Expired/Expiring Documents</h4>
                    {expiredDocuments.map((document: ComplianceDocument) => (
                      <div key={document.id} className="flex items-center space-x-3 p-3 border rounded-lg opacity-60">
                        <Checkbox
                          id={`document-${document.id}`}
                          checked={false}
                          disabled={true}
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <FileText className="w-4 h-4 text-gray-500" />
                            <Label className="font-medium text-gray-600">
                              {document.name}
                            </Label>
                            <Badge className={getStatusColor(document.status)}>
                              {getStatusIcon(document.status)}
                              <span className="ml-1">{document.status}</span>
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            {getDocumentTypeLabel(document.type)}
                            {document.expiryDate && (
                              <span className="ml-2">
                                • Expires: {new Date(document.expiryDate).toLocaleDateString('en-GB')}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {documents.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p>No compliance documents found</p>
                    <p className="text-sm">Upload documents in the Compliance section first</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Custom Message */}
          <div className="space-y-2">
            <Label htmlFor="custom-message">Custom Message (Optional)</Label>
            <Textarea
              id="custom-message"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Add a personal message to accompany the compliance documents..."
              className="min-h-[80px]"
            />
          </div>

          {/* Summary */}
          {selectedDocuments.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Documents to send:</span>
                  <span className="font-medium">{selectedDocuments.length} selected</span>
                </div>
                <div className="mt-2 space-y-1">
                  {selectedDocuments.map(id => {
                    const doc = documents.find((d: ComplianceDocument) => d.id === id);
                    return doc ? (
                      <div key={id} className="flex items-center space-x-2 text-sm">
                        <CheckCircle className="w-3 h-3 text-green-600" />
                        <span>{doc.name}</span>
                      </div>
                    ) : null;
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Separator />

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSend}
            disabled={sendDocumentsMutation.isPending || selectedDocuments.length === 0 || !recipientEmail}
          >
            {sendDocumentsMutation.isPending ? 'Sending...' : 'Send Documents'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}