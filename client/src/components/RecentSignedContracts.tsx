import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, FileText, Eye, Download, Calendar } from "lucide-react";

interface Contract {
  id: number;
  contractNumber: string;
  clientName: string;
  clientEmail: string;
  eventDate: string;
  eventTime: string;
  venue: string;
  fee: string;
  status: string;
  signedAt?: string;
}

export default function RecentSignedContracts() {
  const { data: contracts = [], isLoading } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
  });

  // Filter for signed contracts and sort by signed date (most recent first)
  const signedContracts = contracts
    .filter(contract => contract.status === 'signed')
    .sort((a, b) => {
      if (!a.signedAt || !b.signedAt) return 0;
      return new Date(b.signedAt).getTime() - new Date(a.signedAt).getTime();
    })
    .slice(0, 3); // Show only the 3 most recent

  const handleViewContract = (contract: Contract) => {
    window.open(`/view-contract/${contract.id}`, '_blank');
  };

  const handleDownloadContract = async (contract: Contract) => {
    try {
      const response = await fetch(`/api/contracts/${contract.id}/pdf`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Contract-${contract.contractNumber}-Signed.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading contract:', error);
      alert('Failed to download contract. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm md:text-base">
            <CheckCircle className="w-4 h-4 text-green-600" />
            Recent Signed Contracts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm md:text-base">
          <CheckCircle className="w-4 h-4 text-green-600" />
          Recent Signed Contracts
        </CardTitle>
      </CardHeader>
      <CardContent>
        {signedContracts.length === 0 ? (
          <div className="text-center py-4">
            <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No signed contracts yet</p>
            <p className="text-xs text-gray-400 mt-1">Signed contracts will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {signedContracts.map((contract) => (
              <div key={contract.id} className="border rounded-lg p-3 bg-green-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="default" className="bg-green-600 text-white text-xs">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Signed
                      </Badge>
                      <span className="text-xs font-medium text-green-700">
                        {contract.contractNumber}
                      </span>
                    </div>
                    
                    <h4 className="font-medium text-sm text-gray-900 truncate">
                      {contract.clientName}
                    </h4>
                    
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(contract.eventDate).toLocaleDateString('en-GB')}
                      </span>
                      <span className="truncate">
                        {contract.venue}
                      </span>
                    </div>
                    
                    <div className="text-xs text-green-600 mt-1">
                      Signed: {contract.signedAt ? new Date(contract.signedAt).toLocaleDateString('en-GB') : 'Recently'}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-1 ml-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-6 px-2"
                      onClick={() => handleViewContract(contract)}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-6 px-2"
                      onClick={() => handleDownloadContract(contract)}
                    >
                      <Download className="w-3 h-3 mr-1" />
                      PDF
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            
            {signedContracts.length > 0 && (
              <div className="text-center pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-blue-600 hover:text-blue-700"
                  onClick={() => window.location.href = '/contracts?status=signed'}
                >
                  View all signed contracts →
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}