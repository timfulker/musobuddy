import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Mail, Copy, Check, Crown, Lock, ArrowLeft, LayoutDashboard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Link, useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';

interface EmailCheckResponse {
  available: boolean;
  error?: string;
  suggestion?: string;
  fullEmail?: string;
}

interface UserEmailResponse {
  email: string | null;
  needsSetup?: boolean;
}

export default function EmailSetup() {
  const [prefix, setPrefix] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<EmailCheckResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Get user's current email
  const { data: userEmail, isLoading } = useQuery<UserEmailResponse>({
    queryKey: ['/api/email/my-address'],
  });

  // Check availability mutation
  const checkAvailability = useMutation({
    mutationFn: async (prefix: string): Promise<EmailCheckResponse> => {
      const response = await apiRequest('/api/email/check-availability', {
        method: 'POST',
        body: JSON.stringify({ prefix }),
      });
      return response.json();
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
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Success!",
        description: `Your lead email ${data.email} is now active`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/email/my-address'] });
      setPrefix('');
      setCheckResult(null);
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

  const handleCopyEmail = async () => {
    if (userEmail?.email) {
      await navigator.clipboard.writeText(userEmail.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied!",
        description: "Email address copied to clipboard",
      });
    }
  };

  const handleUseSuggestion = (suggestion: string) => {
    setPrefix(suggestion);
  };

  const handleAssignEmail = () => {
    if (checkResult?.available && prefix) {
      assignEmail.mutate(prefix);
    }
  };



  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center">Loading email settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Back to Dashboard Button */}
        <div className="flex justify-start">
          <Link href="/dashboard">
            <Button variant="outline" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">
            {userEmail?.email ? 'Your Lead Email Address' : 'Set Up Your Lead Email'}
          </h1>
          <p className="text-gray-600">
            {userEmail?.email 
              ? 'Your professional email address for receiving client inquiries'
              : 'Choose your permanent professional email address for client inquiries'
            }
          </p>
        </div>

        {/* Current Email Display */}
        {userEmail?.email && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <CheckCircle className="h-5 w-5" />
                Your Lead Email is Active
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 p-3 bg-white rounded border">
                <Mail className="h-5 w-5 text-green-600" />
                <code className="flex-1 font-mono text-lg">{userEmail.email}</code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyEmail}
                  className="shrink-0"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <p className="text-sm text-green-700 mt-3">
                Share this email address with potential clients. All inquiries will automatically create bookings in your MusoBuddy account.
              </p>
              <Alert className="mt-4 border-blue-200 bg-blue-50">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  Your lead email address is permanent and cannot be changed. Contact support if you need assistance.
                </AlertDescription>
              </Alert>
              
              {/* Continue to Dashboard Button */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <Button
                  onClick={() => setLocation('/dashboard')}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  size="lg"
                >
                  <LayoutDashboard className="h-5 w-5 mr-2" />
                  Continue to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Email Setup Form */}
        {!userEmail?.email && (
          <Card>
            <CardHeader>
              <CardTitle>Choose Your Email Prefix</CardTitle>
              <CardDescription>
                Pick a custom prefix for your professional lead email address. This will be permanent and cannot be changed later.
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
                      placeholder="timfulkermusic"
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
                        Great! <code>leads+{prefix}@mg.musobuddy.com</code> is available
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

              {/* Assign Button */}
              <Button
                onClick={handleAssignEmail}
                disabled={!checkResult?.available || assignEmail.isPending}
                className="w-full"
                size="lg"
              >
                {assignEmail.isPending ? 'Setting up your email...' : 'Activate My Lead Email'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* How It Works */}
        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">1</div>
              <p><strong>Share your email</strong> with potential clients on your website, business cards, and marketing materials</p>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">2</div>
              <p><strong>Client sends inquiry</strong> to your lead email address</p>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">3</div>
              <p><strong>Automatic booking creation</strong> in your MusoBuddy dashboard with AI-extracted details</p>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">4</div>
              <p><strong>Respond with templates</strong> and manage the booking through MusoBuddy</p>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}