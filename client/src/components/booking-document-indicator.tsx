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
  const { data: documentsData, isLoading } = useQuery({
    queryKey: ['booking-documents', bookingId],
    queryFn: async () => {
      try {
        const response = await apiRequest(`/api/bookings/${bookingId}/documents`);
        return await response.json();
      } catch (error) {
        console.error('📄 Error fetching documents for booking', bookingId, ':', error);
        return { documents: [] };
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
  
  // Check if any documents exist
  const documents = documentsData?.documents || [];
  const hasNewDocuments = documents.length > 0;
  const hasLegacyDocuments = booking?.documentUrl && booking.documentUrl.trim();
  const hasDocuments = hasNewDocuments || hasLegacyDocuments;
  
  console.log(`📄 Booking ${bookingId} - isLoading: ${isLoading}, hasDocuments: ${hasDocuments}, documentsData:`, documentsData);
  
  // Don't show anything if loading
  if (isLoading) {
    console.log(`📄 Booking ${bookingId} - returning null due to loading`);
    return null;
  }
  
  console.log(`📄 Booking ${bookingId} - rendering badge`);
  
  // Show badge for document management (upload/view)
  return (
    <Badge 
      variant="outline" 
      className={`text-xs cursor-pointer transition-colors ${
        hasDocuments 
          ? "bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100" 
          : "bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100"
      }`}
      onClick={onClick}
      title={hasDocuments ? `${documents.length} document(s)` : "Upload documents"}
    >
      <Paperclip className="w-3 h-3 mr-1" />
      {hasDocuments ? `Docs (${documents.length})` : "Upload"}
    </Badge>
  );
}