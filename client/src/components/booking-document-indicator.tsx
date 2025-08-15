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
  // Always return null - document count indicator removed per user request
  return null;
}