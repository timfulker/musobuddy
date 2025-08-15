import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Paperclip } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface BookingDocumentIndicatorProps {
  bookingId: number;
  booking?: any;
  onClick: (e: React.MouseEvent) => void;
}

export function BookingDocumentIndicator({ bookingId, booking, onClick }: BookingDocumentIndicatorProps) {
  // Use React Query to fetch documents with better error handling
  const { data: documentsData, isLoading } = useQuery({
    queryKey: ['booking-documents', bookingId],
    queryFn: async () => {
      try {
        const response = await apiRequest(`/api/bookings/${bookingId}/documents`);
        return await response.json();
      } catch (error) {
        console.error('📄 Error fetching documents for booking', bookingId, ':', error);
        // Return empty result on error instead of throwing
        return { documents: [] };
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
  
  // Check if any documents exist
  const documents = documentsData?.documents || [];
  const hasNewDocuments = documents.length > 0;
  const hasLegacyDocuments = booking?.documentUrl && booking.documentUrl.trim();
  const hasDocuments = hasNewDocuments || hasLegacyDocuments;
  
  // Don't show anything if loading or no documents
  if (isLoading || !hasDocuments) {
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