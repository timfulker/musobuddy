import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, FileText, Calendar, MapPin, Clock, DollarSign, Download } from "lucide-react";

interface Contract {
  id: number;
  contractNumber: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  clientAddress?: string;
  eventDate: string;
  eventTime: string;
  venue: string;
  fee: string;
  terms?: string;
  status: string;
  signedAt?: string;
  clientFillableFields?: string[];
}

interface UserSettings {
  businessName?: string;
  businessEmail?: string;
  businessAddress?: string;
  phone?: string;
  website?: string;
}

export default function SignContract() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const contractId = params.id;
  
  const [contract, setContract] = useState<Contract | null>(null);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [signatureName, setSignatureName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load contract details
  useEffect(() => {
    if (!contractId) return;
    
    const loadContract = async () => {
      try {
        // Get contract details (public endpoint, no auth needed)
        const response = await fetch(`/api/contracts/public/${contractId}`);
        if (!response.ok) {
          throw new Error('Contract not found');
        }
        const contractData = await response.json();
        
        
        setContract(contractData);
        
        // Get business settings for the contract owner
        const settingsResponse = await fetch(`/api/settings/public/${contractData.userId}`);
        if (settingsResponse.ok) {
          const settingsData = await settingsResponse.json();
          setUserSettings(settingsData);
        }
        
        // Pre-fill signature name with client name
        setSignatureName(contractData.clientName || "");
        
        // Pre-fill client fields if they exist
        setClientPhone(contractData.clientPhone || "");
        setClientAddress(contractData.clientAddress || "");
        
        // Check for missing client-fillable fields
        const missing = [];
        if (contractData.clientFillableFields) {
          if (contractData.clientFillableFields.includes('clientPhone') && !contractData.clientPhone) {
            missing.push('clientPhone');
          }
          if (contractData.clientFillableFields.includes('clientAddress') && !contractData.clientAddress) {
            missing.push('clientAddress');
          }
        }
        setMissingFields(missing);
        
      } catch (error) {
        console.error("Error loading contract:", error);
        setError("Failed to load contract. Please check the URL and try again.");
        toast({
          title: "Error",
          description: "Contract not found or has already been signed",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadContract();
  }, [contractId, toast]);

  const handleSign = async () => {
    if (!signatureName.trim()) {
      toast({
        title: "Error",
        description: "Please enter your full name to sign the contract",
        variant: "destructive",
      });
      return;
    }

    if (!agreed) {
      toast({
        title: "Error", 
        description: "Please confirm you agree to the terms and conditions",
        variant: "destructive",
      });
      return;
    }

    // CRITICAL: Validate required fields (phone and address are always mandatory)
    const finalPhone = clientPhone.trim() || contract?.clientPhone || '';
    const finalAddress = clientAddress.trim() || contract?.clientAddress || '';
    
    if (!finalPhone || finalPhone === 'To be provided') {
      toast({
        title: "Error",
        description: "Phone number is required to sign the contract",
        variant: "destructive",
      });
      return;
    }
    
    if (!finalAddress || finalAddress === 'To be provided') {
      toast({
        title: "Error",
        description: "Address is required to sign the contract",
        variant: "destructive",
      });
      return;
    }
    
    // Check for any additional missing client-fillable fields
    const requiredMissingFields = missingFields.filter(field => {
      if (field === 'venueAddress' && !venueAddress.trim()) return true;
      return false;
    });

    if (requiredMissingFields.length > 0) {
      toast({
        title: "Error",
        description: "Please complete all required fields before signing",
        variant: "destructive",
      });
      return;
    }

    setSigning(true);
    try {
      console.log('🔥 FRONTEND: Starting contract signing process...');
      
      const response = await fetch(`/api/contracts/sign/${contractId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'X-Requested-With': 'XMLHttpRequest', // Mark as AJAX request
        },
        credentials: 'same-origin', // Include cookies but stay on same origin
        body: JSON.stringify({
          clientSignature: signatureName.trim(),
          clientIP: '0.0.0.0',
          clientPhone: clientPhone.trim() || undefined,
          clientAddress: clientAddress.trim() || undefined,
          venueAddress: venueAddress.trim() || undefined,
        }),
      });

      console.log('🔥 FRONTEND: Response status:', response.status);
      console.log('🔥 FRONTEND: Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to sign contract' }));
        throw new Error(errorData.error || 'Failed to sign contract');
      }

      const result = await response.json();
      console.log('🔥 FRONTEND: Success response received:', result);
      
      // Check if contract was already signed
      if (result.alreadySigned) {
        console.log('🔥 FRONTEND: Contract already signed, updating state...');
        
        // Update contract state to reflect it's already signed
        const updatedContract = {
          ...contract,
          status: 'signed' as const,
          signedAt: contract.signedAt || new Date().toISOString(),
        };
        
        setContract(updatedContract);
        setSigned(true);
        
        // Show "already signed" message instead of error
        toast({
          title: "Contract Already Signed", 
          description: "This contract has already been signed successfully.",
          variant: "default", // Not an error, just info
        });
        
        console.log('🔥 FRONTEND: Already signed state updated');
        return;
      }
      
      console.log('🔥 FRONTEND: Processing successful signing response...');
      
      // CRITICAL FIX: Update local contract state for new signing
      const updatedContract = {
        ...contract,
        status: 'signed' as const,
        signedAt: result.signedAt || new Date().toISOString(),
        cloudStorageUrl: result.cloudUrl
      };
      
      setContract(updatedContract);
      setSigned(true);
      console.log('🔥 FRONTEND: Contract state updated to signed, setSigned(true) called');

      // Success notification for new signing
      toast({
        title: "Contract Signed Successfully!", 
        description: "Confirmation emails have been sent to both parties.",
      });

      console.log('🔥 FRONTEND: Contract signing completed successfully - staying on page');

    } catch (error: any) {
      console.error("Error signing contract:", error);
      
      // Show specific error message from backend
      const errorMessage = error.message || "Failed to sign contract. Please try again.";
      setError(errorMessage);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading contract...</p>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-6">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Contract Not Found</h2>
            <p className="text-gray-600">This contract may have already been signed or the link is invalid.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (contract.status === 'signed') {
    const handleDownloadPDF = async () => {
      try {
        const response = await fetch(`/api/contracts/public/${contractId}/pdf`);
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
        
        toast({
          title: "Success",
          description: "Signed contract PDF downloaded successfully!",
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

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-lg">
          <CardContent className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-6" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contract Successfully Signed!</h2>
            <p className="text-gray-600 mb-6">
              This contract was signed on {new Date(contract.signedAt || '').toLocaleDateString('en-GB')}.
            </p>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-green-800 text-sm">
                📧 Confirmation emails with the signed contract have been sent to both parties.
              </p>
            </div>
            
            <Button 
              onClick={handleDownloadPDF}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              size="lg"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Signed Contract (PDF)
            </Button>
            
            <p className="text-xs text-gray-500 mt-4">
              Keep this copy for your records
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto max-w-4xl px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Performance Contract</h1>
          <p className="text-gray-600">Contract #{contract.contractNumber}</p>
          <Badge variant="outline" className="mt-2">
            {contract.status === 'sent' ? 'Awaiting Signature' : contract.status}
          </Badge>
        </div>

        {/* Success Message - shown on same page after signing */}
        {signed && (
          <div className="mb-8">
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-6">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-8 w-8 text-green-600 mt-1" />
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-green-900 mb-2">
                      Contract Successfully Signed!
                    </h3>
                    <p className="text-green-800 mb-3">
                      Your contract has been digitally signed and is now legally binding.
                    </p>
                    <div className="bg-green-100 border border-green-200 rounded-lg p-3">
                      <p className="text-green-800 text-sm font-medium">
                        📧 Confirmation emails with the signed contract have been sent to both parties.
                      </p>
                    </div>
                    <p className="text-green-700 text-sm mt-3">
                      Contract #{contract.contractNumber} • Signed on {new Date().toLocaleDateString('en-GB')} at {new Date().toLocaleTimeString('en-GB')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Contract Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Event Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Event Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Date</Label>
                    <p className="text-gray-900">{new Date(contract.eventDate).toLocaleDateString('en-GB')}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Time</Label>
                    <p className="text-gray-900">{contract.eventTime}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Venue</Label>
                    <p className="text-gray-900">{contract.venue}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Fee</Label>
                    <p className="text-gray-900 font-semibold">£{contract.fee}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Performer Details */}
            {userSettings && (
              <Card>
                <CardHeader>
                  <CardTitle>Performer Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="font-semibold">{userSettings.businessName}</p>
                    {userSettings.businessAddress && (
                      <p className="text-gray-600">{userSettings.businessAddress.replace(/\n/g, ', ')}</p>
                    )}
                    {userSettings.phone && (
                      <p className="text-gray-600">Phone: {userSettings.phone}</p>
                    )}
                    {userSettings.businessEmail && (
                      <p className="text-gray-600">Email: {userSettings.businessEmail}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Client Details */}
            <Card>
              <CardHeader>
                <CardTitle>Client Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-semibold">{contract.clientName}</p>
                  <p className="text-gray-600">Email: {contract.clientEmail}</p>
                  {(contract.clientPhone || clientPhone) && (
                    <p className="text-gray-600">Phone: {contract.clientPhone || clientPhone}</p>
                  )}
                  {(contract.clientAddress || clientAddress) && (
                    <p className="text-gray-600">Address: {contract.clientAddress || clientAddress}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Terms and Conditions */}
            {contract.terms && (
              <Card>
                <CardHeader>
                  <CardTitle>Terms and Conditions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-line text-gray-700">{contract.terms}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Signature Section */}
          <div className="lg:col-span-1">
            {!signed && (
              <Card className="sticky top-8">
                <CardHeader>
                  <CardTitle>Sign Contract</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                {/* Client-fillable fields section - ALWAYS show if empty or "To be provided" */}
                {((!contract.clientPhone || contract.clientPhone === 'To be provided' || 
                   !contract.clientAddress || contract.clientAddress === 'To be provided')) && (
                  <div className="space-y-4 p-4 border border-red-200 rounded-lg bg-red-50">
                    <h3 className="font-semibold text-red-900 text-sm">
                      Required Information (must be completed to sign):
                    </h3>
                    
                    {(!contract.clientPhone || contract.clientPhone === 'To be provided') && (
                      <div>
                        <Label htmlFor="clientPhone" className="text-red-700 font-medium">
                          Phone Number <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="clientPhone"
                          type="tel"
                          value={clientPhone}
                          onChange={(e) => setClientPhone(e.target.value)}
                          placeholder="07123 456789"
                          className="mt-1"
                          required
                        />
                      </div>
                    )}
                    
                    {(!contract.clientAddress || contract.clientAddress === 'To be provided') && (
                      <div>
                        <Label htmlFor="clientAddress" className="text-red-700 font-medium">
                          Address <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="clientAddress"
                          type="text"
                          value={clientAddress}
                          onChange={(e) => setClientAddress(e.target.value)}
                          placeholder="123 Main Street, London, SW1A 1AA"
                          className="mt-1"
                          required
                        />
                      </div>
                    )}
                    
                    {missingFields.includes('venueAddress') && (
                      <div>
                        <Label htmlFor="venueAddress" className="text-blue-700 font-medium">
                          Venue Address
                        </Label>
                        <Input
                          id="venueAddress"
                          type="text"
                          value={venueAddress}
                          onChange={(e) => setVenueAddress(e.target.value)}
                          placeholder="Event venue address"
                          className="mt-1"
                        />
                      </div>
                    )}
                    
                    <p className="text-xs text-blue-600">
                      These fields are required to complete the contract signing process.
                    </p>
                  </div>
                )}
                
                <div>
                  <Label htmlFor="signatureName">Full Name</Label>
                  <Input
                    id="signatureName"
                    type="text"
                    value={signatureName}
                    onChange={(e) => setSignatureName(e.target.value)}
                    placeholder="Enter your full legal name"
                    className="mt-1"
                  />
                </div>

                <div className="flex items-start space-x-2">
                  <input
                    type="checkbox"
                    id="agreed"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-1"
                  />
                  <Label htmlFor="agreed" className="text-sm leading-tight">
                    I agree to the terms and conditions outlined in this contract and confirm that the information provided is accurate.
                  </Label>
                </div>

                <Separator />

                <div>
                  <Button
                    onClick={handleSign}
                    disabled={signing || !signatureName.trim() || !agreed}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    size="lg"
                  >
                    {signing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Signing Contract...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        Sign Contract
                      </>
                    )}
                  </Button>
                </div>

                <p className="text-xs text-gray-500 text-center">
                  By signing, you agree to the terms and create a legally binding agreement.
                </p>
              </CardContent>
            </Card>
            )}
            
            {signed && (
              <Card className="sticky top-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="h-5 w-5" />
                    Contract Signed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-3">
                    <p className="text-green-800">
                      This contract has been successfully signed and is now legally binding.
                    </p>
                    <Button
                      onClick={() => {
                        // Create download link for signed contract
                        const link = document.createElement('a');
                        link.href = `/api/contracts/public/${contractId}/pdf`;
                        link.download = `Contract-${contract.contractNumber}-Signed.pdf`;
                        link.click();
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white w-full"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Signed Contract
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}