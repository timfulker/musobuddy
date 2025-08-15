import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Paperclip } from 'lucide-react';
import { useBookingDocuments } from '@/hooks/useBookingDocuments';

interface BookingDocumentIndicatorProps {
  bookingId: number;
  booking?: any;
  onClick: (e: React.MouseEvent) => void;
}

export function BookingDocumentIndicator({ bookingId, booking, onClick }: BookingDocumentIndicatorProps) {
  const { documentCount, hasDocuments, loading } = useBookingDocuments(bookingId, booking);

  // Don't show anything if loading
  if (loading) {
    return null;
  }
  
  // Show if we have documents, OR if we have a legacy document URL (fallback)
  const shouldShow = hasDocuments || (booking?.documentUrl && booking.documentUrl.trim());
  
  if (!shouldShow) {
    return null;
  }

  return (
    <Badge 
      variant="outline" 
      className="text-xs cursor-pointer hover:bg-green-50 hover:border-green-300"
      onClick={onClick}
      title="Click to manage documents"
    >
      <Paperclip className="h-3 w-3 mr-1" />
      Documents ({documentCount > 0 ? documentCount : (booking?.documentUrl ? 1 : '?')})
    </Badge>
  );
}