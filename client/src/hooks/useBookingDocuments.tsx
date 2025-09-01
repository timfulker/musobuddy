import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';

interface UseBookingDocumentsReturn {
  documentCount: number;
  hasDocuments: boolean;
  loading: boolean;
  error: string | null;
}

export function useBookingDocuments(bookingId: number, booking?: any): UseBookingDocumentsReturn {
  const [documentCount, setDocumentCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    
    const fetchDocuments = async () => {
      if (!bookingId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Get new multi-document count
        const response = await apiRequest(`/api/bookings/${bookingId}/documents`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        let newDocCount = data.documents?.length || 0;
        
        // Add legacy document if it exists
        let legacyDocCount = 0;
        if (booking?.documentUrl && booking.documentUrl.trim()) {
          legacyDocCount = 1;
        }
        
        const totalCount = newDocCount + legacyDocCount;
        
        
        if (mounted) {
          setDocumentCount(totalCount);
        }
      } catch (err: any) {
        // Silently handle fetch errors to avoid console spam
        if (mounted) {
          // If API fails, still check for legacy document
          let legacyDocCount = 0;
          if (booking?.documentUrl && booking.documentUrl.trim()) {
            legacyDocCount = 1;
          }
          
          setDocumentCount(legacyDocCount);
          setError(err.message);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchDocuments();
    
    return () => {
      mounted = false;
    };
  }, [bookingId, booking?.documentUrl]);

  return {
    documentCount,
    hasDocuments: documentCount > 0,
    loading,
    error
  };
}