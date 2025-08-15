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
  const { hasDocuments, loading } = useBookingDocuments(bookingId, booking);
  
  // Don't show anything if loading or no documents
  if (loading || !hasDocuments) {
    return null;
  }
  
  return (
    <Badge 
      variant="outline" 
      className="text-xs bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <Paperclip className="w-3 h-3 mr-1" />
      Docs
    </Badge>
  );
}