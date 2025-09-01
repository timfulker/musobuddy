import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { BookingDocument } from '../../../shared/document-schemas';

// Hook to fetch documents for a booking
export function useBookingDocuments(bookingId: number) {
  return useQuery({
    queryKey: ['booking-documents', bookingId],
    queryFn: async () => {
      const response = await apiRequest(`/api/bookings/${bookingId}/documents`);
      return await response.json();
    },
    enabled: !!bookingId,
  });
}

// Hook to upload a document
export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      bookingId, 
      file, 
      documentType = 'other' 
    }: { 
      bookingId: number; 
      file: File; 
      documentType?: string; 
    }) => {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('documentType', documentType);

      const response = await apiRequest(`/api/bookings/${bookingId}/documents/upload`, {
        method: 'POST',
        body: formData,
      });
      return await response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch documents for this booking
      queryClient.invalidateQueries({ 
        queryKey: ['booking-documents', variables.bookingId] 
      });
    },
  });
}

// Hook to delete a document
export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId, documentId }: { bookingId: number; documentId: number }) => {
      const response = await apiRequest(`/api/bookings/${bookingId}/documents/${documentId}`, {
        method: 'DELETE',
      });
      return await response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch documents for this booking
      queryClient.invalidateQueries({ 
        queryKey: ['booking-documents', variables.bookingId] 
      });
    },
  });
}

// Hook to get download URL for a document
export function useGetDocumentDownload() {
  return useMutation({
    mutationFn: async ({ bookingId, documentId }: { bookingId: number; documentId: number }) => {
      const response = await apiRequest(`/api/bookings/${bookingId}/documents/${documentId}/download`);
      return await response.json();
    },
  });
}