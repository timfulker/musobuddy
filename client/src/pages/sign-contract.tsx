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
  cloudStorageUrl?: string;
}

interface UserSettings {
  businessName?: string;
  businessEmail?: string;
  businessAddress?: string;
  phone?: string;
  website?: string;
}

export default function SignContract() {
  const params = useParams<{ id: string }>();
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
        const missing: string[] = [];
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
        description: "Please agree to the contract terms to proceed",
        variant: "destructive",
      });
      return;
    }

    // Check for missing required fields
    const stillMissing: string[] = [];
    if (missingFields.includes('clientPhone') && !clientPhone.trim()) {
      stillMissing.push('Client Phone');
    }
    if (missingFields.includes('clientAddress') && !clientAddress.trim()) {
      stillMissing.push('Client Address');
    }
    
    if (stillMissing.length > 0) {
      toast({
        title: "Missing Required Information",
        description: `Please provide: ${stillMissing.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    setSigning(true);

    try {
      const signatureData = {
        signatureName: signatureName.trim(),
        agreedToTerms: agreed,
        ipAddress: await fetch('https://api.ipify.org?format=json')
          .then(r => r.json())
          .then(data => data.ip)
          .catch(() => 'unknown'),
        userAgent: navigator.userAgent,
        signedAt: new Date().toISOString(),
        // Include client fillable fields
        clientPhone: clientPhone.trim() || undefined,
        clientAddress: clientAddress.trim() || undefined,
      };

      console.log('Signing contract with data:', signatureData);

      const response = await fetch(`/api/contracts/public/${contractId}/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(signatureData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Contract signed successfully:', result);

      setSigned(true);
      toast({
        title: "Contract Signed Successfully",
        description: "You will receive a copy via email shortly",
      });

      // Update contract state to show signed status
      if (contract) {
        setContract({ ...contract, status: 'signed', signedAt: new Date().toISOString() });
      }

    } catch (error) {
      console.error('Error signing contract:', error);
      toast({
        title: "Signing Failed",
        description: error instanceof Error ? error.message : "Please try again or contact support",
        variant: "destructive",
      });
    } finally {
      setSigning(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount.replace(/[^\d.]/g, ''));
    return isNaN(num) ? amount : `£${num.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading contract...</p>
        </div>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Contract Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground mb-4">
              {error || "This contract could not be found or has expired."}
            </p>
            <p className="text-center text-sm text-muted-foreground">
              Please check the link or contact the sender for assistance.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (contract.status === 'signed' && !signed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-green-600 flex items-center justify-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Already Signed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground mb-4">
              This contract has already been signed.
            </p>
            {contract.signedAt && (
              <p className="text-center text-sm text-muted-foreground">
                Signed on {formatDate(contract.signedAt)}
              </p>
            )}
            {contract.cloudStorageUrl && (
              <div className="mt-4 text-center">
                <Button asChild variant="outline">
                  <a href={contract.cloudStorageUrl} target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4 mr-2" />
                    Download Copy
                  </a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (signed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-green-600 flex items-center justify-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Contract Signed Successfully
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground mb-4">
              Thank you for signing the contract. Both parties will receive a copy via email.
            </p>
            <p className="text-center text-sm font-medium">
              Contract: {contract.contractNumber}
            </p>
            <p className="text-center text-sm text-muted-foreground">
              Event: {formatDate(contract.eventDate)}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <FileText className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Performance Contract</h1>
          </div>
          {userSettings?.businessName && (
            <p className="text-muted-foreground">{userSettings.businessName}</p>
          )}
        </div>

        {/* Contract Details */}
        <Card>
          <CardHeader>
            <CardTitle>Contract Details</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{contract.contractNumber}</Badge>
              <Badge variant="outline" className="capitalize">
                {contract.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Event Date</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(contract.eventDate)}
                    </p>
                  </div>
                </div>
                
                {contract.eventTime && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Time</p>
                      <p className="text-sm text-muted-foreground">
                        {contract.eventTime}
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Venue</p>
                    <p className="text-sm text-muted-foreground">
                      {contract.venue}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Performance Fee</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(contract.fee)}
                    </p>
                  </div>
                </div>
                
                <div>
                  <p className="font-medium">Client</p>
                  <p className="text-sm text-muted-foreground">
                    {contract.clientName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {contract.clientEmail}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Client-fillable fields */}
        {missingFields.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Additional Information Required</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {missingFields.includes('clientPhone') && (
                <div>
                  <Label htmlFor="clientPhone">Contact Phone Number *</Label>
                  <Input
                    id="clientPhone"
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="Enter your contact phone number"
                  />
                </div>
              )}
              
              {missingFields.includes('clientAddress') && (
                <div>
                  <Label htmlFor="clientAddress">Contact Address *</Label>
                  <Input
                    id="clientAddress"
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                    placeholder="Enter your contact address"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Terms */}
        {contract.terms && (
          <Card>
            <CardHeader>
              <CardTitle>Terms and Conditions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {contract.terms}
                </pre>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Signature Section */}
        <Card>
          <CardHeader>
            <CardTitle>Digital Signature</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="signatureName">Full Name (Digital Signature) *</Label>
              <Input
                id="signatureName"
                value={signatureName}
                onChange={(e) => setSignatureName(e.target.value)}
                placeholder="Enter your full name"
              />
              <p className="text-xs text-muted-foreground mt-1">
                By typing your name, you are providing a legally binding digital signature
              </p>
            </div>
            
            <div className="flex items-start space-x-2">
              <input
                type="checkbox"
                id="agreed"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1"
              />
              <Label htmlFor="agreed" className="text-sm cursor-pointer">
                I agree to the terms and conditions of this contract and confirm that all
                information provided is accurate. I understand this constitutes a legally
                binding digital signature.
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
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Sign Contract
                </>
              )}
            </Button>
            
            <p className="text-xs text-center text-muted-foreground">
              By clicking "Sign Contract", you are creating a legally binding digital signature.
              Both parties will receive a signed copy via email.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}