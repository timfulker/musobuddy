import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Mail, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface EmailCheckResponse {
  available: boolean;
  error?: string;
  suggestion?: string;
  fullEmail?: string;
}

interface OnboardingEmailSetupProps {
  onComplete: (email: string) => void;
  onSkip?: () => void;
}

export default function OnboardingEmailSetup({ onComplete, onSkip }: OnboardingEmailSetupProps) {
  const [prefix, setPrefix] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<EmailCheckResponse | null>(null);
  const { toast } = useToast();

  // Check availability mutation
  const checkAvailability = useMutation({
    mutationFn: async (prefix: string): Promise<EmailCheckResponse> => {
      const response = await apiRequest('/api/email/check-availability', {
        method: 'POST',
        body: JSON.stringify({ prefix }),
      });
      return response as EmailCheckResponse;
    },
    onSuccess: (data: EmailCheckResponse) => {
      setCheckResult(data);
      setIsChecking(false);
    },
    onError: () => {
      setIsChecking(false);
      toast({
        title: "Error",
        description: "Failed to check email availability",
        variant: "destructive",
      });
    }
  });

  // Assign email mutation
  const assignEmail = useMutation({
    mutationFn: async (prefix: string) => {
      const response = await apiRequest('/api/email/assign-prefix', {
        method: 'POST',
        body: JSON.stringify({ prefix }),
      });
      return response;
    },
    onSuccess: (data: any) => {
      toast({
        title: "Success!",
        description: `Your lead email ${data.email} is now active`,
      });
      onComplete(data.email);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign email",
        variant: "destructive",
      });
    }
  });

  // Auto-check availability as user types
  useEffect(() => {
    if (prefix.length >= 2) {
      setIsChecking(true);
      const timer = setTimeout(() => {
        checkAvailability.mutate(prefix);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setCheckResult(null);
    }
  }, [prefix]);

  const handleUseSuggestion = (suggestion: string) => {
    setPrefix(suggestion);
  };

  const handleAssignEmail = () => {
    if (checkResult?.available && prefix) {
      assignEmail.mutate(prefix);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Set Up Your Professional Lead Email</h2>
        <p className="text-gray-600">
          Get a dedicated email address for client inquiries that automatically creates bookings
        </p>
      </div>

      {/* Email Setup Form */}
      <Card>
        <CardHeader>
          <CardTitle>Choose Your Email Prefix</CardTitle>
          <CardDescription>
            This will be your permanent professional email address and cannot be changed later.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* Email Input */}
          <div className="space-y-2">
            <Label htmlFor="prefix">Email Prefix</Label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  id="prefix"
                  placeholder="yourname"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value.toLowerCase())}
                  className="pr-4"
                />
              </div>
              <span className="text-gray-500 font-mono">@mg.musobuddy.com</span>
            </div>
            <p className="text-sm text-gray-600">
              Your full email will be: <code>leads+{prefix || 'yourprefix'}@mg.musobuddy.com</code>
            </p>
          </div>

          {/* Availability Check Results */}
          {isChecking && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Checking availability...</AlertDescription>
            </Alert>
          )}

          {checkResult && !isChecking && (
            <>
              {checkResult.available ? (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Perfect! <code>leads+{prefix}@mg.musobuddy.com</code> is available
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {checkResult.error}
                    {checkResult.suggestion && (
                      <>
                        <br />
                        <Button 
                          variant="link" 
                          className="p-0 h-auto text-red-600 underline"
                          onClick={() => handleUseSuggestion(checkResult.suggestion!)}
                        >
                          Try "{checkResult.suggestion}" instead
                        </Button>
                      </>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleAssignEmail}
              disabled={!checkResult?.available || assignEmail.isPending}
              className="flex-1"
              size="lg"
            >
              {assignEmail.isPending ? 'Setting up...' : 'Activate Lead Email'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            {onSkip && (
              <Button
                variant="outline"
                onClick={onSkip}
                size="lg"
              >
                Skip for Now
              </Button>
            )}
          </div>

          {/* Warning */}
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <strong>Important:</strong> Your email address will be permanent and cannot be changed. Choose carefully.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Benefits */}
      <Card>
        <CardHeader>
          <CardTitle>Why Set This Up?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3">
            <Mail className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Professional Image</p>
              <p className="text-sm text-gray-600">Dedicated business email shows clients you're serious</p>
            </div>
          </div>
          <div className="flex gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Automatic Organization</p>
              <p className="text-sm text-gray-600">Client emails instantly become organized bookings</p>
            </div>
          </div>
          <div className="flex gap-3">
            <ArrowRight className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Never Miss Opportunities</p>
              <p className="text-sm text-gray-600">All inquiries captured even when you're away</p>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}