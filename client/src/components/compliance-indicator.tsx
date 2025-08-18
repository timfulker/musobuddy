import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Shield, ShieldCheck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface ComplianceIndicatorProps {
  bookingId: number;
  booking?: any;
  onClick?: (e: React.MouseEvent) => void;
}

export function ComplianceIndicator({ bookingId, booking, onClick }: ComplianceIndicatorProps) {
  // TEMPORARILY DISABLE API CALLS to prevent resource exhaustion
  // TODO: Implement batch API or lazy loading when cards become visible
  const sentData = { sent: false, documents: [] };
  const isLoading = false;
  
  // Previous code kept for future reference:
  // const { data: sentData, isLoading } = useQuery({
  //   queryKey: ['compliance-sent', bookingId],
  //   queryFn: async () => {
  //     try {
  //       const response = await apiRequest(`/api/bookings/${bookingId}/compliance-sent`);
  //       return await response.json();
  //     } catch (error) {
  //       console.error('📋 Error checking compliance sent status:', error);
  //       return { sent: false, documents: [] };
  //     }
  //   },
  //   staleTime: 5 * 60 * 1000,
  //   gcTime: 10 * 60 * 1000,
  // });
  
  // Don't show indicator if loading or no compliance has been sent for this booking
  if (isLoading || !sentData?.sent) {
    return null;
  }
  
  // Map document types to short labels
  const getDocumentLabel = (type: string) => {
    switch (type) {
      case 'public_liability':
        return 'PLI';
      case 'pat_testing':
        return 'PAT';
      case 'music_license':
        return 'MPL';
      default:
        return type.toUpperCase().substring(0, 3);
    }
  };
  
  // Get sent document types
  const sentTypes = sentData.documents.map((doc: any) => getDocumentLabel(doc.type));
  const uniqueTypes = [...new Set(sentTypes)];
  
  // Create individual badges for each document type
  return (
    <div className="flex gap-1">
      {uniqueTypes.map((type) => (
        <Badge 
          key={type}
          variant="outline" 
          className="text-xs bg-green-50 text-green-700 border-green-300 hover:bg-green-100 cursor-pointer transition-colors"
          onClick={onClick}
          title={`${type} compliance document available to share`}
        >
          <ShieldCheck className="w-3 h-3 mr-1" />
          {type}
        </Badge>
      ))}
    </div>
  );
}