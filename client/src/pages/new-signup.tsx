import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Link, useLocation } from 'wouter';

interface SignupData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
}

interface VerificationData {
  email: string;
  verificationCode: string;
}

export default function NewSignup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<'signup' | 'verify'>('signup');
  const [loading, setLoading] = useState(false);
  const [signupData, setSignupData] = useState<SignupData>({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: ''
  });
  const [verificationData, setVerificationData] = useState<VerificationData>({
    email: '',
    verificationCode: ''
  });
  const [showVerificationCode, setShowVerificationCode] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(signupData)
      });

      const result = await response.json();

      if (response.ok) {
        setVerificationData({ email: signupData.email, verificationCode: '' });
        if (result.showVerificationCode) {
          setShowVerificationCode(result.verificationCode);
        }
        setStep('verify');
        toast({
          title: "Account Created",
          description: "Please verify your phone number to continue.",
        });
      } else {
        toast({
          title: "Signup Failed",
          description: result.error || "An error occurred during signup.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/auth/verify-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(verificationData)
      });

      const result = await response.json();

      if (response.ok) {
        // Store auth token for future requests
        localStorage.setItem('authToken', result.authToken);
        
        toast({
          title: "Phone Verified!",
          description: "Your account has been verified successfully.",
        });
        
        // Check if this is an existing user or new user
        if (result.message && result.message.includes('existing user')) {
          // Existing user - go to dashboard
          setLocation('/dashboard');
        } else {
          // New user - continue to trial setup/subscription
          setLocation('/subscription');
        }
      } else {
        toast({
          title: "Verification Failed",
          description: result.error || "Invalid verification code.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      const response = await fetch('/api/auth/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: verificationData.email })
      });

      const result = await response.json();

      if (response.ok) {
        if (result.showVerificationCode) {
          setShowVerificationCode(result.verificationCode);
        }
        toast({
          title: "Code Resent",
          description: "A new verification code has been sent.",
        });
      } else {
        toast({
          title: "Failed to Resend",
          description: result.error || "Unable to resend code.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (step === 'verify') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Verify Your Phone</CardTitle>
            <CardDescription className="text-center">
              Enter the 6-digit code sent to {signupData.phoneNumber}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {showVerificationCode && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
                <strong>Development Mode:</strong><br/>
                Use this verification code: <span className="font-mono text-lg font-bold">{showVerificationCode}</span>
              </div>
            )}
            <form onSubmit={handleVerification} className="space-y-4">
              <div>
                <Label htmlFor="verificationCode">Verification Code</Label>
                <Input
                  id="verificationCode"
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  className="text-center text-lg font-mono"
                  value={verificationData.verificationCode}
                  onChange={(e) => setVerificationData({
                    ...verificationData,
                    verificationCode: e.target.value.replace(/\D/g, '')
                  })}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading || verificationData.verificationCode.length !== 6}>
                {loading ? "Verifying..." : "Verify Phone Number"}
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep('signup')}
                >
                  Back to Signup
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1"
                  onClick={handleResendCode}
                >
                  Resend Code
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Create Your MusoBuddy Account</CardTitle>
          <CardDescription className="text-center">
            Join thousands of musicians managing their business efficiently
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  type="text"
                  value={signupData.firstName}
                  onChange={(e) => setSignupData({
                    ...signupData,
                    firstName: e.target.value
                  })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  type="text"
                  value={signupData.lastName}
                  onChange={(e) => setSignupData({
                    ...signupData,
                    lastName: e.target.value
                  })}
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={signupData.email}
                onChange={(e) => setSignupData({
                  ...signupData,
                  email: e.target.value
                })}
                required
              />
            </div>
            <div>
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="07123 456 789"
                value={signupData.phoneNumber}
                onChange={(e) => setSignupData({
                  ...signupData,
                  phoneNumber: e.target.value
                })}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 6 characters"
                value={signupData.password}
                onChange={(e) => setSignupData({
                  ...signupData,
                  password: e.target.value
                })}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating Account..." : "Create Account"}
            </Button>
            <div className="text-center text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-600 hover:underline font-medium">
                Sign in here
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}