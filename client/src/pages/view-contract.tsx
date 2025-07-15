import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { FileText, Calendar, MapPin, Clock, DollarSign, Download, CheckCircle, ArrowLeft } from "lucide-react";

interface Contract {
  id: number;
  contractNumber: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  clientAddress?: string;
  eventDate: string;
  eventTime: string;
  eventEndTime: string;
  venue: string;
  venueAddress?: string;
  fee: string;
  paymentInstructions?: string;
  equipmentRequirements?: string;
  specialRequirements?: string;
  status: string;
  signedAt?: string;
}

interface UserSettings {
  businessName?: string;
  businessEmail?: string;
  businessAddress?: string;
  phone?: string;
  website?: string;
}

export default function ViewContract() {
  const params = useParams();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const contractId = params.id;
  
  const [contract, setContract] = useState<Contract | null>(null);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!contractId) return;
    
    const fetchContract = async () => {
      try {
        // First try authenticated route (for logged-in users to view their own contracts including drafts)
        let response = await fetch(`/api/contracts`, {
          credentials: 'include' // Include cookies for authentication
        });
        
        if (response.ok) {
          const allContracts = await response.json();
          const contractData = allContracts.find((c: Contract) => c.id === parseInt(contractId));
          
          if (contractData) {
            setContract(contractData);
            
            // Get user settings for business details (authenticated route)
            const settingsResponse = await fetch(`/api/settings`, {
              credentials: 'include'
            });
            if (settingsResponse.ok) {
              const settings = await settingsResponse.json();
              setUserSettings(settings);
            }
            setLoading(false);
            return;
          }
        }
        
        // Fallback to public route (for clients viewing sent/signed contracts)
        response = await fetch(`/api/contracts/public/${contractId}`);
        if (!response.ok) {
          throw new Error('Contract not found');
        }
        const contractData = await response.json();
        setContract(contractData);
        
        // Get user settings for business details (public route)
        const settingsResponse = await fetch(`/api/settings/public/${contractData.userId}`);
        if (settingsResponse.ok) {
          const settings = await settingsResponse.json();
          setUserSettings(settings);
        }
      } catch (error) {
        console.error('Error fetching contract:', error);
        toast({
          title: "Error",
          description: "Failed to load contract details",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchContract();
  }, [contractId, toast]);

  const handleDownloadPDF = async () => {
    if (!contract) return;
    
    try {
      const response = await fetch(`/api/contracts/${contract.id}/download`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Contract-${contract.contractNumber}-${contract.status === 'signed' ? 'Signed' : 'Draft'}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Success",
        description: "Contract PDF downloaded successfully!",
      });
    } catch (error) {
      console.error('Error downloading contract:', error);
      toast({
        title: "Error",
        description: "Failed to download contract PDF",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Contract Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p>The contract you're looking for doesn't exist or is not available.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => setLocation('/contracts')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Contracts
          </Button>
        </div>
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Performance Contract {contract.contractNumber}
          </h1>
          <div className="flex justify-center">
            <Badge variant={contract.status === 'signed' ? 'default' : 'secondary'}>
              {contract.status === 'signed' ? (
                <><CheckCircle className="w-4 h-4 mr-1" /> Signed</>
              ) : (
                <><FileText className="w-4 h-4 mr-1" /> {contract.status}</>
              )}
            </Badge>
          </div>
        </div>

        {/* Contract Details */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Contract Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Event Information */}
            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Event Information
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p><strong>Date:</strong> {new Date(contract.eventDate).toLocaleDateString('en-GB')}</p>
                  <p><strong>Start Time:</strong> {contract.eventTime}</p>
                  <p><strong>End Time:</strong> {contract.eventEndTime}</p>
                  <p><strong>Venue:</strong> {contract.venue}</p>
                  {contract.venueAddress && <p><strong>Venue Address:</strong> {contract.venueAddress}</p>}
                </div>
                <div className="space-y-2">
                  <p><strong>Performance Fee:</strong> £{contract.fee}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Client Information */}
            <div>
              <h3 className="font-semibold mb-4">Client Information</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p><strong>Name:</strong> {contract.clientName}</p>
                  <p><strong>Email:</strong> {contract.clientEmail}</p>
                  {contract.clientPhone && <p><strong>Phone:</strong> {contract.clientPhone}</p>}
                  {contract.clientAddress && <p><strong>Address:</strong> {contract.clientAddress}</p>}
                </div>
              </div>
            </div>

            <Separator />

            {/* Payment Instructions */}
            {contract.paymentInstructions && (
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Payment Instructions
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="whitespace-pre-wrap">{contract.paymentInstructions}</p>
                </div>
              </div>
            )}

            {/* Equipment Requirements */}
            {contract.equipmentRequirements && (
              <div>
                <h3 className="font-semibold mb-4">Equipment Requirements</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="whitespace-pre-wrap">{contract.equipmentRequirements}</p>
                </div>
              </div>
            )}

            {/* Special Requirements */}
            {contract.specialRequirements && (
              <div>
                <h3 className="font-semibold mb-4">Special Requirements</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="whitespace-pre-wrap">{contract.specialRequirements}</p>
                </div>
              </div>
            )}

            <Separator />

            {/* Performer Information */}
            <div>
              <h3 className="font-semibold mb-4">Performer Information</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p><strong>Business:</strong> {userSettings?.businessName || 'Professional Musician'}</p>
                  {userSettings?.businessEmail && <p><strong>Email:</strong> {userSettings.businessEmail}</p>}
                  {userSettings?.phone && <p><strong>Phone:</strong> {userSettings.phone}</p>}
                  {userSettings?.website && <p><strong>Website:</strong> {userSettings.website}</p>}
                </div>
                {userSettings?.businessAddress && (
                  <div className="space-y-2">
                    <p><strong>Address:</strong></p>
                    <p className="text-sm text-gray-600">{userSettings.businessAddress}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Terms */}
            {contract.terms && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-4">Terms & Conditions</h3>
                  <p className="text-sm text-gray-600 whitespace-pre-line">{contract.terms}</p>
                </div>
              </>
            )}

            {/* Signature Details */}
            {contract.status === 'signed' && contract.signedAt && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-4 flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    Signature Details
                  </h3>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p><strong>Signed by:</strong> {contract.clientName}</p>
                    <p><strong>Date & Time:</strong> {new Date(contract.signedAt).toLocaleString('en-GB')}</p>
                    <p><strong>Digital Signature:</strong> Verified</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="text-center space-y-4">
          <Button 
            onClick={handleDownloadPDF} 
            className="bg-blue-600 hover:bg-blue-700 text-white"
            disabled={contract.status !== 'signed'}
          >
            <Download className="w-4 h-4 mr-2" />
            Download PDF {contract.status === 'signed' ? '(Signed)' : '(Draft)'}
          </Button>
          
          {contract.status !== 'signed' && (
            <p className="text-sm text-gray-500">
              PDF download will be available after the contract is signed
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-sm text-gray-500">
          <p>Powered by MusoBuddy – less admin, more music</p>
        </div>
      </div>
    </div>
  );
}