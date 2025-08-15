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
  // Check if user has valid compliance documents
  const { data: complianceData, isLoading } = useQuery({
    queryKey: ['compliance-documents'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/compliance/documents');
        return await response.json();
      } catch (error) {
        console.error('📋 Error fetching compliance documents:', error);
        return { documents: [] };
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });
  
  // Don't show indicator if loading or no compliance documents
  if (isLoading || !complianceData?.documents?.length) {
    return null;
  }
  
  // Check which valid documents are available
  const validDocuments = complianceData.documents.filter((doc: any) => 
    doc.status === 'valid'
  );
  
  if (validDocuments.length === 0) {
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
  
  // Get available document types
  const availableTypes = validDocuments.map((doc: any) => getDocumentLabel(doc.type));
  const uniqueTypes = [...new Set(availableTypes)];
  
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