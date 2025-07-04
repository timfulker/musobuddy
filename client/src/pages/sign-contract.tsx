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
  eventDate: string;
  eventTime: string;
  venue: string;
  fee: string;
  terms?: string;
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

export default function SignContract() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const contractId = params.id;
  
  const [contract, setContract] = useState<Contract | null>(null);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [signatureName, setSignatureName] = useState("");
  const [agreed, setAgreed] = useState(false);

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
        console.log('Contract data loaded:', contractData);
        console.log('Contract status:', contractData.status);
        console.log('Contract ID:', contractData.id);
        console.log('Contract client name:', contractData.clientName);
        setContract(contractData);
        
        // Get business settings for the contract owner
        const settingsResponse = await fetch(`/api/settings/public/${contractData.userId}`);
        if (settingsResponse.ok) {
          const settingsData = await settingsResponse.json();
          setUserSettings(settingsData);
        }
        
        // Pre-fill signature name with client name
        setSignatureName(contractData.clientName || "");
        
      } catch (error) {
        console.error("Error loading contract:", error);
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

    setSigning(true);
    try {
      console.log('Attempting to sign contract:', contractId);
      console.log('Signature name:', signatureName.trim());
      
      const response = await fetch(`/api/contracts/sign/${contractId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signatureName: signatureName.trim(),
        }),
      });

      console.log('Sign response status:', response.status);
      console.log('Sign response ok:', response.ok);

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Sign error response:', errorData);
        throw new Error(`Failed to sign contract: ${response.status} - ${errorData}`);
      }

      const responseData = await response.json();
      console.log('Sign success response:', responseData);

      // Update local contract state
      setContract(prev => prev ? {
        ...prev,
        status: 'signed',
        signedAt: new Date().toISOString()
      } : null);

      toast({
        title: "Success",
        description: "Contract signed successfully! You will receive a confirmation email shortly.",
      });

    } catch (error) {
      console.error("Error signing contract:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to sign contract. Please try again.",
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
        console.log('Downloading PDF for contract:', contractId);
        const response = await fetch(`/api/contracts/public/${contractId}/pdf`);
        console.log('PDF response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('PDF download error:', errorText);
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const blob = await response.blob();
        console.log('PDF blob size:', blob.size);
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Contract-${contract.contractNumber}-Signed.pdf`;
        document.body.appendChild(a); // Ensure element is in DOM
        a.click();
        document.body.removeChild(a); // Clean up
        window.URL.revokeObjectURL(url);
        
        toast({
          title: "Success",
          description: "Signed contract PDF downloaded successfully!",
        });
      } catch (error) {
        console.error('Error downloading contract:', error);
        toast({
          title: "Error",
          description: "Failed to download contract PDF. Please try again.",
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
                  {contract.clientPhone && (
                    <p className="text-gray-600">Phone: {contract.clientPhone}</p>
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
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle>Digital Signature</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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

                <Button
                  onClick={handleSign}
                  disabled={signing || !signatureName.trim() || !agreed}
                  className="w-full"
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

                <p className="text-xs text-gray-500 text-center">
                  By signing, you agree to the terms and create a legally binding agreement.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}