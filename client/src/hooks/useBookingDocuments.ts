import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { BookingDocument } from '../../../shared/document-schemas';

// Hook to fetch documents for a booking
export function useBookingDocuments(bookingId: number) {
  return useQuery({
    queryKey: ['booking-documents', bookingId],
    queryFn: () => apiRequest(`/api/bookings/${bookingId}/documents`),
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

      const response = await fetch(`/api/bookings/${bookingId}/documents/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload document');
      }

      return response.json();
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
      return apiRequest(`/api/bookings/${bookingId}/documents/${documentId}`, {
        method: 'DELETE',
      });
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
      return apiRequest(`/api/bookings/${bookingId}/documents/${documentId}/download`);
    },
  });
}