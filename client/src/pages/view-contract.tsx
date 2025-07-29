import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { FileText, Calendar, MapPin, Clock, DollarSign, Download, CheckCircle, ArrowLeft, AlertCircle } from "lucide-react";

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
  deposit?: string;
  paymentInstructions?: string;
  equipmentRequirements?: string;
  specialRequirements?: string;
  status: string;
  signedAt?: string;
  createdAt?: string;
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!contractId) {
      setError("No contract ID provided");
      setLoading(false);
      return;
    }
    
    const fetchContract = async () => {
      try {
        console.log('🔍 Fetching contract:', contractId);
        
        // FIXED: Better error handling for the API request
        const response = await fetch(`/api/contracts/${contractId}`, {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          }
        });
        
        console.log('📡 Response status:', response.status);
        console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
        
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.error('❌ Response is not JSON, content-type:', contentType);
          
          // Try to get the response text to see what we actually received
          const responseText = await response.text();
          console.error('❌ Received response text (first 500 chars):', responseText.substring(0, 500));
          
          if (response.status === 401) {
            throw new Error('Authentication required. Please log in again.');
          } else if (response.status === 403) {
            throw new Error('Access denied. You do not have permission to view this contract.');
          } else if (response.status === 404) {
            throw new Error('Contract not found.');
          } else {
            throw new Error(`Server returned ${response.status}: Expected JSON but received HTML. This might be a server configuration issue.`);
          }
        }
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch contract`);
        }
        
        const contractData = await response.json();
        console.log('✅ Contract data received:', contractData);
        setContract(contractData);
        
        // Get user settings for business details
        const settingsResponse = await fetch(`/api/settings`, {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          }
        });
        
        if (settingsResponse.ok) {
          const settings = await settingsResponse.json();
          setUserSettings(settings);
        } else {
          console.warn('⚠️ Failed to fetch user settings:', settingsResponse.status);
        }
        
      } catch (error: any) {
        console.error('❌ Error fetching contract:', error);
        setError(error.message || 'Failed to load contract details');
        
        toast({
          title: "Error",
          description: error.message || "Failed to load contract details",
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
      console.log('📄 Downloading contract PDF:', contract.id);
      
      const response = await fetch(`/api/contracts/${contract.id}/download`, {
        credentials: 'include'
      });
      
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
    } catch (error: any) {
      console.error('❌ Error downloading contract:', error);
      toast({
        title: "Error",
        description: "Failed to download contract PDF. " + (error.message || ''),
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading contract details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Error Loading Contract
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">{error}</p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setLocation('/contracts')}
                className="flex-1"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Contracts
              </Button>
              <Button
                onClick={() => window.location.reload()}
                className="flex-1"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
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
            <Button
              variant="outline"
              onClick={() => setLocation('/contracts')}
              className="mt-4 w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Contracts
            </Button>
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
          <div className="flex justify-center items-center gap-4">
            <Badge variant={contract.status === 'signed' ? 'default' : 'secondary'}>
              {contract.status === 'signed' ? (
                <><CheckCircle className="w-4 h-4 mr-1" /> Signed</>
              ) : (
                <><FileText className="w-4 h-4 mr-1" /> {contract.status}</>
              )}
            </Badge>
          </div>
          
          {/* Preview Notice */}
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Preview Version:</strong> This online view shows the essential contract details. 
              For the complete contract including full terms & conditions and signature sections, 
              please download the PDF version below.
            </p>
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
                  {contract.deposit && parseFloat(contract.deposit) > 0 && (
                    <p><strong>Deposit:</strong> £{contract.deposit}</p>
                  )}
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

            {/* Signature Status */}
            {contract.status === 'signed' && contract.signedAt && (
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Signature Status
                </h3>
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <p className="text-green-800">
                    <strong>✓ Contract Signed</strong><br />
                    Signed on: {new Date(contract.signedAt).toLocaleDateString('en-GB')} at {new Date(contract.signedAt).toLocaleTimeString('en-GB')}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={handleDownloadPDF}
                className="flex items-center gap-2"
                size="lg"
              >
                <Download className="w-4 h-4" />
                Download Full Contract PDF
              </Button>
              
              {/* Business Details */}
              {userSettings && (
                <div className="text-center text-sm text-gray-600 mt-4">
                  <p><strong>{userSettings.businessName || 'MusoBuddy'}</strong></p>
                  {userSettings.businessEmail && <p>{userSettings.businessEmail}</p>}
                  {userSettings.phone && <p>{userSettings.phone}</p>}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}