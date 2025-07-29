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
        
        // ROBUST APPROACH: Handle the specific 200-but-HTML issue
        const response = await fetch(`/api/contracts/${contractId}`, {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          }
        });
        
        console.log('📡 Response status:', response.status);
        console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
        
        // CRITICAL FIX: Get response text first, then validate it's actually JSON
        const responseText = await response.text();
        console.log('📄 Response text preview (first 200 chars):', responseText.substring(0, 200));
        
        // Check if response looks like HTML (starts with DOCTYPE, html tag, etc.)
        const isHTML = responseText.trim().toLowerCase().startsWith('<!doctype') || 
                      responseText.trim().toLowerCase().startsWith('<html') ||
                      responseText.includes('<title>') ||
                      responseText.includes('</html>');
        
        if (isHTML) {
          console.error('❌ Server returned HTML instead of JSON despite 200 status');
          
          // Extract useful info from HTML if possible
          let errorMessage = 'Server returned HTML instead of JSON';
          
          // Try to extract title from HTML for better error message
          const titleMatch = responseText.match(/<title>(.*?)<\/title>/i);
          if (titleMatch) {
            errorMessage += `: ${titleMatch[1]}`;
          }
          
          // Check for specific error patterns
          if (responseText.includes('couldn\'t reach this app')) {
            errorMessage = 'Server is not responding properly. Please try again in a moment.';
          } else if (responseText.includes('502 Bad Gateway')) {
            errorMessage = 'Server is temporarily unavailable (502 Bad Gateway)';
          } else if (responseText.includes('login') || responseText.includes('signin')) {
            errorMessage = 'Authentication required. Please log in again.';
          }
          
          throw new Error(errorMessage);
        }
        
        // Check if the response status indicates an error
        if (!response.ok) {
          // Try to parse as JSON for error details
          try {
            const errorData = JSON.parse(responseText);
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
          } catch (parseError) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
        }
        
        // Now try to parse as JSON
        let contractData;
        try {
          contractData = JSON.parse(responseText);
        } catch (jsonError) {
          console.error('❌ Failed to parse response as JSON:', jsonError);
          console.error('❌ Response text that failed to parse:', responseText);
          throw new Error('Server returned invalid JSON. Please try refreshing the page.');
        }
        
        console.log('✅ Contract data received:', contractData);
        setContract(contractData);
        
        // Get user settings for business details - use same robust approach
        try {
          const settingsResponse = await fetch(`/api/settings`, {
            credentials: 'include',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            }
          });
          
          if (settingsResponse.ok) {
            const settingsText = await settingsResponse.text();
            
            // Check if settings response is also HTML
            const settingsIsHTML = settingsText.trim().toLowerCase().startsWith('<!doctype') || 
                                  settingsText.trim().toLowerCase().startsWith('<html');
            
            if (!settingsIsHTML) {
              try {
                const settings = JSON.parse(settingsText);
                setUserSettings(settings);
              } catch (settingsParseError) {
                console.warn('⚠️ Failed to parse user settings, continuing without them');
              }
            } else {
              console.warn('⚠️ Settings endpoint returned HTML, continuing without settings');
            }
          } else {
            console.warn('⚠️ Failed to fetch user settings:', settingsResponse.status);
          }
        } catch (settingsError) {
          console.warn('⚠️ Settings fetch failed, continuing without them:', settingsError);
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
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Error Loading Contract
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm mb-2"><strong>Error Details:</strong></p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 text-sm mb-2"><strong>Troubleshooting:</strong></p>
              <ul className="text-blue-700 text-xs space-y-1">
                <li>• Check your internet connection</li>
                <li>• Try refreshing the page</li>
                <li>• Make sure you're logged in</li>
                <li>• Contact support if the problem persists</li>
              </ul>
            </div>
            
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
                Refresh Page
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
          
          {/* Success Notice */}
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700">
              <strong>✅ Contract Loaded Successfully:</strong> This view shows the essential contract details. 
              For the complete contract with full terms & conditions, download the PDF below.
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
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Event Information
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Client</label>
                  <p className="text-gray-900">{contract.clientName}</p>
                  <p className="text-sm text-gray-600">{contract.clientEmail}</p>
                  {contract.clientPhone && (
                    <p className="text-sm text-gray-600">{contract.clientPhone}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Event Date</label>
                  <p className="text-gray-900">{new Date(contract.eventDate).toLocaleDateString('en-GB')}</p>
                  {contract.eventTime && contract.eventEndTime && (
                    <p className="text-sm text-gray-600">{contract.eventTime} - {contract.eventEndTime}</p>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Venue Information */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Venue Information
              </h3>
              <div>
                <label className="text-sm font-medium text-gray-600">Venue</label>
                <p className="text-gray-900">{contract.venue}</p>
                {contract.venueAddress && (
                  <p className="text-sm text-gray-600">{contract.venueAddress}</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Financial Information */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Financial Information
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Performance Fee</label>
                  <p className="text-gray-900 text-lg font-semibold">£{contract.fee}</p>
                </div>
                {contract.deposit && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Deposit</label>
                    <p className="text-gray-900">£{contract.deposit}</p>
                  </div>
                )}
              </div>
              {contract.paymentInstructions && (
                <div className="mt-3">
                  <label className="text-sm font-medium text-gray-600">Payment Instructions</label>
                  <p className="text-gray-900">{contract.paymentInstructions}</p>
                </div>
              )}
            </div>

            {/* Requirements */}
            {(contract.equipmentRequirements || contract.specialRequirements) && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold mb-3">Requirements</h3>
                  {contract.equipmentRequirements && (
                    <div className="mb-3">
                      <label className="text-sm font-medium text-gray-600">Equipment</label>
                      <p className="text-gray-900">{contract.equipmentRequirements}</p>
                    </div>
                  )}
                  {contract.specialRequirements && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Special Requirements</label>
                      <p className="text-gray-900">{contract.specialRequirements}</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Signature Information */}
            {contract.status === 'signed' && contract.signedAt && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Signature Information
                  </h3>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-800">
                      <strong>Contract Signed:</strong> {new Date(contract.signedAt).toLocaleDateString('en-GB')} at {new Date(contract.signedAt).toLocaleTimeString('en-GB')}
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Download Button */}
        <div className="text-center">
          <Button onClick={handleDownloadPDF} className="bg-blue-600 hover:bg-blue-700">
            <Download className="w-4 h-4 mr-2" />
            Download Complete Contract PDF
          </Button>
        </div>
      </div>
    </div>
  );
}